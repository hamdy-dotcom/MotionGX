import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { AiError, assertWithinRateLimit, logUsage, type AiKind } from "./usage";

export const HAIKU = "claude-haiku-5-5";

let client: Anthropic | null = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError("not_configured", "ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic();
  return client;
}

type ToolSpec = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
};

/**
 * One structured call to Claude Haiku: forces a single strict tool call, validates the input with zod
 * (plus an optional semantic check), and retries once with the validation problem fed back.
 * Every attempt counts toward the workspace's hourly AI limit and is logged to ai_usage.
 */
export async function callTool<T>({
  workspaceId,
  kind,
  system,
  prompt,
  tool,
  schema,
  check,
  maxTokens = 8000,
  retries = 1,
}: {
  workspaceId: string;
  kind: AiKind;
  system: string;
  prompt: string;
  tool: ToolSpec;
  schema: z.ZodType<T>;
  check?: (value: T) => string | null;
  maxTokens?: number;
  retries?: number;
}): Promise<{ value: T } | { value: null; lastInput: unknown; problem: string }> {
  const anthropic = getClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let lastInput: unknown = null;
  let problem = "no tool call";

  for (let attempt = 0; attempt <= retries; attempt++) {
    await assertWithinRateLimit(workspaceId);

    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: HAIKU,
        max_tokens: maxTokens,
        system,
        tools: [{ ...tool, strict: true }],
        // Haiku 5.5 accepts a forced tool call (it skips thinking for that turn).
        tool_choice: { type: "tool", name: tool.name },
        messages,
      });
    } catch (err) {
      await logUsage(workspaceId, kind, HAIKU, null);
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        console.error("[ai] Anthropic auth failed", { kind, status: err.status, message: err.message });
        throw new AiError("not_configured", err.message);
      }
      if (err instanceof Anthropic.APIError) {
        console.error("[ai] Anthropic API error", { kind, status: err.status, message: err.message });
      } else {
        console.error("[ai] Anthropic request failed", { kind, err });
      }
      throw new AiError("ai_failed");
    }

    await logUsage(workspaceId, kind, HAIKU, response.usage);

    if (response.stop_reason === "refusal") {
      console.error("[ai] refusal", { kind, details: response.stop_details });
      throw new AiError("ai_failed", "refusal");
    }

    const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!block) {
      problem = `No ${tool.name} call (stop_reason: ${response.stop_reason})`;
    } else {
      lastInput = block.input;
      const parsed = schema.safeParse(block.input);
      if (!parsed.success) {
        problem = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
      } else {
        const semantic = check?.(parsed.data) ?? null;
        if (!semantic) return { value: parsed.data };
        problem = semantic;
      }
    }

    console.warn("[ai] invalid output", { kind, attempt, problem });
    if (attempt < retries) {
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: block
          ? [{ type: "tool_result", tool_use_id: block.id, is_error: true, content: `Invalid: ${problem}. Call ${tool.name} again with every problem fixed.` }]
          : `You must call ${tool.name}. ${problem}`,
      });
    }
  }

  return { value: null, lastInput, problem };
}
