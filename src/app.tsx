import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Panel } from "./components/Panel.js";
import { SystemCollector } from "./collectors/system.js";
import { DisksCollector } from "./collectors/disks.js";
import { GitCollector } from "./collectors/git.js";
import { ZgitCollector } from "./collectors/zgit.js";
import { HFCollector } from "./collectors/huggingface.js";
import { readGpu } from "./collectors/gpu.js";
import { readSensors } from "./collectors/sensors.js";
import { TokenCollector } from "./collectors/tokens.js";
import { readVtex } from "./collectors/vtex.js";
import { agoShort, coreCell, fmtTok, humanBytes, humanRate, sparkline, statusLevel } from "./format.js";
import type { Palette } from "./theme.js";
import type { IconName } from "./icons.js";
import type { Translator } from "./i18n/index.js";
import type {
  DisksData,
  GitData,
  GitRepo,
  GpuData,
  HFData,
  SensorsData,
  SystemData,
  TokensData,
  VtexData,
  ZgitServerData,
} from "./collectors/types.js";

export interface AppProps {
  t: Translator;
  pal: Palette;
  icon: (name: IconName) => string;
  repoRoots: string[];
  zgitContainer: string;
  hfCachePath?: string;
}

const MAX_HIST = 60;
const push = (h: number[], v: number): number[] => [...h, v].slice(-MAX_HIST);

const DEFAULT_INTERVAL = 1; // seconds between refreshes (adjust at runtime with +/-)
const PROCS = 12; // number of top processes to list

