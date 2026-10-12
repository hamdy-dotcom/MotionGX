import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiErrorCode } from "./errors";

export const AI_CALLS_PER_HOUR = 30;

export type AiKind =
  | "brand_scrape"
  | "brand_tone"
  | "brand_facts"
  | "script"
  | "rewrite_scene"
  | "request_edit"
  | "director"
  | "motion_code"
  | "vision_qa"
  | "ref_card";

/** Price per million tokens (input, output) — Claude API list prices. */
export const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};

/** Per-run ledger: every logged call in a run (one video generation) lands here too, for cost reports. */
export type UsageEntry = { kind: AiKind; model: string; input_tokens: number; output_tokens: number; at: number };
export type RunContext = {
  videoId?: string;
  usage: UsageEntry[];
  /** print "+$x · total $y" after every call */
  printCost?: boolean;
  /** hard cap for this run: the call that crosses it throws CostCapError (its tokens are already logged) */
  capUsd?: number;
};
export const runContext = new AsyncLocalStorage<RunContext>();
export const withRun = <T>(ctx: RunContext, fn: () => Promise<T>) => runContext.run(ctx, fn);

export type { AiErrorCode };

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function entryCost(u: Pick<UsageEntry, "model" | "input_tokens" | "output_tokens">) {
  const [pi, po] = PRICES[u.model] ?? PRICES[Object.keys(PRICES).find((k) => u.model.startsWith(k)) ?? ""] ?? [0, 0];
  return (u.input_tokens * pi + u.output_tokens * po) / 1_000_000;
}

export function costOf(usage: UsageEntry[]) {
  let usd = 0;
  const byKind: Record<string, { calls: number; input: number; output: number; usd: number }> = {};
  for (const u of usage) {
    const c = entryCost(u);
    usd += c;
    const k = (byKind[`${u.kind}:${u.model}`] ??= { calls: 0, input: 0, output: 0, usd: 0 });
    k.calls++;
    k.input += u.input_tokens;
    k.output += u.output_tokens;
    k.usd += c;
  }
  return { usd, byKind };
}

/** A run went over its cost cap. Not an AiError: nothing should retry or swallow it. */
export class CostCapError extends Error {
  constructor(
    public spentUsd: number,
    public capUsd: number,
  ) {
    super(`AI cost cap reached: $${spentUsd.toFixed(3)} > $${capUsd.toFixed(2)}`);
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

/** `workspaceId` null = a system job (library seeding): logged, but outside every workspace's limit. */
export async function logUsage(
  workspaceId: string | null,
  kind: AiKind,
  model: string,
  usage?: { input_tokens?: number | null; output_tokens?: number | null } | null,
) {
  const run = runContext.getStore();
  const entry: UsageEntry = { kind, model, input_tokens: usage?.input_tokens ?? 0, output_tokens: usage?.output_tokens ?? 0, at: Date.now() };
  run?.usage.push(entry);
  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    kind,
    model,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
  };
  if (run?.videoId) row.video_id = run.videoId;
  const admin = createAdminClient();
  let { error } = await admin.from("ai_usage").insert(row);
  // Before 0004 runs, the new kinds / video_id are rejected: still log the call (it counts toward the
  // hourly limit) under the closest pre-0004 kind; the model column keeps it distinguishable.
  if (error && (error.code === "23514" || error.code === "PGRST204" || error.code === "42703")) {
    const { video_id: _v, ...legacy } = row;
    void _v;
    ({ error } = await admin.from("ai_usage").insert({ ...legacy, kind: "script" }));
  }
  if (error) console.error("[ai] usage log failed", { workspaceId, kind, code: error.code, message: error.message });

  if (run) {
    const total = costOf(run.usage).usd;
    if (run.printCost) console.log(`  [cost] +$${entryCost(entry).toFixed(4)} ${kind} (${model}, ${entry.input_tokens} in / ${entry.output_tokens} out) · run total $${total.toFixed(4)}`);
    if (run.capUsd !== undefined && total > run.capUsd) throw new CostCapError(total, run.capUsd);
  }
}

export function toAiErrorCode(err: unknown): AiErrorCode {
  return err instanceof AiError ? err.code : "ai_failed";
}
