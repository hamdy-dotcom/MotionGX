// Isolate word: one word of a sentence is picked out and takes over. Corner ticks (2 px accent, short arms — scaled
// with the type) snap around the word; the other words fade to 0 and blur 6 px in 0.3 s, staggered 0.03 s from the far
// side inward; then the word FLIPs to the centre of its slot and grows 1 → end-scale (never wider than the stage allows),
// grey → ink, 0.6 s power3.inOut, the ticks tracking and opening with it. A neighbouring slot the grown word would run
// into (a headline over a subline) fades with the rest, and the word then centres in the room they share. A short run compresses the timing to fit. Words stay whole, so
// Arabic is safe; "far side" is measured, so it follows the reading direction on its own.
// Source: prompt-motion:lexnlin-f9b3bd8 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.isolate-word",
  category: "text-emphasis",
  name: "One word is picked out and takes over the frame",
  does: "Corner ticks frame one word of a sentence, the rest fades away, and the word slides to centre and scales up.",
  says: ["focus", "result"],
  energy: 3,
  targets: ["word", "line"],
  duration: [1, 2.5],
  params: {
    target: { type: "choice", options: ["last", "any"], default: "last" },
    word: { type: "text", default: "" },
    "end-scale": { type: "number", range: [1.5, 3], default: 2.2 },
    brackets: { type: "bool", default: true },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.punchline", "text-emphasis.corner-bracket-focus", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "prompt-motion:lexnlin-f9b3bd8", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    const words = ML.split(el, "words");
    if (!words.length) return null;
    // the word: named (any), else the last one
    let target = words[words.length - 1];
    if (p.word) { const q = ML.plain(p.word); target = words.find((w) => ML.plain(w.textContent).includes(q)) || target; }
    const rest = words.filter((w) => w !== target);
    const base = getComputedStyle(target).color;
    const eb = ctx.box(el), wb = ctx.box(target);
    const fs = parseFloat(getComputedStyle(target).fontSize) || 56;
    const u = Math.max(0.6, Math.min(2, fs / 72));
    const SW = stage.offsetWidth || 1080;
    // never wider than the room around the point it travels to (the slot's centre need not be the stage's)
    const room = 2 * Math.min(eb.x + eb.w / 2, SW - eb.x - eb.w / 2) * 0.92;
    const scale = Math.max(1, Math.min(p["end-scale"], room / Math.max(1, wb.w)));
    const dx = eb.x + eb.w / 2 - (wb.x + wb.w / 2);
    let dy = eb.y + eb.h / 2 - (wb.y + wb.h / 2);
    target.style.transformOrigin = "50% 50%";
    target.style.position = "relative";
    target.style.zIndex = "2";
    // the far side goes first: rank by distance from the target
    const cxT = wb.x + wb.w / 2, cyT = wb.y + wb.h / 2;
    const dist = rest.map((w) => { const b = ctx.box(w); return Math.hypot(b.x + b.w / 2 - cxT, (b.y + b.h / 2 - cyT) * 2); });
    const order = rest.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);
    const slot = new Array(rest.length); order.forEach((i, k) => (slot[i] = k));
    // the full beat takes 1.2 s; a shorter run compresses it, so the word always lands before the move ends
    const k = ML.clamp((end - at) / 1.3, 0.6, 1);
    const FADE = 0.3 * k, tFade = at + 0.22 * k, tMove = tFade + FADE + Math.min(0.15, rest.length * 0.03) * 0.5 * k;
    const MOVE = 0.6 * k, leaveAt = end - 0.28;
    const inOut4 = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut
    // the ticks
    const c = col(p.colour, "accent");
    let layer = null, corners = [];
    const arm = Math.max(6, 0.16 * fs), sw = Math.max(2, 2 * u * 0.8), gap = 0.1 * fs;
    // a slot beside this one that the grown word and its ticks would overlap leaves with the rest
    const gx = (wb.w * scale) / 2 + gap * 1.6, gy = (wb.h * scale) / 2 + gap * 1.6, ex = cxT + dx, ey = cyT + dy;
    const nearby = [...(el.parentElement ? el.parentElement.children : [])].filter((n) => {
      if (n === el) return false;
      const b = ctx.box(n);
      return b.x < ex + gx && b.x + b.w > ex - gx && b.y < ey + gy && b.y + b.h > ey - gy;
    });
    if (nearby.length) { const pb = ctx.box(el.parentElement); dy = pb.y + pb.h / 2 - cyT; }
    if (p.brackets) {
      layer = document.createElement("div");
      Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "5" });
      (ctx.scene || stage).append(layer);
      corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => {
        const d = document.createElement("div");
        Object.assign(d.style, { position: "absolute", boxSizing: "border-box", borderColor: c, borderStyle: "solid", borderWidth: "0", opacity: "0" });
        d.style[sy < 0 ? "borderTopWidth" : "borderBottomWidth"] = sw + "px";
        d.style[sx < 0 ? "borderLeftWidth" : "borderRightWidth"] = sw + "px";
        layer.append(d);
        return { d, sx, sy };
      });
    }
    ctx.sfx(at + 0.12, "click", 0.4);
    ctx.sfx(tMove, "whoosh.soft", 0.3);
    return {
      draw(t) {
        // the rest fades and blurs, far side first
        rest.forEach((w, i) => {
          const a = tFade + slot[i] * 0.03, f = ML.ease(t, a, a + FADE);
          w.style.opacity = (1 - f).toFixed(4);
          w.style.filter = f > 0.001 ? `blur(${(f * 6 * u * 0.8).toFixed(2)}px)` : "none";
        });
        const nf = ML.ease(t, tFade, tFade + FADE);
        for (const n of nearby) { n.style.opacity = (1 - nf).toFixed(4); n.style.filter = nf > 0.001 ? `blur(${(nf * 6 * u * 0.8).toFixed(2)}px)` : "none"; }
        // the word glides to the centre and grows, grey → ink
        const e = inOut4(ML.lin(t, tMove, tMove + MOVE));
        const s = 1 + (scale - 1) * e;
        target.style.translate = e > 0 ? `${(dx * e).toFixed(2)}px ${(dy * e).toFixed(2)}px` : "none";
        target.style.scale = s === 1 ? "none" : s.toFixed(4);
        target.style.color = e > 0 ? `color-mix(in srgb, var(--x-ink) ${(e * 100).toFixed(1)}%, ${base})` : "";
        if (!layer) return;
        const snap = t < at ? 0 : ML.back(t, at, at + 0.22, 1.6), o = ML.lin(t, at, at + 0.12) * (1 - ML.ease(t, leaveAt, leaveAt + 0.24));
        const cx = cxT + dx * e, cy = cyT + dy * e, hw = (wb.w * s) / 2 + gap * (1 + e * 0.6), hh = (wb.h * s) / 2 + gap * (1 + e * 0.6);
        const off = (1 - snap) * 30 * u, a = arm * (1 + (s - 1) * 0.5);
        for (const { d, sx, sy } of corners) {
          const x = cx + sx * (hw + off), y = cy + sy * (hh + off);
          d.style.width = a.toFixed(2) + "px"; d.style.height = a.toFixed(2) + "px";
          d.style.left = (sx < 0 ? x : x - a).toFixed(2) + "px";
          d.style.top = (sy < 0 ? y : y - a).toFixed(2) + "px";
          d.style.opacity = o.toFixed(4);
        }
      },
    };
  },
});
