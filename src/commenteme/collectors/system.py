"""Métricas de sistema via psutil (CPU, RAM, swap, disco, rede, processos).

Mantém a amostra anterior de contadores de disco/rede para calcular TAXAS
(bytes/s) a cada chamada de read().
"""

from __future__ import annotations

import time

import psutil


class SystemCollector:
    def __init__(self, top_n: int = 8):
        self.top_n = top_n
        self._last_disk = psutil.disk_io_counters()
        self._last_net = psutil.net_io_counters()
        self._last_t = time.monotonic()

        # "prime" os medidores que dependem de delta entre chamadas
        psutil.cpu_percent(percpu=True)
        for p in psutil.process_iter(["pid"]):
            try:
                p.cpu_percent(None)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

    def read(self) -> dict:
        now = time.monotonic()
        dt = max(now - self._last_t, 1e-6)

        cpu_per = psutil.cpu_percent(percpu=True)
        cpu_total = sum(cpu_per) / len(cpu_per) if cpu_per else 0.0

        vm = psutil.virtual_memory()
        sm = psutil.swap_memory()

        disk = psutil.disk_io_counters()
        net = psutil.net_io_counters()
        disk_read_bps = (disk.read_bytes - self._last_disk.read_bytes) / dt
        disk_write_bps = (disk.write_bytes - self._last_disk.write_bytes) / dt
        net_recv_bps = (net.bytes_recv - self._last_net.bytes_recv) / dt
        net_sent_bps = (net.bytes_sent - self._last_net.bytes_sent) / dt
        self._last_disk, self._last_net, self._last_t = disk, net, now

        disk_usage = psutil.disk_usage("/")

        procs = []
        for p in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                cpu = p.cpu_percent(None)
                rss = p.info["memory_info"].rss if p.info["memory_info"] else 0
                procs.append((cpu, p.info["pid"], p.info["name"] or "?", rss))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        procs.sort(key=lambda r: r[0], reverse=True)

        return {
            "cpu_total": cpu_total,
            "cpu_per": cpu_per,
            "mem": vm,
            "swap": sm,
            "disk_read_bps": disk_read_bps,
            "disk_write_bps": disk_write_bps,
            "net_recv_bps": net_recv_bps,
            "net_sent_bps": net_sent_bps,
            "disk_usage": disk_usage,
            "procs": procs[: self.top_n],
        }


if __name__ == "__main__":  # debug rápido
    import json

    c = SystemCollector()
    time.sleep(1)
    s = c.read()
    print(
        json.dumps(
            {
                "cpu_total": round(s["cpu_total"], 1),
                "cpu_cores": len(s["cpu_per"]),
                "ram_pct": s["mem"].percent,
                "net_recv_bps": round(s["net_recv_bps"]),
                "top": [(round(c, 1), n) for c, _, n, _ in s["procs"][:3]],
            },
            ensure_ascii=False,
        )
    )
