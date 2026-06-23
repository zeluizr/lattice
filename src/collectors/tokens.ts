/**
 * Claude Code token usage / cost for TODAY, read from local logs.
 *
 * Claude Code writes transcripts to ~/.claude/projects/**\/*.jsonl. Each
 * assistant line carries message.usage (input/output + cache tokens), the model
 * and an ISO timestamp. We sum everything from the local day and compute cost.
 *
 * Pricing (USD per 1M tokens) — source: Anthropic claude-api skill (Jun 2026):
 *   Opus 4.8   in $5  out $25  cache-write $6.25  cache-read $0.50
 *   Sonnet 4.6 in $3  out $15  cache-write $3.75  cache-read $0.30
 *   Haiku 4.5  in $1  out $5   cache-write $1.25  cache-read $0.10
 *
 * Performance: on first read we skip files not modified today; afterwards we
 * tail only the new bytes of each file.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readdir, stat, open } from "node:fs/promises";
import type { TokensData, TokenModel } from "./types.js";

const PRICING: Record<string, { in: number; out: number; cw: number; cr: number }> = {
  opus: { in: 5.0, out: 25.0, cw: 6.25, cr: 0.5 },
  sonnet: { in: 3.0, out: 15.0, cw: 3.75, cr: 0.3 },
  haiku: { in: 1.0, out: 5.0, cw: 1.25, cr: 0.1 },
};

function family(model: string | undefined): keyof typeof PRICING {
  const m = (model || "").toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  return "opus"; // conservative default
}

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function zero(): TokensData {
  return {
    input: 0,
    output: 0,
    cacheW: 0,
    cacheR: 0,
    cost: 0,
    webSearch: 0,
    webFetch: 0,
    messages: 0,
    byModel: {},
  };
}

export class TokenCollector {
  private root: string;
  private offsets = new Map<string, number>();
  private day: string | null = null;
  private totals: TokensData = zero();

  constructor(root?: string) {
    this.root = root ?? join(homedir(), ".claude", "projects");
  }

  async read(): Promise<TokensData> {
    const now = new Date();
    const today = localDateISO(now);
    if (today !== this.day) {
      this.day = today;
      this.offsets.clear();
      this.totals = zero();
    }
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let files: string[] = [];
    try {
      const entries = await readdir(this.root, { recursive: true, withFileTypes: true });
      files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
        .map((e) => join(e.parentPath, e.name));
    } catch {
      return this.totals;
    }

    for (const path of files) {
      let size: number;
      let mtimeMs: number;
      try {
        const st = await stat(path);
        size = st.size;
        mtimeMs = st.mtimeMs;
      } catch {
        continue;
      }

      let off = this.offsets.get(path);
      if (off === undefined) {
        if (mtimeMs < midnight) {
          this.offsets.set(path, size); // nothing from today here
          continue;
        }
        off = 0;
      }
      if (size < off) off = 0; // rotated / truncated
      if (size === off) continue;

      let buf: Buffer;
      try {
        const fh = await open(path, "r");
        try {
          const length = size - off;
          const b = Buffer.alloc(length);
          await fh.read(b, 0, length, off);
          buf = b;
        } finally {
          await fh.close();
        }
      } catch {
        continue;
      }

      let data = buf;
      if (data.length && data[data.length - 1] !== 0x0a) {
        const cut = data.lastIndexOf(0x0a);
        if (cut === -1) continue; // no complete line yet; keep offset
        this.offsets.set(path, off + cut + 1);
        data = data.subarray(0, cut + 1);
      } else {
        this.offsets.set(path, size);
      }

      for (const line of data.toString("utf8").split("\n")) {
        if (line.trim()) this.consume(line, today);
      }
    }

    return this.totals;
  }

  private consume(line: string, today: string): void {
    let o: any;
    try {
      o = JSON.parse(line);
    } catch {
      return;
    }
    const ts = o?.timestamp;
    if (!ts) return;
    let d: string;
    try {
      d = localDateISO(new Date(ts));
    } catch {
      return;
    }
    if (d !== today) return;

    const u = o?.message?.usage;
    if (!u) return;

    const fam = family(o?.message?.model);
    const p = PRICING[fam];
    const i = u.input_tokens || 0;
    const out = u.output_tokens || 0;
    const cw = u.cache_creation_input_tokens || 0;
    const cr = u.cache_read_input_tokens || 0;
    const cost = (i * p.in + out * p.out + cw * p.cw + cr * p.cr) / 1_000_000;

    const t = this.totals;
    t.input += i;
    t.output += out;
    t.cacheW += cw;
    t.cacheR += cr;
    t.cost += cost;
    t.messages += 1;

    const stu = u.server_tool_use || {};
    t.webSearch += stu.web_search_requests || 0;
    t.webFetch += stu.web_fetch_requests || 0;

    const bm: TokenModel = t.byModel[fam] ?? { in: 0, out: 0, cw: 0, cr: 0, cost: 0 };
    bm.in += i;
    bm.out += out;
    bm.cw += cw;
    bm.cr += cr;
    bm.cost += cost;
    t.byModel[fam] = bm;
  }
}
