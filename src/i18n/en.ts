/** English (base locale). Every other locale must implement these exact keys. */
export const en = {
  "subtitle": "system · gpu · power",
  "paused": "PAUSED",

  "panel.cpu": "CPU",
  "panel.mem": "MEMORY",
  "panel.temp": "TEMPERATURE",
  "panel.io": "NETWORK · DISK",
  "panel.gpu": "GPU",
  "panel.tokens": "AI · TOKENS TODAY",
  "panel.vtex": "VTEX",
  "panel.procs": "PROCESSES",
  "panel.chat": "CHAT · CLAUDE",
  "panel.chatInput": "question",

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

  "io.disk": "Disk {pct}% full",

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

  "chat.placeholder": "Ask Claude something and press Enter…",
  "chat.ready": "chat ready · model {model} · press Enter",
  "chat.off": "chat off:",
  "chat.you": "you",
  "chat.claude": "claude",
  "chat.error": "error:",
  "chat.thinking": "…",
  "chat.noData": "(no data yet)",
  "chat.langName": "English",
  "chat.system":
    "You are an assistant embedded in a terminal dashboard called lattice, running on a Mac (Apple Silicon). Answer in {lang}, briefly and directly — these are quick terminal questions. When the question is about the system, use the live context below. If something isn't in the context, say you don't have that data.",

  "snap.cpu": "CPU",
  "snap.gpu": "GPU",
  "snap.ram": "RAM",
  "snap.network": "Network",
  "snap.disk": "Disk",
  "snap.power": "Power",
  "snap.temp": "Temperature",
  "snap.battery": "Battery",
  "snap.topProc": "Top CPU process",
  "snap.tokens": "AI tokens today",
  "snap.vtex": "VTEX",

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
