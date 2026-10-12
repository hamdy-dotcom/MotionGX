// BS.1770-4 integrated loudness + a look-ahead peak limiter, for 44.1 kHz stereo Float32 buffers.
// (Port of scripts/music/score.py — milliseconds for a 30 s mix.)

function biquad(b: number[], a: number[], x: Float32Array) {
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

function kWeight(x: Float32Array, sr: number) {
  // high shelf (+4 dB @ 1.5 kHz) then high-pass (38 Hz)
  const A = 10 ** (4 / 40);
  let w0 = (2 * Math.PI * 1500) / sr;
  let alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const c = Math.cos(w0);
  const sA = Math.sqrt(A);
  const a0 = A + 1 - (A - 1) * c + 2 * sA * alpha;
  const shelfB = [A * (A + 1 + (A - 1) * c + 2 * sA * alpha), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - 2 * sA * alpha)].map((v) => v / a0);
  const shelfA = [1, (2 * (A - 1 - (A + 1) * c)) / a0, (A + 1 - (A - 1) * c - 2 * sA * alpha) / a0];
  w0 = (2 * Math.PI * 38) / sr;
  alpha = Math.sin(w0) / (2 * 0.5);
  const c2 = Math.cos(w0);
  const ha0 = 1 + alpha;
  const hpB = [(1 + c2) / 2 / ha0, -(1 + c2) / ha0, (1 + c2) / 2 / ha0];
  const hpA = [1, (-2 * c2) / ha0, (1 - alpha) / ha0];
  return biquad(hpB, hpA, biquad(shelfB, shelfA, x));
}

export function lufs(L: Float32Array, R: Float32Array, sr = 44100) {
  const kl = kWeight(L, sr);
  const kr = kWeight(R, sr);
  const block = Math.round(0.4 * sr);
  const step = Math.round(0.1 * sr);
  const zs: [number, number][] = [];
  for (let s = 0; s + block <= kl.length; s += step) {
    let a = 0;
    let b = 0;
    for (let i = s; i < s + block; i++) {
      a += kl[i] * kl[i];
      b += kr[i] * kr[i];
    }
    zs.push([a / block, b / block]);
  }
  const loud = (z: [number, number]) => -0.691 + 10 * Math.log10(z[0] + z[1] + 1e-12);
  const gated = zs.filter((z) => loud(z) > -70);
  if (!gated.length) return -70;
  const mean = (arr: [number, number][]) => arr.reduce((s, z) => s + z[0] + z[1], 0) / arr.length;
  const rel = -0.691 + 10 * Math.log10(mean(gated) + 1e-12) - 10;
  const final = gated.filter((z) => loud(z) > rel);
  return -0.691 + 10 * Math.log10(mean(final.length ? final : gated) + 1e-12);
}

/** look-ahead limiter: instant attack, exponential release; hard ceiling (dBFS) */
export function limit(L: Float32Array, R: Float32Array, ceilingDb = -1.2, sr = 44100, lookaheadMs = 5, releaseMs = 60) {
  const ceiling = 10 ** (ceilingDb / 20);
  const n = L.length;
  const la = Math.round((lookaheadMs / 1000) * sr);
  const peak = new Float32Array(n);
  for (let i = 0; i < n; i++) peak[i] = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  // running max over ±la (monotonic deque)
  const env = new Float32Array(n);
  const dq: number[] = [];
  let head = 0;
  for (let i = 0; i < n + la; i++) {
    if (i < n) {
      while (dq.length > head && peak[dq[dq.length - 1]] <= peak[i]) dq.pop();
      dq.push(i);
    }
    const c = i - la;
    if (c >= 0) {
      while (dq[head] < c - la) head++;
      env[c] = peak[dq[head]];
    }
  }
  const rel = Math.exp(-1 / ((releaseMs / 1000) * sr));
  let cur = 1;
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, ceiling / Math.max(env[i], 1e-9));
    cur = g < cur ? g : rel * cur + (1 - rel) * g;
    L[i] = Math.max(-ceiling, Math.min(ceiling, L[i] * cur));
    R[i] = Math.max(-ceiling, Math.min(ceiling, R[i] * cur));
  }
}

/** gain to target LUFS, limit, repeat (as score.py's master) */
export function master(L: Float32Array, R: Float32Array, target = -14, sr = 44100) {
  for (let k = 0; k < 3; k++) {
    const cur = lufs(L, R, sr);
    const g = 10 ** ((target - cur) / 20);
    for (let i = 0; i < L.length; i++) {
      L[i] *= g;
      R[i] *= g;
    }
    limit(L, R, -1.2, sr);
  }
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  return { lufs: lufs(L, R, sr), peakDb: 20 * Math.log10(peak + 1e-12) };
}

export function wav16(L: Float32Array, R: Float32Array, sr = 44100) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  const pcm = new Int16Array(buf.buffer, buf.byteOffset + 44, n * 2);
  for (let i = 0; i < n; i++) {
    pcm[2 * i] = Math.round(Math.max(-1, Math.min(1, L[i])) * 32767);
    pcm[2 * i + 1] = Math.round(Math.max(-1, Math.min(1, R[i])) * 32767);
  }
  return buf;
}
