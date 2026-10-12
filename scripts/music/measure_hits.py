"""
Measures where the impacts actually land in a rendered mix, independently of how it was made.

  .venv/bin/python scripts/music/measure_hits.py mix.wav energy.json

For each energy-map hit it searches ±200 ms for the onset of the strongest low-end transient (impact + sub drop):
the first sample whose rise reaches half of the window's maximum and prints expected vs measured time and the offset in ms.
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfiltfilt


def load(path):
    with wave.open(path) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
        x = x.reshape(-1, w.getnchannels()).mean(axis=1)
    return x, sr


def onset_curve(x, sr):
    low = sosfiltfilt(butter(4, 160, "low", fs=sr, output="sos"), x)
    env = np.abs(low)
    win = int(0.004 * sr)
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
        # onset = first sample reaching half of the window's strongest rise (robust to limiter recovery)
        i = a + int(np.argmax(seg >= 0.5 * seg.max())) if seg.max() > 0 else a
        measured = i / sr
        rows.append({"kind": h["kind"], "expected_s": round(t, 3), "measured_s": round(measured, 3), "offset_ms": round((measured - t) * 1000, 1)})
    print(json.dumps(rows))
