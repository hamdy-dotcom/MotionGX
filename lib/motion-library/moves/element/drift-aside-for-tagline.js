// Product panel drifts aside for a tagline: the tilted dashboard slides +18 % of its width toward the reading end
// and turns a little further (rotateY −12° → −18°, 0.8 s power2.inOut), facing the freed space, where a short
// tagline (head font 600, ~32 px at 720p) fades in, x −10 → 0 (from the reading start), 0.4 s, then dims to 60 %
// as the scene ends. Under 3D the panel is scaled so its nearest edge never shows above 1× (sharp). It turns
// mirrored when it drifts left, and in Arabic it drifts left with the tagline on the right.
// The panel is the target screen, or the scene's own panel when the target is the tagline line itself.
// Source: prompt-motion "daniel-haida-claude-code-opus-5-5" (reference only — rebuilt as our own code).
ML.define({
  id: "element.drift-aside-for-tagline",
  category: "element",
  name: "Product panel drifts aside for a tagline",
  does: "The tilted dashboard slides right and slightly turns, and a short tagline fades in on the left.",
  says: ["focus", "brand", "calm"],
  energy: 2,
  targets: ["screen", "line"],
  duration: [1, 2.5],
  params: {
    side: { type: "choice", options: ["right", "left"], default: "right" },
    turn: { type: "number", range: [-20, 0], default: -18, unit: "deg" },
    from_turn: { type: "number", range: [-20, 0], default: -12, unit: "deg" },
    shift: { type: "number", range: [0.08, 0.3], default: 0.18 },
    text: { type: "text", default: "" },
    dim: { type: "number", range: [0.3, 1], default: 0.6 },
  },
  pairs: ["text-in.punchline", "camera.push-in", "device.screen-untilt"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:daniel-haida-claude-code-opus-5-5", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 720;
    const own = el && el !== ctx.stage ? el : null;
    const isText = own && !own.querySelector("img,svg,canvas,.ml-panel") && (own.textContent || "").trim().length > 0 && (own.textContent || "").trim().length < 80;
    // the panel: the target screen, else the scene's screen / panel; the tagline: the target line, else our own
    let panel = own && !isText ? own : host.querySelector('[data-slot="screen"]') || host.querySelector(".ml-pic > .ml-panel, .ml-pic > *");
    let built = null;
    if (!panel) {
      built = doc.createElement("div");
      built.className = "ml-panel";
      built.style.cssText = `position:absolute;left:${f.pic.x + f.pic.w * 0.1}px;top:${f.pic.y + f.pic.h * 0.15}px;width:${f.pic.w * 0.8}px;height:${f.pic.h * 0.7}px;`;
      host.append(built);
      panel = built;
    }
    const dir = (p.side === "left" ? -1 : 1) * (rtl ? -1 : 1);
    const P0 = ctx.box(panel);
    const w = panel.offsetWidth || P0.w;
    const persp = Math.max(w * 2.5, 900 * k);
    // how far it drifts: its share of its width, kept inside the frame
    const room = dir > 0 ? f.W - f.m * 0.5 - (P0.x + P0.w) : P0.x - f.m * 0.5;
    const dx = dir * Math.max(0, Math.min(w * ML.clamp(p.shift, 0.08, 0.3), room + P0.w * 0.04));
    const th0 = dir * ML.clamp(p.from_turn, -20, 0), th1 = dir * ML.clamp(p.turn, -20, 0);
    const baseT = panel.style.transform, baseO = panel.style.transformOrigin;

    let tag = own && isText ? own : null;
    if (!tag) {
      const text = p.text || (rtl ? "كل شيء أمامك." : "All in view.");
      // the freed space on the reading-start side (at least ~28 % of the frame, over the receding edge)
      const nearEdge = dir > 0 ? P0.x + dx : P0.x + P0.w + dx;
      const freeW = Math.max(f.W * 0.28, dir > 0 ? nearEdge - f.m - 24 * k : f.W - f.m - nearEdge - 24 * k);
      const x = dir > 0 ? f.m : f.W - f.m - freeW;
      tag = doc.createElement("div");
      tag.style.cssText = `position:absolute;left:${x}px;width:${freeW}px;font:600 ${Math.round(32 * k * 1.25)}px/1.15 var(--x-head-font);letter-spacing:${rtl ? 0 : "-0.01em"};color:var(--x-ink);text-align:${dir > 0 ? (rtl ? "right" : "left") : rtl ? "right" : "left"};text-wrap:balance;pointer-events:none;z-index:7;`;
      tag.textContent = text;
      host.append(tag);
      // the longest word must fit the column
      const words = ML.split(tag, "words");
      const widest = Math.max(...words.map((x) => x.offsetWidth), 1);
      if (widest > freeW) tag.style.fontSize = (parseFloat(getComputedStyle(tag).fontSize) * freeW / widest * 0.96).toFixed(2) + "px";
      tag.style.top = (P0.y + P0.h / 2 - tag.offsetHeight / 2) + "px";
    }
    const io2 = ML.bezier(0.455, 0.03, 0.515, 0.955); // power2.inOut
    const m1 = at + 0.8, g0 = at + 0.4, g1 = g0 + 0.4;
    const d0 = Math.max(g1 + 0.2, end - 0.6), d1 = Math.max(d0 + 0.1, end - 0.15);
    const from = rtl ? 10 : -10; // in from the reading start
    ctx.sfx(at, "whoosh.soft", 0.3);
    ctx.sfx(g0 + 0.05, "tap", 0.15);

    return {
      draw(t) {
        const u = io2(ML.lin(t, at, m1));
        const th = th0 + (th1 - th0) * u;
        // the nearest edge comes toward the camera by (w/2)·sin θ: scale so it never shows above 1×
        const s = (persp - (w / 2) * Math.abs(Math.sin((th * Math.PI) / 180))) / persp;
        panel.style.transformOrigin = "50% 50%";
        panel.style.transform = `perspective(${persp.toFixed(0)}px) translateX(${(dx * u).toFixed(2)}px) rotateY(${th.toFixed(3)}deg) scale(${s.toFixed(4)})`;
        if (t < at - 0.5 && !built) { panel.style.transform = baseT; panel.style.transformOrigin = baseO; }
        if (built) built.style.visibility = t >= at - 0.3 ? "visible" : "hidden";
        const g = ML.out(t, g0, g1), dm = 1 - (1 - ML.clamp(p.dim, 0.3, 1)) * ML.ease(t, d0, d1);
        tag.style.opacity = (g * dm).toFixed(4);
        tag.style.translate = `${((1 - g) * from * k).toFixed(2)}px 0`;
      },
    };
  },
});
