/**
 * In-dashboard Claude chat (cheap/fast model: Haiku 4.5).
 *
 * Credentials are read from the environment or a `.env` file (cwd or
 * ~/.config/lattice/.env). Accepts:
 *   - console API key:   ANTHROPIC_API_KEY=sk-ant-api03-...
 *   - OAuth token:       ANTHROPIC_API_KEY=sk-ant-oat01-...  (from `claude setup-token`)
 *                        (ANTHROPIC_AUTH_TOKEN=... also accepted)
 *
 * OAuth tokens (sk-ant-oat prefix) are sent as Authorization: Bearer with the
 * `anthropic-beta: oauth-2025-04-20` header; normal keys go as x-api-key.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function loadEnvCredential(): string | null {
  const direct = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (direct) return direct;

  const files = [join(process.cwd(), ".env"), join(homedir(), ".config", "lattice", ".env")];
  for (const file of files) {
    if (!existsSync(file)) continue;
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const idx = trimmed.indexOf("=");
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed
          .slice(idx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if ((k === "ANTHROPIC_API_KEY" || k === "ANTHROPIC_AUTH_TOKEN") && v) return v;
      }
    } catch {
      // ignore unreadable env file
    }
  }
  return null;
}

export class ChatClient {
  readonly model: string;
  ready = false;
  error: string | null = null;
  private client: Anthropic | null = null;

  constructor(model = "claude-haiku-4-5") {
    this.model = model;
    const cred = loadEnvCredential();
    if (!cred) {
      this.error = "no credential — set ANTHROPIC_API_KEY (env or .env)";
      return;
    }
    try {
      if (cred.startsWith("sk-ant-oat")) {
        this.client = new Anthropic({
          authToken: cred,
          apiKey: null,
          defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
        });
      } else {
        this.client = new Anthropic({ apiKey: cred });
      }
      this.ready = true;
    } catch (e) {
      this.error = `failed to init client: ${e}`;
    }
  }

  /** Ask a question. `system` should already include the live context. */
  async ask(question: string, system: string, history: ChatMessage[]): Promise<string> {
    if (!this.client) throw new Error(this.error ?? "chat not ready");
    const messages = [...history, { role: "user" as const, content: question }];
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      system,
      messages,
    });
    const msg = await stream.finalMessage();
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
}
