"""Helpers for turning raw IBC denoms into human readable token metadata.

The chain only tells us the transfer path and the base denom of an IBC voucher
(e.g. "transfer/channel-5" + "erc20/tether/usdt"). Display symbol and decimals
are not on chain, so they come from the conservative table below: when a token
is not listed we deliberately return decimals=None so the UI shows the raw
integer amount instead of guessing a scale and showing a wrong balance.
"""

from typing import Dict, Optional, Tuple

IBC_DENOM_PREFIX = "ibc/"

# normalized base denom -> (display symbol, decimals)
KNOWN_TOKENS: Dict[str, Tuple[str, int]] = {
    "usdt": ("USDT", 6),
    "usdc": ("USDC", 6),
    "dai": ("DAI", 18),
    "axl": ("AXL", 6),
    "atom": ("ATOM", 6),
    "kava": ("KAVA", 6),
    "osmo": ("OSMO", 6),
    "eth": ("ETH", 18),
    "weth": ("WETH", 18),
    "wbtc": ("WBTC", 8),
}

# chain id prefix -> display name
KNOWN_CHAINS: Dict[str, str] = {
    "kava": "Kava",
    "cosmoshub": "Cosmos Hub",
    "osmosis": "Osmosis",
    "noble": "Noble",
    "gonka": "Gonka",
}


def is_ibc_denom(denom: str) -> bool:
    return denom.startswith(IBC_DENOM_PREFIX)


def ibc_hash(denom: str) -> str:
    return denom[len(IBC_DENOM_PREFIX):]


def resolve_symbol_and_decimals(base_denom: str) -> Tuple[str, Optional[int]]:
    """Map a base denom to a display symbol and decimals.

    Returns decimals=None for anything not explicitly known, so callers can
    fall back to showing the raw on-chain amount.
    """
    if not base_denom:
        return "", None

    tail = base_denom.split("/")[-1].lower()

    if tail in KNOWN_TOKENS:
        symbol, decimals = KNOWN_TOKENS[tail]
        return symbol, decimals

    # micro denoms such as "uatom" / "uusdc"
    if tail.startswith("u") and tail[1:] in KNOWN_TOKENS:
        symbol, decimals = KNOWN_TOKENS[tail[1:]]
        if decimals == 6:
            return symbol, decimals
        return symbol, None

    return tail.upper(), None


def resolve_chain_name(chain_id: Optional[str]) -> Optional[str]:
    """Turn a chain id such as "kava_2222-10" into "Kava"."""
    if not chain_id:
        return None

    prefix = chain_id.split("_")[0].split("-")[0].lower()
    return KNOWN_CHAINS.get(prefix, prefix.capitalize() or None)


def parse_channel_id(path: Optional[str]) -> Optional[str]:
    """Extract this chain's channel from a transfer path like "transfer/channel-5".

    In a multi-hop path ("transfer/channel-3/transfer/channel-2") the leftmost
    channel is the one that lives on this chain — the later ones belong to
    intermediate chains and cannot be queried here.
    """
    if not path:
        return None

    parts = [segment for segment in path.split("/") if segment.startswith("channel-")]
    return parts[0] if parts else None
