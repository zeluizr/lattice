import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { isLang, type Lang } from "./i18n/index.js";
import { isVariant, type ThemeVariant } from "./theme.js";

export interface Config {
  lang?: Lang;
  theme?: ThemeVariant;
  icons?: "nerd" | "emoji" | "none";
}

const DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "lattice");
const FILE = join(DIR, "config.json");

export function configPath(): string {
  return FILE;
}

export function loadConfig(): Config {
  try {
    if (!existsSync(FILE)) return {};
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Config;
    const cfg: Config = {};
    if (raw.lang && isLang(raw.lang)) cfg.lang = raw.lang;
    if (raw.theme && isVariant(raw.theme)) cfg.theme = raw.theme;
    if (raw.icons === "nerd" || raw.icons === "emoji" || raw.icons === "none") cfg.icons = raw.icons;
    return cfg;
  } catch {
    return {};
  }
}

export function saveConfig(cfg: Config): void {
  try {
    mkdirSync(DIR, { recursive: true });
    const current = loadConfig();
    writeFileSync(FILE, JSON.stringify({ ...current, ...cfg }, null, 2) + "\n", "utf8");
  } catch {
    // best effort — config persistence is non-critical
  }
}

/** True when no language has been chosen yet (drives the first-run picker). */
export function needsLanguageSetup(): boolean {
  return !loadConfig().lang;
}
