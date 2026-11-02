// Button loading that keeps its width: the button's idle width is measured once and locked; on the click the label
// gives way to the product's loading pattern — a spinner stepped frame by frame (rotation = floor(t / frameMs) × step,
// never a CSS keyframe), three bouncing dots, or a "product" progress stripe — and the button stays exactly its size,
// then resolves to a success state (the look's good colour, a drawn check and "Done").
// Source: Rieranthony/product-film-skill SKILL.md (quality floor: loading states keep their size, frame-driven) and
// templates/BRAND.md (MIT).
ML.define({
  id: "ui.button-loading-keep-width",
  category: "ui",
  name: "Button loading state that keeps its width",
  does: "After a click the button shows a loading state (spinner, dots or a stripe) without changing size, then resolves to done.",
  says: ["time", "step", "result"],
  energy: 2,
  targets: ["shape", "label"],
  duration: [0.8, 2],
  params: {
    loader: { type: "choice", options: ["spinner", "dots", "product"], default: "spinner" },
    frame_ms: { type: "number", range: [16, 120], default: 50, unit: "ms" },
    label: { type: "text", default: "Place order" },
    done: { type: "text", default: "Done" },
  },
  pairs: ["ui.button-fill"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "product-film-skill:plugins/product-film/skills/product-film/SKILL.md", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const say = (key, en, ar) => (rtl && p[key] === en ? ar : p[key] || (rtl ? ar : en));
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    let layer = null, btn;
    if (own) {
      layer = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
      btn = mk("div", `font:600 ${(42 * k).toFixed(1)}px var(--x-body-font);padding:${(34 * k).toFixed(1)}px ${(80 * k).toFixed(1)}px;border-radius:var(--x-radius-s);box-shadow:var(--x-shadow);`, layer, say("label", "Place order", "أكّد الطلب"));
    } else btn = ctx.el;
    // lock the idle size before anything changes
    const w0 = btn.offsetWidth, h0 = btn.offsetHeight;
    const inner = doc.createElement("span");
    inner.style.cssText = "display:inline-block;white-space:nowrap;";
    while (btn.firstChild) inner.append(btn.firstChild);
    btn.append(inner);
    Object.assign(btn.style, { width: w0 + "px", height: h0 + "px", boxSizing: "border-box", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", background: "var(--x-accent)", color: "var(--x-accent-ink)", borderRadius: btn.style.borderRadius || "var(--x-radius-s)" });
    const S = Math.min(h0 * 0.42, w0 * 0.3);
    const over = (css) => mk("div", `position:absolute;inset:0;display:grid;place-items:center;${css}`, btn);
    const load = over("");
    let spin = null, dots = [], stripe = null;
    if (p.loader === "spinner") {
      spin = mk("div", `width:${S}px;height:${S}px;`, load);
      spin.innerHTML = `<svg viewBox="0 0 24 24" width="${S}" height="${S}">${Array.from({ length: 8 }, (_, i) => `<line x1="12" y1="2.5" x2="12" y2="7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="${(0.2 + (0.8 * i) / 7).toFixed(2)}" transform="rotate(${i * 45} 12 12)"/>`).join("")}</svg>`;
    } else if (p.loader === "dots") {
      const row = mk("div", `display:flex;gap:${S * 0.3}px;align-items:center;height:${S}px`, load);
      dots = [0, 1, 2].map(() => mk("span", `width:${S * 0.28}px;height:${S * 0.28}px;border-radius:50%;background:currentColor;`, row));
    } else {
      const track = mk("div", `position:absolute;left:12%;right:12%;top:50%;height:${Math.max(3, h0 * 0.08)}px;margin-top:${-Math.max(3, h0 * 0.08) / 2}px;border-radius:99px;background:color-mix(in srgb, currentColor 25%, transparent);overflow:hidden`, load);
      stripe = mk("div", "position:absolute;top:0;bottom:0;width:40%;border-radius:99px;background:currentColor;", track);
    }
    const ok = over("");
    const okRow = mk("div", `display:flex;align-items:center;gap:${S * 0.35}px;font:inherit;white-space:nowrap`, ok);
    okRow.innerHTML = `<svg viewBox="0 0 24 24" width="${S}" height="${S}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 L10 18 L19.5 6.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`;
    mk("span", "", okRow, say("done", "Done", "تمّ"));
    const check = okRow.querySelector("path");
    const tC = at + 0.2, tL = tC + 0.12, tD = Math.max(tL + 0.6, Math.min(end - 0.8, tL + 1.6));
    ctx.sfx(tC, "click", 0.45);
    ctx.sfx(tD, "success", 0.4);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const pr = ML.lin(t, tC, tC + 0.06) * (1 - ML.lin(t, tC + 0.06, tC + 0.2));
        btn.style.scale = pr > 0 ? (1 - 0.03 * pr).toFixed(4) : "none";
        const lo = ML.lin(t, tL, tL + 0.12) * (1 - ML.lin(t, tD, tD + 0.12));
        inner.style.opacity = (1 - ML.lin(t, tC, tL + 0.08)).toFixed(4);
        load.style.opacity = lo.toFixed(4);
        const fr = Math.floor(Math.max(0, t - tL) * 1000 / p.frame_ms);
        if (spin) spin.style.transform = `rotate(${(fr * 45) % 360}deg)`;
        dots.forEach((d, i) => { const ph = (fr * p.frame_ms / 1000) * 6 - i * 0.9; d.style.translate = `0 ${(-Math.max(0, Math.sin(ph)) * S * 0.3).toFixed(2)}px`; });
        if (stripe) { const x = (((fr * p.frame_ms) / 1000) / 0.9) % 1; stripe.style.left = `${(-40 + x * 140 * (rtl ? -1 : 1) + (rtl ? 140 : 0)).toFixed(2)}%`; }
        const d = ML.lin(t, tD, tD + 0.2);
        btn.style.background = `color-mix(in srgb, var(--x-good) ${(d * 100).toFixed(1)}%, var(--x-accent))`;
        ok.style.opacity = d.toFixed(4);
        check.setAttribute("stroke-dashoffset", (1 - ML.out(t, tD + 0.05, tD + 0.35)).toFixed(4));
        if (layer) layer.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});
