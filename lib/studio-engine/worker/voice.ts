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
  // the take's own timings drift (≈0.5 s on v4): where each line really starts and ends comes from what is heard in it
  await heardLines(file, vo, lines, o).catch((err) => o.log(`! voice: the take could not be checked by ear (${String(err).slice(0, 120)}) — using its own timings`));
  return { file, total, lines };
}

const norm = (w: string) => w.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[.,،؟?!…:;«»"'()\-]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/^(وال|بال|فال|كال|لل|ال|و)/, "").toLowerCase();
/** how alike two words are, 0–1 (letter pairs in common); a Latin / digit word against an Arabic one is a weak match
 *  (Scribe writes «أونلاين» as "online" and «خمسة وعشرين» as "25") */
function sim(a: string, b: string) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (/[a-z0-9]/.test(a) !== /[a-z0-9]/.test(b)) return 0.35;
  const pairs = (x: string) => { const m = new Map<string, number>(); for (let i = 0; i < x.length - 1; i++) m.set(x.slice(i, i + 2), (m.get(x.slice(i, i + 2)) ?? 0) + 1); return m; };
  const pa = pairs(a), pb = pairs(b); let common = 0;
  for (const [k, n] of pa) common += Math.min(n, pb.get(k) ?? 0);
  return a.length < 2 || b.length < 2 ? (a[0] === b[0] ? 0.5 : 0) : (2 * common) / (a.length - 1 + b.length - 1);
}

/** Scribe (ElevenLabs speech-to-text) hears the take; its words are matched to the script's (sequence alignment) and each
 *  line's start / end is moved to where it is heard — the cut between lines then falls in the real pause */
export async function heardLines(file: string, vo: string[], lines: Take["lines"], o: { ledger: Ledger; log: (l: string) => void; lang?: string }) {
  const key = process.env.ELEVENLABS_API_KEY!, t0 = Date.now();
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", vo.join(" ").match(/[\u0600-\u06FF]/) ? "ara" : "eng");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([fs.readFileSync(file)], { type: "audio/mpeg" }), "vo.mp3");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: form, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Scribe ${res.status}`);
  const heard = ((await res.json()).words as { text: string; start: number; end: number; type: string }[]).filter((w) => w.type === "word" && w.text.trim());
  const secs = heard.length ? heard[heard.length - 1].end : 0;
  o.ledger.addPriced("director", "scribe_v1", { in: Math.round(secs), out: 0 }, (secs / 3600) * 0.4, Date.now() - t0);
  // the script's words in order, each with its line
  const said: { w: string; line: number }[] = [];
  vo.forEach((l, li) => l.split(/\s+/).filter((w) => norm(w)).forEach((w) => said.push({ w, line: li })));
  // Needleman–Wunsch: match = similarity, skipping a word on either side costs a little
  const n = said.length, m = heard.length, GAP = -0.35;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { S[i][0] = i * GAP; B[i][0] = 1; }
  for (let j = 1; j <= m; j++) { S[0][j] = j * GAP; B[0][j] = 2; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const d = S[i - 1][j - 1] + (sim(said[i - 1].w, heard[j - 1].text) * 2 - 0.7), u = S[i - 1][j] + GAP, l = S[i][j - 1] + GAP;
    if (d >= u && d >= l) { S[i][j] = d; B[i][j] = 0; } else if (u >= l) { S[i][j] = u; B[i][j] = 1; } else { S[i][j] = l; B[i][j] = 2; }
  }
  const map = new Int32Array(n).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0;) { const b = B[i][j]; if (i > 0 && j > 0 && b === 0) { map[i - 1] = j - 1; i--; j--; } else if (i > 0 && (j === 0 || b === 1)) i--; else j--; }
  const missing = [...map].filter((x) => x < 0).length;
  // each line: its first and last heard word
  let moved = 0;
  lines.forEach((l, li) => {
    const idx = said.map((s, k) => (s.line === li ? map[k] : -1)).filter((x) => x >= 0);
    if (!idx.length) return;
    const h0 = heard[Math.min(...idx)], h1 = heard[Math.max(...idx)];
    const shift = h0.start - l.t0;
    if (Math.abs(shift) > 0.08 || Math.abs(h1.end - l.t1) > 0.08) moved++;
    for (const w of l.words) { w.t = +(w.t + shift).toFixed(3); w.e = +(w.e + shift).toFixed(3); }
    l.t0 = h0.start; l.t1 = h1.end;
  });
  o.log(`✓ voice heard: ${heard.length} words, ${moved} of ${lines.length} line edges corrected${missing > n * 0.12 ? ` · ! ${missing} of ${n} script words not heard` : ""}`);
}
