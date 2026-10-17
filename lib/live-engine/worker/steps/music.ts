/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/music.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5c — music. A 120 BPM track synthesised from the script: energy follows scene purposes,
// impacts land on the drops, risers lead into them. Pure JS, no samples, no licences.
import fs from "node:fs";

const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; }
function biquad(x, type, f, q = 0.707) {
  const w = (2 * Math.PI * f) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = a; b1 = 0; b2 = -a; }
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

export function makeMusic({ script, file, seed = 7 }) {
  const D = script.length, N = Math.ceil(D * SR), L = new Float32Array(N), R = new Float32Array(N), rand = rng(seed);
  const add = (sig, at, gain = 1, pan = 0) => { const i0 = Math.round(at * SR); for (let i = 0; i < sig.length && i0 + i < N; i++) { L[i0 + i] += sig[i] * gain * (1 - Math.max(pan, 0)); R[i0 + i] += sig[i] * gain * (1 + Math.min(pan, 0)); } };
  const noise = (n) => Float32Array.from({ length: n }, rand);
  const env = (n, k, f) => Float32Array.from({ length: n }, (_, i) => f(i / SR) * Math.exp((-i / SR) * k));
  const kick = () => { const n = 0.45 * SR | 0, o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (2 * Math.PI * (45 + 110 * Math.exp(-t * 28))) / SR; o[i] = Math.sin(ph) * Math.exp(-t * 7); } return o; };
  const clap = () => { const n = 0.25 * SR | 0, x = biquad(noise(n), "bp", 1800, 0.8); return x.map((v, i) => v * Math.exp((-i / SR) * 18) * 2.2); };
  const hat = (open) => { const n = (open ? 0.18 : 0.05) * SR | 0, x = biquad(noise(n), "hp", 7500); return x.map((v, i) => v * Math.exp((-i / SR) * (open ? 14 : 70)) * 0.35); };
  const impact = () => { const n = 2.2 * SR | 0, c = biquad(noise(n), "hp", 3000); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-t * 6)) * t) * Math.exp(-t * 2.2) * 1.1 + c[i] * Math.exp(-t * 2.8) * 0.35; } return o; };
  const riser = (dur) => { const n = dur * SR | 0, x = noise(n), o = new Float32Array(n), seg = 2048; for (let k = 0; k < n; k += seg) { const f = 500 + 7000 * (k / n) ** 2, y = biquad(x.subarray(k, k + seg), "bp", f, 1.2); for (let i = 0; i < y.length; i++) o[k + i] = y[i] * ((k + i) / n) ** 2 * 0.7; } return o; };
  const saw = (f, n) => Float32Array.from({ length: n }, (_, i) => 2 * ((i / SR * f) % 1) - 1);
  const pad = (ch, dur) => { const n = dur * SR | 0, x = new Float32Array(n); for (const m of ch) for (const d of [0.996, 1.004]) { const s = saw(midi(m) * d, n); for (let i = 0; i < n; i++) x[i] += s[i]; } const y = biquad(x, "lp", 1400); return y.map((v, i) => v * 0.07 * Math.min(1, i / SR / 0.25, (dur - i / SR) / 0.3)); };
  const bass = (m, dur) => { const n = dur * SR | 0, s = biquad(saw(midi(m), n), "lp", 380); return s.map((v, i) => (v + Math.sin(2 * Math.PI * midi(m) * i / SR) * 0.6) * Math.exp((-i / SR) * 3.5) * 0.55); };
  const pluck = (m, cut) => { const n = 0.22 * SR | 0, a = saw(midi(m), n), b = saw(midi(m + 12), n), x = a.map((v, i) => v + b[i] * 0.4); return biquad(x, "lp", cut).map((v, i) => v * Math.exp((-i / SR) * 16) * 0.16); };

  const moods = { driving: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], uplifting: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], "tense-then-release": [[57, 60, 64], [57, 60, 64], [53, 57, 60], [52, 56, 59]], chill: [[53, 57, 60], [57, 60, 64], [48, 52, 55], [55, 59, 62]] };
  const CH = moods[script.music?.mood] || moods.driving;
  const energyOf = (t) => { const s = script.scenes.find((x) => t >= x.start && t < x.start + x.bars * 2); if (!s) return 0; return ["hook", "problem"].includes(s.purpose) ? 1 : s.purpose === "cta" ? 2 : 2; };
  const endT = D - 2;
  for (let bar = 0; bar * BAR < D; bar++) {
    const t0 = bar * BAR, ch = CH[bar % 4], root = ch[0] - 12, e = t0 >= endT ? 0 : energyOf(t0);
    add(pad(ch, Math.min(BAR, D - t0)), t0, e === 2 ? 0.8 : 1.1);
    if (t0 < endT) for (let k = 0; k < 16; k++) add(pluck(ch[[0, 2, 1, 2, 0, 1, 2, 1][k % 8]] + 12, e === 2 ? 3600 : 2400), t0 + k * BEAT / 4, e === 2 ? 0.9 : 0.6, k % 2 ? -0.35 : 0.35);
    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * BEAT; if (tb >= endT) break;
      if (e === 2) { add(kick(), tb, 0.95); if (b % 2) add(clap(), tb, 0.55, 0.1); add(hat(), tb + BEAT / 2, 0.8, -0.3); add(hat(), tb + BEAT / 4, 0.35, 0.3); add(hat(), tb + 3 * BEAT / 4, 0.35, 0.3); add(bass(root, BEAT * 0.48), tb + BEAT / 2); add(bass(root, BEAT * 0.3), tb, 0.55); }
      else if (e === 1) { if (b % 2 === 0) add(kick(), tb, 0.85); if (b === 2) add(clap(), tb, 0.45); add(hat(), tb + BEAT / 2, 0.55, -0.3); add(bass(root, BEAT * 0.9), tb, 0.8); }
    }
  }
  const drops = [...new Set([...(script.music?.drops || []), ...script.scenes.filter((s) => ["reveal", "cta"].includes(s.purpose)).map((s) => s.start)])].filter((t) => t > 0 && t < D);
  for (const t of drops) { add(impact(), t, 0.75); if (t >= 2) add(riser(2), t - 2, 0.9); }
  add(pad([...CH[0], CH[0][0] + 12], Math.min(4, D)), Math.max(0, D - 4), 1.1);

  // glue, fade, level: about −17 dBFS RMS, peaks under −1 dBFS (sits under a voice-over)
  let ss = 0, pk = 0; const fl = 1.5 * SR;
  for (let i = 0; i < N; i++) { const f = i > N - fl ? (N - i) / fl : 1; L[i] = Math.tanh(L[i] * 1.1) / 1.1 * f; R[i] = Math.tanh(R[i] * 1.1) / 1.1 * f; ss += L[i] * L[i] + R[i] * R[i]; }
  const g = 10 ** (-17 / 20) / Math.sqrt(ss / (2 * N)); for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i] * g), Math.abs(R[i] * g));
  const gain = g / Math.max(1, pk / 0.89);
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * gain * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * gain * 32767))), 46 + i * 4); }
  fs.writeFileSync(file, buf);
  return { file, drops };
}
