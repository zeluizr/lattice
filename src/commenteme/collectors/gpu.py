"""Leitura da GPU em Apple Silicon, SEM sudo, via `ioreg`.

No M-series não existe `nvidia-smi`. Os dados de utilização e memória da GPU
ficam expostos no IORegistry, na classe IOAccelerator (ex.: AGXAcceleratorG16X),
dentro de "PerformanceStatistics". Lemos com `ioreg` e extraímos por regex.
"""

from __future__ import annotations

import re
import subprocess

# Cada chave aparece no dump como:  "Device Utilization %"=9
_PATTERNS = {
    "util_pct": "Device Utilization %",
    "mem_used_bytes": "In use system memory",
    "mem_alloc_bytes": "Alloc system memory",
}


def _find_int(text: str, key: str):
    # ancora no '"key"=' exato para não casar com "In use system memory (driver)"
    m = re.search(r'"%s"\s*=\s*(\d+)' % re.escape(key), text)
    return int(m.group(1)) if m else None


def read_gpu() -> dict:
    """Retorna {util_pct, mem_used_bytes, mem_alloc_bytes}. Valores None se ausentes."""
    try:
        out = subprocess.run(
            ["ioreg", "-r", "-d", "1", "-w", "0", "-c", "IOAccelerator"],
            capture_output=True,
            text=True,
            timeout=2,
        ).stdout
    except Exception:
        return {k: None for k in _PATTERNS}

    return {field: _find_int(out, key) for field, key in _PATTERNS.items()}


if __name__ == "__main__":  # debug rápido: python -m commenteme.collectors.gpu
    print(read_gpu())
