import httpx
import base64
import hashlib
from typing import List, Dict, Any, Optional, Tuple
import logging
import time
import bech32
import asyncio
import json

from backend.node_pool import LAG_TOLERANCE_BLOCKS, NodePool, Outcome, classify_error
from backend.dex import (
    ETH_RPC_URL,
    GECKOTERMINAL_POOL_URL,
    SLOT0_SELECTOR,
    WGNK_USDT_POOL,
    parse_slot0_price,
)

logger = logging.getLogger(__name__)

BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"


HEIGHT_HEADER = "X-Cosmos-Block-Height"
PROBE_PATH = "/chain-rpc/status"
PROBE_TIMEOUT_SECONDS = 5.0
BLOCK_RACE_WIDTH = 2
ROTATE_DEMOTE_SECONDS = 10.0
ERROR_BODY_LIMIT = 2000
FALLBACK_REFRESH_SECONDS = 600.0
FALLBACK_POOL_SIZE = 10
FALLBACK_ATTEMPTS = 3
FALLBACK_PROBE_CONCURRENCY = 20


class NodeRequestError(Exception):
    def __init__(self, outcome: Outcome, cause: Exception):
        super().__init__(str(cause))
        self.outcome = outcome
        self.cause = cause


def _normalize_urls(urls: List[str]) -> List[str]:
    normalized: List[str] = []
    for url in urls:
        cleaned = url.strip().rstrip("/")
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    if not normalized:
        raise ValueError("GonkaClient needs at least one node URL")
    return normalized


def _state_height_from(headers: Optional[Dict[str, str]]) -> Optional[int]:
    if not headers or HEIGHT_HEADER not in headers:
        return None
    try:
        return int(headers[HEIGHT_HEADER])
    except (TypeError, ValueError):
        return None


