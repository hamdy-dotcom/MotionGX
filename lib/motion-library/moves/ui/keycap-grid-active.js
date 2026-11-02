// Keycap grid with active key: a faded 4×4 grid of glass keys (gap 8, padding 32, laid out 1.2× its window, opacity 0.4,
// one cell left empty) surrounds one raised glass key holding a dot and a small word. The grid fades in from the centre
// out, the key rises into place, then presses — scale 1 → 0.94 → 1 over 0.25 s — with a flash of its dot and a soft
// ripple through the cells; with a word list, each press swaps the word (hello in other languages). Every frame is t.
// Source: MengTo/Skills web-design/blue-cloudy-clean-modern demo, card 6 "Multilingual Support" (MIT) — markup ported,
// the press is our rebuild.
ML.define({
  id: "ui.keycap-grid-active",
  category: "ui",
  name: "Keycap grid with active key",
  does: "A faded grid of glass keys surrounds one raised active key holding a dot and a word.",
  says: ["choice", "tech", "playful"],
  energy: 2,
  targets: ["card", "shape"],
  duration: [1.2, 3],
  params: {
    grid: { type: "number", range: [3, 5], default: 4 },
    label: { type: "text", default: "Hello" },
    words: { type: "text", default: "" },
    presses: { type: "number", range: [0, 4], default: 2 },
    dot: { type: "choice", options: ["accent", "panel", "ink"], default: "accent" },
    size: { type: "number", range: [0.4, 1], default: 0.75 },
  },
  pairs: ["ui.keyboard-shortcut-press", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "MengTo/Skills:web-design/blue-cloudy-clean-modern", license: "MIT", note: "demo/index.html card 6 keyboard grid + active key; press animation our own" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let host, R;
    if (el && el.clientWidth > 220 && el.clientHeight > 220) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }
    const side = Math.min(R.w, R.h) * p.size, bw = Math.min(R.w * 0.94, side * 1.25), bh = side;
    const g = Math.round(ML.clamp(p.grid, 3, 5));
    const u = bh / 260; // the source card is 260 px tall: every size scales from it
    const glass = (pct) => `color-mix(in srgb, var(--x-ink) ${pct}%, transparent)`;
    const win = mk("div", `position:absolute;left:${(R.x + R.w / 2 - bw / 2).toFixed(1)}px;top:${(R.y + R.h / 2 - bh / 2).toFixed(1)}px;width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px;border-radius:var(--x-radius);overflow:hidden;background:linear-gradient(${glass(6)}, transparent), var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);z-index:6;pointer-events:none;`, host);
    // the grid, laid out at 1.2× the window (the source's scale(1.2) — done with sizes, not a transform)
    const gw = bw * 1.2, gh = bh * 1.2, pad = 32 * u, gap = 8 * u;
    const cw = (gw - pad * 2 - gap * (g - 1)) / g, ch = (gh - pad * 2 - gap * (g - 1)) / g;
    const ox = (bw - gw) / 2, oy = (bh - gh) / 2, hidden = g + 1;
    const cells = [];
    for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) {
      const i = r * g + c, x = ox + pad + c * (cw + gap), y = oy + pad + r * (ch + gap);
      const e = mk("div", `position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;background:${glass(9)};border:1px solid ${glass(18)};box-sizing:border-box;`, win);
      const dx = x + cw / 2 - bw / 2, dy = y + ch / 2 - bh / 2;
      cells.push({ e, d: Math.hypot(dx, dy) / Math.hypot(bw / 2, bh / 2), off: i === hidden });
    }
    // the active key: 96 px glass, a 24 px dot with an inset shadow, a small light label
    const K = 96 * u;
    const key = mk("div", `position:absolute;left:${(bw / 2 - K / 2).toFixed(1)}px;top:${(bh / 2 - K / 2).toFixed(1)}px;width:${K.toFixed(1)}px;height:${K.toFixed(1)}px;border-radius:${(16 * u).toFixed(1)}px;background:color-mix(in srgb, var(--x-panel) 88%, ${glass(30)});border:1px solid ${glass(20)};box-sizing:border-box;box-shadow:var(--x-shadow);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(12 * u).toFixed(1)}px;`, win);
    const dotBg = p.dot === "panel" ? "var(--x-panel)" : p.dot === "ink" ? "var(--x-ink)" : "var(--x-accent)";
    const dot = mk("div", `width:${(24 * u).toFixed(1)}px;height:${(24 * u).toFixed(1)}px;border-radius:50%;background:${dotBg};box-shadow:inset 0 ${(2 * u).toFixed(1)}px ${(4 * u).toFixed(1)}px color-mix(in srgb, var(--x-ink) 20%, transparent);`, key);
    const lab = mk("div", `position:relative;height:${(16 * u).toFixed(1)}px;width:${(K * 1.6).toFixed(1)}px;`, key);
    const base = p.label === "Hello" && rtl ? "مرحبا" : String(p.label || "");
    const list = [base, ...String(p.words || "").split(",").map((s) => s.trim()).filter(Boolean)];
    const labs = list.map((w) => mk("span", `position:absolute;inset:0;display:grid;place-items:center;white-space:nowrap;font:400 ${(14 * u).toFixed(1)}px var(--x-body-font);color:var(--x-ink);letter-spacing:${ML.ARABIC.test(w) ? 0 : "0.1em"};`, lab, w));

    // timing: grid in from the centre out, key rises, then presses spaced evenly before the end
    const presses = Math.round(ML.clamp(p.presses, 0, 4));
    const P0 = at + 0.55, room = Math.max(0.3, end - 0.4 - P0);
    const gapP = Math.min(0.5, room / Math.max(1, presses));
    const T = Array.from({ length: presses }, (_, i) => P0 + i * gapP).filter((x) => x < end - 0.3);
    T.forEach((x) => ctx.sfx(x, "key", 0.35));
    const pressAt = (t, x) => (t < x ? 0 : t < x + 0.1 ? ML.out(t, x, x + 0.1) : 1 - ML.ease(t, x + 0.1, x + 0.25));
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        win.style.opacity = (ML.out(t, at, at + 0.3) * (1 - leave)).toFixed(4);
        let press = 0, flash = 0, idx = 0;
        T.forEach((x, i) => {
          press = Math.max(press, pressAt(t, x));
          flash = Math.max(flash, t >= x ? Math.exp(-(t - x) / 0.18) : 0);
          if (t >= x + 0.08) idx = i + 1;
        });
        cells.forEach((c) => {
          if (c.off) { c.e.style.opacity = "0"; return; }
          const a = ML.out(t, at + c.d * 0.3, at + c.d * 0.3 + 0.3);
          // the press ripples out through the cells
          const rip = T.reduce((m, x) => Math.max(m, Math.exp(-Math.pow((t - x - 0.12 - c.d * 0.35) / 0.06, 2))), 0);
          c.e.style.opacity = (a * (0.4 + 0.4 * rip)).toFixed(4);
        });
        const r = ML.back(t, at + 0.15, at + 0.5, 1.4), rise = ML.lin(t, at + 0.15, at + 0.3);
        key.style.opacity = rise.toFixed(4);
        key.style.translate = `0 ${((1 - r) * K * 0.25).toFixed(2)}px`;
        key.style.scale = (1 - 0.06 * press).toFixed(4);
        dot.style.filter = flash > 0.01 ? `brightness(${(1 + 0.6 * flash).toFixed(3)})` : "none";
        dot.style.boxShadow = `inset 0 ${(2 * u).toFixed(1)}px ${(4 * u).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(20 * (1 - flash)).toFixed(1)}%, transparent), 0 0 ${(18 * u * flash).toFixed(2)}px ${(4 * u * flash).toFixed(2)}px color-mix(in srgb, var(--x-accent) ${(70 * flash).toFixed(1)}%, transparent)`;
        const cur = list.length > 1 ? idx % list.length : 0;
        labs.forEach((s, i) => {
          const on = i === cur ? 1 : 0;
          s.style.opacity = on ? (list.length > 1 && idx > 0 ? ML.out(t, T[idx - 1] + 0.08, T[idx - 1] + 0.22) : 1).toFixed(4) : "0";
        });
      },
    };
  },
});
