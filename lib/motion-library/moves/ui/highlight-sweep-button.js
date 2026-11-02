// Highlight sweep on button: a narrow band of light glides across a translucent pill. The button is the image-first
// grid layout's glass control — a top-to-bottom gradient of the light ink at 15 % → 5 %, an inset 1 px top highlight
// (20 %), an inset 1 px bottom shade (ink 30 %), a 1 px edge at 10 %, fully round — sitting on a picture card drawn from
// the look's colours. The sweep is the ::after band: `width` % of the button, skewed `angle`, a gradient transparent →
// light 25 % → transparent, travelling from fully before the button to fully past it over 0.9 s power2.inOut, once on
// entrance (interval 0) or again every `interval` s. On a target the director gives, only the band is added (clipped
// to that element's own radius); alone it builds the card and the button. In Arabic the band travels right to left.
// Source: MengTo/Skills web-design/image-first-grid-layout (MIT).
ML.define({
  id: "ui.highlight-sweep-button",
  category: "ui",
  name: "Highlight sweep on button",
  does: "A narrow band of light glides across a translucent button's surface.",
  says: ["focus", "luxury", "arrival"],
  energy: 2,
  targets: ["card", "label"],
  duration: [0.9, 4],
  params: {
    interval: { type: "number", range: [0, 4], default: 0, unit: "s" },
    width: { type: "number", range: [20, 40], default: 30, unit: "%" },
    angle: { type: "number", range: [-30, -10], default: -20, unit: "deg" },
    sweep: { type: "number", range: [0.6, 1.4], default: 0.9, unit: "s" },
    button: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.cta-button-rise"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/image-first-grid-layout", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k;
    const LIGHT = "var(--x-accent-ink)";
    const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
    const probe = mk("span", "position:absolute;visibility:hidden;", host);
    const lum = (v) => { probe.style.color = v; const c = getComputedStyle(probe).color, n = c.match(/[\d.]+/g).map(Number), d = c.startsWith("color(") ? 1 : 255; return (0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]) / d; };
    const inkLight = lum("var(--x-ink)") > lum("var(--x-panel)"), SHADE = lum(LIGHT) > 0.5 ? (inkLight ? "var(--x-panel)" : "var(--x-ink)") : (inkLight ? "var(--x-ink)" : "var(--x-panel)"); // the dark side of the picture, opposite the button's light

    let btn = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, wrap = null, card = null;
    if (!btn) {
      const R = f.pic;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;z-index:6;pointer-events:none;`, host);
      const cw = Math.min(R.w * 0.86, R.h * 1.25, 900 * k), ch = Math.min(R.h * 0.88, cw * 0.8);
      card = mk("div", `position:relative;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;border-radius:var(--x-radius);overflow:hidden;box-shadow:var(--x-shadow);background:linear-gradient(160deg, var(--x-accent-2), var(--x-accent) 55%, color-mix(in srgb, var(--x-accent) 55%, ${SHADE}));`, wrap);
      // a drawn picture (look colours only): soft sun, two ridges
      const art = sv("svg", { viewBox: "0 0 100 80", preserveAspectRatio: "xMidYMid slice", style: "position:absolute;inset:0;width:100%;height:100%;" }, card);
      sv("circle", { cx: rtl ? 30 : 70, cy: 26, r: 13, fill: LIGHT, "fill-opacity": 0.35 }, art);
      sv("path", { d: "M0 52 Q22 36 44 48 T100 42 V80 H0 Z", fill: SHADE, "fill-opacity": 0.22 }, art);
      sv("path", { d: "M0 62 Q30 50 58 60 T100 56 V80 H0 Z", fill: SHADE, "fill-opacity": 0.32 }, art);
      const cap = mk("div", `position:absolute;inset-inline-start:${(48 * k).toFixed(1)}px;top:${(44 * k).toFixed(1)}px;color:${LIGHT};font:var(--x-label-weight) ${(22 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);opacity:.85;`, card, rtl ? "مجموعة جديدة" : "New collection");
      cap.dir = rtl ? "rtl" : "ltr";
      btn = mk("div", `position:absolute;left:50%;bottom:${(ch * 0.12).toFixed(1)}px;translate:-50% 0;display:flex;align-items:center;gap:0.5em;white-space:nowrap;padding:${(16 * s).toFixed(1)}px ${(30 * s).toFixed(1)}px;border-radius:var(--x-radius-s);font:600 ${(17 * s).toFixed(1)}px var(--x-body-font);color:${LIGHT};background:linear-gradient(180deg, ${mix(LIGHT, 15)}, ${mix(LIGHT, 5)});box-shadow:inset 0 ${s}px ${s}px ${mix(LIGHT, 20)}, inset 0 ${-s}px ${s}px ${mix(SHADE, 30)};border:${s}px solid ${mix(LIGHT, 10)};`, card, p.button || (rtl ? "تصفّح المجموعة" : "Explore the collection"));
      const arr = sv("svg", { viewBox: "0 0 24 24", width: "1em", height: "1em", style: rtl ? "transform:scaleX(-1)" : "" }, btn);
      sv("path", { d: "M5 12h13M13 6l6 6-6 6", fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, arr);
    }
    // what the band is made of: the button's light on our picture or a dark target; a white band would vanish on a light
    // target, so there it is the accent
    let bandC = mix(LIGHT, 25);
    if (!wrap) {
      let surface = 0;
      for (let n = btn; n; n = n.parentElement) {
        const cs = getComputedStyle(n); if (cs.backgroundImage !== "none") break;
        const c = cs.backgroundColor, v = c.match(/[\d.]+/g).map(Number), d = c.startsWith("color(") ? 1 : 255, a = v.length > 3 ? v[3] : 1;
        if (a > 0.5) { surface = (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / d; break; }
      }
      if (surface > 0.6) bandC = mix("var(--x-accent)", 30);
    }
    probe.remove();
    // the band, clipped to the button's own shape
    if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
    const clip = mk("span", `position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;`, btn);
    const band = mk("span", `position:absolute;top:-20%;bottom:-20%;left:0;width:${p.width}%;transform:skewX(${(rtl ? -p.angle : p.angle).toFixed(1)}deg);background:linear-gradient(90deg, transparent, ${bandC}, transparent);`, clip);

    // sweeps: once at entrance, or every `interval` s while the move runs
    // (a short slot shortens the first beat and the pass itself, so the band always finishes)
    const sw = Math.min(p.sweep, Math.max(0.3, end - at - (wrap ? 0.35 : 0.1)));
    const first = at + Math.min(0.3, Math.max(0.05, end - at - sw - (wrap ? 0.3 : 0.05))), sweeps = [first];
    if (p.interval > 0) { const gap = Math.max(p.interval, sw + 0.2); for (let x = first + gap; x + sw < end - 0.2; x += gap) sweeps.push(x); }
    sweeps.forEach((x, i) => ctx.sfx(x, "whoosh.soft", i ? 0.08 : 0.14));
    const pio = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const from = -p.width - 25, to = 125; // % of the button: fully before → fully past (skew included)

    return {
      draw(t) {
        let pos = null;
        for (const x of sweeps) if (t >= x && t <= x + sw) pos = from + (to - from) * pio(ML.lin(t, x, x + sw));
        band.style.visibility = pos == null ? "hidden" : "visible";
        if (pos != null) band.style.left = (rtl ? 100 - p.width - pos : pos).toFixed(3) + "%";
        if (wrap) {
          const e = ML.out(t, at, at + 0.45), l = ML.clamp((t - (end - 0.25)) / 0.22);
          wrap.style.opacity = (t < at ? 0 : e * (1 - l)).toFixed(4);
          card.style.translate = `0 ${((1 - e) * 26 * k).toFixed(2)}px`;
        }
      },
    };
  },
});
