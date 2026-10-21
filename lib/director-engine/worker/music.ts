/* eslint-disable */
// @ts-nocheck — sample-level DSP, typed loosely like steps/music.ts
// The director's music bed. Unlike the 120 BPM bed of the live engine (steps/music.ts, unchanged), this one is cut to
// the storyboard: the tempo is chosen (inside the mood's range) so the scene cuts land on beats, every video gets its
// own key, progression, drum pattern and lead from its seed, and the arrangement follows the scenes — a breakdown
// under the problem, a build in the hook, the full drop on reveal / offer / CTA, a hit on every cut and a riser +
// impact into the big ones. Pure JS synthesis, no samples, no licences.
import fs from "node:fs";

const SR = 44100;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function hashSeed(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function biquad(x, type, f, q = 0.707) {
  const w = (2 * Math.PI * Math.min(f, SR / 2.2)) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = a; b1 = 0; b2 = -a; }
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}

// the mood's tempo range, drum patterns, leads and progressions (semitones from the key's root; m = minor chord)
const MOODS = {
  driving: { bpm: [122, 132], kits: ["four", "break"], leads: ["pluck", "arp"], progs: [[[0, "m"], [8, ""], [3, ""], [10, ""]], [[0, "m"], [10, ""], [8, ""], [7, ""]], [[0, "m"], [3, ""], [10, ""], [8, ""]]] },
  uplifting: { bpm: [108, 122], kits: ["four", "half"], leads: ["keys", "pluck"], progs: [[[0, ""], [7, ""], [9, "m"], [5, ""]], [[5, ""], [7, ""], [9, "m"], [0, ""]], [[0, ""], [9, "m"], [5, ""], [7, ""]]] },
  "tense-then-release": { bpm: [96, 112], kits: ["half", "break"], leads: ["arp", "keys"], progs: [[[0, "m"], [0, "m"], [8, ""], [7, ""]], [[0, "m"], [1, ""], [0, "m"], [7, ""]], [[0, "m"], [8, ""], [10, ""], [7, ""]]] },
  chill: { bpm: [84, 98], kits: ["chill"], leads: ["keys"], progs: [[[0, ""], [9, "m"], [5, ""], [4, "m"]], [[2, "m"], [7, ""], [0, ""], [9, "m"]], [[5, ""], [4, "m"], [2, "m"], [0, ""]]] },
};
// 16 steps per bar
const KITS = {
  four: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], ghost: [1, 3, 5, 7, 9, 11, 13, 15] },
  half: { kick: [0, 7, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], ghost: [3, 11, 15] },
  break: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], ghost: [7, 15] },
  chill: { kick: [0, 9], snare: [4, 12], hat: [2, 6, 10, 14], ghost: [] },
};
// how much of the band plays under each scene purpose: 0 breakdown, 1 build, 2 groove, 3 drop
const ENERGY = { problem: 0, hook: 1, feature: 2, "how-it-works": 2, proof: 2, reveal: 3, offer: 3, cta: 3 };

