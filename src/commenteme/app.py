"""commente.me — dashboard de sistema e GPU em tempo real (Textual TUI)."""

from __future__ import annotations

from collections import deque

from textual import work
from textual.app import App, ComposeResult
from textual.containers import Horizontal, VerticalScroll
from textual.widgets import DataTable, Footer, Header, Input, RichLog

from .chat import ChatClient
from .collectors.gpu import read_gpu
from .collectors.power import PowerCollector
from .collectors.sensors import SensorsCollector
from .collectors.system import SystemCollector
from .collectors.tokens import TokenCollector
from .collectors.vtex import read_vtex
from .icons import ic
from .theme import DRACULA_PRO, PALETTE
from .widgets import GraphPanel, TextPanel

_BLOCKS = " ▁▂▃▄▅▆▇█"
_P = PALETTE


def fmt_tok(n) -> str:
    n = float(n or 0)
    if n >= 1e6:
        return f"{n / 1e6:.2f}M"
    if n >= 1e3:
        return f"{n / 1e3:.1f}k"
    return f"{n:.0f}"


def human_bytes(n) -> str:
    if n is None:
        return "—"
    n = float(n)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f}{unit}" if unit == "B" else f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def human_rate(bps) -> str:
    return f"{human_bytes(bps)}/s"


def core_cell(pct) -> str:
    idx = int(max(0.0, min(100.0, float(pct or 0.0))) / 100 * (len(_BLOCKS) - 1))
    return _BLOCKS[idx]


def status(value, warn, crit, words) -> str:
    """Sinal ● + palavra, colorido por faixa (verde/amarelo/vermelho).

    Diz num relance se está tranquilo, pedindo atenção ou em alerta —
    sem precisar saber o que o número significa.
    """
    v = float(value or 0)
    if v < warn:
        c, word = _P["green"], words[0]
    elif v < crit:
        c, word = _P["yellow"], words[1]
    else:
        c, word = _P["red"], words[2]
    return f"[{c}]● {word}[/]"


def range_caption(history, fmt) -> str:
    """Legenda do gráfico em linguagem simples: a faixa do último minuto."""
    data = [x for x in history if x is not None]
    if not data:
        return f"[{_P['comment']}]coletando…[/]"
    lo, hi = min(data), max(data)
    body = fmt(lo) if lo == hi else f"{fmt(lo)}–{fmt(hi)}"
    return f"[{_P['comment']}]último min: {body}[/]"


