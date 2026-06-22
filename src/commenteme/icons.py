"""Ícones dos painéis/métricas, com 3 modos: nerd (glyphs Nerd Font), emoji, none.

Os glyphs Nerd Font escolhidos são do conjunto Font Awesome 4 (U+F000–U+F2E0),
presente em qualquer patch Nerd Font — incluindo a MesloLGS NF. Selecione a
MesloLGS NF no terminal (Warp → Settings → Appearance → Text → Font).
"""

from __future__ import annotations

_KEYS = (
    "cpu", "gpu", "mem", "swap", "net", "disk", "temp", "fan",
    "battery", "power", "tokens", "vtex", "chat", "proc", "clock",
)

_NERD = {
    "cpu": "",      # microchip
    "gpu": "",      # desktop
    "mem": "",      # database
    "swap": "",     # exchange
    "net": "",      # globe
    "disk": "",     # hdd
    "temp": "",     # fire
    "fan": "",      # rotate
    "battery": "",  # battery-full
    "power": "",    # bolt
    "tokens": "",   # money
    "vtex": "",     # shopping-cart
    "chat": "",     # comment
    "proc": "",     # tasks
    "clock": "",    # clock
}

_EMOJI = {
    "cpu": "🖥️", "gpu": "🎮", "mem": "🧠", "swap": "🔁", "net": "🌐",
    "disk": "💽", "temp": "🌡️", "fan": "🌀", "battery": "🔋", "power": "⚡",
    "tokens": "🪙", "vtex": "🛒", "chat": "💬", "proc": "📋", "clock": "🕐",
}

_SETS = {"nerd": _NERD, "emoji": _EMOJI, "none": {k: "" for k in _KEYS}}

_mode = "nerd"


def set_mode(mode: str) -> None:
    global _mode
    _mode = mode if mode in _SETS else "nerd"


def ic(name: str) -> str:
    """Retorna o glyph do modo atual (string vazia no modo 'none')."""
    return _SETS[_mode].get(name, "")
