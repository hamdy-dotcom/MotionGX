// Tactile press (raised → pressed): MengTo's skeuomorphic surface, every layer interpolated from t. Raised: a 1 px
// gradient border (light top → dark bottom, border-box) over a three-stop body gradient (padding-box), two soft drop
// shadows + an inner top highlight + an inner bottom shade, and a gloss over the top 35 %. Pressed: translateY(1 px),
// the body gradient reversed, the border gradient flipped (dark top → light bottom), the drop shadows collapse and an
// inner shadow appears (inset 0 4 10). Labels are embossed (text-shadow 0 1 0 light, 0 −1 0 dark).
// Beat: a pointer (or nothing) arrives → press 0.18 s → hold 0.12 s → release 0.2 s ("tap"), or it stays down ("latch").
// Controls: button, toggle (key with an LED that lights on latch), tab (a row of three, the middle one goes down),
// switch (a recessed track whose knob slides across), dial (a round knob that turns 40° as it is pushed).
// Materials (one per component, as the skill says): soft-plastic, enamel (accent glaze), ceramic (bright, glossy, tight
// shadow), metal (brushed lines), rubber (dark matte, no gloss) — all mixed from the look's colours.
// On a target of the director's (a card / shape) it presses that element itself: depth only, its own paint kept.
// Source: MengTo/Skills web-design/skeuomorphic-ui/SKILL.md (MIT) — raised / pressed surfaces, embossed labels.
ML.define({
  id: "ui.skeuomorphic-press",
  category: "ui",
  name: "Tactile press (raised → pressed)",
  does: "A soft plastic button or control visibly sinks into the surface when tapped: its highlight flips to the bottom, an inner shadow appears and it drops 1px.",
  says: ["choice", "precision", "luxury"],
  energy: 2,
  targets: ["card", "shape", "cursor"],
  duration: [0.4, 1],
  params: {
    control: { type: "choice", options: ["button", "toggle", "tab", "switch", "dial"], default: "button" },
    state: { type: "choice", options: ["tap", "latch"], default: "tap" },
    material: { type: "choice", options: ["soft-plastic", "enamel", "ceramic", "metal", "rubber"], default: "soft-plastic" },
    pointer: { type: "bool", default: true },
    press: { type: "number", range: [0.16, 0.24], default: 0.18, unit: "s" },
    label: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.segmented-slide"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/skeuomorphic-ui", license: "MIT", note: "SKILL.md raised / pressed surface, embossed text, materials" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const px = (v) => (v * k).toFixed(2) + "px";
    const mixc = (a, b, u) => (u <= 0 ? a : u >= 1 ? b : `color-mix(in srgb, ${b} ${(u * 100).toFixed(1)}%, ${a})`);
    const fade = (c, a) => `color-mix(in srgb, ${c} ${(a * 100).toFixed(1)}%, transparent)`;

    // materials: body stops raised [top, mid, bottom], and the light / shade tints, all from the look
    const M = {
      "soft-plastic": { top: "color-mix(in srgb, var(--x-panel) 85%, white)", mid: "color-mix(in srgb, var(--x-panel-2) 70%, var(--x-panel))", bot: "color-mix(in srgb, var(--x-panel-2) 82%, var(--x-ink))", ink: "color-mix(in srgb, var(--x-ink) 80%, var(--x-panel))", gloss: 0.42, sh: 1 },
      enamel: { top: "color-mix(in srgb, var(--x-accent) 70%, white)", mid: "var(--x-accent)", bot: "color-mix(in srgb, var(--x-accent) 72%, var(--x-ink))", ink: "var(--x-accent-ink)", gloss: 0.55, sh: 1.1 },
      ceramic: { top: "color-mix(in srgb, var(--x-panel) 70%, white)", mid: "var(--x-panel)", bot: "color-mix(in srgb, var(--x-panel) 90%, var(--x-ink))", ink: "color-mix(in srgb, var(--x-ink) 85%, var(--x-panel))", gloss: 0.6, sh: 0.7 },
      metal: { top: "color-mix(in srgb, var(--x-panel-2) 80%, white)", mid: "color-mix(in srgb, var(--x-panel-2) 80%, var(--x-ink))", bot: "color-mix(in srgb, var(--x-panel-2) 62%, var(--x-ink))", ink: "color-mix(in srgb, var(--x-ink) 85%, var(--x-panel))", gloss: 0.32, sh: 1, brushed: true },
      rubber: { top: "color-mix(in srgb, var(--x-ink) 78%, var(--x-panel))", mid: "color-mix(in srgb, var(--x-ink) 86%, var(--x-panel))", bot: "color-mix(in srgb, var(--x-ink) 94%, black)", ink: "color-mix(in srgb, var(--x-panel) 85%, transparent)", gloss: 0, sh: 1.2, dark: true },
    }[p.material] || null;
    const mat = M || { top: "var(--x-panel)", mid: "var(--x-panel-2)", bot: "var(--x-panel-2)", ink: "var(--x-ink)", gloss: 0.4, sh: 1 };
    const shade = "var(--x-ink)", light = "white";

    // the surface's paint at press amount u (0 raised → 1 pressed); same layer count either way so it interpolates
    const shadowAt = (u, s = 1) => [
      `0 ${px(18 * s * (1 - u) + 4 * s * u)} ${px(34 * s * (1 - u) + 10 * s * u)} ${fade(shade, (0.18 * (1 - u) + 0.1 * u) * mat.sh)}`,
      `0 ${px(5 * s)} ${px(12 * s)} ${fade(shade, 0.12 * (1 - u) * mat.sh)}`,
      `inset 0 ${px(1)} 0 ${fade(light, (mat.dark ? 0.18 : 0.72) * (1 - u))}`,
      `inset 0 ${px(-1)} 0 ${fade(u > 0.5 ? light : shade, u > 0.5 ? 0.72 * (u - 0.5) * 2 : 0.24 * (1 - u * 2))}`,
      `inset 0 ${px(4 * s)} ${px(10 * s)} ${fade(shade, 0.22 * u * (mat.dark ? 2 : 1))}`,
    ].join(", ");
    const paint = (e, u, s = 1) => {
      const top = mixc(mat.top, `color-mix(in srgb, ${mat.bot} 70%, ${mat.mid})`, u), mid = mixc(mat.mid, `color-mix(in srgb, ${mat.mid} 60%, ${mat.top})`, u), bot = mixc(mat.bot, mat.top, u);
      const e1 = mixc(fade(light, mat.dark ? 0.3 : 0.82), fade(shade, 0.38), u), e2 = mixc(fade(shade, 0.34), fade(light, mat.dark ? 0.2 : 0.62), u);
      const brushed = mat.brushed ? `repeating-linear-gradient(90deg, ${fade(light, 0.08)} 0 ${px(1)}, transparent ${px(1)} ${px(3)}) padding-box, ` : "";
      e.style.background = `${brushed}linear-gradient(180deg, ${top}, ${mid} ${48 + 4 * u}%, ${bot}) padding-box, linear-gradient(180deg, ${e1}, ${fade(light, 0.22 * (1 - u))} 45%, ${e2}) border-box`;
      e.style.boxShadow = shadowAt(u, s);
      e.style.translate = `0 ${(u * Math.max(1, 1.5 * k)).toFixed(2)}px`;
    };
    const gloss = (parent) => (mat.gloss > 0 ? mk("div", `position:absolute;inset:1px 1px auto;height:35%;border-radius:inherit;background:linear-gradient(180deg, ${fade(light, mat.gloss)}, transparent);pointer-events:none;`, parent) : null);
    const emboss = mat.dark ? `0 ${px(-1)} 0 rgba(0,0,0,.5)` : `0 ${px(1)} 0 ${fade(light, 0.78)}, 0 ${px(-1)} 0 ${fade(shade, 0.12)}`;
    const surf = (parent, css) => mk("div", `position:relative;box-sizing:border-box;border:${Math.max(1, k).toFixed(1)}px solid transparent;${css}`, parent);

    // build the control (or press the director's target)
    let press = null, glosses = [], led = null, knob = null, knobTrack = null, dial = null, pressTarget, wrap = null;
    const lbl = p.label || (rtl ? "تأكيد" : "Confirm");
    if (el) {
      pressTarget = el;
      press = (u) => { el.style.translate = `0 ${(u * Math.max(1, 1.5 * k)).toFixed(2)}px`; el.style.boxShadow = shadowAt(u); };
    } else {
      const R = f.pic;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;`, host);
      // a housing plate the control sits on (the surface it sinks into)
      const plate = mk("div", `position:relative;display:flex;align-items:center;justify-content:center;gap:${px(22)};padding:${px(44)} ${px(56)};border-radius:calc(var(--x-radius) * 1.2);background:linear-gradient(180deg, color-mix(in srgb, ${mat.dark ? "var(--x-ink)" : "var(--x-panel-2)"} 90%, white), ${mat.dark ? "color-mix(in srgb, var(--x-ink) 90%, black)" : "var(--x-panel-2)"});box-shadow:inset 0 ${px(1)} 0 ${fade(light, 0.6)}, inset 0 ${px(-1)} 0 ${fade(shade, 0.1)}, 0 ${px(24)} ${px(60)} ${fade(shade, 0.12)};`, wrap);
      plate.dir = rtl ? "rtl" : "ltr";
      const font = `font:600 ${px(40)} var(--x-body-font);color:${mat.ink};text-shadow:${emboss};white-space:nowrap;`;
      if (p.control === "button") {
        const b = surf(plate, `padding:${px(30)} ${px(72)};border-radius:${px(30)};${font}`);
        glosses.push(gloss(b)); mk("span", "position:relative;", b, lbl);
        pressTarget = b; press = (u) => paint(b, u);
      } else if (p.control === "toggle") {
        const b = surf(plate, `width:${px(170)};height:${px(170)};border-radius:${px(36)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${px(16)};${font};font-size:${px(26)};`);
        glosses.push(gloss(b));
        led = mk("span", `position:relative;width:${px(16)};height:${px(16)};border-radius:50%;`, b);
        mk("span", "position:relative;", b, p.label || (rtl ? "تشغيل" : "Power"));
        pressTarget = b; press = (u) => paint(b, u);
      } else if (p.control === "tab") {
        const names = rtl ? ["يوم", "أسبوع", "شهر"] : ["Day", "Week", "Month"];
        const well = mk("div", `display:flex;gap:${px(10)};padding:${px(10)};border-radius:${px(30)};background:color-mix(in srgb, ${mat.dark ? "var(--x-ink)" : "var(--x-panel-2)"} 92%, var(--x-ink));box-shadow:inset 0 ${px(3)} ${px(8)} ${fade(shade, 0.18)}, inset 0 ${px(-1)} 0 ${fade(light, 0.6)};`, plate);
        const tabs = names.map((n) => { const b = surf(well, `padding:${px(22)} ${px(40)};border-radius:${px(22)};${font};font-size:${px(32)};`); glosses.push(gloss(b)); mk("span", "position:relative;", b, n); return b; });
        tabs.forEach((b, i) => i !== 1 && paint(b, 0));
        pressTarget = tabs[1]; press = (u) => paint(tabs[1], u);
      } else if (p.control === "switch") {
        knobTrack = mk("div", `position:relative;width:${px(220)};height:${px(104)};border-radius:${px(52)};box-shadow:inset 0 ${px(4)} ${px(10)} ${fade(shade, 0.26)}, inset 0 ${px(-1)} 0 ${fade(light, 0.7)};`, plate);
        knob = surf(knobTrack, `position:absolute;top:${px(8)};left:${px(8)};width:${px(88)};height:${px(88)};border-radius:50%;`);
        glosses.push(gloss(knob));
        mk("span", `${font};font-size:${px(30)};`, plate, p.label || (rtl ? "الوضع الهادي" : "Quiet mode"));
        pressTarget = knob; press = (u) => paint(knob, u);
      } else {
        // dial: a round knob with an index mark and ticks around it
        const ring = mk("div", `position:relative;width:${px(250)};height:${px(250)};display:grid;place-items:center;`, plate);
        for (let i = 0; i < 11; i++) { const a = -135 + i * 27; mk("span", `position:absolute;left:50%;top:50%;width:${px(3)};height:${px(14)};margin:${px(-7)} 0 0 ${px(-1.5)};background:${fade(mat.dark ? "var(--x-panel)" : "var(--x-ink)", 0.35)};border-radius:2px;transform:rotate(${a}deg) translateY(${px(-118)});`, ring); }
        dial = surf(ring, `width:${px(190)};height:${px(190)};border-radius:50%;`);
        glosses.push(gloss(dial));
        mk("span", `position:absolute;left:50%;top:${px(14)};width:${px(8)};height:${px(34)};margin-left:${px(-4)};border-radius:${px(4)};background:var(--x-accent);box-shadow:inset 0 ${px(1)} ${px(2)} rgba(0,0,0,.3);`, dial);
        pressTarget = dial; press = (u) => paint(dial, u);
      }
    }

    // the beat: arrive → press → hold → release (tap) or stay down (latch)
    const word = (pressTarget.textContent || lbl).trim().split(/\s+/)[0];
    const earliest = at + (p.pointer ? 0.45 : 0.15);
    let T = Math.max(earliest, ctx.word(word, earliest));
    T = Math.min(T, Math.max(earliest, end - 0.6));
    const pd = p.press, hold = 0.12, rel = 0.2;
    const latch = p.state === "latch" || p.control === "switch";
    ctx.sfx(T, "click", 0.5);
    if (!latch) ctx.sfx(T + pd + hold, "tap", 0.18);
    const amount = (t) => (t < T ? 0 : t < T + pd ? ML.ease(t, T, T + pd) : latch ? 1 : 1 - ML.ease(t, T + pd + hold, T + pd + hold + rel));

    // the pointer: a fingertip dot (a touch control), resting on the control while it presses
    let pointer = null, pc = null;
    if (p.pointer) {
      const d = 64 * k;
      pointer = mk("div", `position:absolute;left:0;top:0;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;margin:${(-d / 2).toFixed(1)}px 0 0 ${(-d / 2).toFixed(1)}px;border-radius:50%;background:${fade("var(--x-pointer)", 0.28)};border:${(3 * k).toFixed(1)}px solid ${fade("var(--x-pointer-edge)", 0.9)};box-shadow:0 ${px(6)} ${px(16)} ${fade(shade, 0.2)};z-index:10;pointer-events:none;`, host);
      const b = ctx.box(pressTarget);
      pc = { x: b.x + b.w * 0.5, y: b.y + b.h * 0.5 };
    }
    const from = { x: rtl ? f.W * 0.15 : f.W * 0.85, y: f.H * 0.92 };

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        if (wrap) { const e = ML.out(t, at, at + 0.3); wrap.style.opacity = (t < at ? 0 : e * (1 - leave)).toFixed(4); }
        const u = amount(t);
        press(u);
        glosses.forEach((g) => g && (g.style.opacity = String((1 - u).toFixed(4))));
        if (led) { const on = latch ? ML.lin(t, T + pd * 0.5, T + pd) : u; led.style.background = mixc(fade("var(--x-ink)", 0.25), "var(--x-good)", on); led.style.boxShadow = `0 0 ${px(14 * on)} ${fade("var(--x-good)", on)}`; }
        if (knob) { const s = ML.ease(t, T, T + 0.24); knob.style.left = ((8 + 116 * (rtl ? 1 - s : s)) * k).toFixed(2) + "px"; knobTrack.style.background = mixc(`color-mix(in srgb, ${mat.dark ? "var(--x-ink)" : "var(--x-panel-2)"} 90%, var(--x-ink))`, "var(--x-accent)", s); }
        if (dial) dial.style.rotate = `${(40 * ML.ease(t, T, T + pd + hold) * (rtl ? -1 : 1)).toFixed(2)}deg`;
        if (pointer) {
          const g = ML.ease(t, at, T);
          const x = from.x + (pc.x - from.x) * g, y = from.y + (pc.y - from.y) * g - Math.sin(Math.PI * g) * 40 * k;
          const away = latch ? ML.lin(t, T + pd + 0.15, T + pd + 0.45) : ML.lin(t, T + pd + hold + rel, T + pd + hold + rel + 0.3);
          pointer.style.translate = `${x.toFixed(2)}px ${(y + away * 30 * k).toFixed(2)}px`;
          pointer.style.scale = (1 - 0.12 * u).toFixed(4);
          pointer.style.opacity = (t < at ? 0 : ML.lin(t, at, at + 0.15) * (1 - away) * (1 - leave)).toFixed(4);
        }
      },
    };
  },
});
