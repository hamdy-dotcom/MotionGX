import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiErrorCode } from "./errors";

export const AI_CALLS_PER_HOUR = 30;

export type AiKind = "brand_scrape" | "brand_tone" | "script" | "rewrite_scene" | "request_edit";

export type { AiErrorCode };

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Throws AiError("rate_limited") once the workspace has made 30 AI/scrape calls in the last hour. */
export async function assertWithinRateLimit(workspaceId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await createAdminClient()
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  if (error) {
    console.error("[ai] rate-limit check failed", { workspaceId, code: error.code, message: error.message });
    throw new AiError("ai_failed", "usage table unavailable");
  }
  if ((count ?? 0) >= AI_CALLS_PER_HOUR) throw new AiError("rate_limited");
}

export async function logUsage(
  workspaceId: string,
  kind: AiKind,
  model: string,
  usage?: { input_tokens?: number | null; output_tokens?: number | null } | null,
) {
  const { error } = await createAdminClient()
    .from("ai_usage")
    .insert({
      workspace_id: workspaceId,
      kind,
      model,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
    });
  if (error) console.error("[ai] usage log failed", { workspaceId, kind, code: error.code, message: error.message });
}

export function toAiErrorCode(err: unknown): AiErrorCode {
  return err instanceof AiError ? err.code : "ai_failed";
}
