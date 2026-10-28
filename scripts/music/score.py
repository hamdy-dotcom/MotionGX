"""
Per-video score + SFX from a video's energy map (MotionGX Phase 3B).

  .venv/bin/python scripts/music/score.py --energy energy.json --events sfx.json --mood energetic --seed 7 --out-dir out/dir

energy.json: {"bpm":110,"length_s":30,"sections":[{"name","kind":"intro|build|drop|breakdown|outro","start_s","end_s","energy"}],"hits":[{"t","kind":"drop|impact|reveal|logo|cta"}]}
sfx.json:    {"sfx":[{"t":1.2,"kind":"whoosh|pop|click|riser|impact"}]}

Writes music.wav, sfx.wav, mix.wav (music+sfx, -14 LUFS, limiter at -1 dBFS) and report.json.
Everything is synthesized procedurally (no samples, no licensing).
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from generate import (  # noqa: E402  (DSP primitives from the library generator)
    SR, MOOD_HARMONY, PROGRESSIONS, bell, bp, clap, crash, env_exp, hat, hp, impact, kick, lp, note, pluck,
    riser, saw, shaker, sine, snare, supersaw, sweep_filter, whoosh, write_wav,
)

# ── extra voices ───────────────────────────────────────
def bass808(freq, seconds, drive=2.2):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 1.0 * np.exp(-t / 0.03))  # pitch drop into the note
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.55)
    return lp(np.tanh(x * drive) / np.tanh(drive), 380)


def snap(rng):
    n = int(0.12 * SR)
    burst = bp(rng.standard_normal(n), 1800, 5200) * env_exp(n, 0.012)
    return burst * 1.6


def sub_drop(seconds=0.9):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    f = 30 + 55 * np.exp(-t / 0.25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.45)


def pop_sfx():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = 220 + 900 * np.exp(-t / 0.012)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.03)


def click_sfx(rng):
    n = int(0.025 * SR)
    return (hp(rng.standard_normal(n), 3000) * env_exp(n, 0.003) * 0.8 + sine(2200, n) * env_exp(n, 0.006) * 0.5)


def lead(freq, seconds, kind):
    n = int(seconds * SR)
    if kind == "bell":
        return bell(freq, n) * 0.9
    if kind == "pluck":
        return pluck(freq, n)
    x = supersaw(freq, n, voices=5, detune=0.12) * 0.7 + saw(freq * 2, n) * 0.15
    e = np.minimum(1, np.arange(n) / 80) * env_exp(n, 0.22)
    return lp(x, 5200) * e


PALETTES = {
    "energetic": {"lead": "saw", "kick_punch": 1.8, "bass_drive": 2.6, "clap": "clap", "half_time": False},
    "warm": {"lead": "pluck", "kick_punch": 1.3, "bass_drive": 1.6, "clap": "snap", "half_time": False},
    "corporate": {"lead": "pluck", "kick_punch": 1.5, "bass_drive": 1.8, "clap": "clap", "half_time": False},
    "luxury": {"lead": "bell", "kick_punch": 1.4, "bass_drive": 2.0, "clap": "snap", "half_time": True},
}


class Score:
    def __init__(self, energy, mood, seed):
        self.bpm = float(energy["bpm"])
        self.beat = 60.0 / self.bpm
        self.length = float(energy["length_s"])
        self.n = int(round(self.length * SR))
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)
        self.mood = mood
        self.pal = PALETTES[mood]
        self.prog = PROGRESSIONS[MOOD_HARMONY[mood]]
        self.root = 45 if MOOD_HARMONY[mood] != "major" else 48
        self.sections = energy["sections"]
        self.hits = energy["hits"]

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or i + len(sig) <= 0:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        sig = sig[: self.n - i]
        l = np.sqrt(0.5 * (1 - pan)) * 1.414
        r = np.sqrt(0.5 * (1 + pan)) * 1.414
        self.L[i : i + len(sig)] += sig * gain * l
        self.R[i : i + len(sig)] += sig * gain * r

    def chord(self, t):
        bar = int((t / self.beat) // 4)
        r, tones = self.prog[bar % len(self.prog)]
        return self.root + r, [self.root + 12 + x for x in tones]

    def beats_in(self, s0, s1, step=1.0):
        b0 = np.ceil(s0 / self.beat - 1e-6)
        b = b0
        while b * self.beat < s1 - 1e-6:
            yield b * self.beat
            b += step

    # ── section renderers ──
    def pad(self, s0, s1, cutoff0, cutoff1, gain):
        n = int((s1 - s0) * SR)
        if n <= 0:
            return
        _, tones = self.chord(s0)
        l = sum(sine(note(m) * 0.998, n) + 0.35 * saw(note(m), n) * 0.3 for m in tones)
        r = sum(sine(note(m) * 1.002, n, 0.6) + 0.35 * saw(note(m) * 1.001, n) * 0.3 for m in tones)
        l = sweep_filter(l, cutoff0, cutoff1, "low") if cutoff1 != cutoff0 else lp(l, cutoff0)
        r = sweep_filter(r, cutoff0, cutoff1, "low") if cutoff1 != cutoff0 else lp(r, cutoff0)
        a = np.minimum(1, np.arange(n) / (0.2 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.05 * SR))
        i = int(s0 * SR)
        k = min(n, self.n - i)
        self.L[i : i + k] += (l * a * gain)[:k]
        self.R[i : i + k] += (r * a * gain)[:k]

    def groove(self, s0, s1, energy, big=False):
        rng = self.rng
        half = self.pal["half_time"]
        g = 0.55 + 0.45 * energy
        for t in self.beats_in(s0, s1):
            bi = int(round(t / self.beat))
            if not half or bi % 2 == 0:
                self.add(kick(rng, punch=self.pal["kick_punch"]), t, 0.95 * g)
            if bi % 2 == 1:
                self.add(clap(rng) if self.pal["clap"] == "clap" else snap(rng), t, 0.5 * g)
            for s in range(2 if half else 4):
                self.add(hat(rng), t + s * self.beat / (2 if half else 4), (0.3 if s % 2 else 0.18) * g, pan=0.25)
            root, tones = self.chord(t)
            if bi % (2 if half else 1) == 0:
                self.add(bass808(note(root - 12), self.beat * (1.8 if half else 0.9), self.pal["bass_drive"]), t, 0.65 * g)
            # bright hook: 2 notes per beat from the chord, octave up on the big drop
            for k in range(2):
                m = tones[(bi * 2 + k) % len(tones)] + (24 if big else 12)
                self.add(lead(note(m), self.beat * 0.45, self.pal["lead"]), t + k * self.beat / 2, (0.12 if self.pal["lead"] == "saw" else 0.16) * g * (1.25 if big else 1), pan=-0.2 if k else 0.2)
        self.pad(s0, s1, 2200, 2200, 0.05 * g)

    def render(self):
        rng = self.rng
        sec = self.sections
        cta_t = max([h["t"] for h in self.hits if h["kind"] == "cta"], default=None)
        for i, s in enumerate(sec):
            s0, s1, e, kind = s["start_s"], s["end_s"], float(s.get("energy", 0.5)), s["kind"]
            if kind == "intro":
                self.pad(s0, s1, 500, 900 + 1500 * e, 0.16)
                for t in self.beats_in(s0, s1, 0.5):
                    self.add(hat(rng) if self.mood != "warm" else shaker(rng), t, 0.16 + 0.1 * e, pan=0.2)
                if e > 0.45:
                    for t in self.beats_in(s0, s1):
                        self.add(kick(rng, punch=1.2), t, 0.35)
            elif kind == "build":
                self.pad(s0, s1, 400, 6500, 0.18)  # filter sweep
                for t in self.beats_in(s0, s1):
                    self.add(kick(rng, punch=self.pal["kick_punch"]), t, 0.6)
                    root, _ = self.chord(t)
                    self.add(bass808(note(root - 12), self.beat * 0.5, 1.6), t, 0.35)
                # snare roll accelerating over the last 2 beats
                roll0 = max(s0, s1 - 2 * self.beat)
                k = 0
                for t in np.arange(roll0, s1 - 1e-6, self.beat / 4):
                    self.add(snare(rng) if self.mood == "luxury" else clap(rng), t, 0.12 + 0.03 * k)
                    k += 1
                self.add(riser(rng, s1 - s0), s0, 0.85)
            elif kind == "drop":
                big = cta_t is not None and s0 - 0.01 <= cta_t <= s1 + 0.01
                self.groove(s0, s1, max(e, 0.75), big=big)
                prev = sec[i - 1]["kind"] if i > 0 else None
                if prev != "build" and s0 > 0.5:  # a riser into every drop
                    span = min(2 * self.beat, s0)
                    self.add(riser(rng, span), s0 - span, 0.8)
                self.add(crash(rng), s0, 0.6 if not big else 0.85)
            elif kind == "breakdown":
                # near silence / half-time: low pad + one soft lead note per bar
                self.pad(s0, s1, 900, 500, 0.14)
                for t in self.beats_in(s0, s1, 4.0):
                    _, tones = self.chord(t)
                    self.add(lead(note(tones[0] + 12), self.beat * 2, "bell"), t, 0.08)
            elif kind == "outro":
                self.groove(s0, s1, e * 0.8)
        # hits: impact + sub drop; logo and cta are the biggest
        for h in self.hits:
            gain = {"cta": 1.0, "logo": 0.9, "drop": 0.85, "impact": 0.7, "reveal": 0.6}[h["kind"]]
            self.add(impact(rng), h["t"], 0.75 * gain)
            self.add(sub_drop(), h["t"], 0.8 * gain)
        # clean ending: silence the last 30 ms after a short release so the track ends on the last frame
        end_fade = int(0.35 * SR)
        fade = np.ones(self.n)
        fade[-end_fade:] = np.linspace(1, 0, end_fade) ** 2
        self.L *= fade
        self.R *= fade
        return np.stack([self.L, self.R], 1)


def render_sfx(events, hits, length, seed):
    rng = np.random.default_rng(seed + 1000)
    n = int(round(length * SR))
    out = np.zeros((n, 2))

    def put(sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= n:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        sig = sig[: n - i]
        out[i : i + len(sig), 0] += sig * gain * np.sqrt(0.5 * (1 - pan)) * 1.414
        out[i : i + len(sig), 1] += sig * gain * np.sqrt(0.5 * (1 + pan)) * 1.414

    for e in events:
        t, kind = float(e["t"]), e["kind"]
        if kind == "whoosh":
            w = whoosh(rng, 0.45)
            put(w, t - 0.38, 0.8, pan=(rng.random() - 0.5) * 0.6)  # peaks on the transition
        elif kind == "pop":
            put(pop_sfx(), t, 0.5, pan=(rng.random() - 0.5) * 0.4)
        elif kind == "click":
            put(click_sfx(rng), t, 0.45)
        elif kind == "riser":
            put(riser(rng, 1.0), t - 1.0, 0.5)
        elif kind == "impact":
            put(impact(rng)[: int(0.8 * SR)], t, 0.5)
    for h in hits:
        if h["kind"] == "logo":
            put(impact(rng)[: int(0.9 * SR)], h["t"], 0.55)
    return out


# ── loudness (ITU-R BS.1770-4) ─────────────────────────
def _biquad(b, a, x):
    from scipy.signal import lfilter
    return lfilter(b, a, x)


def k_weight(x):
    # pyloudnorm-style RBJ designs at the actual sample rate
    def shelf(G=4.0, Q=1 / np.sqrt(2), fc=1500.0):
        A = 10 ** (G / 40)
        w0 = 2 * np.pi * fc / SR
        alpha = np.sin(w0) / (2 * Q)
        b0 = A * ((A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
        b1 = -2 * A * ((A - 1) + (A + 1) * np.cos(w0))
        b2 = A * ((A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
        a1 = 2 * ((A - 1) - (A + 1) * np.cos(w0))
        a2 = (A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha
        return np.array([b0, b1, b2]) / a0, np.array([1, a1 / a0, a2 / a0])

    def highpass(Q=0.5, fc=38.0):
        w0 = 2 * np.pi * fc / SR
        alpha = np.sin(w0) / (2 * Q)
        b = np.array([(1 + np.cos(w0)) / 2, -(1 + np.cos(w0)), (1 + np.cos(w0)) / 2])
        a = np.array([1 + alpha, -2 * np.cos(w0), 1 - alpha])
        return b / a[0], a / a[0]

    b1, a1 = shelf()
    b2, a2 = highpass()
    return _biquad(b2, a2, _biquad(b1, a1, x))


def lufs(stereo):
    k = np.stack([k_weight(stereo[:, c]) for c in range(stereo.shape[1])], 1)
    block, step = int(0.4 * SR), int(0.1 * SR)
    zs = []
    for s in range(0, len(k) - block + 1, step):
        zs.append(np.mean(k[s : s + block] ** 2, axis=0))
    zs = np.array(zs)
    if not len(zs):
        return -70.0
    l = -0.691 + 10 * np.log10(np.sum(zs, axis=1) + 1e-12)
    zs = zs[l > -70]
    l = l[l > -70]
    if not len(zs):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.sum(np.mean(zs, axis=0)) + 1e-12) - 10
    zs = zs[l > rel]
    return float(-0.691 + 10 * np.log10(np.sum(np.mean(zs, axis=0)) + 1e-12))


def limit(stereo, ceiling_db=-1.0, lookahead_ms=5.0, release_ms=60.0):
    ceiling = 10 ** (ceiling_db / 20)
    peak = np.max(np.abs(stereo), axis=1)
    la = int(lookahead_ms / 1000 * SR)
    # running max over the lookahead window (applied ahead of the sample)
    from scipy.ndimage import maximum_filter1d
    env = maximum_filter1d(peak, size=2 * la + 1)
    gain = np.minimum(1.0, ceiling / np.maximum(env, 1e-9))
    # smooth: instant attack, exponential release
    rel = np.exp(-1.0 / (release_ms / 1000 * SR))
    g = np.empty_like(gain)
    cur = 1.0
    for i in range(len(gain)):
        cur = gain[i] if gain[i] < cur else rel * cur + (1 - rel) * gain[i]
        g[i] = cur
    out = stereo * g[:, None]
    return np.clip(out, -ceiling, ceiling)


def master(stereo, target=-14.0):
    stereo = hp(stereo.T, 28).T
    for _ in range(3):
        cur = lufs(stereo)
        stereo = limit(stereo * 10 ** ((target - cur) / 20))
    return stereo, lufs(stereo), float(np.max(np.abs(stereo)))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--energy", required=True)
    ap.add_argument("--events", default=None)
    ap.add_argument("--mood", default="energetic", choices=list(PALETTES))
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args()
    energy = json.load(open(a.energy))
    events = json.load(open(a.events))["sfx"] if a.events and os.path.exists(a.events) else []
    os.makedirs(a.out_dir, exist_ok=True)

    music = Score(energy, a.mood, a.seed).render()
    sfx = render_sfx(events, energy["hits"], energy["length_s"], a.seed)
    music_m, music_lufs, music_peak = master(music)
    sfx_m, sfx_lufs, _ = master(sfx, target=-20.0) if np.any(sfx) else (sfx, -70.0, 0.0)
    mix_m, mix_lufs, mix_peak = master(music + sfx * 0.8)

    write_wav(os.path.join(a.out_dir, "music.wav"), music_m)
    write_wav(os.path.join(a.out_dir, "sfx.wav"), sfx_m)
    write_wav(os.path.join(a.out_dir, "mix.wav"), mix_m)
    report = {"length_s": energy["length_s"], "samples": int(len(mix_m)), "mix_lufs": round(mix_lufs, 2), "mix_peak_dbfs": round(20 * np.log10(mix_peak + 1e-12), 2), "music_lufs": round(music_lufs, 2), "sfx_events": len(events)}
    json.dump(report, open(os.path.join(a.out_dir, "report.json"), "w"), indent=1)
    print(json.dumps(report))
