// Icon toggle swap: a round control is clicked and its icon swaps with a little pop — the old icon scales 1 → 0.6 and
// fades out in 0.12 s while the new one comes back 0.6 → 1 on back.out(2) in 0.2 s; the button itself dips to 0.92
// for 0.08 s on the click. Icon pairs: play → pause bars, heart outline → filled heart, bell → muted bell, or any two
// glyphs (custom). An optional pointer glides in and presses on the same frame. Every frame is a function of t.
// Source: prompt-motion twoclipping "opus 5.5 is f-cking" (reference only — our own code).
ML.define({
  id: "ui.icon-toggle-swap",
  category: "ui",
  name: "Play/pause icon swap on click",
  does: "Clicking the control swaps the play triangle for pause bars with a little pop.",
  says: ["change", "tech"],
  energy: 2,
  targets: ["cursor", "card"],
  duration: [0.25, 0.6],
  params: {
    icons: { type: "choice", options: ["play-pause", "heart", "bell", "custom"], default: "play-pause" },
    from: { type: "text", default: "A" },
    to: { type: "text", default: "B" },
    cursor: { type: "bool", default: true },
    size: { type: "number", range: [0.08, 0.3], default: 0.16 },
    fill: { type: "choice", options: ["accent", "panel", "ink"], default: "accent" },
  },
  pairs: ["ui.cursor-glide-click", "ui.audio-equalizer-bars"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-f-cking", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // the host: a roomy target (a card) holds the button; else the picture region
    let host, R;
    if (el && el.clientWidth > 160 && el.clientHeight > 160) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; }
    const size = Math.max(48, Math.min(Math.min(f.W, f.H) * p.size * 1.6, R.w * 0.8, R.h * 0.8));
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const bg = p.fill === "panel" ? "var(--x-panel)" : p.fill === "ink" ? "var(--x-ink)" : "var(--x-accent)";
    const fg = p.fill === "panel" ? "var(--x-ink)" : p.fill === "ink" ? "var(--x-panel)" : "var(--x-accent-ink)";
    const btn = mk("div", `position:absolute;left:${(cx - size / 2).toFixed(1)}px;top:${(cy - size / 2).toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:50%;background:${bg};color:${fg};box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);box-sizing:border-box;z-index:6;pointer-events:none;`, host);
    const svg = (body, filled = true) => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${filled ? 0 : 2}" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
    const HEART = "M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z";
    const BELL = "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20a2 2 0 0 0 4 0";
    const PAIRS = {
      "play-pause": [svg('<path d="M8.5 5.5v13l10.5-6.5z"/>'), svg('<rect x="6.5" y="5.5" width="4" height="13" rx="1.2"/><rect x="13.5" y="5.5" width="4" height="13" rx="1.2"/>')],
      heart: [svg(`<path d="${HEART}"/>`, false), `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="${HEART}" fill="var(--x-bad)" stroke="var(--x-bad)" stroke-width="2" stroke-linejoin="round"/></svg>`],
      bell: [svg(`<path d="${BELL}"/>`, false), svg(`<path d="${BELL}"/><path d="M4 4l16 16"/>`, false)],
    };
    const glyph = (s) => `<div style="width:100%;height:100%;display:grid;place-items:center;font:700 ${(size * 0.42).toFixed(1)}px var(--x-head-font);">${String(s || "").replace(/[<>&]/g, "")}</div>`;
    const [htmlA, htmlB] = PAIRS[p.icons] || [glyph(p.from), glyph(p.to)];
    const pad = size * 0.27;
    const iconA = mk("div", `position:absolute;inset:${pad.toFixed(1)}px;`, btn, htmlA);
    const iconB = mk("div", `position:absolute;inset:${pad.toFixed(1)}px;`, btn, htmlB);

    // the pointer, anchored at its tip
    const k = Math.min(f.W, f.H) / 1080, ps = 60 * k;
    const ptr = p.cursor ? mk("div", `position:absolute;left:0;top:0;width:${ps.toFixed(1)}px;height:${ps.toFixed(1)}px;z-index:9;pointer-events:none;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px rgba(0,0,0,.25));`, host,
      `<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/></svg>`) : null;

    // timing: the button arrives, the click lands (on the spoken word for the control when there is one)
    const T = Math.min(Math.max(at + (p.cursor ? 0.45 : 0.2), at + 0.2), Math.max(at + 0.2, end - 0.35));
    ctx.sfx(T - 0.01, "tap", 0.4);
    const backOut = (x, c = 2) => { const y = x - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
    const tip = { x: cx + size * 0.12, y: cy + size * 0.1 };
    const start = { x: tip.x + (rtl ? -1 : 1) * size * 1.1, y: tip.y + size * 0.9 };
    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.2, end);
        const inn = ML.out(t, at, at + 0.22);
        btn.style.opacity = (inn * (1 - leave)).toFixed(4);
        // the press: 1 → 0.92 for 0.08 s, then back
        const dip = t < T ? 0 : t < T + 0.04 ? ML.lin(t, T, T + 0.04) : 1 - ML.out(t, T + 0.08, T + 0.2);
        btn.style.scale = (0.94 + 0.06 * inn - 0.08 * dip).toFixed(4);
        // old icon out (0.12 s), new icon in (0.2 s back.out(2)) just after
        const o = ML.lin(t, T, T + 0.12);
        iconA.style.opacity = (1 - o).toFixed(4);
        iconA.style.scale = (1 - 0.4 * o).toFixed(4);
        const n = ML.lin(t, T + 0.06, T + 0.26);
        iconB.style.opacity = Math.min(1, n * 2).toFixed(4);
        iconB.style.scale = (0.6 + 0.4 * backOut(n)).toFixed(4);
        if (ptr) {
          const g = ML.ease(t, at + 0.05, T - 0.02);
          const x = start.x + (tip.x - start.x) * g, y = start.y + (tip.y - start.y) * g - Math.sin(Math.PI * g) * size * 0.15;
          const press = 1 - 0.12 * ML.pulse(t, T, 0.04, 0.1);
          ptr.style.translate = `${(x - ps * 0.2).toFixed(2)}px ${(y - ps * 0.08).toFixed(2)}px`;
          ptr.style.scale = press.toFixed(4);
          ptr.style.opacity = (ML.lin(t, at, at + 0.12) * (1 - ML.lin(t, T + 0.35, T + 0.6)) * (1 - leave)).toFixed(4);
        }
      },
    };
  },
});
