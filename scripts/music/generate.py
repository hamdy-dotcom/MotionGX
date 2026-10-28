"""
MotionGX music generator — ported and generalized from the motion-kit `make_beat.py`.

Every track is built on a strict beat grid (the video cuts on the same grid):
  bars 0-1   hook      impact on beat 0, filtered pad, hats
  bars 2-3   build     kick + bass, riser into bar 4
  bar  4     DROP      full groove, crash + whoosh every 4 bars
  middle     breakdown 2 bars + riser, then DROP 2
  end        final hit on the last full bar, pad rings out to the track length

Moods
  energetic  minor, supersaw stabs + arp, four-on-the-floor
  warm       major, soft keys + pluck melody, half-time groove, shaker
  corporate  major, piano plucks in 8ths, light four-on-the-floor, offbeat open hats
  luxury     minor 7ths, sub bass + bells, half-time, sparse

Usage
  .venv/bin/python scripts/music/generate.py --bpm 110 --key A --mood energetic --length 70 --seed 1 --out track.wav
  .venv/bin/python scripts/music/generate.py --library --out-dir scripts/music/out
"""
import argparse
import json
import os
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
PACE_BPM = {"calm": 90, "medium": 110, "fast": 128}
MOODS = ["energetic", "warm", "corporate", "luxury"]
KEYS = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}

# Chord progressions as scale-degree triads/7ths, semitones above the key root.
PROGRESSIONS = {
    # i – VI – III – VII
    "minor": [(0, [0, 3, 7]), (-4, [-4, 0, 3]), (3, [3, 7, 10]), (-2, [-2, 2, 5])],
    # I – V – vi – IV
    "major": [(0, [0, 4, 7]), (7, [7, 11, 14]), (9, [9, 12, 16]), (5, [5, 9, 12])],
    # i7 – VImaj7 – iv7 – v7
    "minor7": [(0, [0, 3, 7, 10]), (-4, [-4, 0, 3, 7]), (5, [5, 8, 12, 15]), (7, [7, 10, 14, 17])],
}
MOOD_HARMONY = {"energetic": "minor", "warm": "major", "corporate": "major", "luxury": "minor7"}


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Track:
    def __init__(self, bpm, key, mood, length, seed):
        self.bpm = bpm
        self.beat = 60 / bpm
        self.length = length
        self.n = int(SR * length)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)
        self.seed = seed
        self.mood = mood
        # Minor moods sit on an A-ish root, major moods on C-ish; `key` shifts it.
        base = 45 if MOOD_HARMONY[mood] != "major" else 48
        self.root = base + ((KEYS[key] - (9 if base == 45 else 0)) % 12)
        if self.root > base + 6:
            self.root -= 12
        self.prog = PROGRESSIONS[MOOD_HARMONY[mood]]

    # ── buffer helpers ──────────────────────────────────
    def idx(self, beat):
        return int(round(beat * self.beat * SR))

    def add(self, sig, beat, gain=1.0, pan=0.0):
        i = self.idx(beat)
        if i >= self.n:
            return
        sig = sig[: self.n - i]
        l = np.sqrt(0.5 * (1 - pan))
        r = np.sqrt(0.5 * (1 + pan))
        self.L[i : i + len(sig)] += sig * gain * l * 1.414
        self.R[i : i + len(sig)] += sig * gain * r * 1.414

    def add_st(self, sl, sr_, beat, gain=1.0):
        i = self.idx(beat)
        if i >= self.n:
            return
        k = min(len(sl), self.n - i)
        self.L[i : i + k] += sl[:k] * gain
        self.R[i : i + k] += sr_[:k] * gain

    def chord_at(self, beat):
        root, tones = self.prog[int(beat // 4) % len(self.prog)]
        return self.root + root, [self.root + 12 + t for t in tones]


# ── DSP primitives (from make_beat.py) ─────────────────
def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_filter(x, f0, f1, kind="low", block=1024):
    out = np.zeros_like(x)
    n = len(x)
    for s in range(0, n, block):
        frac = s / max(n - 1, 1)
        fc = f0 * (f1 / f0) ** frac
        seg = x[max(0, s - 2048) : s + block]
        y = (lp if kind == "low" else hp)(seg, fc)
        out[s : s + block] = y[-len(x[s : s + block]) :]
    return out


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1) - 1


def supersaw(freq, n, voices=7, detune=0.18, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(n)
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
        out += saw(freq * 2 ** (d / 12), n, r.random())
    return out / voices


def sine(freq, n, phase=0.0):
    return np.sin(2 * np.pi * freq * np.arange(n) / SR + phase)


# ── drums ──────────────────────────────────────────────
def kick(rng, punch=1.6, tail=0.16):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 120 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, tail)
    click = hp(rng.standard_normal(n), 3000) * env_exp(n, 0.004) * 0.4
    return np.tanh((body + click) * punch)


def clap(rng):
    n = int(0.3 * SR)
    out = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        m = n - i
        out[i:] += rng.standard_normal(m) * env_exp(m, 0.012 if k < 2 else 0.09)
    return bp(out, 900, 4500) * 1.4


def snare(rng):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * env_exp(n, 0.05)
    noise = bp(rng.standard_normal(n), 1500, 8000) * env_exp(n, 0.08)
    return np.tanh((tone * 0.7 + noise) * 1.3)


def hat(rng, open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    return hp(rng.standard_normal(n), 7500, 4) * env_exp(n, 0.07 if open_ else 0.014) * 0.55


def shaker(rng):
    n = int(0.09 * SR)
    a = np.minimum(1, np.arange(n) / (0.02 * SR))
    return bp(rng.standard_normal(n), 5000, 12000) * a * env_exp(n, 0.03) * 0.5


def impact(rng):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t / 0.08)) * t) * env_exp(n, 0.55)
    crash_ = hp(rng.standard_normal(n), 3500) * env_exp(n, 0.6) * 0.35
    return np.tanh(boom * 1.4 + crash_)


