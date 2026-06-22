"""Painéis reutilizáveis da TUI (estilo card: título integrado na borda)."""

from __future__ import annotations

from collections.abc import Iterable

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Sparkline, Static


class GraphPanel(Vertical):
    """Card com título na borda + linha(s) de valor + sparkline."""

    def __init__(self, title: str, **kwargs):
        super().__init__(**kwargs)
        self.border_title = title
        self.body = Static("")
        self.spark = Sparkline([0])

    def compose(self) -> ComposeResult:
        yield self.body
        yield self.spark

    def update(self, text: str, history: Iterable[float] | None = None) -> None:
        self.body.update(text)
        if history is not None:
            data = list(history)
            self.spark.data = data if data else [0]


class TextPanel(Vertical):
    """Card com título na borda + bloco de texto (sem gráfico)."""

    def __init__(self, title: str, **kwargs):
        super().__init__(**kwargs)
        self.border_title = title
        self.body = Static("")

    def compose(self) -> ComposeResult:
        yield self.body

    def update(self, text: str) -> None:
        self.body.update(text)
