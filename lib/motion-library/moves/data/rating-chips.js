// Rating chips: a quiet trust bar under a section — a wrapping row (gap 32–64) of review scores, each a small star
// icon in the warm tone + "4.9 / 5 Google" in medium type, desaturated (opacity .6 + grayscale) or in colour. Entrance:
// fade-rise y 30 → 0 over 1 s power3.out, stagger 0.1 s. For emphasis the scores count 0.0 → 4.9 over 0.8 s (one
// decimal) and the stars pop scale 0 → 1 (back.out). The row sits right under its target (a number, label or list),
// or at the foot of the picture region when the target is the stage. Items: "score / 5 name" separated by "|".
// Source: MengTo/Skills web-design number-details demo "Trust Bar" (MIT).
ML.define({
  id: "data.rating-chips",
  category: "data",
  name: "Rating chips row",
  does: "A row of review scores with small star icons fades in quietly as proof under a section.",
  says: ["trust", "proof"],
  energy: 1,
  targets: ["number", "label", "list", "stage"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [2, 4], default: 3 },
    colour: { type: "choice", options: ["desaturated", "colour"], default: "desaturated" },
    count_up: { type: "bool", default: false },
    items: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "text-in.punchline"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/number-details/demo/index.html", license: "MIT", note: "the demo's trust bar (flex wrap, opacity .6 grayscale, star + '4.9 / 5 Google'), entrance from its gsap-reveal" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const n = Math.round(ML.clamp(p.count, 2, 4));
    const defaults = rtl
      ? ["4.9 / 5 على جوجل", "4.8 / 5 على آب ستور", "4.7 / 5 تقييم العملا", "4.9 / 5 على جوجل بلاي"]
      : ["4.9 / 5 Google", "4.8 / 5 App Store", "4.7 / 5 Trustpilot", "4.9 / 5 Play Store"];
    const given = String(p.items || "").split("|").map((s) => s.trim()).filter(Boolean);
    const items = Array.from({ length: n }, (_, i) => given[i] || defaults[i]);
    const WARM = "color-mix(in oklch, var(--x-bad) 55%, var(--x-good))";
    const inline = el && el !== ctx.stage;
    const row = mk("div", `display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:${(22 * k).toFixed(1)}px ${((f.wide ? 64 : 40) * k).toFixed(1)}px;${p.colour === "desaturated" ? "filter:grayscale(1)" : ""}`, null, null);
    if (inline) { row.style.marginTop = (22 * k).toFixed(1) + "px"; row.style.width = "100%"; el.after(row); }
    else {
      const holder = mk("div", `position:absolute;left:var(--pic-x);width:var(--pic-w);top:calc(var(--pic-y) + var(--pic-h) - ${(110 * k).toFixed(1)}px);display:flex;justify-content:center;z-index:4`, null, ctx.scene || ctx.stage);
      holder.append(row);
    }
    const fs = (inline ? 34 : 38) * k;
    const chips = items.map((txt) => {
      const chip = mk("div", `display:flex;align-items:center;gap:${(10 * k).toFixed(1)}px;opacity:0`, null, row);
      const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      star.setAttribute("viewBox", "0 0 24 24");
      star.style.cssText = `width:${(fs * 1.05).toFixed(1)}px;height:${(fs * 1.05).toFixed(1)}px;flex:none`;
      star.innerHTML = `<path d="M12 2.6l2.75 5.9 6.45.75-4.78 4.4 1.27 6.38L12 16.85 6.31 20.03l1.27-6.38L2.8 9.25l6.45-.75z" fill="${WARM}"/>`;
      chip.append(star);
      const m = txt.match(/^(\d+(?:\.\d)?)(\s*\/\s*\d+)?(.*)$/);
      const score = m ? parseFloat(m[1]) : null;
      const label = mk("span", `font:500 ${fs.toFixed(1)}px var(--x-body-font);color:var(--x-ink);white-space:nowrap`, null, chip);
      // "4.9 / 5" is one left-to-right unit: in an Arabic line it must not flip into "5 / 4.9"
      const pair = mk("span", "direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums", null, label);
      const sc = mk("span", null, m ? m[1] : "", pair);
      if (m && m[2]) mk("span", null, m[2], pair);
      mk("span", null, m ? m[3] : txt, label);
      return { chip, star, sc, score };
    });
    const times = chips.map((_, i) => at + 0.1 + i * 0.1);
    ctx.sfx(times[0], "pop.soft", 0.2);
    return {
      draw(t) {
        chips.forEach((c, i) => {
          const x = ML.lin(t, times[i], times[i] + 1), u = 1 - Math.pow(1 - x, 4); // power3.out
          c.chip.style.opacity = ((p.colour === "desaturated" ? 0.6 : 1) * Math.min(1, x * 2.2) * (1 - ML.lin(t, end - 0.22, end))).toFixed(4);
          c.chip.style.translate = `0 ${(30 * k * (1 - u)).toFixed(2)}px`;
          if (p.count_up && c.score != null) {
            const v = c.score * ML.out(t, times[i] + 0.1, times[i] + 0.9);
            c.sc.textContent = v.toFixed(1);
            c.star.style.scale = t < times[i] + 0.15 ? "0" : Math.max(0, ML.back(t, times[i] + 0.15, times[i] + 0.6, 1.7)).toFixed(4);
          } else c.star.style.scale = "none";
        });
      },
    };
  },
});
