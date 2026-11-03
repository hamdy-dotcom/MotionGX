// Pill badges pop in with a plus: small chunky pills (accent fill, a darker hard bottom edge, bold text, a slight tilt)
// pop in side by side, each scale 0 → 1.2 → 1 over 0.35 s back.out(3) while its rotation settles −12° → `tilt`, 0.2 s
// apart, and the separator ("+") fades in between them. The tilt mirrors in Arabic. A label target becomes the row: its
// pieces split on , ، | + · , or (when it holds one phrase) its words up to `count`; pass `labels` for exact copy.
// Alone it builds version pills. Source: prompt-motion thilina "i also tried it" (reference only, our own rebuild).
ML.define({
  id: "ui.pill-badge-pop",
  category: "ui",
  name: "Pill badges pop in with plus",
  does: "Small version pills pop in side by side with a plus sign between them.",
  says: ["playful", "change", "list"],
  energy: 3,
  targets: ["label"],
  duration: [0.6, 1.5],
  params: {
    count: { type: "number", range: [2, 4], default: 2 },
    tilt: { type: "number", range: [-12, 0], default: -4, unit: "deg" },
    separator: { type: "text", default: "+" },
    labels: { type: "text" },
  },
  pairs: ["text-in.punchline", "ui.status-badge-flip"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:thilina-a-i-also-tried-it", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080, count = Math.round(ML.clamp(p.count, 2, 4));
    const target = el && el !== stage ? el : null;
    const cut = (x) => String(x).split(/\s*[,،|+·]\s*/).map((s) => s.trim()).filter(Boolean);
    let labels = p.labels ? cut(p.labels) : [];
    if (!labels.length && target) {
      labels = cut(target.textContent);
      if (labels.length === 1) {
        const w = labels[0].split(/\s+/);
        if (w.length > 1) labels = [...w.slice(0, count - 1), w.slice(count - 1).join(" ")];
      }
    }
    if (!labels.length) labels = Array.from({ length: count }, (_, i) => `1.${3 + i}`);
    labels = labels.slice(0, 4);

    let row, fs;
    if (target) {
      fs = Math.max(38 * k, (parseFloat(getComputedStyle(target).fontSize) || 24) * 1.15);
      row = target;
      row.replaceChildren();
    } else {
      const R = f.pic;
      fs = 58 * k;
      row = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;align-content:center;justify-content:center;z-index:6;`, ctx.scene || stage);
    }
    row.style.display = "flex"; row.style.flexWrap = "wrap"; row.style.alignItems = "center";
    row.style.gap = `${(fs * 0.4).toFixed(1)}px`; row.style.letterSpacing = "0"; row.style.textTransform = "none";
    const edge = fs * 0.14;
    const pills = [], seps = [];
    labels.forEach((x, i) => {
      if (i) seps.push(mk(`font:800 ${(fs * 1.05).toFixed(1)}px/1 var(--x-head-font);color:var(--x-ink);`, row, p.separator ?? "+"));
      pills.push(mk(`padding:${(fs * 0.26).toFixed(1)}px ${(fs * 0.58).toFixed(1)}px ${(fs * 0.3).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:800 ${fs.toFixed(1)}px/1.1 var(--x-head-font);white-space:nowrap;box-shadow:inset 0 ${(-edge * 0.4).toFixed(1)}px 0 color-mix(in srgb, var(--x-accent) 78%, var(--x-device)), 0 ${edge.toFixed(1)}px 0 color-mix(in srgb, var(--x-accent) 55%, var(--x-device));`, row, x));
    });
    const dir = rtl ? -1 : 1;
    const times = pills.map((_, i) => at + i * 0.2);
    times.forEach((x) => ctx.sfx(x, "pop", 0.35));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        pills.forEach((e, i) => {
          const a = times[i];
          e.style.visibility = t < a ? "hidden" : "visible";
          const s = Math.max(0, ML.back(t, a, a + 0.35, 3));
          e.style.scale = t >= a + 0.35 ? "none" : s.toFixed(4);
          e.style.rotate = `${(dir * (-12 + (p.tilt + 12) * ML.out(t, a, a + 0.35))).toFixed(2)}deg`;
          e.style.opacity = (1 - leave).toFixed(4);
        });
        seps.forEach((e, i) => {
          const a = times[i + 1] - 0.08;
          e.style.opacity = (ML.lin(t, a, a + 0.16) * (1 - leave)).toFixed(4);
        });
      },
    };
  },
});
