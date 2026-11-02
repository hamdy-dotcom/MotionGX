// Card stack build: cards slide up one at a time onto a shared top anchor (12 % down the box, transform-origin centre
// top). Each arrives from y 100 % with opacity 0 → 1 in 0.8 s power3.out, `stagger` apart (or on its spoken word).
// Recede (optional): while a card arrives, the one under it goes scale 1 → depth_scale + index × .015, opacity → .72,
// y 0 → −24 px, mapped to the arrival (ease none), so the older cards peek out above as a deck. No angles on the cards.
// From the right instead of the bottom on request (from the left in Arabic).
// Source: MengTo/Skills agent-skills/web-design/cinematic-scroll-storytelling (MIT, the stacked-cards scene, rebuilt
// on the clock instead of scroll) + MotionGX lib/live-engine/worker/vendor/recipes.js R.layout (own).
ML.define({
  id: "element.card-stack",
  category: "element",
  name: "Card stack build",
  does: "Cards slide up one at a time and stack; each earlier card can shrink, dim and shift up as the next covers it.",
  says: ["list", "step", "story", "proof"],
  energy: 3,
  targets: ["card", "list", "screen", "image"],
  duration: [1.5, 6],
  params: {
    recede: { type: "bool", default: true },
    cards: { type: "number", range: [2, 6], default: 3 },
    depth_scale: { type: "number", range: [0.88, 0.96], default: 0.92 },
    direction: { type: "choice", options: ["bottom", "right"], default: "bottom" },
    stagger: { type: "number", range: [0.1, 1], default: 0.2, unit: "s" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "transition.recede-cover", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:agent-skills/web-design/cinematic-scroll-storytelling", license: "MIT", note: "stacked-cards scene put on the clock; recede mapping as in lib/live-engine/worker/vendor/recipes.js R.layout (own)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;overflow:hidden;border-radius:var(--x-radius);`, host);
    const back = p.backdrop ? mk("div", "position:absolute;inset:0;background:var(--x-ground);", layer) : null;

    const n = Math.round(ML.clamp(p.cards, 2, 6));
    const mine = own && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const DEF = rtl
      ? [["الخطوة الأولى", "اختار الخطة اللي تناسبك في ثواني."], ["كل حاجة في مكان واحد", "فواتيرك وعملاءك ومدفوعاتك في شاشة واحدة."], ["تقارير لحظية", "شوف أرقامك بتتحرك وقت ما تحصل."], ["فريقك معاك", "صلاحيات واضحة لكل واحد."], ["دعم على طول", "حد بيرد عليك في دقايق."], ["أمان كامل", "بياناتك مشفّرة دايماً."]]
      : [["Step one", "Pick the plan that fits in seconds."], ["Everything in one place", "Invoices, clients and payments on one screen."], ["Live reports", "Watch your numbers move as they happen."], ["Your team, aboard", "Clear permissions for everyone."], ["Help, always", "A real person answers in minutes."], ["Locked down", "Your data is always encrypted."]];
    const items = Array.from({ length: n }, (_, i) => (mine[i] ? [mine[i], DEF[i % DEF.length][1]] : DEF[i % DEF.length]));

    // geometry: a shared top anchor at 12 % of the box; the card fills most of what is left
    const anchor = R.h * 0.12;
    const cw = Math.min(R.w * 0.9, 880 * k * (f.wide ? 1.1 : 1));
    const chh = Math.min(R.h - anchor - R.h * 0.06, cw * 0.72);
    const x0 = (R.w - cw) / 2;
    const cards = items.map(([title, body], i) => {
      const c = mk("div", `position:absolute;left:${x0}px;top:${anchor}px;width:${cw}px;height:${chh}px;box-sizing:border-box;padding:${chh * 0.09}px ${cw * 0.06}px;display:flex;flex-direction:column;gap:${chh * 0.05}px;overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);transform-origin:50% 0;z-index:${i + 1};opacity:0;`, layer);
      const top = mk("div", `display:flex;align-items:center;gap:${cw * 0.025}px;`, c);
      mk("div", `flex:none;width:${chh * 0.17}px;height:${chh * 0.17}px;border-radius:calc(var(--x-radius) * 0.5);display:grid;place-items:center;background:${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"};color:var(--x-accent-ink);font:var(--x-head-weight) ${chh * 0.08}px var(--x-head-font);`, top, String(i + 1));
      mk("div", `font:var(--x-label-weight) ${chh * 0.05}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, top, rtl ? `${i + 1} من ${n}` : `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`);
      mk("div", `font:var(--x-head-weight) ${Math.min(chh * 0.13, cw * 0.075)}px/1.12 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);`, c, title);
      mk("div", `font:var(--x-body-weight) ${Math.min(chh * 0.075, cw * 0.042)}px/1.4 var(--x-body-font);color:var(--x-dim);`, c, body);
      // a quiet visual strip at the foot so each card reads as a feature panel
      const strip = mk("div", `margin-top:auto;height:${chh * 0.18}px;display:flex;gap:${cw * 0.02}px;align-items:flex-end;`, c);
      for (let j = 0; j < 7; j++) mk("span", `flex:1;height:${(30 + ML.rnd(i * 7 + j, 2) * 70).toFixed(0)}%;border-radius:${4 * k}px;background:color-mix(in srgb, ${j === 3 + (i % 3) ? "var(--x-accent)" : "var(--x-ink)"} ${j === 3 + (i % 3) ? 85 : 9}%, transparent);`, strip);
      return c;
    });

    // arrival times
    const dur = 0.8;
    const span = Math.max(0.3, end - at - dur - 0.5);
    const gapT = Math.min(p.stagger, span / Math.max(1, n - 1));
    const times = cards.map((_, i) => {
      const base = at + i * gapT;
      if (p.sync !== "spoken") return base;
      const w = items[i][0].split(/\s+/)[0];
      return Math.max(at, ctx.word(w, base));
    });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.1);
    times.forEach((t, i) => ctx.sfx(t + 0.1, i % 2 ? "card.fan" : "card", 0.35));
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3);
    const fromRight = p.direction === "right";
    const sx = rtl ? -1 : 1;
    const goA = Math.max(times[n - 1] + dur + 0.3, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        if (own && !big && own.style) own.style.opacity = t >= at ? "0" : "";
        cards.forEach((c, i) => {
          const a = p3(t, times[i], times[i] + dur);
          // how far the cards above it have arrived (ease none, mapped to each arrival)
          let lv = 0;
          if (p.recede) for (let j = i + 1; j < n; j++) lv += ML.lin(t, times[j], times[j] + dur);
          const one = Math.min(1, lv), more = Math.max(0, lv - 1);
          const target = Math.min(0.99, p.depth_scale + i * 0.015);
          const sc = Math.max(0.7, 1 - (1 - target) * one - (1 - p.depth_scale) * 0.6 * more);
          const op = Math.min(1, a * 2.4) * (1 - 0.28 * one - 0.12 * more);
          const ry = -24 * k * (one + more * 0.8);
          const tx = fromRight ? (1 - a) * (R.w - x0) * sx : 0;
          const ty = fromRight ? 0 : (1 - a) * (R.h - anchor);
          c.style.opacity = Math.max(0, op).toFixed(4);
          c.style.transform = `translate(${tx.toFixed(2)}px, ${(ty + ry).toFixed(2)}px) scale(${sc.toFixed(4)})`;
        });
      },
    };
  },
});
