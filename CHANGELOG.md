# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-06-22

First open-source release as **lattice** — a full rewrite of the project
previously known as `commente.me`.

### Added
- **Node.js / TypeScript + Ink rewrite.** The dashboard is now a proper CLI,
  distributed on npm and runnable with `npx @zeluizr/lattice` or
  `npm i -g @zeluizr/lattice` (command: `lattice`).
- **Internationalization** — English, Español and Português (Brasil). Chosen on
  first run, persisted in `~/.config/lattice/config.json`, switchable with
  `--lang`.
- **Native SMC helper** (`lattice-smc`, IOKit in C, shipped prebuilt) for CPU/GPU
  temperatures and fan speeds without sudo, with graceful fallback.
- **Six Dracula Pro themes** selectable with `--theme`.
- Live panels: CPU, memory/swap, GPU, temperature/fans, network/disk, AI token
  cost (today), VTEX status, top processes, and an embedded Claude chat that
  reads the live metric snapshot.
- Flags: `--no-power`, `--interval`, `--procs`, `--icons`, `--lang`, `--theme`.
- Hotkeys: `q` quit, `p` pause, `+`/`-` refresh speed, `i` chat.

### Changed
- Documentation and UI are now in English (plus es / pt-BR at runtime); the
  project was previously Portuguese-only.
- Power collection uses a streaming `powermetrics` subprocess parsed in Node.

### Migration
- The previous Python/Textual implementation is preserved in git under the
  `v0-python` tag.
