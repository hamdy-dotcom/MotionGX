"""
Stem library for per-video music (MotionGX Phase 3C). Rendered ONCE, offline; videos are then arranged
from these stems along their energy map with ffmpeg in ~1–3 s (lib/motion/music.ts).

  .venv/bin/python scripts/music/stems.py [--out .stems] [--moods energetic,warm,corporate,luxury] [--bpms 90,110,128]

Per mood × BPM (bar-locked loops, 44.1 kHz stereo):
  drums_full (1 bar)  punchy kick + clap/snap + hats, saturated
  drums_half (1 bar)  half-time kit for breakdowns
  hats (1 bar)        hats/shaker only (intros)
  build_{1,2,4}       kick + roll + hats with a rising high-pass/low-pass sweep — ends exactly on the drop
  bass (4 bars)       808 following the progression, side-chained to the kick
  lead (4 bars), lead_big (4 bars, octave up, brighter)
  pad (4 bars), pad_dark (4 bars, low-passed)
  riser_{1,2,4}, revcym_{1,2} (bars)
One-shots (per mood): impact, subdrop, crash, whoosh, pop, click, snap.
Everything is synthesized procedurally — no samples, no licensing.
"""
import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from generate import SR, MOOD_HARMONY, PROGRESSIONS, clap, crash, env_exp, hat, hp, impact, kick, lp, note, riser, shaker, snare, sweep_filter, whoosh, write_wav  # noqa: E402
from score import PALETTES, bass808, click_sfx, lead, pop_sfx, snap, sub_drop  # noqa: E402


def stereo(x, width=0.0):
    return np.stack([x * (1 - width * 0.5), x * (1 + width * 0.5)], 1)


