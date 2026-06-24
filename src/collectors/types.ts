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

export interface GitRepo {
  name: string;
  branch: string; // "(detached)" when no branch
  ahead: number; // commits ahead of upstream
  behind: number; // commits behind upstream
  detached: boolean;
  dirty: boolean; // has uncommitted changes
}

export interface GitData {
  root: string;
  repos: GitRepo[];
  truncated: boolean; // more repos than MAX_REPOS were found
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

export interface PowerData {
  cpuW: number | null;
  gpuW: number | null;
  aneW: number | null;
  packageW: number | null;
  gpuFreqMhz: number | null;
  thermal: string | null;
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
