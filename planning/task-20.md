# Task 20: Confirmation PoC Tracking System

## Goal

Track and display Confirmation Proof of Compute (PoC) metrics including weight to confirm, confirmation weight, confirmation ratio, and participant status (ACTIVE/INACTIVE) with red highlighting for low confirmation ratios.

## Problem

Gonka Chain introduced a new Confirmation PoC system where participants must re-confirm their weight during PoC phases. If a participant's confirmation ratio falls below 50%, their status changes from ACTIVE to INACTIVE.

Missing from tracker:
1. No visibility into weight that needs confirmation
2. No tracking of actual confirmation weight
3. No display of confirmation ratio
4. No highlighting for participants at risk (ratio < 50%)
5. No participant status (ACTIVE/INACTIVE) display

## Solution

### Data Model

Added fields to `ParticipantStats`:
- `weight_to_confirm: Optional[int]` - Weight requiring confirmation
- `confirmation_weight: Optional[int]` - Weight actually confirmed
- `confirmation_poc_ratio: Optional[float]` - Ratio (calculated from epoch_group_data)
- `participant_status: Optional[str]` - "ACTIVE" or "INACTIVE"

### Weight to Confirm Calculation

**Source**: `/v1/epochs/{epoch_id}/participants`

**ml_nodes structure** (nested arrays):
```
ml_nodes: [
  {ml_nodes: [nodeA, nodeB, ...]},
  {ml_nodes: [nodeC, nodeD, ...]},
  ...
]
```

**Algorithm**:
1. Iterate through outer `ml_nodes` array
2. For each group, iterate through nested `ml_nodes` array
3. Check if `timeslot_allocation[1] == false`
4. Sum `poc_weight` of matching nodes → `weight_to_confirm`

### Confirmation Weight Data

**Source**: `/chain-api/productscience/inference/inference/epoch_group_data/{epoch_id}`

**Location**: `epoch_group_data.validation_weights[].confirmation_weight`

### Participant Status

**Source**: `/chain-api/productscience/inference/inference/participant/{participant_id}`

**Field**: `status` ("ACTIVE" or "INACTIVE")

### Confirmation Ratio Calculation

```python
if confirmation_weight is not None and weight_to_confirm > 0:
    confirmation_poc_ratio = round(confirmation_weight / weight_to_confirm, 4)
```

**Highlighting**: Red if `confirmation_poc_ratio < 0.5`

## Architecture

### Backend Implementation

**Files Modified**:
- `backend/src/backend/models.py` - Added 4 fields to ParticipantStats
- `backend/src/backend/client.py` - Added `get_epoch_group_data` and `get_participant_confirmation_data`
- `backend/src/backend/database.py` - Added `confirmation_data` table with save/get methods
- `backend/src/backend/service.py` - Added `_calculate_weight_to_confirm`, `fetch_and_cache_confirmation_data`, `merge_confirmation_data`
- `backend/src/backend/app.py` - Added background polling task
- `config.env.template` - Added `POLL_CONFIRMATION_DATA_INTERVAL`

### Data Flow

1. **Background Polling** (every 120s, starts after 5s):
   - Fetch epoch_group_data for validation_weights
   - Fetch participant status for each participant
   - Calculate weight_to_confirm from ml_nodes
   - Calculate confirmation_poc_ratio
   - Cache in confirmation_data table

2. **Current/Historical Epoch Stats**:
   - Fetch epoch participants (includes ml_nodes)
   - Merge jail/health data
   - Merge confirmation data from cache
   - Return with all fields populated

### Caching Strategy

**Database Table**: `confirmation_data` with fields (epoch_id, participant_index, weight_to_confirm, confirmation_weight, confirmation_poc_ratio, participant_status, recorded_at)

**Pattern**: Cache-first, non-blocking
- Check cache on every request
- Return immediately with available data
- Background polling keeps cache fresh
- No inline fetching to avoid blocking responses

### Frontend Implementation

**Files Modified**:
- `frontend/src/types/inference.ts` - Added 4 fields to Participant interface
- `frontend/src/components/ParticipantModal.tsx` - Added UI display, validator status logic
- `frontend/src/components/ParticipantTable.tsx` - Added statistical test highlighting logic

