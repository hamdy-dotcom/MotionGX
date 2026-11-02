// Thinking orb, "listening": a short row of dots bobs in a travelling wave like a voice level meter: each dot's
// height and size follow sin(wt - k*i), amplitude about a quarter of the orb, swelling and easing with a seeded
// "voice" envelope so it never looks mechanical.
// Common to every thinking orb: monochrome dots painted as canvas arcs on a transparent 2D canvas (no WebGL, no
// filters); two tuned presets, 20 (inline beside status text) and 64 (avatar / empty-state scale), each with its own
// dot count, dot size and speed — never one scaled into the other; theme "light" = ink dots on the look's own surface, "dark"
// = ground-coloured dots on an inverted (ink) surface, so the dots read under light and dark looks alike; one shared clock (scene time) so several orbs stay in phase;
// speed 0.75–1.25; "paused" freezes the frame; it fades away at the end, where the result takes over. On a label it
// sits inline before the text; on a shape it fills it; with no target it builds a status chip (orb + status text) on
// the scene (so it leaves with its scene). Every frame is painted from t alone.
// Source: MengTo/Skills web-design/thinking-orbs (MIT; the ThinkingOrb contract — states, presets, theme, speed,
// pause), painters rebuilt as our own code.
ML.define({
  id: "ui.thinking-orb-wave",
  category: "ui",
  name: "Thinking orb: listening wave",
  does: "A short row of dots bobs in a travelling wave like a voice level meter.",
  says: ["calm", "connection", "time"],
  energy: 2,
  targets: ["shape", "label"],
  duration: [1, 6],
  params: {
    size: {type: "choice", options: ["20", "64"], default: "64"},
    theme: {type: "choice", options: ["light", "dark"], default: "light"},
    speed: {type: "number", range: [0.75, 1.25], default: 1},
    paused: {type: "bool", default: false},
    status: {type: "text", default: ""},
  },
  pairs: ["ui.live-pill-dot", "ui.skeleton-shimmer"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/thinking-orbs", license: "MIT", note: "state, presets and canvas contract from the skill; the painter is our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const layer = ctx.scene || stage; // built things live in the scene, which hides them with it (never left on the stage)
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const rtlDir = rtl ? -1 : 1;
    const PRESETS = { "20": { n: 5, gap: 3.5, r: 1.25, amp: 4.4, w: 7.5, k: 0.85 }, "64": { n: 7, gap: 7.6, r: 2.9, amp: 14, w: 6, k: 0.7 } };
    const P = PRESETS[String(p.size)] || PRESETS["64"], S = Number(p.size) === 20 ? 20 : 64;
    // a smooth seeded "voice level" in 0.45–1 (value noise over ML.rnd)
    const level = (x) => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return 0.45 + 0.55 * (ML.rnd(i, 7) + (ML.rnd(i + 1, 7) - ML.rnd(i, 7)) * s); };
    const paint = (g, T, P, S) => {
      const c = S / 2, x0 = c - ((P.n - 1) * P.gap) / 2, env = level(T * 2.2);
      for (let i = 0; i < P.n; i++) {
        const v = Math.sin(P.w * T - P.k * i * (rtlDir)), mid = 1 - Math.abs(i - (P.n - 1) / 2) / P.n; // middle dots reach further
        g.globalAlpha = 0.55 + 0.45 * (v + 1) / 2;
        g.beginPath(); g.arc(x0 + i * P.gap, c - v * P.amp * env * (0.55 + 0.45 * mid), P.r * (0.8 + 0.2 * (v + 1) / 2), 0, Math.PI * 2); g.fill();
      }
    };
    // where it sits and how big it shows (the preset's design is kept; only the canvas is sized to its place)
    let wrap, D;
    const solid = el && /^(IMG|CANVAS|SVG|VIDEO)$/i.test(el.tagName); // can't hold a canvas: the orb sits over it, in the scene
    const isLabel = el && !solid && (el.textContent || "").trim().length > 0;
    if (el && isLabel) {
      const fs = parseFloat(getComputedStyle(el).fontSize) || 24;
      D = S === 20 ? fs * 1.25 : fs * 2.6;
      wrap = mk("span", `display:inline-block;vertical-align:middle;width:${D}px;height:${D}px;margin-inline-end:${(fs * 0.5).toFixed(1)}px`);
      el.prepend(wrap);
    } else if (el) {
      const r = ctx.box(el), side = Math.max(8, Math.min(r.w, r.h));
      D = S === 20 ? Math.min(side, Math.min(f.W, f.H) * 0.05) : side * 0.9;
      if (solid) wrap = mk("span", `position:absolute;left:${r.x + r.w / 2}px;top:${r.y + r.h / 2}px;width:${D}px;height:${D}px;margin:${-D / 2}px 0 0 ${-D / 2}px;pointer-events:none;z-index:20`, layer);
      else {
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        wrap = mk("span", `position:absolute;left:50%;top:50%;width:${D}px;height:${D}px;margin:${-D / 2}px 0 0 ${-D / 2}px;pointer-events:none`, el);
      }
    } else {
      // no target: a status chip in the scene, centred on the picture region
      const u = Math.min(f.W, f.H) / 1080, big = S === 64, fs = 34 * u;
      D = big ? 150 * u : fs * 1.3;
      const chip = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:-50% -50%;display:flex;flex-direction:${big ? "column" : "row"};align-items:center;gap:${(big ? 26 : 16) * u}px;padding:${(big ? 44 : 20) * u}px ${(big ? 56 : 30) * u}px;border-radius:${big ? "var(--x-radius)" : "var(--x-radius-s)"};background:${p.theme === "dark" ? "var(--x-ink)" : "var(--x-panel)"};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);z-index:20;white-space:nowrap`, layer);
      wrap = mk("span", `display:block;width:${D}px;height:${D}px;flex:none`, chip);
      mk("span", `font:var(--x-body-weight) ${fs}px var(--x-body-font);color:${p.theme === "dark" ? "var(--x-ground)" : "var(--x-dim)"}`, chip, p.status || (rtl ? "بيسمع…" : "Listening…"));
      wrap = Object.assign(wrap, { chip });
    }
    const host = wrap.chip || wrap;
    host.style.opacity = "0";
    const cv = mk("canvas", "display:block;width:100%;height:100%", wrap);
    const px = Math.max(16, Math.ceil(D * 2));
    cv.width = px; cv.height = px;
    const g = cv.getContext("2d");
    // the dot colour from the look: ink dots on its own surface, ground-coloured dots on an inverted one
    const probe = mk("span", `color:${p.theme === "dark" ? "var(--x-ground)" : "var(--x-ink)"}`, wrap);
    const ink = getComputedStyle(probe).color; probe.remove();
    ctx.sfx(at, "blip", 0.15);
    const speed = ML.clamp(+p.speed || 1, 0.75, 1.25);
    return {
      draw(t) {
        const o = ML.ease(t, at, at + 0.25) * (1 - ML.ease(t, end - 0.35, end - 0.05));
        host.style.opacity = o.toFixed(4);
        host.style.visibility = o > 0.001 ? "visible" : "hidden";
        // one clock for every orb: scene time (paused holds the frame it starts on)
        const T = (p.paused ? Math.max(0, at - ctx.from) : Math.max(0, t - ctx.from)) * speed;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, px, px);
        if (o <= 0.001) return;
        g.setTransform(px / S, 0, 0, px / S, 0, 0);
        g.fillStyle = ink;
        paint(g, T, P, S);
        g.globalAlpha = 1;
      },
    };
  },
});
