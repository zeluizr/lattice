<div align="center">

# ◇ lattice

**A real-time terminal dashboard for macOS Apple Silicon.**

GPU · power · temps & fans · system metrics · AI token cost — plus a built-in
Claude assistant that sees your live metrics.

[![npm](https://img.shields.io/npm/v/%40zeluizr%2Flattice?color=9580FF)](https://www.npmjs.com/package/@zeluizr/lattice)
[![license](https://img.shields.io/badge/license-MIT-FF80BF)](./LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-80FFEA)](https://nodejs.org)
[![platform](https://img.shields.io/badge/macOS-Apple%20Silicon-8AFF80)](#requirements)

*Watch your machine think.* — [read the manifesto](./MANIFESTO.md)

</div>

---

## Install & run

No install needed — run it straight from npm:

```bash
npx @zeluizr/lattice
```

Or install it globally so you can just type `lattice`:

```bash
npm i -g @zeluizr/lattice
lattice
```

On first run, lattice asks for your language (English · Español · Português) and
remembers it. Watts need `sudo` (see below); everything else works without it.

## Usage

```bash
lattice                      # full dashboard (asks for sudo once, for watts)
lattice --no-power           # skip sudo; CPU/GPU/RAM/disk/net/temps only
lattice --interval 2         # refresh every 2s
lattice --procs 12           # show 12 top processes
lattice --icons emoji        # nerd | emoji | none
lattice --lang es            # en | es | pt-BR (persists)
lattice --theme blade        # pro | blade | buffy | lincoln | morbius | van-helsing
```

| Flag | Default | Description |
|------|---------|-------------|
| `--no-power` | off | Skip `powermetrics`/sudo (no watts) |
| `--interval`, `-i` | `1` | Refresh interval in seconds |
| `--procs`, `-n` | `8` | Number of top processes |
| `--icons` | `nerd` | Icon style: `nerd`, `emoji`, `none` |
| `--lang` | *(asked)* | `en`, `es`, `pt-BR` |
| `--theme` | `pro` | Dracula Pro variant |

### Hotkeys

| Key | Action |
|-----|--------|
| `q` | quit |
| `p` | pause / resume |
| `+` / `-` | faster / slower refresh |
| `i` | focus the chat input (type, `Enter` to send, `Esc` to cancel) |

## What it shows

| Panel | Source | Needs sudo |
|-------|--------|:----------:|
| GPU usage & memory | `ioreg` (IOAccelerator) | — |
| CPU, RAM, swap, disk, network, processes | system APIs | — |
| Temperatures & fans | SMC via IOKit (native helper) | — |
| Power (watts), GPU freq, thermal pressure | `powermetrics` | **yes** |
| AI tokens & cost (today) | Claude Code logs (`~/.claude`) | — |
| VTEX status | VTEX CLI configstore | — |
| Chat | Anthropic API | needs a key |

Temperatures and fans read straight from the SMC, so they work **without sudo**.
Desktops (Mac mini / Studio) simply report no battery.

## The AI difference

The chat isn't a generic chatbot — it receives a live snapshot of every panel
(CPU, GPU, RAM, network, disk, power, temps, token spend, VTEX). Ask
*"why did the GPU spike?"* and Claude answers from your machine's actual numbers,
right now. Runs on **Haiku 4.5**, so each question costs a fraction of a cent.

To enable it, provide an Anthropic credential via the environment or a `.env`
file (in the current directory or `~/.config/lattice/.env`):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

See [`.env.example`](./.env.example). Everything else works without it.

## Languages

lattice ships in **English**, **Español** and **Português (Brasil)**. It asks on
first run, stores your choice in `~/.config/lattice/config.json`, and you can
switch any time with `--lang`.

## Themes

Six Dracula Pro variants — `pro` (default), `blade`, `buffy`, `lincoln`,
`morbius`, `van-helsing`. Switch with `--theme <name>` (persisted). Best in a
truecolor terminal (Warp, iTerm2, Ghostty, kitty). For Nerd Font icons, use a
patched font like MesloLGS NF — or pass `--icons emoji` / `--icons none`.

## Passwordless watts (optional)

To skip the sudo prompt for `powermetrics`:

```bash
sudo bash scripts/setup-sudoers.sh
```

This adds `/etc/sudoers.d/lattice-powermetrics` allowing passwordless
`powermetrics` for your user.

## Requirements

- **macOS on Apple Silicon** (M1/M2/M3/M4…). Intel Macs and other OSes are not
  supported.
- **Node.js ≥ 18.**
- A truecolor terminal; optionally a Nerd Font for icons.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Adding a new
language is just one file in `src/i18n/`.

## License

MIT © Jose Luiz Rodrigues. See [LICENSE](./LICENSE).

> Previously released as **commente.me** (Python / Textual). The Node/TypeScript
> rewrite is tagged from `v0-python` onward — see [CHANGELOG](./CHANGELOG.md).
