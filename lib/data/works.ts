import "server-only";
import type { AppContext } from "@/lib/context";
import { LIVE_BUCKET } from "@/lib/live-engine/protocol";
import type { PostContent } from "@/lib/posts/server/versions";
import { dayKey } from "@/lib/dates";

/** One piece of a brand's work — a video or a post — as the studio shows it (wall, library, calendar). */
export type Work = {
  id: string;
  kind: "video" | "post";
  /** post: single | carousel | text; video: the format (9:16 …) */
  type: string;
  title: string;
  status: string;
  platforms: string[];
  /** the day it belongs to: its scheduled day, else the day it was made */
  day: string;
  scheduled: boolean;
  createdAt: string;
  thumb: string | null;
  href: string;
};

type VideoRow = { id: string; title: string; status: string; format: string; created_at: string; scheduled_on?: string | null; video_versions: { version: number; mp4_path: string | null }[] };
type PostRow = { id: string; title: string; type: string; platforms: string[]; status: string; created_at: string; scheduled_on?: string | null; placement?: string | null; post_versions: { version: number; content: PostContent }[] };

/** select with scheduled_on, and without it when the 0013 migration is not applied yet */
async function rows<T>(run: (cols: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>, cols: string): Promise<T[]> {
  let r = await run(`${cols}, scheduled_on`);
  if (r.error?.code === "42703") r = await run(cols);
  if (r.error) throw r.error;
  return (r.data ?? []) as T[];
}

export async function listWorks(ctx: AppContext, companyId: string, { limit = 60, from, to }: { limit?: number; from?: string; to?: string } = {}): Promise<Work[]> {
  const { supabase, workspace } = ctx;
  const [videos, posts] = await Promise.all([
    rows<VideoRow>((cols) => supabase.from("videos").select(cols).eq("workspace_id", workspace.id).eq("company_id", companyId).order("created_at", { ascending: false }).limit(limit), "id, title, status, format, created_at, video_versions(version, mp4_path)"),
    rows<PostRow>((cols) => supabase.from("posts").select(cols).eq("workspace_id", workspace.id).eq("company_id", companyId).order("created_at", { ascending: false }).limit(limit), "id, title, type, platforms, status, created_at, placement, post_versions(version, content)"),
  ]);
  const newest = <V extends { version: number }>(v: V[]) => [...(v ?? [])].sort((a, b) => b.version - a.version)[0];
  // a director-engine run keeps poster.jpg next to video.mp4; a post's first slide is its thumbnail
  const videoThumb = (v: VideoRow) => { const p = newest(v.video_versions)?.mp4_path; return p ? p.replace(/[^/]+$/, "poster.jpg") : null; };
  const postThumb = (p: PostRow) => { const r = newest(p.post_versions)?.content?.renders ?? {}; return r["4:5"]?.[0] ?? r["9:16"]?.[0] ?? r["1:1"]?.[0] ?? r["16:9"]?.[0] ?? Object.values(r).find((x) => x?.length)?.[0] ?? null; };
  const paths = [...videos.map(videoThumb), ...posts.map(postThumb)].filter((x): x is string => Boolean(x));
  const { data: signed } = paths.length ? await supabase.storage.from(LIVE_BUCKET).createSignedUrls(paths, 3600) : { data: [] };
  const url = new Map((signed ?? []).filter((s) => !s.error && s.signedUrl).map((s) => [s.path, s.signedUrl]));

  const works: Work[] = [
    ...videos.map((v) => { const t = videoThumb(v); return { id: v.id, kind: "video" as const, type: v.format, title: v.title, status: v.status, platforms: v.format === "16:9" ? ["linkedin", "x"] : ["instagram", "tiktok"], day: v.scheduled_on ?? dayKey(v.created_at), scheduled: Boolean(v.scheduled_on), createdAt: v.created_at, thumb: t ? url.get(t) ?? null : null, href: `/videos/${v.id}` }; }),
    ...posts.map((p) => { const t = postThumb(p); return { id: p.id, kind: "post" as const, type: p.placement === "story" || p.placement === "cover" ? p.placement : p.type, title: p.title, status: p.status, platforms: p.platforms, day: p.scheduled_on ?? dayKey(p.created_at), scheduled: Boolean(p.scheduled_on), createdAt: p.created_at, thumb: t ? url.get(t) ?? null : null, href: `/posts/${p.id}` }; }),
  ];
  return works.filter((w) => (!from || w.day >= from) && (!to || w.day <= to)).sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt));
}

/** The brand's facts and voice (not in listCompanies). A field the company saved empty is filled from the capture it
 *  uses (its profile has the audience, the full feature inventory and the selling points) — the saved value always
 *  wins when there is one. */
export async function brandDetails(ctx: AppContext, companyId: string) {
  const { data } = await ctx.supabase.from("brand_profiles").select("facts, tone, tagline, fonts").eq("company_id", companyId).maybeSingle();
  const saved = (data?.facts ?? {}) as { what_it_does?: string; audience?: string; key_features?: string[]; offers?: string[]; numbers?: { value: string; label: string }[] };
  const facts = { ...saved };
  let tone = (data?.tone as string) ?? "", tagline = (data?.tagline as string) ?? "";
  let sellingPoints: string[] = [];
  const thin = !facts.key_features?.length || !facts.audience || !facts.what_it_does || (!facts.offers?.length && !facts.numbers?.length) || !tone || !tagline;
  if (thin) {
    const profile = await captureProfile(ctx, companyId).catch(() => null);
    if (profile) {
      if (!facts.key_features?.length) facts.key_features = (profile.features ?? []).map((f) => (f.detail ? `${f.name} — ${f.detail}` : f.name)).filter(Boolean);
      if (!facts.audience) facts.audience = profile.audience ?? "";
      if (!facts.what_it_does) facts.what_it_does = profile.summary ?? "";
      tone ||= profile.voice ?? "";
      tagline ||= profile.tagline ?? "";
      sellingPoints = (profile.selling_points ?? []).filter(Boolean);
    }
  }
  return { facts, tone, tagline, sellingPoints };
}

type CaptureProfile = { audience?: string; summary?: string; voice?: string; tagline?: string; selling_points?: string[]; features?: { name: string; detail?: string }[] };
// the capture's profile changes only when a capture finishes: kept for a minute (every page's shell reads it)
const profiles = new Map<string, { at: number; value: CaptureProfile | null }>();
async function captureProfile(ctx: AppContext, companyId: string): Promise<CaptureProfile | null> {
  const hit = profiles.get(companyId);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  const value = await readCaptureProfile(ctx, companyId);
  profiles.set(companyId, { at: Date.now(), value });
  return value;
}
async function readCaptureProfile(ctx: AppContext, companyId: string): Promise<CaptureProfile | null> {
  const { companyCaptureId } = await import("@/lib/live-engine/server/jobs");
  const id = await companyCaptureId(companyId);
  if (!id) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient().from("live_brand_captures").select("profile").eq("id", id).eq("workspace_id", ctx.workspace.id).maybeSingle();
  return (data?.profile as CaptureProfile | null) ?? null;
}
