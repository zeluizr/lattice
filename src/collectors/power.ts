/**
 * Power / frequency via `powermetrics` (REQUIRES sudo).
 *
 * powermetrics streams plist samples on stdout separated by a NUL byte (\x00).
 * We run it as a long-lived subprocess and keep the latest parsed sample. Power
 * fields arrive in milliwatts; we convert to watts.
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as plist from "plist";
import bplist from "bplist-parser";
import type { PowerData } from "./types.js";

function parseSample(raw: Buffer): any | null {
  if (raw.length === 0) return null;
  try {
    // binary plist?
    if (raw.length >= 6 && raw.subarray(0, 6).toString("latin1") === "bplist") {
      const arr = bplist.parseBuffer(raw);
      return arr?.[0] ?? null;
    }
    // XML plist
    const text = raw.toString("utf8");
    const start = text.indexOf("<?xml");
    if (start === -1) return null;
    return plist.parse(text.slice(start));
  } catch {
    return null;
  }
}

function mwToW(d: any, key: string): number | null {
  const v = d?.[key];
  return typeof v === "number" ? v / 1000 : null;
}

export class PowerCollector {
  private latest: any = null;
  error: string | null = null;
  private proc: ChildProcess | null = null;
  private buf: Buffer = Buffer.alloc(0);
  private stopped = false;

  constructor(private intervalMs = 1000) {}

  start(): void {
    try {
      this.proc = spawn(
        "sudo",
        [
          "powermetrics",
          "--samplers",
          "cpu_power,gpu_power,thermal",
          "-i",
          String(this.intervalMs),
          "-f",
          "plist",
        ],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch (e) {
      this.error = `failed to start powermetrics: ${e}`;
      return;
    }

    this.proc.stdout?.on("data", (chunk: Buffer) => {
      if (this.stopped) return;
      this.buf = Buffer.concat([this.buf, chunk]);
      let nul: number;
      while ((nul = this.buf.indexOf(0x00)) !== -1) {
        const raw = this.buf.subarray(0, nul);
        this.buf = this.buf.subarray(nul + 1);
        const sample = parseSample(raw);
        if (sample) this.latest = sample;
      }
    });

    this.proc.on("error", (e) => {
      this.error = String(e);
    });
  }

  read(): PowerData | null {
    const d = this.latest;
    if (!d) return null;
    const proc = d.processor ?? {};
    const gpu = d.gpu ?? {};
    const freqHz = gpu.freq_hz;
    return {
      cpuW: mwToW(proc, "cpu_power"),
      gpuW: mwToW(proc, "gpu_power"),
      aneW: mwToW(proc, "ane_power"),
      packageW: mwToW(proc, "combined_power") ?? mwToW(proc, "package_power"),
      gpuFreqMhz: typeof freqHz === "number" ? freqHz / 1e6 : null,
      thermal: d.thermal_pressure ?? null,
    };
  }

  stop(): void {
    this.stopped = true;
    if (this.proc) {
      try {
        this.proc.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  }
}
