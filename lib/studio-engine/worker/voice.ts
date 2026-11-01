// The voiceover, as the MotionGX ads made it (MotionGX-ads/lib/vo.mjs): the whole script in ONE ElevenLabs take
// (natural, no tags — the dialect holds only with the full context), then cut into one clip per scene at the pauses
// between lines, each with its own word timings. Model: eleven_v4 — chosen by ear in a blind Egyptian test (2026-11-01:
// v4 with normal spelling beat v3 and phonetic respelling; Fathy and Masry both approved).
import fs from "node:fs";
import path from "node:path";
import type { Ledger } from "../../live-engine/worker/claude";

const MODEL = "eleven_v4";
// the ads' approved voices; STUDIO_VOICE overrides
export const VOICES: Record<string, string> = {
  eg: "VMy40598IGgDeaOE8phq", // Fathy Hammad — Egyptian (approved)
  masry: "LXrTqFIgiubkrMkwvOUr", // Masry — Egyptian (approved in the v4 test; the library's most-used Egyptian voice)
  sa: "ht2HShpHzhG4gY6wI5YF", // Ayman Alghamdi — Saudi, Jeddawi (approved)
  en: "JBFqnCBsd6RMkjVDRZzb", // George — English (ElevenLabs stock voice; not used in the ads)
};
// STUDIO_VOICE: a name above (e.g. masry) or any ElevenLabs voice id
export const voiceFor = (country: string) => (process.env.STUDIO_VOICE ? VOICES[process.env.STUDIO_VOICE] ?? process.env.STUDIO_VOICE : null) || (/^(SA|AE|KW|QA|BH|OM)$/.test(country) ? VOICES.sa : /^(US|GB|CA|AU)$/.test(country) ? VOICES.en : VOICES.eg);
// ElevenLabs bills characters; ≈ $0.22 per 1,000 on the Creator plan (an estimate for the cost record)
const USD_PER_CHAR = 0.22 / 1000;

export type Word = { w: string; t: number; e: number };
export type Take = { file: string; total: number; lines: { t0: number; t1: number; words: Word[] }[] };

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

/** one take for all the lines, kept whole (cutting it per line put a silence after every line); each line's spoken
 *  start / end and its words with their times, from the take's start */
export async function voiceover(o: { lines: string[]; voice: string; dir: string; ledger: Ledger; log: (l: string) => void; speed?: number }): Promise<Take> {
  const { lines: vo, dir } = o;
  fs.mkdirSync(dir, { recursive: true });
  const text = vo.join("\n"), file = path.join(dir, "vo.mp3"), t0 = Date.now();
  const d = await tts(o.voice, text, o.speed ?? 1);
  o.ledger.addPriced("director", MODEL, { in: text.length, out: 0 }, text.length * USD_PER_CHAR, Date.now() - t0);
  fs.writeFileSync(file, Buffer.from(d.audio_base64, "base64"));
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = d.alignment;
  if (ch.join("") !== text) throw new Error("the voiceover's alignment does not match the text");
  let at = 0;
  const lines = vo.map((s) => {
    const a = at, b = at + s.length; at = b + 1;
    const words: Word[] = []; let cur: Word | null = null;
    for (let k = a; k < b; k++) { if (/\s/.test(ch[k])) { if (cur) words.push(cur); cur = null; } else if (!cur) cur = { w: ch[k], t: st[k], e: en[k] }; else { cur.w += ch[k]; cur.e = en[k]; } }
    if (cur) words.push(cur);
    return { t0: words[0]?.t ?? st[a], t1: words[words.length - 1]?.e ?? en[b - 1], words };
  });
  const total = en[en.length - 1] + 0.3;
  o.log(`✓ voice: one ElevenLabs take (${MODEL}${o.speed && o.speed !== 1 ? `, speed ${o.speed.toFixed(2)}` : ""}), ${total.toFixed(1)}s, ${lines.length} lines`);
  return { file, total, lines };
}
