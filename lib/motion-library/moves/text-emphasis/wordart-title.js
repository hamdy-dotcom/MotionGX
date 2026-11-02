// WordArt title: the loud 90s title. Each letter its own glyph in the heaviest weight of the look's headline face,
// filled in turn around a colour wheel (red → orange → yellow → green → blue, anchored on the look's accent hue), a dark
// outline laid outside the fill (paint-order stroke), a stepped hard extrusion down-right in a deeper shade of each
// letter's own colour, and the whole line bent on a slight arc (each letter rotated and dropped along a circle). The
// letters pop up in a quick stagger, the arc bends in and the extrusion steps out; optional hue loop over 2 s.
// Colours are derived from the look (relative colour from --x-accent), outline from the look's ink / ground.
// Arabic: its letters join, so per-letter colouring is impossible — Arabic words are coloured whole (rtl: false).
// Source: prompt-motion:henkpoley-opus-5-5-on-max (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.wordart-title",
  category: "text-emphasis",
  name: "Rainbow WordArt title",
  does: "A loud 90s WordArt title: rainbow letters, dark outline, stepped extrusion and a slight arc.",
  says: ["playful", "celebration"],
  energy: 3,
  targets: ["headline", "word"],
  duration: [1, 4],
  params: {
    palette: { type: "text", default: "rainbow" }, // rainbow | warm | cool | look | or a list of look colours "accent,accent-2,good"
    arc: { type: "number", range: [0, 30], default: 10, unit: "deg" },
    "hue-loop": { type: "bool", default: false },
    depth: { type: "number", range: [0, 12], default: 7, unit: "steps" },
    outline: { type: "number", range: [0, 0.08], default: 0.035, unit: "em" },
    skew: { type: "number", range: [-15, 15], default: 0, unit: "deg" },
    stagger: { type: "number", range: [0, 0.12], default: 0.045, unit: "s" },
  },
  pairs: ["text-emphasis.extrude-shadow", "text-emphasis.letter-wave"],
  avoid: ["luxury", "calm", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:henkpoley-opus-5-5-on-max", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const lum = (v) => {
      const pr = document.createElement("i"); pr.style.color = `var(--x-${v})`; pr.style.display = "none"; el.parentElement.append(pr);
      const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove();
      const [r, g, b] = m.slice(0, 3).map((x) => +x / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const darkLook = lum("ground") < 0.4;
    // the type: the headline face at its heaviest, tight, never letter-spaced wide
    el.style.fontFamily = "var(--x-head-font)";
    el.style.fontWeight = "900";
    el.style.letterSpacing = "0";
    const letters = ML.split(el, "chars");
    const fs = parseFloat(getComputedStyle(el).fontSize) || 96;
    // the palette: hues around the wheel from the look's accent (vivid, mid-light), or named look colours
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const pal = String(p.palette || "rainbow").trim().toLowerCase();
    const wheel = (offs, l = 0.74, c = 0.19) => offs.map((h) => `oklch(from var(--x-accent) ${l} max(c, ${c}) calc(h + ${h}))`);
    let fills;
    if (pal === "warm") fills = wheel([-70, -45, -20, 5, -45], 0.72, 0.2);
    else if (pal === "cool") fills = wheel([0, 30, 60, 90, 120], 0.7, 0.17);
    else if (pal === "look") fills = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-bad)"];
    else if (pal.includes(",") || VARS.includes(pal)) fills = pal.split(",").map((s) => s.trim().replace(/^var\(--x-|\)$/g, "").replace(/^--x-/, "")).filter((s) => VARS.includes(s)).map((s) => `var(--x-${s})`);
    else fills = wheel([0, 45, 90, 150, 220]); // rainbow: five evenly-jumping hues in wheel order
    if (!fills.length) fills = wheel([0, 45, 90, 150, 220]);
    const outlineCol = darkLook ? "color-mix(in srgb, var(--x-ground) 85%, var(--x-ink))" : "var(--x-ink)";
    const stepPx = Math.max(1, fs / 110); // one extrusion step ≈ 1 px at 110 px type
    const strokePx = p.outline * fs;
    // per-letter colour, outline and lines for the arc (letters grouped by their line)
    const items = letters.map((c, i) => {
      const fill = fills[i % fills.length];
      const shade = `oklch(from ${fill} calc(l - 0.32) c h)`;
      c.style.color = fill;
      c.style.webkitTextStroke = strokePx > 0.1 ? `${(strokePx * 2).toFixed(2)}px ${outlineCol}` : "0";
      c.style.paintOrder = "stroke fill";
      c.style.transformOrigin = "50% 70%";
      c.style.willChange = "transform";
      return { c, shade, x: 0, line: 0 };
    });
    // measure: letter centres relative to their own line's centre (offsets before any transform)
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    const lines = new Map();
    for (const it of items) {
      const r = it.c.getBoundingClientRect();
      const top = Math.round((r.top - er.top) / k / (fs * 0.5));
      it.cx = (r.left + r.width / 2 - er.left) / k; it.line = top;
      if (!lines.has(top)) lines.set(top, { a: Infinity, b: -Infinity });
      const L = lines.get(top); L.a = Math.min(L.a, (r.left - er.left) / k); L.b = Math.max(L.b, (r.right - er.left) / k);
    }
    for (const it of items) { const L = lines.get(it.line), mid = (L.a + L.b) / 2, half = Math.max(1, (L.b - L.a) / 2); it.u = (it.cx - mid) / half; it.half = half; }
    const times = items.map((_, i) => at + i * p.stagger);
    const lastIn = times[times.length - 1] || at;
    ctx.sfx(at, "pop", 0.35);
    if (letters.length > 6) ctx.sfx(at + (lastIn - at) * 0.5, "pop.soft", 0.25);
    ctx.sfx(lastIn + 0.18, "land.light", 0.3);
    el.style.transform = "none";
    return {
      draw(t) {
        const lv = ML.ease(t, end - 0.3, end - 0.02);
        const bend = ML.out(t, at + 0.1, lastIn + 0.45) * (1 - lv);
        const grow = ML.out(t, at + 0.15, lastIn + 0.5) * (1 - lv);
        const A = (p.arc * Math.PI) / 180;
        const hue = p["hue-loop"] ? (((t - at) / 2) % 1 + 1) % 1 * 360 : 0;
        el.style.filter = p["hue-loop"] && t >= at ? `hue-rotate(${hue.toFixed(1)}deg)` : "none";
        el.style.transform = p.skew ? `skewX(${(-p.skew * bend).toFixed(3)}deg)` : "none";
        const N = Math.round(p.depth * grow * 10) / 10;
        items.forEach((it, i) => {
          const u = ML.back(t, times[i], times[i] + 0.38, 1.6), o = ML.clamp((t - times[i]) / 0.08) * (1 - ML.clamp((t - (end - 0.12)) / 0.1));
          // arc: letter at share u of the half-line sits at angle θ on a circle through the line's ends
          const th = A * it.u * bend, R = A > 1e-4 ? it.half / Math.sin(A) : 0;
          const dy = A > 1e-4 ? R * (1 - Math.cos(th)) - R * (1 - Math.cos(A * bend)) * 0.5 : 0; // centred on the line: middle rises, ends drop
          const pop = (1 - Math.min(1, u)) * fs * 0.5 + Math.max(0, u - 1) * -fs * 0.4;
          const sc = 0.4 + 0.6 * Math.min(1, u);
          it.c.style.opacity = o.toFixed(4);
          it.c.style.transform = `translateY(${(dy + pop + lv * fs * 0.25).toFixed(2)}px) rotate(${((th * 180) / Math.PI).toFixed(3)}deg) scale(${sc.toFixed(4)})`;
          // stepped hard extrusion, down-right, in a deeper shade of the letter's own colour
          let sh = "";
          const n = Math.floor(N);
          for (let s = 1; s <= n; s++) sh += `${sh ? "," : ""}${(s * stepPx).toFixed(2)}px ${(s * stepPx).toFixed(2)}px 0 ${s === n ? outlineCol : it.shade}`;
          it.c.style.textShadow = sh || "none";
        });
      },
    };
  },
});
