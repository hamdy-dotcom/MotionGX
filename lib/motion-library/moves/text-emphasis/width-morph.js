// Width morph: a big word changes shape live — ultra-extended → tall condensed (or back, or through the regular cut in
// three states) — its letters reflowing in place. The look's faces are static cuts, so the shape comes from the fallback
// every face supports (no wdth axis is set, so a variable face never doubles it): each letter's box is scaleX 1.5 → 1 → 0.7 wide
// (its slot width follows, so the word reflows and stays centred) with scaleY 0.8 → 1 → 1.15, origin centre; weight is
// a stroke of the letter's own colour growing 0 → .045 em on top of the light cut. Per-letter ripple: 0.03 s stagger
// in reading order (or centre-out), each letter `speed` s power3.inOut, a 0.4 s hold between states; without ripple
// the whole word morphs in one slow cubic-bezier(0.65, 0, 0.35, 1). The type is sized so the widest state fits.
// Arabic: the word morphs whole (ML.split never splits joined letters).
// Source: prompt-motion stephanlivera-opus-5-5-on-max + roundtablespace-opus-5-5-on-max (reference) — our own code.
ML.define({
  id: "text-emphasis.width-morph",
  category: "text-emphasis",
  name: "Word morphs its width",
  does: "A big word changes shape live — from ultra-extended to tall condensed (or back) — letters reflowing in place, optionally rippling across.",
  says: ["brand", "change", "energy"],
  energy: 3,
  targets: ["headline", "word", "logo"],
  duration: [1, 3],
  params: {
    axis: { type: "choice", options: ["width", "weight", "both"], default: "width" },
    from: { type: "choice", options: ["wide", "tall"], default: "wide" },
    states: { type: "number", range: [2, 3], default: 2 },
    ripple: { type: "bool", default: true },
    stagger: { type: "number", range: [0, 0.06], default: 0.03, unit: "s" },
    order: { type: "choice", options: ["ltr", "centre-out"], default: "ltr" },
    speed: { type: "number", range: [0.5, 1.2], default: 0.5, unit: "s" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:stephanlivera-opus-5-5-on-max", license: "reference", note: "also roundtablespace-opus-5-5-on-max; our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // an SVG logo: morph the whole mark
    const whole = el instanceof SVGElement;
    if (whole) { el.style.transformOrigin = "50% 50%"; el.style.transformBox = "fill-box"; }
    const W = { wide: [1.5, 0.8, 1], mid: [1, 1, 0.5], tall: [0.7, 1.15, 0] }; // scaleX, scaleY, weight 0..1
    const n = Math.round(p.states);
    let seq = n >= 3 ? ["wide", "mid", "tall"] : ["wide", "tall"];
    if (p.from === "tall") seq = seq.reverse();
    const doW = p.axis !== "weight", doB = p.axis !== "width";
    const stateOf = (name) => { const s = W[name]; return { x: doW ? s[0] : 1, y: doW ? s[1] : 1, b: doB ? s[2] : 0.5 }; };
    const st = seq.map(stateOf);
    const fs0 = whole ? 0 : parseFloat(getComputedStyle(el).fontSize) || 100;
    let units = [];
    if (!whole) {
      el.style.whiteSpace = "nowrap";
      if (doB) el.style.fontWeight = "300";
      // size so the widest state fits the target's room
      const room = (el.parentElement?.clientWidth || ctx.stage.offsetWidth) * 0.94;
      const maxX = Math.max(...st.map((s) => s.x));
      ML.fit(el, room / maxX);
      const chars = ML.split(el, "chars");
      units = chars.map((c) => {
        const inner = document.createElement("span");
        inner.style.display = "inline-block";
        while (c.firstChild) inner.append(c.firstChild);
        c.append(inner);
        c.style.whiteSpace = "pre";
        const w0 = inner.getBoundingClientRect().width / ((el.getBoundingClientRect().width / (el.offsetWidth || 1)) || 1);
        Object.assign(inner.style, { width: w0.toFixed(2) + "px", transformOrigin: "50% 60%" });
        return { c, inner, w0 };
      });
      // the spaces between words take part too (a scaled gap)
    }
    const fs = whole ? 0 : parseFloat(getComputedStyle(el).fontSize) || fs0;
    // when each letter moves for each transition
    const m = units.length;
    const rank = units.map((_, i) => (p.order === "centre-out" ? Math.abs(i - (m - 1) / 2) : i));
    const one = p.ripple ? p.speed : Math.max(1.2, p.speed + 0.7);
    const span = (p.ripple ? p.stagger * (p.order === "centre-out" ? (m - 1) / 2 : m - 1) : 0) + one;
    const avail = Math.max(0.6, end - at - 0.5);
    const hold = 0.4;
    let gap = span + hold;
    const k = Math.min(1, avail / ((seq.length - 1) * gap + 0.1));
    const begin = (j) => at + 0.15 + j * gap * k;
    const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const slow = ML.bezier(0.65, 0, 0.35, 1);
    for (let j = 1; j < seq.length; j++) ctx.sfx(begin(j - 1), "whoosh.soft", 0.25);
    const at_ = (t, lag) => {
      let s = st[0];
      for (let j = 1; j < seq.length; j++) {
        const t0 = begin(j - 1) + lag * k, x = ML.lin(t, t0, t0 + one * k);
        if (x <= 0) break;
        const e = p.ripple ? io3(x) : slow(x), a = s, b = st[j];
        s = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, b: a.b + (b.b - a.b) * e };
      }
      return s;
    };
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.25, end - 0.05);
        el.style.opacity = (1 - leave).toFixed(4);
        if (whole) { const s = at_(t, 0); el.style.transform = `scale(${s.x.toFixed(4)}, ${s.y.toFixed(4)})`; return; }
        units.forEach((u, i) => {
          const s = at_(t, p.ripple ? rank[i] * p.stagger : 0);
          u.c.style.width = (u.w0 * s.x).toFixed(2) + "px";
          u.inner.style.marginInlineStart = ((u.w0 * s.x - u.w0) / 2).toFixed(2) + "px";
          u.inner.style.transform = `scale(${s.x.toFixed(4)}, ${s.y.toFixed(4)})`;
          if (doB) u.inner.style.webkitTextStroke = `${(s.b * 0.045 * fs).toFixed(2)}px currentColor`;
        });
      },
    };
  },
});
