import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** What the video's job has done so far, read from its log (the director engine's tool lines) — for the live creating
 *  screen. Read-only: the engine is not changed or asked for anything. */
export type VideoEvent =
  | { k: "explore"; n: number }
  | { k: "plan" }
  | { k: "storyboard"; scenes: number; mood: string }
  | { k: "clip"; n: number }
  | { k: "build"; n: number }
  | { k: "snapshot"; n: number }
  | { k: "music"; mood: string; bpm: number | null }
  | { k: "check"; errors: number | null }
  | { k: "render" }
  | { k: "finish" }
  | { k: "retry" };
export type VideoProgress = { startedAt: string | null; cost: number; step: string | null; events: VideoEvent[] };

export function parseVideoLog(lines: string[]): VideoEvent[] {
  const out: VideoEvent[] = [];
  // repeated work is one event whose count rises (the director alternates build → look → build …)
  const bump = (k: "explore" | "clip" | "build" | "snapshot") => {
    const seen = out.find((e) => e.k === k);
    if (seen) (seen as { n: number }).n++;
    else out.push({ k, n: 1 } as VideoEvent);
  };
  for (const raw of lines) {
    const l = raw.trim();
    let m: RegExpMatchArray | null;
    if (/^🛠 (inspect_clone|(read_file|list_files)( ✗)? capture:)/.test(l)) bump("explore");
    else if (/^🛠 write_file brag-plan\.md/.test(l)) { if (!out.some((e) => e.k === "plan")) out.push({ k: "plan" }); }
    else if ((m = l.match(/^🛠 set_storyboard (\d+) scenes · (.+)$/))) out.push({ k: "storyboard", scenes: +m[1], mood: m[2].trim() });
    else if (/^🛠 clip_frames/.test(l)) bump("clip");
    else if (/^🛠 (write_file|edit_file)( ✗)? composition\//.test(l)) bump("build");
    else if (/^🛠 (snapshot|review)\b/.test(l)) bump("snapshot");
    else if ((m = l.match(/^♪ music: ([^,]+)(?:, (\d+) BPM)?/))) out.push({ k: "music", mood: m[1].trim(), bpm: m[2] ? +m[2] : null });
    // the automatic check runs after every pass: one running result, not a line per pass
    else if ((m = l.match(/^✓ check: (\d+) errors/))) { const c = out.find((e) => e.k === "check"); if (c && c.k === "check") c.errors = +m[1]; else out.push({ k: "check", errors: +m[1] }); }
    else if (/^🛠 check\b/.test(l)) { if (!out.some((e) => e.k === "check")) out.push({ k: "check", errors: null }); }
    else if (/^🛠 render_video/.test(l)) { if (!out.some((e) => e.k === "render")) out.push({ k: "render" }); }
    else if (/^🛠 finish/.test(l)) out.push({ k: "finish" });
    else if (/^↻ director:/.test(l)) out.push({ k: "retry" });
  }
  return out;
}

/** the latest job of a video (the caller has already checked the user can see the video) */
export async function videoProgress(videoId: string): Promise<VideoProgress | null> {
  const { data } = await createAdminClient().from("live_jobs").select("created_at, cost_usd, stage, log").eq("video_id", videoId).eq("kind", "video").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { startedAt: data.created_at as string, cost: Number(data.cost_usd ?? 0), step: (data.stage as string | null) ?? null, events: parseVideoLog((data.log ?? []) as string[]) };
}
