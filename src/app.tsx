import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Panel } from "./components/Panel.js";
import { SystemCollector } from "./collectors/system.js";
import { readGpu } from "./collectors/gpu.js";
import { readSensors, readBattery } from "./collectors/sensors.js";
import { PowerCollector } from "./collectors/power.js";
import { TokenCollector } from "./collectors/tokens.js";
import { readVtex } from "./collectors/vtex.js";
import { ChatClient, type ChatMessage } from "./chat.js";
import { coreCell, fmtTok, humanBytes, humanRate, sparkline, statusLevel } from "./format.js";
import type { Palette } from "./theme.js";
import type { IconName } from "./icons.js";
import type { Lang, Translator } from "./i18n/index.js";
import type {
  BatteryData,
  GpuData,
  PowerData,
  SensorsData,
  SystemData,
  TokensData,
  VtexData,
} from "./collectors/types.js";

export interface AppProps {
  t: Translator;
  pal: Palette;
  icon: (name: IconName) => string;
  lang: Lang;
  usePower: boolean;
  interval: number;
  topN: number;
}

interface LogLine {
  who: "you" | "claude" | "sys" | "err";
  text: string;
}

const MAX_HIST = 60;
const push = (h: number[], v: number): number[] => [...h, v].slice(-MAX_HIST);

