import "server-only";
// A finished post job → a post_versions row (its content with storage paths) and the post's status.
import { createAdminClient } from "@/lib/supabase/admin";

export type PostContent = {
  angle: string;
  alt_text: string;
  type: "single" | "carousel" | "text";
  platforms: Record<string, { text: string; hashtags: string[]; canvas: string | null }>;
  slides: { headline: string; sub?: string; points?: string[]; cta?: string; visual: { kind: string } }[];
  /** canvas ("4:5" | "9:16" | "16:9") → storage paths in the live-engine bucket, one per slide */
  renders: Record<string, string[]>;
  check?: Record<string, string[][]>;
  /** where the job's files live: live-engine/{ws}/posts/{post}/{job}/ */
  folder?: string;
};

const now = () => new Date().toISOString();

export async function setPostGeneration(postId: string, patch: Record<string, unknown>, status?: "generating" | "ready" | "failed") {
  const update: Record<string, unknown> = { generation: { ...patch, updated_at: now() } };
  if (status) update.status = status;
  const { error } = await createAdminClient().from("posts").update(update).eq("id", postId);
  if (error) console.error("[posts] progress update failed", { postId, message: error.message });
}

export async function insertPostVersion(job: { id: string; workspace_id: string; post_id: string | null; cost_usd: number; input: { request?: string; prevVersion?: number | null } }, summary: Record<string, unknown>) {
  const db = createAdminClient();
  const postId = job.post_id!;
  const folder = `${job.workspace_id}/posts/${postId}/${job.id}`;
  const raw = (summary.post ?? {}) as PostContent;
  const content: PostContent = { ...raw, folder, renders: Object.fromEntries(Object.entries(raw.renders ?? {}).map(([c, list]) => [c, list.map((f) => `${folder}/${f}`)])) };
  const { data: last } = await db.from("post_versions").select("version").eq("post_id", postId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await db.from("post_versions").insert({ post_id: postId, version, content, origin: job.input.request ? "change" : "generate", parent_version: job.input.prevVersion ?? null, request: job.input.request ?? null, job_id: job.id, cost_usd: Number(job.cost_usd) || 0 });
  if (error) throw new Error(`post_versions insert: ${error.message}`);
  return version;
}

/** merge into a post's generation (progress reports add to it; they never replace what earlier steps found) */
export async function mergePostGeneration(postId: string, patch: Record<string, unknown>, fn?: (g: Record<string, unknown>) => Record<string, unknown>) {
  const db = createAdminClient();
  const { data } = await db.from("posts").select("generation").eq("id", postId).maybeSingle();
  const g = ((data?.generation as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const next = { ...g, ...patch, ...(fn ? fn(g) : {}), updated_at: now() };
  const { error } = await db.from("posts").update({ generation: next }).eq("id", postId);
  if (error) console.error("[posts] progress merge failed", { postId, message: error.message });
}
