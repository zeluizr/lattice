import React from "react";
import { dirname } from "node:path";
import { render } from "ink";
import meow from "meow";
import { execa } from "execa";
import { App } from "./app.js";
import { LanguageSelect } from "./components/LanguageSelect.js";
import { loadConfig, saveConfig } from "./config.js";
import { detectLang, isLang, makeT, type Lang } from "./i18n/index.js";
import { isVariant, palette, type ThemeVariant } from "./theme.js";
import { isIconMode, makeIcons, type IconMode } from "./icons.js";

const cli = meow(
  `
  ${"lattice"} — real-time terminal dashboard for macOS Apple Silicon

  Usage
    $ lattice [options]

  Options
    --no-power        skip powermetrics/sudo (CPU/GPU/RAM/disk/net only)
    --no-vtex         hide the VTEX panel (for non-VTEX users)
    --repos           comma-separated folders and/or repos the GIT panel always
                      shows, regardless of where lattice is launched. A path
                      that is itself a repo is shown directly; otherwise its
                      subdirectories are scanned. Saved to config once set.
                      (default: saved list, else the parent of the current dir)
    --zgit            Docker container of the self-hosted zgit server to list
                      (default: zgit; the line is hidden when unavailable)
    --interval, -i    refresh interval in seconds (default 1)
    --procs, -n       number of top processes to show (default 8)
    --icons           icon style: nerd | emoji | none (default nerd)
    --lang            language: en | es | pt-BR (asked on first run)
    --theme           pro | blade | buffy | lincoln | morbius | van-helsing
    --version, -v
    --help

  Examples
    $ lattice
    $ lattice --no-power --icons emoji
    $ lattice --lang es --theme blade
`,
  {
    importMeta: import.meta,
    description: false,
    flags: {
      power: { type: "boolean", default: true },
      vtex: { type: "boolean", default: true },
      repos: { type: "string", default: "" },
      zgit: { type: "string", default: "" },
      interval: { type: "number", shortFlag: "i", default: 1 },
      procs: { type: "number", shortFlag: "n", default: 8 },
      icons: { type: "string", default: "" },
      lang: { type: "string", default: "" },
      theme: { type: "string", default: "" },
    },
  },
);

async function resolveLang(): Promise<Lang> {
  const cfg = loadConfig();
  const flag = cli.flags.lang;
  if (flag && isLang(flag)) {
    saveConfig({ lang: flag });
    return flag;
  }
  if (cfg.lang) return cfg.lang;

  // First run: ask, unless stdin isn't interactive.
  if (!process.stdin.isTTY) {
    const detected = detectLang();
    saveConfig({ lang: detected });
    return detected;
  }
  const variant = resolveTheme();
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

function resolveTheme(): ThemeVariant {
  const flag = cli.flags.theme;
  if (flag && isVariant(flag)) {
    saveConfig({ theme: flag });
    return flag;
  }
  return loadConfig().theme ?? "pro";
}

function resolveIcons(): IconMode {
  const flag = cli.flags.icons;
  if (flag && isIconMode(flag)) {
    saveConfig({ icons: flag });
    return flag;
  }
  return loadConfig().icons ?? "nerd";
}

/** The fixed set of folders/repos the GIT panel scans — independent of cwd. */
function resolveRepoRoots(): string[] {
  const flag = cli.flags.repos.trim();
  if (flag) {
    const roots = flag.split(",").map((s) => s.trim()).filter(Boolean);
    if (roots.length) {
      saveConfig({ repoRoots: roots });
      return roots;
    }
  }
  const saved = loadConfig().repoRoots;
  if (saved && saved.length) return saved;
  // First run / no config: fall back to the parent of the cwd so the tool still
  // works out of the box. Pass --repos once to pin a stable, cwd-independent list.
  return [dirname(process.cwd())];
}

function resolveZgitContainer(): string {
  const flag = cli.flags.zgit.trim();
  if (flag) {
    saveConfig({ zgitContainer: flag });
    return flag;
  }
  return loadConfig().zgitContainer ?? "zgit";
}

async function main(): Promise<void> {
  const lang = await resolveLang();
  const variant = resolveTheme();
  const iconMode = resolveIcons();
  const repoRoots = resolveRepoRoots();
  const zgitContainer = resolveZgitContainer();
  const t = makeT(lang);
  const pal = palette(variant);
  const icon = makeIcons(iconMode);

  let usePower = cli.flags.power;

  // Pre-authenticate sudo BEFORE the TUI takes over the terminal.
  if (usePower) {
    process.stdout.write(t("cli.sudoNeed") + "\n");
    try {
      await execa("sudo", ["-v"], { stdio: "inherit" });
    } catch {
      process.stdout.write(t("cli.sudoFail") + "\n");
      usePower = false;
    }
  }

  const { waitUntilExit } = render(
    <App
      t={t}
      pal={pal}
      icon={icon}
      lang={lang}
      usePower={usePower}
      useVtex={cli.flags.vtex}
      repoRoots={repoRoots}
      zgitContainer={zgitContainer}
      interval={cli.flags.interval}
      topN={cli.flags.procs}
    />,
  );
  await waitUntilExit();
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
