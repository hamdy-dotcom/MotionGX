// Scanner sweep that leaves only winners lit: a thin full-height light bar with a soft glow sweeps across a grid of
// cards (x from -5 % to 105 % over 1.2 s, linear, so each card knows exactly when the bar crosses its centre). As it
// passes, the losers dim to 25 % and desaturate (grayscale + brightness .6, 0.25 s) while a few preselected winners
// (~1 in 4) lift 6 px, grow to 1.08, gain a thin accent edge and a small check badge. An optional second sweep, back the
// other way, narrows the winners further. Cards are the target's own items (a list), else a grid built on the stage.
// Direction follows the reading order (RTL sweeps right → left).
// Source: prompt-motion reyzostyle "opus 5.5 literally one" (reference only — our own rebuild).
ML.define({
  id: "ui.scan-highlight-filter",
  category: "ui",
  name: "Scanner sweep that leaves only winners lit",
  does: "A thin vertical light bar sweeps across a grid; cards it passes dim out except a few standouts that stay bright, lift and gain an accent edge and a check badge.",
  says: ["focus", "precision", "choice", "result"],
  energy: 3,
  targets: ["list", "card", "stage"],
  duration: [1.2, 3],
  params: {
    direction: { type: "choice", options: ["left-to-right", "top-to-bottom"], default: "left-to-right" },
    winners: { type: "number", range: [1, 8], default: 3 },
    second_pass: { type: "bool", default: false },
    sweep: { type: "number", range: [0.8, 2], default: 1.2, unit: "s" },
  },
  pairs: ["ui.card-hover-inspect", "text-in.fade-up"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:reyzostyle-opus-5-5-literally-one", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };

    // the cards: the target's own items when it has several, else the target itself among its siblings, else a grid
    let host, cards, built = false;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const kids = el ? [...el.children].filter((c) => c.offsetWidth > 0) : [];
    if (kids.length >= 3) { host = el; cards = kids; }
    else if (el && el.parentElement && el.parentElement.children.length >= 3) { host = el.parentElement; cards = [...host.children].filter((c) => c.offsetWidth > 0); }
    else {
      built = true;
      const R = f.pic, wide = f.wide, cols = wide ? 4 : 3, rows = wide ? 2 : 4;
      const gap = 22 * k, cw = Math.min((R.w - gap * (cols - 1)) / cols, 380 * k), ch = Math.min((R.h - gap * (rows - 1)) / rows, cw * 1.05);
      const gw = cw * cols + gap * (cols - 1), gh = ch * rows + gap * (rows - 1);
      host = mk("div", `position:absolute;left:${(R.x + (R.w - gw) / 2).toFixed(1)}px;top:${(R.y + (R.h - gh) / 2).toFixed(1)}px;width:${gw.toFixed(1)}px;height:${gh.toFixed(1)}px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap.toFixed(1)}px;z-index:5;pointer-events:none;`, ctx.scene || ctx.stage);
      cards = [];
      for (let i = 0; i < cols * rows; i++) {
        const c = mk("div", `background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.5);box-shadow:var(--x-shadow);padding:${(18 * k).toFixed(1)}px;display:flex;flex-direction:column;gap:${(10 * k).toFixed(1)}px;box-sizing:border-box;`, host);
        mk("div", `flex:1;min-height:0;border-radius:calc(var(--x-radius) * 0.3);background:color-mix(in srgb, var(--x-accent) ${(18 + ML.rnd(i, 3) * 30).toFixed(0)}%, var(--x-panel-2));`, c);
        mk("div", `flex:none;height:${(12 * k).toFixed(1)}px;width:${(55 + ML.rnd(i, 5) * 40).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, var(--x-ink) 70%, transparent);`, c);
        mk("div", `flex:none;height:${(10 * k).toFixed(1)}px;width:${(35 + ML.rnd(i, 7) * 40).toFixed(0)}%;border-radius:99px;background:var(--x-line);`, c);
        cards.push(c);
      }
    }
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    // where each card sits along the sweep (0 = where the bar starts, 1 = where it ends)
    const vert = p.direction === "top-to-bottom", flip = !vert && rtl;
    // from layout offsets (never our transforms), re-read each frame: web fonts may land after setup
    const along = (c) => {
      let x = 0, y = 0, e = c;
      while (e && e !== host) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; if (e && e !== host && !host.contains(e)) break; }
      let u = vert ? (y + c.offsetHeight / 2) / (host.offsetHeight || 1) : (x + c.offsetWidth / 2) / (host.offsetWidth || 1);
      if (flip) u = 1 - u;
      return (u + 0.05) / 1.1; // the bar runs -5 % → 105 %
    };
    const pos = cards.map(along);

    // winners: ~1 in 4, preselected (seeded), never all of them
    const n = cards.length, want = Math.round(ML.clamp(p.winners, 1, Math.max(1, Math.floor(n / 2))));
    const order = cards.map((_, i) => i).sort((a, b) => ML.rnd(a, 11) - ML.rnd(b, 11));
    const win = new Set(order.slice(0, want));
    const win2 = new Set(order.slice(0, Math.max(1, Math.ceil(want / 2))));

    // the bar(s)
    const sw = ML.clamp(p.sweep, 0.8, 2), t1 = at + (built ? 0.45 : 0.1), room = end - 0.4 - t1;
    const dur = p.second_pass ? Math.min(sw, room / 2.3) : Math.min(sw, room);
    const t2 = t1 + dur + Math.min(0.35, dur * 0.3);
    const line = mk("div", `position:absolute;${vert ? "left:-3%;width:106%;height:" + Math.max(1, 1.5 * k).toFixed(1) + "px;top:0;" : "top:-3%;height:106%;width:" + Math.max(1, 1.5 * k).toFixed(1) + "px;left:0;"}background:var(--x-accent-ink);box-shadow:0 0 ${(14 * k).toFixed(1)}px ${(3 * k).toFixed(1)}px var(--x-accent), 0 0 ${(40 * k).toFixed(1)}px ${(12 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) 55%, transparent);z-index:9;pointer-events:none;opacity:0;`, host);
    // the badge each winner gains
    const badges = cards.map((c, i) => {
      if (!win.has(i)) return null;
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      const s = Math.max(18, Math.min(c.offsetHeight * 0.42, 40 * k));
      const b = mk("span", `position:absolute;top:${(-s * 0.35).toFixed(1)}px;${rtl ? "left" : "right"}:${(-s * 0.35).toFixed(1)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;border-radius:50%;background:var(--x-accent);color:var(--x-accent-ink);display:flex;align-items:center;justify-content:center;font:700 ${(s * 0.6).toFixed(1)}px var(--x-body-font);box-shadow:var(--x-shadow);opacity:0;z-index:3;`, c, "✓");
      return b;
    });
    const base = cards.map((c) => ({ o: c.style.opacity, f: c.style.filter, tr: c.style.translate, sc: c.style.scale, ol: c.style.outline, z: c.style.zIndex }));

    // the moments each card is passed
    const passes = (ps) => [ps.map((u) => t1 + u * dur), ps.map((u) => t2 + (1 - u) * dur)];
    const [pass1, pass2] = passes(pos);
    ctx.sfx(t1, "whoosh.soft", 0.35);
    if (p.second_pass) ctx.sfx(t2, "whoosh.soft", 0.3);
    [...win].map((i) => (p.second_pass && win2.has(i) ? pass2[i] : pass1[i])).sort((a, b) => a - b).forEach((s, j) => j < 3 && ctx.sfx(s, "blip", 0.22));

    const bar = (t, s0, back) => {
      const u = ML.lin(t, s0, s0 + dur), x = back ? 1 - u : u;
      const on = t >= s0 && t <= s0 + dur ? Math.min(1, ML.lin(t, s0, s0 + 0.08), 1 - ML.lin(t, s0 + dur - 0.08, s0 + dur)) : 0;
      return { x: flip ? 1 - (x * 1.1 - 0.05) : x * 1.1 - 0.05, on };
    };
    return {
      draw(t) {
        const [pass1, pass2] = passes(cards.map(along));
        // a grid we built arrives before the sweep and is gone before the scene's cut; the target's own cards stay
        if (built) { const u = ML.out(t, at, at + 0.35); host.style.opacity = (t < at ? 0 : u * (1 - ML.lin(t, end - 0.25, end))).toFixed(4); host.style.translate = `0 ${((1 - u) * 24 * k).toFixed(2)}px`; }
        // the bar: first pass, then (optionally) back
        let b = bar(t, t1, false);
        if (p.second_pass && t > t1 + dur) b = bar(t, t2, true);
        line.style.opacity = b.on.toFixed(4);
        if (vert) line.style.translate = `0 ${(b.x * host.offsetHeight).toFixed(2)}px`;
        else line.style.translate = `${(b.x * host.offsetWidth).toFixed(2)}px 0`;

        cards.forEach((c, i) => {
          let lose = ML.lin(t, pass1[i], pass1[i] + 0.25), lift = 0;
          if (win.has(i)) {
            lose = 0;
            lift = ML.out(t, pass1[i], pass1[i] + 0.3);
            if (p.second_pass && !win2.has(i)) { const d = ML.lin(t, pass2[i], pass2[i] + 0.25); lose = d; lift *= 1 - d; }
          }
          if (t < t1) { c.style.opacity = base[i].o; c.style.filter = base[i].f; c.style.translate = base[i].tr; c.style.scale = base[i].sc; c.style.outline = base[i].ol; c.style.zIndex = base[i].z; if (badges[i]) badges[i].style.opacity = "0"; return; }
          c.style.opacity = (1 - 0.75 * lose).toFixed(4);
          // constant forms (never toggling to "none") so the frame never depends on what was drawn before
          c.style.filter = `grayscale(${lose.toFixed(3)}) brightness(${(1 - 0.4 * lose).toFixed(3)})`;
          c.style.translate = `0 ${(-6 * k * lift).toFixed(2)}px`;
          c.style.scale = (1 + 0.08 * lift).toFixed(4);
          c.style.outline = lift > 0.004 ? `${Math.max(1, 2 * k).toFixed(1)}px solid color-mix(in srgb, var(--x-accent) ${(lift * 70).toFixed(1)}%, transparent)` : "none";
          c.style.outlineOffset = "0px";
          c.style.zIndex = lift > 0 ? "2" : base[i].z;
          if (badges[i]) { const q = win.has(i) ? lift : 0; badges[i].style.opacity = q.toFixed(4); badges[i].style.scale = (0.6 + 0.4 * ML.back(t, pass1[i], pass1[i] + 0.3, 2)).toFixed(4); }
        });
      },
    };
  },
});
