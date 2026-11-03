// Cloud of cards orbiting the headline in 3D: 10–40 small cards (documents with a coloured header strip, video thumbs
// with a play mark, or icon tiles) ride a tilted ring round the words — an ellipse whose height is its width × cos(tilt),
// with a seeded ±y jitter and turn per card. The ring turns about its vertical axis (default 20°/s); the cards keep
// facing the camera with a slight wobble. Depth is drawn, not perspective-scaled (so nothing goes past 1 and soft): the
// near half of the ring passes in front of the words, sharper and brighter; the far half goes behind them, smaller,
// darker and out of focus (depth of field on our own drawn cards, never on pictures); a soft accent glow on each card.
// The cards gather in from the centre on a stagger, and fade at the end. It turns the other way in Arabic.
// Source: prompt-motion "sudo-kiran-i-have-asked-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.orbit-cloud-3d",
  category: "element",
  name: "Cloud of cards orbiting the headline in 3D",
  does: "Dozens of small cards hover in a tilted ring around the words, some passing in front and some behind.",
  says: ["scale", "tech", "flow"],
  energy: 3,
  targets: ["headline", "card"],
  duration: [2, 8],
  params: {
    item: { type: "choice", options: ["docs", "videos", "icons"], default: "docs" },
    count: { type: "number", range: [10, 40], default: 24 },
    tilt: { type: "number", range: [40, 75], default: 60, unit: "deg" },
    speed: { type: "number", range: [5, 40], default: 20, unit: "deg/s" },
    spread: { type: "number", range: [0.6, 1.2], default: 1 },
    focus: { type: "bool", default: true },
  },
  pairs: ["element.objects-morph-swap", "text-in.punchline", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sudo-kiran-i-have-asked-opus", license: "reference", note: "the tilted card ring with drawn depth rebuilt as our own code; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // the words the ring goes round: the target, else the scene's headline, else the headline band
    const words = own || host.querySelector(".ml-title");
    let B = words ? ctx.box(words) : f.head;
    if (words) {
      // the ink of the words, not their (often full-width) block
      const rg = doc.createRange(); rg.selectNodeContents(words);
      const r = rg.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect(), sk = s.width / (ctx.stage.offsetWidth || 1) || 1;
      if (r.width > 0) B = { x: (r.left - s.left) / sk, y: (r.top - s.top) / sk, w: r.width / sk, h: r.height / sk };
      // the words' block sits between the two halves of the ring
      const lift = words.closest(".ml-head") || words;
      if (getComputedStyle(lift).position === "static") lift.style.position = "relative";
      lift.style.zIndex = "5";
    }
    const k = Math.min(f.W, f.H) / 1080;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const cw = (p.item === "videos" ? 92 : p.item === "icons" ? 64 : 60) * k * 1.25, ch = (p.item === "videos" ? 52 : p.item === "icons" ? 64 : 82) * k * 1.25;
    // ring size: wider than the words, inside the frame
    const rx = Math.min(f.W / 2 - cw * 0.8, Math.max(B.w * 0.62 + cw, f.W * 0.28) * ML.clamp(p.spread, 0.6, 1.2));
    const tilt = (ML.clamp(p.tilt, 40, 75) * Math.PI) / 180;
    // the ring's height from its tilt; its centre stays on the words unless the frame's edge is too close
    // (words near the frame's edge flatten the ring rather than push it off them, so it still goes round the words)
    const roomY = Math.min(cy, f.H - cy) - ch * 0.6;
    const ry = Math.min(rx * Math.cos(tilt), f.H * 0.2, Math.max(roomY, B.h * 0.8));
    const jit = Math.min(40 * k * 1.3, ry * 0.35);
    const ringY = ML.clamp(cy, ry + jit + ch * 0.6, f.H - ry - jit - ch * 0.6);
    const backL = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:4;", host);
    const frontL = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const glyphs = ["M4 12h16M12 4v16", "M5 12l5 5 9-10", "M12 3l9 16H3z", "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16", "M4 18l6-6 4 4 6-8", "M6 4h12v16H6zM9 8h6M9 12h6"];
    const n = Math.round(ML.clamp(p.count, 10, 40));
    const cards = Array.from({ length: n }, (_, i) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;box-sizing:border-box;overflow:hidden;border-radius:${(p.item === "icons" ? 16 : 7) * k * 1.25}px;box-shadow:0 0 ${12 * k}px color-mix(in srgb, var(--x-accent) 30%, transparent), var(--x-shadow);`, backL);
      if (p.item === "videos") {
        c.style.background = `linear-gradient(${120 + i * 29}deg, color-mix(in srgb, var(--x-accent) ${60 + ((i * 11) % 35)}%, var(--x-ink)), var(--x-accent-2))`;
        c.style.display = "flex"; c.style.alignItems = "center"; c.style.justifyContent = "center";
        mk("div", `width:0;height:0;border-style:solid;border-width:${7 * k}px 0 ${7 * k}px ${11 * k}px;border-color:transparent transparent transparent var(--x-accent-ink);`, c);
      } else if (p.item === "icons") {
        c.style.background = "var(--x-panel)"; c.style.border = "var(--x-edge) solid var(--x-edge-color)"; c.style.display = "flex"; c.style.alignItems = "center"; c.style.justifyContent = "center";
        const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `width:${cw * 0.5}px;height:${cw * 0.5}px;`;
        const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", glyphs[i % glyphs.length]); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", "var(--x-accent)"); pa.setAttribute("stroke-width", "2.2"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
        s.append(pa); c.append(s);
      } else {
        c.style.background = "var(--x-panel)"; c.style.border = "var(--x-edge) solid var(--x-edge-color)"; c.style.display = "flex"; c.style.flexDirection = "column"; c.style.gap = `${4 * k}px`; c.style.alignItems = rtl ? "flex-end" : "flex-start";
        mk("div", `align-self:stretch;height:${12 * k}px;background:color-mix(in srgb, var(--x-accent) ${40 + ((i * 19) % 50)}%, var(--x-panel-2));margin-bottom:${2 * k}px;`, c);
        for (let j = 0; j < 4; j++) mk("div", `height:${4 * k}px;border-radius:${2 * k}px;background:var(--x-line);width:${50 + ML.rnd(i, 30 + j) * 38}%;margin:0 ${6 * k}px;`, c);
      }
      const c2 = c.cloneNode(true); frontL.append(c2); // a twin in front of the words: DOM order never changes
      return { c, c2, item: c.style.display || "block", phase: (i / n) * Math.PI * 2 + (ML.rnd(i, 1) - 0.5) * 0.25, jy: (ML.rnd(i, 2) - 0.5) * 2 * jit, rot: (ML.rnd(i, 3) - 0.5) * 16, wob: ML.rnd(i, 4) * 6.28 };
    });
    const dirn = rtl ? -1 : 1;
    const gT = (i) => at + (i / n) * 0.6;
    ctx.sfx(at, "whoosh.soft", 0.3);
    const leaveA = Math.max(at + 1.2, end - 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.3);
        const vis = t >= at - 1e-6;
        backL.style.visibility = frontL.style.visibility = vis ? "visible" : "hidden";
        const turn = ((p.speed * (t - at)) * Math.PI) / 180 * dirn;
        cards.forEach((it, i) => {
          const g = ML.out(t, gT(i), gT(i) + 0.7);
          const a = it.phase + turn;
          const depth = Math.sin(a); // +1 nearest the camera (the lower half of the ring), −1 farthest
          const x = cx + Math.cos(a) * rx * g, y = cy + (ringY - cy + depth * ry + it.jy) * g;
          const near = (depth + 1) / 2;
          const sc = (0.62 + 0.38 * near) * (0.5 + 0.5 * g);
          const front = depth > 0;
          const on = front ? it.c2 : it.c, off = front ? it.c : it.c2;
          off.style.display = "none"; on.style.display = it.item;
          on.style.zIndex = String(Math.round(near * 1000) * 64 + i); // unique, so paint order is fixed
          const wob = it.rot + Math.sin(t * 1.1 + it.wob) * 4;
          on.style.transform = `translate(${(x - cw / 2).toFixed(2)}px, ${(y - ch / 2).toFixed(2)}px) rotate(${wob.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          on.style.opacity = (ML.lin(t, gT(i), gT(i) + 0.3) * (1 - leave) * (0.55 + 0.45 * near)).toFixed(4);
          const blur = p.focus ? (1 - near) * 3.2 * k * 1.3 : 0;
          on.style.filter = `brightness(${(0.72 + 0.28 * near).toFixed(3)})${blur > 0.15 ? ` blur(${blur.toFixed(2)}px)` : ""}`;
        });
      },
    };
  },
});
