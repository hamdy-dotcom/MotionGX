"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { assertPostRateLimit, toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { cancelPostJob, startPostGeneration } from "@/lib/live-engine/server/jobs";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import { POST_PLATFORMS } from "@/lib/posts/config";
import type { PostContent } from "@/lib/posts/server/versions";

type Result = { ok: true } | { ok: false; error: "generic" | "insufficient"; aiError?: AiErrorCode };
const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

async function versionRow(postId: string, version: number) {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("post_versions").select("version, content, parent_version").eq("post_id", postId).eq("version", version).maybeSingle();
  return data as { version: number; content: PostContent; parent_version: number | null } | null;
}

async function nextVersion(postId: string) {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("post_versions").select("version").eq("post_id", postId).order("version", { ascending: false }).limit(1).maybeSingle();
  return (data?.version ?? 0) + 1;
}

/** "Request a change": the worker rewrites / redesigns from the shown version */
export async function requestPostChange(postId: string, version: number, request: string): Promise<Result> {
  const text = request.trim().slice(0, 1000);
  if (!isId(postId) || !text) return { ok: false, error: "generic" };
  const { supabase, workspace } = await getAppContext();
  try {
    await assertPostRateLimit(workspace.id);
  } catch (err) {
    return { ok: false, error: "generic", aiError: toAiErrorCode(err) };
  }
  const { error } = await supabase.from("posts").update({ status: "generating", generation: { stage: "queued", mode: "edit", updated_at: new Date().toISOString() } }).eq("id", postId);
  if (error) return { ok: false, error: "generic" };
  after(() => startPostGeneration(postId, { request: text, fromVersion: version }));
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

/** stop a post that is being made (nothing is charged: creating is free) */
export async function cancelPost(postId: string): Promise<Result> {
  if (!isId(postId)) return { ok: false, error: "generic" };
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("posts").select("id").eq("id", postId).maybeSingle(); // RLS: the user's own workspace
  if (!data) return { ok: false, error: "generic" };
  await cancelPostJob(postId);
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

/** a post that failed before its first version: start it again */
export async function retryPost(postId: string): Promise<Result> {
  if (!isId(postId)) return { ok: false, error: "generic" };
  const { supabase, workspace } = await getAppContext();
  try {
    await assertPostRateLimit(workspace.id);
  } catch (err) {
    return { ok: false, error: "generic", aiError: toAiErrorCode(err) };
  }
  await supabase.from("posts").update({ status: "generating", generation: { stage: "queued", mode: "new", updated_at: new Date().toISOString() } }).eq("id", postId);
  after(() => startPostGeneration(postId));
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

/** "Edit text": one platform's text and hashtags, as a new version (no model call) */
export async function savePostText(postId: string, version: number, platform: string, text: string, hashtags: string[]): Promise<Result> {
  if (!isId(postId) || !(POST_PLATFORMS as readonly string[]).includes(platform)) return { ok: false, error: "generic" };
  const row = await versionRow(postId, version);
  if (!row?.content.platforms?.[platform]) return { ok: false, error: "generic" };
  const { supabase } = await getAppContext();
  const clean = hashtags.map((h) => h.replace(/^#+/, "").trim()).filter(Boolean).slice(0, 30);
  const content: PostContent = { ...row.content, platforms: { ...row.content.platforms, [platform]: { ...row.content.platforms[platform], text: text.slice(0, 5000), hashtags: clean } } };
  const { error } = await supabase.from("post_versions").insert({ post_id: postId, version: await nextVersion(postId), content, origin: "edit_text", parent_version: version });
  if (error) return { ok: false, error: "generic" };
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

/** back to the version the shown one was made from (as a new version, so nothing is lost) */
export async function undoPost(postId: string, version: number): Promise<Result> {
  if (!isId(postId)) return { ok: false, error: "generic" };
  const row = await versionRow(postId, version);
  const parent = row?.parent_version ? await versionRow(postId, row.parent_version) : null;
  if (!parent) return { ok: false, error: "generic" };
  const { supabase } = await getAppContext();
  const { error } = await supabase.from("post_versions").insert({ post_id: postId, version: await nextVersion(postId), content: parent.content, origin: "undo", parent_version: parent.version });
  if (error) return { ok: false, error: "generic" };
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

/** Download: the first one charges the wallet once (export_post); returns signed download links for the slides */
export async function downloadPost(postId: string, version: number, canvas: string | null): Promise<{ ok: true; files: { url: string; name: string }[] } | { ok: false; error: "generic" | "insufficient" }> {
  if (!isId(postId)) return { ok: false, error: "generic" };
  const { supabase } = await getAppContext();
  const { error } = await supabase.rpc("export_post", { p_post_id: postId });
  if (error) return { ok: false, error: /insufficient_balance/.test(error.message) ? "insufficient" : "generic" };
  const row = await versionRow(postId, version);
  if (!row) return { ok: false, error: "generic" };
  const want = Object.entries(row.content.renders ?? {}).filter(([c]) => !canvas || c === canvas);
  const files: { url: string; name: string }[] = [];
  for (const [c, paths] of want) {
    for (const [i, p] of paths.entries()) {
      const name = `post-${c.replace(":", "x")}-${i + 1}.${p.split(".").pop() || "png"}`;
      const { data } = await supabase.storage.from(LIVE_BUCKET).createSignedUrl(p, 600, { download: name });
      if (data?.signedUrl) files.push({ url: data.signedUrl, name });
    }
  }
  revalidatePath(`/posts/${postId}`);
  return { ok: true, files };
}
