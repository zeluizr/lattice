/** Português (Brasil). */
import type { Translation } from "./en.js";

export const ptBR: Translation = {
  "subtitle": "sistema · gpu · energia",
  "paused": "PAUSADO",

  "panel.cpu": "CPU",
  "panel.mem": "MEMÓRIA",
  "panel.temp": "TEMPERATURA",
  "panel.io": "REDE · DISCO",
  "panel.gpu": "GPU",
  "panel.tokens": "IA · TOKENS HOJE",
  "panel.vtex": "VTEX",
  "panel.procs": "PROCESSOS",
  "panel.chat": "CHAT · CLAUDE",
  "panel.chatInput": "pergunta",

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

  "io.disk": "Disco {pct}% cheio",

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

  "chat.placeholder": "Pergunte algo ao Claude e tecle Enter…",
  "chat.ready": "chat pronto · modelo {model} · tecle Enter",
  "chat.off": "chat off:",
  "chat.you": "você",
  "chat.claude": "claude",
  "chat.error": "erro:",
  "chat.thinking": "…",
  "chat.noData": "(sem dados ainda)",
  "chat.langName": "português",
  "chat.system":
    "Você é um assistente integrado a um painel de terminal chamado lattice, rodando num Mac (Apple Silicon). Responda em {lang}, de forma curta e direta — são perguntas rápidas no terminal. Quando a pergunta for sobre o sistema, use o contexto ao vivo abaixo. Se algo não estiver no contexto, diga que não tem o dado.",

  "snap.cpu": "CPU",
  "snap.gpu": "GPU",
  "snap.ram": "RAM",
  "snap.network": "Rede",
  "snap.disk": "Disco",
  "snap.power": "Energia",
  "snap.temp": "Temperatura",
  "snap.battery": "Bateria",
  "snap.topProc": "Processo top CPU",
  "snap.tokens": "Tokens IA hoje",
  "snap.vtex": "VTEX",

  "key.quit": "Sair",
  "key.pause": "Pausar",
  "key.faster": "Mais rápido",
  "key.slower": "Mais lento",

  "cli.sudoNeed": "lattice precisa de sudo para ler energia (powermetrics).",
  "cli.sudoFail": "sudo indisponível — seguindo sem dados de energia.",
  "cli.sudoCancel": "cancelado.",
};