function timeStr(): string {
  const d = new Date();
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function App(props: AppProps): React.JSX.Element {
  const { t, pal, icon, lang, usePower, topN } = props;
  const { exit } = useApp();

  const [sys, setSys] = useState<SystemData | null>(null);
  const [gpu, setGpu] = useState<GpuData | null>(null);
  const [sensors, setSensors] = useState<SensorsData | null>(null);
  const [power, setPower] = useState<PowerData | null>(null);
  const [tokens, setTokens] = useState<TokensData | null>(null);
  const [vtex, setVtex] = useState<VtexData | null>(null);

  const [hCpu, setHCpu] = useState<number[]>([]);
  const [hMem, setHMem] = useState<number[]>([]);
  const [hNet, setHNet] = useState<number[]>([]);
  const [hGpu, setHGpu] = useState<number[]>([]);
  const [hTemp, setHTemp] = useState<number[]>([]);

  const [paused, setPaused] = useState(false);
  const [interval, setIntervalState] = useState(props.interval);
  const [now, setNow] = useState(timeStr());
  const [cols, setCols] = useState(process.stdout.columns || 100);

  const [log, setLog] = useState<LogLine[]>([]);
  const [inputMode, setInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [thinking, setThinking] = useState(false);

  const sysRef = useRef<SystemCollector | null>(null);
  const tokRef = useRef<TokenCollector | null>(null);
  const powerRef = useRef<PowerCollector | null>(null);
  const chatRef = useRef<ChatClient | null>(null);
  const chatHistRef = useRef<ChatMessage[]>([]);
  const snapRef = useRef<Record<string, string>>({});
  const pausedRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ----- init collectors + power subprocess + clock -------------------------
  useEffect(() => {
    mounted.current = true;
    sysRef.current = new SystemCollector(topN);
    tokRef.current = new TokenCollector();
    chatRef.current = new ChatClient();
    if (usePower) {
      powerRef.current = new PowerCollector(Math.round(props.interval * 1000));
      powerRef.current.start();
    }
    const c = chatRef.current;
    setLog([
      c.ready
        ? { who: "sys", text: t("chat.ready", { model: c.model }) }
        : { who: "err", text: `${t("chat.off")} ${c.error ?? ""}` },
    ]);

    const clock = setInterval(() => mounted.current && setNow(timeStr()), 1000);
    const onResize = () => setCols(process.stdout.columns || 100);
    process.stdout.on("resize", onResize);
    return () => {
      mounted.current = false;
      clearInterval(clock);
      process.stdout.off("resize", onResize);
      powerRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- main refresh loop --------------------------------------------------
  const refreshData = useCallback(async () => {
    if (pausedRef.current || !sysRef.current) return;
    const [s, g, st] = await Promise.all([sysRef.current.read(), readGpu(), readSensors()]);
    const p = powerRef.current ? powerRef.current.read() : null;
    if (!mounted.current) return;
    setSys(s);
    setGpu(g);
    setSensors(st);
    setPower(p);
    setHCpu((h) => push(h, s.cpuTotal));
    setHMem((h) => push(h, s.memPercent));
    setHNet((h) => push(h, (s.netRecvBps + s.netSentBps) / 1024 / 1024));
    setHGpu((h) => push(h, g.utilPct ?? 0));
    const tv = st.cpuTemp ?? st.gpuTemp;
    if (tv != null) setHTemp((h) => push(h, tv));

    const snap: Record<string, string> = { ...snapRef.current };
    snap[t("snap.cpu")] = `${s.cpuTotal.toFixed(0)}% (${s.cpuPer.length} cores)`;
    snap[t("snap.gpu")] = `${g.utilPct ?? 0}% util, mem ${humanBytes(g.memUsedBytes)}/${humanBytes(g.memAllocBytes)}`;
    snap[t("snap.ram")] = `${s.memPercent.toFixed(0)}% (${humanBytes(s.memUsed)}/${humanBytes(s.memTotal)})`;
    snap[t("snap.network")] = `↓ ${humanRate(s.netRecvBps)} ↑ ${humanRate(s.netSentBps)}`;
    snap[t("snap.disk")] = `R ${humanRate(s.diskReadBps)} W ${humanRate(s.diskWriteBps)}, ${s.diskUsagePercent.toFixed(0)}% full`;
    if (st.cpuTemp != null)
      snap[t("snap.temp")] = `CPU ${st.cpuTemp.toFixed(0)}°C, GPU ${(st.gpuTemp ?? 0).toFixed(0)}°C${st.fans[0] ? `, fan ${st.fans[0].rpm.toFixed(0)}rpm` : ""}`;
    if (p && p.cpuW != null) snap[t("snap.power")] = `CPU ${p.cpuW.toFixed(1)}W, GPU ${(p.gpuW ?? 0).toFixed(1)}W`;
    if (s.procs[0]) snap[t("snap.topProc")] = `${s.procs[0].name} (${s.procs[0].cpu.toFixed(0)}%)`;
    snapRef.current = snap;
  }, [t]);

  const refreshAux = useCallback(async () => {
    if (pausedRef.current || !tokRef.current) return;
    const [tk, vx, bat] = await Promise.all([tokRef.current.read(), readVtex(), readBattery()]);
    if (!mounted.current) return;
    setTokens(tk);
    setVtex(vx);
    const snap = { ...snapRef.current };
    snap[t("snap.tokens")] = `$${tk.cost.toFixed(2)}, ${tk.messages} msgs`;
    snap[t("snap.vtex")] = vx.loggedIn
      ? `${vx.account}/${vx.workspace || "master"}`
      : vx.installed
        ? "CLI installed, logged out"
        : "CLI not installed";
    if (bat.present) snap[t("snap.battery")] = `${bat.percent?.toFixed(0)}%${bat.charging ? " charging" : ""}`;
    snapRef.current = snap;
  }, [t]);

  useEffect(() => {
    refreshData();
    const id = setInterval(refreshData, Math.max(250, interval * 1000));
    return () => clearInterval(id);
  }, [interval, refreshData]);

  useEffect(() => {
    refreshAux();
    const id = setInterval(refreshAux, 3000);
    return () => clearInterval(id);
  }, [refreshAux]);

  // ----- chat ---------------------------------------------------------------
  const snapshotText = (): string => {
    const entries = Object.entries(snapRef.current);
    if (!entries.length) return t("chat.noData");
    return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
  };

  const submit = useCallback(() => {
    const q = inputValue.trim();
    setInputValue("");
    if (!q) return;
    setLog((l) => [...l, { who: "you", text: q }]);
    const chat = chatRef.current;
    if (!chat?.ready) {
      setLog((l) => [...l, { who: "err", text: chat?.error ?? "chat off" }]);
      return;
    }
    setThinking(true);
    const system = `${t("chat.system", { lang: t("chat.langName") })}\n\n[live context]\n${snapshotText()}`;
    chat
      .ask(q, system, chatHistRef.current)
      .then((answer) => {
        if (!mounted.current) return;
        chatHistRef.current = [
          ...chatHistRef.current,
          { role: "user" as const, content: q },
          { role: "assistant" as const, content: answer },
        ].slice(-8);
        setLog((l) => [...l, { who: "claude", text: answer }]);
      })
      .catch((e) => mounted.current && setLog((l) => [...l, { who: "err", text: `${t("chat.error")} ${e}` }]))
      .finally(() => mounted.current && setThinking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, t]);

  useInput((input, key) => {
    if (inputMode) {
      if (key.escape) {
        setInputMode(false);
        setInputValue("");
      } else if (key.return) {
        submit();
      } else if (key.backspace || key.delete) {
        setInputValue((v) => v.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setInputValue((v) => v + input);
      }
      return;
    }
    if (input === "q") {
      powerRef.current?.stop();
      exit();
    } else if (input === "p") {
      setPaused((p) => !p);
    } else if (input === "+" || input === "=") {
      setIntervalState((i) => Math.max(0.25, i / 2));
    } else if (input === "-" || input === "_") {
      setIntervalState((i) => Math.min(10, i * 2));
    } else if ((input === "i" || input === "/") && chatRef.current?.ready) {
      setInputMode(true);
    }
  });

  // ----- derived helpers ----------------------------------------------------
  const m = 1; // marginRight per panel
  const col2 = Math.max(24, Math.floor((cols - 2 * m) / 2));
  const col3 = Math.max(18, Math.floor((cols - 3 * m) / 3));
  const fullW = Math.max(40, cols - m);
  const inner = (w: number) => Math.max(6, w - 4); // minus border (2) + padding (2)
  const w2 = inner(col2);
  const w3 = inner(col3);

  const statColor = (lvl: "ok" | "warn" | "crit"): string =>
    lvl === "ok" ? pal.green : lvl === "warn" ? pal.yellow : pal.red;

  const Stat = ({ value, warn, crit, metric }: { value: number; warn: number; crit: number; metric: string }) => {
    const lvl = statusLevel(value, warn, crit);
    return (
      <Text color={statColor(lvl)}>
        ● {t(`status.${metric}.${lvl}` as never)}
      </Text>
    );
  };

  const caption = (h: number[], fmt: (v: number) => string): string => {
    if (!h.length) return t("spark.collecting");
    const lo = Math.min(...h);
    const hi = Math.max(...h);
    const body = lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
    return t("spark.lastMin", { range: body });
  };

  // ----- values -------------------------------------------------------------
  const cpu = sys?.cpuTotal ?? 0;
  const cores = sys?.cpuPer ?? [];
  const memPct = sys?.memPercent ?? 0;
  const ct = sensors?.cpuTemp ?? null;
  const gt = sensors?.gpuTemp ?? null;
  const util = gpu?.utilPct ?? 0;

  const tokTotal = tokens ? tokens.input + tokens.output + tokens.cacheW + tokens.cacheR : 0;
  const modelItems = Object.entries(tokens?.byModel ?? {}).sort((a, b) => b[1].cost - a[1].cost);
  const modelParts = modelItems.slice(0, 2).map(([k, v]) => `${k} $${v.cost.toFixed(2)}`);
  const modelExtra = modelItems.length > 2 ? ` +${modelItems.length - 2}` : "";
  const web = tokens && (tokens.webSearch || tokens.webFetch) ? ` · web ${tokens.webSearch}/${tokens.webFetch}` : "";
  const models = modelParts.length ? modelParts.join(" · ") + modelExtra + web : t("tokens.none");

  const powerParts: string[] = [];
  if (power && (power.cpuW != null || power.gpuW != null))
    powerParts.push(`${icon("power")} ${(power.cpuW ?? 0).toFixed(1)}+${(power.gpuW ?? 0).toFixed(1)}W`);
  else if (usePower) powerParts.push(`${icon("power")} ${t("temp.waitingSudo")}`);
  if (sensors?.fans?.length) powerParts.push(`${icon("fan")} ${sensors.fans[0].rpm.toFixed(0)} rpm`);
  const tempLine2 = powerParts.length ? powerParts.join("  ·  ") : t("temp.needsSudo");

  const whoColor: Record<LogLine["who"], string> = {
    you: pal.cyan,
    claude: pal.green,
    sys: pal.comment,
    err: pal.red,
  };
  const whoLabel: Record<LogLine["who"], string> = {
    you: t("chat.you"),
    claude: t("chat.claude"),
    sys: "",
    err: "",
  };

  return (
    <Box flexDirection="column" width={cols}>
      {/* header */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text color={pal.purple} bold>
          ◇ lattice
        </Text>
        <Text color={pal.comment}>{paused ? t("paused") : t("subtitle")}</Text>
        <Text color={pal.comment}>
          {icon("clock")} {now}
        </Text>
      </Box>

      {/* row 1: CPU | MEM */}
      <Box flexDirection="row">
        <Panel title={`${icon("cpu")} ${t("panel.cpu")}`} color={pal.cyan} width={col2}>
          <Text wrap="truncate">
            {t("cpu.usage")}: <Text bold>{cpu.toFixed(0)}%</Text>
            {"   "}
            <Stat value={cpu} warn={60} crit={85} metric="cpu" />
          </Text>
          <Text wrap="truncate">
            {t("cpu.cores")}: {cores.length}
            {"   "}
            {t("cpu.perCore")}: {cores.map(coreCell).join("")}
          </Text>
          <Text color={pal.cyan} wrap="truncate">
            {sparkline(hCpu, w2)}
          </Text>
          <Text color={pal.comment} wrap="truncate">
            {caption(hCpu, (v) => `${v.toFixed(0)}%`)}
          </Text>
        </Panel>

        <Panel title={`${icon("mem")} ${t("panel.mem")}`} color={pal.green} width={col2}>
          <Text wrap="truncate">
            {t("mem.ram")}: <Text bold>{memPct.toFixed(0)}%</Text>
            {"   "}
            <Stat value={memPct} warn={75} crit={90} metric="mem" />
          </Text>
          <Text wrap="truncate">
            {t("mem.used", {
              used: humanBytes(sys?.memUsed),
              total: humanBytes(sys?.memTotal),
              swap: (sys?.swapPercent ?? 0).toFixed(0),
            })}
          </Text>
          <Text color={pal.green} wrap="truncate">
            {sparkline(hMem, w2)}
          </Text>
          <Text color={pal.comment} wrap="truncate">
            {caption(hMem, (v) => `${v.toFixed(0)}%`)}
          </Text>
        </Panel>
      </Box>

      {/* row 2: TEMP | IO | GPU */}
      <Box flexDirection="row">
        <Panel title={`${icon("temp")} ${t("panel.temp")}`} color={pal.orange} width={col3}>
          <Text wrap="truncate">
            {ct != null && gt != null ? (
              <>
                {ct.toFixed(0)}° / {gt.toFixed(0)}°{"   "}
                <Stat value={Math.max(ct, gt)} warn={65} crit={80} metric="temp" />
              </>
            ) : ct != null || gt != null ? (
              <>
                {(ct ?? gt ?? 0).toFixed(0)}°C{"   "}
                <Stat value={ct ?? gt ?? 0} warn={65} crit={80} metric="temp" />
              </>
            ) : (
              <Text color={pal.comment}>{t("temp.unavailable")}</Text>
            )}
          </Text>
          <Text wrap="truncate">{tempLine2}</Text>
          <Text color={pal.orange} wrap="truncate">
            {sparkline(hTemp, w3)}
          </Text>
          <Text color={pal.comment} wrap="truncate">
            {caption(hTemp, (v) => `${v.toFixed(0)}°`)}
          </Text>
        </Panel>

        <Panel title={`${icon("net")} ${t("panel.io")}`} color={pal.cyan} width={col3}>
          <Text wrap="truncate">
            {icon("net")} ↓ {humanRate(sys?.netRecvBps)}  ↑ {humanRate(sys?.netSentBps)}
          </Text>
          <Text wrap="truncate">
            {icon("disk")} {t("io.disk", { pct: (sys?.diskUsagePercent ?? 0).toFixed(0) })}
            {"  "}
            <Stat value={sys?.diskUsagePercent ?? 0} warn={80} crit={92} metric="disk" />
          </Text>
          <Text color={pal.cyan} wrap="truncate">
            {sparkline(hNet, w3)}
          </Text>
          <Text color={pal.comment} wrap="truncate">
            {caption(hNet, (v) => humanRate(v * 1024 * 1024))}
          </Text>
        </Panel>

        <Panel title={`${icon("gpu")} ${t("panel.gpu")}`} color={pal.purple} width={col3}>
          <Text wrap="truncate">
            {t("gpu.usage")}: <Text bold>{util}%</Text>
            {"   "}
            <Stat value={util} warn={60} crit={85} metric="gpu" />
          </Text>
          <Text wrap="truncate">
            {t("gpu.mem", { used: humanBytes(gpu?.memUsedBytes), alloc: humanBytes(gpu?.memAllocBytes) })}
          </Text>
          <Text color={pal.purple} wrap="truncate">
            {sparkline(hGpu, w3)}
          </Text>
          <Text color={pal.comment} wrap="truncate">
            {caption(hGpu, (v) => `${v.toFixed(0)}%`)}
          </Text>
        </Panel>
      </Box>

      {/* row 3: TOKENS | VTEX */}
      <Box flexDirection="row">
        <Panel title={`${icon("tokens")} ${t("panel.tokens")}`} color={pal.pink} width={col2}>
          <Text wrap="truncate">
            {t("tokens.spent", { cost: (tokens?.cost ?? 0).toFixed(2), messages: tokens?.messages ?? 0 })}
          </Text>
          <Text wrap="truncate">
            {t("tokens.tokens", {
              total: fmtTok(tokTotal),
              input: fmtTok(tokens?.input),
              output: fmtTok(tokens?.output),
            })}
          </Text>
          <Text wrap="truncate">
            {t("tokens.cache", { cw: fmtTok(tokens?.cacheW), cr: fmtTok(tokens?.cacheR) })}
          </Text>
          <Text wrap="truncate" color={pal.comment}>
            {t("tokens.byModel", { models })}
          </Text>
        </Panel>

        <Panel title={`${icon("vtex")} ${t("panel.vtex")}`} color={pal.purple} width={col2}>
          {!vtex ? (
            <Text color={pal.comment}>{t("spark.collecting")}</Text>
          ) : !vtex.installed ? (
            <>
              <Text>
                {t("vtex.status")}: <Text color={pal.red}>{t("vtex.notInstalled")}</Text>
              </Text>
              <Text wrap="truncate" color={pal.comment}>
                {t("vtex.install")}
              </Text>
            </>
          ) : vtex.loggedIn ? (
            <>
              <Text>
                {t("vtex.status")}: <Text color={pal.green}>{t("vtex.connected")}</Text>
              </Text>
              <Text wrap="truncate">
                {t("vtex.account")}: <Text bold>{vtex.account}</Text>
              </Text>
              <Text wrap="truncate">
                {t("vtex.user")}: {vtex.login || "—"}
              </Text>
              <Text wrap="truncate">
                {t("vtex.workspace")}: {vtex.workspace || "master"}
              </Text>
            </>
          ) : (
            <>
              <Text>
                {t("vtex.status")}: <Text color={pal.yellow}>{t("vtex.notConnected")}</Text>
              </Text>
              <Text wrap="truncate" color={pal.comment}>
                {t("vtex.signin")}
              </Text>
            </>
          )}
        </Panel>
      </Box>

      {/* processes */}
      <Box flexDirection="column" borderStyle="round" borderColor={pal.comment} paddingX={1} marginRight={1} width={fullW}>
        <Text color={pal.comment} bold>
          {icon("proc")} {t("panel.procs")}
        </Text>
        <Text color={pal.purple} bold wrap="truncate">
          {t("proc.cpu").padEnd(6)}
          {t("proc.mem").padEnd(9)}
          {t("proc.pid").padEnd(8)}
          {t("proc.name")}
        </Text>
        {(sys?.procs ?? []).map((p) => (
          <Text key={p.pid} wrap="truncate">
            {`${p.cpu.toFixed(0)}%`.padEnd(6)}
            {humanBytes(p.rss).padEnd(9)}
            {String(p.pid).padEnd(8)}
            {p.name.slice(0, 30)}
          </Text>
        ))}
      </Box>

      {/* chat */}
      <Box flexDirection="column" borderStyle="round" borderColor={pal.pink} paddingX={1} marginRight={1} width={fullW}>
        <Text color={pal.pink} bold>
          {icon("chat")} {t("panel.chat")}
        </Text>
        {log.slice(-6).map((l, i) => (
          <Text key={i} wrap="truncate">
            {whoLabel[l.who] ? (
              <Text color={whoColor[l.who]} bold>
                {whoLabel[l.who]} ›{" "}
              </Text>
            ) : (
              <Text color={whoColor[l.who]}>· </Text>
            )}
            <Text color={l.who === "sys" || l.who === "err" ? whoColor[l.who] : pal.foreground}>{l.text}</Text>
          </Text>
        ))}
        {thinking && <Text color={pal.comment}>{t("chat.thinking")}</Text>}
        <Text color={pal.cyan} wrap="truncate">
          {inputMode ? (
            <>
              › {inputValue}
              <Text color={pal.pink}>█</Text>
            </>
          ) : (
            <Text color={pal.comment}>{chatRef.current?.ready ? t("chat.placeholder") + " (i)" : ""}</Text>
          )}
        </Text>
      </Box>

      {/* footer */}
      <Box paddingX={1}>
        <Text color={pal.comment}>
          <Text color={pal.pink}>q</Text> {t("key.quit")} · <Text color={pal.pink}>p</Text> {t("key.pause")} ·{" "}
          <Text color={pal.pink}>+/-</Text> {t("key.faster")}/{t("key.slower")} · <Text color={pal.pink}>i</Text>{" "}
          {t("panel.chatInput")} · {interval.toFixed(2)}s
        </Text>
      </Box>
    </Box>
  );
}
