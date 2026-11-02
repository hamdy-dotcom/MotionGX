// Selected-state border light-up: a chosen plan, tab or card trades its quiet hairline for an accent gradient edge.
// Idle: a 1 px gradient border, ink 8 % → ink 4 % (the source's white/08 → white/04 on a dark surface; here the look's
// ink so it reads on light and dark looks alike). Selected: it cross-fades to 135deg ink 34 % → accent 36 % → ink 8 %,
// the width steps 1 → 2 px on a large card (width_step), and a faint glow appears (0 0 0 1px accent/10,
// 0 12px 40px -12px accent/25). 0.35 s power2.out; the neighbour that held the selection returns to idle on the same
// frames. The border is the source's mask technique (a gradient layer, content-box masked out), so it follows any radius.
// Web px grow with the stage (×2 at 1080). On a target the director gives, that element lights up (its siblings with a
// border act as the neighbours); alone it builds three plan cards and moves the selection from the first to the second.
// Source: MengTo/Skills web-design/css-border-gradient (MIT).
ML.define({
  id: "ui.gradient-border",
  category: "ui",
  name: "Selected-state border light-up",
  does: "When a plan, tab or card is chosen its hairline border brightens into an accent gradient and a faint glow appears.",
  says: ["choice", "focus", "precision"],
  energy: 2,
  targets: ["card", "label"],
  duration: [0.35, 1],
  params: {
    colour: { type: "choice", options: ["accent", "accent-2", "good", "ink"], default: "accent" },
    width_step: { type: "bool", default: true },
    glow: { type: "bool", default: true },
    dur: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
  },
  pairs: ["ui.cursor-glide-click", "ui.hover-lift"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/css-border-gradient", license: "MIT" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080, s = 2 * k;
    const C = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", good: "var(--x-good)", ink: "var(--x-ink)" }[p.colour] || "var(--x-accent)";
    const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct.toFixed(1)}%, transparent)`;
    const pow2 = (x) => 1 - (1 - x) * (1 - x);

    // the cards: the director's target (+ bordered siblings as neighbours), else three plans of our own
    let chosen = ctx.el && ctx.el !== ctx.stage ? ctx.el : null, before = null, wrap = null;
    let cards = [];
    if (!chosen) {
      const R = f.pic, tall = f.tall;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:${tall ? "column" : "row"};align-items:center;justify-content:center;gap:${(28 * k).toFixed(1)}px;z-index:5;pointer-events:none;`, host);
      const plans = rtl ? [["أساسي", "0", "للتجربة"], ["احترافي", "19", "للفرق الصغيرة"], ["شركات", "49", "لكل المؤسسة"]] : [["Basic", "0", "To try it out"], ["Pro", "19", "For small teams"], ["Team", "49", "For the whole company"]];
      const cw = tall ? Math.min(R.w * 0.86, 820 * k) : Math.min((R.w - 56 * k) / 3, 460 * k), ch = tall ? Math.min((R.h - 56 * k) / 3, 250 * k) : Math.min(R.h * 0.72, 430 * k);
      cards = plans.map(([n, price, line]) => {
        const c = mk("div", `position:relative;box-sizing:border-box;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;padding:${(36 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.8);background:var(--x-panel);color:var(--x-ink);display:flex;flex-direction:column;justify-content:${tall ? "center" : "flex-start"};gap:${(14 * k).toFixed(1)}px;font-family:var(--x-body-font);`, wrap);
        mk("div", `font:var(--x-label-weight) ${(22 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, c, n);
        const pr = mk("div", `font:var(--x-head-weight) ${(84 * k).toFixed(1)}px/1 var(--x-head-font);letter-spacing:var(--x-head-track);`, c, "$" + price);
        mk("span", `font:var(--x-body-weight) ${(26 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);margin-inline-start:0.3em;letter-spacing:0;`, pr, rtl ? "/ شهر" : "/ mo");
        mk("div", `font:var(--x-body-weight) ${(26 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, c, line);
        if (!tall) {
          const feats = mk("div", `margin-top:auto;display:grid;gap:${(10 * k).toFixed(1)}px;padding-top:${(18 * k).toFixed(1)}px;border-top:${k.toFixed(2)}px solid var(--x-line);`, c);
          for (const x of rtl ? ["مشاريع بلا حدود", "دعم سريع"] : ["Unlimited projects", "Priority support"]) {
            const r = mk("div", `display:flex;align-items:center;gap:0.5em;font:var(--x-body-weight) ${(24 * k).toFixed(1)}px var(--x-body-font);color:var(--x-ink);`, feats);
            mk("span", `width:0.45em;height:0.45em;border-radius:50%;background:${C};flex:none;`, r);
            r.append(x);
          }
        }
        return c;
      });
      before = cards[0]; chosen = cards[1];
    } else {
      cards = [chosen];
      const sib = [...(chosen.parentElement ? chosen.parentElement.children : [])].filter((e) => e !== chosen && parseFloat(getComputedStyle(e).borderTopWidth) > 0);
      cards.push(...sib);
    }

    // each card gets two border layers (idle, selected) and a glow, cross-faded by `sel` (0 idle → 1 selected)
    const large = (c) => c.offsetWidth * c.offsetHeight > 160000 * k * k;
    const layers = cards.map((c) => {
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      const rad = getComputedStyle(c).borderRadius;
      const shadow0 = getComputedStyle(c).boxShadow;
      const L = (bg) => mk("div", `position:absolute;inset:0;border-radius:${rad};padding:${s.toFixed(2)}px;box-sizing:border-box;background:${bg};-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);pointer-events:none;`, c);
      const idle = L(`linear-gradient(135deg, ${mix("var(--x-ink)", 8)}, ${mix("var(--x-ink)", 4)})`);
      const on = L(`linear-gradient(135deg, ${mix("var(--x-ink)", 34)}, ${mix(C, 36)}, ${mix("var(--x-ink)", 8)})`);
      return { c, idle, on, big: p.width_step && large(c), shadow0: shadow0 === "none" ? "" : shadow0 };
    });

    const T = Math.min(Math.max(at + 0.3, ctx.word((chosen.textContent || "").trim().split(/\s+/)[0] || "", at + 0.3)), Math.max(at + 0.05, end - p.dur - 0.15));
    ctx.sfx(T, "blip", 0.35);
    const selOf = (L, t) => {
      const u = pow2(ML.lin(t, T, T + p.dur));
      if (L.c === chosen) return u;
      if (L.c === before) return t < at ? 0 : 1 - u;
      return 0;
    };
    return {
      draw(t) {
        for (const L of layers) {
          const a = selOf(L, t);
          L.idle.style.opacity = (1 - a).toFixed(4);
          L.on.style.opacity = a.toFixed(4);
          L.on.style.padding = `${(s * (L.big ? 1 + a : 1)).toFixed(2)}px`;
          const glow = p.glow && a > 0.002 ? `0 0 0 ${s.toFixed(2)}px ${mix(C, 10 * a)}, 0 ${(12 * s).toFixed(1)}px ${(40 * s).toFixed(1)}px ${(-12 * s).toFixed(1)}px ${mix(C, 25 * a)}` : "";
          L.c.style.boxShadow = [glow, L.shadow0].filter(Boolean).join(", ") || "none";
        }
        if (wrap) {
          const e = ML.out(t, at, at + 0.4), l = ML.clamp((t - (end - 0.25)) / 0.22);
          wrap.style.opacity = (t < at ? 0 : e * (1 - l)).toFixed(4);
          wrap.style.translate = `0 ${((1 - e) * 24 * k).toFixed(2)}px`;
        }
      },
    };
  },
});
