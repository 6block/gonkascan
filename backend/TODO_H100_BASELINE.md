# H100 Baseline Calculation - TODO

## Current Status (2026-10-10)

### Implemented
- ✅ Use `poc_weight × effective_coefficient` instead of `validation_weights[].weight`
- ✅ Include mixed hosts (count each H100 80GB HBM3 card)
- ✅ Check node status = `INFERENCE`
- ✅ Query per-model epoch_group_data for ml_nodes and poc_weight

### Test Results
- Epoch 418: 1,811 (expected 1,834, error 23 ✅ close)
- Epoch 419: 1,269 (no expected value)
- Epoch 420: 1,461 (expected 1,696, error 235 ⚠️ needs optimization)

### Remaining Work

#### 1. Node Aggregation (Priority: HIGH)
**Problem**: Currently generating one sample per (node × model). Should generate one sample per node.

**Current**: 
```python
sample = (poc_weight × effective_coefficient) / H100_count
# One sample for each (participant, node_id, model_id) combination
```

**Expected** (per official doc):
```python
# Aggregate all models on the same node first
node_total_weight = sum(poc_weight_model_i × effective_coefficient_i for all models on node)
sample = node_total_weight / H100_count_on_node
# One sample per (participant, node_id)
```

**Evidence**: Epoch 420 has 11 samples for 11 nodes (not 64 samples for 64 cards).

#### 2. Validator Set Verification (Priority: MEDIUM)
**Problem**: Not checking if participant's `validator_key` matches an active validator's `pub_key.key`.

**Official requirement**: "Query the latest validatorset; keep a participant only when their validator_key equals a validator pub_key.key."

**Challenge**: `hardware_nodes_all` doesn't include `validator_key`. Need to find the correct API endpoint.

**Possible solutions**:
- Check if `validation_weights` has validator info
- Query a separate validator-info endpoint per participant
- Cross-reference with another data source

#### 3. Sample Count Mismatch Debug
**Current results** (Epoch 420):
- Our count: 26 nodes, 184 cards, 26 samples
- Expected: 11 nodes, 64 cards, 11 samples

**Debugging steps**:
1. Log which nodes are being included
2. Compare with official's 11 qualifying nodes
3. Check if validator filtering would reduce 26 → 11
4. Verify H100 80GB HBM3 identification logic
5. Check if `exclude_from_confirmation` should filter out some models

## Implementation Plan

### Phase 1: Node Aggregation Fix
1. Modify `calculate_h100_baseline_v0216()` to aggregate by `(participant, node_id)`
2. Sum `poc_weight × coeff` across all models on each node
3. Divide by H100 card count on that node
4. Test against Epoch 418, 420

### Phase 2: Validator Verification
1. Research correct API for participant validator_key
2. Add validator set filtering
3. Re-test and verify sample count matches

### Phase 3: Fine-tuning
1. Debug any remaining discrepancies
2. Verify against multiple epochs
3. Deploy to production

## References
- Official doc: https://gonka.ai/docs/dashboard-maintainer-memo-v0.2.16-h100/
- GitHub PR: https://github.com/gonka-ai/gonka-docs/pull/1503/changes
- Discord thread: dashboard-maintainer-memo-v0.2.16-h100 discussion

## Contact
- Gonka official: @maksimenkoff (mentioned in Discord)
- Our implementation: `/Users/yuxuan6block/Desktop/AI/gonkascan/backend/src/backend/h100_baseline_v0216.py`
