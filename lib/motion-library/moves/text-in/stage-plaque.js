// Stage plaque: a small plaque names the current stage of something being built and rides with its top. Ported from
// MengTo's threejs-towers: the plaque (panel ground, 1px edge, 7×14 padding, small bold tracked caps, soft shadow,
// translate(-50%,-50%)) is placed each frame at the top of the growing object — there max(.4, h) projected — and
// clamped to [76, H − 84] and the safe area; its text swaps when the stage changes (old word slides up 8px and fades .15 s, the new one
// rises .2 s, or instantly). Here the growth is a stem the move builds under the plaque (or a named element's top
// edge, `anchor`), rising one step per stage on a spring. Stages come from `stages` ("Base, Walls, Roof") or the
// label's own words; bilingual takes "local:EN" pairs (石垣普請:STONEWORK) on two lines. A tap per stage, a bell last.
// Source: MengTo/Skills web-design/threejs-towers/demo/index.html (MIT).
ML.define({
  id: "text-in.stage-plaque",
  category: "text-in",
  name: "Stage plaque",
  does: "A small plaque naming the current stage rides along with a building or growing object and swaps its word at each stage.",
  says: ["step", "precision", "story", "growth"],
  energy: 2,
  targets: ["label"],
  duration: [2, 10],
  params: {
    style: { type: "choice", options: ["plaque", "bare"], default: "plaque" },
    stages: { type: "text", default: "" },
    bilingual: { type: "bool", default: false },
    swap: { type: "choice", options: ["slide", "instant"], default: "slide" },
    follow: { type: "bool", default: true },
    object: { type: "choice", options: ["stem", "none"], default: "stem" },
    anchor: { type: "text", default: "" },
    climb: { type: "number", range: [0.05, 0.4], default: 0.18 },
  },
  pairs: ["element.layer-stack-build", "data.progress-fill"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/threejs-towers", license: "MIT", note: "plaque style, placePlaque clamp and stage swap ported; growth is a built stem or a named element" },
  setup(ctx) {
    const { el, p, at, end, stage, f, scene } = ctx;
    if (!el) return null;
    // the stage words: the param list, else the label split on separators, else its words
    const own = el.textContent.trim();
    let list = (p.stages || "").split(/\s*[,|\n]\s*/).filter(Boolean);
    if (!list.length) list = own.split(/\s*[|/·•,]\s*/).filter(Boolean);
    if (list.length < 2) list = own.split(/\s+/).filter(Boolean);
    if (!list.length) list = [own || "—"];
    const st = list.map((s) => { const [a, b] = s.split(/\s*[:：]\s*/); return { a: a || s, b: p.bilingual ? b || "" : "" }; });
    const n = st.length;
    // the plaque is the label itself, set as a centred plate; its text lives in swap layers
    el.textContent = "";
    Object.assign(el.style, { position: "relative", zIndex: "1", width: "max-content", maxWidth: "100%", overflow: "hidden", lineHeight: "1.25", textAlign: "center", display: "block" });
    // alone in a block it centres; a flex or grid parent keeps its own place for it
    if (!/flex|grid/.test(getComputedStyle(el.parentElement).display)) el.style.marginInline = "auto";
    if (p.style === "plaque") Object.assign(el.style, { background: "var(--x-panel)", border: "var(--x-edge) solid var(--x-edge-color)", padding: "0.32em 0.64em 0.28em", borderRadius: "min(var(--x-radius), 0.18em)", boxShadow: "var(--x-shadow)", color: "var(--x-ink)", fontWeight: "700" });
    const layer = (s) => {
      const d = document.createElement("span");
      Object.assign(d.style, { display: "block", whiteSpace: "nowrap" });
      const top = document.createElement("span"); top.textContent = s.a; top.style.display = "block"; d.append(top);
      if (s.b) { const sub = document.createElement("span"); sub.textContent = s.b; Object.assign(sub.style, { display: "block", fontSize: "0.62em", opacity: "0.7", fontFamily: "var(--x-label-font)", letterSpacing: "var(--x-label-track)" }); d.append(sub); }
      return d;
    };
    // a sizer holds the widest stage so the plate never resizes; layers sit over it
    const sizer = document.createElement("span");
    Object.assign(sizer.style, { display: "grid", visibility: "hidden" });
    for (const s of st) { const l = layer(s); l.style.gridArea = "1 / 1"; sizer.append(l); }
    el.append(sizer);
    const layers = st.map((s) => { const l = layer(s); Object.assign(l.style, { position: "absolute", inset: p.style === "plaque" ? "0.32em 0.64em 0.28em" : "0", textAlign: "center" }); el.append(l); return l; });
    // stage times across the run, the first at `at`
    const span = Math.max(0.6, end - at - 0.6), T = st.map((_, i) => at + (i * span) / n);
    T.forEach((x, i) => ctx.sfx(x, i === n - 1 && n > 1 ? "bell" : "tap", i === n - 1 ? 0.35 : 0.25));
    // the growth: a stem under the plate (built in the stage) or a named element's top edge
    const b0 = ctx.box(el), H = f.H;
    let anchor = null;
    if (p.anchor) { try { anchor = stage.querySelector(p.anchor); } catch { anchor = null; } }
    // the slot is where the climb ends: the plate starts below it and rises home, so it never covers what sits above.
    // The clamp of the source, kept inside the frame's safe area (a phone's buttons cover the top and bottom of 9:16)
    const topAt = Math.max(76, f.safe.y), botAt = Math.min(H - 84, f.safe.y + f.safe.h);
    const climb = Math.min(Math.max(0, botAt - (b0.y + b0.h)), p.climb * H);
    let stem = null;
    if (p.follow && !anchor && p.object === "stem" && climb > 4) {
      const sw = Math.max(3, f.W * 0.003);
      stem = document.createElement("div");
      Object.assign(stem.style, { position: "absolute", left: (b0.x + b0.w / 2 - sw / 2).toFixed(1) + "px", width: sw.toFixed(1) + "px", top: (b0.y + b0.h).toFixed(1) + "px", height: "0px", background: "var(--x-accent)", borderRadius: "var(--x-radius-s)", transformOrigin: "50% 100%", pointerEvents: "none", zIndex: "0" });
      (scene || stage).append(stem);
    }
    const grow = (t) => (n < 2 ? ML.step(t - at, ML.SPRING.glide) : ML.track(t, [[0, 0], ...T.map((x, i) => [x, (i + 1) / n])], ML.SPRING.glide));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const vis = ML.clamp((t - at) / 0.2) * (1 - leave);
        el.style.opacity = vis.toFixed(4);
        // which stage: the last one started
        let si = 0; for (let i = 0; i < n; i++) if (t >= T[i]) si = i;
        layers.forEach((l, i) => {
          let o = 0, y = 0;
          if (p.swap === "instant") o = i === si ? 1 : 0;
          else if (i === si) { const u = i === 0 ? 1 : ML.out(t, T[i] + 0.05, T[i] + 0.25); o = u; y = (1 - u) * 8; }
          else if (i === si - 1) { const u = ML.lin(t, T[si], T[si] + 0.15); o = 1 - u; y = -u * 8; }
          l.style.opacity = o.toFixed(4);
          l.style.translate = y ? `0 ${y.toFixed(2)}px` : "none";
        });
        // ride the top of the growing thing, clamped to [76, H − 84] as in the source
        let dy = 0;
        if (p.follow) {
          if (anchor) { const a = ctx.box(anchor); dy = Math.max(topAt, Math.min(botAt, a.y - b0.h * 0.75)) - b0.y; }
          else dy = climb * (1 - grow(t));
        }
        el.style.translate = dy ? `0 ${dy.toFixed(2)}px` : "none";
        if (stem) { stem.style.height = Math.max(0, climb - dy).toFixed(2) + "px"; stem.style.translate = `0 ${dy.toFixed(2)}px`; stem.style.opacity = vis.toFixed(4); }
      },
    };
  },
});
