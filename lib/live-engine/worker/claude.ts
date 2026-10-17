// Port of video-sandbox/lib/claude.mjs — one place for every model call: picks the model, forces a JSON
// tool answer, and books the cost. Same models, prices, retry and effort handling as the sandbox.
// Only addition: the Ledger forwards every row (onRow) so the app can log it to ai_usage.
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

export const MODELS: Record<string, string> = { haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5", opus: "claude-opus-5-5" };

// USD per million tokens: [input, output, cacheWrite5m, cacheRead]
const PRICES: Record<string, [number, number, number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5, 0.125, 0.01],
  "claude-haiku-5-5:long": [0.5, 2.5, 0.625, 0.05], // Haiku 5.5 requests over 100k prompt tokens
  "claude-sonnet-5-5": [2, 10, 2.5, 0.1],
  "claude-opus-5-5": [4, 20, 5, 0.2],
};

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic());

export type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
export type LedgerRow = { step: string; model: string; in: number; out: number; cacheRead: number; cacheWrite: number; usd: number; ms: number };

export function priceOf(model: string, u: Usage) {
  const prompt = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  const p = PRICES[model === MODELS.haiku && prompt > 100_000 ? model + ":long" : model] || PRICES[MODELS.sonnet];
  return ((u.input_tokens || 0) * p[0] + (u.output_tokens || 0) * p[1] + (u.cache_creation_input_tokens || 0) * p[2] + (u.cache_read_input_tokens || 0) * p[3]) / 1e6;
}

/** Cost ledger for one run; every call appends a line to <runDir>/cost.json. */
export class Ledger {
  rows: LedgerRow[] = [];
  constructor(
    public file: string,
    public log: (line: string) => void = console.log,
    public onRow?: (row: LedgerRow) => unknown,
  ) {}
  add(step: string, model: string, usage: Usage, ms: number) {
    const usd = priceOf(model, usage);
    const row: LedgerRow = { step, model, in: usage.input_tokens || 0, out: usage.output_tokens || 0, cacheRead: usage.cache_read_input_tokens || 0, cacheWrite: usage.cache_creation_input_tokens || 0, usd: +usd.toFixed(5), ms };
    this.rows.push(row);
    fs.writeFileSync(this.file, JSON.stringify({ total: this.total(), byStep: this.byStep(), calls: this.rows }, null, 2));
    this.log(`  $ ${step} · ${model.replace("claude-", "")} · ${usage.input_tokens}+${usage.cache_read_input_tokens || 0}c in / ${usage.output_tokens} out · $${usd.toFixed(4)} (run $${this.total().toFixed(4)})`);
    void Promise.resolve(this.onRow?.(row)).catch(() => {});
  }
  total() {
    return +this.rows.reduce((s, r) => s + r.usd, 0).toFixed(5);
  }
  byStep() {
    const o: Record<string, number> = {};
    for (const r of this.rows) o[r.step] = +((o[r.step] || 0) + r.usd).toFixed(5);
    return o;
  }
}

type Tool = { name: string; description: string; input_schema: Record<string, unknown> };
type Content = string | Anthropic.ContentBlockParam[];

/**
 * One structured call. Returns the tool input object.
 * Haiku: forced tool_choice. Sonnet/Opus 5.5 reject forced tool_choice → tool offered with auto + an instruction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callTool({ ledger, step, model, system, content, tool, maxTokens = 8000, cacheSystem = false, effort }: { ledger: Ledger; step: string; model: string; system: string; content: Content; tool: Tool; maxTokens?: number; cacheSystem?: boolean; effort?: string }): Promise<any> {
  const forced = model === MODELS.haiku;
  const ask = `Respond only by calling the ${tool.name} tool.`;
  const userContent: Anthropic.ContentBlockParam[] = typeof content === "string" ? [{ type: "text", text: forced ? content : `${content}\n\n${ask}` }] : forced ? content : [...content, { type: "text", text: ask }];
  const sys = cacheSystem ? [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }] : system;
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    // streamed so long outputs (full compositions) are allowed
    const res = await anthropic()
      .messages.stream({
        model,
        max_tokens: maxTokens,
        system: sys,
        messages,
        tools: [tool as Anthropic.Tool],
        tool_choice: forced ? { type: "tool", name: tool.name } : { type: "auto" },
        // Sonnet/Opus think before answering; effort caps how much (thinking is billed as output)
        ...(!forced && effort ? { output_config: { effort } } : {}),
      } as Anthropic.MessageStreamParams)
      .finalMessage();
    ledger.add(step, model, res.usage, Date.now() - t0);
    const call = res.content.find((c) => c.type === "tool_use" && c.name === tool.name) as Anthropic.ToolUseBlock | undefined;
    // how the answer ended (stop_reason, output tokens) rides along, non-enumerable so it never leaks into JSON
    if (call) return Object.defineProperty(call.input, "__meta", { value: { stop: res.stop_reason, out: res.usage.output_tokens, ms: Date.now() - t0 }, enumerable: false });
    messages = [...messages, { role: "assistant", content: res.content }, { role: "user", content: [{ type: "text", text: ask }] }];
  }
  throw new Error(`${step}: model never called ${tool.name}`);
}

/** Raw messages call (used by the browser agent loop). */
export async function rawCall({ ledger, step, model, system, messages, tools, maxTokens = 2000, effort }: { ledger: Ledger; step: string; model: string; system: string; messages: Anthropic.MessageParam[]; tools: Tool[]; maxTokens?: number; effort?: string }) {
  const t0 = Date.now();
  const haiku = model === MODELS.haiku;
  // tools + system are identical on every agent step: cache them (reads cost 0.1× input)
  const sys = [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }];
  const res = await anthropic().messages.create({ model, max_tokens: maxTokens, system: sys, messages, tools: tools as Anthropic.Tool[], tool_choice: { type: haiku ? "any" : "auto" }, ...(!haiku && effort ? { output_config: { effort } } : {}) } as Anthropic.MessageCreateParamsNonStreaming);
  ledger.add(step, model, res.usage, Date.now() - t0);
  return res;
}

export const imageBlock = (buf: Buffer, media = "image/jpeg"): Anthropic.ImageBlockParam => ({ type: "image", source: { type: "base64", media_type: media as "image/jpeg", data: buf.toString("base64") } });
