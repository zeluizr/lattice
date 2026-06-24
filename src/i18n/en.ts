/** English (base locale). Every other locale must implement these exact keys. */
export const en = {
  "subtitle": "system · gpu · power",
  "paused": "PAUSED",

  "panel.cpu": "CPU",
  "panel.mem": "MEMORY",
  "panel.temp": "TEMPERATURE",
  "panel.net": "NETWORK",
  "panel.disks": "DISKS",
  "panel.git": "GIT · REPOS",
  "panel.gpu": "GPU",
  "panel.tokens": "AI · TOKENS TODAY",
  "panel.vtex": "VTEX",
  "panel.procs": "PROCESSES",

  "status.cpu.ok": "calm",
  "status.cpu.warn": "busy",
  "status.cpu.crit": "overload",
  "status.mem.ok": "ok",
  "status.mem.warn": "watch",
  "status.mem.crit": "full",
  "status.disk.ok": "ok",
  "status.disk.warn": "filling",
  "status.disk.crit": "full",
  "status.gpu.ok": "calm",
  "status.gpu.warn": "active",
  "status.gpu.crit": "high",
  "status.temp.ok": "normal",
  "status.temp.warn": "warm",
  "status.temp.crit": "hot",

  "cpu.usage": "Usage",
  "cpu.cores": "Cores",
  "cpu.perCore": "per core",

  "mem.ram": "RAM",
  "mem.used": "{used} of {total} used · swap {swap}%",

  "disks.mount": "MOUNT",
  "disks.read": "READ",
  "disks.write": "WRITE",
  "disks.usage": "USAGE",

  "git.repo": "REPO",
  "git.branch": "BRANCH",
  "git.state": "STATE",
  "git.clean": "clean",
  "git.dirty": "dirty",

  "gpu.usage": "Usage",
  "gpu.mem": "mem {used}/{alloc}",

  "temp.unavailable": "sensors unavailable",
  "temp.waitingSudo": "waiting for sudo",
  "temp.needsSudo": "power: requires sudo",

  "spark.collecting": "collecting…",
  "spark.lastMin": "last min: {range}",

  "tokens.spent": "Spent today: ${cost}  ·  {messages} messages",
  "tokens.tokens": "Tokens: {total} · in {input} · out {output}",
  "tokens.cache": "Cache: write {cw} · read {cr}",
  "tokens.byModel": "By model: {models}",
  "tokens.none": "—",

  "vtex.status": "Status",
  "vtex.notInstalled": "CLI not installed",
  "vtex.install": "Install with: brew install vtex/cli/vtex",
  "vtex.connected": "connected ✓",
  "vtex.account": "Account",
  "vtex.user": "User",
  "vtex.workspace": "Workspace",
  "vtex.notConnected": "not connected",
  "vtex.signin": "Sign in with: vtex login <account>",

  "proc.cpu": "CPU%",
  "proc.mem": "MEM",
  "proc.pid": "PID",
  "proc.name": "Process",

  "key.quit": "Quit",
  "key.pause": "Pause",
  "key.faster": "Faster",
  "key.slower": "Slower",

  "cli.sudoNeed": "lattice needs sudo to read power (powermetrics).",
  "cli.sudoFail": "sudo unavailable — continuing without power data.",
  "cli.sudoCancel": "cancelled.",
} as const;

export type TranslationKey = keyof typeof en;
export type Translation = Record<TranslationKey, string>;
