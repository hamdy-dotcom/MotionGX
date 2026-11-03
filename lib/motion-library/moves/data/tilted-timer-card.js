// Tilted timer card: a bold sticker-like card (accent-2 ground, 2 px ink border, a hard 5 px offset ink shadow,
// rotated a few degrees) labelled "MACHINE A" with a "RUNNING" status chip and pulsing dot top-right; inside, a panel
// labelled "TIMER" holds a big mono clock. Enter: scale 0.3 → 1 and rotate −12° → the tilt in 0.35 s back.out. Then
// the clock ticks over (7:59 → 8:00): each changed character rolls like an odometer — the old glyph slides up and out,
// the new slides in from below, 0.15 s each, the carry rippling from the rightmost digit leftwards.
// Source: prompt-motion "0xnfrith-opus-5-5-animation-created" (reference only: rebuilt as our own code).
ML.define({
  id: "data.tilted-timer-card",
  category: "data",
  name: "Tilted timer card ticking",
  does: "A sticker-like tilted card labelled 'MACHINE A / RUNNING' pops in and its big clock ticks over (7:59 -> 8:00), digits rolling like an odometer.",
  says: ["time", "step", "tech"],
  energy: 3,
  targets: ["card", "number"],
  duration: [1.2, 3],
  params: {
    from: { type: "text", default: "7:59" },
    to: { type: "text", default: "8:00" },
    tilt: { type: "number", range: [-8, 8], default: -3, unit: "deg" },
    title: { type: "text", default: "" },
    status: { type: "text", default: "" },
  },
  pairs: ["data.two-tone-time", "element.sticker-slap"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:0xnfrith-opus-5-5-animation-created", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    const isCard = el && (el.getAttribute("data-slot") || "") === "card";
    const ctxOwn = el && !isCard ? (el.textContent || "").trim() : "";
    // the card: built inside a card slot (filling it), else centred over the target / the picture region
    const cw = isCard ? Math.max(260, el.clientWidth) : Math.min(f.pic.w * 0.72, f.wide ? f.W * 0.34 : f.W * 0.66);
    const k = cw / 260, ch = 180 * k;
    const c = el && !isCard ? ctx.box(el) : null;
    const cx = c ? Math.max(f.m + cw / 2, Math.min(f.W - f.m - cw / 2, c.x + c.w / 2)) : f.pic.x + f.pic.w / 2;
    const cy = c ? Math.max(f.safe.y + ch / 2, Math.min(f.safe.y + f.safe.h - ch / 2, c.y + c.h / 2)) : f.pic.y + f.pic.h / 2;
    const card = mk("div", isCard ? `position:relative;width:100%;height:${ch.toFixed(1)}px` : `position:absolute;left:${(cx - cw / 2 - hb.x).toFixed(1)}px;top:${(cy - ch / 2 - hb.y).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;z-index:14`, null);
    if (isCard) { el.textContent = ""; el.append(card); } else scene.append(card);
    Object.assign(card.style, { boxSizing: "border-box", background: "var(--x-accent-2)", border: `${Math.max(2, 2 * k * 0.7).toFixed(1)}px solid var(--x-ink)`, borderRadius: "var(--x-radius)", boxShadow: `${(5 * k).toFixed(1)}px ${(5 * k).toFixed(1)}px 0 var(--x-ink)`, padding: `${(14 * k).toFixed(1)}px`, display: "flex", flexDirection: "column", gap: `${(10 * k).toFixed(1)}px`, direction: rtl ? "rtl" : "ltr", pointerEvents: "none" });
    const latin = (s) => !ML.ARABIC.test(s);
    const title = p.title || (rtl ? "ماكينة أ" : "MACHINE A"), status = p.status || (rtl ? "شغّالة" : "RUNNING");
    const top = mk("div", `display:flex;justify-content:space-between;align-items:center;font:700 ${(11 * k).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-ink)`, card);
    mk("span", `letter-spacing:${latin(title) ? "0.12em" : 0}`, top, title);
    const chip = mk("span", `display:flex;align-items:center;gap:${(5 * k).toFixed(1)}px;padding:${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px;border:${Math.max(1.5, 1.5 * k * 0.7).toFixed(1)}px solid var(--x-ink);border-radius:var(--x-radius-s);background:var(--x-panel);font-size:${(9 * k).toFixed(1)}px;letter-spacing:${latin(status) ? "0.1em" : 0}`, top);
    const dot = mk("i", `display:block;width:${(6 * k).toFixed(1)}px;height:${(6 * k).toFixed(1)}px;border-radius:50%;background:var(--x-good)`, chip);
    mk("span", "", chip, status);
    const inner = mk("div", `flex:1;display:flex;flex-direction:column;justify-content:center;gap:${(4 * k).toFixed(1)}px;padding:${(8 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px;background:var(--x-panel);border:${Math.max(2, 2 * k * 0.7).toFixed(1)}px solid var(--x-ink);border-radius:calc(var(--x-radius) * 0.65)`, card);
    mk("div", `font:600 ${(9 * k).toFixed(1)}px/1 var(--x-mono-font);letter-spacing:${rtl ? 0 : "0.16em"};color:var(--x-dim)`, inner, rtl ? "مؤقّت" : "TIMER");
    const clock = mk("div", `display:flex;direction:ltr;justify-content:${rtl ? "flex-end" : "flex-start"};font:700 ${(56 * k).toFixed(1)}px/1 var(--x-mono-font);letter-spacing:-0.03em;color:var(--x-ink);font-variant-numeric:tabular-nums`, inner);
    // the clock: one masked slot per character, old over new
    // a number target that is itself a clock is what the card shows: it ticks over onto that time
    let fromT = String(p.from || "7:59"), toT = String(p.to || "8:00");
    const ownClock = el && !isCard && fromT === "7:59" && toT === "8:00" ? (ctxOwn || "").match(/^(\d{1,2}):(\d{2})$/) : null;
    if (ownClock) { const m = (+ownClock[1] * 60 + +ownClock[2] + 1439) % 1440; toT = ctxOwn; fromT = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; }
    const A = Array.from(fromT), B = Array.from(toT);
    const len = Math.max(A.length, B.length);
    while (A.length < len) A.unshift(" "); while (B.length < len) B.unshift(" ");
    const changed = [];
    for (let i = len - 1; i >= 0; i--) if (A[i] !== B[i]) changed.push(i);
    const tickAt = Math.min(end - 0.6, at + 0.95);
    const slots = A.map((a, i) => {
      const mask = mk("span", `display:inline-block;flex:none;position:relative;overflow:hidden;height:1.05em;line-height:1.05em;white-space:pre`, clock);
      const strip = mk("span", `display:flex;flex-direction:column`, mask);
      mk("span", "white-space:pre", strip, a); mk("span", "white-space:pre", strip, B[i]);
      const order = changed.indexOf(i);
      return { strip, start: order < 0 ? Infinity : tickAt + order * 0.08 };
    });
    ML.fit(clock, cw - 56 * k); // a long time ("12:59:59") shrinks to fit the inner panel
    ctx.sfx(at, "pop", 0.35);
    ctx.sfx(tickAt, "tap", 0.35);
    const tilt = p.tilt * (rtl ? -1 : 1), from = -12 * (rtl ? -1 : 1);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const e = ML.back(t, at, at + 0.35, 1.7), on = t >= at;
        card.style.opacity = on ? (Math.min(1, ML.lin(t, at, at + 0.08)) * (1 - leave)).toFixed(4) : "0";
        card.style.scale = Math.min(1, 0.3 + 0.7 * e).toFixed(4);
        card.style.rotate = `${(from + (tilt - from) * e).toFixed(3)}deg`;
        if (el && !isCard) el.style.opacity = (1 - (on ? 1 - leave : 0)).toFixed(4);
        // odometer: the old glyph leaves up and the new comes from below over 0.15 s + 0.15 s
        for (const s of slots) s.strip.style.translate = `0 ${(-ML.out(t, s.start, s.start + 0.3) * 50).toFixed(3)}%`;
        dot.style.opacity = (0.45 + 0.55 * (0.5 + 0.5 * Math.cos((t - at) * Math.PI * 2))).toFixed(3);
      },
    };
  },
});
