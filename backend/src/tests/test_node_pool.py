import httpx
import pytest

from backend.client import GonkaClient
from backend.node_pool import NodePool, Outcome, classify_error

G1 = "https://gonka01.example"
G4 = "https://gonka04.example"
GG = "https://rpc.example"

STATE_PRUNED = (
    '{"code":2, "message":"codespace sdk code 38: not found: failed to load state at height 6000000; '
    'version mismatch on immutable IAVL tree; version does not exist. Version has either been pruned, '
    'or is for a future block height (latest height: 6108526)", "details":[]}'
)
BLOCK_PRUNED = (
    '{"jsonrpc":"2.0","id":-1,"error":{"code":-32603,"message":"Internal error",'
    '"data":"height 1000000 is not available, lowest height is 6008526"}}'
)


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def status_body(latest, earliest, catching_up=False):
    return {
        "result": {
            "sync_info": {
                "latest_block_height": str(latest),
                "earliest_block_height": str(earliest),
                "catching_up": catching_up,
            }
        }
    }


def test_classifies_pruned_state_and_blocks_as_data_unavailable():
    assert classify_error(500, STATE_PRUNED) is Outcome.DATA_UNAVAILABLE
    assert classify_error(500, BLOCK_PRUNED) is Outcome.DATA_UNAVAILABLE
    future = '{"code":2, "message":"invalid height: cannot query with height in the future"}'
    assert classify_error(500, future) is Outcome.DATA_UNAVAILABLE
    next_block = (
        '{"jsonrpc":"2.0","id":-1,"error":{"code":-32603,"message":"Internal error",'
        '"data":"height 6109698 must be less than or equal to the current blockchain height 6109695"}}'
    )
    assert classify_error(500, next_block) is Outcome.DATA_UNAVAILABLE


def test_classifies_gateway_and_html_errors_as_node_failure():
    assert classify_error(503, "<html>503 Service Temporarily Unavailable</html>") is Outcome.NODE_FAILURE
    assert classify_error(502, "") is Outcome.NODE_FAILURE
    assert classify_error(500, "<html>boom</html>") is Outcome.NODE_FAILURE


def test_classifies_real_answers_as_app_error():
    assert classify_error(404, '{"code":5, "message":"proposal 999999 doesn\'t exist"}') is Outcome.APP_ERROR
    assert classify_error(500, '{"code":13, "message":"participant missing"}') is Outcome.APP_ERROR


def test_keeps_config_order_until_latency_is_known():
    pool = NodePool([G4, G1, GG], clock=FakeClock())
    assert pool.order() == [G4, G1, GG]


def test_prefers_lowest_latency_after_probing():
    pool = NodePool([G4, G1, GG], clock=FakeClock())
    pool.record_probe(G4, 0.39, 6108000, 6008000, False)
    pool.record_probe(G1, 0.07, 6108000, 1, False)
    pool.record_probe(GG, 1.9, 6108000, 6008000, False)
    assert pool.order() == [G1, G4, GG]


def test_cools_down_after_repeated_failures_then_recovers():
    clock = FakeClock()
    pool = NodePool([G1, G4], clock=clock)
    pool.record_probe(G1, 0.07, 100, 1, False)
    pool.record_probe(G4, 0.39, 100, 1, False)

    pool.record_failure(G1)
    assert pool.order()[0] == G1  # a single blip does not demote the fastest node

    pool.record_failure(G1)
    assert pool.order() == [G4, G1]

    clock.now += 16
    assert pool.order() == [G1, G4]


def test_cooldown_grows_with_consecutive_failures():
    clock = FakeClock()
    pool = NodePool([G1, G4], clock=clock)
    for _ in range(3):
        pool.record_failure(G1)
    clock.now += 16
    assert pool.order() == [G4, G1]
    clock.now += 15
    assert pool.order() == [G1, G4]


def test_success_clears_cooldown():
    pool = NodePool([G1, G4], clock=FakeClock())
    pool.record_failure(G1)
    pool.record_failure(G1)
    pool.record_success(G1)
    assert pool.order() == [G1, G4]


def test_demotes_nodes_behind_the_chain_tip():
    pool = NodePool([G1, G4], clock=FakeClock())
    pool.record_probe(G1, 0.07, 6100000, 1, False)
    pool.record_probe(G4, 0.39, 6108000, 6008000, False)
    assert pool.order() == [G4, G1]


