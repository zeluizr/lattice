/**
 * Active git branches for the repos in a folder (no sudo).
 *
 * Scans the immediate subdirectories of `root`, keeps the ones that are git
 * repositories, and reports each repo's current branch plus its state —
 * dirty/clean and ahead/behind its upstream — from a single
 * `git status --porcelain=v2 --branch` per repo.
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
import type { GitData, GitRepo } from "./types.js";

const run = promisify(execFile);
const MAX_REPOS = 24;
const CONCURRENCY = 8;

export class GitCollector {
  private inflight = false;
  private last: GitData;

  constructor(private root: string) {
    this.last = { root, repos: [], truncated: false };
  }

  async read(): Promise<GitData> {
    if (this.inflight) return this.last;
    this.inflight = true;
    try {
      const entries = await readdir(this.root, { withFileTypes: true }).catch(() => []);
      const dirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => join(this.root, e.name))
        .filter((p) => existsSync(join(p, ".git")))
        .sort();

      const truncated = dirs.length > MAX_REPOS;
      const pick = dirs.slice(0, MAX_REPOS);

      const repos: GitRepo[] = [];
      for (let i = 0; i < pick.length; i += CONCURRENCY) {
        const batch = pick.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map((d) => readRepo(d).catch(() => null)));
        for (const r of results) if (r) repos.push(r);
      }
      repos.sort((a, b) => a.name.localeCompare(b.name));

      this.last = { root: this.root, repos, truncated };
      return this.last;
    } catch {
      return this.last;
    } finally {
      this.inflight = false;
    }
  }
}

async function readRepo(dir: string): Promise<GitRepo> {
  const { stdout } = await run("git", ["-C", dir, "status", "--porcelain=v2", "--branch"], {
    maxBuffer: 1 << 20,
  });
  let branch = "?";
  let ahead = 0;
  let behind = 0;
  let detached = false;
  let dirty = false;
  for (const ln of stdout.split("\n")) {
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
  return { name: basename(dir), branch, ahead, behind, detached, dirty };
}
