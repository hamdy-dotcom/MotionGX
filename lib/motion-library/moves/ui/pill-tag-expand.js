// Pill tag expands then fills with text: a small fully-round tag first appears as a blank bar growing from the reading
// edge (width 0 → full, power3.out, 0.3 s; from the right in Arabic), then its caps label fades in over 0.2 s. The fill
// is the look's accent (or `colour`) at 60% over the panel, the label the ink, so it reads on light and dark looks. A
// label target becomes the tag, keeping its words; alone it builds one tag.
// Source: prompt-motion gigabit "million claude…" (reference only, our own rebuild).
ML.define({
  id: "ui.pill-tag-expand",
  category: "ui",
  name: "Pill tag expands then fills with text",
  does: "A small rounded tag first appears as a blank bar, then its label fades in.",
  says: ["arrival", "list"],
  energy: 1,
  targets: ["label"],
  duration: [0.4, 0.8],
  params: {
    colour: { type: "text" },
    text: { type: "text" },
  },
  pairs: ["ui.chip-row-pop", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:gigabit-million-claude-opus-5-5-9-25-9-26-steam-60", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const target = el && el !== stage ? el : null;
    const mk = (css, parent, text) => { const e = doc.createElement("span"); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    let tag, wrap = null, fs;
    if (target) {
      tag = target;
      fs = Math.max(22 * k, parseFloat(getComputedStyle(target).fontSize) || 22);
    } else {
      const R = f.pic;
      wrap = doc.createElement("div");
      wrap.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;z-index:6;`;
      (ctx.scene || stage).append(wrap);
      fs = 34 * k;
      tag = doc.createElement("div");
      tag.className = "ml-label";
      wrap.append(tag);
    }
    const words = p.text || (target && target.textContent.trim()) || (rtl ? "جديد" : "New");
    tag.replaceChildren();
    tag.style.position = "relative"; tag.style.display = "inline-block"; tag.style.fontSize = `${fs.toFixed(1)}px`;
    tag.style.padding = `${(fs * 0.34).toFixed(1)}px ${(fs * 0.85).toFixed(1)}px`; tag.style.whiteSpace = "nowrap"; tag.style.flex = "none";
    const fill = p.colour || "var(--x-accent)";
    const bar = mk(`position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;border-radius:var(--x-radius-s);background:color-mix(in srgb, ${fill} 60%, var(--x-panel));`, tag);
    const label = mk("position:relative;color:var(--x-ink);", tag, words);
    const p3 = (x) => 1 - Math.pow(1 - x, 4);
    ctx.sfx(at, "tap", 0.18);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        bar.style.width = `${(p3(ML.lin(t, at, at + 0.3)) * 100).toFixed(2)}%`;
        bar.style.visibility = t < at ? "hidden" : "visible";
        label.style.opacity = ML.ease(t, at + 0.3, at + 0.5).toFixed(4);
        tag.style.opacity = (1 - leave).toFixed(4);
      },
    };
  },
});
