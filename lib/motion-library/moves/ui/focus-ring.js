// Accent focus ring, two ways.
//  · field-focus: a control takes focus — its border turns accent and an outline (`ring` px, accent at 42 %) appears
//    `offset` px from its edge over 0.16 s ease-out; with `nudge` it eases up 1.01 / −1.5 px as it activates; a caret
//    starts blinking in a text field. The blue-laser glass layout's focus states (MIT).
//  · callout: a rounded frame measured from the element's rect (−8 px padding, +16 px size), a 5 px accent border,
//    the target's radius grown by the padding, above everything; it lands from 1.15 → 1 with opacity over 0.35 s back.out(2), holds `hold` s, fades
//    0.3 s. MotionGX studio engine S.screen highlight (own); animation-systems' state rules (MIT).
// Pixel params are at a web page's scale; they grow with the stage (×2 at 1080) so the ring reads on a phone.
// On a target the director gives, that element gets the ring; alone it builds a small sign-up form and rings a field
// (field-focus) or its button (callout).
// Sources: MengTo/Skills web-design/blue-laser-clean-glass-layout + animation-systems (MIT); lib/studio-engine/assets/scenes.js (own).
ML.define({
  id: "ui.focus-ring",
  category: "ui",
  name: "Accent focus ring",
  does: "A control or a region of the screen gets a crisp accent ring offset from its edge, marking what is active or pointed at.",
  says: ["focus", "precision", "step", "proof"],
  energy: 1,
  targets: ["card", "label", "screen"],
  duration: [0.7, 2.5],
  params: {
    mode: { type: "choice", options: ["field-focus", "callout"], default: "field-focus" },
    ring: { type: "number", range: [1.5, 5], default: 2, unit: "px" },
    offset: { type: "number", range: [2, 8], default: 3, unit: "px" },
    nudge: { type: "bool", default: false },
    hold: { type: "number", range: [0.8, 2], default: 1.3, unit: "s" },
  },
  pairs: ["ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/blue-laser-clean-glass-layout", license: "MIT", note: "callout frame after lib/studio-engine/assets/scenes.js S.screen (own); animation-systems SKILL.md (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k; // web px → stage px
    let target = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, field = false, caret = null, form = null;
    if (!target) {
      // a small form of our own: two fields and a button
      const R = f.pic;
      const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;pointer-events:none;z-index:5;`, host);
      form = mk("div", `width:${Math.min(R.w * 0.86, 760 * k).toFixed(1)}px;box-sizing:border-box;padding:${(44 * k).toFixed(1)}px;display:grid;gap:${(26 * k).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);font:var(--x-body-weight) ${(30 * k).toFixed(1)}px var(--x-body-font);color:var(--x-ink);`, wrap);
      const fields = (rtl ? [["الاسم", "سارة أحمد"], ["البريد الإلكتروني", ""]] : [["Name", "Sara Ahmed"], ["Email", ""]]).map(([l, v]) => {
        const g = mk("div", `display:grid;gap:${(10 * k).toFixed(1)}px;`, form);
        mk("div", `font:var(--x-label-weight) ${(20 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, g, l);
        const box = mk("div", `position:relative;display:flex;align-items:center;height:${(84 * k).toFixed(1)}px;padding:0 ${(26 * k).toFixed(1)}px;box-sizing:border-box;border:${(2 * k).toFixed(1)}px solid var(--x-line);border-radius:calc(var(--x-radius) * 0.45);background:var(--x-panel-2);`, g);
        const txt = mk("span", v ? "" : "color:var(--x-dim);", box, v || "you@company.com");
        return { box, txt };
      });
      const btn = mk("div", `margin-top:${(8 * k).toFixed(1)}px;height:${(88 * k).toFixed(1)}px;display:grid;place-items:center;border-radius:calc(var(--x-radius) * 0.45);background:var(--x-accent);color:var(--x-accent-ink);font-weight:600;`, form, rtl ? "إنشاء حساب" : "Create account");
      if (p.mode === "callout") target = btn;
      else {
        target = fields[1].box; field = true;
        caret = mk("span", `width:${(3 * k).toFixed(1)}px;height:42%;background:var(--x-accent);margin-inline-start:${(2 * k).toFixed(1)}px;order:-1;`, target);
      }
    }
    // a target the director gives takes focus on `at`; our own form fades in first
    const T = form ? at + Math.min(0.25, (end - at) * 0.35) : at;
    const formAlpha = (t) => ML.lin(t, at, at + 0.2) * (1 - ML.clamp((t - (end - 0.25)) / 0.22));
    ctx.sfx(T, "blip", 0.3);
    const ringW = p.ring * s, off = p.offset * s;

    if (p.mode === "callout") {
      // the frame, measured from the element's rect: −8 px, +16 px, 5 px border, radius 18
      const tr = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0; // concentric with the target, else the look's radius
      const b = ctx.box(target), pad = 8 * s, bw = Math.max(ringW, 5 * k * 1.2); // 5 px at the screen's own scale
      const frame = mk("div", `position:absolute;left:${(b.x - pad).toFixed(1)}px;top:${(b.y - pad).toFixed(1)}px;width:${(b.w + pad * 2).toFixed(1)}px;height:${(b.h + pad * 2).toFixed(1)}px;box-sizing:border-box;border:${bw.toFixed(1)}px solid var(--x-accent);border-radius:${tr ? (tr + pad).toFixed(1) + "px" : "var(--x-radius)"};pointer-events:none;z-index:20;opacity:0;`, host);
      const holdEnd = Math.min(T + 0.35 + p.hold, end - 0.3);
      const backOut2 = (x) => { const c = 2, y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
      return {
        draw(t) {
          const x = ML.lin(t, T, T + 0.35), gone = ML.lin(t, holdEnd, holdEnd + 0.3);
          frame.style.opacity = (t < T ? 0 : Math.min(1, x * 2) * (1 - gone)).toFixed(4);
          frame.style.scale = (1.15 - 0.15 * backOut2(x)).toFixed(4);
          if (form) form.style.opacity = formAlpha(t).toFixed(4);
        },
      };
    }

    const border0 = getComputedStyle(target).borderColor;
    const hasBorder = parseFloat(getComputedStyle(target).borderTopWidth) > 0;
    return {
      draw(t) {
        const a = ML.out(t, T, T + 0.16) * (1 - ML.clamp((t - (end - 0.25)) / 0.22));
        target.style.outline = a > 0.004 ? `${ringW.toFixed(2)}px solid color-mix(in srgb, var(--x-accent) ${(42 * a).toFixed(1)}%, transparent)` : "none";
        target.style.outlineOffset = `${off.toFixed(2)}px`;
        if (hasBorder) target.style.borderColor = a > 0 ? `color-mix(in srgb, var(--x-accent) ${(a * 100).toFixed(1)}%, ${border0})` : "";
        if (p.nudge) { target.style.scale = a > 0 ? (1 + 0.01 * a).toFixed(4) : "none"; target.style.translate = a > 0 ? `0 ${(-1.5 * s * a).toFixed(2)}px` : "none"; }
        if (caret) caret.style.opacity = t < T ? "0" : String(ML.blink(t - T, 1));
        if (form) form.style.opacity = formAlpha(t).toFixed(4);
      },
    };
  },
});
