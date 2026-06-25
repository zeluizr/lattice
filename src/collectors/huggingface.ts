/**
 * Local HuggingFace hub cache — which models are installed, and which are live.
 *
 * The hub cache is the standard layout `<cache>/models--<org>--<name>/` with
 * `refs/main` (the checked-out revision), `snapshots/<rev>/` (symlinks) and
 * `blobs/<sha>` (the real file content). Enumerating models is pure filesystem
 * work — no dependency on the `hf` CLI, so it keeps working under `npx`.
 *
 * Two usage signals are layered on top:
 *   - "active" — a process currently holds one of the model's files open (a
 *     single `lsof` pass; the file's path always contains the model's
 *     `models--org--name` segment because each repo has its own `blobs/`).
 *   - "lastUsed" — the atime of the model's largest blob (the weights), which
 *     reflects the last real read. `statSync` reads metadata only, so polling it
 *     never updates atime; the weights blob is used (never config.json) so our
 *     own one-time config read can't pollute the signal.
 *
 * Fail-soft like every collector: any error returns the previous snapshot.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { HFData, HFModel } from "./types.js";

const run = promisify(execFile);

/** Resolve the hub cache dir: config → HF_HUB_CACHE → HF_HOME/hub → ~/.cache. */
function resolveCachePath(override?: string): string {
  if (override) return override;
  if (process.env.HF_HUB_CACHE) return process.env.HF_HUB_CACHE;
  if (process.env.HF_HOME) return join(process.env.HF_HOME, "hub");
  return join(homedir(), ".cache", "huggingface", "hub");
}

export class HFCollector {
  private inflight = false;
  private last: HFData;
  private readonly cachePath: string;
  // model_type is static per revision and reading config.json bumps its atime,
  // so we read it once and cache it keyed by "<dirName>@<revision>".
  private typeCache = new Map<string, string>();

  constructor(override?: string) {
    this.cachePath = resolveCachePath(override);
    this.last = { available: false, cachePath: this.cachePath, totalBytes: 0, activeCount: 0, models: [] };
  }

  async read(): Promise<HFData> {
    if (this.inflight) return this.last;
    this.inflight = true;
    try {
      if (!existsSync(this.cachePath)) {
        this.last = { available: false, cachePath: this.cachePath, totalBytes: 0, activeCount: 0, models: [] };
        return this.last;
      }

      const dirs = readdirSync(this.cachePath, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("models--"))
        .map((e) => e.name);

      const byDir = new Map<string, HFModel>();
      const models: HFModel[] = [];
      for (const dirName of dirs) {
        const m = this.readModel(dirName);
        if (m) {
          models.push(m.model);
          byDir.set(dirName, m.model);
        }
      }

      // One lsof pass marks the models whose files a process currently holds.
      await this.markActive(byDir);

      const totalBytes = models.reduce((a, m) => a + m.sizeBytes, 0);
      const activeCount = models.filter((m) => m.active).length;
      models.sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || b.lastUsed - a.lastUsed || b.sizeBytes - a.sizeBytes,
      );

      this.last = { available: models.length > 0, cachePath: this.cachePath, totalBytes, activeCount, models };
      return this.last;
    } catch {
      return this.last;
    } finally {
      this.inflight = false;
    }
  }

  /** Size (sum of blobs), weights atime, model_type and revision for one repo. */
  private readModel(dirName: string): { model: HFModel } | null {
    try {
      const id = dirName.replace(/^models--/, "").replace(/--/g, "/");
      const name = id.slice(id.lastIndexOf("/") + 1);
      const base = join(this.cachePath, dirName);

      // Full hash locates the snapshot dir; a short prefix is what we display.
      const revFull = readFileSync(join(base, "refs", "main"), "utf8").trim();
      const revision = revFull.slice(0, 12);

      // One pass over blobs: total size + atime of the largest blob (weights).
      let sizeBytes = 0;
      let biggest = -1;
      let lastUsed = 0;
      const blobsDir = join(base, "blobs");
      if (existsSync(blobsDir)) {
        for (const f of readdirSync(blobsDir)) {
          try {
            const st = statSync(join(blobsDir, f));
            if (!st.isFile()) continue;
            sizeBytes += st.size;
            if (st.size > biggest) {
              biggest = st.size;
              lastUsed = Math.floor(st.atimeMs / 1000);
            }
          } catch {
            // skip unreadable blob
          }
        }
      }

      const modelType = this.readType(dirName, revFull, base);

      return {
        model: { id, name, sizeBytes, modelType, revision, active: false, procName: "", pid: 0, lastUsed },
      };
    } catch {
      return null;
    }
  }

  /** config.json `model_type`, cached per revision (its read would bump atime). */
  private readType(dirName: string, revision: string, base: string): string {
    const key = `${dirName}@${revision}`;
    const hit = this.typeCache.get(key);
    if (hit !== undefined) return hit;
    let modelType = "";
    try {
      const cfg = JSON.parse(readFileSync(join(base, "snapshots", revision, "config.json"), "utf8")) as {
        model_type?: string;
      };
      if (typeof cfg.model_type === "string") modelType = cfg.model_type;
    } catch {
      // no config.json (e.g. some MLX repos) — leave type blank
    }
    this.typeCache.set(key, modelType);
    return modelType;
  }

  /** Single `lsof` pass; tag each model a process is holding files open for. */
  private async markActive(byDir: Map<string, HFModel>): Promise<void> {
    if (byDir.size === 0) return;
    // `lsof -nP` often exits non-zero with warnings about other users' procs
    // while still printing useful stdout — keep the partial output from the error.
    const { stdout } = await run("lsof", ["-nP", "-F", "pcn"], { maxBuffer: 1 << 24 }).catch(
      (e: { stdout?: string }) => ({ stdout: e?.stdout ?? "" }),
    );
    let pid = 0;
    let cmd = "";
    for (const line of stdout.split("\n")) {
      const tag = line[0];
      const val = line.slice(1);
      if (tag === "p") pid = Number(val) || 0;
      else if (tag === "c") cmd = val;
      else if (tag === "n") {
        const seg = val.match(/\/(models--[^/]+)\//);
        if (!seg) continue;
        const model = byDir.get(seg[1]);
        if (model && !model.active) {
          model.active = true;
          model.pid = pid;
          model.procName = cmd;
        }
      }
    }
  }
}
