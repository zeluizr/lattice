/**
 * VTEX CLI session status, read from its configstore file. No sudo, no network.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { execa } from "execa";
import type { VtexData } from "./types.js";

const CONFIG = join(homedir(), ".config", "configstore", "vtex.json");

async function whichVtex(): Promise<string | null> {
  try {
    const { stdout } = await execa("which", ["vtex"], { timeout: 1500 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function readVtex(): Promise<VtexData> {
  const path = await whichVtex();
  const installed = path !== null;

  let account: string | null = null;
  let login: string | null = null;
  let workspace: string | null = null;
  let token: string | null = null;

  try {
    const raw = JSON.parse(await readFile(CONFIG, "utf8"));
    account = raw.account ?? null;
    login = raw.login ?? null;
    workspace = raw.workspace ?? null;
    token = raw.token ?? null;
  } catch {
    // file missing/unreadable → treated as logged out
  }

  const loggedIn = Boolean(account && (token || login));
  return { installed, path, account, login, workspace, loggedIn };
}
