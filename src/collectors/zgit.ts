/**
 * Bare repos living on the self-hosted zgit server (a Docker container).
 *
 * Lists `/repos/*.git` from inside the container with a single
 * `docker exec -u git <container> ls -1 /repos`. This is a local call (no
 * network) and fails soft: if Docker is missing or the container is stopped,
 * it reports `available: false` and the panel simply omits the server line.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ZgitServerData } from "./types.js";

const run = promisify(execFile);

export class ZgitCollector {
  private inflight = false;
  private last: ZgitServerData;

  constructor(private container: string) {
    this.last = { available: false, container, repos: [] };
  }

  async read(): Promise<ZgitServerData> {
    if (!this.container || this.inflight) return this.last;
    this.inflight = true;
    try {
      const { stdout } = await run(
        "docker",
        ["exec", "-u", "git", this.container, "ls", "-1", "/repos"],
        { maxBuffer: 1 << 16, timeout: 4000 },
      );
      const repos = stdout
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.endsWith(".git"))
        .map((s) => s.replace(/\.git$/, ""))
        .sort();
      this.last = { available: true, container: this.container, repos };
    } catch {
      this.last = { available: false, container: this.container, repos: [] };
    } finally {
      this.inflight = false;
    }
    return this.last;
  }
}
