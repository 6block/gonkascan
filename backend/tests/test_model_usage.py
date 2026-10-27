"""Unit tests for folding gonka.gg hourly model traffic into epochs."""

import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from backend.model_usage import (  # noqa: E402
    EpochSpan,
    aggregate_hourly_into_epochs,
    covered_epoch_ids,
    floor_hour,
    is_final,
    parse_bucket_ts,
    parse_iso_utc,
    response_window,
)

T0 = datetime(2026, 10, 1, 0, 0, tzinfo=timezone.utc)


def hour(n: int) -> datetime:
    return T0 + timedelta(hours=n)


def point(n: int, model: str = "m1", requests: int = 100, prompt: int = 900, completion: int = 100) -> dict:
    return {
        "ts": hour(n).strftime("%Y-%m-%d %H:%M:%S"),
        "model": model,
        "requests": requests,
        "finished": requests,
        "prompt": prompt,
        "completion": completion,
        "claimed": 0,
    }


def usage_of(inferences: int, prompt: int, completion: int) -> dict:
    return {
        "inferences": inferences,
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "ai_tokens": prompt + completion,
    }


def test_parse_bucket_ts_reads_upstream_format_as_utc():
    assert parse_bucket_ts("2026-10-01 05:00:00") == hour(5)


def test_floor_hour_drops_minutes_and_seconds():
    assert floor_hour(hour(3) + timedelta(minutes=59, seconds=12)) == hour(3)


def test_hour_fully_inside_one_epoch_counts_in_full():
    spans = [EpochSpan(epoch_id=10, start=hour(0), end=hour(10))]

    usage = aggregate_hourly_into_epochs([point(2)], spans, now=hour(20))

    assert usage == {10: {"m1": usage_of(100, 900, 100)}}


def test_hour_straddling_a_boundary_is_split_by_overlap():
    # Epoch 10 ends 15 minutes into hour 5, so 1/4 of that hour belongs to it.
    boundary = hour(5) + timedelta(minutes=15)
    spans = [
        EpochSpan(epoch_id=10, start=hour(0), end=boundary),
        EpochSpan(epoch_id=11, start=boundary, end=hour(10)),
    ]

    usage = aggregate_hourly_into_epochs([point(5, requests=400, prompt=3600, completion=400)], spans, now=hour(20))

    assert usage[10]["m1"] == usage_of(100, 900, 100)
    assert usage[11]["m1"] == usage_of(300, 2700, 300)


def test_split_never_loses_or_invents_traffic():
    boundary = hour(5) + timedelta(minutes=20)
    spans = [
        EpochSpan(epoch_id=10, start=hour(0), end=boundary),
        EpochSpan(epoch_id=11, start=boundary, end=hour(10)),
    ]

    usage = aggregate_hourly_into_epochs([point(5, requests=7, prompt=10, completion=3)], spans, now=hour(20))

    assert usage[10]["m1"]["inferences"] + usage[11]["m1"]["inferences"] == 7
    assert usage[10]["m1"]["ai_tokens"] + usage[11]["m1"]["ai_tokens"] == 13
    for epoch in (10, 11):
        row = usage[epoch]["m1"]
        assert row["ai_tokens"] == row["prompt_tokens"] + row["completion_tokens"]


def test_open_epoch_runs_until_now():
    spans = [EpochSpan(epoch_id=12, start=hour(0), end=None)]

    usage = aggregate_hourly_into_epochs([point(3), point(30)], spans, now=hour(10))

    # hour 30 is in the future relative to `now`, so it is not attributed.
    assert usage == {12: {"m1": usage_of(100, 900, 100)}}


def test_models_are_kept_separate():
    spans = [EpochSpan(epoch_id=10, start=hour(0), end=hour(10))]

    usage = aggregate_hourly_into_epochs(
        [point(1, model="a", requests=1, prompt=1, completion=0), point(1, model="b", requests=2, prompt=2, completion=0)],
        spans,
        now=hour(20),
    )

    assert usage[10] == {"a": usage_of(1, 1, 0), "b": usage_of(2, 2, 0)}


def test_points_outside_every_epoch_are_ignored():
    spans = [EpochSpan(epoch_id=10, start=hour(5), end=hour(10))]

    usage = aggregate_hourly_into_epochs([point(1), point(12)], spans, now=hour(20))

    assert usage == {}


