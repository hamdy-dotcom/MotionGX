// Slash wipe to dot: a slanted bar (a parallelogram, skew −15°, ≈60 px at 1080 or half an em, taller than the line)
// sweeps across the last word in reading order in 0.3 s; the word slides 60 px back against it and is clipped away
// right behind the slash, so it vanishes into it. Only its full stop stays (the word's own period, or one added in the
// mark colour); after a short rest it grows 1 -> 3 and travels to the centre of the frame (0.4 s power3.inOut) as the
// end mark — or becomes the brand's logo (end_mark "logo": the scene's logo lands where the dot arrives). The slash
// colour is a look variable ("white" = the look's panel); when it would vanish on the ground it falls back to the ink.
// RTL: the slash sweeps right to left, the word slides right, the dot sits at the word's left end.
// Source: prompt-motion heyiammallik-i-asked-opus-5-5 (reference only: our own rebuild).
ML.define({
  id: "transition.slash-wipe-to-dot",
  category: "transition",
  name: "Slash wipe to dot",
  does: "The last word slides out behind a diagonal slash, leaving only its full stop, which grows as the end mark.",
  says: ["result", "brand", "transition"],
  energy: 4,
  targets: ["word", "shape"],
  duration: [0.6, 1],
  params: {
    slash: { type: "text", default: "white" },
    end_mark: { type: "choice", options: ["dot", "logo"], default: "dot" },
    mark_colour: { type: "choice", options: ["accent", "bad", "ink", "accent-2"], default: "accent" },
    grow: { type: "number", range: [2, 4], default: 3 },
  },
  pairs: ["text-in.punchline", "transition.colour-field-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:heyiammallik-i-asked-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const el = ctx.el && ctx.el !== stage ? ctx.el : scene.querySelector(".ml-title");
    if (!el) return null;
    const rtl = !!ctx.rtl, dir = rtl ? -1 : 1, S = Math.min(f.W, f.H) / 1080;
    const fsz = parseFloat(getComputedStyle(el).fontSize) || 60;
    // the full stop: the word's own (hidden, our dot takes its place) or one just after the last letter
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let lastNode = null; for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim()) lastNode = n;
    let endRect = null, hadStop = false;
    if (lastNode) {
      const s = lastNode.textContent.replace(/\s+$/, ""), r = document.createRange();
      hadStop = /[.。]$/.test(s);
      r.setStart(lastNode, Math.max(0, s.length - 1)); r.setEnd(lastNode, s.length);
      const rects = r.getClientRects(); endRect = rects[rects.length - 1] || r.getBoundingClientRect();
      if (hadStop) { const span = document.createElement("span"); r.surroundContents(span); span.style.opacity = "0"; }
    }
    const sb = stage.getBoundingClientRect(), kz = sb.width / (stage.offsetWidth || 1) || 1;
    const eb = ctx.box(el);
    const lr = endRect ? { x: (endRect.left - sb.left) / kz, y: (endRect.top - sb.top) / kz, w: endRect.width / kz, h: endRect.height / kz } : { x: rtl ? eb.x : eb.x + eb.w, y: eb.y, w: 0, h: eb.h };
    const d = fsz * 0.2;
    const dotX0 = hadStop ? lr.x + lr.w / 2 : rtl ? lr.x - d * 0.9 : lr.x + lr.w + d * 0.9; // its centre
    const dotY0 = lr.y + lr.h * 0.78 - d / 2;
    // colours from the look, with a contrast fallback for the slash
    const probe = document.createElement("div"); scene.append(probe);
    const rgb = (c) => { probe.style.color = c; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return m.slice(0, 3).map(Number); };
    const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const named = { white: "--x-panel", panel: "--x-panel", ink: "--x-ink", black: "--x-ink", accent: "--x-accent", "accent-2": "--x-accent-2", red: "--x-bad", bad: "--x-bad", gold: "--x-light-2" };
    const sname = String(p.slash || "white").trim();
    let slashCol = sname.startsWith("--x-") ? `var(${sname})` : `var(${named[sname.toLowerCase()] || "--x-panel"})`;
    const groundCol = getComputedStyle(stage).backgroundColor;
    const g = rgb(groundCol);
    if (Math.abs(lum(rgb(slashCol)) - lum(g)) < 0.25) slashCol = "var(--x-ink)";
    probe.remove();
    const markCol = { accent: "var(--x-accent)", bad: "var(--x-bad)", ink: "var(--x-ink)", "accent-2": "var(--x-accent-2)" }[p.mark_colour] || "var(--x-accent)";
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6";
    scene.append(layer);
    const sw = Math.max(60 * S, fsz * 0.5), shh = eb.h * 1.3 + fsz * 0.2;
    const slash = document.createElement("div");
    slash.style.cssText = `position:absolute;left:0;top:${(eb.y + eb.h / 2 - shh / 2).toFixed(1)}px;width:${sw.toFixed(1)}px;height:${shh.toFixed(1)}px;background:${slashCol};transform-origin:50% 50%`;
    layer.append(slash);
    const dot = document.createElement("div");
    dot.style.cssText = `position:absolute;left:0;top:0;width:${d.toFixed(2)}px;height:${d.toFixed(2)}px;border-radius:50%;background:${markCol};transform-origin:50% 50%`;
    layer.append(dot);
    let logo = null;
    if (p.end_mark === "logo") {
      const src = scene.querySelector('[data-slot="logo"], [data-slot-sample="logo"], [data-logo]');
      if (src) {
        logo = src.cloneNode(true);
        logo.removeAttribute("data-slot"); logo.removeAttribute("data-slot-sample"); logo.removeAttribute("id");
        const sbx = ctx.box(src), lw = Math.min(f.W, f.H) * 0.34, lh = lw * (sbx.h / (sbx.w || 1));
        if (logo.tagName.toLowerCase() === "svg") { logo.setAttribute("width", String(lw)); logo.setAttribute("height", String(lh)); }
        logo.style.cssText += `;position:absolute;left:${(f.W / 2 - lw / 2).toFixed(1)}px;top:${(f.H / 2 - lh / 2).toFixed(1)}px;width:${lw.toFixed(1)}px;height:${lh.toFixed(1)}px;margin:0;transform-origin:50% 50%`;
        layer.append(logo);
      }
    }
    const wipeA = at, wipeB = at + 0.3, moveA = wipeB + 0.12, moveB = moveA + 0.4;
    const io2 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const io3 = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    // the slash travels from before the word's start to past its end (in reading order)
    const startEdge = rtl ? eb.x + eb.w + sw : eb.x - sw, endEdge = rtl ? Math.min(eb.x, dotX0 - d) - sw * 1.2 : Math.max(eb.x + eb.w, dotX0 + d) + sw * 1.2;
    const was = { clip: el.style.clipPath, tr: el.style.translate };
    const cx = f.W / 2, cy = f.H / 2;
    ctx.sfx(wipeA, "whoosh.soft", 0.4);
    ctx.sfx(moveB, logo ? "pop" : "pop.soft", 0.3);
    return {
      draw(t) {
        layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const u = io2(ML.lin(t, wipeA, wipeB));
        const sx = startEdge + (endEdge - startEdge) * u; // slash centre
        slash.style.transform = `translateX(${(sx - sw / 2).toFixed(2)}px) skewX(-15deg)`;
        slash.style.opacity = t < wipeA || u >= 1 ? "0" : (1 - ML.lin(u, 0.85, 1)).toFixed(4);
        // the word: slides back against the slash and is cut away behind it
        const tx = -dir * 60 * S * ML.out(t, wipeA, wipeB);
        if (t < wipeA) { el.style.clipPath = was.clip; el.style.translate = was.tr; }
        else {
          const cut = ML.clamp(((sx - (eb.x + tx)) / eb.w) * 100, 0, 100); // share of the word, from its left edge, behind the slash
          el.style.translate = `${tx.toFixed(2)}px 0`;
          el.style.clipPath = rtl ? `inset(-20% ${(100 - cut).toFixed(3)}% -20% 0)` : `inset(-20% 0 -20% ${cut.toFixed(3)}%)`;
        }
        // the dot: stays, then grows and travels to the centre
        const v = io3(ML.lin(t, moveA, moveB));
        const x = dotX0 + (cx - dotX0) * v, y = dotY0 + (cy - dotY0) * v, s = 1 + (p.grow - 1) * v;
        dot.style.transform = `translate(${(x - d / 2).toFixed(2)}px, ${(y - d / 2).toFixed(2)}px) scale(${s.toFixed(4)})`;
        if (logo) {
          const l = ML.back(t, moveB - 0.05, moveB + 0.35, 1.4), o = ML.lin(t, moveB - 0.05, moveB + 0.1);
          logo.style.opacity = o.toFixed(4);
          logo.style.transform = `scale(${Math.min(1, 0.3 + 0.7 * l).toFixed(4)})`;
          dot.style.opacity = (1 - ML.lin(t, moveB - 0.05, moveB + 0.12)).toFixed(4);
        } else dot.style.opacity = "1";
      },
    };
  },
});