function timeStr(): string {
  const d = new Date();
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function App(props: AppProps): React.JSX.Element {
  const { t, pal, icon, repoRoots, zgitContainer, hfCachePath } = props;
  const { exit } = useApp();

  const [sys, setSys] = useState<SystemData | null>(null);
  const [disks, setDisks] = useState<DisksData | null>(null);
  const [git, setGit] = useState<GitData | null>(null);
  const [zgit, setZgit] = useState<ZgitServerData | null>(null);
  const [gpu, setGpu] = useState<GpuData | null>(null);
  const [sensors, setSensors] = useState<SensorsData | null>(null);
  const [tokens, setTokens] = useState<TokensData | null>(null);
  const [vtex, setVtex] = useState<VtexData | null>(null);
  const [hf, setHf] = useState<HFData | null>(null);

  const [hCpu, setHCpu] = useState<number[]>([]);
  const [hMem, setHMem] = useState<number[]>([]);
  const [hNet, setHNet] = useState<number[]>([]);
  const [hGpu, setHGpu] = useState<number[]>([]);
  const [hTemp, setHTemp] = useState<number[]>([]);

  const [paused, setPaused] = useState(false);
  const [interval, setIntervalState] = useState(DEFAULT_INTERVAL);
  const [now, setNow] = useState(timeStr());
  const [cols, setCols] = useState(process.stdout.columns || 100);

  const sysRef = useRef<SystemCollector | null>(null);
  const disksRef = useRef<DisksCollector | null>(null);
  const gitRef = useRef<GitCollector | null>(null);
  const zgitRef = useRef<ZgitCollector | null>(null);
  const tokRef = useRef<TokenCollector | null>(null);
  const hfRef = useRef<HFCollector | null>(null);
  const pausedRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ----- init collectors + power subprocess + clock -------------------------
  useEffect(() => {
    mounted.current = true;
    sysRef.current = new SystemCollector(PROCS);
    disksRef.current = new DisksCollector();
    gitRef.current = new GitCollector(repoRoots);
    zgitRef.current = new ZgitCollector(zgitContainer);
    tokRef.current = new TokenCollector();
    hfRef.current = new HFCollector(hfCachePath);

    const clock = setInterval(() => mounted.current && setNow(timeStr()), 1000);
    const onResize = () => setCols(process.stdout.columns || 100);
    process.stdout.on("resize", onResize);
    return () => {
      mounted.current = false;
      clearInterval(clock);
      process.stdout.off("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- main refresh loop --------------------------------------------------
  const refreshData = useCallback(async () => {
    if (pausedRef.current || !sysRef.current || !disksRef.current) return;
    const [s, d, g, st] = await Promise.all([
      sysRef.current.read(),
      disksRef.current.read(),
      readGpu(),
      readSensors(),
    ]);
    if (!mounted.current) return;
    setSys(s);
    setDisks(d);
    setGpu(g);
    setSensors(st);
    setHCpu((h) => push(h, s.cpuTotal));
    setHMem((h) => push(h, s.memPercent));
    setHNet((h) => push(h, (s.netRecvBps + s.netSentBps) / 1024 / 1024));
    setHGpu((h) => push(h, g.utilPct ?? 0));
    const tv = st.cpuTemp ?? st.gpuTemp;
    if (tv != null) setHTemp((h) => push(h, tv));
  }, []);

  const refreshAux = useCallback(async () => {
    if (pausedRef.current || !tokRef.current) return;
    const [tk, vx, gt, zg, hfd] = await Promise.all([
      tokRef.current.read(),
      readVtex(),
      gitRef.current ? gitRef.current.read() : Promise.resolve(null),
      zgitRef.current ? zgitRef.current.read() : Promise.resolve(null),
      hfRef.current ? hfRef.current.read() : Promise.resolve(null),
    ]);
    if (!mounted.current) return;
    setTokens(tk);
    setVtex(vx);
    setGit(gt);
    setZgit(zg);
    setHf(hfd);
  }, []);

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

  useInput((input) => {
    if (input === "q") {
      exit();
    } else if (input === "p") {
      setPaused((p) => !p);
    } else if (input === "+" || input === "=") {
      setIntervalState((i) => Math.max(0.25, i / 2));
    } else if (input === "-" || input === "_") {
      setIntervalState((i) => Math.min(10, i * 2));
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

  // GIT + PROCESSES share a row on wide terminals; they stack when it's too
  // narrow to split. GIT's columns are fixed-width, so it takes only what it
  // needs (clamped) and PROCESSES inherits the slack — handy for long names.
  const sideBySide = cols >= 92;
  const gitW = Math.max(48, Math.min(58, Math.floor((cols - 2 * m) * 0.46)));
  const procW = cols - 2 * m - gitW;

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
  const diskRows = disks?.disks ?? [];
  const gitRepos = git?.repos ?? [];
  const gitTotal = git?.total ?? 0;
  const zgitServer = zgit?.available ? zgit : null;
  const showGit = gitTotal > 0 || !!zgitServer;
  const hfModels = hf?.models ?? [];
  const showHf = !!hf?.available;
  const nowSec = Math.floor(Date.now() / 1000);

  const hostLabel = (r: GitRepo): string =>
    r.hostKind === "github"
      ? "GitHub"
      : r.hostKind === "zgit"
        ? "zgit"
        : r.hostKind === "none"
          ? t("git.local")
          : r.host || "—";
  const hostColor = (r: GitRepo): string =>
    r.hostKind === "github"
      ? pal.purple
      : r.hostKind === "zgit"
        ? pal.orange
        : r.hostKind === "none"
          ? pal.comment
          : pal.cyan;

  const tokTotal = tokens ? tokens.input + tokens.output + tokens.cacheW + tokens.cacheR : 0;
  const modelItems = Object.entries(tokens?.byModel ?? {}).sort((a, b) => b[1].cost - a[1].cost);
  const modelParts = modelItems.slice(0, 2).map(([k, v]) => `${k} $${v.cost.toFixed(2)}`);
  const modelExtra = modelItems.length > 2 ? ` +${modelItems.length - 2}` : "";
  const web = tokens && (tokens.webSearch || tokens.webFetch) ? ` · web ${tokens.webSearch}/${tokens.webFetch}` : "";
  const models = modelParts.length ? modelParts.join(" · ") + modelExtra + web : t("tokens.none");

  const tempLine2 = sensors?.fans?.length
    ? `${icon("fan")} ${sensors.fans[0].rpm.toFixed(0)} rpm`
    : "";

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

      {/* row 2: TEMP | NETWORK | GPU */}
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

        <Panel title={`${icon("net")} ${t("panel.net")}`} color={pal.cyan} width={col3}>
          <Text wrap="truncate">
            ↓ {humanRate(sys?.netRecvBps)}
          </Text>
          <Text wrap="truncate">
            ↑ {humanRate(sys?.netSentBps)}
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

      {/* disks: one row per real mount, including /Volumes */}
      <Box flexDirection="column" borderStyle="round" borderColor={pal.cyan} paddingX={1} marginRight={1} width={fullW}>
        <Text color={pal.cyan} bold>
          {icon("disk")} {t("panel.disks")}
        </Text>
        <Text color={pal.purple} bold wrap="truncate">
          {t("disks.mount").padEnd(22)}
          {t("disks.read").padEnd(12)}
          {t("disks.write").padEnd(12)}
          {t("disks.usage")}
        </Text>
        {diskRows.length === 0 ? (
          <Text color={pal.comment}>{t("spark.collecting")}</Text>
        ) : (
          diskRows.map((d) => {
            const lvl = statusLevel(d.usePercent, 80, 92);
            return (
              <Text key={d.mount} wrap="truncate">
                {d.mount.slice(0, 21).padEnd(22)}
                {humanRate(d.readBps).padEnd(12)}
                {humanRate(d.writeBps).padEnd(12)}
                <Text color={statColor(lvl)}>● {d.usePercent.toFixed(0)}%</Text>
                {"  "}
                <Text color={pal.comment}>
                  ({humanBytes(d.usedBytes)}/{humanBytes(d.sizeBytes)})
                </Text>
              </Text>
            );
          })
        )}
      </Box>

      {/* HuggingFace: installed local models + which are live right now */}
      {showHf && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={pal.yellow}
          paddingX={1}
          marginRight={1}
          width={fullW}
        >
          <Text color={pal.yellow} bold>
            {icon("hf")} {t("panel.hf")}
          </Text>
          <Text color={pal.purple} bold wrap="truncate">
            {t("hf.model").padEnd(30)}
            {t("hf.size").padEnd(9)}
            {t("hf.type").padEnd(16)}
            {t("hf.state")}
          </Text>
          {hfModels.map((mdl) => (
            <Text key={mdl.id} wrap="truncate">
              {mdl.id.slice(0, 29).padEnd(30)}
              {humanBytes(mdl.sizeBytes).padEnd(9)}
              {(mdl.modelType || "—").slice(0, 15).padEnd(16)}
              {mdl.active ? (
                <Text color={pal.green}>
                  ● {t("hf.active")} {mdl.procName.slice(0, 14)} {mdl.pid}
                </Text>
              ) : mdl.lastUsed > 0 ? (
                <Text color={pal.comment}>{t("hf.usedAgo", { ago: agoShort(mdl.lastUsed, nowSec) })}</Text>
              ) : (
                <Text color={pal.comment}>{t("hf.idle")}</Text>
              )}
            </Text>
          ))}
          <Text color={pal.comment} wrap="truncate">
            {t("hf.summary", {
              path: hf?.cachePath ?? "",
              size: humanBytes(hf?.totalBytes),
              n: hfModels.length,
              active: hf?.activeCount ?? 0,
            })}
          </Text>
        </Box>
      )}

      {/* row 3: TOKENS | VTEX */}
      <Box flexDirection="row">
        <Panel
          title={`${icon("tokens")} ${t("panel.tokens")}`}
          color={pal.pink}
          width={col2}
        >
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

      {/* GIT report + PROCESSES, side by side on wide terminals (stacked when
          narrow). The GIT report — a fixed, cwd-independent list of every repo
          tagged by host (GitHub vs the zgit server) plus the server's own bare
          repos — is the hero of the row; processes sit quietly beside it. */}
      <Box flexDirection={sideBySide ? "row" : "column"} alignItems="flex-start">
        {showGit && (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={pal.green}
            paddingX={1}
            marginRight={1}
            width={sideBySide ? gitW : fullW}
          >
            <Text color={pal.green} bold wrap="truncate">
              {icon("git")} {t("panel.git")}
              {git?.truncated ? <Text color={pal.comment}> (+)</Text> : null}
            </Text>
            {gitRepos.length > 0 ? (
              <Text color={pal.purple} bold wrap="truncate">
                {t("git.repo").padEnd(18)}
                {t("git.branch").padEnd(12)}
                {t("git.host").padEnd(8)}
                {t("git.state")}
              </Text>
            ) : gitTotal > 0 ? (
              <Text color={pal.green} wrap="truncate">
                {t("git.allClear", { n: gitTotal })}
              </Text>
            ) : null}
            {gitRepos.map((r) => {
              const label = r.detached ? "(detached)" : r.branch;
              return (
                <Text key={r.path} wrap="truncate">
                  {r.name.slice(0, 17).padEnd(18)}
                  {label.slice(0, 11).padEnd(12)}
                  <Text color={hostColor(r)}>{hostLabel(r).slice(0, 7).padEnd(8)}</Text>
                  <Text color={r.dirty ? pal.yellow : pal.orange}>●</Text>
                  {r.dirty ? <Text color={pal.yellow}> {t("git.uncommitted")}</Text> : null}
                  {r.ahead > 0 ? <Text color={pal.cyan}> ↑{r.ahead}</Text> : null}
                  {r.behind > 0 ? <Text color={pal.orange}> ↓{r.behind}</Text> : null}
                </Text>
              );
            })}
            {zgitServer && (
              <Text color={pal.comment} wrap="truncate">
                {zgitServer.repos.length
                  ? t("git.server", {
                      container: zgitServer.container,
                      list: zgitServer.repos.join(", "),
                      n: zgitServer.repos.length,
                    })
                  : t("git.serverEmpty", { container: zgitServer.container })}
              </Text>
            )}
          </Box>
        )}

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={pal.comment}
          paddingX={1}
          marginRight={1}
          width={sideBySide && showGit ? procW : fullW}
        >
          <Text color={pal.comment} bold>
            {icon("proc")} {t("panel.procs")}
          </Text>
          <Text color={pal.purple} bold wrap="truncate">
            {t("proc.cpu").padEnd(6)}
            {t("proc.mem").padEnd(9)}
            {t("proc.pid").padEnd(7)}
            {t("proc.name")}
          </Text>
          {(sys?.procs ?? []).map((p) => (
            <Text key={p.pid} wrap="truncate">
              {`${p.cpu.toFixed(0)}%`.padEnd(6)}
              {humanBytes(p.rss).padEnd(9)}
              {String(p.pid).padEnd(7)}
              {p.name.slice(0, 40)}
            </Text>
          ))}
        </Box>
      </Box>

      {/* footer */}
      <Box paddingX={1}>
        <Text color={pal.comment}>
          <Text color={pal.pink}>q</Text> {t("key.quit")} · <Text color={pal.pink}>p</Text> {t("key.pause")} ·{" "}
          <Text color={pal.pink}>+/-</Text> {t("key.faster")}/{t("key.slower")} · {interval.toFixed(2)}s
        </Text>
      </Box>
    </Box>
  );
}
