// Focus in: the whole block (no splitting, so any script is safe), or its lines / words in turn, resolves in place
// from a soft haze — blur → 0, opacity from 0 (or pale) → 1, a whisper of scale (1.03 → 1, or 0.96 → 1 from small)
// and an optional few px of drift, on cubic-bezier(0.22, 1, 0.36, 1). Options: a tint (pale accent → ink while it
// sharpens); an anaphora swap (the line, or just its second word, blurs out and the `next` text focuses in the same
// way); a glint (a small 4-point star turning 45° at the line's end after it lands); exit by blur-fade or hold.
// Source: prompt-motion focus-in family (justincooperman, majorbaguette, gonzalomacagno…) — our own rebuild.
ML.define({
  id: "text-in.focus-in",
  category: "text-in",
  name: "Focus in",
  does: "A whole headline or logo group resolves in place from a soft defocused haze into crisp type, with at most a whisper of scale or drift.",
  says: ["calm", "reveal", "arrival", "simplicity", "luxury", "story", "problem"],
  energy: 2,
  targets: ["headline", "line", "logo"],
  duration: [0.6, 3],
  params: {
    blur: { type: "number", range: [4, 20], default: 12, unit: "px" },
    from_opacity: { type: "number", range: [0, 0.3], default: 0 },
    scale: { type: "number", range: [0.96, 1.05], default: 1.03, unit: "x" },
    drift: { type: "number", range: [0, 8], default: 0, unit: "px" },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    split: { type: "choice", options: ["block", "lines", "words"], default: "block" },
    tint: { type: "bool", default: false },
    swap: { type: "choice", options: ["none", "whole", "second-word"], default: "none" },
    next: { type: "text", default: "" },
    glint: { type: "bool", default: false },
    exit: { type: "choice", options: ["blur-fade", "hold"], default: "blur-fade" },
  },
  pairs: ["background.vignette", "text-in.fade-up"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:justincooperman-opus-5-5-one-shotted-a", license: "reference", note: "our own rebuild of the focus-in family" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    el.style.position = "relative";
    // one wrapper holds the current statement, so a swap can blur it out while the next one focuses in
    // a drawn logo has no text: it focuses in as one block, without the text-only options
    const drawn = el instanceof SVGElement;
    const cur = document.createElement(drawn ? "span" : "div");
    if (drawn) { cur.style.display = "inline-block"; el.replaceWith(cur); cur.append(el); }
    else { while (el.firstChild) cur.append(el.firstChild); el.append(cur); }
    const split = drawn ? "block" : p.split;
    const needWords = !drawn && (split !== "block" || p.swap === "second-word");
    const words = needWords ? ML.split(cur, "words") : [];
    let units;
    if (split === "words") units = words.map((w) => [w]);
    else if (split === "lines") {
      const rows = [];
      for (const w of words) { const y = Math.round(ctx.box(w).y); const r = rows.find((x) => Math.abs(x.y - y) < 4); if (r) r.ws.push(w); else rows.push({ y, ws: [w] }); }
      units = rows.sort((a, b) => a.y - b.y).map((r) => r.ws);
    } else units = [[cur]];
    const step = split === "words" ? 0.1 : 0.13, D = p.duration;
    const unitNodes = new Set(units.flat());
    const times = units.map((_, i) => at + i * step);
    const landed = times[times.length - 1] + D;
    const eb = ctx.box(el);
    // the swap: the next statement laid over the whole line, or over the second word
    const doSwap = !drawn && p.swap !== "none" && String(p.next || "").trim() !== "" && (p.swap === "whole" || words.length > 1);
    let nx = null, swapAt = Infinity, swapOld = [];
    if (doSwap) {
      swapAt = Math.max(landed + 0.4, at + (end - at) * 0.5);
      nx = document.createElement("div");
      nx.textContent = p.next;
      if (p.swap === "whole") { Object.assign(nx.style, { position: "absolute", inset: "0", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "inherit" }); swapOld = [cur]; }
      else {
        const w = words[1], b = ctx.box(w);
        Object.assign(nx.style, { position: "absolute", top: (b.y - eb.y).toFixed(1) + "px", height: b.h.toFixed(1) + "px", lineHeight: b.h.toFixed(1) + "px", whiteSpace: "pre" });
        if (rtl) nx.style.right = (eb.x + eb.w - (b.x + b.w)).toFixed(1) + "px"; else nx.style.left = (b.x - eb.x).toFixed(1) + "px";
        swapOld = [w];
      }
      el.append(nx);
      if (p.swap === "second-word") ML.fit(nx, ctx.box(words[1]).w); // a longer word never runs over its neighbour
      ctx.sfx(swapAt + 0.3, "whoosh.soft", 0.2);
    }
    // the glint: a 4-point star at the end of the last line
    let star = null, glintAt = Infinity;
    if (p.glint && !drawn) {
      const r = document.createRange(); r.selectNodeContents(cur);
      const rects = [...r.getClientRects()], last = rects[rects.length - 1];
      if (last) {
        const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1, er = el.getBoundingClientRect();
        const size = Math.max(16, parseFloat(getComputedStyle(el).fontSize) * 0.28);
        const x = ((rtl ? last.left : last.right) - er.left) / k, y = (last.top - er.top) / k;
        star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        star.setAttribute("viewBox", "-10 -10 20 20");
        star.innerHTML = '<path d="M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10Z" fill="var(--x-accent)"/>';
        Object.assign(star.style, { position: "absolute", width: size + "px", height: size + "px", left: (x - size / 2 + (rtl ? -size * 0.3 : size * 0.3)).toFixed(1) + "px", top: (y - size * 0.1).toFixed(1) + "px", pointerEvents: "none", overflow: "visible" });
        el.append(star);
        glintAt = landed + 0.05;
        ctx.sfx(glintAt, "bell", 0.18);
      }
    }
    ctx.sfx(at, "swell", 0.22);
    const focus = (t, a) => ML.land(t, a, a + D);
    const set = (node, u, before) => {
      const o = p.from_opacity + (1 - p.from_opacity) * u;
      node.style.opacity = (before ? 0 : o).toFixed(4); // hidden before its time, even when it starts pale
      const b = (1 - u) * p.blur;
      node.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
      const s = p.scale + (1 - p.scale) * u;
      node.style.scale = Math.abs(s - 1) > 1e-4 ? s.toFixed(4) : "none";
      node.style.translate = p.drift ? `0 ${((1 - u) * p.drift).toFixed(2)}px` : "none";
      node.style.color = p.tint && u < 1 ? `color-mix(in srgb, var(--x-ink) ${(u * 100).toFixed(1)}%, var(--x-accent-2))` : "";
    };
    return {
      draw(t) {
        // exit
        const outAt = end - 0.5, q = p.exit === "blur-fade" ? ML.ease(t, outAt, outAt + 0.5) : 0;
        el.style.opacity = (1 - q).toFixed(4);
        el.style.filter = q > 0.005 ? `blur(${(q * 10).toFixed(2)}px)` : "none";
        units.forEach((ws, i) => { const u = focus(t, times[i]); for (const w of ws) set(w, u, t < times[i]); });
        // swap: old out (blur 0 → 10 + fade, 0.35 s), next in the same focus
        if (nx) {
          const o = ML.ease(t, swapAt, swapAt + 0.35);
          for (const w of swapOld) {
            if (o <= 0) { if (!unitNodes.has(w)) { w.style.opacity = "1"; w.style.filter = "none"; } continue; }
            w.style.opacity = (1 - o).toFixed(4);
            w.style.filter = `blur(${(o * 10).toFixed(2)}px)`;
          }
          const ts = swapAt + 0.3;
          set(nx, focus(t, ts), t < ts);
        }
        if (star) {
          const g = ML.lin(t, glintAt, glintAt + 0.4), s = Math.sin(g * Math.PI);
          star.style.opacity = g > 0 && g < 1 ? "1" : "0";
          star.style.transform = `scale(${s.toFixed(4)}) rotate(${(g * 45).toFixed(2)}deg)`;
        }
      },
    };
  },
});
