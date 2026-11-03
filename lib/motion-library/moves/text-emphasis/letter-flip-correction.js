// Letter flip correction: a word shows with one wrong letter; a thin strike-through draws across it, then the right
// letter rotates in like a split-flap — rotateX 90° → 0 from its bottom edge (or rotate 180° → 0 about its centre),
// 0.35 s back.out — while the wrong one flips away; the neighbours never move and the strike clears. The corrected
// letter can take the accent. Letters are split, so Arabic (whose letters join) is not offered this move.
// Source: prompt-motion:fionntobin-the-new-opus-5-5 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.letter-flip-correction",
  category: "text-emphasis",
  name: "One letter flips in to correct the word",
  does: "A single letter rotates in like a split-flap as the word resolves into its corrected form.",
  says: ["change", "precision"],
  energy: 3,
  targets: ["word"],
  duration: [0.9, 1.5],
  params: {
    axis: { type: "choice", options: ["x", "z"], default: "x" },
    letter: { type: "number", range: [0, 12], default: 0 },
    speed: { type: "number", range: [0.25, 0.5], default: 0.35, unit: "s" },
    wrong: { type: "text", default: "" },
    pick: { type: "choice", options: ["longest", "first", "last"], default: "longest" },
    strike: { type: "bool", default: true },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-emphasis.strike-through", "text-emphasis.corner-bracket-focus"],
  avoid: ["calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:fionntobin-the-new-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")].filter((w) => w.querySelector(".ml-c"));
    if (!words.length) return null;
    const letters = (w) => [...w.querySelectorAll(".ml-c")].filter((c) => /[\p{L}\p{N}]/u.test(c.textContent));
    const word = p.pick === "first" ? words[0] : p.pick === "last" ? words[words.length - 1] : words.reduce((a, b) => (letters(b).length > letters(a).length ? b : a));
    const ls = letters(word);
    if (!ls.length) return null;
    const L = ls[Math.max(0, Math.min(ls.length - 1, Math.round(p.letter)))];
    const right = L.textContent;
    // the wrong letter: named, else a near-miss of the right one (same case)
    let wrong = p.wrong ? Array.from(p.wrong)[0] : "";
    if (!wrong) {
      const lo = right.toLowerCase(), A = "abcdefghijklmnopqrstuvwxyz", i = A.indexOf(lo);
      const pickW = i < 0 ? (/\d/.test(right) ? String((+right + 3) % 10) : "x") : A[(i + 1 + Math.floor(ML.rnd(i, 3) * 3)) % 26];
      wrong = right === lo ? pickW : pickW.toUpperCase();
    }
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const c = col(p.colour, "accent");
    // the letter: the right glyph in flow (it holds the width), the wrong one laid over it
    L.textContent = "";
    Object.assign(L.style, { position: "relative", perspective: (fs * 4).toFixed(0) + "px" });
    const now = document.createElement("span"), was = document.createElement("span");
    now.textContent = right; was.textContent = wrong;
    Object.assign(now.style, { display: "inline-block", color: c, backfaceVisibility: "hidden" });
    Object.assign(was.style, { position: "absolute", left: "50%", top: "0", translate: "-50% 0", display: "inline-block", backfaceVisibility: "hidden" });
    L.append(now, was);
    // the strike across the whole word
    let bar = null;
    if (p.strike) {
      if (getComputedStyle(word).position === "static") word.style.position = "relative";
      bar = document.createElement("span");
      Object.assign(bar.style, { position: "absolute", left: "-0.04em", right: "-0.04em", top: "54%", height: Math.max(2, fs * 0.035).toFixed(2) + "px", background: "var(--x-bad)", transformOrigin: "0% 50%", pointerEvents: "none" });
      word.append(bar);
    }
    const tS = at, tF = at + (p.strike ? 0.3 : 0.05), sp = p.speed;
    if (p.strike) ctx.sfx(tS, "click", 0.25);
    ctx.sfx(tF + sp * 0.4, "tap", 0.45);
    return {
      draw(t) {
        const q = t < tF ? 0 : ML.back(t, tF, tF + sp, 1.4); // the right one in
        const g = ML.ease(t, tF - 0.02, tF + sp * 0.5); // the wrong one away
        if (p.axis === "x") {
          now.style.transformOrigin = "50% 100%";
          now.style.transform = `rotateX(${(90 * (1 - q)).toFixed(2)}deg)`;
          was.style.transformOrigin = "50% 0%";
          was.style.transform = `rotateX(${(-90 * g).toFixed(2)}deg)`;
          now.style.opacity = t < tF ? "0" : "1";
          was.style.opacity = g >= 1 ? "0" : "1";
        } else {
          now.style.transformOrigin = "50% 50%";
          now.style.transform = `rotate(${(180 * (1 - q)).toFixed(2)}deg)`;
          was.style.transformOrigin = "50% 50%";
          was.style.transform = `rotate(${(-180 * g).toFixed(2)}deg)`;
          now.style.opacity = ML.lin(t, tF, tF + sp * 0.4).toFixed(4);
          was.style.opacity = (1 - ML.lin(t, tF, tF + sp * 0.4)).toFixed(4);
        }
        // settled: flat, out of 3D, so the letter renders exactly like its neighbours
        if (t >= tF + sp) now.style.transform = "none";
        if (bar) {
          bar.style.scale = `${ML.out(t, tS, tS + 0.22).toFixed(4)} 1`;
          bar.style.opacity = (t < tS ? 0 : 1 - ML.lin(t, tF + sp, tF + sp + 0.2)).toFixed(4);
        }
      },
    };
  },
});
