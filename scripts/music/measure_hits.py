"""
Measures where the impacts actually land in a rendered mix, independently of how it was made.

  .venv/bin/python scripts/music/measure_hits.py mix.wav energy.json

For each energy-map hit it searches ±200 ms for the onset of the strongest low-end transient (impact + sub drop):
the onset of the strongest rise (from the last quiet point before it, first half-max crossing) and prints
expected vs measured time and the offset in ms.
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, hilbert, sosfiltfilt


def load(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
        x = x.reshape(-1, w.getnchannels()).mean(axis=1)
    return x, sr


def onset_curve(x, sr):
    """Rise of the low-end (< 160 Hz) amplitude envelope. The envelope is the magnitude of the analytic
    signal (Hilbert), which has no per-cycle ripple even for 30–55 Hz 808s / sub drops (rectify-and-
    average turned every wave cycle into a fake "rise"); a short centred 5 ms average then smooths it."""
    low = sosfiltfilt(butter(4, 160, "low", fs=sr, output="sos"), x)
    env = np.abs(hilbert(low))
    win = int(0.005 * sr)
    env = np.convolve(env, np.ones(win) / win, mode="same")
    d = np.diff(env, prepend=env[0])
    return np.maximum(d, 0)


if __name__ == "__main__":
    x, sr = load(sys.argv[1])
    energy = json.load(open(sys.argv[2]))
    curve = onset_curve(x, sr)
    rows = []
    for h in energy["hits"]:
        t = float(h["t"])
        a, b = max(0, int((t - 0.2) * sr)), min(len(curve), int((t + 0.2) * sr))
        seg = curve[a:b]
        # Split the window's rise curve into separate events (runs between quiet points, < 5 % of the
        # window max). Ignore a run already swelling when the window opens (an earlier sound, e.g. a
        # side-chained 808 recovering). The hit = the EARLIEST event at least half as strong as the
        # strongest; its onset = where that event first reaches half of its own peak.
        i = a
        if seg.max() > 0:
            quiet = seg < 0.05 * seg.max()
            k = 0
            n = len(seg)
            while k < n:
                if quiet[k]:
                    k += 1
                    continue
                j = k
                while j < n and not quiet[j]:
                    j += 1
                run = seg[k:j]
                ongoing = k == 0
                if not ongoing and run.max() >= 0.5 * seg.max():
                    i = a + k + int(np.argmax(run >= 0.5 * run.max()))
                    break
                k = j
        measured = i / sr
        rows.append({"kind": h["kind"], "expected_s": round(t, 3), "measured_s": round(measured, 3), "offset_ms": round((measured - t) * 1000, 1)})
    print(json.dumps(rows))
