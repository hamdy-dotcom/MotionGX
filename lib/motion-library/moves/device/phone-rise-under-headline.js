// Phone rises under the headline: the headline shrinks to headline_scale (40 %) and moves up to the top centre
// (0.7 s power3.inOut) while, `offset` (0.1 s) later, a phone with the app rises from the bottom (y +distance % of its
// own height → 0, 0.8 s power3.out) and settles under it, its foot running off the bottom of the frame. The headline
// move is a FLIP: its end box is measured once and only its transform animates, so the text never reflows (Arabic
// lines stay whole). The scene's sub-line and what the picture region held step aside as the phone arrives. On a screen target the phone is built
// around it at its own size; otherwise the stage engine's phone with a sample app of the look.
// Source: rebuilt as our own code from a prompt-motion reference (francoxavier33 "this was 100% opus") — reference
// only, nothing copied.
ML.define({
  id: "device.phone-rise-under-headline",
  category: "device",
  name: "Headline shrinks up as a phone rises in",
  does: "The headline scales down and moves to the top centre while a phone with the app rises from the bottom and settles under it.",
  says: ["arrival", "tech"],
  energy: 2,
  targets: ["screen", "headline"],
  duration: [1, 2.5],
  params: {
    headline_scale: { type: "number", range: [0.3, 0.6], default: 0.4 },
    offset: { type: "number", range: [0, 0.3], default: 0.1, unit: "s" },
    distance: { type: "number", range: [40, 100], default: 60, unit: "%" },
  },
  pairs: ["text-in.punchline", "device.phone-frame", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:francoxavier33-this-was-100-opus", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const rr = (v) => `calc(var(--x-radius) * ${(v / 30).toFixed(4)})`, dr = (v) => `calc(var(--x-device-radius) * ${(v / 74).toFixed(4)})`; // radii scale with the look's
    const T = (en, ar) => (rtl ? ar : en);
    const scene = ctx.scene || ctx.stage;
    const els = ctx.els || [];
    // the two targets: a screen (optional: else we build the phone) and the headline (a slot, else the scene's title)
    const screen = els.find((e) => e !== ctx.stage && e.tagName !== "IMG" && e.dataset.slot === "screen") || null;
    const head = els.find((e) => e.dataset && e.dataset.slot === "headline") || scene.querySelector('[data-slot="headline"]') || scene.querySelector(".ml-title") || scene.querySelector('[data-slot-sample="headline"]');
    const sub = head ? [...(head.parentElement?.classList.contains("ml-head") ? head.parentElement.children : scene.querySelectorAll(".ml-sub"))].filter((e) => e !== head) : [];
    const under = screen ? [] : [...scene.querySelectorAll(".ml-pic > *")];
    const k = Math.min(f.W, f.H) / 1080;
    const hs = ML.clamp(p.headline_scale, 0.3, 0.6);

    // ── FLIP: the headline's start box, its end box (top centre at hs), one transform between ──
    let hb = null, hEnd = null;
    if (head) {
      hb = ctx.box(head);
      // its words' own width (a block's box is the full band)
      const r = doc.createRange(); r.selectNodeContents(head);
      const rr = r.getBoundingClientRect(), sr = ctx.stage.getBoundingClientRect(), kk = sr.width / (ctx.stage.offsetWidth || 1) || 1;
      const tw = rr.width / kk, th = rr.height / kk, tx = (rr.left - sr.left) / kk, ty = (rr.top - sr.top) / kk;
      hb = { x: tx, y: ty, w: tw, h: th };
      hEnd = { cx: f.W / 2, top: f.safe.y * (f.tall ? 0.75 : 0.6) };
      head.style.transformOrigin = `${px(tx - ctx.box(head).x + tw / 2)} ${px(ty - ctx.box(head).y)}`; // the text's top centre
    }
    const headBottom = hEnd ? hEnd.top + hb.h * hs : f.safe.y;

    // ── the phone, under the headline, its foot off the bottom of the frame ──
    const gap = 36 * k;
    const topY = headBottom + gap;
    let u, sx, sy, sw, sh;
    if (screen) { const b = ctx.box(screen); u = b.w / 434; sx = b.x; sy = b.y; sw = b.w; sh = b.h; }
    else {
      const avail = f.H - topY;
      u = Math.min((avail * 1.12) / 960, (f.W * 0.8) / 470); // built at this size, its foot past the frame's bottom
      sw = 434 * u; sh = 924 * u; sx = f.W / 2 - sw / 2; sy = topY + 18 * u;
    }
    const B = 18 * u;
    const ph = mk("div", `position:absolute;left:${px(sx - B)};top:${px(sy - B)};width:${px(sw + 2 * B)};height:${px(sh + 2 * B)};z-index:6;pointer-events:none;`, scene);
    mk("div", `position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--x-device-radius) * ${u.toFixed(4)});${screen ? `border:${px(B)} solid var(--x-device);` : "background:var(--x-device);"}box-shadow:var(--x-shadow);`, ph);
    if (!screen) {
      const s = mk("div", `position:absolute;left:${px(B)};top:${px(B)};width:${px(sw)};height:${px(sh)};border-radius:calc((var(--x-device-radius) - 16px) * ${u.toFixed(4)});overflow:hidden;background:var(--x-panel);color:var(--x-ink);font-family:var(--x-body-font);`, ph);
      s.dir = rtl ? "rtl" : "ltr";
      const top = mk("div", `position:absolute;top:${px(84 * u)};inset-inline:${px(26 * u)};display:flex;align-items:center;justify-content:space-between;`, s);
      mk("b", `font:var(--x-head-weight) ${px(34 * u)}/1.1 var(--x-head-font);`, top, T("Home", "الرئيسية"));
      mk("i", `width:${px(56 * u)};height:${px(56 * u)};border-radius:50%;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, top);
      const bal = mk("div", `position:absolute;top:${px(170 * u)};inset-inline:${px(22 * u)};height:${px(220 * u)};border-radius:${rr(30 * u)};background:var(--x-ink);color:var(--x-panel);padding:${px(28 * u)};box-sizing:border-box;`, s);
      mk("div", `font-size:${px(20 * u)};opacity:.7;`, bal, T("Balance", "الرصيد"));
      mk("div", `margin-top:${px(10 * u)};font:var(--x-head-weight) ${px(70 * u)}/1 var(--x-head-font);direction:ltr;text-align:${rtl ? "right" : "left"};`, bal, "4,500");
      const pills = mk("div", `position:absolute;top:${px(420 * u)};inset-inline:${px(22 * u)};display:flex;gap:${px(12 * u)};`, s);
      for (let i = 0; i < 3; i++) mk("i", `flex:1;height:${px(110 * u)};border-radius:${rr(24 * u)};background:${i === 0 ? "var(--x-accent)" : "var(--x-panel-2)"};`, pills);
      for (let i = 0; i < 4; i++) {
        const r = mk("div", `position:absolute;top:${px((560 + i * 88) * u)};inset-inline:${px(22 * u)};height:${px(72 * u)};display:flex;align-items:center;gap:${px(14 * u)};padding:0 ${px(16 * u)};box-sizing:border-box;border-radius:${rr(20 * u)};background:var(--x-panel-2);`, s);
        mk("i", `flex:none;width:${px(40 * u)};height:${px(40 * u)};border-radius:50%;background:${["var(--x-good)", "var(--x-accent)", "var(--x-accent-2)", "var(--x-dim)"][i]};opacity:.85;`, r);
        mk("i", `height:${px(10 * u)};width:${(40 + ML.rnd(i, 2) * 40).toFixed(0)}%;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 26%, transparent);`, r);
      }
    }
    mk("i", `position:absolute;left:50%;top:${px(B + 12 * u)};width:${px(130 * u)};height:${px(36 * u)};margin-left:${px(-65 * u)};border-radius:${rr(20 * u)};background:var(--x-device);z-index:2;`, ph);
    const moving = screen ? [ph, screen] : [ph];

    // ── timing ──
    const h1 = at + 0.7;
    const p0 = at + ML.clamp(p.offset, 0, 0.3), p1 = p0 + 0.8;
    const dist = (ML.clamp(p.distance, 40, 100) / 100) * (sh + 2 * B);
    ctx.sfx(at, "whoosh.soft", 0.3);
    ctx.sfx(p1 - 0.25, "land.light", 0.25);
    const p3o = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    const p3io = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut

    return {
      draw(t) {
        if (head) {
          const e = p3io(ML.lin(t, at, h1));
          const s = 1 + (hs - 1) * e;
          const dx = (hEnd.cx - (hb.x + hb.w / 2)) * e, dy = (hEnd.top - hb.y) * e;
          head.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          head.style.scale = e > 0 ? s.toFixed(4) : "none";
          const so = (1 - ML.ease(t, at, at + 0.35)).toFixed(4);
          for (const x of sub) x.style.opacity = so;
        }
        if (under.length) { const v = (1 - ML.ease(t, p0, p0 + 0.45)).toFixed(4); for (const x of under) x.style.opacity = v; }
        const e = p3o(ML.lin(t, p0, p1));
        for (const m of moving) {
          m.style.visibility = t < p0 - 1e-6 ? "hidden" : "visible";
          m.style.opacity = ML.lin(t, p0, p0 + 0.15).toFixed(4);
          m.style.transform = `translateY(${((1 - e) * dist).toFixed(2)}px)`;
        }
      },
    };
  },
});
