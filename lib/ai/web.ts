import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { SONNET } from "./claude";
import { logUsage, type AiKind } from "./usage";

/** One web-researched answer: Claude searches (web_search, located in `country`), then calls `tool` once. A long search
 *  pauses the turn and is continued; an answer without the tool call gets one reminder. Refusals fall back server-side.
 *  Logged to ai_usage under `kind`; not counted against the hourly limit (a background job). */
export async function webResearch<T>(o: {
  workspaceId: string;
  kind: AiKind;
  system: string;
  prompt: string;
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
  schema: z.ZodType<T>;
  country?: string;
  maxSearches?: number;
}): Promise<T> {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: o.prompt }];
  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: o.maxSearches ?? 6, ...(o.country ? { user_location: { type: "approximate", country: o.country } } : {}) },
    { ...o.tool, strict: true },
  ] as unknown as Anthropic.Beta.BetaToolUnion[];

  for (let turn = 0; turn < 4; turn++) {
    const started = Date.now();
    const res = await client.beta.messages.create({
      model: SONNET,
      max_tokens: 8000,
      system: o.system,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      tools,
      tool_choice: { type: "auto" },
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    await logUsage(o.workspaceId, o.kind, res.model ?? SONNET, res.usage, Date.now() - started);
    if (res.stop_reason === "refusal") throw new Error("refusal");
    const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === o.tool.name);
    if (call) {
      const parsed = o.schema.safeParse(call.input);
      if (!parsed.success) throw new Error(`invalid ${o.tool.name}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
      return parsed.data;
    }
    messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
    if (res.stop_reason !== "pause_turn") messages.push({ role: "user", content: `Call ${o.tool.name} now with what you found.` });
  }
  throw new Error(`no ${o.tool.name} call`);
}
