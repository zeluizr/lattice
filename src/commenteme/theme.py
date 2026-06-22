"""Tema Dracula Pro (oficial/licenciado) para o commente.me.

Os accents (foreground + 7 cores) são compartilhados por todas as variantes
escuras; só Background/Comment/Selection mudam por variante. Troque `VARIANT`
para mudar o "clima" do tema.
"""

from __future__ import annotations

from textual.theme import Theme

# Accents do Dracula PRO (iguais em todas as variantes escuras)
_ACCENTS = {
    "foreground": "#F8F8F2",
    "cyan": "#80FFEA",
    "green": "#8AFF80",
    "orange": "#FFCA80",
    "pink": "#FF80BF",
    "purple": "#9580FF",
    "red": "#FF9580",
    "yellow": "#FFFF80",
}

# Background / Comment / Selection por variante
_VARIANTS = {
    "pro":         {"background": "#22212C", "comment": "#7970A9", "selection": "#454158"},
    "blade":       {"background": "#212C2A", "comment": "#70A99F", "selection": "#415854"},
    "buffy":       {"background": "#2A212C", "comment": "#9F70A9", "selection": "#544158"},
    "lincoln":     {"background": "#2C2A21", "comment": "#A99F70", "selection": "#585441"},
    "morbius":     {"background": "#2C2122", "comment": "#A97079", "selection": "#584145"},
    "van-helsing": {"background": "#0B0D0F", "comment": "#708CA9", "selection": "#414D58"},
}

# >>> Variante ativa — troque aqui <<<
# opções: pro, blade, buffy, lincoln, morbius, van-helsing
VARIANT = "pro"

PALETTE = {**_ACCENTS, **_VARIANTS[VARIANT]}


def build_theme(p: dict = PALETTE) -> Theme:
    return Theme(
        name="dracula-pro",
        background=p["background"],
        surface=p["selection"],
        panel=p["selection"],
        foreground=p["foreground"],
        primary=p["purple"],
        secondary=p["comment"],
        accent=p["pink"],
        success=p["green"],
        warning=p["orange"],
        error=p["red"],
        dark=True,
        variables={
            "cyan": p["cyan"],
            "green": p["green"],
            "orange": p["orange"],
            "pink": p["pink"],
            "purple": p["purple"],
            "red": p["red"],
            "yellow": p["yellow"],
            "comment": p["comment"],
        },
    )


DRACULA_PRO = build_theme()
