/** Formatting helpers ported from the original Python dashboard. */

const BLOCKS = " ▁▂▃▄▅▆▇█";

export function fmtTok(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return `${v.toFixed(0)}`;
}

export function humanBytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  let v = Number(n);
  for (const unit of ["B", "KB", "MB", "GB", "TB"]) {
    if (v < 1024 || unit === "TB") {
      return unit === "B" ? `${v.toFixed(0)}${unit}` : `${v.toFixed(1)}${unit}`;
    }
    v /= 1024;
  }
  return `${v.toFixed(1)}TB`;
}

export function humanRate(bps: number | null | undefined): string {
  return `${humanBytes(bps)}/s`;
}

/** One block glyph (0–100%) for the per-core CPU strip. */
export function coreCell(pct: number | null | undefined): string {
  const clamped = Math.max(0, Math.min(100, Number(pct || 0)));
  const idx = Math.floor((clamped / 100) * (BLOCKS.length - 1));
  return BLOCKS[idx];
}

/** Build a sparkline string from a numeric history. */
export function sparkline(history: (number | null | undefined)[], width = 0): string {
  const data = history.filter((x): x is number => x !== null && x !== undefined && !Number.isNaN(x));
  if (data.length === 0) return "";
  const slice = width > 0 ? data.slice(-width) : data;
  const lo = Math.min(...slice);
  const hi = Math.max(...slice);
  const span = hi - lo || 1;
  return slice
    .map((v) => {
      const idx = Math.round(((v - lo) / span) * (BLOCKS.length - 1));
      return BLOCKS[Math.max(1, idx)];
    })
    .join("");
}

/** Short relative time ("now" / "3m" / "2h" / "5d") from a unix-seconds stamp. */
export function agoShort(unixSeconds: number | null | undefined, nowSeconds: number): string {
  const ts = Number(unixSeconds || 0);
  if (!ts) return "—";
  const s = Math.max(0, Math.floor(nowSeconds - ts));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export type StatusLevel = "ok" | "warn" | "crit";

/** Pick a status level by thresholds (mirrors the Python status() helper). */
export function statusLevel(
  value: number | null | undefined,
  warn: number,
  crit: number,
): StatusLevel {
  const v = Number(value || 0);
  if (v < warn) return "ok";
  if (v < crit) return "warn";
  return "crit";
}
