// Brutal hover snap: a button with a 3 px solid border and a hard offset shadow (8 px 8 px 0) is hovered by the
// pointer: it jumps up-left by `lift` while the shadow grows to 12 px, on the source's snap curve
// cubic-bezier(.175, .885, .32, 1.275) (100 ms in CSS, held a touch longer so a video frame sees the overshoot). With
// `press`, the click drives it down into its shadow (translate +lift, shadow 0) in 80 ms and releases back to the lift.
// Shadow in ink, accent, or panel-on-ink (the white-on-dark variant). Arabic mirrors the offset (lift up-right, shadow
// down-left). Short beats tighten the hover and press; the pointer rests on the button's corner, clear of its label.
// Source: MengTo/Skills web-design/webgl-3d-object demo (.border-brutal / .hover-snap, MIT).
ML.define({
  id: "ui.brutal-hover-snap",
  category: "ui",
  name: "Hard-shadow lift (brutal button)",
  does: "A thick-bordered button jumps away from its solid offset shadow as the pointer hovers, with a snappy overshoot, then is pressed down into it.",
  says: ["energy", "choice", "urgency"],
  energy: 3,
  targets: ["card", "label"],
  duration: [0.9, 1.6],
  params: {
    shadow_colour: { type: "choice", options: ["black", "accent", "white"], default: "black" },
    lift: { type: "number", range: [2, 6], default: 4, unit: "px" },
    press: { type: "bool", default: true },
    label: { type: "text", default: "Get started" },
    pointer: { type: "bool", default: true },
  },
  pairs: ["ui.button-fill"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:web-design/webgl-3d-object", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const kk = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const SH = { black: "var(--x-ink)", accent: "var(--x-accent)", white: "var(--x-panel)" }[p.shadow_colour];
    let btn, R;
    if (own) {
      const plate = p.shadow_colour === "white";
      const box = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:grid;place-items:center;`, layer);
      if (plate) mk("div", `position:absolute;inset:8%;background:var(--x-ink);border-radius:var(--x-radius)`, box);
      btn = mk("div", `position:relative;font:var(--x-head-weight) ${(52 * kk).toFixed(1)}px var(--x-head-font);text-transform:var(--x-head-case);padding:${(30 * kk).toFixed(1)}px ${(64 * kk).toFixed(1)}px;background:${plate ? "var(--x-accent)" : "var(--x-panel)"};color:${plate ? "var(--x-accent-ink)" : "var(--x-ink)"};border:${(6 * kk).toFixed(1)}px solid ${plate ? "var(--x-panel)" : "var(--x-ink)"};`, box,
        rtl && p.label === "Get started" ? "ابدأ الآن" : p.label);
    } else {
      btn = ctx.el;
      btn.style.border = `${(6 * kk).toFixed(1)}px solid var(--x-ink)`;
    }
    R = ctx.box(btn);
    // the border is 3 px on a ~56 px button: everything scales with the button's height
    const u = Math.max(1, R.h / 56) * 1.0;
    const dir = rtl ? -1 : 1;
    const ptr = mk("div", "position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;", layer);
    const pw = 56 * kk;
    ptr.innerHTML = `<svg width="${pw}" height="${pw * 1.3}" viewBox="0 0 20 26" style="position:absolute;left:${-pw * 0.12}px;top:${-pw * 0.06}px;${rtl ? "transform:scaleX(-1);transform-origin:12% 0" : ""}"><path d="M1 1 L1 21 L6 16.5 L9.5 24.5 L13 23 L9.6 15.2 L16.5 15 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const snap = ML.bezier(0.175, 0.885, 0.32, 1.275);
    const z = ML.clamp((end - at - 0.3) / 0.96, 0.6, 1); // the beat, tightened to the time it has
    const tH = at + 0.3 * z, dH = 0.16, tP = tH + 0.32 * z;
    const goal = { x: R.x + R.w * (rtl ? 0.14 : 0.86), y: R.y + R.h * 0.76 };
    const from = { x: goal.x + dir * R.w * 0.45, y: goal.y + R.h * 2.2 };
    ctx.sfx(tH, "snap", 0.35);
    if (p.press) ctx.sfx(tP, "click", 0.45);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        // lift: rest (8) → lifted (8 + lift)
        let L = snap(ML.lin(t, tH, tH + dH));
        let off = -p.lift * L, sh = 8 + p.lift * L;
        if (p.press) {
          const down = ML.lin(t, tP, tP + 0.08), up = ML.out(t, tP + 0.16 * z, tP + 0.34 * z);
          const pr = down * (1 - up);
          off = off + (p.lift - off) * pr; sh = sh * (1 - pr);
        }
        btn.style.translate = `${(off * u * dir).toFixed(2)}px ${(off * u).toFixed(2)}px`;
        btn.style.boxShadow = `${(sh * u * dir).toFixed(2)}px ${(sh * u).toFixed(2)}px 0 0 ${SH}`;
        if (own) layer.style.opacity = (1 - leave).toFixed(4);
        // the pointer glides in to hover, then rides the press
        const show = p.pointer && t >= at - 1e-6;
        ptr.style.visibility = show ? "visible" : "hidden";
        if (show) {
          const g = ML.expo(t, at, tH + 0.05);
          const x = from.x + (goal.x - from.x) * g + off * u * dir * 0.6, y = from.y + (goal.y - from.y) * g + off * u * 0.6;
          ptr.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(1 - 0.12 * ML.pulse(t, tP, 0.04, 0.12)).toFixed(4)})`;
          ptr.style.opacity = (ML.lin(t, at, at + 0.12) * (1 - leave)).toFixed(4);
        }
      },
    };
  },
});
