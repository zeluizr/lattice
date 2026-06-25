import React from "react";
import { dirname } from "node:path";
import { render } from "ink";
import meow from "meow";
import { App } from "./app.js";
import { LanguageSelect } from "./components/LanguageSelect.js";
import { loadConfig, saveConfig } from "./config.js";
import { detectLang, makeT, type Lang } from "./i18n/index.js";
import { palette, type ThemeVariant } from "./theme.js";
import { makeIcons } from "./icons.js";

// lattice takes no options and needs no sudo: it runs the full dashboard using
// the settings saved in ~/.config/lattice/config.json. Only --help / --version
// are handled here; language is chosen on first run, the rest lives in config.
meow(
  `
  lattice — real-time terminal dashboard for macOS Apple Silicon

  Usage
    $ lattice

  lattice reads its language, theme, icons, repo list and zgit container from
  ~/.config/lattice/config.json (language is chosen on first run).
`,
  { importMeta: import.meta, flags: {} },
);

/** Saved language, or the first-run picker (env-detected when non-interactive). */
async function resolveLang(variant: ThemeVariant): Promise<Lang> {
  const saved = loadConfig().lang;
  if (saved) return saved;

  if (!process.stdin.isTTY) {
    const detected = detectLang();
    saveConfig({ lang: detected });
    return detected;
  }
  const chosen = await new Promise<Lang>((resolve) => {
    const app = render(
      <LanguageSelect
        pal={palette(variant)}
        onSelect={(l) => {
          app.unmount();
          resolve(l);
        }}
      />,
    );
  });
  saveConfig({ lang: chosen });
  return chosen;
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const variant = cfg.theme ?? "pro";
  const lang = await resolveLang(variant);
  const t = makeT(lang);
  const pal = palette(variant);
  const icon = makeIcons(cfg.icons ?? "nerd");
  const repoRoots = cfg.repoRoots?.length ? cfg.repoRoots : [dirname(process.cwd())];
  const zgitContainer = cfg.zgitContainer ?? "zgit";

  const { waitUntilExit } = render(
    <App t={t} pal={pal} icon={icon} repoRoots={repoRoots} zgitContainer={zgitContainer} />,
  );
  await waitUntilExit();
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
