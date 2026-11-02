// Letters to dots: the headline exits as each letter collapses into its own small dot, one after another. Per letter:
// scale 1 -> 0.08 about its centre, 0.25 s ease-in, squeezing a little faster across than up and down with a slight
// smear; once it is smaller than 0.15 it becomes a round dot at the letter's centre. Order left -> right, right ->
// left or a seeded random order. Then the dots fade (0.2 s), or gather into a row of three (an ellipsis) that keeps
// breathing like a loader for the next beat. Letters are split, so Arabic (whose letters join) is not offered this move.
// Source: own rebuild of prompt-motion reference roundtablespace-opus-5-5-on-max.
ML.define({
  id: "text-emphasis.letters-to-dots",
  category: "text-emphasis",
  name: "Letters shrink into dots and vanish",
  does: "The headline exits as each letter collapses into its own small dot, one after another, then the dots fade or line up.",
  says: ["transition", "change", "playful"],
  energy: 3,
  targets: ["headline", "word"],
  duration: [0.6, 1.5],
  params: {
    order: { type: "choice", options: ["ltr", "rtl", "random"], default: "ltr" },
    end: { type: "choice", options: ["fade", "line-up"], default: "fade" },
    dot: { type: "number", range: [8, 24], default: 16, unit: "px" },
    stagger: { type: "number", range: [0.02, 0.1], default: 0.05, unit: "s" },
    colour: { type: "choice", options: ["ink", "accent", "accent-2"], default: "ink" },
  },
  pairs: ["text-in.punchline", "transition.flash-cut"],
  avoid: ["luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:roundtablespace-opus-5-5-on-max", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const chars = ML.split(el, "chars");
    const n = chars.length;
    if (!n) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 104;
    const D = Math.max(4, (p.dot * fs) / 104); // the dot keeps its size relative to the type
    const fill = p.colour === "accent" ? "var(--x-accent)" : p.colour === "accent-2" ? "var(--x-accent-2)" : "currentColor";
    // dots live in a layer over the slot, at each letter's centre (slot px)
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const eb = ctx.box(el);
    const cen = chars.map((c) => { const b = ctx.box(c); return { x: b.x - eb.x + b.w / 2, y: b.y - eb.y + b.h * 0.56 }; });
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    el.append(layer);
    const dots = chars.map((c, i) => {
      const d = doc.createElement("i");
      Object.assign(d.style, { position: "absolute", left: (cen[i].x - D / 2).toFixed(2) + "px", top: (cen[i].y - D / 2).toFixed(2) + "px", width: D + "px", height: D + "px", borderRadius: "50%", background: fill, opacity: "0" });
      layer.append(d);
      return d;
    });
    chars.forEach((c) => { c.style.transformOrigin = "50% 56%"; });
    // order
    const rank = chars.map((_, i) => i);
    if (p.order === "rtl") rank.reverse();
    if (p.order === "random") rank.sort((a, b) => ML.rnd(a, 11) - ML.rnd(b, 11));
    const slot = new Array(n);
    rank.forEach((ci, k) => (slot[ci] = k));
    const SQ = 0.25;
    const after = p.end === "fade" ? 0.25 : 0.55;
    const st = Math.min(p.stagger, Math.max(0.01, (end - at - SQ - after) / Math.max(1, n - 1)));
    const go = chars.map((_, i) => at + slot[i] * st);
    const last = at + (n - 1) * st + SQ;
    // line-up: every dot joins one of three, centred in the slot
    const cx = eb.w / 2, cy = cen.reduce((a, b) => a + b.y, 0) / n;
    const gap = D * 1.9;
    const row = chars.map((_, i) => ({ x: cx + (Math.min(2, Math.floor((slot[i] * 3) / n)) - 1) * gap, y: cy }));
    let lastS = -1;
    rank.forEach((ci) => { const t0 = go[ci] + SQ * 0.8; if (t0 - lastS >= 0.18) { ctx.sfx(t0, "pop.soft", 0.2); lastS = t0; } });
    return {
      draw(t) {
        chars.forEach((c, i) => {
          const x = ML.lin(t, go[i], go[i] + SQ), e = x * x * x; // ease-in
          const s = 1 - 0.92 * e;
          const sx = Math.max(0.02, 1 - 0.95 * Math.min(1, e * 1.15)), sy = s;
          const smear = Math.sin(Math.PI * x) * fs * 0.012;
          const asDot = s < 0.15;
          c.style.visibility = asDot ? "hidden" : "visible";
          c.style.transform = x > 0 ? `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})` : "none";
          c.style.filter = smear > 0.2 ? `blur(${smear.toFixed(2)}px)` : "none";
          const d = dots[i];
          if (!asDot) { d.style.opacity = "0"; return; }
          let o = 1, dx = 0, dy = 0, sc = 1;
          if (p.end === "fade") {
            o = 1 - ML.lin(t, last + 0.05, last + 0.25);
            sc = 0.6 + 0.4 * ML.out(t, go[i] + SQ * 0.75, go[i] + SQ + 0.08);
          } else {
            const m = ML.expo(t, last, last + 0.4);
            dx = (row[i].x - cen[i].x) * m; dy = (row[i].y - cen[i].y) * m;
            sc = 0.6 + 0.4 * ML.out(t, go[i] + SQ * 0.75, go[i] + SQ + 0.08);
            // a loader's breath once they sit: each of the three in turn
            const k = Math.min(2, Math.floor((slot[i] * 3) / n));
            const b = t > last + 0.4 ? Math.max(0, Math.sin((t - last - 0.4) * 7 - k * 0.9)) : 0;
            dy -= b * D * 0.5;
            o = 1 - ML.lin(t, end - 0.2, end - 0.02);
          }
          d.style.opacity = o.toFixed(4);
          d.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sc.toFixed(4)})`;
        });
      },
    };
  },
});
