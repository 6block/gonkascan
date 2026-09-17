"""Health- and history-aware ordering of the chain nodes in INFERENCE_URLS.

Gonka nodes prune history very differently: one may keep ~500k blocks of app
state while another keeps ~20k. A node answering "state at height N was pruned"
is therefore not broken — it just cannot serve that height. The pool keeps the
two cases apart: transport and gateway failures cool a node down, while
data-availability errors only teach the pool which heights that node lacks.
"""

import json
import re
import time
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict, List, Optional

FAILURES_BEFORE_COOLDOWN = 2
BASE_COOLDOWN_SECONDS = 15.0
MAX_COOLDOWN_SECONDS = 300.0
LAG_TOLERANCE_BLOCKS = 30
STATE_FLOOR_TTL_SECONDS = 3600.0
LATENCY_SMOOTHING = 0.3

_STATE_PRUNED_MARKERS = (
    "failed to load state",
    "version does not exist",
    "has either been pruned",
)
_FUTURE_HEIGHT_MARKERS = (
    "cannot query with height in the future",
    "must be less than or equal to the current blockchain height",
)
_LOWEST_HEIGHT_RE = re.compile(r"lowest height is (\d+)")
_GATEWAY_STATUSES = frozenset({408, 429, 502, 503, 504})


class Outcome(Enum):
    # The node itself is unreachable or unhealthy.
    NODE_FAILURE = "node_failure"
    # The node is fine but lacks the requested history (pruned or not synced yet).
    DATA_UNAVAILABLE = "data_unavailable"
    # A real answer from a healthy node, e.g. 404 "proposal doesn't exist".
    APP_ERROR = "app_error"


def _is_json(body: str) -> bool:
    try:
        json.loads(body)
        return True
    except ValueError:
        return False


def classify_error(status_code: int, body: str) -> Outcome:
    if (
        _LOWEST_HEIGHT_RE.search(body)
        or any(marker in body for marker in _FUTURE_HEIGHT_MARKERS)
        or any(marker in body for marker in _STATE_PRUNED_MARKERS)
    ):
        return Outcome.DATA_UNAVAILABLE
    if status_code in _GATEWAY_STATUSES:
        return Outcome.NODE_FAILURE
    # A JSON 500 is the chain reporting a query-specific error; an HTML 500
    # comes from the proxy in front of a broken node.
    if status_code >= 500 and not _is_json(body):
        return Outcome.NODE_FAILURE
    return Outcome.APP_ERROR


@dataclass
class NodeState:
    url: str
    index: int
    latency: Optional[float] = None
    latest_height: Optional[int] = None
    earliest_block_height: Optional[int] = None
    catching_up: bool = False
    consecutive_failures: int = 0
    cooldown_until: float = 0.0
    state_floor: int = 0
    state_floor_learned_at: float = 0.0
    demoted_until: float = 0.0


class NodePool:
    def __init__(self, urls: List[str], clock: Callable[[], float] = time.monotonic):
        if not urls:
            raise ValueError("NodePool needs at least one node URL")
        self._clock = clock
        self._nodes: Dict[str, NodeState] = {
            url: NodeState(url=url, index=index) for index, url in enumerate(urls)
        }

    def order(
        self,
        state_height: Optional[int] = None,
        block_height: Optional[int] = None,
    ) -> List[str]:
        """Return every node, best candidate first.

        Nodes are never dropped, only demoted, so a stale hint can at worst cost
        an extra request instead of an outage.
        """
        now = self._clock()
        tip = self.tip_height()

        def sort_key(node: NodeState):
            return (
                self._lacks_data(node, state_height, block_height, now),
                node.cooldown_until > now,
                node.demoted_until > now,
                self._is_lagging(node, tip),
                node.latency if node.latency is not None else float("inf"),
                node.index,
            )

        return [node.url for node in sorted(self._nodes.values(), key=sort_key)]

    def tip_height(self) -> Optional[int]:
        heights = [n.latest_height for n in self._nodes.values() if n.latest_height is not None]
        return max(heights) if heights else None

    def record_success(self, url: str) -> None:
        node = self._nodes.get(url)
        if node is None:
            return
        node.consecutive_failures = 0
        node.cooldown_until = 0.0

    def record_failure(self, url: str) -> None:
        node = self._nodes.get(url)
        if node is None:
            return
        node.consecutive_failures += 1
        if node.consecutive_failures >= FAILURES_BEFORE_COOLDOWN:
            exponent = node.consecutive_failures - FAILURES_BEFORE_COOLDOWN
            cooldown = min(MAX_COOLDOWN_SECONDS, BASE_COOLDOWN_SECONDS * (2 ** exponent))
            node.cooldown_until = self._clock() + cooldown

    def record_data_unavailable(self, url: str, body: str, state_height: Optional[int]) -> None:
        node = self._nodes.get(url)
        if node is None:
            return
        lowest = _LOWEST_HEIGHT_RE.search(body)
        if lowest:
            node.earliest_block_height = max(node.earliest_block_height or 0, int(lowest.group(1)))
        if state_height is not None and any(marker in body for marker in _STATE_PRUNED_MARKERS):
            now = self._clock()
            if now - node.state_floor_learned_at >= STATE_FLOOR_TTL_SECONDS:
                node.state_floor = 0
            node.state_floor = max(node.state_floor, state_height + 1)
            node.state_floor_learned_at = now

    def record_probe(
        self,
        url: str,
        latency: float,
        latest_height: int,
        earliest_block_height: int,
        catching_up: bool,
    ) -> None:
        node = self._nodes.get(url)
        if node is None:
            return
        if node.latency is None:
            node.latency = latency
        else:
            node.latency = LATENCY_SMOOTHING * latency + (1 - LATENCY_SMOOTHING) * node.latency
        node.latest_height = latest_height
        # Pruning only moves the floor up. Load-balanced endpoints answer the
        # probe from different backends, so never let one lower a known floor.
        node.earliest_block_height = max(node.earliest_block_height or 0, earliest_block_height)
        node.catching_up = catching_up
        self.record_success(url)

    def demote(self, url: str, seconds: float) -> None:
        node = self._nodes.get(url)
        if node is not None:
            node.demoted_until = self._clock() + seconds

    def snapshot(self) -> List[NodeState]:
        return [NodeState(**vars(node)) for node in self._nodes.values()]

    @staticmethod
    def _lacks_data(
        node: NodeState,
        state_height: Optional[int],
        block_height: Optional[int],
        now: float,
    ) -> bool:
        earliest = node.earliest_block_height
        if block_height is not None and earliest is not None and earliest > block_height:
            return True
        if state_height is None:
            return False
        # A node cannot hold state for a height whose block it no longer has.
        if earliest is not None and earliest > state_height:
            return True
        floor_is_fresh = now - node.state_floor_learned_at < STATE_FLOOR_TTL_SECONDS
        return floor_is_fresh and node.state_floor > state_height

    @staticmethod
    def _is_lagging(node: NodeState, tip: Optional[int]) -> bool:
        if node.catching_up:
            return True
        if tip is None or node.latest_height is None:
            return False
        return tip - node.latest_height > LAG_TOLERANCE_BLOCKS
