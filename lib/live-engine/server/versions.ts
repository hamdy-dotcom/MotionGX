import "server-only";
// Live versions in video_versions (engine = 'live'): the script (as the studio's ScriptBeats + plan fields),
// the QA report, the MP4 / composition paths in the live-engine bucket. Undo copies the parent version.
import { createAdminClient } from "@/lib/supabase/admin";
import { beatsFromScript, MOOD, planFromScript, type LiveScript } from "../mapping";
import { LIVE_BUCKET } from "../protocol";
import type { JobRow } from "./jobs";

const admin = () => createAdminClient();
export const runPrefix = (job: Pick<JobRow, "workspace_id" | "video_id" | "id">) => `${job.workspace_id}/runs/${job.video_id}/${job.id}`;
export const liveRevision = (row: { id: string }) => `live:${row.id}`;

async function readJson<T>(path: string): Promise<T | null> {
  const { data } = await admin().storage.from(LIVE_BUCKET).download(path);
  return data ? (JSON.parse(await data.text()) as T) : null;
}

export async function insertLiveVersion(job: JobRow, summary: Record<string, unknown>): Promise<number> {
  const db = admin();
  const run = runPrefix(job);
  const script = await readJson<LiveScript>(`${run}/script.json`);
  if (!script) throw new Error("the run has no script.json");
  const qa = await readJson<Record<string, unknown>>(`${run}/qa.json`);
  const { data: latest } = await db.from("video_versions").select("version").eq("video_id", job.video_id!).order("version", { ascending: false }).limit(1).maybeSingle();
  const parent = latest?.version ?? null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const version = ((await db.from("video_versions").select("version").eq("video_id", job.video_id!).order("version", { ascending: false }).limit(1).maybeSingle()).data?.version ?? 0) + 1;
    const { error } = await db.from("video_versions").insert({
      video_id: job.video_id,
      version,
      engine: "live",
      live_job_id: job.id,
      live_script: script,
      live_qa: qa,
      scenes: beatsFromScript(script),
      script: { title: script.idea, generator: "live" },
      plan: planFromScript(script),
      mp4_path: `${run}/video.mp4`,
      composition_path: `${run}/video.src.html`,
      audio: { mix: `${run}/music.wav`, sfx: null },
      qa: { history: { origin: job.mode ?? "new", parent_version: job.mode === "new" ? null : parent }, validation: (qa?.history as unknown[]) ?? [], summary, fingerprint: (summary as { fingerprint?: unknown }).fingerprint ?? null },
    });
    if (error?.code === "23505") continue; // a concurrent version took the number
    if (error) throw new Error(`version insert: ${error.message}`);
    await db.from("videos").update({ title: script.idea.slice(0, 120), music_mood: MOOD[script.music?.mood ?? ""] ?? "energetic" }).eq("id", job.video_id!);
    return version;
  }
  throw new Error("version insert: no free version number");
}

/** «تراجع» on a live version: a new version that copies the parent (same rule as the legacy undo) */
export async function undoLive(videoId: string, expect: { version: number; revision: string }) {
  const db = admin();
  const { data: latest } = await db.from("video_versions").select("*").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest || latest.engine !== "live") return { ok: false as const, error: "nothing" as const };
  if (latest.version !== expect.version || liveRevision(latest) !== expect.revision) return { ok: false as const, error: "stale" as const };
  const parentVersion = (latest.qa as { history?: { parent_version?: number | null } } | null)?.history?.parent_version;
  if (!parentVersion) return { ok: false as const, error: "nothing" as const };
  const { data: parent } = await db.from("video_versions").select("*").eq("video_id", videoId).eq("version", parentVersion).maybeSingle();
  if (!parent) return { ok: false as const, error: "failed" as const };
  const version = latest.version + 1;
  const { id: _id, created_at: _c, version: _v, ...copy } = parent;
  void _id;
  void _c;
  void _v;
  const { error } = await db.from("video_versions").insert({ ...copy, version, qa: { ...((parent.qa ?? {}) as Record<string, unknown>), history: { origin: "undo", parent_version: latest.version } } });
  if (error?.code === "23505") return { ok: false as const, error: "stale" as const };
  if (error) {
    console.error("[live] undo insert failed", { videoId, message: error.message });
    return { ok: false as const, error: "failed" as const };
  }
  return { ok: true as const, version };
}

/** signed URLs for the studio's preview of a live version */
export async function liveMedia(row: { mp4_path: string | null }) {
  const sign = async (p?: string | null) => (p ? ((await admin().storage.from(LIVE_BUCKET).createSignedUrl(p, 6 * 3600)).data?.signedUrl ?? null) : null);
  return { mp4Url: await sign(row.mp4_path) };
}
