"""
H100 基准线计算 v0.2.16 (完整重写)

官方文档: https://gonka.ai/docs/dashboard-maintainer-memo-v0.2.16-h100/

算法步骤:
1. 获取当前 validatorset (只统计活跃验证者)
2. 获取 epoch 的 sub_group_models 和 effective_coefficient
3. 对每个模型查询其 validation_weights，获取 ml_nodes 和 poc_weight
4. 从 hardware_nodes_all 获取硬件信息，匹配:
   - participant + local_id (node_id)
   - 状态为 INFERENCE
   - 包含 H100 80GB HBM3 卡 (混合主机也算)
   - participant 的 validator_key 在 validatorset 中
5. 计算每张 H100 卡的权重: (poc_weight × effective_coefficient) / H100_card_count
6. 取所有样本的中位数作为 weight_per_h100
7. H100_equivalent = total_weight / weight_per_h100
"""
import statistics
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal

# 调试开关（生产环境设为 False）
DEBUG = False


def _decode_fixed_point(obj: Dict[str, Any]) -> float:
    """解析 {value: "3024", exponent: -4} -> 0.3024"""
    if not obj:
        return 0.0
    try:
        value = float(obj.get("value", 0))
        exponent = int(obj.get("exponent", 0))
        return value * (10 ** exponent)
    except (ValueError, TypeError):
        return 0.0


def _is_h100_80gb_hbm3(hw_type: str) -> bool:
    """
    检查硬件类型是否为 H100 80GB HBM3

    匹配示例:
    - "NVIDIA H100 80GB HBM3"
    - "NVIDIA H100 80GB HBM3 | 79GB"

    排除:
    - "NVIDIA H100 PCIe"
    - "NVIDIA H100 SXM"
    - "NVIDIA H200"
    """
    hw_lower = hw_type.lower()

    # 必须包含 h100
    if "h100" not in hw_lower:
        return False

    # 必须包含 80gb
    if "80gb" not in hw_lower or "80 gb" not in hw_lower:
        # 检查是否是 "80GB" 或 "80 GB"
        if not any(x in hw_lower for x in ["80gb", "80 gb"]):
            return False

    # 必须包含 hbm3
    if "hbm3" not in hw_lower:
        return False

    # 排除 PCIe
    if "pcie" in hw_lower:
        return False

    return True