def test_demotes_catching_up_nodes():
    pool = NodePool([G1, G4], clock=FakeClock())
    pool.record_probe(G1, 0.07, 6108000, 1, True)
    pool.record_probe(G4, 0.39, 6108000, 6008000, False)
    assert pool.order() == [G4, G1]


def test_routes_old_blocks_away_from_nodes_that_pruned_them():
    pool = NodePool([G4, G1], clock=FakeClock())
    pool.record_probe(G4, 0.05, 6108000, 6008000, False)
    pool.record_probe(G1, 0.07, 6108000, 1, False)
    assert pool.order(block_height=6100000) == [G4, G1]
    assert pool.order(block_height=1000000) == [G1, G4]


def test_old_state_skips_nodes_without_the_block():
    pool = NodePool([G4, G1], clock=FakeClock())
    pool.record_probe(G4, 0.05, 6108000, 6008000, False)
    pool.record_probe(G1, 0.07, 6108000, 1, False)
    assert pool.order(state_height=5900000) == [G1, G4]


def test_learns_state_floor_from_pruned_error_and_forgets_it():
    clock = FakeClock()
    pool = NodePool([G1, G4], clock=clock)
    pool.record_data_unavailable(G1, STATE_PRUNED, state_height=5500000)

    assert pool.order(state_height=5500000) == [G4, G1]
    assert pool.order(state_height=5400000) == [G4, G1]
    assert pool.order(state_height=5800000) == [G1, G4]
    assert pool.order() == [G1, G4]

    clock.now += 3601
    assert pool.order(state_height=5500000) == [G1, G4]


def test_learns_block_floor_from_lowest_height_error():
    pool = NodePool([G4, G1], clock=FakeClock())
    pool.record_data_unavailable(G4, BLOCK_PRUNED, state_height=None)
    assert pool.order(block_height=1000000) == [G1, G4]


def test_probe_never_lowers_a_known_block_floor():
    pool = NodePool([GG, G1], clock=FakeClock())
    pool.record_data_unavailable(GG, BLOCK_PRUNED, state_height=None)
    pool.record_probe(GG, 0.01, 6108000, 1, False)
    pool.record_probe(G1, 0.07, 6108000, 1, False)
    assert pool.order(block_height=1000000) == [G1, GG]


def test_data_unavailable_does_not_count_as_failure():
    pool = NodePool([G1, G4], clock=FakeClock())
    for _ in range(5):
        pool.record_data_unavailable(G1, STATE_PRUNED, state_height=100)
    assert pool.order() == [G1, G4]


def test_rejects_empty_pool():
    with pytest.raises(ValueError):
        NodePool([])


def make_client(handler, urls, **kwargs):
    client = GonkaClient(base_urls=urls, probe_interval=float("inf"), **kwargs)
    # Tests drive probing explicitly, so keep the background refresh from racing them.
    client._last_probe_at = 0.0
    transport = httpx.MockTransport(handler)
    client.http_client = httpx.AsyncClient(transport=transport)
    client.pool_http_client = httpx.AsyncClient(transport=transport)
    return client


@pytest.mark.asyncio
async def test_request_falls_over_to_next_node_when_first_is_down():
    calls = []

    def handler(request):
        calls.append(str(request.url.host))
        if request.url.host == "gonka01.example":
            raise httpx.ConnectError("refused")
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler, [G1, G4])
    assert await client._make_request("/chain-api/x") == {"ok": True}
    assert calls == ["gonka01.example", "gonka04.example"]


@pytest.mark.asyncio
async def test_pruned_node_hands_historical_query_to_node_with_history():
    def handler(request):
        if request.url.host == "gonka04.example":
            return httpx.Response(500, text=STATE_PRUNED)
        return httpx.Response(200, json={"height": request.headers["X-Cosmos-Block-Height"]})

    client = make_client(handler, [G4, G1])
    headers = {"X-Cosmos-Block-Height": "5900000"}
    assert await client._make_request("/chain-api/x", headers=headers) == {"height": "5900000"}
    # The pool remembers the floor, so the next old query goes straight to gonka01.
    assert client.node_pool.order(state_height=5900000)[0] == G1
    # A pruned answer is not a health failure: realtime traffic still prefers gonka04.
    assert client._get_current_url() == G4


