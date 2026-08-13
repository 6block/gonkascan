"""WGNK (wrapped GNK) market data on Ethereum.

The bridge contract is itself the WGNK ERC-20 and mints 1:1 against native GNK
locked in escrow, so the Uniswap price of WGNK is the price of GNK.

Two ways to read it, in order of preference:
  1. GeckoTerminal, which returns price plus 24h volume / liquidity / change
     in a single call.
  2. The pool's own slot0() over JSON-RPC, which only yields the spot price but
     depends on nothing but an Ethereum node.
"""

from decimal import Decimal
from typing import Optional

# Bridge contract == WGNK ERC-20
WGNK_ADDRESS = "0x972a7A92D92796a98801A8818bcF91f1648f2F68"

# Uniswap V3 WGNK/USDT 0.3% pool. There is a second, near-empty WGNK/USDT pool
# (0xdbc0edBc..., ~$900 TVL) — always read this one explicitly rather than
# picking whichever pool a token-level lookup happens to return first.
WGNK_USDT_POOL = "0x203EE836d417CF944133bbdd2c62B4BC7388C55D"
WGNK_POOL_URL = f"https://app.uniswap.org/explore/pools/ethereum/{WGNK_USDT_POOL}"
WGNK_PAIR_LABEL = "WGNK/USDT"

# token0 = WGNK (9 decimals, matching ngonka), token1 = USDT (6 decimals).
WGNK_DECIMALS = 9
USDT_DECIMALS = 6

GECKOTERMINAL_POOL_URL = (
    f"https://api.geckoterminal.com/api/v2/networks/eth/pools/{WGNK_USDT_POOL}"
)

ETH_RPC_URL = "https://ethereum-rpc.publicnode.com"
SLOT0_SELECTOR = "0x3850c7bd"

_Q96 = Decimal(2) ** 96


def price_from_sqrt_price_x96(sqrt_price_x96: int) -> float:
    """Convert a Uniswap V3 sqrtPriceX96 into the token1-per-token0 price.

    For this pool that is USDT per WGNK, i.e. the USD price of one GNK.
    """
    ratio = (Decimal(sqrt_price_x96) / _Q96) ** 2
    scale = Decimal(10) ** (WGNK_DECIMALS - USDT_DECIMALS)
    return float(ratio * scale)


def parse_slot0_price(slot0_hex: str) -> Optional[float]:
    """Read the price out of a raw eth_call response for slot0()."""
    if not slot0_hex or not slot0_hex.startswith("0x"):
        return None

    body = slot0_hex[2:]
    if len(body) < 64:
        return None

    sqrt_price_x96 = int(body[:64], 16)
    if sqrt_price_x96 <= 0:
        return None

    return price_from_sqrt_price_x96(sqrt_price_x96)
