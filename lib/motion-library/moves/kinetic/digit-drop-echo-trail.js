// Digits drop with echo trails: each digit of a big number falls into place one after another (y −1.7 em → 0 in
// 0.4 s power4.out, a small overshoot past the baseline and settle), dragging a stack of fading ghost copies of itself
// — each ghost is the digit where it was 2, 4, 6… frames earlier, at opacity .5 / .4 / .3 / .2 / .1 and blur 2–6 px —
// that die away 0.2 s after the digit lands. Stagger 0.25 s; "alternate" sends every other digit up from below.
// Arabic: a word is never split, so a word target drops word by word (its letters stay joined).
// Source: prompt-motion:sudiyasa-celerating-100-eyezonbot-users (reference only — our own rebuild).
ML.define({
  id: "kinetic.digit-drop-echo-trail",
  category: "kinetic",
  name: "Digits drop with echo trails",
  does: "Each digit of a big number drops into place leaving a stack of fading ghost copies, one digit after another.",
  says: ["energy", "result", "celebration", "scale"],
  energy: 4,
  targets: ["number", "word"],
  duration: [1, 3],
  params: {
    direction: { type: "choice", options: ["down", "up", "alternate"], default: "down" },
    echoes: { type: "number", range: [2, 8], default: 5 },
    stagger: { type: "number", range: [0.1, 0.4], default: 0.25, unit: "s" },
  },
  pairs: ["data.odometer", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:sudiyasa-celerating-100-eyezonbot-users", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const units = ML.split(el, "chars");
    if (!units.length) return null;
    // a number or Latin word keeps its own order in an RTL film (4,500 never reads 005,4)
    for (const w of el.querySelectorAll(".ml-w")) if (!ML.ARABIC.test(w.textContent || "")) w.style.direction = "ltr";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const N = Math.round(ML.clamp(p.echoes, 2, 8)), FALL = 0.4, FRAME = 1 / 30;
    // every digit has landed and shed its echoes before the run ends, however short the run
    const stag = Math.min(p.stagger, Math.max(0, end - at - 0.3 - FALL - 0.2) / Math.max(1, units.length - 1));
    const dist = fs * 1.7, over = fs * 0.045;
    const items = units.map((u, i) => {
      const txt = u.textContent;
      u.textContent = "";
      Object.assign(u.style, { position: "relative" });
      const main = document.createElement("span");
      main.textContent = txt;
      main.style.display = "inline-block";
      const ghosts = [];
      for (let k = 1; k <= N; k++) {
        const g = document.createElement("span");
        g.textContent = txt;
        g.setAttribute("aria-hidden", "true");
        Object.assign(g.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", whiteSpace: "pre" });
        u.append(g);
        ghosts.push(g);
      }
      u.append(main);
      const sign = p.direction === "up" ? 1 : p.direction === "alternate" && i % 2 === 1 ? 1 : -1; // −1: from above
      const t0 = at + i * stag;
      return { main, ghosts, sign, t0, punct: !/[\p{L}\p{N}]/u.test(txt) };
    });
    // power4.out fall, then a small overshoot past the baseline that settles
    const yAt = (it, t) => {
      const u = ML.lin(t, it.t0, it.t0 + FALL);
      const fall = it.sign * dist * Math.pow(1 - u, 4);
      const o = ML.lin(t, it.t0 + FALL * 0.75, it.t0 + FALL + 0.18);
      return fall - it.sign * over * Math.sin(Math.PI * o) * (1 - o * 0.4);
    };
    let n = 0;
    items.forEach((it) => { if (!it.punct && (n++ % 2 === 0 || it === items[items.length - 1])) ctx.sfx(it.t0 + FALL, "land", 0.35); });
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const it of items) {
          const on = t >= it.t0;
          it.main.style.opacity = on ? ML.lin(t, it.t0, it.t0 + 0.05).toFixed(4) : "0";
          it.main.style.translate = on ? `0 ${yAt(it, t).toFixed(2)}px` : "none";
          const fade = 1 - ML.lin(t, it.t0 + FALL, it.t0 + FALL + 0.2);
          it.ghosts.forEach((g, j) => {
            const k = j + 1, tk = t - k * 2 * FRAME;
            const a = on && tk >= it.t0 ? ((0.6 * (N + 1 - k)) / (N + 1)) * fade : 0;
            g.style.opacity = a.toFixed(4);
            g.style.visibility = a > 0.002 ? "visible" : "hidden";
            g.style.translate = `0 ${yAt(it, Math.max(tk, it.t0)).toFixed(2)}px`;
            g.style.filter = `blur(${(2 + (4 * (k - 1)) / Math.max(1, N - 1)).toFixed(2)}px)`;
          });
        }
      },
    };
  },
});
