"""Consumo de tokens/custo do Claude Code (HOJE), lendo os logs locais.

O Claude Code grava transcrições em ~/.claude/projects/**/*.jsonl. Cada linha de
assistente traz message.usage com input/output e tokens de cache, mais o modelo e
um timestamp ISO. Somamos tudo do dia (data local) e calculamos o custo.

Tabela de preços (USD por 1M tokens) — fonte: skill claude-api da Anthropic (jun/2026):
  Opus 4.8   in $5  out $25  cache-write(5m) $6.25  cache-read $0.50
  Sonnet 4.6 in $3  out $15  cache-write     $3.75  cache-read $0.30
  Haiku 4.5  in $1  out $5   cache-write     $1.25  cache-read $0.10
(cache-write 5m = 1.25x do input; cache-read = 0.1x; Opus 4.8 tem 1M sem sobretaxa.)

Performance: na primeira leitura ignoramos arquivos não modificados hoje; depois
fazemos "tail" só dos bytes novos de cada arquivo.
"""

from __future__ import annotations

import glob
import json
import os
from datetime import datetime, time

PRICING = {
    "opus": {"in": 5.00, "out": 25.00, "cw": 6.25, "cr": 0.50},
    "sonnet": {"in": 3.00, "out": 15.00, "cw": 3.75, "cr": 0.30},
    "haiku": {"in": 1.00, "out": 5.00, "cw": 1.25, "cr": 0.10},
}


def _family(model: str | None) -> str:
    m = (model or "").lower()
    if "opus" in m:
        return "opus"
    if "sonnet" in m:
        return "sonnet"
    if "haiku" in m:
        return "haiku"
    return "opus"  # default conservador


class TokenCollector:
    def __init__(self, root: str | None = None):
        self.root = root or os.path.expanduser("~/.claude/projects")
        self._offsets: dict[str, int] = {}
        self._day: str | None = None
        self.totals = self._zero()

    @staticmethod
    def _zero() -> dict:
        return {
            "input": 0, "output": 0, "cache_w": 0, "cache_r": 0,
            "cost": 0.0, "web_search": 0, "web_fetch": 0,
            "messages": 0, "by_model": {},
        }

    @staticmethod
    def _today() -> str:
        return datetime.now().astimezone().date().isoformat()

    @staticmethod
    def _midnight_ts() -> float:
        now = datetime.now().astimezone()
        return datetime.combine(now.date(), time.min, tzinfo=now.tzinfo).timestamp()

    def read(self) -> dict:
        today = self._today()
        if today != self._day:  # virou o dia → recomeça
            self._day = today
            self._offsets = {}
            self.totals = self._zero()

        midnight = self._midnight_ts()
        for path in glob.glob(os.path.join(self.root, "**", "*.jsonl"), recursive=True):
            try:
                size = os.path.getsize(path)
                mtime = os.path.getmtime(path)
            except OSError:
                continue

            off = self._offsets.get(path)
            if off is None:
                if mtime < midnight:  # nada de hoje aqui
                    self._offsets[path] = size
                    continue
                off = 0
            if size < off:  # rotacionado/truncado
                off = 0
            if size == off:
                continue

            try:
                with open(path, "rb") as f:
                    f.seek(off)
                    data = f.read()
            except OSError:
                continue

            if data and not data.endswith(b"\n"):
                cut = data.rfind(b"\n")
                if cut == -1:
                    continue  # ainda sem linha completa; mantém offset
                self._offsets[path] = off + cut + 1
                data = data[: cut + 1]
            else:
                self._offsets[path] = size

            for line in data.split(b"\n"):
                if line.strip():
                    self._consume(line, today)

        return self.totals

    def _consume(self, raw: bytes, today: str) -> None:
        try:
            o = json.loads(raw)
        except Exception:
            return
        ts = o.get("timestamp")
        if not ts:
            return
        try:
            d = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().date().isoformat()
        except Exception:
            return
        if d != today:
            return

        msg = o.get("message") or {}
        u = msg.get("usage")
        if not u:
            return

        fam = _family(msg.get("model"))
        p = PRICING[fam]
        i = u.get("input_tokens") or 0
        out = u.get("output_tokens") or 0
        cw = u.get("cache_creation_input_tokens") or 0
        cr = u.get("cache_read_input_tokens") or 0
        cost = (i * p["in"] + out * p["out"] + cw * p["cw"] + cr * p["cr"]) / 1_000_000

        t = self.totals
        t["input"] += i
        t["output"] += out
        t["cache_w"] += cw
        t["cache_r"] += cr
        t["cost"] += cost
        t["messages"] += 1

        stu = u.get("server_tool_use") or {}
        t["web_search"] += stu.get("web_search_requests") or 0
        t["web_fetch"] += stu.get("web_fetch_requests") or 0

        bm = t["by_model"].setdefault(fam, {"in": 0, "out": 0, "cw": 0, "cr": 0, "cost": 0.0})
        bm["in"] += i
        bm["out"] += out
        bm["cw"] += cw
        bm["cr"] += cr
        bm["cost"] += cost


if __name__ == "__main__":  # debug: PYTHONPATH=src .venv/bin/python -m commenteme.collectors.tokens
    import json as _j

    c = TokenCollector()
    print(_j.dumps(c.read(), indent=2, ensure_ascii=False))