def test_malformed_points_are_skipped_not_raised():
    spans = [EpochSpan(epoch_id=10, start=hour(0), end=hour(10))]
    bad = [{"ts": "not-a-time", "model": "m1"}, {"model": "m1"}, point(2)]

    usage = aggregate_hourly_into_epochs(bad, spans, now=hour(20))

    assert usage == {10: {"m1": usage_of(100, 900, 100)}}


def test_covered_epoch_ids_requires_the_whole_epoch_inside_the_window():
    spans = [
        EpochSpan(epoch_id=10, start=hour(0), end=hour(10)),  # starts before window
        EpochSpan(epoch_id=11, start=hour(10), end=hour(20)),  # fully inside
        EpochSpan(epoch_id=12, start=hour(20), end=hour(40)),  # ends after window
    ]

    assert covered_epoch_ids(spans, window_from=hour(5), window_to=hour(30), now=hour(50)) == [11]


def test_covered_epoch_ids_accepts_open_epoch_once_window_reaches_now():
    spans = [EpochSpan(epoch_id=12, start=hour(20), end=None)]

    assert covered_epoch_ids(spans, window_from=hour(0), window_to=hour(30), now=hour(30)) == [12]
    # Window stops short of now: the open epoch is not fully covered yet.
    assert covered_epoch_ids(spans, window_from=hour(0), window_to=hour(25), now=hour(30)) == []


class FakeGonkaGG:
    """Serves a flat 10 requests / 100 prompt / 10 completion per hour."""

    is_configured = True

    def __init__(self):
        self.calls = []

    async def get_timeseries(self, time_from, time_to, breakdown="model"):
        self.calls.append((time_from, time_to))
        start = parse_iso_utc(time_from)
        end = parse_iso_utc(time_to)
        series = []
        cursor = floor_hour(start)
        while cursor <= end:
            series.append({
                "ts": cursor.strftime("%Y-%m-%d %H:%M:%S"),
                "model": "m1",
                "requests": 10,
                "prompt": 100,
                "completion": 10,
            })
            cursor += timedelta(hours=1)
        return {
            "is_success": True,
            "error_message": None,
            "data": {"data": {"bucket": "hour", "from": time_from, "to": time_to, "series": series}},
        }


async def _insert_with_dummies(db_path, table, values):
    """Insert a row, filling every other NOT NULL column with a placeholder."""
    import aiosqlite

    async with aiosqlite.connect(db_path) as db:
        columns = await (await db.execute(f"PRAGMA table_info({table})")).fetchall()
        row = dict(values)
        for _, name, col_type, not_null, default, _ in columns:
            if name in row or not not_null or default is not None:
                continue
            row[name] = 0 if "INT" in (col_type or "").upper() else ""
        names = ", ".join(row)
        marks = ", ".join("?" for _ in row)
        await db.execute(f"INSERT INTO {table} ({names}) VALUES ({marks})", tuple(row.values()))
        await db.commit()


async def _seed_epochs(db_path, starts):
    for epoch_id, start in starts:
        height = 1000 + epoch_id
        await _insert_with_dummies(db_path, "epoch_participants_snapshot", {
            "epoch_id": epoch_id,
            "effective_block_height": height,
            "poc_start_block_height": height,
            "snapshot_json": "{}",
            "fetched_at": start.isoformat(),
        })
        await _insert_with_dummies(db_path, "blocks", {
            "height": height,
            "time": start.isoformat().replace("+00:00", "Z"),
        })


def test_sync_backfills_closed_epochs_then_only_refreshes_the_open_one(tmp_path):
    import asyncio

    from backend.database import CacheDB
    from backend.service import InferenceService

    async def scenario():
        db_path = str(tmp_path / "cache.db")
        cache_db = CacheDB(db_path)
        await cache_db.initialize()

        now = floor_hour(datetime.now(timezone.utc))
        await _seed_epochs(db_path, [
            (300, now - timedelta(hours=40)),
            (301, now - timedelta(hours=20)),
            (302, now - timedelta(hours=10)),  # still running
        ])

        fake = FakeGonkaGG()
        service = InferenceService(client=None, cache_db=cache_db, gonka_gg_client=fake)

        await service.sync_model_epoch_usage(request_delay=0)

        usage = {row["epoch_id"]: row for row in await cache_db.get_all_model_epoch_usage()}
        assert usage[300]["inferences"] == 200          # 20 full hours
        assert usage[300]["ai_tokens"] == 2200
        assert usage[301]["inferences"] == 100          # 10 full hours
        assert usage[302]["inferences"] >= 100          # open epoch, up to now
        assert await cache_db.get_final_usage_epochs() == {300, 301}
        assert len(fake.calls) == 1                     # one 7-day window covers all three

        # A second run makes just the trailing-week request, and leaves the
        # finalised epochs alone.
        await service.sync_model_epoch_usage(request_delay=0)
        assert len(fake.calls) == 2
        assert await cache_db.get_final_usage_epochs() == {300, 301}

    asyncio.run(scenario())


