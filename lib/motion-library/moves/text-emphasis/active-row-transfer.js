// Active row transfer: in a list of records the focus walks from row to row. Inactive rows sit back (opacity .3, text
// muted toward the look's dim, the stamp — a row's last small element — at .25 with a 1 px blur); the active row is
// full ink, its thumb (a row's picture / icon) grows to `thumb-scale` with a slight shift toward the text, and the row
// itself scales to `scale` from its reading edge (origin left in LTR, right in RTL; the geometry under it unchanged).
// One timeline: a 0.5 s power2.inOut crossfade between rows, a reading hold of `hold` seconds on each. A 1 px rule runs
// along the list's reading edge (or under it when the rows sit side by side) with the active segment in the accent,
// sliding with the focus. Pictures never grow past their own pixels.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters/ARTICLE.md (MIT: the active-row treatment) — our code.
ML.define({
  id: "text-emphasis.active-row-transfer",
  category: "text-emphasis",
  name: "Focus moves down a list, row by row",
  does: "In a list of records the active row brightens and grows while the others fade back, then focus passes to the next row.",
  says: ["list", "focus", "step", "story"],
  energy: 2,
  targets: ["list", "card"],
  duration: [2, 10],
  params: {
    hold: { type: "number", range: [1, 2.5], default: 1.5, unit: "s" },
    scale: { type: "number", range: [1, 1.05], default: 1.02 },
    "thumb-scale": { type: "number", range: [1, 1.5], default: 1.35 },
    rule: { type: "bool", default: true },
    cross: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    dim: { type: "number", range: [0.2, 0.5], default: 0.3 },
    loop: { type: "bool", default: false },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md's active-row list; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const rows = [...el.children].filter((c) => c.offsetWidth > 0 && c.offsetHeight > 0 && !/^(SCRIPT|STYLE)$/.test(c.tagName));
    const n = rows.length;
    if (!n) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const eb = ctx.box(el);
    const boxes = rows.map((r) => { const b = ctx.box(r); return { x: b.x - eb.x, y: b.y - eb.y, w: b.w, h: b.h }; });
    // stacked (a column of records) or side by side
    const stacked = n < 2 || Math.abs(boxes[1].y - boxes[0].y) > Math.abs(boxes[1].x - boxes[0].x);
    const parts = rows.map((r) => {
      const thumb = r.querySelector("img, svg, picture, video, canvas, [data-thumb]");
      const kids = [...r.children].filter((c) => c !== thumb && !c.contains(thumb));
      const stamp = kids.length > 1 ? kids[kids.length - 1] : null;
      let tMax = p["thumb-scale"];
      if (thumb && thumb.tagName === "IMG" && thumb.naturalWidth) tMax = Math.min(tMax, Math.max(1, thumb.naturalWidth / (thumb.getBoundingClientRect().width || 1)));
      if (thumb) thumb.style.transformOrigin = rtl ? "100% 50%" : "0% 50%";
      return { thumb, stamp, tMax, base: r.style.color, tw: thumb ? thumb.getBoundingClientRect().width / (el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1) : 0 };
    });
    rows.forEach((r) => { r.style.transformOrigin = stacked ? (rtl ? "100% 50%" : "0% 50%") : "50% 100%"; });
    // the rule along the reading edge (column) or under the rows (side by side), its active segment in the accent
    let rule = null, seg = null;
    if (p.rule) {
      rule = document.createElement("div"); seg = document.createElement("div");
      const top = Math.min(...boxes.map((b) => b.y)), bot = Math.max(...boxes.map((b) => b.y + b.h));
      const left = Math.min(...boxes.map((b) => b.x)), right = Math.max(...boxes.map((b) => b.x + b.w));
      const gap = Math.max(6, (stacked ? 0.02 * eb.w : 0.1 * (bot - top)));
      if (stacked) Object.assign(rule.style, { left: (rtl ? right + gap : left - gap - 1).toFixed(2) + "px", top: top.toFixed(2) + "px", width: "1px", height: (bot - top).toFixed(2) + "px" });
      else Object.assign(rule.style, { left: left.toFixed(2) + "px", top: (bot + gap).toFixed(2) + "px", width: (right - left).toFixed(2) + "px", height: "1px" });
      Object.assign(rule.style, { position: "absolute", background: "var(--x-line)", pointerEvents: "none" });
      Object.assign(seg.style, { position: "absolute", background: "var(--x-accent)", left: "0", top: "0" });
      rule.append(seg); el.append(rule);
      rule.__o = { top, left };
    }
    // one timeline: row k active from on[k]; crossfade `cross` before each change
    const start = at + 0.1, period = p.hold + p.cross;
    const on = rows.map((_, k) => start + k * period);
    const total = n * period;
    for (let k = 1; k < n; k++) ctx.sfx(on[k], "tap", 0.18);
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    // focus position (a float row index) at t
    const focusAt = (t) => {
      let tt = t;
      if (p.loop && n > 1 && t > start + total - p.cross) tt = start + ((t - start) % total);
      let f = 0;
      for (let k = 1; k < n; k++) f += p2io(ML.lin(tt, on[k] - p.cross, on[k]));
      if (p.loop && n > 1 && tt > start + total - p.cross) f -= (n - 1) * p2io(ML.lin(tt, start + total - p.cross, start + total));
      return f;
    };
    return {
      draw(t) {
        const intro = ML.ease(t, at, start + 0.35), outro = ML.ease(t, end - 0.35, end - 0.05);
        const f = focusAt(t);
        rows.forEach((r, k) => {
          // 1 when this row is the focus, 0 when it is a whole row away; before the intro every row is plain
          const a = Math.max(0, 1 - Math.abs(f - k)) * intro * (1 - outro);
          const back = 1 - intro * (1 - outro); // all rows full before the walk starts and after it ends
          const o = p.dim + (1 - p.dim) * Math.max(a, back);
          r.style.opacity = o.toFixed(4);
          r.style.scale = a > 0.001 ? (1 + (p.scale - 1) * a).toFixed(4) : "none";
          const mk = 1 - Math.max(a, back);
          r.style.color = mk > 0.001 ? `color-mix(in srgb, var(--x-dim) ${(mk * 100).toFixed(1)}%, var(--x-ink))` : parts[k].base;
          const { thumb, stamp, tMax, tw } = parts[k];
          if (thumb) {
            const s = 1 + (tMax - 1) * a;
            thumb.style.scale = a > 0.001 ? s.toFixed(4) : "none";
            thumb.style.translate = a > 0.001 ? `${((rtl ? -1 : 1) * 0.06 * tw * a).toFixed(2)}px 0` : "none";
          }
          if (stamp) {
            const so = 0.25 + 0.75 * Math.max(a, back);
            stamp.style.opacity = Math.min(1, so / Math.max(o, 0.01)).toFixed(4);
            stamp.style.filter = 1 - Math.max(a, back) > 0.01 ? `blur(${(1 - Math.max(a, back)).toFixed(3)}px)` : "none";
          }
        });
        if (rule) {
          const o = ML.ease(t, at, at + 0.3) * (1 - outro);
          rule.style.opacity = o.toFixed(4);
          // the segment follows the focus between the row boxes
          const k0 = Math.max(0, Math.min(n - 1, Math.floor(f))), k1 = Math.min(n - 1, k0 + 1), u = f - k0;
          const b0 = boxes[k0], b1 = boxes[k1];
          if (stacked) {
            const y = b0.y + (b1.y - b0.y) * u - rule.__o.top, h = b0.h + (b1.h - b0.h) * u;
            Object.assign(seg.style, { top: y.toFixed(2) + "px", height: h.toFixed(2) + "px", width: "2px", left: "-0.5px", opacity: intro.toFixed(4) });
          } else {
            const x = b0.x + (b1.x - b0.x) * u - rule.__o.left, w = b0.w + (b1.w - b0.w) * u;
            Object.assign(seg.style, { left: x.toFixed(2) + "px", width: w.toFixed(2) + "px", height: "2px", top: "-0.5px", opacity: intro.toFixed(4) });
          }
        }
      },
    };
  },
});
