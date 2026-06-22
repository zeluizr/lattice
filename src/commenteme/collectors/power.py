"""Energia/frequência via `powermetrics` (EXIGE sudo).

powermetrics escreve amostras em formato plist no stdout, separadas por um byte
nulo (\\x00). Rodamos como subprocesso de longa duração e lemos o stream numa
thread, publicando sempre a última amostra parseada em self.latest.

Os campos de potência vêm em miliwatts; convertemos para watts.
"""

from __future__ import annotations

import plistlib
import subprocess
import threading


class PowerCollector:
    def __init__(self, interval_ms: int = 1000):
        self.interval_ms = interval_ms
        self.latest: dict | None = None
        self.error: str | None = None
        self._proc: subprocess.Popen | None = None
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def start(self) -> None:
        cmd = [
            "sudo",
            "powermetrics",
            "--samplers",
            "cpu_power,gpu_power,thermal",
            "-i",
            str(self.interval_ms),
            "-f",
            "plist",
        ]
        try:
            self._proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
        except Exception as e:  # noqa: BLE001
            self.error = f"falha ao iniciar powermetrics: {e}"
            return
        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()

    def _reader(self) -> None:
        buf = b""
        stdout = self._proc.stdout
        try:
            for chunk in iter(lambda: stdout.read(4096), b""):
                if self._stop.is_set():
                    break
                buf += chunk
                while b"\x00" in buf:
                    raw, buf = buf.split(b"\x00", 1)
                    raw = raw.strip()
                    if not raw:
                        continue
                    try:
                        self.latest = plistlib.loads(raw)
                    except Exception:  # noqa: BLE001 — amostra parcial; ignora
                        pass
        except Exception as e:  # noqa: BLE001
            self.error = str(e)

    @staticmethod
    def _mw_to_w(d: dict, key: str):
        v = d.get(key)
        return (v / 1000.0) if isinstance(v, (int, float)) else None

    def read(self) -> dict | None:
        d = self.latest
        if not d:
            return None
        proc = d.get("processor", {}) or {}
        gpu = d.get("gpu", {}) or {}
        freq_hz = gpu.get("freq_hz")
        return {
            "cpu_w": self._mw_to_w(proc, "cpu_power"),
            "gpu_w": self._mw_to_w(proc, "gpu_power"),
            "ane_w": self._mw_to_w(proc, "ane_power"),
            "package_w": self._mw_to_w(proc, "combined_power")
            or self._mw_to_w(proc, "package_power"),
            "gpu_freq_mhz": (freq_hz / 1e6) if isinstance(freq_hz, (int, float)) else None,
            "thermal": d.get("thermal_pressure"),
        }

    def stop(self) -> None:
        self._stop.set()
        if self._proc:
            try:
                self._proc.terminate()
            except Exception:  # noqa: BLE001
                pass


if __name__ == "__main__":  # debug: sudo PYTHONPATH=src .venv/bin/python -m commenteme.collectors.power
    import time

    c = PowerCollector()
    c.start()
    print("aguardando powermetrics (precisa de sudo)…")
    for _ in range(8):
        time.sleep(0.5)
        r = c.read()
        if r:
            print(r)
            break
    else:
        print("sem amostra — rode com sudo? erro:", c.error)
    c.stop()
