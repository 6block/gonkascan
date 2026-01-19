import importlib
import sys


def _alias_subpackage(name: str) -> None:
    try:
        pkg = importlib.import_module(f"{__name__}.{name}")
    except ModuleNotFoundError:
        return
    sys.modules.setdefault(name, pkg)


for _pkg_name in (
    "amino",
    "cosmos_proto",
    "gogoproto",
    "inference",
    "tendermint",
    "cosmos",
    "cosmwasm",
    "ibc"
):
    _alias_subpackage(_pkg_name)
