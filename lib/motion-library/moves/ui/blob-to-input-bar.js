// Blob → input bar: a soft, blurred pill of colour (blur 12 px) sharpens and stretches into a panel-white URL input
// (width 320, full radius, the look's shadow) in 0.5 s on power3.out — blur 12 → 0, colour blob → panel, width 40 % →
// 100 %. Then the link icon and the placeholder "Paste your product URL" fade in, and a greyed, disabled "Analyze"
// button settles at the bar's end (its start in Arabic: the flex row follows the reading direction).
// Source: prompt-motion en-ra "wtf, made with claude" (reference only — our own rebuild).
ML.define({
  id: "ui.blob-to-input-bar",
  category: "ui",
  name: "Soft blob morphs into an input bar",
  does: "A blurred pastel pill blob sharpens and stretches into a white URL input bar with a disabled button.",
  says: ["arrival", "tech", "simplicity"],
  energy: 2,
  targets: ["card", "screen"],
  duration: [0.6, 1.4],
  params: {
    blob_colour: { type: "choice", options: ["accent-2", "accent", "good", "bad"], default: "accent-2" },
    placeholder: { type: "text", default: "Paste your product URL" },
    blur: { type: "number", range: [6, 20], default: 12, unit: "px" },
    button: { type: "text", default: "Analyze" },
  },
  pairs: ["ui.bar-morph-processing-result"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:en-ra-wtf-made-with-claude", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const say = (key, en, ar) => (rtl && p[key] === en ? ar : p[key] || (rtl ? ar : en));
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const R = own ? f.pic : ctx.box(ctx.el);
    const s = Math.min(R.w / 380, (Math.min(f.W, f.H) / 1080) * 2.6);
    const q = (v) => (v * s).toFixed(1) + "px";
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const BW = 320, BH = 44;
    const shell = mk("div", `position:absolute;left:${cx}px;top:${cy}px;height:${q(BH)};box-sizing:border-box;border-radius:var(--x-radius-s);overflow:hidden;font-family:var(--x-body-font);`, layer);
    const row = mk("div", `position:absolute;inset:0;display:flex;align-items:center;gap:${q(10)};padding-inline:${q(16)} ${q(6)};color:var(--x-dim);font-size:${q(13)};`, shell);
    const icon = mk("span", "display:grid;flex:none", row);
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="${(14 * s).toFixed(1)}" height="${(14 * s).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`;
    const ph = mk("span", "flex:1;white-space:nowrap;overflow:hidden;text-align:start", row, say("placeholder", "Paste your product URL", "الصق رابط منتجك"));
    const btn = mk("span", `background:var(--x-panel-2);color:color-mix(in srgb, var(--x-dim) 70%, transparent);border-radius:var(--x-radius-s);padding:${q(8)} ${q(14)};font-weight:600;font-size:${q(12)};flex:none`, row, say("button", "Analyze", "حلّل"));
    const B = `var(--x-${p.blob_colour})`;
    const t1 = at + 0.5, tc = at + 0.35;
    ctx.sfx(at, "swell", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        layer.style.visibility = t >= at - 1e-6 && leave < 1 ? "visible" : "hidden";
        const u = ML.out(t, at, t1), o = ML.lin(t, at, at + 0.15);
        const w = BW * (0.4 + 0.6 * u), h = BH * (1.25 - 0.25 * u);
        shell.style.width = q(w); shell.style.height = q(h);
        shell.style.translate = `${(-w * s) / 2}px ${(-h * s) / 2}px`;
        shell.style.background = `color-mix(in srgb, ${B} ${((1 - u) * 55).toFixed(1)}%, var(--x-panel))`;
        shell.style.filter = (1 - u) * p.blur > 0.05 ? `blur(${((1 - u) * p.blur * s * 0.4).toFixed(2)}px)` : "none";
        shell.style.boxShadow = u > 0.5 ? "var(--x-shadow)" : "none";
        shell.style.opacity = (o * (1 - leave)).toFixed(4);
        const c = ML.out(t, tc, tc + 0.35);
        icon.style.opacity = ph.style.opacity = c.toFixed(4);
        ph.style.translate = `${q((1 - c) * 6 * (rtl ? -1 : 1))} 0`;
        const bb = ML.out(t, tc + 0.08, tc + 0.43);
        btn.style.opacity = bb.toFixed(4);
        btn.style.scale = (0.9 + 0.1 * bb).toFixed(4);
      },
    };
  },
});
