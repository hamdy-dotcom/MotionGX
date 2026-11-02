// Highlight sweep: a marker bar or solid box wipes in behind the key words, under the text. Shapes: a low marker (about
// 60 % of the cap height, set low, optionally with a rough end), a full marker (~1 em, radius 4 px) or a solid label
// box (padding 8 × 14 px, radius 4). Colour: any look colour at 40–100 %; translucent markers on light grounds
// multiply so the ink stays legible. The wipe grows from the reading edge (left in LTR, right in RTL) over 0.25–0.45 s
// power2.out, starting ~0.2 s after the words are ink (on their spoken word when the voice says them). Text: keep, or
// invert — a second copy of the text in the accent's ink, clipped to the box's current extent, so the colour flips
// exactly at the moving edge. Sequential: one keyword after another 0.25–0.9 s apart, optionally a new look colour
// each. Outline-then-fill: a 1.5 px outline draws round the word (dashoffset 0.3 s) with thin extended guide lines and
// tiny size labels at the corners, then fills solid in 0.15 s. Boxes follow line breaks (one bar per line). Holds.
// Source: prompt-motion thismacapital-la-video-a-ete, majorbaguette-opus-5-5-is-pretty, itisrazak-wtf-made-with-single,
// prasad-pilla-wtf-made-entirely-with, heyiammallik-i-asked-opus-5-5, kangaroohere-god-damnnn-made-with (reference) — our own.
ML.define({
  id: "text-emphasis.highlight-sweep",
  category: "text-emphasis",
  name: "Highlighter sweeps behind the key words",
  does: "A marker bar or solid box wipes in behind chosen words, optionally inverting their colour so they sit on it.",
  says: ["focus", "proof", "result", "precision", "list"],
  energy: 3,
  targets: ["word", "line", "label"],
  duration: [0.6, 4],
  params: {
    shape: { type: "choice", options: ["low-marker", "full-marker", "box"], default: "full-marker" },
    colour: { type: "text", default: "accent" },
    opacity: { type: "number", range: [0.4, 1], default: 1 },
    direction: { type: "choice", options: ["ltr", "rtl", "by-script"], default: "by-script" },
    text: { type: "choice", options: ["keep", "invert"], default: "keep" },
    mode: { type: "choice", options: ["wipe", "outline-then-fill"], default: "wipe" },
    sequence: { type: "choice", options: ["single", "sequential", "sequential-multicolour"], default: "single" },
    gap: { type: "number", range: [0.25, 0.9], default: 0.5, unit: "s" },
    wipe: { type: "number", range: [0.25, 0.5], default: 0.4, unit: "s" },
    edge: { type: "choice", options: ["clean", "rough"], default: "clean" },
    words: { type: "text", default: "" },
    pick: { type: "choice", options: ["all", "first", "last", "longest"], default: "all" },
    sync: { type: "choice", options: ["spoken", "at"], default: "spoken" },
  },
  pairs: ["text-in.punchline", "text-emphasis.corner-bracket-focus"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:thismacapital-la-video-a-ete", license: "reference", note: "our own rebuild; also majorbaguette, itisrazak, prasad-pilla, heyiammallik, kangaroohere" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const vname = (v, d) => { v = String(v || d).trim().replace(/^var\(--x-|\)$/g, "").replace(/^--x-|^x-/, ""); return VARS.includes(v) ? v : d; };
    const lum = (v) => {
      const pr = document.createElement("i"); pr.style.color = `var(--x-${v})`; pr.style.display = "none"; el.append(pr);
      const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove();
      const [r, g, b] = m.slice(0, 3).map((x) => +x / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const lightGround = lum("ground") > 0.5;
    const base = vname(p.colour, "accent");
    const palette = [base, ...["accent-2", "good", "accent", "bad"].filter((c) => c !== base)];
    // keep = ink over a translucent marker: a dark colour is held to 40 % so the words stay legible on it
    const opOf = (name) => (p.text === "keep" && lum(name) < 0.55 ? Math.min(p.opacity, 0.4) : p.opacity);
    const paint = (name) => { const o = opOf(name); return o >= 0.999 ? `var(--x-${name})` : `color-mix(in srgb, var(--x-${name}) ${(o * 100).toFixed(1)}%, transparent)`; };
    const inkOn = (name) => (name === "accent" ? "var(--x-accent-ink)" : lum(name) > 0.55 ? "var(--x-ink)" : "var(--x-panel)");
    const goRtl = p.direction === "rtl" || (p.direction === "by-script" && rtl);
    // which words: named ones, or a pick from the target's words
    const words = ML.split(el, "words");
    if (!words.length) return null;
    let chosen;
    const named = String(p.words || "").split(",").map((s) => ML.plain(s)).filter(Boolean);
    if (named.length) chosen = words.filter((w) => named.some((n) => ML.plain(w.textContent).includes(n)));
    if (!chosen || !chosen.length) {
      if (p.pick === "first") chosen = [words[0]];
      else if (p.pick === "last") chosen = [words[words.length - 1]];
      else if (p.pick === "longest") chosen = [words.reduce((a, b) => (ML.plain(b.textContent).length > ML.plain(a.textContent).length ? b : a))];
      else chosen = words;
    }
    // groups: one box run per group — sequential marks each word in turn, single marks consecutive runs together
    let groups = [];
    if (p.sequence === "single") { let run = []; words.forEach((w) => { if (chosen.includes(w)) run.push(w); else if (run.length) { groups.push(run); run = []; } }); if (run.length) groups.push(run); }
    else groups = chosen.map((w) => [w]);
    // geometry in el's own px (el positioned, the layer under its text)
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    const html0 = el.innerHTML;
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56, u = fs / 56;
    const rectsOf = (g) => {
      const rg = document.createRange(); rg.setStartBefore(g[0]); rg.setEndAfter(g[g.length - 1]);
      const lines = [];
      for (const r of rg.getClientRects()) {
        if (r.width < 1) continue;
        const x = (r.left - er.left) / k - el.clientLeft, y = (r.top - er.top) / k - el.clientTop, w = r.width / k, h = r.height / k;
        const same = lines.find((l) => Math.abs(l.y + l.h / 2 - (y + h / 2)) < h * 0.4);
        if (same) { const x1 = Math.max(same.x + same.w, x + w); same.x = Math.min(same.x, x); same.w = x1 - same.x; same.y = Math.min(same.y, y); same.h = Math.max(same.h, h); }
        else lines.push({ x, y, w, h });
      }
      return lines.sort((a, b) => a.y - b.y);
    };
    const shapeOf = (l) => {
      const H = l.h; // the content box: ~1.2–1.3 em
      if (p.shape === "low-marker") { const h = fs * 0.42 + 4 * u; return { x: l.x - fs * 0.04, y: l.y + H * 0.86 - h, w: l.w + fs * 0.08, h, r: 2 * u }; }
      if (p.shape === "box") return { x: l.x - 14 * u, y: l.y + (H - fs * 1.05) / 2 - 8 * u, w: l.w + 28 * u, h: fs * 1.05 + 16 * u, r: 4 * u };
      const h = fs * 1.0; return { x: l.x - fs * 0.08, y: l.y + (H - h) / 2 + fs * 0.04, w: l.w + fs * 0.16, h, r: 4 * u };
    };
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", zIndex: "-1", pointerEvents: "none", overflow: "visible" });
    if (opOf(base) < 0.999 && lightGround && p.text === "keep") layer.style.mixBlendMode = "multiply";
    el.append(layer);
    const NS = "http://www.w3.org/2000/svg";
    // timing: each group after its words are ink (their spoken word + 0.2 s), sequential groups at least `gap` apart
    const starts = [];
    groups.forEach((g, i) => {
      const said = p.sync === "spoken" ? ctx.word(g[0].textContent, at) : at;
      let s = Math.max(at + 0.2, said + 0.2);
      if (p.sequence !== "single" && i > 0) s = Math.max(s, starts[i - 1] + p.gap);
      else if (i > 0) s = Math.max(s, starts[i - 1] + 0.12);
      starts.push(s);
    });
    const outline = p.mode === "outline-then-fill";
    const boxes = groups.map((g, gi) => {
      const name = p.sequence === "sequential-multicolour" ? palette[gi % palette.length] : base;
      return rectsOf(g).map((l) => {
        const s = shapeOf(l);
        const d = document.createElement("div");
        Object.assign(d.style, { position: "absolute", left: s.x.toFixed(2) + "px", top: s.y.toFixed(2) + "px", width: s.w.toFixed(2) + "px", height: s.h.toFixed(2) + "px", background: paint(name), borderRadius: s.r.toFixed(2) + "px", transformOrigin: goRtl ? "100% 50%" : "0% 50%", transform: "scaleX(0)" });
        if (p.edge === "rough") {
          const pts = [];
          const n = 7, jag = Math.min(s.h * 0.35, 10 * u);
          for (let i = 0; i <= n; i++) { const y = (i / n) * 100, x = 100 - (ML.rnd(gi * 31 + i, 5) * jag * 100) / s.w; pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`); }
          const far = goRtl ? pts.map((q) => { const [x, y] = q.split(" "); return `${(100 - parseFloat(x)).toFixed(2)}% ${y}`; }) : pts;
          d.style.clipPath = goRtl ? `polygon(100% 0%, 100% 100%, ${far.reverse().join(", ")})` : `polygon(0% 0%, ${far.join(", ")}, 0% 100%)`;
        }
        layer.append(d);
        let svg = null, rect = null, guides = [], tags = [], perim = 0;
        if (outline) {
          svg = document.createElementNS(NS, "svg");
          const pad = fs * 0.6;
          Object.assign(svg.style, { position: "absolute", left: (s.x - pad).toFixed(2) + "px", top: (s.y - pad).toFixed(2) + "px", width: (s.w + pad * 2).toFixed(2) + "px", height: (s.h + pad * 2).toFixed(2) + "px", overflow: "visible", zIndex: "2" });
          svg.setAttribute("viewBox", `0 0 ${(s.w + pad * 2).toFixed(2)} ${(s.h + pad * 2).toFixed(2)}`);
          rect = document.createElementNS(NS, "rect");
          for (const [a, v] of [["x", pad], ["y", pad], ["width", s.w], ["height", s.h], ["rx", s.r]]) rect.setAttribute(a, v.toFixed(2));
          Object.assign(rect.style, { fill: "none", stroke: `var(--x-${name})`, strokeWidth: String(Math.max(1.5, 1.5 * u)) });
          perim = 2 * (s.w + s.h);
          rect.style.strokeDasharray = `${perim.toFixed(2)} ${perim.toFixed(2)}`;
          svg.append(rect);
          // guide lines running past the box's edges
          const ext = pad * 0.9;
          for (const [x1, y1, x2, y2] of [[pad - ext, pad, pad + s.w + ext, pad], [pad - ext, pad + s.h, pad + s.w + ext, pad + s.h], [pad, pad - ext, pad, pad + s.h + ext], [pad + s.w, pad - ext, pad + s.w, pad + s.h + ext]]) {
            const ln = document.createElementNS(NS, "line");
            for (const [a, v] of [["x1", x1], ["y1", y1], ["x2", x2], ["y2", y2]]) ln.setAttribute(a, v.toFixed(2));
            Object.assign(ln.style, { stroke: "var(--x-dim)", strokeWidth: "1", opacity: "0" });
            svg.append(ln); guides.push(ln);
          }
          for (const [txt, x, y, anchor] of [[`${Math.round(s.w)}`, pad + s.w / 2, pad - fs * 0.16, "middle"], [`${Math.round(s.h)}`, pad + s.w + fs * 0.14, pad + s.h / 2 + fs * 0.06, "start"]]) {
            const tx = document.createElementNS(NS, "text");
            tx.textContent = txt; tx.setAttribute("x", x.toFixed(2)); tx.setAttribute("y", y.toFixed(2)); tx.setAttribute("text-anchor", anchor);
            Object.assign(tx.style, { font: `var(--x-label-weight) ${Math.max(11, fs * 0.17).toFixed(1)}px var(--x-mono-font)`, fill: `var(--x-${name})`, opacity: "0", direction: "ltr" });
            svg.append(tx); tags.push(tx);
          }
          layer.append(svg);
        }
        return { d, s, name, svg, rect, guides, tags, perim };
      });
    });
    // invert: a second copy of the text on top in the box's ink, clipped to the boxes' current extent
    let inv = null;
    if (p.text === "invert") {
      inv = document.createElement("div");
      inv.innerHTML = html0;
      inv.querySelectorAll("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); });
      Object.assign(inv.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", padding: getComputedStyle(el).padding, boxSizing: "border-box", color: inkOn(base), pointerEvents: "none", zIndex: "1", clipPath: "inset(0 0 100% 0)" });
      inv.setAttribute("aria-hidden", "true");
      el.append(inv);
    }
    starts.forEach((s, i) => ctx.sfx(outline ? s + 0.3 : s, "whoosh.soft", 0.3));
    const p2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };
    const p3io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    return {
      draw(t) {
        const lv = ML.ease(t, end - 0.25, end - 0.05);
        layer.style.opacity = (1 - lv).toFixed(4);
        const clips = [];
        boxes.forEach((lines, gi) => {
          const s0 = starts[gi];
          // a group's lines wipe one after another, sharing the wipe time
          const per = p.wipe / lines.length;
          lines.forEach((b, li) => {
            let fill, wipeK;
            if (outline) {
              const o = p2(t, s0, s0 + 0.3);
              b.rect.style.strokeDashoffset = (b.perim * (1 - o)).toFixed(2);
              b.rect.style.opacity = o > 0 ? "1" : "0";
              const gk = ML.lin(t, s0 + 0.1, s0 + 0.35);
              b.guides.forEach((g) => (g.style.opacity = (0.55 * gk).toFixed(3)));
              b.tags.forEach((g) => (g.style.opacity = gk.toFixed(3)));
              fill = ML.lin(t, s0 + 0.32, s0 + 0.47); // fills solid
              wipeK = fill > 0 ? 1 : 0;
              b.d.style.transform = "none";
              b.d.style.opacity = fill.toFixed(4);
            } else {
              wipeK = (p.shape === "box" ? p3io : p2)(t, s0 + li * per, s0 + (li + 1) * per);
              b.d.style.transform = wipeK >= 1 ? "none" : `scaleX(${wipeK.toFixed(4)})`;
              b.d.style.opacity = "1";
              fill = wipeK;
            }
            if (inv && wipeK > 0) {
              const s = b.s, w = outline ? s.w * (fill > 0.5 ? 1 : 0) : s.w * wipeK, x = goRtl ? s.x + s.w - w : s.x;
              if (w > 0.5) clips.push(`M${x.toFixed(2)} ${s.y.toFixed(2)}h${w.toFixed(2)}v${s.h.toFixed(2)}h${(-w).toFixed(2)}Z`);
            }
          });
        });
        if (inv) { inv.style.clipPath = clips.length ? `path('${clips.join(" ")}')` : "inset(0 0 100% 0)"; inv.style.opacity = (1 - lv).toFixed(4); }
      },
    };
  },
});
