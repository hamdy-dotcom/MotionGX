// Beat grid: scenes start on whole beats; the last scene absorbs the remainder so the
// video is exactly lengthS long. Relative imports only (bundled by Remotion too).

export type TimedScene = { index: number; startFrame: number; durationFrames: number; beats: number };

/** Frames per beat (fractional at 90/110/128 BPM — starts are rounded to the nearest frame). */
export const framesPerBeat = (fps: number, bpm: number) => (fps * 60) / bpm;

/** Whole-beat lengths that add up to floor(total beats), keeping each scene >= minBeats. */
export function snapBeats(requested: number[], totalBeats: number, minBeats = 2): number[] {
  const n = requested.length;
  if (n === 0) return [];
  const target = Math.max(n * minBeats, Math.floor(totalBeats + 1e-6));
  const req = requested.map((b) => Math.max(minBeats, Math.round(b)));
  const sum = req.reduce((a, b) => a + b, 0);
  const raw = req.map((b) => (b / sum) * target);
  const out = raw.map((r) => Math.max(minBeats, Math.floor(r)));
  let diff = target - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; diff > 0; k = (k + 1) % n, diff--) out[order[k].i]++;
  for (let guard = 0; diff < 0 && guard < 10_000; guard++) {
    const i = out.indexOf(Math.max(...out));
    if (out[i] <= minBeats) break;
    out[i]--;
    diff++;
  }
  return out;
}

export function computeTimeline(requestedBeats: number[], { fps, bpm, lengthS }: { fps: number; bpm: number; lengthS: number }): TimedScene[] {
  const fpb = framesPerBeat(fps, bpm);
  const totalFrames = Math.round(lengthS * fps);
  const beats = snapBeats(requestedBeats, totalFrames / fpb);
  let cum = 0;
  const starts = beats.map((b) => {
    const s = Math.round(cum * fpb);
    cum += b;
    return s;
  });
  return beats.map((b, i) => ({
    index: i,
    beats: b,
    startFrame: starts[i],
    durationFrames: (i === beats.length - 1 ? totalFrames : starts[i + 1]) - starts[i],
  }));
}
