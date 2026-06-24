/** Português (Brasil). */
import type { Translation } from "./en.js";

export const ptBR: Translation = {
  "subtitle": "sistema · gpu · energia",
  "paused": "PAUSADO",

  "panel.cpu": "CPU",
  "panel.mem": "MEMÓRIA",
  "panel.temp": "TEMPERATURA",
  "panel.net": "REDE",
  "panel.disks": "DISCOS",
  "panel.git": "GIT · REPOS",
  "panel.gpu": "GPU",
  "panel.tokens": "IA · TOKENS HOJE",
  "panel.vtex": "VTEX",
  "panel.procs": "PROCESSOS",

  "status.cpu.ok": "tranquilo",
  "status.cpu.warn": "ocupado",
  "status.cpu.crit": "sobrecarga",
  "status.mem.ok": "ok",
  "status.mem.warn": "atento",
  "status.mem.crit": "cheia",
  "status.disk.ok": "ok",
  "status.disk.warn": "enchendo",
  "status.disk.crit": "cheio",
  "status.gpu.ok": "tranquila",
  "status.gpu.warn": "ativa",
  "status.gpu.crit": "alta",
  "status.temp.ok": "normal",
  "status.temp.warn": "morna",
  "status.temp.crit": "quente",

  "cpu.usage": "Uso",
  "cpu.cores": "Núcleos",
  "cpu.perCore": "por núcleo",

  "mem.ram": "RAM",
  "mem.used": "{used} de {total} usados · swap {swap}%",

  "disks.mount": "MONTAGEM",
  "disks.read": "LEITURA",
  "disks.write": "ESCRITA",
  "disks.usage": "USO",

  "git.repo": "REPO",
  "git.branch": "BRANCH",
  "git.state": "ESTADO",
  "git.host": "HOST",
  "git.clean": "limpo",
  "git.dirty": "sujo",
  "git.local": "local",
  "git.server": "— servidor zgit ({container}): {list} ({n})",
  "git.serverEmpty": "— servidor zgit ({container}): sem repos",

  "gpu.usage": "Uso",
  "gpu.mem": "mem {used}/{alloc}",

  "temp.unavailable": "sensores indisponíveis",
  "temp.waitingSudo": "aguardando sudo",
  "temp.needsSudo": "energia: requer sudo",

  "spark.collecting": "coletando…",
  "spark.lastMin": "último min: {range}",

  "tokens.spent": "Gasto hoje: ${cost}  ·  {messages} mensagens",
  "tokens.tokens": "Tokens: {total} · entrada {input} · saída {output}",
  "tokens.cache": "Cache: grava {cw} · lê {cr}",
  "tokens.byModel": "Por modelo: {models}",
  "tokens.none": "—",

  "vtex.status": "Status",
  "vtex.notInstalled": "CLI não instalada",
  "vtex.install": "Instale com: brew install vtex/cli/vtex",
  "vtex.connected": "conectado ✓",
  "vtex.account": "Conta",
  "vtex.user": "Usuário",
  "vtex.workspace": "Workspace",
  "vtex.notConnected": "não conectado",
  "vtex.signin": "Entre com: vtex login <conta>",

  "proc.cpu": "CPU%",
  "proc.mem": "MEM",
  "proc.pid": "PID",
  "proc.name": "Processo",

  "key.quit": "Sair",
  "key.pause": "Pausar",
  "key.faster": "Mais rápido",
  "key.slower": "Mais lento",

  "cli.sudoNeed": "lattice precisa de sudo para ler energia (powermetrics).",
  "cli.sudoFail": "sudo indisponível — seguindo sem dados de energia.",
  "cli.sudoCancel": "cancelado.",
};
