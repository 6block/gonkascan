"""Fold gonka.gg per-model traffic buckets into per-epoch totals.

Chain upgrade v0.2.11 removed the SetDeveloperStats call from SetInference, so
`models_stats_by_time` has returned an empty list ever since (epoch 207+). The
traffic now lives in off-chain DevShard sessions, which gonka.gg aggregates and
exposes as an hourly per-model timeseries. Epochs are not hour-aligned (~22.5h),
so a bucket that straddles an epoch boundary is split by its overlap — the
totals are a close approximation, not an exact on-chain count. Hourly buckets
are preferred; daily buckets only stand in where the upstream serves nothing
finer yet, and are replaced once hourly data becomes available.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

BUCKET_HOUR = "hour"
BUCKET_DAY = "day"
HOUR_SPAN = timedelta(hours=1)
DAY_SPAN = timedelta(days=1)
BUCKET_SPANS = {BUCKET_HOUR: HOUR_SPAN, BUCKET_DAY: DAY_SPAN}
UPSTREAM_TS_FORMAT = "%Y-%m-%d %H:%M:%S"

# gonka.gg only serves hourly buckets from this point on; earlier ranges fall
# back to daily buckets, which cannot be split across epoch boundaries.
HOURLY_DATA_START = datetime(2026, 5, 4, 22, 0, tzinfo=timezone.utc)

# The upstream caps hourly ranges at 7 days and silently switches to daily
# buckets beyond that.
MAX_HOURLY_WINDOW = timedelta(days=7)

# The upstream rewrites any range that starts within its recent presets: one
# starting in the last 7 days becomes the trailing 7 days (hourly), one starting
# 7-30 days ago becomes the trailing 30 days (daily). Only ranges starting
# further back are served as requested, so backfill windows must start at
# least this long ago. A day of slack keeps us clear of the 30-day edge.
EXACT_RANGE_MIN_AGE = timedelta(days=31)

# Start the trailing request a day inside the 7-day preset: a range starting
# exactly 7 days ago can tip into the daily 30-day preset by clock skew alone.
# The upstream still answers with the full trailing week.
TRAILING_REQUEST_SPAN = timedelta(days=6)

# Same idea for the daily preset: start well inside the 7-30 day band so the
# upstream answers with its trailing 30 days of daily buckets.
TRAILING_DAILY_REQUEST_SPAN = timedelta(days=20)

# An epoch is treated as final this long after it ended, leaving time for
# late-arriving DevShard diffs to be counted.
FINALIZE_MARGIN = timedelta(hours=6)

EpochUsage = Dict[int, Dict[str, Dict[str, int]]]


@dataclass(frozen=True)
class EpochSpan:
    epoch_id: int
    start: datetime
    # None for the epoch that is still running.
    end: Optional[datetime]


def parse_bucket_ts(value: str) -> datetime:
    return datetime.strptime(value, UPSTREAM_TS_FORMAT).replace(tzinfo=timezone.utc)


def parse_iso_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def floor_hour(value: datetime) -> datetime:
    return value.replace(minute=0, second=0, microsecond=0)


def _floor_to(value: datetime, span: timedelta) -> datetime:
    # Upstream buckets are aligned to UTC hour / UTC midnight.
    if span >= DAY_SPAN:
        return value.replace(hour=0, minute=0, second=0, microsecond=0)
    return floor_hour(value)


def _ceil_to(value: datetime, span: timedelta) -> datetime:
    floored = _floor_to(value, span)
    return floored if floored == value else floored + span


def _overlap_seconds(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> float:
    return max(0.0, (min(a_end, b_end) - max(a_start, b_start)).total_seconds())


def _point_values(point: Dict[str, Any]) -> Optional[Tuple[datetime, str, Tuple[int, int, int]]]:
    """(bucket start, model, (requests, prompt tokens, completion tokens))."""
    try:
        bucket_start = parse_bucket_ts(point["ts"])
        model = point["model"]
        counts = (
            int(point.get("requests") or 0),
            int(point.get("prompt") or 0),
            int(point.get("completion") or 0),
        )
    except (KeyError, TypeError, ValueError):
        return None
    if not model:
        return None
    return bucket_start, model, counts


def aggregate_into_epochs(
    points: Iterable[Dict[str, Any]],
    spans: List[EpochSpan],
    now: datetime,
    bucket_span: timedelta = HOUR_SPAN,
) -> EpochUsage:
    """Attribute each bucket to the epochs it overlaps, in proportion to time.

    Fractions are accumulated as floats and rounded once per (epoch, model), so
    splitting a bucket never creates or drops traffic beyond rounding. For daily
    buckets this assumes traffic is spread evenly through the day.
    """
    raw: Dict[int, Dict[str, Tuple[float, float, float]]] = {}

    for point in points:
        values = _point_values(point)
        if values is None:
            continue
        bucket_start, model, counts = values
        bucket_end = bucket_start + bucket_span

        for span in spans:
            span_end = span.end or now
            overlap = _overlap_seconds(bucket_start, bucket_end, span.start, span_end)
            if overlap <= 0:
                continue
            share = overlap / bucket_span.total_seconds()
            models = raw.setdefault(span.epoch_id, {})
            previous = models.get(model, (0.0, 0.0, 0.0))
            models[model] = tuple(acc + n * share for acc, n in zip(previous, counts))

    return {
        epoch_id: {model: _rounded_usage(totals) for model, totals in models.items()}
        for epoch_id, models in raw.items()
    }


def _rounded_usage(totals: Tuple[float, float, float]) -> Dict[str, int]:
    requests, prompt, completion = (round(value) for value in totals)
    # Derive the total from the rounded parts so the stacked prompt/completion
    # bars always add up to the AI-token figure shown next to them.
    return {
        "inferences": requests,
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "ai_tokens": prompt + completion,
    }


def covered_epoch_ids(
    spans: List[EpochSpan],
    window_from: datetime,
    window_to: datetime,
    now: datetime,
    bucket_span: timedelta = HOUR_SPAN,
) -> List[int]:
    """Epochs whose whole duration falls inside the window.

    Writing a partially covered epoch would overwrite a complete total with a
    truncated one, so only fully covered epochs are persisted. A window that
    starts mid-bucket has a partial first bucket, so coverage starts at the
    next full bucket; the last bucket is the one still filling up to now.
    """
    covered_from = _ceil_to(window_from, bucket_span)
    covered_to = _floor_to(window_to, bucket_span) + bucket_span

    result = []
    for span in spans:
        span_end = span.end or now
        if span.start >= covered_from and span_end <= covered_to:
            result.append(span.epoch_id)
    return result


def response_window(
    payload: Dict[str, Any],
    expected_bucket: str = BUCKET_HOUR,
) -> Optional[Tuple[datetime, datetime]]:
    """The range a timeseries payload really covers, or None.

    The upstream may widen a short recent range into one of its presets, or
    switch bucket size, so the requested bounds cannot be trusted; a payload
    with a different bucket size than expected is rejected.
    """
    if payload.get("bucket") != expected_bucket:
        return None
    try:
        return parse_iso_utc(payload["from"]), parse_iso_utc(payload["to"])
    except (KeyError, TypeError, ValueError):
        return None


def is_final(span: EpochSpan, now: datetime) -> bool:
    return span.end is not None and span.end + FINALIZE_MARGIN <= now