**Highlighting Logic**:

Uses statistical test based on Gonka chain's MissedStatTest (p0=0.10, alpha=0.05):

```typescript
const criticalThresholds = [
  { total: 5, critical: 3 },
  { total: 10, critical: 4 },
  { total: 20, critical: 5 },
  { total: 30, critical: 7 },
  { total: 50, critical: 10 },
  { total: 80, critical: 14 },
  { total: 100, critical: 16 },
  { total: 150, critical: 22 },
  { total: 200, critical: 28 },
  { total: 250, critical: 34 },
  { total: 300, critical: 40 },
  { total: 400, critical: 51 },
  { total: 500, critical: 62 },
  { total: 600, critical: 73 },
  { total: 700, critical: 84 },
  { total: 800, critical: 95 },
  { total: 900, critical: 106 },
  { total: 990, critical: 116 }
]

function missedStatTest(nMissed: number, nTotal: number): boolean {
  if (nTotal === 0) return true
  if (nMissed < 0 || nTotal < 0 || nMissed > nTotal) return true
  
  if (nTotal > 990) {
    return nMissed * 10 <= nTotal
  }
  
  if (nTotal < criticalThresholds[0].total) {
    return true
  }
  
  // Linear interpolation between adjacent thresholds
  for (let i = 0; i < criticalThresholds.length - 1; i++) {
    const lower = criticalThresholds[i]
    const upper = criticalThresholds[i + 1]
    
    if (nTotal >= lower.total && nTotal <= upper.total) {
      const ratio = (nTotal - lower.total) / (upper.total - lower.total)
      const interpolatedCritical = lower.critical + ratio * (upper.critical - lower.critical)
      return nMissed <= interpolatedCritical
    }
  }
  
  const lastThreshold = criticalThresholds[criticalThresholds.length - 1]
  return nMissed <= lastThreshold.critical
}

const missedTestFails = !missedStatTest(missedCount, totalInferenced)
const invalidTestFails = !missedStatTest(invalidCount, totalValidations)
const lowConfirmation = confirmation_poc_ratio < 0.5

return missedTestFails || invalidTestFails || lowConfirmation
```

**Interpolation Approach**:
- Uses 18 key threshold points from Gonka chain's full statistical table
- Linear interpolation between adjacent points for values in between
- For small samples (< 10): More lenient due to statistical significance requirements
- For large samples (> 990): Uses simple 10% rule (nMissed * 10 <= nTotal)
- Provides smooth, accurate approximation of the full 100+ value lookup table

**Example**: For 195 total with 17 misses (8.72%):
- Interpolates between [150, 22] and [200, 28]
- Ratio = (195-150)/(200-150) = 0.9
- Critical = 22 + 0.9 * (28-22) = 27.4
- 17 ≤ 27.4 → PASS ✓

**Validator Status Logic** (priority order):

Table view (compact):
1. Grey dot: `participant_status === "INACTIVE"` - "Not a validator"
2. Red dot: `is_jailed === true` - "Jailed"
3. Green dot: `is_jailed === false` - "Active"
4. Grey dot: All other cases - "Unknown"

Modal view (detailed):
1. Grey badge: `participant_status === "INACTIVE"` - "NOT VALIDATOR"
2. Red badge: `is_jailed === true` - "JAILED"
3. Green badge: `is_jailed === false` - "NOT JAILED"
4. Grey text: All other cases - "Unknown"

Note: Checking participant_status first ensures INACTIVE participants always show "NOT VALIDATOR" even if is_jailed is false.

## Configuration

**Environment Variable**:
```bash
POLL_CONFIRMATION_DATA_INTERVAL=120
```

Default: 120 seconds (2 minutes)

## Testing

**File**: `backend/src/tests/test_confirmation_poc.py`

**Coverage**: 12 tests passing
- Weight to confirm calculation (8 test cases including edge cases)
- Database save/retrieve with NULL values
- ParticipantStats model with confirmation fields
- Confirmation ratio calculation edge cases

**Integration Verified**:
- API returns confirmation data for 444 participants
- 10 INACTIVE participants with ratio < 0.5
- 434 ACTIVE participants with higher ratios
- Frontend highlighting works correctly
- No blocking on first load
