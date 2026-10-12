import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandVideoProps, KitScene } from "./kit";
import { loadCompanyBrand } from "./brand-props";
import { toKitScenes } from "./legacy";
import { bpmFor, getTrack, trackUrl, type MusicTrack } from "./music";
import type { Video } from "@/lib/types";

export type VideoRow = Video & { music_enabled?: boolean; music_mood?: string | null; music_track_id?: string | null };

/** Engine props for a video's latest (or given) version. Works with the user's client (RLS) or the service role. */
export async function buildVideoProps(
  supabase: SupabaseClient,
  video: VideoRow,
  scenesRaw: unknown,
): Promise<{ props: BrandVideoProps; scenes: KitScene[]; track: MusicTrack | null } | null> {
  const brand = await loadCompanyBrand(supabase, video.company_id);
  if (!brand) return null;
  const bpm = bpmFor(video.pace);
  const scenes = toKitScenes(scenesRaw, bpm, brand.websiteUrl);
  const track = video.music_enabled === false ? null : await getTrack(supabase, video.music_track_id ?? null);
  return {
    scenes,
    track,
    props: {
      brand: brand.video,
      scenes,
      format: video.format,
      fps: 30,
      lengthS: video.length_s,
      lang: video.dialect === "en" ? "en" : "ar",
      bpm,
      // The track's BPM equals the pace BPM, so cuts and beats share one grid.
      music: track ? { url: trackUrl(supabase, track), bpm: track.bpm } : null,
      voiceover: null, // PHASE 4: ElevenLabs voiceover track
    },
  };
}
