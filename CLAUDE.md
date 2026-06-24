# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this is

**lattice** — a real-time terminal dashboard (TUI) for **macOS Apple Silicon**,
written in **TypeScript + Ink (React for the terminal)**. It shows GPU, power,
temperatures/fans, system metrics, per-disk I/O & usage (including `/Volumes`),
network, AI token cost, the git branch/state of each repo in a folder, and
(optionally) VTEX status. It is a focused, local-only monitor — no embedded
chat, no network calls. Published on npm as `@zeluizr/lattice`; the installed
command is `lattice`.

(Formerly the Python/Textual project `commente.me`; that version is tagged
`v0-python`.)

## Commands

```bash
npm install
npm run build:native   # clang -> prebuilds/darwin-arm64/lattice-smc (needs Xcode CLT)
npm run build          # tsc -> dist/  then  scripts/postbuild.mjs (shebang + chmod)
node dist/cli.js       # run; or `npm run dev` (build + run)
npx tsc --noEmit       # typecheck only
```

There is no test runner yet. Verify changes by running the app, or render a
single deterministic frame with `ink-testing-library` (see how the UI was
validated). Running the full TUI needs a TTY (raw mode); under tooling, wrap it
in a pty (`script`) or use `ink-testing-library`.

## Architecture

- **Entry** `src/cli.tsx` — parses flags (`meow`), resolves language/theme/icons
  (flag → config → first-run picker / detect), pre-authenticates `sudo -v` when
  power is on, then renders `<App>`.
- **UI** `src/app.tsx` — the whole dashboard: state, two refresh loops (main at
  `--interval`, aux at 3 s for tokens/VTEX), and keybindings via `useInput`.
  Panels are explicit-width (computed from terminal columns) so rows align;
  do **not** reintroduce `flexBasis={0}` on bordered boxes (it overrides width).
  The VTEX panel is optional (`--no-vtex`); TOKENS spans full width when it's off.
  The GIT panel scans `--repos <dir>` (default: parent of cwd) and self-hides
  when the folder has no repos.
- **Collectors** `src/collectors/*` — each returns a typed snapshot and must fail
  soft (return nulls, never throw into the render):
  - `system.ts` (systeminformation), `disks.ts` (per-mount usage via
    `si.fsSize` + per-disk R/W from `ioreg` IOBlockStorageDriver byte counters,
    diffed between samples), `gpu.ts` (`ioreg`), `tokens.ts`
    (`~/.claude/projects/**/*.jsonl`, offset-tailed), `vtex.ts` (configstore),
    `git.ts` (scans a folder's subdirs for repos; one
    `git status --porcelain=v2 --branch` each — branch + dirty + ahead/behind),
    `sensors.ts` (native helper + battery), `power.ts` (streaming
    `sudo powermetrics -f plist`).
- **Native** `native/smc.c` — IOKit SMC reader for temps/fans (no sudo). Built to
  `prebuilds/<platform>-<arch>/lattice-smc` and shipped prebuilt so `npx` works
  without a compiler. `sensors.ts` locates and shells out to it.
- **i18n** `src/i18n/` — `en.ts` is the source of truth (its keys define the
  `Translation` type); `es.ts` / `pt-BR.ts` must implement every key.
- **Theme/icons** `src/theme.ts`, `src/icons.ts` — Dracula Pro palette (6
  variants) and nerd/emoji/none icon sets.

## Conventions & gotchas

- **ESM + NodeNext.** Relative imports must use the `.js` extension
  (`./theme.js`), even from `.ts`/`.tsx` files.
- **Apple Silicon only.** `package.json` declares `os: ["darwin"]`,
  `cpu: ["arm64"]`. Collectors assume macOS tools (`ioreg`, `powermetrics`, SMC).
- **dist/ and prebuilds/ are gitignored** and regenerated; `prepublishOnly`
  builds both before publishing. They are listed in `files` so they ship.
- **Publishing** is a scoped package: `npm publish` from a logged-in account.
  Use `--access public` to publish it publicly, or omit it (scoped packages
  default to restricted) to keep it private on a paid npm plan.
