// Phone rise: a phone rises or springs into its place in the frame and settles — three strengths of one move.
//   pop   — from scale start_scale (0.9–0.95) and y +80 px, 0.55 s back.out(1.6) (at "start" is already 0.15 s into
//           the scene; on a word it lands on the word; springs into the centre: the stage engine's pop()).
//   rise  — y +distance (default 300 px), opacity 0 → 1, `duration` (0.8 s) expo.out, one beat after its frame
//           appears (S.appvideo's phone: gsap y 300 → 0, expo.out).
//   glide — from below the frame's edge (y +100 %) to its place with scale start_scale → 1, `duration` power3.out,
//           while what was there fades; a second device may peek behind it, rising a beat later.
// "side" slides on x instead (from the inline end; RTL from the left), with an optional tilt settling to 0. Rule kept
// from the live engine: a real product UI never slides in — this is for drawn / illustrative phones or recorded
// screens. On a screen target the phone is built around it at its own size and the two move together; otherwise the
// stage engine's phone (470 × 960, 18 px bezel, notch pill, the look's device ink) with a sample app of the look.
// Source: MotionGX's own lib/studio-engine/assets/scenes.js (S.phone / phoneIn pop, S.appvideo rise); glide rebuilt
// from prompt-motion gautam-mer1 "i asked claude opus" (reference only).
ML.define({
  id: "device.phone-rise",
  category: "device",
  name: "Phone rises into place",
  does: "A phone rises or springs up into position in the frame and settles.",
  says: ["arrival", "tech"],
  energy: 3,
  targets: ["screen"],
  duration: [0.6, 2],
  params: {
    style: { type: "choice", options: ["pop", "rise", "glide"], default: "rise" },
    from: { type: "choice", options: ["bottom", "side"], default: "bottom" },
    distance: { type: "number", range: [80, 1000], default: 300, unit: "px" },
    start_scale: { type: "number", range: [0.9, 1], default: 0.95 },
    duration: { type: "number", range: [0.5, 1], default: 0.8, unit: "s" },
    tilt: { type: "number", range: [0, 6], default: 0, unit: "deg" },
    second_device: { type: "bool", default: false },
  },
  pairs: ["device.phone-frame", "device.phone-cards-fan-out", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.phone / phoneIn / S.appvideo; glide from prompt-motion gautam-mer1-i-asked-claude-opus (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const rr = (v) => `calc(var(--x-radius) * ${(v / 30).toFixed(4)})`, dr = (v) => `calc(var(--x-device-radius) * ${(v / 74).toFixed(4)})`; // radii scale with the look's
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const style = ["pop", "rise", "glide"].includes(p.style) ? p.style : "rise";
    const second = !!p.second_device;

    // ── the phone: around the target, or the stage engine's phone ──
    let u, sx, sy, sw, sh;
    const R = f.pic;
    if (el) { const b = ctx.box(el); u = b.w / 434; sx = b.x; sy = b.y; sw = b.w; sh = b.h; }
    else {
      u = Math.min((R.h * 0.96) / 960, (R.w * (second ? 0.6 : 0.9)) / 470, 1.16 * k);
      const W = 470 * u, cx = R.x + R.w / 2 + (second ? (rtl ? -1 : 1) * W * 0.18 : 0);
      sx = cx - W / 2 + 18 * u; sy = R.y + (R.h - 960 * u) / 2 + 18 * u; sw = 434 * u; sh = 924 * u;
    }
    const B = 18 * u;
    const buildPhone = (x, y, fill) => {
      const ph = mk("div", `position:absolute;left:${px(x - B)};top:${px(y - B)};width:${px(sw + 2 * B)};height:${px(sh + 2 * B)};pointer-events:none;`, host);
      mk("div", `position:absolute;inset:0;box-sizing:border-box;border-radius:calc(var(--x-device-radius) * ${u.toFixed(4)});${fill ? "background:var(--x-device);" : `border:${px(B)} solid var(--x-device);`}box-shadow:var(--x-shadow);`, ph);
      let scr = null;
      if (fill) {
        scr = mk("div", `position:absolute;left:${px(B)};top:${px(B)};width:${px(sw)};height:${px(sh)};border-radius:calc((var(--x-device-radius) - 16px) * ${u.toFixed(4)});overflow:hidden;background:var(--x-panel);color:var(--x-ink);font-family:var(--x-body-font);`, ph);
        scr.dir = rtl ? "rtl" : "ltr";
      }
      mk("i", `position:absolute;left:50%;top:${px(B + 12 * u)};width:${px(130 * u)};height:${px(36 * u)};margin-left:${px(-65 * u)};border-radius:${rr(20 * u)};background:var(--x-device);z-index:2;`, ph);
      return { ph, scr };
    };
    // the peeking second device, behind
    let back = null;
    if (second) {
      const off = (rtl ? 1 : -1) * sw * 0.42;
      back = buildPhone(sx + off, sy - sh * 0.06, true);
      back.ph.style.zIndex = "5";
      back.ph.style.transformOrigin = "50% 100%";
      const s = back.scr;
      s.style.background = "linear-gradient(170deg, color-mix(in srgb, var(--x-accent-2) 40%, var(--x-panel)), var(--x-panel-2))";
      for (let i = 0; i < 5; i++) mk("i", `position:absolute;top:${px((110 + i * 120) * u)};inset-inline:${px(26 * u)};height:${px(96 * u)};border-radius:${rr(22 * u)};background:color-mix(in srgb, var(--x-panel) 80%, transparent);`, s);
    }
    const front = buildPhone(sx, sy, !el);
    front.ph.style.zIndex = "6";
    if (front.scr) {
      const s = front.scr;
      const head = mk("div", `position:absolute;top:${px(84 * u)};inset-inline:${px(26 * u)};display:flex;align-items:center;gap:${px(16 * u)};`, s);
      mk("i", `flex:none;width:${px(60 * u)};height:${px(60 * u)};border-radius:50%;background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, head);
      const hn = mk("div", "display:flex;flex-direction:column;gap:0.2em;", head);
      mk("b", `font:var(--x-head-weight) ${px(28 * u)}/1.1 var(--x-head-font);`, hn, T("Your plan", "خطتك"));
      mk("span", `font-size:${px(19 * u)};color:var(--x-dim);`, hn, T("Updated just now", "اتحدّثت دلوقتي"));
      const card = mk("div", `position:absolute;top:${px(180 * u)};inset-inline:${px(22 * u)};height:${px(300 * u)};border-radius:${rr(30 * u)};background:linear-gradient(150deg, var(--x-accent), color-mix(in srgb, var(--x-accent-2) 60%, var(--x-panel)));`, s);
      const bars = mk("div", `position:absolute;inset-inline:${px(26 * u)};bottom:${px(26 * u)};height:${px(150 * u)};display:flex;align-items:flex-end;gap:${px(12 * u)};direction:ltr;`, card);
      for (let i = 0; i < 7; i++) mk("i", `flex:1;height:${(30 + i * 10 + ML.rnd(i, 3) * 15).toFixed(0)}%;border-radius:${rr(8 * u)};background:color-mix(in srgb, var(--x-accent-ink) ${(45 + i * 7)}%, transparent);`, bars);
      for (let i = 0; i < 4; i++) {
        const r = mk("div", `position:absolute;top:${px((510 + i * 92) * u)};inset-inline:${px(22 * u)};height:${px(76 * u)};display:flex;align-items:center;gap:${px(16 * u)};padding:0 ${px(18 * u)};box-sizing:border-box;border-radius:${rr(22 * u)};background:var(--x-panel-2);`, s);
        mk("i", `flex:none;width:${px(40 * u)};height:${px(40 * u)};border-radius:${rr(12 * u)};background:${["var(--x-accent)", "var(--x-good)", "var(--x-accent-2)", "var(--x-dim)"][i]};opacity:.85;`, r);
        mk("i", `height:${px(10 * u)};width:${(40 + ML.rnd(i, 6) * 35).toFixed(0)}%;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 26%, transparent);`, r);
      }
    }
    const moving = el ? [front.ph, el] : [front.ph];
    for (const m of moving) m.style.transformOrigin = m === el ? `${px(sw / 2)} ${px(sh * 0.75)}` : `${px(sw / 2 + B)} ${px(sh * 0.75 + B)}`;

    // ── timing and the path in ──
    const side = p.from === "side";
    const dur = Math.min(style === "pop" ? 0.55 : ML.clamp(p.duration, 0.5, 1), Math.max(0.35, end - at));
    const a0 = at;
    const s0 = ML.clamp(p.start_scale, 0.9, 1);
    const sideDir = rtl ? -1 : 1; // from the inline end
    const phoneTop = sy - B, phoneLeft = sx - B, PH = sh + 2 * B, PW = sw + 2 * B;
    let dist;
    if (style === "pop") dist = Math.min(80, p.distance) * k;
    else if (style === "rise") dist = ML.clamp(p.distance, 80, 1000) * k;
    else dist = side ? (sideDir > 0 ? f.W - phoneLeft : phoneLeft + PW) + 10 : f.H - phoneTop + 10; // from beyond the frame edge
    const backOut = (x, c = 1.6) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
    const p3 = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    const curve = (x) => (style === "pop" ? backOut(x) : style === "rise" ? (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)) : p3(x));
    ctx.sfx(a0, style === "pop" ? "pop.soft" : "whoosh.soft", 0.35);
    if (back) ctx.sfx(a0 + 0.18, "whoosh.soft", 0.2);
    // what was there fades while the phone glides in (glide only, built phones only)
    const under = style === "glide" && !el ? [...(ctx.scene || ctx.stage).querySelectorAll(".ml-pic > *")].filter((e) => e !== front.ph && e !== back?.ph) : [];

    const pose = (t, a) => {
      const x = ML.lin(t, a, a + dur), e = curve(x);
      const off = (1 - e) * dist;
      const sc = style === "rise" ? 1 : s0 + (1 - s0) * Math.min(1, e);
      const o = style === "rise" ? ML.clamp(e * 1.4) : ML.lin(t, a, a + 0.12);
      const tilt = p.tilt * (1 - Math.min(1, e)) * (side ? sideDir : rtl ? -1 : 1);
      return { tr: side ? `translateX(${(sideDir * off).toFixed(2)}px)` : `translateY(${off.toFixed(2)}px)`, sc: Math.min(1, sc), o, tilt };
    };
    return {
      draw(t) {
        const P = pose(t, a0);
        for (const m of moving) {
          m.style.visibility = t < a0 - 1e-6 ? "hidden" : "visible";
          m.style.opacity = P.o.toFixed(4);
          m.style.transform = P.tr;
          m.style.scale = P.sc >= 0.99999 ? "none" : P.sc.toFixed(4);
          m.style.rotate = Math.abs(P.tilt) > 1e-4 ? `${P.tilt.toFixed(3)}deg` : "none";
        }
        if (back) {
          const Q = pose(t, a0 + 0.18);
          back.ph.style.visibility = t < a0 + 0.18 - 1e-6 ? "hidden" : "visible";
          back.ph.style.opacity = (Q.o * 0.95).toFixed(4);
          back.ph.style.transform = `${Q.tr} scale(${(0.9 * Q.sc).toFixed(4)}) rotate(${((rtl ? 1 : -1) * 6 + Q.tilt).toFixed(3)}deg)`;
        }
        if (under.length) { const v = (1 - ML.ease(t, a0, a0 + dur * 0.7)).toFixed(4); for (const e of under) e.style.opacity = v; }
      },
    };
  },
});
