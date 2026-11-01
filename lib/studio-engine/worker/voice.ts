// The voiceover, as the MotionGX ads made it (MotionGX-ads/lib/vo.mjs): the whole script in ONE ElevenLabs take
// (eleven_v3, natural, no tags — the dialect holds only with the full context), then cut into one clip per scene at the
// pauses between lines, each with its own word timings.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Ledger } from "../../live-engine/worker/claude";

const MODEL = "eleven_v3";
// the ads' approved voices; STUDIO_VOICE overrides
export const VOICES: Record<string, string> = {
  eg: "VMy40598IGgDeaOE8phq", // Fathy Hammad — Egyptian (approved)
  sa: "ht2HShpHzhG4gY6wI5YF", // Ayman Alghamdi — Saudi, Jeddawi (approved)
  en: "JBFqnCBsd6RMkjVDRZzb", // George — English (ElevenLabs stock voice; not used in the ads)
};
export const voiceFor = (country: string) => process.env.STUDIO_VOICE || (/^(SA|AE|KW|QA|BH|OM)$/.test(country) ? VOICES.sa : /^(US|GB|CA|AU)$/.test(country) ? VOICES.en : VOICES.eg);
// ElevenLabs bills characters; ≈ $0.22 per 1,000 on the Creator plan (an estimate for the cost record)
const USD_PER_CHAR = 0.22 / 1000;

export type Clip = { mp3: string; characters: string[]; starts: number[]; ends: number[] };

async function tts(voice: string, text: string, speed = 1) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set — the studio engine's voiceover needs it");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_192`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.85, use_speaker_boost: true, speed } }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { audio_base64: string; alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
}

/** one take for all the lines → one clip per line (mp3 + its characters with times from the clip's start) */
export async function voiceover(o: { lines: string[]; voice: string; dir: string; ffmpeg: string; ledger: Ledger; log: (l: string) => void; speed?: number }): Promise<Clip[]> {
  const { lines: vo, dir, ffmpeg } = o;
  fs.mkdirSync(dir, { recursive: true });
  const text = vo.join("\n"), whole = path.join(dir, "vo.mp3"), t0 = Date.now();
  const d = await tts(o.voice, text, o.speed ?? 1);
  o.ledger.addPriced("director", MODEL, { in: text.length, out: 0 }, text.length * USD_PER_CHAR, Date.now() - t0);
  fs.writeFileSync(whole, Buffer.from(d.audio_base64, "base64"));
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = d.alignment;
  if (ch.join("") !== text) throw new Error("the voiceover's alignment does not match the text");
  // each line's character range, and its spoken start / end
  let at = 0;
  const lines = vo.map((s) => { const a = at, b = at + s.length; at = b + 1; const k0 = a + s.search(/\S/), k1 = a + s.trimEnd().length - 1; return { a, b, t0: st[k0], t1: en[k1] }; });
  const total = en[en.length - 1] + 0.3;
  const clips = lines.map((l, i) => {
    const from = i === 0 ? 0 : (lines[i - 1].t1 + l.t0) / 2, to = i === lines.length - 1 ? total : (l.t1 + lines[i + 1].t0) / 2;
    const mp3 = path.join(dir, `vo-${String(i).padStart(2, "0")}.mp3`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", whole, "-ss", from.toFixed(3), "-to", to.toFixed(3), "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse", "-b:a", "192k", mp3]);
    return { mp3, characters: ch.slice(l.a, l.b), starts: st.slice(l.a, l.b).map((x) => +(x - from).toFixed(3)), ends: en.slice(l.a, l.b).map((x) => +(x - from).toFixed(3)) };
  });
  o.log(`✓ voice: one ElevenLabs take (${MODEL}${o.speed && o.speed !== 1 ? `, speed ${o.speed.toFixed(2)}` : ""}), ${total.toFixed(1)}s, cut into ${clips.length} lines`);
  return clips;
}
