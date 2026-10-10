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
    _depth: int = 0
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
            config = scale.get("config", {})
            effective_coeff_obj = config.get("coeff_min", {})

        if model_id and effective_coeff_obj:
            model_coefficients[model_id] = _decode_fixed_point(effective_coeff_obj)

    if not model_coefficients:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No model coefficients for epoch {epoch_index}"}

    # 3. 获取 validatorset (只统计活跃验证者)
    try:
        validators_resp = await client.get_validators()
        validators = validators_resp.get("result", {}).get("validators", [])
        validator_pubkeys = {v.get("pub_key", {}).get("value") for v in validators if v.get("pub_key")}
    except Exception:
        # 如果获取 validators 失败，不做验证者筛选
        validator_pubkeys = None

    # 4. 获取所有硬件节点
    hardware_resp = await client.get_hardware_nodes_all()
    all_hardware_nodes = hardware_resp.get("nodes", [])

    if not all_hardware_nodes:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No hardware_nodes_all for epoch {epoch_index}"}

    # 构建硬件查找映射: {(participant, local_id): hardware_info}
    hardware_map = {}
    for node_entry in all_hardware_nodes:
        participant = node_entry.get("participant")
        for hw_node in node_entry.get("hardware_nodes", []):
            local_id = hw_node.get("local_id")
            if participant and local_id:
                hardware_map[(participant, local_id)] = hw_node

    # 5. 对每个模型查询 ml_nodes 和 poc_weight
    samples = []  # [(poc_weight × coeff / h100_count), ...]
    node_details = []  # 用于调试和显示
    processed_nodes = set()  # (participant, local_id, model_id)

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

                # 避免重复统计
                node_key = (participant, node_id, model_id)
                if node_key in processed_nodes:
                    continue
                processed_nodes.add(node_key)

                # 查找硬件信息
                hw_info = hardware_map.get((participant, node_id))
                if not hw_info:
                    continue

                # 检查状态
                status = hw_info.get("status", "")
                if status != "INFERENCE":
                    continue

                # 统计 H100 80GB HBM3 卡数
                h100_count = 0
                for hw in hw_info.get("hardware", []):
                    hw_type = hw.get("type", "")
                    hw_count = hw.get("count", 0)

                    if _is_h100_80gb_hbm3(hw_type):
                        h100_count += hw_count

                if h100_count == 0:
                    continue

                # 计算每张卡的权重
                sample = (poc_weight * effective_coeff) / h100_count
                samples.append(sample)

                node_details.append({
                    "participant": participant,
                    "node_id": node_id,
                    "model_id": model_id,
                    "poc_weight": poc_weight,
                    "effective_coeff": effective_coeff,
                    "h100_count": h100_count,
                    "sample": sample
                })

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
