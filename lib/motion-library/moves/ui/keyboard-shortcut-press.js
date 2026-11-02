// Keyboard shortcut press: a row of key caps (⌃ ⇧ S) sits under the headline; the modifiers settle as if held, then the
// last key presses down 2 px in 0.1 s, its shadow shrinking, its fill turning from panel to the accent and its glyph to
// accent ink, and springs back up while a 1 px accent ring grows 0.5 → 3× the cap and fades 0.6 → 0 over 0.6 s. A short
// caption ("one keystroke") fades in beside the keys, on the reading side. Every frame is a function of t.
// Source: prompt-motion agonaliu "opus 5.5 one-shotted this" (reference only — our own code).
ML.define({
  id: "ui.keyboard-shortcut-press",
  category: "ui",
  name: "Shortcut keys light up and press",
  does: "Three key caps (⌃ ⇧ S) sit under the headline; the last one presses down, turns brand-coloured and sends out a ring.",
  says: ["simplicity", "speed", "tech"],
  energy: 2,
  targets: ["label", "card"],
  duration: [0.6, 1.5],
  params: {
    keys: { type: "text", default: "⌃ ⇧ S" },
    caption: { type: "text", default: "one keystroke" },
    ripple: { type: "bool", default: true },
    light: { type: "choice", options: ["last", "all"], default: "last" },
    size: { type: "number", range: [0.05, 0.14], default: 0.085 },
    place: { type: "choice", options: ["under-head", "center", "in-target"], default: "under-head" },
  },
  pairs: ["text-in.punchline", "ui.cursor-glide-click"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key.return",
  source: { from: "prompt-motion:agonaliu-opus-5-5-one-shotted-this", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const key = Math.round(Math.max(44, Math.min(f.W, f.H) * p.size));
    const glyphs = String(p.keys || "⌃ ⇧ S").split(/\s*\+\s*|\s+/).filter(Boolean).slice(0, 5);
    const caption = p.caption === "one keystroke" && rtl ? "بضغطة واحدة" : String(p.caption || "");

    // the host: inside a roomy target when asked, else the scene, under the headline band or in the picture's centre
    let host, cx, cy;
    if (p.place === "in-target" && el && el.clientWidth > key * 4 && el.clientHeight > key * 1.6) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      host = el; cx = el.clientWidth / 2; cy = el.clientHeight / 2;
    } else {
      host = ctx.scene || ctx.stage; cx = f.pic.x + f.pic.w / 2;
      cy = p.place === "center" ? f.pic.y + f.pic.h / 2 : f.pic.y + key * 0.9;
    }
    const row = mk("div", `position:absolute;left:${cx.toFixed(1)}px;top:${cy.toFixed(1)}px;translate:-50% -50%;display:flex;align-items:center;gap:${(key * 0.5).toFixed(1)}px;direction:${rtl ? "rtl" : "ltr"};z-index:6;pointer-events:none;white-space:nowrap;`, host);
    // shortcuts read left to right in every language, so the caps keep their order; the caption takes the reading side
    const caps = mk("div", `display:flex;gap:${(key * 0.2).toFixed(1)}px;direction:ltr;`, row);
    const R = Math.max(5, key * 0.19);
    const keys = glyphs.map((g) => {
      const wrap = mk("div", `position:relative;width:${key}px;height:${key}px;`, caps);
      const ring = mk("div", `position:absolute;left:50%;top:50%;translate:-50% -50%;border:${Math.max(1, k * 1.5).toFixed(1)}px solid var(--x-accent);border-radius:${R.toFixed(1)}px;opacity:0;box-sizing:border-box;`, wrap);
      const cap = mk("div", `position:absolute;inset:0;border-radius:${R.toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-sizing:border-box;display:grid;place-items:center;color:var(--x-ink);font:600 ${(key * (g.length > 1 ? 0.34 : 0.46)).toFixed(1)}px var(--x-mono-font);`, wrap, g);
      return { wrap, ring, cap };
    });
    const cap = caption ? mk("div", `font:var(--x-body-weight) ${(key * 0.42).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, row, caption) : null;

    // timing: caps arrive with a small stagger, the modifiers settle, then the last key presses
    const n = keys.length, stg = 0.06;
    const T = Math.max(at + 0.2, Math.min(at + 0.3 + n * stg + 0.15, end - 0.45));
    const H = T - 0.14; // modifiers held
    if (n > 1) ctx.sfx(H, "key", 0.25);
    ctx.sfx(T, "key.return", 0.5);
    const dep = Math.max(2, 2.4 * k * (key / 92));
    const sh = (d) => `0 ${(d * 1.6).toFixed(2)}px ${(d * 2.2).toFixed(2)}px rgba(0,0,0,${(0.06 + d * 0.02).toFixed(3)}), 0 ${(d * 0.5).toFixed(2)}px 0 var(--x-line)`;
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.22, end);
        row.style.opacity = (1 - leave).toFixed(4);
        keys.forEach((K, i) => {
          const last = i === n - 1;
          const a = at + i * stg, u = ML.land(t, a, a + 0.3);
          // press depth 0..1: the last key goes down in 0.1 s and springs back; modifiers sink a little and stay
          let d;
          if (last) d = t < T ? 0 : t < T + 0.1 ? ML.out(t, T, T + 0.1) : 1 - ML.step(t - T - 0.1, ML.SPRING.pop);
          else d = n > 1 ? 0.45 * ML.out(t, H, H + 0.1) * (1 - ML.out(t, T + 0.18, T + 0.4)) : 0;
          const lit = last || p.light === "all" ? ML.lin(t, T, T + 0.1) : 0;
          K.wrap.style.opacity = u.toFixed(4);
          K.wrap.style.translate = `0 ${((1 - u) * key * 0.3).toFixed(2)}px`;
          K.cap.style.translate = `0 ${(d * dep).toFixed(2)}px`;
          K.cap.style.boxShadow = sh((1 - Math.max(0, Math.min(1, d))) * 3 + 0.4);
          K.cap.style.background = lit > 0 ? `color-mix(in srgb, var(--x-accent) ${(lit * 100).toFixed(1)}%, var(--x-panel))` : "var(--x-panel)";
          K.cap.style.color = lit > 0 ? `color-mix(in srgb, var(--x-accent-ink) ${(lit * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)";
          K.cap.style.borderColor = lit > 0.5 ? "transparent" : "var(--x-edge-color)";
          if (last && p.ripple) {
            const r = ML.lin(t, T, T + 0.6), s = 0.5 + 2.5 * ML.out(t, T, T + 0.6);
            K.ring.style.width = K.ring.style.height = `${(key * s).toFixed(2)}px`;
            K.ring.style.borderRadius = `${(R * s).toFixed(2)}px`;
            K.ring.style.opacity = t < T ? "0" : (0.6 * (1 - r)).toFixed(4);
          }
        });
        if (cap) {
          const c = ML.out(t, T + 0.12, T + 0.45);
          cap.style.opacity = c.toFixed(4);
          cap.style.translate = `${((1 - c) * (rtl ? 1 : -1) * key * 0.25).toFixed(2)}px 0`;
        }
      },
    };
  },
});
