// Menu takeover: a flat colour panel snaps over the whole frame — a hard cut, or a drop (clip-path inset(0 0 100% 0)
// -> inset(0), 0.45 s power4.inOut) — with one giant condensed line centred on it (the look's headline face narrowed
// to `condense`, uppercase in Latin, ~11% of the frame tall, tight leading; Arabic keeps its joins: no case, no
// tracking, no narrowing; the look's own face keeps its width at condense 1) and a small close pill in the top
// reading-end corner (1 px border, radius 99 px, an x drawn in two strokes). The line rises out of its mask in 0.4 s,
// holds, and the whole card leaves in reverse (line down, panel retracting up). An interstitial chapter card.
// Ported from MengTo/Skills documentary-brutalist-agency demo (MIT): the full-frame .menu overlay (pale mint ground,
// black ink, Impact 11vw uppercase link, .close pill top-right with 1 px border and 99 px radius), opened on t here.
ML.define({
  id: "transition.menu-takeover",
  category: "transition",
  name: "Menu takeover",
  does: "A flat colour panel snaps over the whole frame with one giant condensed line, holds, and leaves.",
  says: ["transition", "brand", "list"],
  energy: 3,
  targets: ["scene", "headline"],
  duration: [0.8, 2],
  params: {
    colour: { type: "text", default: "proof surface" },
    entrance: { type: "choice", options: ["cut", "drop"], default: "drop" },
    text: { type: "text", default: "" },
    hold: { type: "number", range: [0.3, 2], default: 0.9, unit: "s" },
    close: { type: "bool", default: true },
    condense: { type: "number", range: [0.7, 1], default: 0.82 },
  },
  pairs: ["text-in.mask-rise", "transition.colour-field-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/documentary-brutalist-agency/demo/index.html", license: "MIT", note: "the .menu overlay and .close pill" },
  async setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage;
    const c = String(p.colour || "proof surface").trim(), n = c.replace(/\s+/g, "-");
    // "proof surface": the source's pale tint ground (here a pale tint of the look's second accent); or a look colour
    const named = /^(accent|accent-2|ink|good|bad|panel|panel-2|ground|device|dim)$/.test(n);
    const col = c.startsWith("--x-") ? `var(${c})` : named ? `var(--x-${n})` : "color-mix(in srgb, var(--x-accent-2) 30%, var(--x-panel))";
    const dark = /^(accent|ink|device|bad|good|dim)$/.test(n);
    const ink = dark ? (n === "ink" || n === "device" ? "var(--x-ground)" : "var(--x-accent-ink)") : "var(--x-ink)";
    const head = host.querySelector(".ml-title");
    const target = ctx.el && ctx.el !== stage ? ctx.el : head;
    const text = String(p.text || "").trim() || (target ? target.textContent.trim() : "");
    const panel = document.createElement("div");
    panel.style.cssText = `position:absolute;inset:0;z-index:8;pointer-events:none;background:${col};color:${ink};display:grid;place-items:center;visibility:hidden`;
    host.append(panel);
    const mask = document.createElement("div");
    mask.style.cssText = `overflow:hidden;width:${f.safe.w}px;display:flex;justify-content:center`;
    const line = document.createElement("div");
    line.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    const size = (f.wide ? 0.11 * W : 0.15 * W);
    line.style.cssText = `font:var(--x-head-weight) ${size.toFixed(1)}px/${ctx.rtl ? 1.15 : 0.92} var(--x-head-font);text-transform:${ctx.rtl ? "none" : "uppercase"};letter-spacing:${ctx.rtl ? "0" : "-0.03em"};white-space:nowrap;flex:none`;
    line.textContent = text;
    mask.append(line); panel.append(mask);
    try { const cs = getComputedStyle(line); await document.fonts.load(`${cs.fontWeight} ${size}px ${cs.fontFamily}`, text || "A"); } catch (e) { /* measure as is */ }
    // narrowed in Latin (scaled down on one axis only, so it stays sharp), the type grows to fill the width again
    const narrow = ctx.rtl ? 1 : ML.clamp(p.condense, 0.7, 1);
    const sz = ML.fit(line, f.safe.w / narrow);
    if (narrow < 1) line.style.scale = `${narrow} 1`;
    mask.style.padding = `${(sz * 0.14).toFixed(1)}px 0 ${(sz * 0.26).toFixed(1)}px`;
    const fall = mask.offsetHeight; // far enough that nothing shows in the mask before the rise or after the drop
    // the close pill, top reading-end corner
    const pill = document.createElement("div");
    const ph = 5.4 * v;
    pill.style.cssText = `position:absolute;top:${Math.max(2.2 * v, f.safe.y * 0.5).toFixed(1)}px;${ctx.rtl ? "left" : "right"}:${(2.2 * v).toFixed(1)}px;height:${ph.toFixed(1)}px;width:${(ph * 1.6).toFixed(1)}px;border:1px solid currentColor;border-radius:99px;display:${p.close ? "grid" : "none"};place-items:center`;
    pill.innerHTML = `<svg viewBox="0 0 10 10" width="${(ph * 0.36).toFixed(1)}" height="${(ph * 0.36).toFixed(1)}"><path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    panel.append(pill);
    const drop = p.entrance === "drop";
    // a short slot tightens everything rather than running past its end
    const k = ML.clamp((end - at) / (drop ? 1.25 : 0.8), 0.6, 1);
    const inD = drop ? 0.45 * k : 0;
    const riseA = at + (drop ? 0.2 * k : 0.04), riseB = riseA + 0.4 * k;
    const outA = Math.max(riseB + 0.1 * k, Math.min(end - inD - 0.1, riseB + p.hold));
    const outB = outA + inD;
    const p4io = (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
    ctx.sfx(at, drop ? "whoosh.soft" : "hit", 0.4);
    ctx.sfx(outA, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const on = t >= at && t < (drop ? outB : outA);
        panel.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        // the line rises in, then drops back out before the panel leaves
        const r = ML.expo(t, riseA, riseB), q = ML.lin(t, outA - 0.25 * k, outA), down = q * q;
        line.style.translate = `0 ${(((1 - r) + down) * fall).toFixed(2)}px`;
        if (drop) {
          const a = p4io(ML.lin(t, at, at + inD)), b = p4io(ML.lin(t, outA, outB));
          panel.style.clipPath = `inset(0 0 ${((1 - a + b) * 100).toFixed(3)}% 0)`;
        } else panel.style.clipPath = "none";
        pill.style.opacity = (ML.lin(t, riseA, riseB) * (1 - q)).toFixed(4);
      },
    };
  },
});