class SnappingGonkaGG(FakeGonkaGG):
    """Reproduces how the real upstream rewrites ranges (probed 2026-10-27).

    A range starting within the last 7 days becomes the trailing 7 days
    (hourly); one starting 7-30 days ago becomes the trailing 30 days (daily);
    anything older is served exactly as requested.
    """

    async def get_timeseries(self, time_from, time_to, breakdown="model"):
        now = datetime.now(timezone.utc)
        start = parse_iso_utc(time_from)
        if start >= now - timedelta(days=7):
            iso_now = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            iso_week = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
            return await super().get_timeseries(iso_week, iso_now, breakdown)
        if start >= now - timedelta(days=30):
            self.calls.append((time_from, time_to))
            return {
                "is_success": True,
                "error_message": None,
                "data": {"data": {"bucket": "day", "from": time_from, "to": time_to, "series": []}},
            }
        return await super().get_timeseries(time_from, time_to, breakdown)


def test_sync_keeps_the_running_epoch_fresh_despite_an_unservable_gap(tmp_path):
    import asyncio

    from backend.database import CacheDB
    from backend.service import InferenceService

    async def scenario():
        db_path = str(tmp_path / "cache.db")
        cache_db = CacheDB(db_path)
        await cache_db.initialize()

        now = floor_hour(datetime.now(timezone.utc))
        # Non-consecutive ids cut the spans, leaving one-day epochs:
        # 500 is old enough to be served exactly, 600 sits in the 7-30 day
        # band the upstream only serves daily, 700/701 are recent.
        await _seed_epochs(db_path, [
            (500, now - timedelta(days=40)),
            (501, now - timedelta(days=39)),
            (600, now - timedelta(days=15)),
            (601, now - timedelta(days=14)),
            (700, now - timedelta(days=1)),
            (701, now - timedelta(hours=12)),  # still running
        ])

        fake = SnappingGonkaGG()
        service = InferenceService(client=None, cache_db=cache_db, gonka_gg_client=fake)

        await service.sync_model_epoch_usage(request_delay=0)

        synced = {row["epoch_id"] for row in await cache_db.get_all_model_epoch_usage()}
        assert {500, 700, 701} <= synced
        assert 600 not in synced  # no hourly source yet; must not be guessed
        assert await cache_db.get_final_usage_epochs() == {500, 700}
        # One trailing-week request plus one exact backfill window; the gap
        # epoch is skipped without being requested.
        assert len(fake.calls) == 2

    asyncio.run(scenario())


def test_is_final_waits_for_the_margin_after_an_epoch_ends():
    ended = EpochSpan(epoch_id=1, start=hour(0), end=hour(10))

    assert not is_final(ended, now=hour(15))
    assert is_final(ended, now=hour(16))
    assert not is_final(EpochSpan(epoch_id=2, start=hour(10), end=None), now=hour(99))


@pytest.mark.parametrize(
    "payload",
    [
        {"bucket": "day", "from": "2026-10-01T00:00:00Z", "to": "2026-10-02T00:00:00Z", "series": []},
        {"bucket": "hour", "series": []},
        {"bucket": "hour", "from": "garbage", "to": "2026-10-02T00:00:00Z", "series": []},
    ],
)
def test_response_window_rejects_non_hourly_or_unbounded_payloads(payload):
    assert response_window(payload) is None


def test_response_window_uses_what_upstream_actually_returned():
    # gonka.gg widens short recent ranges to the trailing 7 days; trust the
    # bounds it reports rather than the ones we asked for.
    payload = {"bucket": "hour", "from": "2026-10-20T06:29:20Z", "to": "2026-10-27T06:30:20Z", "series": []}

    window_from, window_to = response_window(payload)

    assert window_from == datetime(2026, 10, 20, 6, 29, 20, tzinfo=timezone.utc)
    assert window_to == datetime(2026, 10, 27, 6, 30, 20, tzinfo=timezone.utc)
