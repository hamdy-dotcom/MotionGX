// Signal level bars: a row of 3–6 small vertical bars (4 × 12 px, radius 2, gap 4 on the source's page — set in em of
// the label here) after an uppercase label, graded from the full ink to a deep shade (#fff → zinc-400 → zinc-600 →
// zinc-800 on the source's dark ground: ink mixed toward the ground here). They light in sequence, opacity .15 → 1,
// 0.12 s each, up to the target level; with `flicker` the last lit bar keeps a seeded idle flicker.
// On a label the bars are set inline after its text (before it in Arabic, following the reading order); on a chart
// or with no target, a mono label + bars are built in the picture region.
// Source: MengTo/Skills web-design/technical-wireframe-info-layout demo (MIT).
ML.define({
  id: "data.signal-level-bars",
  category: "data",
  name: "Signal level bars",
  does: "Small vertical bars graded light to dark show a level, lighting up one by one.",
  says: ["tech", "energy", "precision"],
  energy: 1,
  targets: ["label", "chart"],
  duration: [0.6, 3],
  params: {
    bars: { type: "number", range: [3, 6], default: 4 },
    level: { type: "number", range: [1, 6], default: 3 },
    flicker: { type: "bool", default: false },
    label: { type: "text", default: "" },
  },
  pairs: ["data.spec-rows", "data.readout-swap"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/technical-wireframe-info-layout/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const u = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    let host, label = null, built = false;
    const isLabel = el && el.children.length === 0 && (el.textContent || "").trim() && !/^[\d.,\s%]+$/.test(el.textContent.trim());
    if (isLabel) {
      host = el;
      if (p.label) el.textContent = p.label;
      el.style.display = "inline-flex";
      el.style.alignItems = "center";
      el.style.whiteSpace = "nowrap";
    } else {
      built = true;
      const box = el ? ctx.box(el) : f.pic, hb = ctx.box(ctx.scene || stage);
      host = mk("div", `position:absolute;left:${box.x + box.w / 2 - hb.x}px;top:${box.y + box.h / 2 - hb.y}px;translate:-50% -50%;display:inline-flex;align-items:center;white-space:nowrap;z-index:20;font-size:${Math.round(34 * u)}px`, ctx.scene || stage);
      host.className = "ml-label";
      label = mk("span", "", host, p.label || (rtl ? "الإشارة" : "Signal"));
    }
    const n = Math.round(ML.clamp(p.bars, 3, 6)), level = Math.round(ML.clamp(p.level, 1, n));
    // in em of the label: 12 px bars beside 10–11 px uppercase text on the source
    const group = mk("span", `display:inline-flex;align-items:flex-end;gap:.32em;height:1em;margin-inline-start:.9em;direction:ltr;flex:none`, host);
    const bars = Array.from({ length: n }, (_, i) => {
      const shade = Math.round(100 - (i / Math.max(1, n - 1)) * 62); // ink → toward the ground, like #fff → zinc-800
      return mk("i", `display:block;width:.32em;height:1em;border-radius:.16em;background:color-mix(in srgb, var(--x-ink) ${shade}%, var(--x-ground));opacity:.15`, group);
    });
    const step = 0.12, t0 = at + 0.12;
    for (let i = 0; i < level; i += 2) ctx.sfx(t0 + i * step, "blip", 0.16);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const show = t >= at - 1e-6 ? 1 : 0;
        const inn = ML.out(t, at, at + 0.25);
        if (built) { host.style.visibility = show ? "visible" : "hidden"; host.style.opacity = (inn * (1 - leave)).toFixed(4); }
        else { group.style.visibility = show ? "visible" : "hidden"; group.style.opacity = (inn * (1 - leave)).toFixed(4); }
        bars.forEach((b, i) => {
          let o = 0.15;
          if (i < level) o = 0.15 + 0.85 * ML.lin(t, t0 + i * step, t0 + (i + 1) * step);
          if (p.flicker && i === level - 1 && t > t0 + level * step + 0.2) {
            const k = Math.floor(t * 14), r = ML.rnd(k, 3);
            o = r < 0.22 ? 0.35 + r : 1; // mostly on, a few seeded dips
          }
          b.style.opacity = o.toFixed(4);
        });
      },
    };
  },
});
