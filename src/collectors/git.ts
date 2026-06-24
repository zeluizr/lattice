/**
 * Active git branches for a fixed, configured set of repos (no sudo).
 *
 * Each configured root is either a repo itself (it has a `.git`) or a folder
 * whose immediate subdirectories are repos. Both shapes are merged and
 * de-duplicated by absolute path, so the report is the SAME no matter which
 * directory lattice was launched from — it does not depend on the cwd.
 *
 * Each repo reports its branch, dirty/ahead/behind state (from a single
 * `git status --porcelain=v2 --branch`) and where its `origin` is hosted —
 * GitHub vs the self-hosted zgit server vs another host — from its remote URL.
 *
 * Cheap to discover (one readdir + a stat per child) but each repo costs a git
 * invocation, so we cap the count, bound concurrency, and skip overlapping
 * reads (returning the previous result while one is still in flight).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import type { GitData, GitHostKind, GitRepo } from "./types.js";

const run = promisify(execFile);
const MAX_REPOS = 24;
const CONCURRENCY = 8;

export class GitCollector {
  private inflight = false;
  private last: GitData;

  constructor(private roots: string[]) {
    this.last = { roots, repos: [], truncated: false };
  }

  async read(): Promise<GitData> {
    if (this.inflight) return this.last;
    this.inflight = true;
    try {
      const dirs = await this.discover();
      const truncated = dirs.length > MAX_REPOS;
      const pick = dirs.slice(0, MAX_REPOS);

      const repos: GitRepo[] = [];
      for (let i = 0; i < pick.length; i += CONCURRENCY) {
        const batch = pick.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map((d) => readRepo(d).catch(() => null)));
        for (const r of results) if (r) repos.push(r);
      }
      repos.sort((a, b) => a.name.localeCompare(b.name));

      this.last = { roots: this.roots, repos, truncated };
      return this.last;
    } catch {
      return this.last;
    } finally {
      this.inflight = false;
    }
  }

  /** Resolve every configured root to a de-duplicated, sorted list of repo dirs. */
  private async discover(): Promise<string[]> {
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (p: string) => {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    };
    for (const root of this.roots) {
      // A configured path can be a repo itself…
      if (existsSync(join(root, ".git"))) {
        add(root);
        continue;
      }
      // …or a folder whose immediate children are repos.
      const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const p = join(root, e.name);
        if (existsSync(join(p, ".git"))) add(p);
      }
    }
    return out.sort();
  }
}

async function readRepo(dir: string): Promise<GitRepo> {
  const [statusRes, urlRes] = await Promise.all([
    run("git", ["-C", dir, "status", "--porcelain=v2", "--branch"], { maxBuffer: 1 << 20 }),
    run("git", ["-C", dir, "remote", "get-url", "origin"], { maxBuffer: 1 << 16 }).catch(() => ({
      stdout: "",
    })),
  ]);

  let branch = "?";
  let ahead = 0;
  let behind = 0;
  let detached = false;
  let dirty = false;
  for (const ln of statusRes.stdout.split("\n")) {
    if (ln.startsWith("# branch.head ")) {
      branch = ln.slice("# branch.head ".length).trim();
      if (branch === "(detached)") detached = true;
    } else if (ln.startsWith("# branch.ab ")) {
      const m = ln.match(/\+(\d+)\s+-(\d+)/);
      if (m) {
        ahead = Number(m[1]);
        behind = Number(m[2]);
      }
    } else if (ln && !ln.startsWith("#")) {
      dirty = true;
    }
  }

  const { host, hostKind } = classifyHost(urlRes.stdout.trim());
  return { name: basename(dir), path: dir, branch, ahead, behind, detached, dirty, host, hostKind };
}

/** Pull the hostname out of an origin URL and bucket it into a known host. */
export function classifyHost(url: string): { host: string; hostKind: GitHostKind } {
  if (!url) return { host: "", hostKind: "none" };
  // https://host/…, ssh://git@host/…  or scp-like  git@host:path
  const scheme = url.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?([^/:]+)/i);
  const scp = url.match(/^[^/@]+@([^:/]+):/);
  const host = (scheme?.[1] || scp?.[1] || "").toLowerCase();
  let hostKind: GitHostKind = "other";
  if (host.endsWith("github.com")) hostKind = "github";
  else if (host.includes("zgit")) hostKind = "zgit";
  return { host, hostKind };
}
