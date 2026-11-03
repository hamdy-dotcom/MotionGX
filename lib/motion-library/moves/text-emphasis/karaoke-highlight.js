// Karaoke highlight: every word sits in its base colour; at the moment it is spoken the word lights in the accent —
// instantly (speed ≈ 0.06 s, the loud karaoke caption) or over 0.25 s power2.out (the calm paper look) — and the
// previous word goes back to base over 0–0.4 s (or stays lit). Optional marks on the lit word: a thin underline that
// draws from its reading-start edge (scaleX 0 → 1, 0.35 s power3.out), a small accent dot before it pulsing 1 → 1.6 → 1,
// or a scale pop to 1.06. One word lit at a time; the last word can keep its light. Whole words only, so Arabic is
// safe; the underline and dot follow the reading direction.
// Source: MengTo/Skills light-mode-paper-technical SKILL.md (MIT) — the paper "active word" treatment; and the
// prompt-motion reference emollick-how-do-you-explain (karaoke captions) — our own code.
ML.define({
  id: "text-emphasis.karaoke-highlight",
  category: "text-emphasis",
  name: "Active word highlight moves with the voice",
  does: "Only the word being spoken is lit — in the accent, with an optional underline, dot or pop — and the light passes to the next word.",
  says: ["focus", "energy", "story", "precision"],
  energy: 3,
  targets: ["word", "headline", "line"],
  duration: [1, 8],
  params: {
    colour: { type: "text", default: "accent" },
    speed: { type: "number", range: [0, 0.3], default: 0.06, unit: "s" },
    mark: { type: "choice", options: ["colour", "underline", "dot", "pop"], default: "colour" },
    pop: { type: "number", range: [1, 1.12], default: 1.06 },
    stays: { type: "bool", default: false },
    "last-stays": { type: "bool", default: true },
    sync: { type: "choice", options: ["spoken", "stagger"], default: "spoken" },
  },
  pairs: ["text-in.punchline", "text-emphasis.highlight-sweep"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/light-mode-paper-technical/SKILL.md", license: "MIT", note: "also prompt-motion:emollick-how-do-you-explain (reference); our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    const words = ML.split(el, "words");
    const n = words.length;
    if (!n) return null;
    const c = col(p.colour, "accent");
    const base = getComputedStyle(el).color;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    // when each word is spoken: the voice, else a steady pace across the run
    const span = Math.max(0.4, end - at - 0.4), stepT = span / n;
    const seen = new Map();
    const times = words.map((w, i) => {
      const fb = at + i * stepT;
      if (p.sync !== "spoken") return fb;
      const q = ML.plain(w.textContent), k = (seen.get(q) || 0) + 1; seen.set(q, k);
      return Math.max(at, ctx.word(w.textContent, fb, k));
    });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.08);
    const up = Math.max(0.001, p.speed), down = p.speed > 0.12 ? 0.4 : 0.06;
    // marks
    const marks = words.map((w) => {
      w.style.position = "relative";
      w.style.transformOrigin = "50% 60%";
      if (p.mark === "underline") {
        const m = document.createElement("span");
        Object.assign(m.style, { position: "absolute", left: "0", right: "0", bottom: (-0.04 * fs).toFixed(2) + "px", height: Math.max(2, fs * 0.045).toFixed(2) + "px", background: c, transformOrigin: rtl ? "100% 50%" : "0% 50%", scale: "0 1", pointerEvents: "none" });
        w.append(m); return m;
      }
      if (p.mark === "dot") {
        const d = Math.max(6, fs * 0.11), m = document.createElement("span");
        Object.assign(m.style, { position: "absolute", top: "50%", width: d + "px", height: d + "px", marginTop: -d / 2 + "px", borderRadius: "50%", background: c, scale: "0", pointerEvents: "none" });
        m.style[rtl ? "right" : "left"] = (-d * 1.6).toFixed(2) + "px";
        w.append(m); return m;
      }
      return null;
    });
    // it runs under a voice: a tick on every word would chatter, so one every few words
    times.forEach((tt, i) => i % 4 === 0 && ctx.sfx(tt, "tap", 0.15));
    return {
      draw(t) {
        words.forEach((w, i) => {
          const on = t < times[i] ? 0 : p.speed < 0.005 ? 1 : p.speed > 0.12 ? ML.out(t, times[i], times[i] + up) : ML.lin(t, times[i], times[i] + up);
          const last = i === n - 1;
          const keep = p.stays || (last && p["last-stays"]);
          const next = last ? end - 0.2 : times[i + 1];
          const off = keep ? 0 : ML.lin(t, next, next + down);
          const h = on * (1 - off);
          w.style.color = h > 0.001 ? `color-mix(in srgb, ${c} ${(h * 100).toFixed(1)}%, ${base})` : "";
          w.style.scale = p.mark === "pop" && h > 0.001 ? (1 + (p.pop - 1) * h).toFixed(4) : "none";
          const m = marks[i];
          if (!m) return;
          if (p.mark === "underline") {
            const d = t < times[i] ? 0 : 1 - Math.pow(1 - ML.lin(t, times[i], times[i] + 0.35), 3);
            m.style.scale = `${(d * (1 - off)).toFixed(4)} 1`;
          } else {
            const pu = t < times[i] ? 0 : Math.sin(Math.PI * ML.lin(t, times[i], times[i] + 0.4));
            m.style.scale = (h * (1 + 0.6 * pu)).toFixed(4);
          }
        });
      },
    };
  },
});
