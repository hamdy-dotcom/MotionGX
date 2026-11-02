// Label-block headline slam: the headline is broken into `lines` solid label slabs, one line per slab — slab 1 the
// ink, slab 2 the accent, slab 3 the second accent — set in the ground colour, condensed bold caps (~6 % of the frame
// height, fitted), padding 0.15em 0.3em, with a hard offset shadow. Each slab slides in from x −110 % → 0 in 0.25 s
// (expo.out), the next `line_stagger` later; the text inside wipes on in reading direction via a clip just after its
// slab lands. A small boxed tag (hard shadow) attaches below. RTL slides from the right and wipes right → left.
// Source: prompt-motion:polydao-claude-opus-5-5-is (reference only — our own rebuild).
ML.define({
  id: "kinetic.label-block-headline-slam",
  category: "kinetic",
  name: "Label-block headline slam",
  does: "A headline lands as solid label slabs, one line per slab, each slab sliding in before its text wipes on.",
  says: ["energy", "urgency", "money", "focus"],
  energy: 4,
  targets: ["headline", "line"],
  duration: [1, 3],
  params: {
    lines: { type: "number", range: [1, 3], default: 2 },
    from: { type: "choice", options: ["left", "right"], default: "left" },
    line_stagger: { type: "number", range: [0.06, 0.2], default: 0.12, unit: "s" },
    tag: { type: "bool", default: true },
    tag_text: { type: "text", default: "" },
  },
  pairs: ["data.counter-roll", "background.halftone-glow"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:polydao-claude-opus-5-5-is", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const ar = ML.ARABIC.test(text);
    const words = text.split(" ");
    const n = Math.max(1, Math.min(3, Math.round(p.lines), words.length));
    // balanced lines by character count
    const total = text.length, lines = [];
    let cur = [];
    for (const w of words) {
      cur.push(w);
      const left = n - lines.length - 1;
      if (left > 0 && cur.join(" ").length >= total / n - 1 && words.length - words.indexOf(w) - 1 >= left) { lines.push(cur.join(" ")); cur = []; }
    }
    if (cur.length) lines.push(cur.join(" "));
    // where it slides from: RTL flips the side
    const fromLeft = (p.from === "left") !== !!rtl;
    const B = ctx.box(el);
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: f.m + "px", width: f.W - f.m * 2 + "px", top: "0", zIndex: "6", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: fromLeft !== !!rtl ? "flex-start" : "flex-end", gap: "0.12em", direction: rtl ? "rtl" : "ltr", visibility: "hidden" });
    const size0 = f.H * 0.06 * (f.wide ? 1.35 : 1);
    layer.style.fontSize = size0 + "px";
    const fills = ["var(--x-ink)", "var(--x-accent)", "var(--x-accent-2)"];
    const slabs = lines.map((l, i) => {
      const slab = doc.createElement("div");
      Object.assign(slab.style, { background: fills[i % 3], padding: "0.15em 0.3em", boxShadow: "0.09em 0.09em 0 color-mix(in srgb, var(--x-ink) 85%, transparent)", whiteSpace: "nowrap", lineHeight: "1.05" });
      const txt = doc.createElement("span");
      txt.textContent = l;
      Object.assign(txt.style, { display: "inline-block", font: `max(var(--x-head-weight), 800) 1em / 1.05 var(--x-head-font)`, fontStretch: "75%", letterSpacing: ar ? "0" : "-0.005em", textTransform: ar ? "none" : "uppercase", color: i % 3 === 0 ? "var(--x-ground)" : "var(--x-accent-ink)" });
      slab.append(txt);
      layer.append(slab);
      return { slab, txt };
    });
    let tag = null;
    if (p.tag) {
      const label = host.querySelector('[data-slot="label"]');
      const tx = p.tag_text || (label && label.textContent.trim()) || (ar ? "جديد" : "NEW");
      tag = doc.createElement("div");
      tag.textContent = tx;
      Object.assign(tag.style, { marginTop: "0.25em", fontSize: "0.42em", font: `700 ${(size0 * 0.42).toFixed(1)}px / 1.1 var(--x-label-font)`, letterSpacing: ar ? "0" : "var(--x-label-track)", textTransform: ar ? "none" : "var(--x-label-case)", color: "var(--x-ink)", background: "var(--x-panel)", border: `${Math.max(2, size0 * 0.035).toFixed(1)}px solid var(--x-ink)`, padding: "0.35em 0.6em", boxShadow: "0.18em 0.18em 0 var(--x-ink)", whiteSpace: "nowrap" });
      layer.append(tag);
    }
    host.append(layer);
    // fit the widest slab to the frame
    const room = f.W - f.m * 2 - size0 * 0.15;
    const widest = Math.max(...slabs.map((s) => s.slab.offsetWidth));
    const size = widest > room ? (size0 * room) / widest : size0;
    layer.style.fontSize = size.toFixed(2) + "px";
    if (tag) tag.style.fontSize = (size * 0.42).toFixed(2) + "px";
    const lh = layer.offsetHeight;
    const cy = Math.max(f.safe.y + lh / 2, Math.min(f.safe.y + f.safe.h - lh / 2, B.y + B.h / 2));
    layer.style.top = (cy - lh / 2).toFixed(2) + "px";
    const times = slabs.map((_, i) => at + i * p.line_stagger);
    times.forEach((tm, i) => ctx.sfx(tm, "whoosh.soft", 0.22 - i * 0.04));
    const tagAt = times[times.length - 1] + 0.3;
    if (tag) ctx.sfx(tagAt, "tap", 0.25);
    const dir = fromLeft ? -1 : 1, leave = end - 0.25;
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        el.style.opacity = on ? "0" : "";
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const gone = ML.ease(t, leave, leave + 0.22);
        layer.style.opacity = (1 - gone).toFixed(4);
        slabs.forEach((s, i) => {
          const u = ML.expo(t, times[i], times[i] + 0.25);
          s.slab.style.visibility = t >= times[i] ? "visible" : "hidden";
          s.slab.style.translate = `${(dir * (1 - u) * 110).toFixed(2)}% 0`;
          // the text wipes on in reading direction just after its slab
          const w = ML.out(t, times[i] + 0.12, times[i] + 0.34) * 100;
          const r = (100 - w).toFixed(2);
          s.txt.style.clipPath = rtl ? `inset(-10% 0 -10% ${r}%)` : `inset(-10% ${r}% -10% 0)`;
        });
        if (tag) {
          const u = ML.back(t, tagAt, tagAt + 0.25, 2);
          tag.style.visibility = t >= tagAt ? "visible" : "hidden";
          tag.style.translate = `0 ${((1 - Math.min(1, u)) * size * 0.4).toFixed(2)}px`;
          tag.style.opacity = ML.lin(t, tagAt, tagAt + 0.1).toFixed(4);
        }
      },
    };
  },
});
