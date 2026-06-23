/** Español. */
import type { Translation } from "./en.js";

export const es: Translation = {
  "subtitle": "sistema · gpu · energía",
  "paused": "PAUSADO",

  "panel.cpu": "CPU",
  "panel.mem": "MEMORIA",
  "panel.temp": "TEMPERATURA",
  "panel.io": "RED · DISCO",
  "panel.gpu": "GPU",
  "panel.tokens": "IA · TOKENS HOY",
  "panel.vtex": "VTEX",
  "panel.procs": "PROCESOS",
  "panel.chat": "CHAT · CLAUDE",
  "panel.chatInput": "pregunta",

  "status.cpu.ok": "tranquilo",
  "status.cpu.warn": "ocupado",
  "status.cpu.crit": "sobrecarga",
  "status.mem.ok": "ok",
  "status.mem.warn": "atención",
  "status.mem.crit": "llena",
  "status.disk.ok": "ok",
  "status.disk.warn": "llenándose",
  "status.disk.crit": "lleno",
  "status.gpu.ok": "tranquila",
  "status.gpu.warn": "activa",
  "status.gpu.crit": "alta",
  "status.temp.ok": "normal",
  "status.temp.warn": "tibia",
  "status.temp.crit": "caliente",

  "cpu.usage": "Uso",
  "cpu.cores": "Núcleos",
  "cpu.perCore": "por núcleo",

  "mem.ram": "RAM",
  "mem.used": "{used} de {total} usados · swap {swap}%",

  "io.disk": "Disco {pct}% lleno",

  "gpu.usage": "Uso",
  "gpu.mem": "mem {used}/{alloc}",

  "temp.unavailable": "sensores no disponibles",
  "temp.waitingSudo": "esperando sudo",
  "temp.needsSudo": "energía: requiere sudo",

  "spark.collecting": "recolectando…",
  "spark.lastMin": "último min: {range}",

  "tokens.spent": "Gastado hoy: ${cost}  ·  {messages} mensajes",
  "tokens.tokens": "Tokens: {total} · entrada {input} · salida {output}",
  "tokens.cache": "Caché: escribe {cw} · lee {cr}",
  "tokens.byModel": "Por modelo: {models}",
  "tokens.none": "—",

  "vtex.status": "Estado",
  "vtex.notInstalled": "CLI no instalada",
  "vtex.install": "Instala con: brew install vtex/cli/vtex",
  "vtex.connected": "conectado ✓",
  "vtex.account": "Cuenta",
  "vtex.user": "Usuario",
  "vtex.workspace": "Workspace",
  "vtex.notConnected": "no conectado",
  "vtex.signin": "Entra con: vtex login <cuenta>",

  "proc.cpu": "CPU%",
  "proc.mem": "MEM",
  "proc.pid": "PID",
  "proc.name": "Proceso",

  "chat.placeholder": "Pregúntale algo a Claude y pulsa Enter…",
  "chat.ready": "chat listo · modelo {model} · pulsa Enter",
  "chat.off": "chat apagado:",
  "chat.you": "tú",
  "chat.claude": "claude",
  "chat.error": "error:",
  "chat.thinking": "…",
  "chat.noData": "(sin datos todavía)",
  "chat.langName": "español",
  "chat.system":
    "Eres un asistente integrado en un panel de terminal llamado lattice, ejecutándose en un Mac (Apple Silicon). Responde en {lang}, de forma breve y directa — son preguntas rápidas en la terminal. Cuando la pregunta sea sobre el sistema, usa el contexto en vivo de abajo. Si algo no está en el contexto, di que no tienes ese dato.",

  "snap.cpu": "CPU",
  "snap.gpu": "GPU",
  "snap.ram": "RAM",
  "snap.network": "Red",
  "snap.disk": "Disco",
  "snap.power": "Energía",
  "snap.temp": "Temperatura",
  "snap.battery": "Batería",
  "snap.topProc": "Proceso top CPU",
  "snap.tokens": "Tokens IA hoy",
  "snap.vtex": "VTEX",

  "key.quit": "Salir",
  "key.pause": "Pausar",
  "key.faster": "Más rápido",
  "key.slower": "Más lento",

  "cli.sudoNeed": "lattice necesita sudo para leer la energía (powermetrics).",
  "cli.sudoFail": "sudo no disponible — siguiendo sin datos de energía.",
  "cli.sudoCancel": "cancelado.",
};
