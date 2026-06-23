# Contributing to lattice

Thanks for your interest! lattice is a small, focused tool — contributions that
keep it fast, local-first and Apple-Silicon-native are very welcome.

## Development setup

Requires macOS on Apple Silicon, Node.js ≥ 18, and the Xcode Command Line Tools
(`xcode-select --install`) to build the native SMC helper.

```bash
git clone https://github.com/zeluizr/lattice.git
cd lattice
npm install
npm run build:native     # compiles native/smc.c -> prebuilds/darwin-arm64/lattice-smc
npm run build            # tsc -> dist/ (+ shebang on dist/cli.js)
node dist/cli.js         # run it
# or: npm run dev
```

## Project layout

```
src/
  cli.tsx              entry: args, first-run language, sudo pre-auth, render
  app.tsx              Ink dashboard: layout, refresh loops, keybindings, chat
  theme.ts  icons.ts   Dracula Pro palette / icon sets
  format.ts            humanBytes, sparkline, status, etc.
  config.ts            ~/.config/lattice/config.json
  i18n/                en (base) + es + pt-BR + loader
  components/          Panel, LanguageSelect
  collectors/          system, gpu, sensors, power, tokens, vtex
  chat.ts              Anthropic client + live-context injection
native/smc.c           IOKit SMC reader (temps/fans), shipped prebuilt
```

## Adding a language

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts` and translate every value.
   The `Translation` type makes sure you don't miss a key.
2. Register it in `src/i18n/index.ts` (`TABLES`, `LANGS`, `isLang`,
   `detectLang`).
3. `npm run build` and try it: `node dist/cli.js --lang <code>`.

## Guidelines

- Keep collectors side-effect-free and resilient — a failing data source should
  degrade gracefully, never crash the app.
- No telemetry, no network calls except the optional chat.
- Match the existing style; run `npm run build` (typecheck) before opening a PR.

## Commit & PR

Small, focused PRs are easiest to review. Describe what you changed and how you
verified it (ideally on which Mac / chip).
