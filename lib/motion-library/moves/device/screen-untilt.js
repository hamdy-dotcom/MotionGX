// Screen untilt (isometric dashboard untilt): a product dashboard lies tipped back in steep 3D perspective —
// perspective 2000px, rotateX(38deg) rotateY(-12deg) rotateZ(18deg) scale(0.95), preserve-3d — then rotates up to face
// the viewer flat and full size (rotate 0 / scale 1). The web original scrubs it across the hero on scroll (ease none,
// scrub 1); for video it runs on time, 1.2–3 s, power2.inOut (or expo.inOut for snappier, or linear like the scrub).
// A 135deg sheen (light 10% → clear 20%/80% → accent 5%) rides on the card, so it slides against the light as it turns;
// the dial's tick rings keep their own idle spin (a function of t) through the move. "tilt-away" plays it backwards as
// an exit: flat → tipped back, finishing at the scene's end. The card is laid out at its final size (never upscaled:
// scale stays ≤ 1 under the 3D transform). RTL mirrors the Y / Z turn. Works on the target (a screen or card) or on a
// dashboard built in the picture region from the look.
// Source: MengTo/Skills agent-skills/web-design/corner-lasers/demo/index.html (#dash-plane + its gsap.to scrub) (MIT).
ML.define({
  id: "device.screen-untilt",
  category: "device",
  name: "Isometric dashboard untilt",
  does: "A product dashboard lies tipped back in steep 3D perspective, then smoothly rotates up to face the viewer flat and full size.",
  says: ["reveal", "tech", "focus", "arrival"],
  energy: 3,
  targets: ["screen", "card"],
  duration: [1.5, 3.5],
  params: {
    direction: { type: "choice", options: ["untilt", "tilt-away"], default: "untilt" },
    rotate_x: { type: "number", range: [10, 60], default: 38, unit: "deg" },
    rotate_y: { type: "number", range: [-30, 30], default: -12, unit: "deg" },
    rotate_z: { type: "number", range: [-30, 30], default: 18, unit: "deg" },
    ease: { type: "choice", options: ["power2.inOut", "expo.inOut", "linear"], default: "power2.inOut" },
    duration: { type: "number", range: [1.2, 3], default: 2.2, unit: "s" },
    sheen: { type: "bool", default: true },
  },
  pairs: ["device.window-enter", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "MengTo/Skills:agent-skills/web-design/corner-lasers/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(1) + "px";
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const T = (en, ar) => (rtl ? ar : en);

    // ── what turns: the target, or a dashboard we build (the corner-lasers #dash-plane, drawn from the look) ──
    let card, fadeIn = false, rings = [], bars = [];
    if (el) {
      card = el;
      if (el.tagName !== "IMG" && getComputedStyle(el).position === "static") el.style.position = "relative";
    } else {
      fadeIn = true;
      const host = ctx.scene || ctx.stage, R = f.pic;
      const W = Math.min(R.w * 0.9, R.h * 0.75, 620 * (Math.min(f.W, f.H) / 1080)), H = W / 0.75, u = W / 540;
      const wrap = mk("div", `position:absolute;left:${px(R.x)};top:${px(R.y)};width:${px(R.w)};height:${px(R.h)};display:flex;align-items:center;justify-content:center;perspective:2000px;z-index:5;pointer-events:none;`, host);
      card = mk("div", `position:relative;width:${px(W)};height:${px(H)};box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-radius:calc(var(--x-radius) * 0.4);background:var(--x-panel);color:var(--x-ink);font-family:var(--x-body-font);transform-style:preserve-3d;box-shadow:0 ${px(40 * u)} ${px(80 * u)} ${px(-20 * u)} color-mix(in srgb, var(--x-ink) 45%, transparent), 0 0 0 var(--x-edge) var(--x-edge-color), inset 0 1px 0 color-mix(in srgb, var(--x-accent-ink) 12%, transparent);`, wrap);
      card.dir = rtl ? "rtl" : "ltr";
      const label = `font:var(--x-label-weight) ${px(12 * u)} var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`;
      // header: live dot + label, avatar
      const head = mk("div", `flex:none;height:${px(56 * u)};display:flex;align-items:center;justify-content:space-between;padding:0 ${px(24 * u)};border-bottom:var(--x-edge) solid var(--x-line);background:var(--x-panel-2);`, card);
      const hl = mk("div", `display:flex;align-items:center;gap:${px(9 * u)};`, head);
      mk("span", `width:${px(9 * u)};height:${px(9 * u)};border-radius:50%;background:var(--x-accent);box-shadow:0 0 ${px(8 * u)} var(--x-accent);`, hl);
      mk("span", label + "color:var(--x-ink);", hl, T("Live analysis", "تحليل مباشر"));
      mk("span", `width:${px(28 * u)};height:${px(28 * u)};border-radius:50%;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));border:var(--x-edge) solid var(--x-edge-color);`, head);
      // body with its faint grid
      const body = mk("div", `position:relative;flex:1;display:flex;flex-direction:column;gap:${px(16 * u)};padding:${px(24 * u)};overflow:hidden;`, card);
      mk("div", `position:absolute;inset:0;opacity:.5;background-image:linear-gradient(var(--x-line) 1px, transparent 1px), linear-gradient(90deg, var(--x-line) 1px, transparent 1px);background-size:${px(20 * u)} ${px(20 * u)};`, body);
      // the dial: two dashed tick rings (spinning on t) round the score
      const dialRow = mk("div", `position:relative;flex:1;display:flex;align-items:center;justify-content:center;padding:${px(18 * u)} 0;`, body);
      const D = 200 * u;
      const dial = mk("div", `position:relative;width:${px(D)};height:${px(D)};border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, var(--x-panel), var(--x-panel-2));box-shadow:inset 0 2px 4px color-mix(in srgb, var(--x-ink) 18%, transparent), inset 0 0 0 1px var(--x-line), 0 0 ${px(40 * u)} color-mix(in srgb, var(--x-accent) 12%, transparent);`, dialRow);
      const ns = "http://www.w3.org/2000/svg";
      const ringSvg = (r, stroke, w, dash) => {
        const s = doc.createElementNS(ns, "svg"); s.setAttribute("viewBox", "0 0 100 100"); s.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
        const c = doc.createElementNS(ns, "circle"); c.setAttribute("cx", "50"); c.setAttribute("cy", "50"); c.setAttribute("r", String(r)); c.setAttribute("fill", "none");
        c.setAttribute("stroke-width", String(w)); c.setAttribute("stroke-dasharray", dash); c.style.stroke = stroke; s.append(c); dial.append(s); return s;
      };
      rings = [[ringSvg(46, "var(--x-dim)", 1, "2 4"), 18], [ringSvg(42, "var(--x-accent)", 0.8, "1 8"), -12]];
      const score = mk("div", "position:relative;text-align:center;", dial);
      const num = mk("div", `font:300 ${px(36 * u)} var(--x-head-font);letter-spacing:-0.02em;color:var(--x-ink);`, score, "98.4");
      mk("span", `font-size:${px(15 * u)};color:var(--x-dim);`, num, "%");
      mk("div", label + `font-size:${px(10 * u)};color:var(--x-accent);margin-top:${px(4 * u)};`, score, T("Health score", "مؤشر الصحة"));
      // two metric cards with glowing progress lines
      const grid = mk("div", `position:relative;display:grid;grid-template-columns:1fr 1fr;gap:${px(12 * u)};`, body);
      const metric = (name, value, color, share) => {
        const m = mk("div", `position:relative;overflow:hidden;padding:${px(16 * u)};border-radius:calc(var(--x-radius) * 0.3);background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);`, grid);
        mk("div", label + `font-size:${px(10 * u)};margin-bottom:${px(12 * u)};`, m, name);
        mk("div", `font:300 ${px(22 * u)} var(--x-head-font);color:var(--x-ink);`, m, value);
        const track = mk("div", `position:absolute;left:0;right:0;bottom:0;height:${px(3 * u)};background:color-mix(in srgb, ${color} 20%, transparent);`, m);
        bars.push([mk("div", `height:100%;width:${share}%;background:${color};box-shadow:0 0 ${px(8 * u)} ${color};`, track), share]);
      };
      metric(T("Focus", "التركيز"), "12.4", "var(--x-accent)", 60);
      metric(T("Recovery", "التعافي"), T("Optimal", "ممتاز"), "var(--x-good)", 90);
      // controls: a toggle and a slider
      const ctl = mk("div", `position:relative;padding:${px(16 * u)};border-radius:calc(var(--x-radius) * 0.3);background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);display:flex;flex-direction:column;gap:${px(14 * u)};`, body);
      const r1 = mk("div", "display:flex;align-items:center;justify-content:space-between;", ctl);
      mk("span", `font-size:${px(14 * u)};color:var(--x-dim);`, r1, T("Continuous sync", "مزامنة مستمرة"));
      const tog = mk("div", `position:relative;width:${px(40 * u)};height:${px(20 * u)};border-radius:99px;background:var(--x-ink);`, r1);
      mk("div", `position:absolute;${rtl ? "left" : "right"}:${px(2 * u)};top:${px(2 * u)};width:${px(16 * u)};height:${px(16 * u)};border-radius:50%;background:var(--x-accent);box-shadow:0 0 ${px(10 * u)} var(--x-accent);`, tog);
      const r2 = mk("div", "display:flex;align-items:center;justify-content:space-between;", ctl);
      mk("span", label + `font-size:${px(10 * u)};`, r2, T("Daily goal", "الهدف اليومي"));
      mk("span", label + `font-size:${px(10 * u)};color:var(--x-ink);`, r2, "500");
      const sl = mk("div", `position:relative;height:${px(6 * u)};border-radius:99px;background:var(--x-line);`, ctl);
      mk("div", `position:absolute;${rtl ? "right" : "left"}:0;top:0;height:100%;width:40%;border-radius:99px;background:var(--x-dim);`, sl);
      mk("div", `position:absolute;${rtl ? "right" : "left"}:40%;top:50%;width:${px(12 * u)};height:${px(12 * u)};translate:${rtl ? "50%" : "-50%"} -50%;border-radius:50%;background:var(--x-panel);border:var(--x-edge) solid var(--x-ink);`, sl);
    }
    // the sheen rides on the card (not possible inside a picture)
    let sheen = null;
    if (p.sheen && card.tagName !== "IMG" && card.tagName.toLowerCase() !== "svg") {
      if (getComputedStyle(card).overflow === "visible") card.style.overflow = "hidden";
      sheen = mk("div", `position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:20;background:linear-gradient(135deg, color-mix(in srgb, var(--x-accent-ink) 10%, transparent) 0%, transparent 20%, transparent 80%, color-mix(in srgb, var(--x-accent) 5%, transparent) 100%);background-size:100% 160%;`, card);
    }

    // ── timing and easing (closed form of GSAP's eases) ──
    const easeOf = {
      "power2.inOut": (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
      "expo.inOut": (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
      linear: (x) => x,
    }[p.ease] || ((x) => x);
    const dur = ML.clamp(p.duration, 1.2, 3);
    const away = p.direction === "tilt-away";
    const t0 = away ? Math.max(at, end - 0.15 - dur) : at + 0.2, t1 = t0 + dur;
    const flip = rtl ? -1 : 1;
    const rx = ML.clamp(p.rotate_x, 10, 60), ry = ML.clamp(p.rotate_y, -30, 30) * flip, rz = ML.clamp(p.rotate_z, -30, 30) * flip;
    ctx.sfx(t0, "whoosh.heavy", 0.4);
    ctx.sfx(t1 - 0.05, "land.light", 0.25);
    card.style.transformOrigin = "50% 50%";
    card.style.willChange = "transform";

    return {
      draw(t) {
        const e = easeOf(ML.lin(t, t0, t1)), k = away ? e : 1 - e; // k = how tipped back (1 = full tilt)
        card.style.transform = `perspective(2000px) rotateX(${(rx * k).toFixed(3)}deg) rotateY(${(ry * k).toFixed(3)}deg) rotateZ(${(rz * k).toFixed(3)}deg) scale(${(1 - 0.05 * k).toFixed(4)})`;
        if (fadeIn) card.style.opacity = ML.out(t, at - 0.1, at + 0.35).toFixed(4);
        if (sheen) sheen.style.backgroundPosition = `0 ${(k * 60).toFixed(2)}%`;
        // idle loops inside keep running through the move (pure functions of t)
        for (const [r, speed] of rings) r.style.rotate = `${((t * speed) % 360).toFixed(2)}deg`;
        bars.forEach(([b, share], i) => { b.style.width = `${(share + 6 * Math.sin(t * 1.3 + i * 2)).toFixed(2)}%`; });
      },
    };
  },
});