def crash(rng):
    n = int(1.6 * SR)
    return hp(rng.standard_normal(n), 5000, 3) * env_exp(n, 0.45) * 0.35


def whoosh(rng, dur=0.5):
    n = int(dur * SR)
    y = sweep_filter(rng.standard_normal(n), 9000, 600, "low")
    return y * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.5


def riser(rng, seconds):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    noise = sweep_filter(rng.standard_normal(n), 400, 9000, "low") * 0.35
    f = 200 * (8 ** (t / t[-1]))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12
    return (noise + tone) * (t / t[-1]) ** 2


# ── instruments ────────────────────────────────────────
def pad_bar(tr, beat, beats=4, cutoff=1200, gain=0.22, soft=False):
    n = int(beats * tr.beat * SR)
    _, tones = tr.chord_at(beat)
    voices = tones + [tones[0] + 12]
    if soft:  # warm/luxury: detuned sines, slow attack
        l = sum(sine(note(m) * 0.998, n) + 0.4 * sine(note(m) * 2.001, n) for m in voices)
        r = sum(sine(note(m) * 1.002, n, 0.7) + 0.4 * sine(note(m) * 1.999, n, 0.3) for m in voices)
        a = np.minimum(1, np.arange(n) / (0.35 * SR))
        gain *= 0.5
    else:
        l = sum(supersaw(note(m), n, seed=m + tr.seed) for m in voices)
        r = sum(supersaw(note(m), n, seed=m + 99 + tr.seed) for m in voices)
        a = np.minimum(1, np.arange(n) / (0.08 * SR))
    release = np.minimum(1, (n - np.arange(n)) / (0.05 * SR))
    tr.add_st(lp(l, cutoff) * a * release * gain, lp(r, cutoff) * a * release * gain, beat)


def stab(tr, beat, cutoff=4200, gain=0.16, length=0.38):
    n = int(length * SR)
    _, tones = tr.chord_at(beat)
    l = sum(supersaw(note(m + 12), n, seed=m) for m in tones)
    r = sum(supersaw(note(m + 12), n, seed=m + 50) for m in tones)
    e = env_exp(n, 0.12)
    tr.add_st(lp(l, cutoff) * e * gain, lp(r, cutoff) * e * gain, beat)


def bass_note(tr, beat, length_beats=0.5, gain=0.5, sub=False):
    root, _ = tr.chord_at(beat)
    n = int(length_beats * tr.beat * SR)
    f = note(root - 12)
    x = sine(f, n) if sub else saw(f, n) * 0.6 + sine(f, n) * 0.6
    e = np.minimum(1, np.arange(n) / 200) * (env_exp(n, 0.6) if sub else env_exp(n, 0.18))
    tr.add(lp(x, 260 if sub else 520) * e, beat, gain)


def pluck(freq, n):
    """Piano-ish pluck: a few decaying harmonics."""
    x = sum(sine(freq * h, n) * (0.6 / h) * env_exp(n, 0.5 / h) for h in (1, 2, 3, 4))
    return x * np.minimum(1, np.arange(n) / 60)


def bell(freq, n):
    mod = sine(freq * 3.5, n) * 2.2 * env_exp(n, 0.4)
    return np.sin(2 * np.pi * freq * np.arange(n) / SR + mod) * env_exp(n, 0.9)


def arp(tr, beat, gain=0.11, pan=0.0, pattern=(0, 1, 2, 1, 3, 2, 1, 2)):
    _, tones = tr.chord_at(beat)
    seq = tones[:3] + [tones[0] + 12]
    for k in range(8):  # 16ths over 2 beats
        m = seq[pattern[k] % len(seq)] + 12
        n = int(0.22 * SR)
        x = np.sign(sine(note(m), n)) * 0.5 + saw(note(m), n) * 0.5
        tr.add(lp(x, 3200) * env_exp(n, 0.06), beat + k * 0.25, gain, pan)


