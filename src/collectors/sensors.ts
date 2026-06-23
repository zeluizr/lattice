/**
 * Temperatures (CPU/GPU) and fans via the native lattice-smc helper (no sudo),
 * plus battery via systeminformation + ioreg. On any failure the sensors panel
 * degrades gracefully without taking the app down.
 */

import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execa } from "execa";
import si from "systeminformation";
import type { SensorsData, BatteryData } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN_NAME = "lattice-smc";
const PLATFORM_DIR = `${process.platform}-${process.arch}`;

function locateHelper(): string | null {
  const candidates = [
    // dist/collectors -> package root
    join(HERE, "..", "..", "prebuilds", PLATFORM_DIR, BIN_NAME),
    // running from source layout
    join(HERE, "..", "..", "..", "prebuilds", PLATFORM_DIR, BIN_NAME),
    join(process.cwd(), "prebuilds", PLATFORM_DIR, BIN_NAME),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const HELPER = locateHelper();

export function sensorsAvailable(): boolean {
  return HELPER !== null;
}

export async function readSensors(): Promise<SensorsData> {
  if (!HELPER) {
    return { ok: false, error: "smc helper not found", cpuTemp: null, gpuTemp: null, fans: [] };
  }
  try {
    const { stdout } = await execa(HELPER, [], { timeout: 1500 });
    const j = JSON.parse(stdout);
    if (!j.ok) {
      return { ok: false, error: j.error, cpuTemp: null, gpuTemp: null, fans: [] };
    }
    return {
      ok: true,
      cpuTemp: j.cpu_temp ?? null,
      gpuTemp: j.gpu_temp ?? null,
      fans: Array.isArray(j.fans) ? j.fans : [],
    };
  } catch (e) {
    return { ok: false, error: String(e), cpuTemp: null, gpuTemp: null, fans: [] };
  }
}

export async function readBattery(): Promise<BatteryData> {
  try {
    const b = await si.battery();
    if (!b || !b.hasBattery) return { present: false };
    const health =
      b.maxCapacity && b.designedCapacity ? (b.maxCapacity / b.designedCapacity) * 100 : null;

    let tempC: number | null = null;
    try {
      const { stdout } = await execa("ioreg", ["-rn", "AppleSmartBattery", "-w", "0"], {
        timeout: 1500,
      });
      const m = stdout.match(/"Temperature"\s*=\s*(-?\d+)/);
      if (m) tempC = Number(m[1]) / 100;
    } catch {
      // optional
    }

    return {
      present: true,
      percent: b.percent,
      plugged: Boolean(b.acConnected),
      charging: Boolean(b.isCharging),
      cycles: b.cycleCount ?? null,
      health,
      tempC,
    };
  } catch {
    return { present: false };
  }
}