export function makeDirectorMusic({ script, file, seed }) {
  const r = rng(seed), pick = (xs) => xs[Math.floor(r() * xs.length)];
  const mood = MOODS[script.music?.mood] ?? MOODS.driving;
  const scenes = script.scenes.map((s) => ({ ...s, end: s.start + s.bars * 2 }));
  const cuts = scenes.slice(1).map((s) => s.start);
  // one steady tempo per video, picked by its seed inside the mood's range; the storyboard's cuts then move onto that
  // tempo's beats (each by at most half a beat, never closer than 2 beats apart) — the edit and the music share one grid
  const bpm = mood.bpm[0] + Math.floor(r() * (mood.bpm[1] - mood.bpm[0] + 1));
  const BEAT = 60 / bpm, D0 = script.length;
  let prevStart = 0;
  for (let i = 1; i < scenes.length; i++) {
    const snapped = Math.round(scenes[i].start / BEAT) * BEAT;
    const left = (scenes.length - i) * 2 * BEAT; // room for the scenes still to come
    scenes[i].start = Math.min(Math.max(snapped, prevStart + 2 * BEAT), D0 - left);
    prevStart = scenes[i].start;
  }
  scenes.forEach((s, i) => { s.end = i + 1 < scenes.length ? scenes[i + 1].start : D0; s.beats = Math.max(1, Math.round((s.end - s.start) / BEAT)); s.beat = BEAT; });
  const moved = Math.max(0, ...script.scenes.map((s, i) => Math.abs(s.start - scenes[i].start)));
  const key = 45 + Math.floor(r() * 10) - 2; // A2-ish ± a few semitones
  const prog = pick(mood.progs), kit = KITS[pick(mood.kits)], lead = pick(mood.leads);
  const D = script.length, N = Math.ceil(D * SR), L = new Float32Array(N), R = new Float32Array(N);
  const noiseR = rng(seed ^ 0x9e3779b9), noise = (n) => Float32Array.from({ length: n }, () => noiseR() * 2 - 1);
  const add = (sig, at, gain = 1, pan = 0) => { const i0 = Math.round(at * SR); if (i0 >= N) return; for (let i = Math.max(0, -i0); i < sig.length && i0 + i < N; i++) { L[i0 + i] += sig[i] * gain * (1 - Math.max(pan, 0)); R[i0 + i] += sig[i] * gain * (1 + Math.min(pan, 0)); } };

  // ── voices ──
  const kick = () => { const n = 0.42 * SR | 0, o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (2 * Math.PI * (44 + 120 * Math.exp(-t * 30))) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 7) * 1.1; } return o; };
  const snare = () => { const n = 0.28 * SR | 0, x = biquad(noise(n), "bp", 1900, 0.7), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = x[i] * Math.exp(-t * 17) * 1.6 + Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * 0.5; } return o; };
  const hat = (open) => { const n = (open ? 0.2 : 0.05) * SR | 0, x = biquad(noise(n), "hp", 7800); return x.map((v, i) => v * Math.exp((-i / SR) * (open ? 13 : 75)) * 0.32); };
  const crash = (len = 1.6) => { const n = len * SR | 0, x = biquad(noise(n), "hp", 4800); return x.map((v, i) => v * Math.exp((-i / SR) * 2.6) * 0.42); };
  const impact = () => { const n = 2.2 * SR | 0, c = biquad(noise(n), "hp", 3000), o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * (38 + 42 * Math.exp(-t * 6)) * t) * Math.exp(-t * 2.2) * 1.1 + c[i] * Math.exp(-t * 3.5) * 0.35; } return o; };
  const riser = (dur) => { const n = Math.max(1, dur * SR | 0), x = noise(n), o = new Float32Array(n), seg = 1024; for (let k = 0; k < n; k += seg) { const f = 400 + 7600 * (k / n) ** 2, y = biquad(x.subarray(k, k + seg), "bp", f, 1.4); for (let i = 0; i < y.length; i++) o[k + i] = y[i] * ((k + i) / n) ** 2 * 1.1; } return o; };
  const swell = (dur) => riser(dur).map((v) => v * 0.55);
  const saw = (f, n) => Float32Array.from({ length: n }, (_, i) => 2 * ((i / SR * f) % 1) - 1);
  const pad = (notes, dur, cut = 1600) => { const n = Math.max(1, dur * SR | 0), x = new Float32Array(n); for (const m of notes) for (const d of [0.995, 1.005]) { const s = saw(midi(m) * d, n); for (let i = 0; i < n; i++) x[i] += s[i]; } const y = biquad(x, "lp", cut); const a = 0.25 * SR; return y.map((v, i) => v * 0.05 * Math.min(1, i / a) * Math.min(1, (n - i) / a)); };
  const bass = (m, dur) => { const n = Math.max(1, dur * SR | 0), s = biquad(saw(midi(m), n), "lp", 360); return s.map((v, i) => (v + Math.sin(2 * Math.PI * midi(m) * i / SR) * 0.7) * Math.exp((-i / SR) * 3) * 0.5); };
  const voice = {
    pluck: (m, bright) => { const n = 0.24 * SR | 0, a = saw(midi(m), n), b = saw(midi(m + 12), n); return biquad(a.map((v, i) => v + b[i] * 0.4), "lp", bright ? 3800 : 2200).map((v, i) => v * Math.exp((-i / SR) * 15) * 0.15); },
    arp: (m, bright) => { const n = 0.16 * SR | 0; return biquad(Float32Array.from({ length: n }, (_, i) => Math.sign(Math.sin(2 * Math.PI * midi(m) * i / SR))), "lp", bright ? 3200 : 1800).map((v, i) => v * Math.exp((-i / SR) * 18) * 0.1); },
    keys: (m, bright) => { const n = 0.9 * SR | 0, f = midi(m); return Float32Array.from({ length: n }, (_, i) => { const t = i / SR; return (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 6) + (bright ? 0.2 : 0.1) * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 9)) * Math.exp(-t * 3.2) * 0.16; }); },
  }[lead];
  const chord = (bar) => { const [o, q] = prog[bar % prog.length], root = key + 12 + o; return [root, root + (q === "m" ? 3 : 4), root + 7]; };
  const sceneAt = (t) => scenes.find((s) => t >= s.start && t < s.end) ?? scenes.at(-1);
  const energyAt = (t) => (t >= D - 1.5 ? -1 : ENERGY[sceneAt(t)?.purpose] ?? 2);

  // ── the band, beat by beat; every scene starts a new bar ──
  let barNo = 0;
  for (const sc of scenes) {
    for (let b = 0; b < sc.beats; b++) {
      const tb = sc.start + b * sc.beat, step = sc.beat / 4;
      if (b % 4 === 0) {
        const e0 = energyAt(tb), ch0 = chord(barNo++);
        if (e0 >= 0) add(pad(ch0, Math.min(sc.beat * Math.min(4, sc.beats - b), D - tb), e0 === 0 ? 900 : 1700), tb, e0 === 0 ? 1.3 : 0.9);
      }
      const ch = chord(barNo - 1);
      for (let j = 0; j < 4; j++) {
        const t = tb + j * step, k = (b % 4) * 4 + j; if (t >= D - 1.5) break;
        const e = energyAt(t), downbeat = j === 0;
        if (e >= 1 && kit.kick.includes(k)) add(kick(), t, e === 1 ? 0.75 : 0.95);
        if (e >= 2 && kit.snare.includes(k)) add(snare(), t, 0.5, 0.08);
        if (e >= 1 && kit.hat.includes(k)) add(hat(false), t, e === 1 ? 0.55 : 0.8, -0.25);
        if (e >= 3 && kit.ghost.includes(k)) add(hat(false), t, 0.32, 0.3);
        if (e >= 3 && k === 14) add(hat(true), t, 0.5, 0.2);
        if (e >= 2 && downbeat) add(bass(ch[0] - 12, sc.beat * 0.92), t, 0.85);
        // the lead: a broken chord; sparse in the breakdown, every 8th in the build, every 16th in the drop
        const every = e >= 3 ? 1 : e >= 1 ? 2 : 4;
        if (e >= 0 && k % every === 0 && (lead !== "keys" || j === 0)) add(voice(ch[[0, 2, 1, 2][(k / every) % 4 | 0]] + 12, e >= 3), t, e === 0 ? 0.6 : 0.85, k % 8 < 4 ? 0.3 : -0.3);
      }
    }
  }

  // ── the cuts: a hit on every one; into a big one (energy rises to the drop) a fill, a riser and an impact ──
  const drops = [];
  for (const s of scenes.slice(1)) {
    const c = s.start, before = energyAt(c - 0.05), after = ENERGY[s.purpose] ?? 2, prev = scenes[scenes.indexOf(s) - 1];
    if (after >= 3) {
      drops.push(Math.round(c * 100) / 100);
      const pb = prev.beat, lead = Math.min(pb * 4, Math.max(pb, c - prev.start - 0.2));
      add(riser(lead), c - lead, 0.85);
      for (let k = 0; k < 4; k++) add(snare(), c - pb + k * (pb / 4), 0.22 + k * 0.08, 0.05); // the fill
      add(impact(), c, 0.8); add(crash(), c, 0.9);
    } else if (after > before) { add(swell(prev.beat * 2), c - prev.beat * 2, 0.7); add(crash(1.1), c, 0.6); }
    else { add(swell(prev.beat), c - prev.beat, 0.5); add(hat(true), c, 0.6); }
  }
  // the outro: the tonic held, one last hit
  add(pad([...chord(0), chord(0)[0] + 12], Math.min(3, D), 1400), Math.max(0, D - 3), 1.2);

  // glue, fade, level: about −17 dBFS RMS, peaks under −1 dBFS (sits under a voice-over)
  let ss = 0, pk = 0; const fl = 1.5 * SR;
  for (let i = 0; i < N; i++) { const f = i > N - fl ? (N - i) / fl : 1; L[i] = Math.tanh(L[i] * 1.1) / 1.1 * f; R[i] = Math.tanh(R[i] * 1.1) / 1.1 * f; ss += L[i] * L[i] + R[i] * R[i]; }
  const g = 10 ** (-17 / 20) / Math.sqrt(ss / (2 * N) || 1); for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i] * g), Math.abs(R[i] * g));
  const gain = g / Math.max(1, pk / 0.89);
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * gain * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * gain * 32767))), 46 + i * 4); }
  fs.writeFileSync(file, buf);
  // per scene: its beat length (the tempo, stretched to fit it) — beat k of a scene is at start + k × beat
  // the storyboard on the beat grid: what the studio's script and the composition use from here on
  const timed = scenes.map((s) => ({ name: s.name, start: +s.start.toFixed(3), end: +s.end.toFixed(3), beats: s.beats }));
  return { file, bpm, beat: BEAT, bar: BEAT * 4, drops, scenes: timed, moved: +moved.toFixed(3), kit: Object.keys(KITS).find((k) => KITS[k] === kit), lead, key };
}
