// Logo parts tumble into a stack: the wordmark fades first (0.2 s), then each bar of the mark rotates 90° (alternating
// direction) and travels to its place in a staggered pile (each one a step along and a step up: 8 / 14 at a 40 px bar,
// so relative to the bars), 0.35 s power3.in with a motion blur that grows with its speed, 0.05 s apart. "scatter" throws
// them to seeded spots instead; "fall-off" drops them out of the frame. The pile holds, then the whole logo leaves.
// The bars are the mark's own shapes when it has three or more; otherwise the mark is cut into vertical strips (each a
// clipped copy, so nothing is redrawn or enlarged). SVG lockups are handled in place; any other logo is cut as a whole.
// RTL: the pile leans the other way and the first bar to fall is the reading-start one.
// Source: prompt-motion "ajith-io-so-sad-motion-designers" (reference only — rebuilt as our own code).
ML.define({
  id: "element.logo-parts-tumble",
  category: "element",
  name: "Logo parts tumble into a stack",
  does: "The logo's bars fall over and pile into a staggered stack, blurring, as the logo leaves.",
  says: ["playful", "transition"],
  energy: 3,
  targets: ["logo", "shape"],
  duration: [0.6, 1.2],
  params: {
    end: { type: "choice", options: ["stack", "scatter", "fall-off"], default: "stack" },
    stagger: { type: "number", range: [0.03, 0.1], default: 0.05, unit: "s" },
    slices: { type: "number", range: [3, 8], default: 4 },
    hold: { type: "number", range: [0.1, 1], default: 0.3, unit: "s" },
  },
  pairs: ["element.logo-collapse-to-seed", "transition.slash-wipe-to-dot"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "prompt-motion:ajith-io-so-sad-motion-designers", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const st = ML.clamp(p.stagger, 0.03, 0.1), fallD = 0.35, wordD = 0.2;
    const nSl = Math.round(ML.clamp(p.slices, 3, 8));
    const dir = rtl ? -1 : 1;
    const isSvg = el.tagName.toLowerCase() === "svg";
    let texts = [], parts = []; // parts: { node, cx, cy, w, h, set(dx, dy, rot, blur, op) }

    if (isSvg) {
      el.style.overflow = "visible";
      texts = [...el.querySelectorAll("text")];
      const skip = ["text", "defs", "title", "desc", "style", "clippath", "mask", "lineargradient", "radialgradient", "filter", "symbol"];
      const shapes = [...el.children].filter((c) => !skip.includes(c.tagName.toLowerCase()));
      const bb = (n) => { try { return n.getBBox(); } catch (e) { return { x: 0, y: 0, width: 0, height: 0 }; } };
      const wrap = (node) => { const g = doc.createElementNS(NS, "g"); node.parentNode.insertBefore(g, node); g.append(node); return g; };
      const mkPart = (g, b) => ({
        node: g, cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height,
        set(dx, dy, rot, blur, op) {
          g.setAttribute("transform", `translate(${dx.toFixed(3)} ${dy.toFixed(3)}) rotate(${rot.toFixed(3)} ${this.cx.toFixed(3)} ${this.cy.toFixed(3)})`);
          g.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
          g.style.opacity = op.toFixed(4);
        },
      });
      if (shapes.length >= 3) parts = shapes.map((s) => mkPart(wrap(s), bb(s)));
      else if (shapes.length) {
        // one or two shapes: cut the mark into vertical strips (clipped copies of the whole mark)
        const src = doc.createElementNS(NS, "g");
        shapes[0].parentNode.insertBefore(src, shapes[0]);
        shapes.forEach((s) => src.append(s));
        const B = bb(src), sw = B.width / nSl;
        const uid = `ml-tumble-${Math.round(ctx.box(el).x)}-${Math.round(ctx.box(el).y)}`;
        for (let i = 0; i < nSl; i++) {
          const cp = doc.createElementNS(NS, "clipPath"); cp.setAttribute("id", `${uid}-${i}`);
          const r = doc.createElementNS(NS, "rect");
          r.setAttribute("x", (B.x + i * sw - 0.15).toFixed(3)); r.setAttribute("y", (B.y - 1).toFixed(3));
          r.setAttribute("width", (sw + 0.3).toFixed(3)); r.setAttribute("height", (B.height + 2).toFixed(3));
          cp.append(r); el.append(cp);
          const outer = doc.createElementNS(NS, "g"), inner = doc.createElementNS(NS, "g");
          inner.setAttribute("clip-path", `url(#${uid}-${i})`);
          inner.append(src.cloneNode(true)); outer.append(inner);
          el.insertBefore(outer, src);
          parts.push(mkPart(outer, { x: B.x + i * sw, y: B.y, width: sw, height: B.height }));
        }
        src.style.display = "none";
      }
    } else {
      // any other logo: strips of the whole element, laid over it (clipped clones), the element itself hidden while they move
      const S = ctx.box(el);
      const sw = S.w / nSl;
      for (let i = 0; i < nSl; i++) {
        const c = el.cloneNode(true);
        c.removeAttribute("data-slot");
        c.style.cssText += `;position:absolute;left:${S.x}px;top:${S.y}px;width:${S.w}px;height:${S.h}px;margin:0;box-sizing:border-box;pointer-events:none;z-index:6;visibility:hidden;` +
          `clip-path:inset(0 ${(100 - ((i + 1) * 100) / nSl).toFixed(3)}% 0 ${((i * 100) / nSl).toFixed(3)}%);transform-origin:${(((i + 0.5) * 100) / nSl).toFixed(3)}% 50%;`;
        host.append(c);
        parts.push({
          node: c, cx: S.x + (i + 0.5) * sw, cy: S.y + S.h / 2, w: sw, h: S.h, html: true,
          set(dx, dy, rot, blur, op) {
            c.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
            c.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
            c.style.opacity = op.toFixed(4);
          },
        });
      }
    }
    if (!parts.length) return null;

    // order: the reading-start bar falls first
    parts.sort((a, b) => (a.cx - b.cx) * dir);
    const n = parts.length;
    const minX = Math.min(...parts.map((q) => q.cx - q.w / 2)), maxX = Math.max(...parts.map((q) => q.cx + q.w / 2));
    const bottom = Math.max(...parts.map((q) => q.cy + q.h / 2)), midX = (minX + maxX) / 2, spanH = bottom - Math.min(...parts.map((q) => q.cy - q.h / 2));
    // each part's end pose
    let pile = 0;
    parts.forEach((q, i) => {
      const sign = i % 2 ? -1 : 1;
      const thick = q.w, len = q.h; // after a 90° turn its height is its old width
      if (p.end === "scatter") {
        q.rot = sign * (90 + ML.rnd(i, 3) * 80);
        q.tx = midX + (ML.rnd(i, 7) - 0.5) * (maxX - minX) * 2.4 - q.cx;
        q.ty = bottom + ML.rnd(i, 11) * spanH * 0.6 - thick / 2 - q.cy;
      } else if (p.end === "fall-off") {
        q.rot = sign * 90;
        q.tx = (ML.rnd(i, 5) - 0.5) * thick * 2;
        q.ty = spanH * 4 + ML.rnd(i, 9) * spanH;
      } else {
        const stepY = Math.min(thick, len) * 1.12, stepX = stepY * 0.57;
        q.rot = sign * 90;
        q.tx = midX + (i - (n - 1) / 2) * stepX * dir - q.cx;
        q.ty = bottom - thick / 2 - pile - q.cy;
        pile += stepY;
      }
      q.start = at + wordD * 0.5 + i * st;
    });
    // the html strips scale stage px; the svg moves in its own units (which already map to the drawing)
    const lastLand = parts[n - 1].start + fallD;
    const leave = p.end === "fall-off" ? lastLand : Math.max(lastLand + ML.clamp(p.hold, 0.1, 1), end - 0.25);
    ctx.sfx(at, "whoosh.soft", 0.2);
    parts.forEach((q, i) => (i % 2 === 0 || i === n - 1) && ctx.sfx(q.start + fallD, p.end === "fall-off" ? "whoosh.soft" : "land.light", 0.22));
    const isHtml = !isSvg;

    return {
      draw(t) {
        const wq = ML.ease(t, at, at + wordD);
        texts.forEach((x) => (x.style.opacity = (1 - wq).toFixed(4)));
        const gone = ML.ease(t, leave, leave + 0.25);
        if (isHtml) el.style.visibility = t >= parts[0].start - 1e-6 ? "hidden" : "";
        else el.style.opacity = (1 - gone).toFixed(4);
        parts.forEach((q) => {
          if (isHtml) q.node.style.visibility = t >= q.start - 1e-6 && gone < 1 ? "visible" : "hidden";
          const x = ML.lin(t, q.start, q.start + fallD), k = x * x * x; // power3.in
          const blur = x > 0 && x < 1 ? 6 * x * x : 0; // motion blur ∝ speed
          const fade = p.end === "fall-off" ? 1 - ML.lin(t, q.start + fallD * 0.5, q.start + fallD) : 1;
          q.set(q.tx * k, q.ty * k, q.rot * k, blur, fade * (isHtml ? 1 - gone : 1));
        });
      },
    };
  },
});