def place(buf, sig, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def saturate(x, drive=1.6):
    return np.tanh(x * drive) / np.tanh(drive)


def kick_env(beat, n, half=False):
    """side-chain gain curve: duck to 0.45 on each kick, smoothstep recovery over ~45% of a beat
    (deeper/longer pumping made the 808 swell compete with the hits)"""
    g = np.ones(n)
    step = beat * (2 if half else 1)
    k = 0.0
    while k * SR < n:
        i = int(k * SR)
        m = min(n - i, int(beat * 0.45 * SR))
        u = np.arange(m) / max(1, int(beat * 0.45 * SR))
        g[i : i + m] = np.minimum(g[i : i + m], 0.45 + 0.55 * (u * u * (3 - 2 * u)))
        k += step
    return g


class Stems:
    def __init__(self, mood, bpm, seed=7):
        self.mood, self.bpm = mood, bpm
        self.beat = 60.0 / bpm
        self.bar = 4 * self.beat
        self.pal = PALETTES[mood]
        self.prog = PROGRESSIONS[MOOD_HARMONY[mood]]
        self.root = 45 if MOOD_HARMONY[mood] != "major" else 48
        self.rng = np.random.default_rng(seed)

    def n(self, bars):
        # every loop is a whole number of identical bars (so looping stays sample-exact)
        return bars * int(round(self.bar * SR))

    def chord(self, bar):
        r, tones = self.prog[bar % len(self.prog)]
        return self.root + r, [self.root + 12 + x for x in tones]

    def drums(self, bars=1, half=False, hats_only=False):
        rng = self.rng
        buf = np.zeros(self.n(bars))
        for b in range(bars * 4):
            t = b * self.beat
            if not hats_only and (not half or b % 2 == 0):
                place(buf, kick(rng, punch=self.pal["kick_punch"]) * 1.1, t, 0.95)
            if not hats_only and (b % 2 == 1 if not half else b % 4 == 2):
                place(buf, clap(rng) if self.pal["clap"] == "clap" else snap(rng), t, 0.55)
            for s in range(2 if half else 4):
                place(buf, hat(rng) if self.mood != "warm" else shaker(rng), t + s * self.beat / (2 if half else 4), 0.3 if s % 2 else 0.18)
        return stereo(saturate(buf, 1.4), 0.1)

    def build(self, bars):
        """kick on every beat + accelerating roll over the last bar, sweeping open, ending on the downbeat"""
        rng = self.rng
        n = self.n(bars)
        buf = np.zeros(n)
        for b in range(bars * 4):
            t = b * self.beat
            place(buf, kick(rng, punch=self.pal["kick_punch"]), t, 0.7)
            place(buf, hat(rng), t + self.beat / 2, 0.2)
        roll0 = max(0, bars - 1) * self.bar
        k = 0
        step = self.beat / 4
        t = roll0
        while t < bars * self.bar - 1e-6:
            place(buf, (snare(rng) if self.mood == "luxury" else clap(rng)), t, 0.1 + 0.035 * k)
            k += 1
            t += step if t < roll0 + self.bar / 2 else step / 2
        swept = sweep_filter(saturate(buf, 1.3), 500, 9000, "low")
        return stereo(swept, 0.15)

    def bass(self, bars=4):
        rng = self.rng
        n = self.n(bars)
        buf = np.zeros(n)
        half = self.pal["half_time"]
        for b in range(bars * 4):
            if half and b % 2:
                continue
            root, _ = self.chord(b // 4)
            place(buf, bass808(note(root - 12), self.beat * (1.8 if half else 0.9), self.pal["bass_drive"]), b * self.beat, 0.75)
        buf *= kick_env(self.beat, n, half)  # side-chain to the kick
        return stereo(saturate(buf, 1.2), 0.0)

    def lead_loop(self, bars=4, big=False):
        n = self.n(bars)
        L = np.zeros(n)
        R = np.zeros(n)
        for b in range(bars * 4):
            _, tones = self.chord(b // 4)
            for k in range(2):
                m = tones[(b * 2 + k) % len(tones)] + (24 if big else 12)
                sig = lead(note(m), self.beat * 0.45, self.pal["lead"]) * (0.14 if self.pal["lead"] == "saw" else 0.18) * (1.3 if big else 1)
                t = b * self.beat + k * self.beat / 2
                place(L, sig, t, 1.0 + (0.25 if k else -0.25))
                place(R, sig, t, 1.0 - (0.25 if k else -0.25))
        if big:
            L, R = hp(L, 180), hp(R, 180)
        return np.stack([L, R], 1)

    def pad(self, bars=4, dark=False):
        from generate import saw, sine  # noqa: E402

        n = self.n(bars)
        L = np.zeros(n)
        R = np.zeros(n)
        per = self.n(1)
        for bar in range(bars):
            _, tones = self.chord(bar)
            l = sum(sine(note(m) * 0.998, per) + 0.1 * saw(note(m), per) for m in tones)
            r = sum(sine(note(m) * 1.002, per, 0.6) + 0.1 * saw(note(m) * 1.001, per) for m in tones)
            a = np.minimum(1, np.arange(per) / (0.05 * SR)) * np.minimum(1, (per - np.arange(per)) / (0.05 * SR))
            L[bar * per : (bar + 1) * per] += l * a
            R[bar * per : (bar + 1) * per] += r * a
        cut = 700 if dark else 2600
        return np.stack([lp(L, cut), lp(R, cut)], 1) * 0.12

    def riser(self, bars):
        return stereo(riser(self.rng, bars * self.bar) * 0.9, 0.3)

    def revcym(self, bars):
        c = crash(self.rng)
        n = self.n(bars)
        c = np.pad(c, (0, max(0, n - len(c))))[:n][::-1]
        return stereo(c * 0.7 * np.linspace(0.2, 1, n), 0.4)


def save(path, x):
    peak = np.max(np.abs(x)) or 1.0
    if peak > 0.98:
        x = x * (0.98 / peak)
    write_wav(path, x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=".stems")
    ap.add_argument("--moods", default="energetic,warm,corporate,luxury")
    ap.add_argument("--bpms", default="90,110,128")
    a = ap.parse_args()
    t0 = time.time()
    manifest = {"sr": SR, "stems": {}}
    for mood in a.moods.split(","):
        # one-shots (tempo-independent)
        s = Stems(mood, 110)
        d = os.path.join(a.out, mood)
        os.makedirs(d, exist_ok=True)
        rng = np.random.default_rng(11)
        oneshots = {
            "impact": stereo(impact(rng) * 0.9, 0.2),
            "subdrop": stereo(sub_drop() * 0.9),
            "crash": stereo(crash(rng) * 0.7, 0.4),
            "whoosh": stereo(whoosh(rng, 0.45) * 0.8, 0.5),
            "pop": stereo(pop_sfx() * 0.8),
            "click": stereo(click_sfx(rng) * 0.7),
            "snap": stereo(snap(rng) * 0.7),
        }
        for name, x in oneshots.items():
            save(os.path.join(d, f"{name}.wav"), x)
        for bpm in [int(b) for b in a.bpms.split(",")]:
            s = Stems(mood, bpm)
            db = os.path.join(d, str(bpm))
            os.makedirs(db, exist_ok=True)
            stems = {
                "drums_full": s.drums(1),
                "drums_half": s.drums(1, half=True),
                "hats": s.drums(1, hats_only=True),
                "build_1": s.build(1),
                "build_2": s.build(2),
                "build_4": s.build(4),
                "bass": s.bass(4),
                "lead": s.lead_loop(4),
                "lead_big": s.lead_loop(4, big=True),
                "pad": s.pad(4),
                "pad_dark": s.pad(4, dark=True),
                "riser_1": s.riser(1),
                "riser_2": s.riser(2),
                "riser_4": s.riser(4),
                "revcym_1": s.revcym(1),
                "revcym_2": s.revcym(2),
            }
            for name, x in stems.items():
                save(os.path.join(db, f"{name}.wav"), x)
            manifest["stems"][f"{mood}/{bpm}"] = {k: round(len(v) / SR, 4) for k, v in stems.items()}
        print(f"{mood}: done ({time.time() - t0:.1f}s)", flush=True)
    with open(os.path.join(a.out, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"stems → {a.out} in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