@pytest.mark.asyncio
async def test_not_found_is_raised_without_asking_other_nodes():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(404, json={"code": 5, "message": "tx not found"})

    client = make_client(handler, [G1, G4])
    with pytest.raises(Exception, match="All URLs failed"):
        await client._make_request("/chain-api/cosmos/tx/v1beta1/txs/ABC")
    assert calls == ["gonka01.example"]
    assert client.node_pool.order() == [G1, G4]


@pytest.mark.asyncio
async def test_block_fetch_asks_one_node_at_a_time():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(200, json={"result": {"block": {"height": "6100000"}}})

    client = make_client(handler, [G1, G4])
    await client.get_block(6100000)
    assert calls == ["gonka01.example"]


@pytest.mark.asyncio
async def test_non_json_success_counts_as_node_failure():
    def handler(request):
        if request.url.host == "gonka01.example":
            return httpx.Response(200, text="<html>maintenance</html>")
        return httpx.Response(200, json={"ok": True})

    client = make_client(handler, [G1, G4])
    assert await client._make_request("/chain-api/x") == {"ok": True}


@pytest.mark.asyncio
async def test_block_fetch_skips_nodes_missing_the_block():
    def handler(request):
        if request.url.host == "gonka04.example":
            return httpx.Response(500, text=BLOCK_PRUNED)
        return httpx.Response(200, json={"result": {"block": {"height": "1000000"}}})

    client = make_client(handler, [G4, GG, G1])
    result = await client.get_block(1000000)
    assert result["result"]["block"]["height"] == "1000000"


@pytest.mark.asyncio
async def test_probe_orders_nodes_by_latency_and_learns_block_floor():
    def handler(request):
        if request.url.host == "gonka04.example":
            return httpx.Response(200, json=status_body(6108000, 6008000))
        return httpx.Response(200, json=status_body(6108000, 1))

    client = make_client(handler, [G4, G1])
    await client._refresh_nodes()
    nodes = {node.url: node for node in client.node_pool.snapshot()}
    assert nodes[G4].earliest_block_height == 6008000
    assert nodes[G1].earliest_block_height == 1
    assert client.node_pool.order(block_height=1000)[0] == G1


@pytest.mark.asyncio
async def test_failed_probes_cool_down_a_dead_node():
    def handler(request):
        if request.url.host == "gonka01.example":
            raise httpx.ConnectTimeout("timeout")
        return httpx.Response(200, json=status_body(6108000, 6008000))

    client = make_client(handler, [G1, G4])
    await client._refresh_nodes()
    await client._refresh_nodes()
    assert client._get_current_url() == G4


@pytest.mark.asyncio
async def test_participant_fallback_is_off_by_default():
    def handler(request):
        if request.url.path.endswith("/v1/epochs/current/participants"):
            raise httpx.ConnectError("down")
        raise httpx.ConnectError("down")

    client = make_client(handler, [G1])
    client._fallback_urls = ["http://54.38.118.143:8000"]
    with pytest.raises(Exception, match="All URLs failed"):
        await client._make_request("/chain-api/x")


@pytest.mark.asyncio
async def test_participant_fallback_serves_only_when_all_nodes_are_down():
    def handler(request):
        if request.url.host == "54.38.118.143":
            return httpx.Response(200, json={"from": "participant"})
        raise httpx.ConnectError("down")

    client = make_client(handler, [G1, G4], participant_fallback=True)
    client._fallback_urls = ["http://54.38.118.143:8000"]
    client._fallback_refreshed_at = float("inf")
    assert await client._make_request("/chain-api/x") == {"from": "participant"}


@pytest.mark.asyncio
async def test_participant_fallback_is_not_used_for_missing_history():
    participant_calls = []

    def handler(request):
        if request.url.host == "54.38.118.143":
            participant_calls.append(request.url)
            return httpx.Response(200, json={"from": "participant"})
        return httpx.Response(500, text=STATE_PRUNED)

    client = make_client(handler, [G1, G4], participant_fallback=True)
    client._fallback_urls = ["http://54.38.118.143:8000"]
    client._fallback_refreshed_at = float("inf")
    with pytest.raises(Exception, match="All URLs failed"):
        await client._make_request("/chain-api/x", headers={"X-Cosmos-Block-Height": "100"})
    assert participant_calls == []


def test_normalizes_configured_urls():
    client = GonkaClient(base_urls=[" https://a.example/ ", "", "https://a.example", "https://b.example"])
    assert client.base_urls == ["https://a.example", "https://b.example"]
