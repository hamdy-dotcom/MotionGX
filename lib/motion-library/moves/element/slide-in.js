// Slide in from the side: an element — or a row of cards one after another — slides a short way sideways (x 20–80 px,
// 48 by default: the "slide-left" reveal preset enters from the right) while it fades in (autoAlpha 0 → 1).
// One element: 1.5 × duration (0.9 s at the default) on power4.out. A row of cards: each `duration` on easeOutQuart
// 1 − (1 − p)^4, starting 0.6 s after the header and `stagger` apart (the carousel-loaded feel). Drawers and steps move
// by transform only (nothing reflows). The exit eases in and runs faster than the entrance, carrying on the same way.
// "from-end" / "from-start" mirror in Arabic (the end side is the left there).
// Source: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system SKILL.md revealPresets ("slide-left": x 48,
// autoAlpha 0 → x 0, autoAlpha 1, 0.9 s power4.out) + web-design/mesh-gradient-dark-blue-clean demo (the card row
// sliding in 0.6 s easeOutQuart, 0.6 s + i × 0.15 s) (MIT), put on the clock.
ML.define({
  id: "element.slide-in",
  category: "element",
  name: "Slide in from the side",
  does: "An element - or a row of cards one after another - slides in sideways a short way while fading in.",
  says: ["arrival", "step", "flow", "list", "choice"],
  energy: 2,
  targets: ["card", "screen", "image", "line", "list"],
  duration: [0.5, 2],
  params: {
    direction: { type: "choice", options: ["from-end", "from-start", "up", "down"], default: "from-end" },
    distance: { type: "number", range: [20, 80], default: 48, unit: "px" },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    stagger: { type: "number", range: [0.08, 0.2], default: 0.15, unit: "s" },
    exit: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "element.stagger-grid", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "revealPresets slide-left / slide-right + the mesh-gradient-dark-blue-clean card row (0.6 s easeOutQuart, 0.6 s + i × 0.15 s); every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const quint = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 5); // power4.out
    const quart = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // easeOutQuart
    const ein = (t, a, b) => Math.pow(ML.lin(t, a, b), 3); // power2.in-ish exit

    // what slides: the target's own items (a list / a row of cards), the target itself, or a sample card row we build
    let items = [], header = null, backdrop = null, row = false;
    const kids = own && own.tagName !== "IMG" && own.tagName.toLowerCase() !== "svg" ? [...own.children].filter((c) => c.offsetWidth > 0) : [];
    if (own && kids.length > 1) { items = kids; row = true; }
    else if (own) items = [own];
    else {
      const R = f.pic;
      const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;justify-content:center;gap:${36 * k}px;pointer-events:none;z-index:6;isolation:isolate;`, host);
      backdrop = mk("div", `position:absolute;inset:${-24 * k}px;background:var(--x-ground);border-radius:var(--x-radius);z-index:-1;`, layer);
      header = mk("div", `display:flex;flex-direction:column;gap:${10 * k}px;`, layer);
      mk("div", `font:var(--x-label-weight) ${22 * k}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, header, rtl ? "اختار اللي يناسبك" : "Pick what fits");
      mk("div", `font:var(--x-head-weight) ${Math.min(64 * k, R.w * 0.07)}px/1.1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);`, header, rtl ? "ثلاث خطط، ولا مفاجآت" : "Three plans, no surprises");
      const n = f.wide ? 4 : 3;
      const cards = mk("div", `display:grid;grid-template-columns:repeat(${n}, 1fr);gap:${20 * k}px;`, layer);
      const T = rtl ? [["أساسي", "٩٩"], ["برو", "١٩٩"], ["فريق", "٣٤٩"], ["شركات", "٧٩٩"]] : [["Basic", "$9"], ["Pro", "$19"], ["Team", "$34"], ["Scale", "$79"]];
      const ch = Math.min(R.h * 0.5, (R.w / n) * 1.25);
      for (let i = 0; i < n; i++) {
        const c = mk("div", `height:${ch}px;box-sizing:border-box;padding:${26 * k}px;display:flex;flex-direction:column;gap:${12 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, cards);
        mk("div", `width:${44 * k}px;height:${44 * k}px;border-radius:calc(var(--x-radius) * 0.4);background:${i === 1 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 16%, transparent)"};`, c);
        mk("div", `font:var(--x-body-weight) ${26 * k}px var(--x-body-font);color:var(--x-dim);`, c, T[i][0]);
        mk("div", `margin-top:auto;font:var(--x-head-weight) ${Math.min(58 * k, (R.w / n) * 0.22)}px var(--x-head-font);color:var(--x-ink);`, c, T[i][1]);
        items.push(c);
      }
      row = true;
    }

    // the offset each item starts from (mirrored for Arabic on the sides)
    const side = rtl ? -1 : 1, d = p.distance * k;
    const vec = { "from-end": [d * side, 0], "from-start": [-d * side, 0], up: [0, d], down: [0, -d] }[p.direction] || [d * side, 0];
    const single = !row;
    const dur = single ? p.duration * 1.5 : p.duration;
    const t0 = header ? at + 0.6 : at;
    const times = items.map((_, i) => t0 + i * p.stagger);
    const lastIn = times[times.length - 1] + dur;
    const outD = dur * 0.55;
    const leaveAt = p.exit ? Math.max(lastIn + 0.2, end - outD - 0.05) : Infinity;
    ctx.sfx(t0, "whoosh.soft", 0.3);
    if (items.length > 2) ctx.sfx(times[items.length - 1], "whoosh.soft", 0.2);

    return {
      draw(t) {
        const q = ein(t, leaveAt, leaveAt + outD);
        if (backdrop) backdrop.style.opacity = (ML.out(t, at - 0.15, at + 0.2) * (1 - q)).toFixed(4);
        if (header) {
          const h = ML.out(t, at, at + 0.4);
          header.style.opacity = (h * (1 - q)).toFixed(4);
          header.style.translate = `0 ${((1 - h) * 16 * k).toFixed(2)}px`;
        }
        items.forEach((el, i) => {
          const u = single ? quint(t, times[i], times[i] + dur) : quart(t, times[i], times[i] + dur);
          const o = u * (1 - q);
          const x = (1 - u) * vec[0] - q * vec[0] * 0.6, y = (1 - u) * vec[1] - q * vec[1] * 0.6;
          el.style.visibility = o < 0.002 ? "hidden" : "visible";
          el.style.opacity = o.toFixed(4);
          el.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : "none";
        });
      },
    };
  },
});
