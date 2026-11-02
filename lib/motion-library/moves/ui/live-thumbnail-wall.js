// Gallery wall of live mini-previews: a web gallery grid (3 columns, small gaps, softly rounded cards) where every card
// plays its own tiny looping scene — a logo mark turning, a toggle flipping, a player scrubbing, equalizer bars, a
// spinner, lines typing, a chart drawing, dots bouncing — each on its own 2-4 s loop with offset phases so no two change
// at once. Under each card a label row (avatar dot + handle). Card grounds alternate accent / ink / light for rhythm.
// The cards build in with a short stagger. Every loop is (t - at + phase) mod period: a pure function of t.
// Source: prompt-motion "antonio-kodheli-490109" (reference only: rebuilt as our own code).
ML.define({
  id: "ui.live-thumbnail-wall",
  category: "ui",
  name: "Gallery wall of live mini-previews",
  does: "A web gallery of cards each playing its own mini animation (logos, toggles, players) so the page feels alive.",
  says: ["proof", "choice", "list", "scale"],
  energy: 2,
  targets: ["card", "screen", "list"],
  duration: [2, 8],
  params: {
    columns: { type: "number", range: [2, 4], default: 3 },
    loop: { type: "number", range: [2, 4], default: 3, unit: "s" },
    rows: { type: "number", range: [0, 5], default: 0 },
    labels: { type: "bool", default: true },
    stagger: { type: "number", range: [0, 0.15], default: 0.06, unit: "s" },
  },
  pairs: ["camera.push-in", "ui.screen-scroll"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "prompt-motion:antonio-kodheli-490109", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let host = ctx.el;
    if (host && host.clientWidth > 300 && host.clientHeight > 300) host.replaceChildren();
    else host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground)", ctx.scene || ctx.stage);
    const W = host.clientWidth || ctx.f.pic.w, H = host.clientHeight || ctx.f.pic.h;
    const cols = Math.round(ML.clamp(p.columns, 2, 4));
    const gap = Math.min(W, H) * 0.022;
    const cw = (W - gap * (cols - 1)) / cols, labH = p.labels ? Math.min(cw * 0.13, H * 0.06) : 0;
    let ch = cw * 0.75;
    let rows = p.rows >= 1 ? Math.round(p.rows) : Math.floor((H + gap) / (ch + labH + gap));
    if (rows < 2) { rows = p.rows >= 1 ? Math.round(p.rows) : 2; ch = Math.min(ch, (H - gap * (rows - 1)) / rows - labH); } // a wall, not a strip: shorter cards
    const n = cols * rows;
    const grid = mk("div", `position:${host === ctx.el ? "relative" : "absolute"};inset:0;width:100%;height:100%;display:grid;grid-template-columns:repeat(${cols}, 1fr);grid-auto-rows:${(ch + labH).toFixed(1)}px;gap:${gap.toFixed(1)}px;align-content:center`, host);
    const grounds = [["var(--x-accent)", "var(--x-accent-ink)"], ["var(--x-ink)", "var(--x-ground)"], ["var(--x-panel-2)", "var(--x-ink)"]];
    const kinds = ["logo", "toggle", "player", "bars", "spinner", "typing", "chart", "dots"];
    const handles = rtl ? ["@استوديو", "@نور", "@مصمم", "@حركة", "@لوجو", "@سارة", "@خط", "@بكسل"] : ["@studio", "@nora", "@kodheli", "@motion", "@marks", "@sara", "@typeset", "@pixel"];
    const cards = [];
    for (let i = 0; i < n; i++) {
      const [bg, fg] = grounds[(i + Math.floor(i / cols)) % 3];
      const kind = kinds[(i * 5 + Math.floor(i / 8)) % kinds.length]; // every kind once before any repeats
      const cell = mk("div", "display:flex;flex-direction:column;gap:0;min-width:0", grid);
      const card = mk("div", `position:relative;height:${ch.toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.2);background:${bg};color:${fg};overflow:hidden;display:flex;align-items:center;justify-content:center`, cell);
      const s = ch / 100; // a mini scene in card units (100 = card height)
      const parts = {};
      if (kind === "logo") {
        parts.a = mk("i", `position:absolute;width:${28 * s}px;height:${28 * s}px;border-radius:50%;background:currentColor`, card);
        parts.b = mk("i", `position:absolute;width:${22 * s}px;height:${22 * s}px;border:${3 * s}px solid currentColor;border-radius:${4 * s}px`, card);
      } else if (kind === "toggle") {
        parts.track = mk("i", `position:relative;width:${52 * s}px;height:${28 * s}px;border-radius:${14 * s}px;border:${2.5 * s}px solid currentColor;box-sizing:border-box`, card);
        parts.knob = mk("i", `position:absolute;top:${3 * s}px;left:${3 * s}px;width:${17 * s}px;height:${17 * s}px;border-radius:50%;background:currentColor`, parts.track);
      } else if (kind === "player") {
        const box = mk("div", `display:flex;align-items:center;gap:${8 * s}px;width:76%`, card);
        mk("i", `width:0;height:0;border-block:${8 * s}px solid transparent;border-left:${13 * s}px solid currentColor;flex:none`, box);
        const bar = mk("i", `position:relative;flex:1;height:${4 * s}px;border-radius:${2 * s}px;background:color-mix(in srgb, currentColor 30%, transparent)`, box);
        parts.fill = mk("i", `position:absolute;inset-block:0;inset-inline-start:0;width:0;border-radius:inherit;background:currentColor`, bar);
      } else if (kind === "bars") {
        const box = mk("div", `display:flex;align-items:flex-end;gap:${5 * s}px;height:${40 * s}px`, card);
        parts.bars = [0, 1, 2, 3, 4].map(() => mk("i", `width:${7 * s}px;height:100%;background:currentColor;border-radius:${2 * s}px;transform-origin:bottom`, box));
      } else if (kind === "spinner") {
        parts.ring = mk("i", `width:${34 * s}px;height:${34 * s}px;border-radius:50%;background:conic-gradient(currentColor 0 30%, transparent 30%);-webkit-mask:radial-gradient(circle, transparent 55%, #000 57%);mask:radial-gradient(circle, transparent 55%, #000 57%)`, card);
      } else if (kind === "typing") {
        const box = mk("div", `display:flex;flex-direction:column;gap:${7 * s}px;width:70%`, card);
        parts.lines = [0.9, 0.7, 0.8].map((w) => { const l = mk("i", `display:block;height:${6 * s}px;border-radius:${3 * s}px;background:currentColor;width:0`, box); l.w = w; return l; });
      } else if (kind === "chart") {
        card.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 100 60" style="width:70%;height:auto;overflow:visible;transform:scaleX(${rtl ? -1 : 1})"><polyline points="0,50 18,38 34,44 52,22 70,30 100,6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg>`);
        parts.line = card.querySelector("polyline");
      } else {
        const box = mk("div", `display:flex;gap:${7 * s}px`, card);
        parts.dots = [0, 1, 2].map(() => mk("i", `width:${10 * s}px;height:${10 * s}px;border-radius:50%;background:currentColor`, box));
      }
      if (p.labels) {
        const row = mk("div", `display:flex;align-items:center;gap:${(labH * 0.25).toFixed(1)}px;height:${labH.toFixed(1)}px;font:500 ${(labH * 0.48).toFixed(1)}px var(--x-body-font);color:var(--x-dim);white-space:nowrap;overflow:hidden`, cell);
        mk("i", `width:${(labH * 0.45).toFixed(1)}px;height:${(labH * 0.45).toFixed(1)}px;border-radius:50%;flex:none;background:${["var(--x-accent)", "var(--x-ink)", "var(--x-dim)"][(i + 1) % 3]}`, row);
        mk("span", null, row, handles[i % handles.length]);
      }
      const period = p.loop * (0.8 + 0.4 * ML.rnd(i, 5)), phase = ML.rnd(i, 9) * period;
      cards.push({ cell, kind, parts, period, phase, s, i });
    }
    for (let i = 0; i < n; i += 3) ctx.sfx(at + i * p.stagger, "card.fan", 0.25);
    const tri = (x) => (x < 0.5 ? x * 2 : 2 - x * 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        grid.style.opacity = (1 - leave).toFixed(4);
        for (const c of cards) {
          const a = at + c.i * p.stagger, u = ML.out(t, a, a + 0.4);
          c.cell.style.opacity = u.toFixed(4);
          c.cell.style.translate = `0 ${((1 - u) * c.s * 14).toFixed(2)}px`;
          const x = (((t - at + c.phase) % c.period) + c.period) % c.period / c.period; // 0..1 loop phase
          const P = c.parts, s = c.s;
          if (c.kind === "logo") {
            const e = ML.ease(x, 0.1, 0.45) - ML.ease(x, 0.6, 0.95);
            P.a.style.translate = `${(-18 * s * e).toFixed(2)}px 0`; P.b.style.translate = `${(18 * s * e).toFixed(2)}px 0`;
            P.b.style.rotate = `${(e * 135).toFixed(2)}deg`;
          } else if (c.kind === "toggle") {
            const e = ML.ease(x, 0.2, 0.32) - ML.ease(x, 0.7, 0.82);
            P.knob.style.translate = `${((rtl ? -1 : 1) * 24 * s * e).toFixed(2)}px 0`;
            P.track.style.background = `color-mix(in srgb, currentColor ${(e * 35).toFixed(1)}%, transparent)`;
          } else if (c.kind === "player") P.fill.style.width = `${(ML.lin(x, 0.05, 0.9) * 100).toFixed(2)}%`;
          else if (c.kind === "bars") P.bars.forEach((b, k) => { b.style.scale = `1 ${(0.2 + 0.8 * tri((x * 3 + k * 0.23) % 1)).toFixed(3)}`; });
          else if (c.kind === "spinner") P.ring.style.rotate = `${(x * 360 * (rtl ? -1 : 1)).toFixed(2)}deg`;
          else if (c.kind === "typing") P.lines.forEach((l, k) => { l.style.width = `${(l.w * 100 * ML.lin(x, 0.08 + k * 0.22, 0.28 + k * 0.22) * (1 - ML.lin(x, 0.9, 0.98))).toFixed(2)}%`; });
          else if (c.kind === "chart") P.line.setAttribute("stroke-dashoffset", (1 - ML.ease(x, 0.05, 0.6) * (1 - ML.lin(x, 0.88, 0.98))).toFixed(4));
          else P.dots.forEach((d, k) => { d.style.translate = `0 ${(-10 * s * Math.max(0, Math.sin((x * 2 - k * 0.15) * Math.PI * 2))).toFixed(2)}px`; });
        }
      },
    };
  },
});
