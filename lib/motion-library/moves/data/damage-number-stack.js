// Damage-number stack: like hit numbers in a game, small "+n" figures pop above the target one after another (each
// springs in from 1.4× and 20 px low in 0.12 s), every new hit pushing the earlier ones up a line; after the last hit
// they all fly into one point and a larger total ("+4,500") punches in with a burst ring around the target. The hits
// are a seeded split of the total, so they add up. A fun way to sum results (revenue, sign-ups). Colours come from the
// look; "pixel" sets the hits in the mono face with a dark outline, "bold" in the headline face.
// Source: prompt-motion:0xevinho-opus-5-5-is-really (reference only — rebuilt as our own code).
ML.define({
  id: "data.damage-number-stack",
  category: "data",
  name: "Hit numbers stack into a total",
  does: "Rapid numbers pop above a target and stack upward, then collapse into one large total with a burst.",
  says: ["growth", "scale", "energy", "result", "playful"],
  energy: 4,
  targets: ["number"],
  duration: [1.2, 3],
  params: {
    hits: { type: "number", range: [4, 16], default: 8 },
    style: { type: "choice", options: ["pixel", "bold"], default: "pixel" },
    colour: { type: "choice", options: ["accent-2", "accent", "good", "bad"], default: "accent-2" },
    total: { type: "bool", default: true },
    value: { type: "number", range: [0, 100000000], default: 0 },
  },
  pairs: ["data.counter-with-particle-swarm", "data.digit-write"],
  avoid: ["luxury", "calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:0xevinho-opus-5-5-is-really", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const fmt = (n) => Math.round(n).toLocaleString("en-US");

    // the target: its box and its figure (the total the hits add up to); with no target, a figure on the stage
    let tgt = el;
    if (!tgt) tgt = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2}px;top:${f.pic.y + f.pic.h * 0.62}px;translate:-50% -50%;font:800 ${Math.round(150 * u)}px var(--x-head-font);color:var(--x-ink)`, stage, "4,500");
    const B = ctx.box(tgt);
    const r = doc.createRange(); r.selectNodeContents(tgt);
    const sb = stage.getBoundingClientRect(), sc = sb.width / (stage.offsetWidth || 1) || 1, tb = r.getBoundingClientRect();
    const T = tb.width > 0 ? { x: (tb.left - sb.left) / sc, y: (tb.top - sb.top) / sc, w: tb.width / sc, h: tb.height / sc } : B;
    const own = parseFloat(String(tgt.textContent || "").replace(/[^\d.]/g, ""));
    const total = Math.max(1, +p.value > 0 ? +p.value : Number.isFinite(own) && own > 0 ? own : 1312177);
    const fsT = parseFloat(getComputedStyle(tgt).fontSize) || 120 * u;
    tgt.style.transformOrigin = `${(T.x - B.x + T.w / 2).toFixed(1)}px 50%`; // its punch grows from the figure itself

    // the hits: a seeded split of the total (each a share between 0.5 and 1.5 of an even part)
    const n = Math.round(ML.clamp(+p.hits || 8, 2, 24));
    const w = Array.from({ length: n }, (_, i) => 0.5 + ML.rnd(i, 3));
    const ws = w.reduce((a, b) => a + b, 0);
    let left = total;
    const vals = w.map((x, i) => { if (i === n - 1) return Math.max(1, Math.round(left)); const v = Math.max(1, Math.round((total * x) / ws)); left -= v; return v; });
    const hitSize = Math.max(18 * u, fsT * 0.3), lineH = hitSize * 1.18;
    const colour = `var(--x-${p.colour === "accent" || p.colour === "good" || p.colour === "bad" ? p.colour : "accent-2"})`;
    const face = p.style === "bold" ? "var(--x-head-font)" : "var(--x-mono-font)";
    const outline = `${Math.max(1.5, hitSize * 0.07).toFixed(1)}px`;
    const layer = mk("div", `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:30`, stage);
    const baseX = T.x + T.w / 2, baseY = Math.max(lineH, T.y - hitSize * 0.25); // the newest hit's line, just above the figure
    const hits = vals.map((v, i) => {
      const h = mk("div", `position:absolute;left:0;top:0;font:${p.style === "bold" ? 800 : 700} ${hitSize.toFixed(1)}px/1 ${face};color:${colour};-webkit-text-stroke:${outline} var(--x-ink);paint-order:stroke fill;white-space:nowrap;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;visibility:hidden`, layer, "+" + fmt(v));
      return { h, dx: (ML.rnd(i, 5) - 0.5) * Math.min(T.w, 360 * u) * 0.7, wHalf: 0, hHalf: 0 };
    });
    for (const x of hits) { x.wHalf = x.h.offsetWidth / 2; x.hHalf = x.h.offsetHeight / 2; }

    // timing: hits on a stagger, then the collapse and the total, all inside the span
    const avail = Math.max(0.6, end - at - 0.5);
    const stagger = ML.clamp((avail * 0.5) / n, 0.06, 0.16);
    const times = vals.map((_, i) => at + i * stagger);
    const tc = times[n - 1] + 0.3, tTot = tc + 0.22;
    const sum = mk("div", `position:absolute;left:0;top:0;font:800 ${(hitSize * 1.75).toFixed(1)}px/1 ${face};color:var(--x-bad);-webkit-text-stroke:${outline} var(--x-ink);paint-order:stroke fill;white-space:nowrap;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums;visibility:hidden`, layer, "+" + fmt(total));
    const sumW = sum.offsetWidth / 2, sumH = sum.offsetHeight / 2;
    const ringR = Math.hypot(T.w, T.h) * 0.6;
    const ring = mk("div", `position:absolute;border-radius:50%;border:${Math.max(2, 4 * u)}px solid var(--x-accent);visibility:hidden`, layer);
    const sumY = Math.max(sumH + 8 * u, baseY - lineH * 1.2);
    times.forEach((tt, i) => ctx.sfx(tt, "blip", 0.18 + 0.02 * (i % 3)));
    if (p.total) { ctx.sfx(tc, "whoosh.soft", 0.25); ctx.sfx(tTot, "hit", 0.5); }

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        const fly = p.total ? ML.ease(t, tc, tc + 0.22) : 0;
        const fadeAll = p.total ? 0 : ML.ease(t, tc + 0.2, tc + 0.5);
        hits.forEach((x, i) => {
          const ti = times[i];
          if (t < ti || fly >= 1 || fadeAll >= 1 || leave >= 1) { x.h.style.visibility = "hidden"; return; }
          // its line: pushed up one line by each later hit (each push eases over 0.12 s)
          let up = 0;
          for (let j = i + 1; j < n; j++) up += ML.out(t, times[j], times[j] + 0.12);
          const pop = ML.out(t, ti, ti + 0.12);
          const s = 1.4 - 0.4 * pop;
          let x0 = baseX + x.dx, y0 = baseY - up * lineH + (1 - pop) * 20 * u;
          // the collapse: every hit flies to the total's spot and shrinks into it
          x0 += (baseX - x0) * fly; y0 += (sumY - y0) * fly;
          x.h.style.visibility = "visible";
          x.h.style.opacity = (Math.min(1, pop * 3) * (1 - fly) * (1 - fadeAll) * (1 - leave)).toFixed(4);
          x.h.style.transform = `translate(${(x0 - x.wHalf).toFixed(2)}px, ${(y0 - x.hHalf).toFixed(2)}px) scale(${(s * (1 - 0.6 * fly)).toFixed(4)})`;
        });
        // the total: a scale punch (2D) and a burst ring around the target
        if (p.total && t >= tTot - 0.02 && leave < 1) {
          const k = ML.back(t, tTot, tTot + 0.3, 2.4);
          sum.style.visibility = "visible";
          sum.style.opacity = (ML.clamp((t - tTot + 0.02) / 0.08) * (1 - leave)).toFixed(4);
          sum.style.transform = `translate(${(baseX - sumW).toFixed(2)}px, ${(sumY - sumH).toFixed(2)}px) scale(${(0.4 + 0.6 * k).toFixed(4)})`;
          const b = ML.out(t, tTot, tTot + 0.5), R = ringR * (0.5 + 0.7 * b);
          ring.style.visibility = b < 1 ? "visible" : "hidden";
          ring.style.opacity = ((1 - b) * 0.9).toFixed(4);
          ring.style.left = (T.x + T.w / 2 - R).toFixed(2) + "px"; ring.style.top = (T.y + T.h / 2 - R).toFixed(2) + "px";
          ring.style.width = ring.style.height = (2 * R).toFixed(2) + "px";
        } else { sum.style.visibility = "hidden"; ring.style.visibility = "hidden"; }
        // the target takes the hit: a small punch as the total lands
        const punch = p.total ? ML.pulse(t, tTot, 0.03, 0.22) : 0;
        tgt.style.scale = punch > 0.01 ? (1 + 0.06 * punch).toFixed(4) : "none";
      },
    };
  },
});
