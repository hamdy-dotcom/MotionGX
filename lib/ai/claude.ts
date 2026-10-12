import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { AiError, assertWithinRateLimit, logUsage, type AiKind } from "./usage";

/** Tone/dialect detection, brand facts and single-scene rewrites. */
export const HAIKU = "claude-haiku-5-5";
/** Script generation and request-edit. */
export const SONNET = "claude-sonnet-5-5";

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

type AnyMessage = Anthropic.Message | Anthropic.Beta.BetaMessage;
type AnyParam = Anthropic.MessageParam | Anthropic.Beta.BetaMessageParam;

/**
 * One structured call to Claude. Validates the tool input with zod (plus an optional semantic check)
 * and retries once with the validation problem fed back as an error tool_result.
 * - Haiku: forced, strict tool call.
 * - Sonnet 5.5: forced tool_choice is rejected, so the tool is offered with `auto` and the prompt
 *   asks for it; refusals fall back server-side (`fallbacks: "default"`).
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
  model = HAIKU,
  strict = true,
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
  model?: typeof HAIKU | typeof SONNET;
  strict?: boolean;
  maxTokens?: number;
  retries?: number;
}): Promise<{ value: T } | { value: null; lastInput: unknown; problem: string }> {
  const anthropic = getClient();
  const sonnet = model === SONNET;
  const messages: AnyParam[] = [{ role: "user", content: sonnet ? `${prompt}\n\nRespond only by calling the ${tool.name} tool.` : prompt }];
  let lastInput: unknown = null;
  let problem = "no tool call";

  for (let attempt = 0; attempt <= retries; attempt++) {
    await assertWithinRateLimit(workspaceId);

    let response: AnyMessage;
    try {
      response = sonnet
        ? await anthropic.beta.messages.create({
            model,
            max_tokens: maxTokens,
            system,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            tools: [{ ...tool, ...(strict ? { strict: true } : {}) }],
            tool_choice: { type: "auto" },
            messages: messages as Anthropic.Beta.BetaMessageParam[],
          })
        : await anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            system,
            tools: [{ ...tool, ...(strict ? { strict: true } : {}) }],
            // Haiku 5.5 accepts a forced tool call (it skips thinking for that turn).
            tool_choice: { type: "tool", name: tool.name },
            messages: messages as Anthropic.MessageParam[],
          });
    } catch (err) {
      await logUsage(workspaceId, kind, model, null);
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        console.error("[ai] Anthropic auth failed", { kind, status: err.status, message: err.message });
        throw new AiError("not_configured", err.message);
      }
      if (err instanceof Anthropic.APIError) {
        console.error("[ai] Anthropic API error", { kind, model, status: err.status, message: err.message });
      } else {
        console.error("[ai] Anthropic request failed", { kind, model, err });
      }
      throw new AiError("ai_failed");
    }

    await logUsage(workspaceId, kind, response.model ?? model, response.usage);

    if (response.stop_reason === "refusal") {
      console.error("[ai] refusal", { kind, model, details: response.stop_details });
      throw new AiError("ai_failed", "refusal");
    }

    const block = (response.content as { type: string }[]).find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use") as
      | Anthropic.ToolUseBlock
      | undefined;
    if (!block) {
      problem = `No ${tool.name} call (stop_reason: ${response.stop_reason})`;
    } else {
      lastInput = block.input;
      const parsed = schema.safeParse(block.input);
      if (!parsed.success) {
        problem = parsed.error.issues
          .slice(0, 12)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
      } else {
        const semantic = check?.(parsed.data) ?? null;
        if (!semantic) return { value: parsed.data };
        problem = semantic;
      }
    }

    console.warn("[ai] invalid output", { kind, model, attempt, problem });
    if (attempt < retries) {
      messages.push({ role: "assistant", content: response.content } as AnyParam);
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
