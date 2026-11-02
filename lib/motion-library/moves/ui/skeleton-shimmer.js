// Working shimmer over an empty result: while the app works, the empty result box carries a soft diagonal light band —
// linear-gradient(<angle>, base 30%, lift 45%, peak 50%, lift 55%, base 70%) at 300% × 100%, its x position
// 100 − (t·speed mod 100) % (70 %/s by default, looping), shown from the move's start until the reveal begins + 0.4 s,
// then fading so what is underneath (the picture, the card) shows. Paired with a status chip: a spinner (t·450°) and
// "Generating 0:0n" counting whole seconds. RTL sweeps the band the other way. On a picture or a card the shimmer lies
// over it (its own radius); with no target it builds the empty box ("Images will appear here", dashed edge) itself.
// Source: MengTo/Skills web-design/html-demo/demo/index.html — GENERATE step, .fd-making + .fd-status (MIT).
ML.define({
  id: "ui.skeleton-shimmer",
  category: "ui",
  name: "Working shimmer over an empty result",
  does: "An empty result box shows a soft diagonal light band sweeping across it while the app is working.",
  says: ["time", "tech"],
  energy: 1,
  targets: ["card", "image", "screen"],
  duration: [0.6, 4],
  params: {
    speed: { type: "number", range: [40, 100], default: 70, unit: "%/s" },
    angle: { type: "number", range: [100, 120], default: 110, unit: "deg" },
    tone: { type: "choice", options: ["dark", "light"], default: "dark" },
    status: { type: "bool", default: true },
    reveal: { type: "bool", default: true },
    text: { type: "text" },
  },
  pairs: ["ui.generate-run", "ui.processing-overlay", "photo.top-down-reveal"],
  avoid: ["energy", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/html-demo", license: "MIT", note: "demo/index.html GENERATE: .fd-making shimmer, .fd-status spinner + elapsed" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // the box the shimmer lies over: a picture is wrapped (an <img> holds no children), a card / screen takes it inside
    let box, overlayHost, radius = "var(--x-radius)";
    if (el && el.tagName === "IMG") {
      const wrap = doc.createElement("div");
      const cs = getComputedStyle(el);
      wrap.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${el.offsetWidth}px;height:${el.offsetHeight}px;border-radius:${cs.borderRadius};overflow:hidden;`;
      el.parentNode.insertBefore(wrap, el); wrap.append(el);
      el.style.width = "100%"; el.style.height = "100%";
      box = wrap; overlayHost = wrap; radius = cs.borderRadius;
    } else if (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      box = el; overlayHost = el; radius = getComputedStyle(el).borderRadius || radius;
    } else {
      const R = f.pic, w = Math.min(R.w * 0.86, 900 * k), h = Math.min(R.h * 0.8, w * (f.wide ? 0.62 : 1.05));
      box = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + (R.h - h) / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.5);overflow:hidden;background:var(--x-panel-2);z-index:5;`, ctx.scene || ctx.stage);
      const empty = mk("div", `position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:${(14 * k).toFixed(1)}px;border:${Math.max(1, 2 * k).toFixed(1)}px dashed var(--x-line);border-radius:inherit;color:var(--x-dim);font:400 ${(26 * k).toFixed(1)}px var(--x-body-font);`, box);
      const ic = mk("div", `width:${(54 * k).toFixed(1)}px;height:${(44 * k).toFixed(1)}px;border:${(3 * k).toFixed(1)}px solid currentColor;border-radius:${(8 * k).toFixed(1)}px;position:relative;opacity:.7;`, empty);
      mk("div", `position:absolute;left:18%;bottom:18%;width:0;height:0;border-left:${(12 * k).toFixed(1)}px solid transparent;border-right:${(12 * k).toFixed(1)}px solid transparent;border-bottom:${(16 * k).toFixed(1)}px solid currentColor;`, ic);
      mk("span", "", empty, rtl ? "الصور هتظهر هنا" : "Images will appear here");
      overlayHost = box; radius = "inherit";
    }

    // the shimmer: base → lift → peak → lift → base, from the look's own colours
    const dark = p.tone === "dark";
    const base = dark ? "color-mix(in srgb, var(--x-ink) 94%, black)" : "var(--x-panel-2)";
    const lift = dark ? "color-mix(in srgb, var(--x-ink) 84%, var(--x-panel))" : "color-mix(in srgb, var(--x-panel-2) 55%, var(--x-panel))";
    const peak = dark ? "color-mix(in srgb, var(--x-ink) 76%, var(--x-panel))" : "var(--x-panel)";
    const ang = rtl ? 180 - p.angle + 180 : p.angle;
    const sh = mk("div", `position:absolute;inset:0;border-radius:${radius};pointer-events:none;z-index:2;background:linear-gradient(${ang}deg, ${base} 30%, ${lift} 45%, ${peak} 50%, ${lift} 55%, ${base} 70%) 0 0 / 300% 100%;`, overlayHost);

    // the status chip: spinner + elapsed
    let chip = null, spin = null, label = null;
    if (p.status) {
      chip = mk("div", `position:absolute;${rtl ? "right" : "left"}:${(18 * k).toFixed(1)}px;bottom:${(18 * k).toFixed(1)}px;z-index:3;display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(10 * k).toFixed(1)}px ${(18 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 70%, transparent);color:var(--x-panel);font:500 ${(22 * k).toFixed(1)}px var(--x-body-font);white-space:nowrap;`, overlayHost);
      chip.dir = rtl ? "rtl" : "ltr";
      spin = mk("span", `display:inline-block;width:${(20 * k).toFixed(1)}px;height:${(20 * k).toFixed(1)}px;border-radius:50%;box-sizing:border-box;border:${(3 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-panel) 30%, transparent);border-top-color:var(--x-panel);`, chip);
      label = mk("span", "font-variant-numeric:tabular-nums;", chip);
    }
    const word = p.text || (rtl ? "جارٍ الإنشاء" : "Generating");

    // the working span: from `at` until the reveal begins (0.4 s before the end), + 0.4 s of fade
    const revealAt = p.reveal ? Math.max(at + 0.3, end - 0.4) : Infinity;
    ctx.sfx(at, "blip", 0.18);

    return {
      draw(t) {
        const on = t >= at;
        const fadeIn = ML.lin(t, at, at + 0.15);
        const fadeOut = ML.ease(t, revealAt, revealAt + 0.4);
        const o = on ? fadeIn * (1 - fadeOut) : 0;
        sh.style.opacity = o.toFixed(4);
        const run = Math.max(0, t - at);
        const pos = (run * p.speed) % 100;
        sh.style.backgroundPosition = `${(rtl ? pos : 100 - pos).toFixed(3)}% 0`;
        if (chip) {
          chip.style.opacity = o.toFixed(4);
          spin.style.rotate = `${(run * 450).toFixed(2)}deg`;
          const s = Math.min(9, Math.floor(run));
          const txt = `${word} 0:0${s}`;
          if (label.textContent !== txt) label.textContent = txt;
        }
      },
    };
  },
});
