import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MUSIC_MOODS, PACE_BPM, type MusicMood } from "./kit";
import type { Pace } from "@/lib/types";

export type MusicTrack = { id: string; bpm: number; mood: MusicMood; pace: Pace; variation: number; duration_s: number; storage_path: string };

export function trackUrl(supabase: SupabaseClient, track: Pick<MusicTrack, "storage_path">) {
  return supabase.storage.from("music").getPublicUrl(track.storage_path).data.publicUrl;
}

async function tracksFor(supabase: SupabaseClient, pace: Pace): Promise<MusicTrack[]> {
  const { data, error } = await supabase.from("music_tracks").select("id, bpm, mood, pace, variation, duration_s, storage_path").eq("pace", pace).order("mood").order("variation");
  if (error) {
    console.error("[music] list tracks failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []) as MusicTrack[];
}

/** AI picks the mood; code picks a matching track (stable per video via `seed`). */
export async function pickTrack(supabase: SupabaseClient, pace: Pace, mood: MusicMood | null, seed: string): Promise<MusicTrack | null> {
  const tracks = await tracksFor(supabase, pace);
  if (!tracks.length) return null;
  const pool = tracks.filter((t) => t.mood === mood);
  const list = pool.length ? pool : tracks;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** "Change track": the next track at the same pace (other variation first, then other moods). */
export async function nextTrack(supabase: SupabaseClient, pace: Pace, currentId: string | null): Promise<MusicTrack | null> {
  const tracks = await tracksFor(supabase, pace);
  if (!tracks.length) return null;
  const order = [...tracks].sort((a, b) => MUSIC_MOODS.indexOf(a.mood) - MUSIC_MOODS.indexOf(b.mood) || a.variation - b.variation);
  const i = order.findIndex((t) => t.id === currentId);
  return order[(i + 1) % order.length];
}

export async function getTrack(supabase: SupabaseClient, id: string | null): Promise<MusicTrack | null> {
  if (!id) return null;
  const { data } = await supabase.from("music_tracks").select("id, bpm, mood, pace, variation, duration_s, storage_path").eq("id", id).maybeSingle();
  return (data as MusicTrack | null) ?? null;
}

export const bpmFor = (pace: Pace) => PACE_BPM[pace];