def keys_8ths(tr, beat, gain=0.10, pattern=(0, 2, 1, 2, 0, 2, 1, 3)):
    _, tones = tr.chord_at(beat)
    seq = tones[:3] + [tones[0] + 12]
    for k in range(8):  # 8ths over 4 beats
        m = seq[pattern[k] % len(seq)]
        n = int(0.5 * SR)
        tr.add(pluck(note(m), n), beat + k * 0.5, gain, pan=0.25 if k % 2 else -0.25)


def melody_phrase(tr, beat, gain=0.09, instrument=pluck):
    """Short pentatonic motif over 4 beats — the 'hook' of warm/luxury tracks."""
    root, _ = tr.chord_at(beat)
    scale = [0, 3, 5, 7, 10] if MOOD_HARMONY[tr.mood] != "major" else [0, 2, 4, 7, 9]
    rhythm = [0, 0.75, 1.5, 2.5, 3.0] if tr.rng.random() > 0.5 else [0, 1, 1.5, 2, 3]
    for k, off in enumerate(rhythm):
        deg = scale[int(tr.rng.integers(0, len(scale)))]
        m = tr.root + 24 + deg
        n = int(0.6 * SR)
        tr.add(instrument(note(m), n), beat + off, gain, pan=0.15 * (1 if k % 2 else -1))


