/**
 * Per-disk activity & usage (no sudo).
 *
 * Lists each "real" mount — `/` and everything under `/Volumes/*` — with its
 * space usage (from `systeminformation`) and live read/write throughput.
 *
 * Throughput comes from IOKit's cumulative byte counters, read via `ioreg`
 * (same approach as gpu.ts — no sudo, non-blocking). Each APFS volume's mount
 * device (e.g. `/dev/disk7s1`) maps to a whole disk (`disk7`); IOKit reports a
 * `Bytes (Read)`/`Bytes (Write)` counter for that whole disk, including the
 * synthesized APFS container disks. We diff successive samples to get bytes/sec,
 * so the first sample reads as zero and later ones are accurate at the refresh
 * interval.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";
import type { DiskInfo, DisksData } from "./types.js";

const run = promisify(execFile);

export class DisksCollector {
  /** Previous cumulative counters per whole disk, for rate computation. */
  private prev = new Map<string, { r: number; w: number; t: number }>();

  async read(): Promise<DisksData> {
    try {
      const [sizes, counters] = await Promise.all([
        si.fsSize().catch(() => [] as si.Systeminformation.FsSizeData[]),
        readDiskCounters().catch(() => ({}) as Record<string, { r: number; w: number }>),
      ]);
      const now = Date.now();

      const mounts = (sizes ?? []).filter(
        (s) => s.fs?.startsWith("/dev/disk") && (s.mount === "/" || s.mount.startsWith("/Volumes/")),
      );

      const disks: DiskInfo[] = mounts.map((s) => {
        const device = wholeDisk(s.fs);
        const cur = counters[device];
        const prev = this.prev.get(device);
        let readBps = 0;
        let writeBps = 0;
        if (cur && prev) {
          const dt = (now - prev.t) / 1000;
          if (dt > 0) {
            readBps = Math.max(0, (cur.r - prev.r) / dt);
            writeBps = Math.max(0, (cur.w - prev.w) / dt);
          }
        }
        return {
          mount: s.mount,
          device: device || s.fs,
          readBps,
          writeBps,
          usedBytes: s.used ?? 0,
          sizeBytes: s.size ?? 0,
          usePercent: s.use ?? 0,
        };
      });

      // Remember the latest counters for the next delta.
      for (const [dev, c] of Object.entries(counters)) this.prev.set(dev, { r: c.r, w: c.w, t: now });

      // Root first, then /Volumes alphabetically.
      disks.sort((a, b) =>
        a.mount === "/" ? -1 : b.mount === "/" ? 1 : a.mount.localeCompare(b.mount),
      );

      return { disks };
    } catch {
      return { disks: [] };
    }
  }
}

/** `/dev/disk7s1` → `disk7` (the whole disk IOKit reports counters for). */
function wholeDisk(fs: string | undefined): string {
  const m = (fs ?? "").replace("/dev/", "").match(/^disk\d+/);
  return m ? m[0] : "";
}

/**
 * Cumulative read/write bytes per whole disk, from IOKit's
 * IOBlockStorageDriver "Statistics". The block-driver counter uses the keys
 * `Bytes (Read)`/`Bytes (Write)`; APFS filesystem-level stats use different
 * keys and are ignored. The whole-disk BSD name follows its driver's stats.
 */
async function readDiskCounters(): Promise<Record<string, { r: number; w: number }>> {
  const { stdout } = await run("ioreg", ["-r", "-c", "IOBlockStorageDriver", "-w", "0", "-l"], {
    maxBuffer: 1 << 24,
  });
  const out: Record<string, { r: number; w: number }> = {};
  let pending: { r: number; w: number } | null = null;
  for (const ln of stdout.split("\n")) {
    const sm = ln.match(/"Statistics" = \{[^}]*"Bytes \(Read\)"=(\d+)/);
    if (sm) {
      const wm = ln.match(/"Bytes \(Write\)"=(\d+)/);
      pending = { r: Number(sm[1]), w: wm ? Number(wm[1]) : 0 };
      continue;
    }
    const bm = ln.match(/"BSD Name" = "(disk\d+)"\s*$/);
    if (bm && pending) {
      out[bm[1]] = pending;
      pending = null;
    }
  }
  return out;
}
