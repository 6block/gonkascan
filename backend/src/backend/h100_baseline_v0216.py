"""
H100 Baseline Calculation v0.2.16 (Complete Rewrite)

Official documentation: https://gonka.ai/docs/dashboard-maintainer-memo-v0.2.16-h100/

Algorithm steps:
1. Get current validatorset (only count active validators)
2. Get epoch's sub_group_models and effective_coefficient
3. For each model, query its validation_weights to get ml_nodes and poc_weight
4. Get hardware info from hardware_nodes_all, matching:
   - participant + local_id (node_id)
   - status is INFERENCE
   - contains H100 80GB HBM3 cards (mixed hosts also count)
   - participant's validator_key is in validatorset
5. Calculate weight per H100 card: (poc_weight × effective_coefficient) / H100_card_count
6. Take median of all samples as denominator
7. h100_baseline = total_weight / denominator
"""
import base64
import statistics
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal

# Debug switch (set to False in production)
DEBUG = False


def _decode_fixed_point(obj: Dict[str, Any]) -> float:
    """Parse {value: "3024", exponent: -4} -> 0.3024"""
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
    Check if hardware type is H100 80GB HBM3

    Matching examples:
    - "NVIDIA H100 80GB HBM3"
    - "NVIDIA H100 80GB HBM3 | 79GB"

    Exclude:
    - "NVIDIA H100 PCIe"
    - "NVIDIA H100 SXM"
    - "NVIDIA H200"
    """
    hw_lower = hw_type.lower()

    # Must contain h100
    if "h100" not in hw_lower:
        return False

    # Must contain 80gb
    if "80gb" not in hw_lower or "80 gb" not in hw_lower:
        # Check if it's "80GB" or "80 GB"
        if not any(x in hw_lower for x in ["80gb", "80 gb"]):
            return False

    # Must contain hbm3
    if "hbm3" not in hw_lower:
        return False

    # Exclude PCIe
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
    Calculate H100 baseline (v0.2.16+ full algorithm)

    Args:
        client: GonkaClient instance
        epoch_index: epoch index
        max_fallback_depth: maximum fallback depth
        _depth: current recursion depth

    Returns:
        {
            "h100_baseline": float,        # total_weight / denominator
            "denominator": float,          # median (weight_per_h100)
            "total_weight": int,           # epoch total weight
            "sample_size": int,            # sample count (H100 card count)
            "node_count": int,             # node count
            "card_count": int,             # H100 80GB HBM3 card count
            "model_ids": list,             # models participating in calculation
            "epoch_index": int,
            "calculation_method": str,
            "mixed_hosts_included": bool   # whether mixed hosts are included
        }
    """
    # Prevent infinite recursion
    if _depth >= max_fallback_depth:
        return {
            "error": f"Exceeded max fallback depth ({max_fallback_depth})",
            "h100_baseline": None,
            "denominator": None,
            "epoch_index": epoch_index
        }

    # 1. Get epoch data
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

    # 2. Build model coefficient mapping {model_id: effective_coefficient}
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

    # 3. Get all hardware nodes
    hardware_resp = await client.get_hardware_nodes_all()
    all_hardware_nodes = hardware_resp.get("nodes", [])

    if not all_hardware_nodes:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No hardware_nodes_all for epoch {epoch_index}"}

    # 4. Get epoch participants data and filter out validator participants
    # Use officially recommended /v1/epochs/{epoch}/participants API
    validator_participants = None

    if enable_validator_filter:
        # Try method 1: Use officially recommended /v1/epochs/{epoch}/participants API
        participants = []
        validators = []

        try:
            epoch_participants_data = await client.get_epoch_participants(epoch_index)
            if epoch_participants_data:
                participants = epoch_participants_data.get("active_participants", {}).get("participants", [])
                validators = epoch_participants_data.get("validators", [])


        except Exception as e:
            # Method 2: Use historical block height query (fallback method)
            if "404" in str(e) or "not found" in str(e).lower():
                try:
                    # Get block height from epoch_group_data (use last_block_height)
                    block_height = epoch_group_data.get("last_block_height") or epoch_group_data.get("effective_block_height")

                    if block_height:
                        # Use block_height to query validators and participants for this epoch
                        validators_data = await client.get_validators(int(block_height))
                        if validators_data:
                            validators = validators_data.get("validators", [])

                        participants_data = await client.get_all_participants(int(block_height))
                        if participants_data:
                            participants = participants_data.get("participant", [])

                except Exception as fallback_error:
                    pass
            else:
                pass

        # If validators and participants were successfully retrieved, perform matching
        if validators and participants:
            # Build validator pubkey set (compare after Base64 decoding)
            # According to official reply: use pub_key.value or pub_key.key (depending on JSON structure)
            # Decode both to binary before comparing
            validator_pubkeys_decoded = set()
            for v in validators:
                pub_key = v.get("pub_key")
                if not pub_key:
                    continue

                # Handle two possible JSON structures
                if isinstance(pub_key, dict):
                    # Structure: {"@type": "...", "key": "base64"} or {"@type": "...", "value": "base64"}
                    pub_key_b64 = pub_key.get("value") or pub_key.get("key")
                else:
                    # Direct string
                    pub_key_b64 = pub_key

                if pub_key_b64:
                    try:
                        # Base64 decode
                        decoded = base64.b64decode(pub_key_b64)
                        validator_pubkeys_decoded.add(decoded)
                    except Exception:
                        pass

            if validator_pubkeys_decoded:
                # Find all participants whose validator_key matches
                # Also need to decode validator_key before comparing
                validator_participants = set()
                for p in participants:
                    validator_key_b64 = p.get("validator_key")
                    participant_index = p.get("index")

                    if not validator_key_b64 or not participant_index:
                        continue

                    try:
                        # Base64 decode
                        decoded = base64.b64decode(validator_key_b64)
                        if decoded in validator_pubkeys_decoded:
                            validator_participants.add(participant_index)
                    except Exception:
                        pass
        else:
            validator_participants = None
    else:
        validator_participants = None

    # 5. Filter hardware nodes according to official documentation order
    all_hardware_nodes = hardware_resp.get("nodes", [])

    if not all_hardware_nodes:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {"error": f"No hardware_nodes_all for epoch {epoch_index}"}

    # Step 1 & 2 & 3: Filter hardware nodes
    # - participant must be validator (if validator filter is enabled)
    # - status must be INFERENCE
    # - must have H100 80GB HBM3 cards
    eligible_nodes = []  # [(participant, node_id, h100_count, hw_info)]

    # Debug counters
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

            # Filter 1: Must be validator (if enabled)
            if validator_participants is not None:
                if participant not in validator_participants:
                    if epoch_index == 420:
                        debug_filter_stats["not_validator"] += 1
                    continue

            # Filter 2: Status must be INFERENCE
            if status != "INFERENCE":
                if epoch_index == 420:
                    debug_filter_stats["wrong_status"] += 1
                continue

            # Filter 3: Count H100 80GB HBM3 cards
            hardware_list = hw_node.get("hardware", [])
            h100_count = 0
            for hw in hardware_list:
                hw_type = hw.get("type", "")  # Correct field name is "type", not "hardware_type"
                hw_count = hw.get("count", 0)  # Correct field name is "count", not "hardware_count"
                if hw_type.startswith("NVIDIA H100 80GB HBM3"):
                    h100_count += hw_count

            if h100_count == 0:
                if epoch_index == 420:
                    debug_filter_stats["no_h100"] += 1
                continue

            if epoch_index == 420:
                debug_filter_stats["passed"] += 1

            # Passed all filters!
            eligible_nodes.append((participant, local_id, h100_count, hw_node))

    # Step 4: For each eligible node, find corresponding poc_weight in each model
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

    # Now query ml_nodes for each model to find matching nodes
    for model_id in sub_group_models:
        if model_id not in model_coefficients:
            continue

        effective_coeff = model_coefficients[model_id]

        # Query this model's epoch group data
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

                # Is this node in our eligible nodes list?
                if node_key not in node_data:
                    continue

                # Accumulate this model's contribution to the node
                weighted_poc = poc_weight * effective_coeff
                node_data[node_key]["total_weighted_poc"] += weighted_poc
                node_data[node_key]["models"].append(model_id)

    # Step 6: Generate samples (only include nodes with poc_weight)
    samples = []
    node_details = []

    nodes_with_weight = 0
    nodes_without_weight = 0

    for node_key, data in node_data.items():
        total_weighted_poc = data["total_weighted_poc"]

        if total_weighted_poc <= 0:
            nodes_without_weight += 1
            continue  # Skip nodes without poc_weight

        nodes_with_weight += 1

        # Core formula: aggregate all model contributions on this node, then divide by H100 card count
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

    # Step 5: Calculate median from all node samples
    # 6. Calculate median
    if len(samples) < 3:
        if epoch_index > 0:
            return await calculate_h100_baseline_v0216(
                client, epoch_index - 1, max_fallback_depth, _depth + 1
            )
        return {
            "error": f"Insufficient H100 samples for epoch {epoch_index} (found {len(samples)}, need ≥3)",
            "h100_baseline": None,
            "denominator": None,
            "epoch_index": actual_epoch_index
        }

    weight_per_h100 = statistics.median(samples)
    h100_equivalent = total_weight / weight_per_h100

    # Count nodes and cards
    unique_nodes = {(d["participant"], d["node_id"]) for d in node_details}
    total_h100_cards = sum(d["h100_count"] for d in node_details)

    # Check if mixed hosts are included
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
        "h100_baseline": round(h100_equivalent, 2),
        "denominator": round(weight_per_h100, 2),
        "sample_size": len(samples),
        "reference_model": "H100",
        "calculation_method": "v0.2.16: poc_weight × effective_coefficient / H100_card_count, median",
        # Keep additional debug info
        "total_weight": total_weight,
        "node_count": len(unique_nodes),
        "card_count": total_h100_cards,
        "model_ids": list(sub_group_models),
        "epoch_index": actual_epoch_index,
        "mixed_hosts_included": mixed_hosts_included,
        "samples_min": round(min(samples), 2),
        "samples_max": round(max(samples), 2),
    }