# ── grooves per mood ───────────────────────────────────
def groove(tr, b0, b1, intensity=1.0):
    rng = tr.rng
    mood = tr.mood
    for b in np.arange(b0, b1, 1.0):
        ib = int(b)
        if mood in ("energetic", "corporate"):
            tr.add(kick(rng), b, 0.95 * intensity if mood == "energetic" else 0.75 * intensity)
            if ib % 2 == 1:
                tr.add(clap(rng), b, 0.55 if mood == "energetic" else 0.45)
            if mood == "energetic":
                for s in range(4):
                    tr.add(hat(rng), b + s * 0.25, 0.35 if s % 2 else 0.22, pan=0.25)
                tr.add(hat(rng, True), b + 0.5, 0.22, pan=-0.25)
                bass_note(tr, b + 0.5, 0.5, 0.55)
                bass_note(tr, b + 0.75, 0.25, 0.35)
                if ib % 2 == 0:
                    arp(tr, b, 0.09, pan=-0.3 if ib % 4 == 0 else 0.3)
            else:
                tr.add(hat(rng, True), b + 0.5, 0.2, pan=0.2)
                tr.add(hat(rng), b + 0.25, 0.15, pan=-0.2)
                bass_note(tr, b, 0.5, 0.45)
                bass_note(tr, b + 0.5, 0.5, 0.35)
        elif mood == "warm":
            if ib % 4 in (0, 2):
                tr.add(kick(rng, punch=1.2, tail=0.2), b, 0.7 * intensity)
            if ib % 4 == 2:
                tr.add(snare(rng), b, 0.32)
            for s in range(2):
                tr.add(shaker(rng), b + s * 0.5, 0.3 if s else 0.18, pan=0.3)
            if ib % 2 == 0:
                bass_note(tr, b, 1.5, 0.45, sub=True)
        else:  # luxury
            if ib % 4 == 0:
                tr.add(kick(rng, punch=1.3, tail=0.3), b, 0.8 * intensity)
            if ib % 4 == 2:
                tr.add(snare(rng), b, 0.28)
            tr.add(hat(rng), b + 0.5, 0.14, pan=0.35)
            if ib % 4 == 0:
                bass_note(tr, b, 3.5, 0.55, sub=True)

    for b in range(int(b0), int(b1), 4):
        if mood == "energetic":
            stab(tr, b, gain=0.13)
            stab(tr, b + 1.5, gain=0.10)
            stab(tr, b + 3, gain=0.10)
            pad_bar(tr, b, 4, cutoff=2600, gain=0.14)
        elif mood == "corporate":
            keys_8ths(tr, b, 0.12)
            pad_bar(tr, b, 4, cutoff=1800, gain=0.10, soft=True)
        elif mood == "warm":
            pad_bar(tr, b, 4, cutoff=1500, gain=0.22, soft=True)
            if (b // 4) % 2 == 1:
                melody_phrase(tr, b, 0.10, pluck)
        else:
            pad_bar(tr, b, 4, cutoff=1100, gain=0.26, soft=True)
            if (b // 4) % 2 == 0:
                melody_phrase(tr, b, 0.07, bell)


def build(tr, b0, b1):
    rng = tr.rng
    span = b1 - b0
    step = 0.125 if tr.mood == "energetic" else 0.25
    for k, b in enumerate(np.arange(b0, b1, step)):
        tr.add(clap(rng) if tr.mood != "luxury" else snare(rng), b, 0.15 + k * (0.15 / (span / step)))
    tr.add(riser(rng, span * tr.beat), b0, 0.9)


def render(bpm, key, mood, length, seed):
    tr = Track(bpm, key, mood, length, seed)
    rng = tr.rng
    total_beats = length * bpm / 60
    # Music content ends on the last full bar that leaves >= 2.5 s of ring-out.
    end = int(((length - 2.5) * bpm / 60) // 4 * 4)
    mid = int((end * 0.55) // 4 * 4)

    # bars 0-1 hook
    tr.add(impact(rng), 0, 0.55)
    for b in range(0, 8, 4):
        pad_bar(tr, b, 4, cutoff=700, gain=0.2, soft=mood in ("warm", "luxury"))
    for b in np.arange(0, 8, 0.5):
        tr.add(hat(rng) if mood != "warm" else shaker(rng), b, 0.22, pan=0.2)
    for b in (4, 5, 6, 7):
        tr.add(kick(rng), b, 0.32)

    # bars 2-3 build
    for b in np.arange(8, 14, 1.0):
        tr.add(kick(rng), b, 0.5)
        bass_note(tr, b + 0.5, 0.5, 0.3, sub=mood in ("warm", "luxury"))
        tr.add(hat(rng), b + 0.5, 0.25, pan=0.2)
    for b in range(8, 16, 4):
        pad_bar(tr, b, 4, cutoff=900 + (b - 8) * 160, gain=0.18, soft=mood in ("warm", "luxury"))
    build(tr, 14, 16)

    # DROP 1 → breakdown
    tr.add(impact(rng), 16, 0.85)
    groove(tr, 16, mid)
    for c in range(32, mid, 16):
        tr.add(whoosh(rng), c - 1, 0.6)
        tr.add(crash(rng), c, 0.55)

    # breakdown (2 bars) + build, DROP 2
    for b in range(mid, mid + 8, 4):
        pad_bar(tr, b, 4, cutoff=1400, gain=0.22, soft=mood != "energetic")
    for b in np.arange(mid, mid + 6, 1):
        bass_note(tr, b, 1.0, 0.3, sub=True)
    build(tr, mid + 6, mid + 8)
    tr.add(impact(rng), mid + 8, 0.9)
    groove(tr, mid + 8, end)
    for c in range(mid + 24, end, 16):
        tr.add(whoosh(rng), c - 1, 0.6)
        tr.add(crash(rng), c, 0.55)

    # final hit on the last full bar, pad rings out
    tr.add(impact(rng), end, 0.8)
    ring_beats = max(2.0, total_beats - end)
    pad_bar(tr, end, ring_beats, cutoff=1600, gain=0.18, soft=True)

    # master
    mix = np.stack([tr.L, tr.R], 1)
    mix = hp(mix.T, 28).T
    mix = np.tanh(mix * 1.15)
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 0.89
    fade_n = int(1.2 * SR)
    fade = np.ones(tr.n)
    fade[-fade_n:] = np.linspace(1, 0, fade_n)
    return mix * fade[:, None]


def write_wav(path, mix):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())


def library(out_dir, length):
    """24 tracks: 3 paces × 4 moods × 2 variations (different key + seed)."""
    manifest = []
    keys = {1: {"energetic": "A", "warm": "C", "corporate": "D", "luxury": "F"}, 2: {"energetic": "E", "warm": "G", "corporate": "A#", "luxury": "C#"}}
    for pace, bpm in PACE_BPM.items():
        for mood in MOODS:
            for variation in (1, 2):
                key = keys[variation][mood]
                seed = bpm * 100 + MOODS.index(mood) * 10 + variation
                name = f"{pace}-{mood}-{variation}"
                path = os.path.join(out_dir, f"{name}.wav")
                write_wav(path, render(bpm, key, mood, length, seed))
                manifest.append({"file": f"{name}.mp3", "pace": pace, "mood": mood, "variation": variation, "bpm": bpm, "key": key, "duration_s": length})
                print("wrote", path, flush=True)
    with open(os.path.join(out_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--bpm", type=int, default=110)
    p.add_argument("--key", default="A", choices=list(KEYS))
    p.add_argument("--mood", default="energetic", choices=MOODS)
    p.add_argument("--length", type=float, default=70.0)
    p.add_argument("--seed", type=int, default=1)
    p.add_argument("--out", default="track.wav")
    p.add_argument("--library", action="store_true")
    p.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "out"))
    a = p.parse_args()
    if a.library:
        library(a.out_dir, a.length)
    else:
        write_wav(a.out, render(a.bpm, a.key, a.mood, a.length, a.seed))
        print("wrote", os.path.abspath(a.out))
