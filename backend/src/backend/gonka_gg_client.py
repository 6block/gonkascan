"""Client for the gonka.gg public inference-stats API.

Since chain upgrade v0.2.12 the per-inference traffic (tokens, start/finish,
gateway attribution) no longer lives on the chain's Inference query path — it
moved into off-chain DevShard sessions. Reproducing it ourselves would mean
polling every host's `/devshard/vN/sessions/{escrow_id}/diffs` stream, which the
Gonka Labs team flagged as very expensive for hosts. They offered a read-only
public API instead so dashboards don't double the load on the network.

We poll that API on a conservative schedule and cache every response in our own
database, so the frontend never talks to gonka.gg directly and we can keep
serving the last known values (plus full history) if their API is unavailable.
"""

import logging
import time
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_BASE = "https://gonka-backend-production.up.railway.app/api/public"


class GonkaGGClient:
    def __init__(
        self,
        base_url: str = DEFAULT_BASE,
        api_key: str = "",
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """GET one endpoint, returning a uniform envelope instead of raising.

        Callers persist only successful responses, so a transient upstream
        failure leaves the previously cached values in place.
        """
        if not self.is_configured:
            return {
                "is_success": False,
                "error_message": "GONKA_GG_API_KEY is not set",
                "response_time_ms": None,
                "data": None,
            }

        url = f"{self.base_url}{path}"
        headers = {
            "X-API-Key": self.api_key,
            "Accept": "application/json",
        }
        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)
                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code != 200:
                    return {
                        "is_success": False,
                        "error_message": f"HTTP {response.status_code}",
                        "response_time_ms": response_time_ms,
                        "data": None,
                    }

                return {
                    "is_success": True,
                    "error_message": None,
                    "response_time_ms": response_time_ms,
                    "data": response.json(),
                }
        except Exception as e:
            return {
                "is_success": False,
                "error_message": str(e),
                "response_time_ms": int((time.time() - start_time) * 1000),
                "data": None,
            }

    async def get_recent_stats(self) -> Dict[str, Any]:
        """1h / 24h / 7d volume rollups."""
        return await self._get("/devshards/stats/recent")

    async def get_gateway_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Per-gateway traffic. Gateway == devshard escrow creator wallet;
        gonka.gg resolves the display name and folds multi-wallet operators
        into a single row via the `addresses` array."""
        return await self._get("/devshards/stats/gateways", params={"hours": hours})

    async def get_top_models(self, hours: int = 24) -> Dict[str, Any]:
        return await self._get("/devshards/stats/top-models", params={"hours": hours})

    async def get_timeseries(
        self,
        time_from: str,
        time_to: str,
        breakdown: str = "model",
    ) -> Dict[str, Any]:
        """Bucketed series. `breakdown` is "model" or "gateway"; the upstream
        picks the bucket size from the range and returns it in the payload."""
        return await self._get(
            "/devshards/timeseries",
            params={"from": time_from, "to": time_to, "breakdown": breakdown},
        )

    async def get_inference_network_stats(self) -> Dict[str, Any]:
        """Per-epoch pass-rate history (epoch 1 → current).

        Note: the top-level summary fields on this payload come back as 0;
        the caller derives totals from `epochs_history` instead.
        """
        return await self._get("/stats/inference-network-stats")
