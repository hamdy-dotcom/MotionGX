// Playhead ruler: the spoken words appear as blocks on a time ruler at their real positions while a thin accent
// playhead sweeps across (linear, left = clamp((t − a) / (b − a))), ringing the last block as its word lands. Ported
// from html-explainer-video's step 3: a 130 px ruler with a top hairline; blocks absolute at left = pct(start), width =
// pct(duration) − 4 px, top 18, height 66, the small radius, a 25 px mono label; tick labels (seconds to 2 decimals —
// or frames, or word numbers) under every other word at 92 px; a 2 px accent playhead; the ruler shows 0.2 s after the
// move starts. A 32 px mono code chip reads "T.clock = 35.63" and swaps to each new word's time as it is said. The
// last block gets a ring (gap 3) on its word. Arabic: the ruler runs right to left. Without a voice, the target's
// words (or sample words) are spread over the span.
// Source: MengTo/Skills html-explainer-video demo/film.js step3 + film.css .s3-rule (MIT).
ML.define({
  id: "data.playhead-ruler",
  category: "data",
  name: "Word blocks on a ruler with a playhead",
  does: "Words appear as blocks on a time ruler at their real positions while a thin accent playhead sweeps across, ringing the last block as it lands.",
  says: ["time", "precision", "tech"],
  energy: 2,
  targets: ["chart", "label", "number"],
  duration: [1.5, 5],
  params: {
    scale: { type: "choice", options: ["words", "seconds", "frames"], default: "seconds" },
    code_chip: { type: "bool", default: true },
    ring_last: { type: "bool", default: true },
    max_words: { type: "number", range: [3, 16], default: 10 },
    fps: { type: "number", range: [24, 60], default: 30 },
  },
  pairs: ["data.onion-skin-motion-study", "data.pen-draws-network"],
  avoid: ["luxury", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "MengTo/Skills:html-explainer-video/demo/film.js#step3", license: "MIT", note: "ported from the explainer demo's word ruler (film.js step3, film.css .s3-*)" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080; // the explainer's px are on a 1080 short side
    // the words: the voice's words inside the move's span, else the target's words (or samples) spread over it
    let ws = (ctx.words || []).filter((x) => x.t >= at - 0.05 && x.t < end - 0.3).map((x) => ({ w: x.w, t: x.t, e: Math.max(x.e ?? x.t + 0.3, x.t + 0.08) }));
    const maxW = Math.round(ML.clamp(p.max_words, 3, 16));
    if (ws.length < 2) {
      const src = ((el && el.textContent) || (rtl ? "كل كلمة على وقتها بالظبط" : "every word lands on its time")).trim().split(/\s+/).slice(0, maxW);
      const span = Math.max(0.8, end - 0.5 - (at + 0.3)), st = span / src.length;
      ws = src.map((w, i) => ({ w, t: at + 0.3 + i * st, e: at + 0.3 + (i + 0.82) * st }));
    }
    ws = ws.slice(0, maxW);
    const a = ws[0].t, b = ws[ws.length - 1].e;
    const pct = (x) => ((x - a) / (b - a)) * 100;
    const stamp = (w, i) => (p.scale === "frames" ? String(Math.round(w.t * p.fps)) : p.scale === "words" ? String(i + 1) : w.t.toFixed(2));
    const codeOf = (w, i) => (p.scale === "frames" ? `T.frame = ${Math.round(w.t * p.fps)}` : p.scale === "words" ? `T.word = ${i + 1}` : `T.clock = ${w.t.toFixed(2)}`);
    // where it lives: inside its target when that is a chart box, else across the picture region (on the ground)
    const parent = ctx.scene || ctx.stage;
    const asBox = el && el.offsetHeight > 180 * k && el.tagName !== "SPAN";
    const host = asBox
      ? mk("div", "position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;z-index:4", null, el)
      : mk("div", `position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground);display:flex;flex-direction:column;justify-content:center`, null, parent);
    if (asBox && getComputedStyle(el).position === "static") el.style.position = "relative";
    const side = rtl ? "right" : "left";
    const wrap = mk("div", `position:relative;width:100%;padding-top:${(140 * k).toFixed(1)}px`, null, host);
    const code = mk("div", `position:absolute;${rtl ? "left" : "right"}:0;top:0;padding:${(12 * k).toFixed(1)}px ${(18 * k).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);font:500 ${(32 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);direction:ltr;white-space:nowrap;visibility:hidden`, codeOf(ws[0], 0), wrap);
    const rule = mk("div", `position:relative;height:${(130 * k).toFixed(1)}px;border-top:max(1px, var(--x-edge)) solid var(--x-line)`, null, wrap);
    const blocks = ws.map((w) => mk("div", `position:absolute;${side}:${pct(w.t).toFixed(2)}%;width:calc(${(pct(w.e) - pct(w.t)).toFixed(2)}% - ${(4 * k).toFixed(1)}px);top:${(18 * k).toFixed(1)}px;height:${(66 * k).toFixed(1)}px;box-sizing:border-box;border-radius:var(--x-radius-s);background:var(--x-panel-2);border:1px solid var(--x-line);overflow:hidden;font:500 ${(25 * k).toFixed(1)}px/${(64 * k).toFixed(1)}px var(--x-mono-font);padding-inline-start:${(9 * k).toFixed(1)}px;color:var(--x-ink);white-space:nowrap`, w.w.replace(/[.,،؛؟?!]/g, ""), rule));
    ws.forEach((w, i) => { if (i % 2 === 0) mk("span", `position:absolute;${side}:${pct(w.t).toFixed(2)}%;top:${(92 * k).toFixed(1)}px;font:500 ${(22 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-dim);direction:ltr;white-space:nowrap`, stamp(w, i), rule); });
    const head = mk("i", `position:absolute;${side}:0;top:${(-8 * k).toFixed(1)}px;bottom:${(22 * k).toFixed(1)}px;width:${Math.max(2, 2 * k).toFixed(1)}px;background:var(--x-accent);margin-${side}:-1px`, null, rule);
    const showAt = at + 0.2, last = blocks[blocks.length - 1], lastT = ws[ws.length - 1].t;
    ctx.sfx(at, "tap", 0.25);
    if (p.code_chip) ctx.sfx(Math.max(showAt + 0.2, a), "pop", 0.3);
    if (p.ring_last) ctx.sfx(lastT, "bell", 0.3);
    return {
      draw(t) {
        const leave = end - 0.25;
        ML.show(host, t, at, leave);
        ML.show(rule, t, showAt, leave);
        // each block arrives as its word starts (kept in place from the first frame)
        ws.forEach((w, i) => {
          const u = ML.out(t, w.t - 0.06, w.t + 0.14);
          blocks[i].style.opacity = (0.18 + 0.82 * u).toFixed(4);
          blocks[i].style.borderColor = t >= w.t && t < w.e + 0.06 ? "var(--x-accent)" : "";
        });
        head.style[side] = (ML.clamp((t - a) / (b - a)) * 100).toFixed(3) + "%";
        if (p.code_chip) {
          ML.show(code, t, Math.max(showAt + 0.2, a), leave);
          let cur = 0; ws.forEach((w, i) => { if (t >= w.t) cur = i; });
          code.textContent = codeOf(ws[cur], cur);
        } else code.style.visibility = "hidden";
        if (p.ring_last) ML.ring(last, t, lastT, Infinity, 3);
      },
    };
  },
});