class DashboardApp(App):
    TITLE = "commente.me"
    SUB_TITLE = "monitor de sistema · GPU · energia"
    # Cor fixa em Dracula Pro: sem command palette (^p) para trocar tema/cores.
    ENABLE_COMMAND_PALETTE = False

    CSS = """
    Screen { background: $background; }
    #root { height: 1fr; background: $background; }
    /* alturas fixas por linha → todos os cards da linha têm a mesma altura.
       linha de métricas (com gráfico) = 9; linha de info (só texto) = 6. */
    .row { height: auto; }
    .row.metrics { height: 9; }
    .row.info    { height: 7; }
    .row > * {
        width: 1fr;
        height: 1fr;
        background: $surface;
        color: $foreground;
        border: round $comment;
        border-title-color: $foreground;
        border-title-align: left;
        padding: 0 1;
        margin: 1 1 0 1;
    }
    Sparkline { height: 3; margin-top: 0; }
    .spark-caption { height: 1; color: $comment; }

    #cpu  { border: round $cyan;   border-title-color: $cyan; }
    #gpu  { border: round $purple; border-title-color: $purple; }
    #mem  { border: round $green;  border-title-color: $green; }
    #io   { border: round $cyan;   border-title-color: $cyan; }
    #pwr  { border: round $orange; border-title-color: $orange; }
    #tok  { border: round $pink;   border-title-color: $pink; }
    #vtex { border: round $purple; border-title-color: $purple; }

    #cpu Sparkline > .sparkline--max-color { color: $cyan; }
    #cpu Sparkline > .sparkline--min-color { color: $cyan 30%; }
    #gpu Sparkline > .sparkline--max-color { color: $purple; }
    #gpu Sparkline > .sparkline--min-color { color: $purple 30%; }
    #mem Sparkline > .sparkline--max-color { color: $green; }
    #mem Sparkline > .sparkline--min-color { color: $green 30%; }
    #io  Sparkline > .sparkline--max-color { color: $cyan; }
    #io  Sparkline > .sparkline--min-color { color: $cyan 30%; }
    #pwr Sparkline > .sparkline--max-color { color: $orange; }
    #pwr Sparkline > .sparkline--min-color { color: $orange 30%; }

    #procs {
        height: 9;
        margin: 1 1 0 1;
        background: $surface;
        color: $foreground;
        border: round $comment;
        border-title-color: $comment;
        border-title-align: left;
    }
    #procs > .datatable--header { background: $surface; color: $purple; text-style: bold; }
    #chatlog {
        height: 10;
        margin: 1 1 0 1;
        background: $background;
        border: round $pink;
        border-title-color: $pink;
        border-title-align: left;
    }
    #chatin {
        margin: 1 1 1 1;
        background: $surface;
        border: round $cyan;
        border-title-color: $cyan;
    }
    Header { background: $background; color: $purple; text-style: bold; }
    Footer { background: $surface; color: $foreground; }
    Footer > .footer-key--key { color: $pink; }
    """

    BINDINGS = [
        ("q", "quit", "Sair"),
        ("p", "toggle_pause", "Pausar"),
        ("plus", "faster", "Mais rápido"),
        ("minus", "slower", "Mais lento"),
    ]

    def __init__(self, interval: float = 1.0, top_n: int = 8, use_power: bool = True):
        super().__init__()
        self.register_theme(DRACULA_PRO)
        self.theme = "dracula-pro"
        self.interval = interval
        self.top_n = top_n
        self.use_power = use_power
        self.paused = False
        self.timer = None

        self.sys = SystemCollector(top_n=top_n)
        self.power = PowerCollector() if use_power else None
        self.sensors = SensorsCollector()
        self.tokens = TokenCollector()
        self.chat = ChatClient()
        self.chat_history: list[dict] = []
        self.snapshot: dict[str, str] = {}

        self.h_cpu: deque[float] = deque(maxlen=60)
        self.h_gpu: deque[float] = deque(maxlen=60)
        self.h_mem: deque[float] = deque(maxlen=60)
        self.h_net: deque[float] = deque(maxlen=60)
        self.h_temp: deque[float] = deque(maxlen=60)

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with VerticalScroll(id="root"):
            with Horizontal(classes="row metrics"):
                self.p_cpu = GraphPanel(f"{ic('cpu')} CPU", id="cpu")
                self.p_mem = GraphPanel(f"{ic('mem')} MEMÓRIA", id="mem")
                yield self.p_cpu
                yield self.p_mem
            with Horizontal(classes="row metrics"):
                self.p_pwr = GraphPanel(f"{ic('temp')} TEMPERATURA", id="pwr")
                self.p_io = GraphPanel(f"{ic('net')} REDE · DISCO", id="io")
                self.p_gpu = GraphPanel(f"{ic('gpu')} GPU", id="gpu")
                yield self.p_pwr
                yield self.p_io
                yield self.p_gpu
            with Horizontal(classes="row info"):
                self.p_tok = TextPanel(f"{ic('tokens')} IA · TOKENS HOJE", id="tok")
                self.p_vtex = TextPanel(f"{ic('vtex')} VTEX", id="vtex")
                yield self.p_tok
                yield self.p_vtex
            self.proc_table = DataTable(id="procs", zebra_stripes=True)
            self.proc_table.border_title = f"{ic('proc')} PROCESSOS"
            yield self.proc_table
            self.chatlog = RichLog(id="chatlog", wrap=True, markup=True, highlight=False)
            self.chatlog.border_title = f"{ic('chat')} CHAT · CLAUDE"
            yield self.chatlog
            self.chatin = Input(
                placeholder="Pergunte algo ao Claude e tecle Enter…", id="chatin"
            )
            self.chatin.border_title = f"{ic('chat')} pergunta"
            yield self.chatin
        yield Footer()

    def on_mount(self) -> None:
        self.proc_table.cursor_type = "none"
        self.proc_table.add_columns("CPU%", "MEM", "PID", "Processo")
        if self.power:
            self.power.start()
        self.timer = self.set_interval(self.interval, self.refresh_data)
        self.aux_timer = self.set_interval(3.0, self.refresh_aux)  # tokens/VTEX: ritmo mais lento
        self.refresh_data()
        self.refresh_aux()

        if self.chat.ready:
            self.chatlog.write(f"[dim]chat pronto · modelo {self.chat.model} · tecle Enter[/dim]")
        else:
            self.chatlog.write(f"[yellow]chat off:[/yellow] {self.chat.error}")

    def on_unmount(self) -> None:
        if self.power:
            self.power.stop()

    # ------------------------------------------------------------------ loop
    def refresh_data(self) -> None:
        if self.paused:
            return

        s = self.sys.read()
        g = read_gpu()
        p = self.power.read() if self.power else None

        # ---- CPU  (uso total + carga por núcleo)
        cpu = s["cpu_total"]
        self.h_cpu.append(cpu)
        cores = "".join(core_cell(c) for c in s["cpu_per"])
        self.p_cpu.update(
            f"Uso: [b]{cpu:.0f}%[/b]   {status(cpu, 60, 85, ('tranquilo', 'ocupado', 'sobrecarga'))}\n"
            f"Núcleos: {len(s['cpu_per'])}   por núcleo: {cores}",
            self.h_cpu,
            range_caption(self.h_cpu, lambda v: f"{v:.0f}%"),
        )

        # ---- MEMÓRIA  (RAM em uso + swap)
        vm, sm = s["mem"], s["swap"]
        self.h_mem.append(vm.percent)
        self.p_mem.update(
            f"RAM: [b]{vm.percent:.0f}%[/b]   {status(vm.percent, 75, 90, ('ok', 'atento', 'cheia'))}\n"
            f"{human_bytes(vm.used)} de {human_bytes(vm.total)} usados · swap {sm.percent:.0f}%",
            self.h_mem,
            range_caption(self.h_mem, lambda v: f"{v:.0f}%"),
        )

        # ---- REDE / DISCO  (tráfego de rede + quanto o disco está cheio)
        net_total_mb = (s["net_recv_bps"] + s["net_sent_bps"]) / 1024 / 1024
        self.h_net.append(net_total_mb)
        vol = s["disk_usage"].percent
        self.p_io.update(
            f"{ic('net')} ↓ {human_rate(s['net_recv_bps'])}  ↑ {human_rate(s['net_sent_bps'])}\n"
            f"{ic('disk')} Disco {vol:.0f}% cheio  {status(vol, 80, 92, ('ok', 'enchendo', 'cheio'))}",
            self.h_net,
            range_caption(self.h_net, lambda v: human_rate(v * 1024 * 1024)),
        )

        # ---- GPU  (uso + memória)
        util = g["util_pct"] or 0
        self.h_gpu.append(util)
        self.p_gpu.update(
            f"Uso: [b]{util}%[/b]   {status(util, 60, 85, ('tranquila', 'ativa', 'alta'))}\n"
            f"mem {human_bytes(g['mem_used_bytes'])}/{human_bytes(g['mem_alloc_bytes'])}",
            self.h_gpu,
            range_caption(self.h_gpu, lambda v: f"{v:.0f}%"),
        )

        # ---- TEMPERATURA  (temp/ventoinha via SMC sem sudo; watts via powermetrics)
        st = self.sensors.read()
        ct = st.get("cpu_temp")
        gt = st.get("gpu_temp")
        temp_words = ("normal", "morna", "quente")
        if ct is not None and gt is not None:
            line1 = f"{ct:.0f}° / {gt:.0f}°   {status(max(ct, gt), 65, 80, temp_words)}"
        elif ct is not None or gt is not None:
            tv = ct if ct is not None else gt
            line1 = f"{tv:.0f}°C   {status(tv, 65, 80, temp_words)}"
        else:
            line1 = "sensores indisponíveis"

        parts = []
        if p and (p.get("cpu_w") is not None or p.get("gpu_w") is not None):
            parts.append(f"{ic('power')} {(p.get('cpu_w') or 0):.1f}+{(p.get('gpu_w') or 0):.1f}W")
        elif self.use_power:
            parts.append(f"{ic('power')} aguardando sudo")
        if st.get("fans"):
            parts.append(f"{ic('fan')} {st['fans'][0]['rpm']:.0f} rpm")
        line2 = " · ".join(parts) if parts else "energia: requer sudo"

        temp_val = ct if ct is not None else gt
        if temp_val is not None:
            self.h_temp.append(temp_val)
        self.p_pwr.update(
            f"{line1}\n{line2}",
            self.h_temp,
            range_caption(self.h_temp, lambda v: f"{v:.0f}°"),
        )

        if ct is not None:
            self.snapshot["Temperatura"] = (
                f"CPU {ct:.0f}°C, GPU {(gt or 0):.0f}°C"
                + (f", ventoinha {st['fans'][0]['rpm']:.0f}rpm" if st.get("fans") else "")
            )

        # ---- PROCESSOS
        self.proc_table.clear()
        for cpu, pid, name, rss in s["procs"]:
            self.proc_table.add_row(f"{cpu:.0f}", human_bytes(rss), str(pid), name[:30])

        # ---- snapshot p/ o chat
        self.snapshot["CPU"] = f"{s['cpu_total']:.0f}% ({len(s['cpu_per'])} cores)"
        self.snapshot["GPU"] = (
            f"{util}% util, mem {human_bytes(g['mem_used_bytes'])}/{human_bytes(g['mem_alloc_bytes'])}"
        )
        self.snapshot["RAM"] = f"{vm.percent:.0f}% ({human_bytes(vm.used)}/{human_bytes(vm.total)})"
        self.snapshot["Rede"] = f"baixa {human_rate(s['net_recv_bps'])}, sobe {human_rate(s['net_sent_bps'])}"
        self.snapshot["Disco"] = (
            f"R {human_rate(s['disk_read_bps'])} W {human_rate(s['disk_write_bps'])}, "
            f"volume {s['disk_usage'].percent:.0f}% cheio"
        )
        if p and p.get("cpu_w") is not None:
            self.snapshot["Energia"] = f"CPU {p.get('cpu_w'):.1f}W, GPU {p.get('gpu_w') or 0:.1f}W"
        if s["procs"]:
            self.snapshot["Top processo CPU"] = f"{s['procs'][0][2]} ({s['procs'][0][0]:.0f}%)"

    def refresh_aux(self) -> None:
        if self.paused:
            return

        # ---- IA / tokens (Claude Code, hoje)
        t = self.tokens.read()
        total = t["input"] + t["output"] + t["cache_w"] + t["cache_r"]
        items = sorted(t["by_model"].items(), key=lambda kv: -kv[1]["cost"])
        parts = [f"{k.replace('claude-', '')} ${v['cost']:.2f}" for k, v in items[:2]]
        extra = f" +{len(items) - 2}" if len(items) > 2 else ""
        models = (" · ".join(parts) + extra) if parts else "—"
        web = ""
        if t["web_search"] or t["web_fetch"]:
            web = f" · web {t['web_search']}/{t['web_fetch']}"

        def clamp(s: str, width: int = 40) -> str:  # evita quebra de linha no card
            return s if len(s) <= width else s[: width - 1] + "…"

        self.p_tok.update(
            f"Gasto hoje: [b]${t['cost']:.2f}[/b]  ·  {t['messages']} mensagens\n"
            + clamp(f"Tokens: {fmt_tok(total)} · entrada {fmt_tok(t['input'])} · saída {fmt_tok(t['output'])}") + "\n"
            + clamp(f"Cache: grava {fmt_tok(t['cache_w'])} · lê {fmt_tok(t['cache_r'])}") + "\n"
            + clamp(f"Por modelo: {models}{web}")
        )

        # ---- VTEX
        v = read_vtex()
        if not v["installed"]:
            self.p_vtex.update(
                f"Status: [{_P['red']}]CLI não instalada[/]\n"
                "Instale com: brew install vtex/cli/vtex"
            )
        elif v["logged_in"]:
            self.p_vtex.update(
                f"Status: [{_P['green']}]conectado ✓[/]\n"
                f"Conta: [b]{v['account']}[/b]\n"
                f"Usuário: {v['login'] or '—'}\n"
                f"Workspace: {v['workspace'] or 'master'}"
            )
        else:
            self.p_vtex.update(
                f"Status: [{_P['yellow']}]não conectado[/]\n"
                "Entre com: vtex login <conta>"
            )

        self.snapshot["Tokens IA hoje"] = f"US$ {t['cost']:.2f}, {t['messages']} mensagens"
        self.snapshot["VTEX"] = (
            f"{v['account']}/{v['workspace'] or 'master'}" if v["logged_in"]
            else "CLI instalada, não logado" if v["installed"]
            else "CLI não instalada"
        )

    # ------------------------------------------------------------------ chat
    def _snapshot_text(self) -> str:
        return "\n".join(f"- {k}: {v}" for k, v in self.snapshot.items()) or "(sem dados ainda)"

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input is not self.chatin:
            return
        question = event.value.strip()
        self.chatin.value = ""
        if not question:
            return
        self.chatlog.write(f"[b cyan]você[/] › {question}")
        if not self.chat.ready:
            self.chatlog.write(f"[red]{self.chat.error}[/red]")
            return
        self.chatlog.write("[dim]…[/dim]")
        self._ask(question)

    @work(thread=True, exclusive=True, group="chat")
    def _ask(self, question: str) -> None:
        ctx = self._snapshot_text()
        try:
            answer = self.chat.ask(question, ctx, self.chat_history)
        except Exception as e:  # noqa: BLE001
            self.call_from_thread(self.chatlog.write, f"[red]erro: {e}[/red]")
            return
        self.chat_history.append({"role": "user", "content": question})
        self.chat_history.append({"role": "assistant", "content": answer})
        self.chat_history[:] = self.chat_history[-8:]  # mantém só os últimos turnos
        self.call_from_thread(self.chatlog.write, f"[b green]claude[/] › {answer}")

    # ------------------------------------------------------------------ ações
    def action_toggle_pause(self) -> None:
        self.paused = not self.paused
        self.sub_title = "PAUSADO" if self.paused else self.SUB_TITLE

    def action_faster(self) -> None:
        self.interval = max(0.25, self.interval / 2)
        self._reset_timer()

    def action_slower(self) -> None:
        self.interval = min(10.0, self.interval * 2)
        self._reset_timer()

    def _reset_timer(self) -> None:
        if self.timer:
            self.timer.stop()
        self.timer = self.set_interval(self.interval, self.refresh_data)
