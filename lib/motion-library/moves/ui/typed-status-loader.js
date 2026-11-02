// Typed status line with loader: a short status caption ("Finding something for you…") types itself at 15–25 chars a
// second in a script, mono or grey sans voice, then ends in a loader while the app works: three dots appearing 0.15 s
// apart and then an SVG arc (270°, a thin stroke) spinning 0.8 s a turn linear — or 2–3 dots bouncing in sequence
// (y −10 px, 0.3 s each, 0.1 s apart). Optionally a simple illustration (a card with a gradient glowing edge) scales in
// above it. Everything leaves with a 0.2 s fade. A text target keeps its box from the first frame (the full caption
// holds it, invisible, under the typed layer), and Arabic types by grapheme so its letters keep joining.
// Sources: prompt-motion devius-maximus-this-is-nuts-made, ultimaxbt-2ddf1e (reference only: our own code).
ML.define({
  id: "ui.typed-status-loader",
  category: "ui",
  name: "Typed status line with loader",
  does: "A short status caption ('Finding something for you...') types itself and ends in a spinning arc or bouncing dots while the app works.",
  says: ["time", "problem", "tech", "step"],
  energy: 2,
  targets: ["label", "line", "screen"],
  duration: [1, 3],
  params: {
    end: { type: "choice", options: ["spinner", "bouncing-dots", "dots-then-spinner"], default: "dots-then-spinner" },
    font: { type: "choice", options: ["script", "mono", "sans"], default: "script" },
    chars_per_s: { type: "number", range: [15, 25], default: 18 },
    illustration: { type: "bool", default: false },
    dots: { type: "number", range: [2, 3], default: 3 },
    text: { type: "text" },
  },
  pairs: ["ui.skeleton-shimmer", "ui.processing-overlay", "ui.generate-run"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:devius-maximus-this-is-nuts-made", license: "reference", note: "also ultimaxbt-2ddf1e; our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isText = el && el.children.length === 0 && (el.textContent || "").trim().length > 0;
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
    const graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : Array.from(s));
    const caption = String(p.text || (isText ? el.textContent.trim() : "") || (rtl ? "بندوّر لك على حاجة" : "Finding something for you")).replace(/[.…]+$/, "");
    // the voice: script (the look's script face if it has one, else its headline face set italic), mono, or grey sans
    const FONT = { script: "font-family:var(--x-script-font, var(--x-head-font));font-style:italic;font-weight:400;", mono: "font-family:var(--x-mono-font);font-weight:500;", sans: "font-family:var(--x-body-font);font-weight:400;" }[p.font] || "";

    let host, wrap, fs;
    if (isText) {
      el.textContent = "";
      fs = parseFloat(getComputedStyle(el).fontSize) || 24;
      wrap = mk("span", `position:relative;display:inline-flex;align-items:center;gap:0.5em;vertical-align:middle;max-width:100%;${FONT}text-transform:none;letter-spacing:0;color:var(--x-dim);`, el);
      host = el;
    } else {
      host = el && el.clientWidth > 300 && el.clientHeight > 120 ? el : ctx.scene || ctx.stage;
      if (host === el && getComputedStyle(el).position === "static") el.style.position = "relative";
      const R = host === el ? { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight } : f.pic;
      fs = Math.max(16, 38 * k);
      const box = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + R.h * 0.5).toFixed(1)}px;width:${R.w}px;display:flex;flex-direction:column;align-items:center;gap:${(40 * k).toFixed(1)}px;translate:0 -50%;z-index:6;pointer-events:none;`, host);
      box.dir = rtl ? "rtl" : "ltr";
      wrap = mk("div", `position:relative;display:inline-flex;align-items:center;gap:0.5em;font-size:${fs.toFixed(1)}px;${FONT}color:var(--x-dim);`, box);
      host = box;
    }
    // the illustration: a card with a gradient glowing edge that scales in above the line
    let ill = null;
    if (p.illustration) {
      const IW = Math.min(f.W * 0.5, 460 * k), IH = IW * 0.62;
      const holder = isText ? mk("div", `position:absolute;left:50%;bottom:calc(100% + ${(24 * k).toFixed(1)}px);width:${IW.toFixed(1)}px;height:${IH.toFixed(1)}px;margin-left:${(-IW / 2).toFixed(1)}px;`, host) : null;
      if (isText && getComputedStyle(host).position === "static") host.style.position = "relative";
      ill = mk("div", `position:relative;width:${IW.toFixed(1)}px;height:${IH.toFixed(1)}px;border-radius:min(var(--x-radius), ${(28 * k).toFixed(1)}px);box-sizing:border-box;border:${Math.max(2, 3 * k).toFixed(1)}px solid transparent;background:linear-gradient(var(--x-panel), var(--x-panel)) padding-box, linear-gradient(135deg, var(--x-accent), var(--x-accent-2), var(--x-good)) border-box;box-shadow:0 0 ${(40 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) 35%, transparent);display:flex;flex-direction:column;gap:${(14 * k).toFixed(1)}px;padding:${(28 * k).toFixed(1)}px;`, holder || host);
      if (!isText) host.prepend(ill);
      [0.7, 0.9, 0.5].forEach((w) => mk("div", `height:${(14 * k).toFixed(1)}px;width:${w * 100}%;border-radius:9px;background:var(--x-line);`, ill));
      mk("div", `margin-top:auto;height:${(IH * 0.26).toFixed(1)}px;width:${(IH * 0.26).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent) 22%, var(--x-panel));`, ill);
    }
    // the caption: the full text holds the box, the typed layer sits on it
    const cap = mk("span", `position:relative;white-space:nowrap;`, wrap);
    mk("span", `visibility:hidden;`, cap, caption);
    const typedEl = mk("span", `position:absolute;inset-inline-start:0;top:0;white-space:nowrap;`, cap);
    const chars = graphemes(caption);
    // the loader at the line's end
    const ld = mk("span", `position:relative;display:inline-flex;align-items:center;gap:0.22em;height:1em;min-width:${(fs * 0.9).toFixed(1)}px;`, wrap);
    const nd = Math.round(ML.clamp(p.dots, 2, 3));
    const bounce = p.end === "bouncing-dots";
    const dotEls = Array.from({ length: bounce ? nd : p.end === "spinner" ? 0 : 3 }, () => mk("span", `display:inline-block;width:${bounce ? "0.3em" : "0.16em"};height:${bounce ? "0.3em" : "0.16em"};border-radius:50%;background:${bounce ? "var(--x-good)" : "currentColor"};opacity:0;`, ld));
    const arcS = fs * 0.9;
    const arc = p.end !== "bouncing-dots" ? mk("span", `position:absolute;inset-inline-start:0;top:50%;margin-top:${(-arcS / 2).toFixed(1)}px;width:${arcS.toFixed(1)}px;height:${arcS.toFixed(1)}px;line-height:0;opacity:0;`, ld) : null;
    if (arc) arc.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--x-accent)" stroke-width="${Math.max(1.5, 2.2 * (24 / arcS) * k).toFixed(2)}" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-9 9"/></svg>`;
    const arcPath = arc ? arc.querySelector("path") : null;

    // timing
    const cps = ML.clamp(p.chars_per_s, 15, 25);
    const t0 = at + (p.illustration ? 0.25 : 0.05);
    const tT = Math.min(chars.length / cps, Math.max(0.3, (end - t0) * 0.55));
    const tDone = t0 + tT;
    const tDots = tDone + 0.05, tSpin = p.end === "spinner" ? tDone + 0.05 : tDots + 0.45 + 0.15;
    const nk = Math.min(10, Math.floor(tT / 0.12));
    for (let i = 0; i < nk; i++) ctx.sfx(t0 + (i * tT) / nk, "key", 0.16);
    if (p.illustration) ctx.sfx(at, "pop.soft", 0.2);

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.2, end);
        wrap.style.opacity = (ML.lin(t, at - 0.05, at + 0.05) * (1 - leave)).toFixed(4);
        if (ill) { const s = ML.back(t, at, at + 0.45, 1.2); ill.style.opacity = (ML.lin(t, at, at + 0.2) * (1 - leave)).toFixed(4); ill.style.scale = (0.85 + 0.15 * Math.min(1, s)).toFixed(4); }
        typedEl.textContent = chars.slice(0, Math.round(chars.length * ML.lin(t, t0, tDone))).join("");
        if (bounce) {
          dotEls.forEach((d, i) => {
            const st = tDone + 0.05 + i * 0.1, ph = t < st ? -1 : ((t - st) % (0.3 + nd * 0.1 + 0.2));
            const y = ph >= 0 && ph < 0.3 ? -Math.sin((Math.PI * ph) / 0.3) * fs * 0.3 : 0;
            d.style.opacity = ML.lin(t, st - 0.05, st + 0.05).toFixed(4);
            d.style.translate = `0 ${y.toFixed(2)}px`;
          });
        } else {
          const showDots = p.end === "dots-then-spinner";
          dotEls.forEach((d, i) => {
            const on = showDots ? ML.lin(t, tDots + i * 0.15, tDots + i * 0.15 + 0.06) * (1 - ML.lin(t, tSpin - 0.05, tSpin + 0.1)) : 0;
            d.style.opacity = on.toFixed(4);
          });
          const a = ML.lin(t, tSpin, tSpin + 0.12);
          arc.style.opacity = a.toFixed(4);
          // the turn is drawn inside the SVG (an SVG transform rasters the same every frame)
          arcPath.setAttribute("transform", `rotate(${(((Math.max(0, t - tSpin) / 0.8) * 360) % 360).toFixed(1)} 12 12)`);
        }
      },
    };
  },
});
