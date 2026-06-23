/**
 * System metrics via `systeminformation` (no sudo): CPU load, memory/swap,
 * disk & network throughput, '/' usage and the top processes by CPU.
 *
 * systeminformation computes per-second rates (network/disk) relative to the
 * previous call, so the first sample may be approximate; subsequent ones are
 * accurate at the configured refresh interval.
 */

import si from "systeminformation";
import type { SystemData, ProcInfo } from "./types.js";

export class SystemCollector {
  constructor(private topN = 8) {}

  async read(): Promise<SystemData> {
    const [load, mem, fs, net, sizes, procs] = await Promise.all([
      si.currentLoad().catch(() => null),
      si.mem().catch(() => null),
      si.fsStats().catch(() => null),
      si.networkStats().catch(() => null),
      si.fsSize().catch(() => null),
      si.processes().catch(() => null),
    ]);

    const cpuTotal = load?.currentLoad ?? 0;
    const cpuPer = (load?.cpus ?? []).map((c) => c.load ?? 0);

    const memTotal = mem?.total ?? 0;
    const memAvail = mem?.available ?? mem?.free ?? 0;
    const memUsed = Math.max(0, memTotal - memAvail);
    const memPercent = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;
    const swapTotal = mem?.swaptotal ?? 0;
    const swapPercent = swapTotal > 0 ? ((mem?.swapused ?? 0) / swapTotal) * 100 : 0;

    const diskReadBps = nonNeg(fs?.rx_sec);
    const diskWriteBps = nonNeg(fs?.wx_sec);

    let netRecvBps = 0;
    let netSentBps = 0;
    for (const n of net ?? []) {
      netRecvBps += nonNeg(n.rx_sec);
      netSentBps += nonNeg(n.tx_sec);
    }

    const root = (sizes ?? []).find((s) => s.mount === "/") ?? (sizes ?? [])[0];
    const diskUsagePercent = root?.use ?? 0;

    const list = procs?.list ?? [];
    const top: ProcInfo[] = list
      .map((p) => ({
        cpu: p.cpu ?? 0,
        pid: p.pid ?? 0,
        name: p.name ?? "?",
        // memRss is in KB on most platforms; fall back to mem% of total RAM.
        rss: p.memRss ? p.memRss * 1024 : Math.round(((p.mem ?? 0) / 100) * memTotal),
      }))
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, this.topN);

    return {
      cpuTotal,
      cpuPer,
      memPercent,
      memUsed,
      memTotal,
      swapPercent,
      diskReadBps,
      diskWriteBps,
      netRecvBps,
      netSentBps,
      diskUsagePercent,
      procs: top,
    };
  }
}

function nonNeg(v: number | null | undefined): number {
  return typeof v === "number" && v > 0 ? v : 0;
}