async def calculate_h100_baseline_v0216(
    client,
    epoch_index: int,
    max_fallback_depth: int = 10,
    _depth: int = 0,
    enable_validator_filter: bool = True,
) -> Dict[str, Any]:
    """
    计算 H100 基准线 (v0.2.16+ 完整算法)

    Args:
        client: GonkaClient 实例
        epoch_index: epoch 索引
        max_fallback_depth: 最大回退深度
        _depth: 当前递归深度

    Returns:
        {
            "h100_equivalent": float,      # total_weight / weight_per_h100
            "weight_per_h100": float,       # 中位数
            "total_weight": int,            # epoch 总权重
            "sample_count": int,            # 样本数 (H100 卡数)
            "node_count": int,              # 节点数
            "card_count": int,              # H100 80GB HBM3 卡数
            "model_ids": list,              # 参与计算的模型
            "epoch_index": int,
            "calculation_method": str,
            "mixed_hosts_included": bool    # 是否包含混合主机
        }
    """
    # 防止无限递归
    if _depth >= max_fallback_depth:
        return {
            "error": f"Exceeded max fallback depth ({max_fallback_depth})",
            "h100_equivalent": None,
            "weight_per_h100": None,
            "epoch_index": epoch_index
        }

    # 1. 获取 epoch 数据
    if epoch_index == 0:
        epoch_data = await client.get_current_epoch_group_data()
    else:
        epoch_data = await client.get_epoch_group_data(epoch_index)

    epoch_group_data = epoch_data.get("epoch_group_data", {})

    if not epoch_group_data:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No epoch_group_data for epoch {epoch_index}"}

    actual_epoch_index = int(epoch_group_data.get("epoch_index", epoch_index))
    total_weight = int(epoch_group_data.get("total_weight", 0))
    sub_group_models = epoch_group_data.get("sub_group_models", [])
    confirmation_weight_scales = epoch_group_data.get("confirmation_weight_scales", [])

    if not sub_group_models:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No sub_group_models for epoch {epoch_index}"}

    # 2. 构建模型系数映射 {model_id: effective_coefficient}
    model_coefficients = {}
    for scale in confirmation_weight_scales:
        model_id = scale.get("model_id")
        effective_coeff_obj = scale.get("effective_coefficient")

        if not effective_coeff_obj:
            # Fallback to config.coeff_min if effective_coefficient is missing
            config = scale.get("config") or {}
            effective_coeff_obj = config.get("coeff_min", {})

        if model_id and effective_coeff_obj:
            model_coefficients[model_id] = _decode_fixed_point(effective_coeff_obj)

    if not model_coefficients:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No model coefficients for epoch {epoch_index}"}

    # 3. 获取所有硬件节点
    hardware_resp = await client.get_hardware_nodes_all()
    all_hardware_nodes = hardware_resp.get("nodes", [])

    if not all_hardware_nodes:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No hardware_nodes_all for epoch {epoch_index}"}

    # 4. 获取 epoch participants 数据并过滤出 validator participants
    # 使用官方推荐的 /v1/epochs/{epoch}/participants API
    validator_participants = None

    if enable_validator_filter:
        try:
            # 一次 API 调用获取所有数据（官方推荐方式）
            epoch_data = await client.get_epoch_participants(epoch_index)

            # 提取 participants 和 validators
            participants = epoch_data.get("active_participants", {}).get("participants", [])
            validators = epoch_data.get("validators", [])

            # 构建 validator pubkey 集合（使用 pub_key 字段，不是 key）
            validator_pubkeys = {
                v.get("pub_key")
                for v in validators
                if v.get("pub_key")
            }

            if validator_pubkeys and participants:
                # 找出所有 validator_key 匹配的 participants
                validator_participants = {
                    p.get("index")
                    for p in participants
                    if p.get("validator_key") in validator_pubkeys
                }

                if epoch_index in [420, 422]:
                    print(f"\n[DEBUG] Validator filtering for epoch {epoch_index}:")
                    print(f"  - Total validators: {len(validator_pubkeys)}")
                    print(f"  - Total participants: {len(participants)}")
                    print(f"  - Eligible (validator participants): {len(validator_participants)}\n")

        except Exception as e:
            # 如果获取失败，不做验证者筛选
            print(f"[WARNING] Failed to get epoch participants data: {e}")
            validator_participants = None
    else:
        print(f"\n[INFO] Validator filtering is disabled for epoch {epoch_index}\n")

    # 5. 按官方文档的顺序过滤硬件节点
    all_hardware_nodes = hardware_resp.get("nodes", [])

    if not all_hardware_nodes:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No hardware_nodes_all for epoch {epoch_index}"}

    # 步骤 1 & 2 & 3: 过滤硬件节点
    # - participant 必须是 validator（如果启用了 validator 过滤）
    # - status 必须是 INFERENCE
    # - 必须有 H100 80GB HBM3 卡
    eligible_nodes = []  # [(participant, node_id, h100_count, hw_info)]

    # 调试计数器
    debug_filter_stats = {
        "total_hw_nodes": 0,
        "not_validator": 0,
        "wrong_status": 0,
        "no_h100": 0,
        "passed": 0
    }

    for node_entry in all_hardware_nodes:
        participant = node_entry.get("participant")

        for hw_node in node_entry.get("hardware_nodes", []):
            if epoch_index == 420:
                debug_filter_stats["total_hw_nodes"] += 1

            local_id = hw_node.get("local_id")
            status = hw_node.get("status", "")

            # 过滤 1: 必须是 validator（如果启用）
            if validator_participants is not None:
                if participant not in validator_participants:
                    if epoch_index == 420:
                        debug_filter_stats["not_validator"] += 1
                    continue

            # 过滤 2: 状态必须是 INFERENCE
            if status != "INFERENCE":
                if epoch_index == 420:
                    debug_filter_stats["wrong_status"] += 1
                continue

            # 过滤 3: 统计 H100 80GB HBM3 卡数
            hardware_list = hw_node.get("hardware", [])
            h100_count = 0
            for hw in hardware_list:
                hw_type = hw.get("type", "")  # 正确字段名是 "type"，不是 "hardware_type"
                hw_count = hw.get("count", 0)  # 正确字段名是 "count"，不是 "hardware_count"
                if hw_type.startswith("NVIDIA H100 80GB HBM3"):
                    h100_count += hw_count

            if h100_count == 0:
                if epoch_index == 420:
                    debug_filter_stats["no_h100"] += 1
                continue

            if epoch_index == 420:
                debug_filter_stats["passed"] += 1

            # 通过所有过滤！
            eligible_nodes.append((participant, local_id, h100_count, hw_node))

    if epoch_index == 420:
        print(f"\n[DEBUG] Hardware filtering breakdown:")
        print(f"  - Total hardware nodes: {debug_filter_stats['total_hw_nodes']}")
        print(f"  - Filtered (not validator): {debug_filter_stats['not_validator']}")
        print(f"  - Filtered (wrong status): {debug_filter_stats['wrong_status']}")
        print(f"  - Filtered (no H100): {debug_filter_stats['no_h100']}")
        print(f"  - Passed all filters: {debug_filter_stats['passed']}")
        print(f"\n[DEBUG] Eligible nodes after hardware filtering:")
        print(f"  - Total eligible nodes: {len(eligible_nodes)}")
        print(f"  - Total H100 cards: {sum(n[2] for n in eligible_nodes)}")
        print(f"  - Validator participants: {len(validator_participants) if validator_participants else 'disabled'}\n")

    # 步骤 4: 对每个 eligible node，去各个模型中查找对应的 poc_weight
    node_data = {}  # {(participant, node_id): {total_weighted_poc, h100_count, models}}

    for participant, node_id, h100_count, hw_info in eligible_nodes:
        node_key = (participant, node_id)
        node_data[node_key] = {
            "total_weighted_poc": 0.0,
            "h100_count": h100_count,
            "models": [],
            "participant": participant,
            "node_id": node_id
        }

    # 现在对每个模型查询 ml_nodes，找到匹配的节点
    for model_id in sub_group_models:
        if model_id not in model_coefficients:
            continue

        effective_coeff = model_coefficients[model_id]

        # 查询该模型的 epoch group data
        model_epoch_data = await client.get_epoch_group_data_by_model(actual_epoch_index, model_id)
        model_group_data = model_epoch_data.get("epoch_group_data", {})
        validation_weights = model_group_data.get("validation_weights", [])

        for vw in validation_weights:
            participant = vw.get("member_address")
            ml_nodes = vw.get("ml_nodes", [])

            for ml_node in ml_nodes:
                node_id = ml_node.get("node_id")
                poc_weight_str = ml_node.get("poc_weight", "0")

                try:
                    poc_weight = float(poc_weight_str)
                except (ValueError, TypeError):
                    continue

                if poc_weight <= 0:
                    continue

                node_key = (participant, node_id)

                # 这个节点在我们的 eligible nodes 列表中吗？
                if node_key not in node_data:
                    continue

                # 累加这个模型对该节点的贡献
                weighted_poc = poc_weight * effective_coeff
                node_data[node_key]["total_weighted_poc"] += weighted_poc
                node_data[node_key]["models"].append(model_id)

    # 步骤 6: 生成样本（只包含有 poc_weight 的节点）
    samples = []
    node_details = []

    nodes_with_weight = 0
    nodes_without_weight = 0

    for node_key, data in node_data.items():
        total_weighted_poc = data["total_weighted_poc"]

        if total_weighted_poc <= 0:
            nodes_without_weight += 1
            continue  # 跳过没有 poc_weight 的节点

        nodes_with_weight += 1

        # 核心公式：聚合该节点上所有模型的贡献，再除以 H100 卡数
        sample = total_weighted_poc / data["h100_count"]
        samples.append(sample)

        node_details.append({
            "participant": data["participant"],
            "node_id": data["node_id"],
            "models": data["models"],
            "total_weighted_poc": total_weighted_poc,
            "h100_count": data["h100_count"],
            "sample": sample
        })

    # 调试：打印节点和卡数统计
    if DEBUG:
        total_cards = sum(d["h100_count"] for d in node_details)
        print(f"\n[DEBUG] Final node statistics:")
        print(f"  - Eligible nodes (has H100): {len(node_data)}")
        print(f"  - Nodes with poc_weight > 0: {nodes_with_weight}")
        print(f"  - Nodes without poc_weight: {nodes_without_weight}")
        print(f"  - Total H100 cards (with weight): {total_cards}")
        print(f"  - Expected: 11 nodes, 64 cards")
        print(f"  - Difference: {11 - nodes_with_weight} nodes, {64 - total_cards} cards")

    # 6. 计算中位数
    if len(samples) < 3:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {
            "error": f"Insufficient H100 samples for epoch {epoch_index} (found {len(samples)}, need ≥3)",
            "h100_equivalent": None,
            "weight_per_h100": None,
            "epoch_index": actual_epoch_index
        }

    weight_per_h100 = statistics.median(samples)
    h100_equivalent = total_weight / weight_per_h100

    # 统计节点和卡数
    unique_nodes = {(d["participant"], d["node_id"]) for d in node_details}
    total_h100_cards = sum(d["h100_count"] for d in node_details)

    # 检查是否包含混合主机
    mixed_hosts_included = False
    for node_entry in all_hardware_nodes:
        participant = node_entry.get("participant")
        for hw_node in node_entry.get("hardware_nodes", []):
            local_id = hw_node.get("local_id")
            if (participant, local_id) in unique_nodes:
                hardware_list = hw_node.get("hardware", [])
                if len(hardware_list) > 1:
                    mixed_hosts_included = True
                    break
        if mixed_hosts_included:
            break

    return {
        "h100_equivalent": round(h100_equivalent, 2),
        "weight_per_h100": round(weight_per_h100, 2),
        "total_weight": total_weight,
        "sample_count": len(samples),
        "node_count": len(unique_nodes),
        "card_count": total_h100_cards,
        "model_ids": list(sub_group_models),
        "epoch_index": actual_epoch_index,
        "calculation_method": "v0.2.16: poc_weight × effective_coefficient / H100_card_count, median",
        "mixed_hosts_included": mixed_hosts_included,
        "samples_min": round(min(samples), 2),
        "samples_max": round(max(samples), 2),
    }