class GonkaClient:
    def __init__(
        self,
        base_urls: List[str],
        timeout: float = 30.0,
        max_concurrency: int = 50,
        probe_interval: float = 30.0,
        participant_fallback: bool = False,
    ):
        self.base_urls = _normalize_urls(base_urls)
        self.timeout = timeout
        self.probe_interval = probe_interval
        self.participant_fallback = participant_fallback
        self.node_pool = NodePool(self.base_urls)
        self.pool_semaphore = asyncio.Semaphore(max_concurrency)
        # One long-lived client so requests reuse TCP/TLS connections instead of
        # paying a fresh handshake each time. Connections are left unbounded to
        # match the old one-client-per-request concurrency.
        self.http_client = httpx.AsyncClient(
            timeout=timeout,
            limits=httpx.Limits(max_connections=None, max_keepalive_connections=100),
        )
        self.pool_http_client = httpx.AsyncClient(
            timeout=timeout,
            http2=True,
            limits=httpx.Limits(max_connections=max_concurrency, max_keepalive_connections=max_concurrency)
        )
        self._refresh_task: Optional[asyncio.Task] = None
        self._last_probe_at: Optional[float] = None
        self._fallback_urls: List[str] = []
        self._fallback_refreshed_at: Optional[float] = None

    async def aclose(self) -> None:
        if self._refresh_task and not self._refresh_task.done():
            self._refresh_task.cancel()
        await self.http_client.aclose()
        await self.pool_http_client.aclose()

    async def _fetch_json(
        self,
        http_client: httpx.AsyncClient,
        base_url: str,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        state_height: Optional[int] = None,
        track_health: bool = True,
    ) -> Any:
        try:
            response = await http_client.get(url, params=params, headers=headers)
        except Exception as e:
            logger.warning(f"Request failed to {url}: {e}")
            if track_health:
                self.node_pool.record_failure(base_url)
            raise NodeRequestError(Outcome.NODE_FAILURE, e) from e

        if not response.is_success:
            body = response.text[:ERROR_BODY_LIMIT]
            outcome = classify_error(response.status_code, body)
            error = httpx.HTTPStatusError(
                f"HTTP {response.status_code} from {url}: {body[:300]}",
                request=response.request,
                response=response,
            )
            if outcome is Outcome.DATA_UNAVAILABLE:
                logger.info(f"{base_url} lacks data for {url} (height={state_height}); trying next node")
                if track_health:
                    self.node_pool.record_data_unavailable(base_url, body, state_height)
            else:
                logger.warning(f"Request failed to {url}: {error}")
                if track_health and outcome is Outcome.NODE_FAILURE:
                    self.node_pool.record_failure(base_url)
            raise NodeRequestError(outcome, error)

        try:
            data = response.json()
        except ValueError as e:
            logger.warning(f"Non-JSON response from {url}: {e}")
            if track_health:
                self.node_pool.record_failure(base_url)
            raise NodeRequestError(Outcome.NODE_FAILURE, e) from e

        if track_health:
            self.node_pool.record_success(base_url)
        return data

    async def pool_fetch_one(self, base_url: str, full_url: str) -> Optional[dict]:
        async with self.pool_semaphore:
            try:
                return await self._fetch_json(self.pool_http_client, base_url, full_url)
            except NodeRequestError:
                return None

    async def pool_race_first(self, pairs: List[tuple[str, str]]) -> dict:
        coros = [self.pool_fetch_one(base, full) for base, full in pairs]
        for coro in asyncio.as_completed(coros):
            result = await coro
            if result is not None:
                return result

        raise Exception("All RPC nodes failed")

    async def _fetch_block_rpc(self, endpoint: str, height: int) -> dict:
        self._schedule_node_refresh()
        ordered = self.node_pool.order(block_height=height)
        raced = ordered[:BLOCK_RACE_WIDTH]
        try:
            return await self.pool_race_first(
                [(base, f"{base}/chain-rpc/{endpoint}?height={height}") for base in raced]
            )
        except Exception:
            logger.warning(f"Racing nodes failed for {endpoint} at height {height}; trying remaining nodes")
        for base in ordered[BLOCK_RACE_WIDTH:]:
            result = await self.pool_fetch_one(base, f"{base}/chain-rpc/{endpoint}?height={height}")
            if result is not None:
                return result
        raise Exception("All RPC nodes failed")

    def _get_current_url(self) -> str:
        return self.node_pool.order()[0]

    def _rotate_url(self) -> None:
        # Callers rotate to retry on a different node. Demote the preferred one
        # briefly instead of reordering permanently, so latency-based ordering
        # takes over again once the retry window has passed.
        self.node_pool.demote(self._get_current_url(), ROTATE_DEMOTE_SECONDS)
        logger.info(f"Rotated to URL: {self._get_current_url()}")

    def _schedule_node_refresh(self) -> None:
        if len(self.base_urls) < 2 and not self.participant_fallback:
            return
        if self._refresh_task and not self._refresh_task.done():
            return
        now = time.monotonic()
        if self._last_probe_at is not None and now - self._last_probe_at < self.probe_interval:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        self._last_probe_at = now
        self._refresh_task = loop.create_task(self._refresh_nodes())

    async def _refresh_nodes(self) -> None:
        try:
            await asyncio.gather(*(self._probe_primary(url) for url in self.base_urls))
            fallback_is_stale = (
                self._fallback_refreshed_at is None
                or time.monotonic() - self._fallback_refreshed_at >= FALLBACK_REFRESH_SECONDS
            )
            if self.participant_fallback and fallback_is_stale:
                await self._refresh_fallback_nodes()
        except Exception as e:
            logger.warning(f"Node refresh failed: {e}")

    async def _probe_status(self, base_url: str) -> Optional[Dict[str, Any]]:
        start = time.perf_counter()
        try:
            response = await self.http_client.get(
                f"{base_url}{PROBE_PATH}", timeout=PROBE_TIMEOUT_SECONDS
            )
            response.raise_for_status()
            sync_info = response.json()["result"]["sync_info"]
            return {
                "latency": time.perf_counter() - start,
                "latest_height": int(sync_info["latest_block_height"]),
                "earliest_block_height": int(sync_info["earliest_block_height"]),
                "catching_up": bool(sync_info.get("catching_up", False)),
            }
        except Exception as e:
            logger.debug(f"Probe failed for {base_url}: {e}")
            return None

    async def _probe_primary(self, base_url: str) -> None:
        status = await self._probe_status(base_url)
        if status is None:
            self.node_pool.record_failure(base_url)
            return
        self.node_pool.record_probe(base_url, **status)

    async def _refresh_fallback_nodes(self) -> None:
        discovered = await self.discover_urls()
        semaphore = asyncio.Semaphore(FALLBACK_PROBE_CONCURRENCY)

        async def probe(url: str) -> Optional[Dict[str, Any]]:
            async with semaphore:
                return await self._probe_status(url)

        statuses = await asyncio.gather(*(probe(url) for url in discovered))
        tip = self.node_pool.tip_height()
        healthy = [
            (status["latency"], url)
            for url, status in zip(discovered, statuses)
            if status is not None
            and not status["catching_up"]
            and (tip is None or tip - status["latest_height"] <= LAG_TOLERANCE_BLOCKS)
        ]
        self._fallback_urls = [url for _, url in sorted(healthy)][:FALLBACK_POOL_SIZE]
        self._fallback_refreshed_at = time.monotonic()
        logger.info(f"Participant fallback nodes refreshed: {len(self._fallback_urls)} healthy of {len(discovered)}")

    async def _make_request(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        self._schedule_node_refresh()
        state_height = _state_height_from(headers)
        last_error: Optional[Exception] = None
        only_node_failures = True

        for base_url in self.node_pool.order(state_height=state_height):
            url = f"{base_url}/{path.lstrip('/')}"
            try:
                return await self._fetch_json(
                    self.http_client, base_url, url, params, headers, state_height
                )
            except NodeRequestError as e:
                last_error = e.cause
                only_node_failures = only_node_failures and e.outcome is Outcome.NODE_FAILURE

        # Participant nodes are third-party, so they only serve when every
        # configured node is down, never to work around missing history.
        if self.participant_fallback and only_node_failures:
            for base_url in self._fallback_urls[:FALLBACK_ATTEMPTS]:
                url = f"{base_url}/{path.lstrip('/')}"
                try:
                    data = await self._fetch_json(
                        self.http_client, base_url, url, params, headers, state_height,
                        track_health=False,
                    )
                    logger.warning(f"All configured nodes failed; served {path} from participant node {base_url}")
                    return data
                except NodeRequestError as e:
                    last_error = e.cause

        raise Exception(f"All URLs failed. Last error: {last_error}")
    
    async def get_current_epoch_participants(self) -> Dict[str, Any]:
        return await self._make_request("/v1/epochs/current/participants")

    async def get_current_epoch_group_data(self) -> Dict[str, Any]:
        return await self._make_request(
            "/chain-api/productscience/inference/inference/current_epoch_group_data"
        )
    
    async def get_epoch_participants(self, epoch_id: int) -> Dict[str, Any]:
        return await self._make_request(f"/v1/epochs/{epoch_id}/participants")
    
    async def get_all_participants(self, height: Optional[int] = None) -> Dict[str, Any]:
        params = {"pagination.limit": "10000"}
        headers = {}
        
        if height is not None:
            headers["X-Cosmos-Block-Height"] = str(height)
        
        return await self._make_request(
            "/chain-api/productscience/inference/inference/participant",
            params=params,
            headers=headers if headers else None
        )
    
    async def get_latest_height(self) -> int:
        data = await self._make_request("/chain-rpc/status")
        return int(data["result"]["sync_info"]["latest_block_height"])
    
    async def discover_urls(self) -> List[str]:
        try:
            participants_data = await self.get_current_epoch_participants()
            participants = participants_data.get("active_participants", {}).get("participants", [])
            
            discovered = []
            for p in participants:
                inference_url = p.get("inference_url", "").rstrip('/')
                if inference_url and inference_url not in self.base_urls:
                    discovered.append(inference_url)
            
            logger.info(f"Discovered {len(discovered)} additional URLs")
            return discovered
        except Exception as e:
            logger.error(f"Failed to discover URLs: {e}")
            return []
    
    async def get_all_validators(self, height: Optional[int] = None) -> List[Dict[str, Any]]:
        validators = []
        next_key = ""
        
        while True:
            params = {"pagination.limit": "200"}
            if next_key:
                params["pagination.key"] = next_key
            
            headers = {}
            if height is not None:
                headers["X-Cosmos-Block-Height"] = str(height)
            
            data = await self._make_request(
                "/chain-api/cosmos/staking/v1beta1/validators",
                params=params,
                headers=headers if headers else None
            )
            
            validators.extend(data.get("validators", []))
            next_key = data.get("pagination", {}).get("next_key") or ""
            
            if not next_key:
                break
        
        logger.info(f"Fetched {len(validators)} validators")
        return validators
    
    async def get_signing_info(self, valcons_addr: str, height: Optional[int] = None) -> Optional[Dict[str, Any]]:
        try:
            headers = {}
            if height is not None:
                headers["X-Cosmos-Block-Height"] = str(height)
            
            data = await self._make_request(
                f"/chain-api/cosmos/slashing/v1beta1/signing_infos/{valcons_addr}",
                headers=headers if headers else None
            )
            return data.get("val_signing_info")
        except Exception as e:
            logger.warning(f"Failed to get signing info for {valcons_addr}: {e}")
            return None
    
    @staticmethod
    def pubkey_to_valcons(pubkey_b64: str, hrp: str = "gonkavalcons") -> str:
        def _polymod(values: List[int]) -> int:
            generators = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
            checksum = 1
            for value in values:
                top = checksum >> 25
                checksum = ((checksum & 0x1FFFFFF) << 5) ^ value
                for i in range(5):
                    if (top >> i) & 1:
                        checksum ^= generators[i]
            return checksum
        
        def _hrp_expand(hrp: str) -> List[int]:
            return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]
        
        def _create_checksum(hrp: str, data: List[int]) -> List[int]:
            polymod = _polymod(_hrp_expand(hrp) + data + [0, 0, 0, 0, 0, 0]) ^ 1
            return [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]
        
        def _bech32_encode(hrp: str, data: List[int]) -> str:
            return hrp + "1" + "".join(BECH32_CHARSET[d] for d in data + _create_checksum(hrp, data))
        
        def _convertbits(data: bytes, frombits: int, tobits: int, pad: bool = True) -> List[int]:
            accumulator = 0
            bits = 0
            result: List[int] = []
            max_value = (1 << tobits) - 1
            for byte in data:
                accumulator = (accumulator << frombits) | byte
                bits += frombits
                while bits >= tobits:
                    bits -= tobits
                    result.append((accumulator >> bits) & max_value)
            if pad and bits:
                result.append((accumulator << (tobits - bits)) & max_value)
            return result
        
        public_key = base64.b64decode(pubkey_b64)
        hex20 = hashlib.sha256(public_key).digest()[:20]
        data5 = _convertbits(hex20, 8, 5, pad=True)
        return _bech32_encode(hrp, data5)
    
    async def check_node_health(self, inference_url: str) -> Dict[str, Any]:
        if not inference_url:
            return {
                "is_healthy": False,
                "error_message": "No inference URL",
                "response_time_ms": None
            }
        
        health_url = inference_url.rstrip('/') + '/health'
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_url)
                response_time_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    return {
                        "is_healthy": True,
                        "error_message": None,
                        "response_time_ms": response_time_ms
                    }
                else:
                    return {
                        "is_healthy": False,
                        "error_message": f"HTTP {response.status_code}",
                        "response_time_ms": response_time_ms
                    }
        except Exception as e:
            return {
                "is_healthy": False,
                "error_message": str(e),
                "response_time_ms": None
            }
    
    async def get_epoch_performance_summary(
        self,
        epoch_id: int,
        participant_id: str,
        height: Optional[int] = None
    ) -> Dict[str, Any]:
        path = f"/chain-api/productscience/inference/inference/epoch_performance_summary/{epoch_id}/{participant_id}"
        headers = {}
        
        if height is not None:
            headers["X-Cosmos-Block-Height"] = str(height)
        
        return await self._make_request(path, headers=headers)
    
    async def get_latest_epoch(self) -> Dict[str, Any]:
        return await self._make_request("/v1/epochs/latest")
    
    async def get_authz_grants(self, granter: str) -> List[Dict[str, Any]]:
        REQUIRED_PERMISSIONS = {
            "MsgStartInference",
            "MsgFinishInference",
            "MsgClaimRewards",
            "MsgValidation",
            "MsgSubmitPocBatch",
            "MsgSubmitPocValidation",
            "MsgSubmitSeed",
            "MsgBridgeExchange",
            "MsgSubmitTrainingKvRecord",
            "MsgJoinTraining",
            "MsgJoinTrainingStatus",
            "MsgTrainingHeartbeat",
            "MsgSetBarrier",
            "MsgClaimTrainingTaskForAssignment",
            "MsgAssignTrainingTask",
            "MsgSubmitNewUnfundedParticipant",
            "MsgSubmitHardwareDiff",
            "MsgInvalidateInference",
            "MsgRevalidateInference",
            "MsgSubmitDealerPart",
            "MsgSubmitVerificationVector",
            "MsgRequestThresholdSignature",
            "MsgSubmitPartialSignature",
            "MsgSubmitGroupKeyValidationSignature",
        }
        
        grants = []
        offset = 0
        
        while True:
            params = {
                "pagination.limit": "100",
                "pagination.offset": str(offset)
            }
            
            try:
                data = await self._make_request(
                    f"/chain-api/cosmos/authz/v1beta1/grants/granter/{granter}",
                    params=params
                )
                
                batch_grants = data.get("grants", [])
                if not batch_grants:
                    break
                
                grants.extend(batch_grants)
                
                if len(batch_grants) < 100:
                    break
                
                offset += 100
                
            except Exception as e:
                logger.warning(f"Failed to fetch authz grants for {granter} at offset {offset}: {e}")
                break
        
        grantee_perms: Dict[str, Dict[str, Any]] = {}
        for grant in grants:
            grantee = grant.get("grantee", "")
            if not grantee:
                continue
            
            authorization = grant.get("authorization", {})
            msg_url = authorization.get("msg", "")
            expiration = grant.get("expiration") or ""
            
            if grantee not in grantee_perms:
                grantee_perms[grantee] = {
                    "permissions": set(),
                    "expiration": expiration
                }
            
            for msg_type in REQUIRED_PERMISSIONS:
                if msg_type in msg_url:
                    grantee_perms[grantee]["permissions"].add(msg_type)
        
        warm_keys = []
        for grantee, info in grantee_perms.items():
            if len(info["permissions"]) >= 24:
                warm_keys.append({
                    "grantee_address": grantee,
                    "granted_at": info["expiration"]
                })
        
        warm_keys.sort(key=lambda x: x["granted_at"], reverse=True)
        
        logger.info(f"Found {len(warm_keys)} warm keys for {granter}")
        return warm_keys
    
    async def get_hardware_nodes(self, participant_address: str) -> List[Dict[str, Any]]:
        path = f"/chain-api/productscience/inference/inference/hardware_nodes/{participant_address}"
        try:
            data = await self._make_request(path)
            hardware_nodes = data.get("nodes", {}).get("hardware_nodes", [])
            logger.info(f"Found {len(hardware_nodes)} hardware nodes for {participant_address}")
            return hardware_nodes
        except Exception as e:
            logger.warning(f"Failed to fetch hardware nodes for {participant_address}: {e}")
            return []
    
    async def get_block(self, height: int) -> dict:
        return await self._fetch_block_rpc("block", height)

    async def get_block_results(self, height: int) -> dict:
        return await self._fetch_block_rpc("block_results", height)
    
    async def get_restrictions_params(self) -> Dict[str, Any]:
        return await self._make_request("/chain-api/productscience/inference/restrictions/params")
    
    @staticmethod
    def convert_bech32_address(address: str, new_prefix: str) -> Optional[str]:
        try:
            hrp, data = bech32.bech32_decode(address)
            if data is None:
                logger.warning(f"Invalid Bech32 address: {address}")
                return None
            
            new_address = bech32.bech32_encode(new_prefix, data)
            if new_address is None:
                logger.warning(f"Could not encode new Bech32 address with prefix {new_prefix}")
                return None
            
            return new_address
        except Exception as e:
            logger.warning(f"Error converting address {address}: {e}")
            return None
    
    async def get_keybase_info(self, identity: str) -> Tuple[Optional[str], Optional[str]]:
        try:
            api_url = f"https://keybase.io/_/api/1.0/user/lookup.json?key_suffix={identity}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url)
                response.raise_for_status()
                data = response.json()
                
                if data.get("status", {}).get("code") == 0 and data.get("them"):
                    username = data["them"][0].get("basics", {}).get("username")
                    if username:
                        picture_url = f"https://keybase.io/{username}/picture?size=96"
                        return username, picture_url
        except Exception as e:
            logger.warning(f"Failed to fetch Keybase info for {identity}: {e}")
        
        return None, None
    
    async def get_models_all(self) -> Dict[str, Any]:
        return await self._make_request("/chain-api/productscience/inference/inference/models_all")
    
    async def get_models_stats(self) -> Dict[str, Any]:
        return await self._make_request("/chain-api/productscience/inference/inference/models_stats_by_time")
    
    async def get_all_inferences(
        self, 
        epoch_id: Optional[int] = None,
        limit: int = 500,
        page_delay: int = 20
    ) -> List[Dict[str, Any]]:
        inferences = []
        next_key = None
        page_count = 0
        total_fetched = 0
        total_filtered = 0
        
        while True:
            params = {"pagination.limit": str(limit)}
            if next_key:
                params["pagination.key"] = next_key
            
            result = await self._make_request(
                "/chain-api/productscience/inference/inference/inference",
                params=params
            )
            
            batch = result.get("inference", [])
            if not batch:
                break
            
            page_count += 1
            total_fetched += len(batch)
            
            if epoch_id is not None:
                before_filter = len(batch)
                batch = [inf for inf in batch if inf.get("epoch_id") == str(epoch_id) or inf.get("epoch_id") == "0"]
                filtered_count = before_filter - len(batch)
                total_filtered += filtered_count
                logger.debug(f"Page {page_count}: fetched {before_filter}, kept {len(batch)} for epoch {epoch_id} (including epoch_id='0'), filtered {filtered_count}")
            
            inferences.extend(batch)
            
            pagination = result.get("pagination", {})
            next_key = pagination.get("next_key")
            
            if not next_key:
                break
            
            logger.info(f"Waiting {page_delay}s before next page to avoid rate limiting")
            await asyncio.sleep(page_delay)
        
        logger.info(f"Fetched {page_count} pages, {total_fetched} total inferences, {total_filtered} filtered, {len(inferences)} kept")
        return inferences
    
    async def get_participant_confirmation_data(
        self,
        participant_id: str,
        height: Optional[int] = None
    ) -> Dict[str, Any]:
        path = f"/chain-api/productscience/inference/inference/participant/{participant_id}"
        headers = {}
        if height is not None:
            headers["X-Cosmos-Block-Height"] = str(height)
        return await self._make_request(path, headers=headers if headers else None)
    
    async def get_epoch_group_data(
        self,
        epoch_id: int,
        height: Optional[int] = None,
        model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        path = f"/chain-api/productscience/inference/inference/epoch_group_data/{epoch_id}"
        params = {"model_id": model_id} if model_id is not None else None
        headers = {}
        if height is not None:
            headers["X-Cosmos-Block-Height"] = str(height)
        return await self._make_request(
            path,
            params=params,
            headers=headers if headers else None
        )

    async def get_transaction(self, transaction_hash: str) -> Dict[str, Any]:
        path = f"chain-api/cosmos/tx/v1beta1/txs/{transaction_hash}"
        try:
            data = await self._make_request(path)
            tx_response = data.get("tx_response", {})
            logger.info(f"Found transaction {transaction_hash}")
            return tx_response
        except Exception as e:
            logger.warning(f"Failed to fetch hardware nodes for {transaction_hash}: {e}")
            return {}
    
    async def get_balances(self, address: str) -> Dict[str, Any]:
        return await self._make_request(f"/chain-api/cosmos/bank/v1beta1/balances/{address}")

    async def get_denom_trace(self, denom_hash: str) -> Dict[str, Any]:
        return await self._make_request(
            f"/chain-api/ibc/apps/transfer/v1/denom_traces/{denom_hash}"
        )

    async def get_channel_client_state(
        self,
        channel_id: str,
        port_id: str = "transfer",
    ) -> Dict[str, Any]:
        return await self._make_request(
            f"/chain-api/ibc/core/channel/v1/channels/{channel_id}/ports/{port_id}/client_state"
        )

    async def get_participant_collateral(
        self,
        participant_id: str,
        height: Optional[int] = None,
    ) -> Dict[str, Any]:
        path = f"/chain-api/productscience/inference/collateral/collateral/{participant_id}"
        if height is None:
            return await self._make_request(path)

        # Try historical state first; fall back to current if the node has
        # pruned that height (returns non-2xx).
        try:
            return await self._make_request(
                path,
                headers={"X-Cosmos-Block-Height": str(height)},
            )
        except Exception as e:
            logger.warning(
                f"Historical collateral query at height {height} failed for "
                f"{participant_id}, falling back to current: {e}"
            )
            return await self._make_request(path)

    async def get_total_vesting(self, address: str) -> Dict[str, Any]:
        return await self._make_request(f"/chain-api/productscience/inference/streamvesting/total_vesting/{address}")
    
    async def get_vesting_schedule(self, address: str) -> Dict[str, Any]:
        return await self._make_request(f"/chain-api/productscience/inference/streamvesting/vesting_schedule/{address}")
    
    async def get_inference_params(self, height: Optional[int] = None) -> Dict[str, Any]:
        path = "/chain-api/productscience/inference/inference/params"
        if height is None:
            return await self._make_request(path)

        try:
            return await self._make_request(
                path,
                headers={"X-Cosmos-Block-Height": str(height)},
            )
        except Exception as e:
            logger.warning(
                f"Historical inference params query at height {height} failed, "
                f"falling back to current: {e}"
            )
            return await self._make_request(path)
    
    async def get_tallying(self):
        return await self._make_request("/chain-api/cosmos/gov/v1/params/tallying")

    async def get_proposal_tally(self, proposal_id: int):
        return await self._make_request(f"/chain-api/cosmos/gov/v1/proposals/{proposal_id}/tally")
    
    async def get_genesis(self):
        return await self._make_request("/chain-rpc/genesis")
    
    async def get_proposal(self, proposal_id: int):
        return await self._make_request(f"/chain-api/cosmos/gov/v1/proposals/{proposal_id}")

    async def get_proposals(self, status_code: int, limit: int = 100):
        url = f"/chain-api/cosmos/gov/v1/proposals?proposal_status={status_code}&pagination.limit={limit}&pagination.count_total=true&pagination.reverse=true"
        responses = await self._make_request(url)
        proposals = responses.get("proposals", [])
        next_key = responses["pagination"]["next_key"] if responses else None
        while next_key:
            url = f"chain-api/cosmos/gov/v1/proposals?proposal_status={status_code}&pagination.key={next_key}&pagination.limit={limit}&pagination.reverse=true"
            responses = await self._make_request(url)
            proposals.extend(responses["proposals"])
            next_key = responses["pagination"]["next_key"] if responses else None
        return proposals

    async def get_proposal_transactions(self, proposal_id: int, limit: int = 100):
        result = {}
        tx_urls = {
            "submit":  f"/chain-api/cosmos/tx/v1beta1/txs?query=submit_proposal.proposal_id={proposal_id}&page=1&limit={limit}",
            "deposit": f"/chain-api/cosmos/tx/v1beta1/txs?query=proposal_deposit.proposal_id={proposal_id}&page=1&limit={limit}",
            "vote":    f"/chain-api/cosmos/tx/v1beta1/txs?query=proposal_vote.proposal_id={proposal_id}&page=1&limit={limit}"
        }

        first_tx_responses = await asyncio.gather(*(self._make_request(url) for url in tx_urls.values()))
        for key in tx_urls.keys():
            result[key] = {"total": 0, "txs": []}

        pagination_jobs = []
        for (key, _), res in zip(tx_urls.items(), first_tx_responses):
            if not res:
                continue

            total = int(res.get("total", 0))
            txs = res.get("tx_responses", [])
            result[key]["txs"].extend(txs)
            result[key]["total"] = total

            if len(txs) < total:
                total_pages = (total + limit - 1) // limit
                for page in range(2, total_pages + 1):
                    pagination_jobs.append((key, page, limit))

        if pagination_jobs:
            urls2 = [
                (
                    key,
                    f"/chain-api/cosmos/tx/v1beta1/txs?query="
                    f"{('submit_proposal' if key=='submit' else ('proposal_deposit' if key=='deposit' else 'proposal_vote'))}"
                    f".proposal_id={proposal_id}&page={page}&limit={limit}"
                )
                for key, page, limit in pagination_jobs
            ]
            pages = await asyncio.gather(*(self._make_request(url) for _, url in urls2))
            for (key, _), page_res in zip(urls2, pages):
                if page_res and "txs" in page_res:
                    result[key]["txs"].extend(page_res["tx_responses"])
        return result
    
    async def fetch_gonka_orderbook(self) -> Dict[str, Any]:
        RPC_URL = "https://api.hot-labs.org/api/v1/evm/rpc/1010"

        args = {
            "token_pair": {
                "base": "nep245:v2_1.omni.hot.tg:4444119_wyixUKCL",
                "quote": "nep141:usdt.tether-token.near"
            },
            "depth": 1000,
            "with_extra": True
        }

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "query",
            "params": {
                "request_type": "call_function",
                "finality": "optimistic",
                "account_id": "orderbook.fi.tg",
                "method_name": "get_orderbook",
                "args_base64": base64.b64encode(json.dumps(args).encode()).decode()
            }
        }

        headers = {
            "Content-Type": "application/json",
            "Api-Key": "hex",
            "Origin": "https://hex.exchange",
            "Referer": "https://hex.exchange/",
            "User-Agent": "Mozilla/5.0"
        }

        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(RPC_URL, json=payload, headers=headers)
                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code != 200:
                    return {
                        "is_success": False,
                        "error_message": f"HTTP {response.status_code}",
                        "response_time_ms": response_time_ms,
                        "data": None
                    }

                data = response.json()

                raw_bytes = bytes(data["result"]["result"])
                orderbook = json.loads(raw_bytes.decode())

                return {
                    "is_success": True,
                    "error_message": None,
                    "response_time_ms": response_time_ms,
                    "data": orderbook
                }

        except Exception as e:
            return {
                "is_success": False,
                "error_message": str(e),
                "response_time_ms": None,
                "data": None
            }

    async def fetch_wgnk_dex_stats(self) -> Dict[str, Any]:
        """Read the Uniswap V3 WGNK/USDT pool through GeckoTerminal."""
        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(GECKOTERMINAL_POOL_URL)
                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code != 200:
                    return {
                        "is_success": False,
                        "error_message": f"HTTP {response.status_code}",
                        "response_time_ms": response_time_ms,
                        "data": None
                    }

                attributes = response.json()["data"]["attributes"]
                price = float(attributes["base_token_price_usd"])
                if price <= 0:
                    raise ValueError("GeckoTerminal returned a non-positive price")

                return {
                    "is_success": True,
                    "error_message": None,
                    "response_time_ms": response_time_ms,
                    "data": {
                        "price": price,
                        "price_change_24h": float(
                            (attributes.get("price_change_percentage") or {}).get("h24") or 0
                        ),
                        "volume_24h_usd": float(
                            (attributes.get("volume_usd") or {}).get("h24") or 0
                        ),
                        "liquidity_usd": float(attributes.get("reserve_in_usd") or 0),
                    }
                }

        except Exception as e:
            return {
                "is_success": False,
                "error_message": str(e),
                "response_time_ms": None,
                "data": None
            }

    async def fetch_wgnk_price_onchain(self) -> Optional[float]:
        """Fallback price straight from the pool's slot0(), no third party involved."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_call",
            "params": [{"to": WGNK_USDT_POOL, "data": SLOT0_SELECTOR}, "latest"]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(ETH_RPC_URL, json=payload)
                response.raise_for_status()
                return parse_slot0_price(response.json().get("result"))
        except Exception as e:
            logger.warning(f"Failed to read WGNK price from chain: {e}")
            return None

    async def fetch_gonka_limit_orders_stat(self) -> Dict[str, Any]:
        url = "https://api0.herewallet.app/api/v1/exchange/limit_orders/gonka/stat"
        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    return {
                        "is_success": True,
                        "error_message": None,
                        "response_time_ms": response_time_ms,
                        "data": response.json()
                    }
                else:
                    return {
                        "is_success": False,
                        "error_message": f"HTTP {response.status_code}",
                        "response_time_ms": response_time_ms,
                        "data": None
                    }

        except Exception as e:
            return {
                "is_success": False,
                "error_message": str(e),
                "response_time_ms": None,
                "data": None
            }
