/**
 * Apple Silicon GPU via `ioreg` (no sudo). Parses utilization and system
 * memory in use / allocated from the IOAccelerator registry entry.
 */

import { execa } from "execa";
import type { GpuData } from "./types.js";

const EMPTY: GpuData = { utilPct: null, memUsedBytes: null, memAllocBytes: null };

export async function readGpu(): Promise<GpuData> {
  try {
    const { stdout } = await execa("ioreg", ["-r", "-d", "1", "-w", "0", "-c", "IOAccelerator"], {
      timeout: 2000,
    });
    const get = (key: string): number | null => {
      const m = stdout.match(new RegExp(`"${escapeRe(key)}"\\s*=\\s*(\\d+)`));
      return m ? Number(m[1]) : null;
    };
    return {
      utilPct: get("Device Utilization %"),
      memUsedBytes: get("In use system memory"),
      memAllocBytes: get("Alloc system memory"),
    };
  } catch {
    return { ...EMPTY };
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
