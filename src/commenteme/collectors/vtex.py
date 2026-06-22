"""Status da VTEX CLI sem rodar a CLI (que é interativa e lenta).

`vtex whoami` apenas lê a sessão salva em ~/.config/configstore/vtex.json. Lemos
o mesmo arquivo diretamente: instantâneo, sem prompt, sem rede. Quando você roda
`vtex login <conta>`, as chaves account/login/workspace/token aparecem e o painel
acende automaticamente.
"""

from __future__ import annotations

import json
import os
import shutil

_CONFIG = os.path.expanduser("~/.config/configstore/vtex.json")


def read_vtex() -> dict:
    binpath = shutil.which("vtex")
    data: dict = {}
    if os.path.exists(_CONFIG):
        try:
            with open(_CONFIG) as f:
                data = json.load(f)
        except Exception:
            data = {}

    account = data.get("account")
    login = data.get("login")
    workspace = data.get("workspace")
    logged_in = bool(account and (data.get("token") or login))

    return {
        "installed": bool(binpath),
        "path": binpath,
        "account": account,
        "login": login,
        "workspace": workspace,
        "logged_in": logged_in,
    }


if __name__ == "__main__":
    print(read_vtex())
