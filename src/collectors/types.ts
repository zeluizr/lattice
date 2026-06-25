/** Shared data shapes produced by the collectors. */

export interface SystemData {
  cpuTotal: number; // 0–100
  cpuPer: number[]; // per-core 0–100
  memPercent: number;
  memUsed: number; // bytes
  memTotal: number; // bytes
  swapPercent: number;
  diskReadBps: number;
  diskWriteBps: number;
  netRecvBps: number;
  netSentBps: number;
  diskUsagePercent: number; // '/' usage %
  procs: ProcInfo[];
}

export interface ProcInfo {
  cpu: number;
  pid: number;
  name: string;
  rss: number; // bytes
}

export interface DiskInfo {
  mount: string; // e.g. "/", "/Volumes/dante"
  device: string; // whole disk, e.g. "disk7"
  readBps: number;
  writeBps: number;
  usedBytes: number;
  sizeBytes: number;
  usePercent: number; // 0–100
}

export interface DisksData {
  disks: DiskInfo[];
}

/** Where a repo's `origin` lives: GitHub, the self-hosted zgit server, another
 * host, or no remote at all. */
export type GitHostKind = "github" | "zgit" | "other" | "none";

export interface GitRepo {
  name: string;
  path: string; // absolute path, used to de-duplicate across roots
  branch: string; // "(detached)" when no branch
  ahead: number; // commits ahead of upstream
  behind: number; // commits behind upstream
  detached: boolean;
  dirty: boolean; // has uncommitted changes
  host: string; // hostname parsed from origin URL ("" when no remote)
  hostKind: GitHostKind;
  lastCommit: number; // unix seconds of the last commit (0 when unknown); drives the "most recent" ranking
}

export interface GitData {
  roots: string[]; // the configured folders/repos that were scanned
  repos: GitRepo[]; // only repos needing attention (uncommitted / ahead / behind), most recent first
  total: number; // total repos scanned (incl. the clean, in-sync ones not listed)
  truncated: boolean; // more pending repos than are shown
}

/** Bare repos living on the self-hosted zgit server (a Docker container). */
export interface ZgitServerData {
  available: boolean; // true when the container answered
  container: string; // container name queried
  repos: string[]; // repo names, without the ".git" suffix
}

export interface GpuData {
  utilPct: number | null;
  memUsedBytes: number | null;
  memAllocBytes: number | null;
}

export interface FanInfo {
  rpm: number;
  min: number;
  max: number;
  pct: number;
}

export interface SensorsData {
  ok: boolean;
  error?: string;
  cpuTemp: number | null;
  gpuTemp: number | null;
  fans: FanInfo[];
}

export interface BatteryData {
  present: boolean;
  percent?: number;
  plugged?: boolean;
  charging?: boolean;
  cycles?: number | null;
  health?: number | null;
  tempC?: number | null;
}

export interface TokenModel {
  in: number;
  out: number;
  cw: number;
  cr: number;
  cost: number;
}

export interface TokensData {
  input: number;
  output: number;
  cacheW: number;
  cacheR: number;
  cost: number;
  webSearch: number;
  webFetch: number;
  messages: number;
  byModel: Record<string, TokenModel>;
}

export interface VtexData {
  installed: boolean;
  path: string | null;
  account: string | null;
  login: string | null;
  workspace: string | null;
  loggedIn: boolean;
}
