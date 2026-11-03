// Gradient-border bracketed mount: the picture sits in a hairline gradient frame (a 1 px padding over a
// linear-gradient(to bottom right, line colour, transparent), radius 2 px) on the look's paper, with accent L-brackets
// offset just outside two (or four) corners. The picture settles from a slight overscale (settle_from → 1, opacity
// 0 → 0.9, 1 s ease-out — capped at its own pixels), then the brackets draw: each stroke grows out from its corner.
// The mount is the largest box of the asked aspect inside the target's own box (auto keeps the box), so the layout
// never moves. RTL mirrors the bracket corners.
// Source: MengTo/Skills web-design/dither-laser-dark-mode (MIT: the gradient-border mount, the L-bracket corners).
ML.define({
  id: "photo.bracket-mount",
  category: "photo",
  name: "Gradient-border bracketed mount",
  does: "A photo sits in a hairline gradient frame with accent L-brackets on its corners, settling from a slight overscale.",
  says: ["luxury", "precision", "trust"],
  energy: 2,
  targets: ["image"],
  duration: [1, 3],
  params: {
    brackets: { type: "choice", options: ["2", "4"], default: "2" },
    aspect: { type: "choice", options: ["auto", "4:5", "1:1", "3:4", "16:9"], default: "auto" },
    settle_from: { type: "number", range: [1, 1.08], default: 1.05 },
    bracket_size: { type: "number", range: [8, 20], default: 12, unit: "px" },
  },
  pairs: ["photo.card-focus-zoom", "text-in.punchline"],
  avoid: ["playful", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/dither-laser-dark-mode", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const W = el.offsetWidth, H = el.offsetHeight;
    if (!W || !H) return null;
    // the mount: the target's box, the frame of the asked aspect centred in it
    let fw = W, fh = H;
    if (p.aspect !== "auto") { const [a, b] = p.aspect.split(":").map(Number), r = a / b; if (W / H > r) { fh = H; fw = H * r; } else { fw = W; fh = W / r; } }
    const wrap = document.createElement("div");
    // the wrap takes the target's place, also when the pattern placed it absolutely
    const placed = cs.position === "absolute" || cs.position === "fixed" ? `position:${cs.position};left:${cs.left};top:${cs.top};z-index:${cs.zIndex}` : "position:relative";
    wrap.style.cssText = `${placed};width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;margin:${cs.margin};flex:none;justify-self:${cs.justifySelf};align-self:${cs.alignSelf}`;
    const frame = document.createElement("div");
    frame.style.cssText = `position:relative;width:${fw}px;height:${fh}px;padding:1px;box-sizing:border-box;border-radius:min(2px, var(--x-radius));background:linear-gradient(to bottom ${ctx.rtl ? "left" : "right"}, color-mix(in srgb, var(--x-ink) 38%, transparent), transparent)`;
    const inner = document.createElement("div");
    inner.style.cssText = `width:100%;height:100%;border-radius:min(1px, var(--x-radius));overflow:hidden;background:var(--x-panel)`;
    el.replaceWith(wrap); wrap.append(frame); frame.append(inner); inner.append(el);
    Object.assign(el.style, { position: "static", width: "100%", height: "100%", display: "block", objectFit: "cover", borderRadius: "0", margin: "0" });
    // the brackets: an L per corner, offset outside the frame, size relative to a 1080 film
    const kz = Math.max(1, Math.min(fw, fh) / 360), bs = p.bracket_size * 2.4 * kz, sw = Math.max(2, bs / 9), off = bs / 3 + sw;
    const corners = p.brackets === "4" ? ["tl", "tr", "br", "bl"] : ctx.rtl ? ["tr", "bl"] : ["tl", "br"];
    const NS = "http://www.w3.org/2000/svg";
    const marks = corners.map((c) => {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", bs); svg.setAttribute("height", bs); svg.setAttribute("viewBox", `0 0 ${bs} ${bs}`);
      svg.style.cssText = `position:absolute;overflow:visible;pointer-events:none;${c[0] === "t" ? "top" : "bottom"}:${-off}px;${c[1] === "l" ? "left" : "right"}:${-off}px`;
      const h = sw / 2, x0 = c[1] === "l" ? h : bs - h, y0 = c[0] === "t" ? h : bs - h, x1 = c[1] === "l" ? bs : 0, y1 = c[0] === "t" ? bs : 0;
      // two strokes leaving the corner, so the L grows out of it
      const mk = (d) => { const path = document.createElementNS(NS, "path"); path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", "var(--x-accent)"); path.setAttribute("stroke-width", sw); path.setAttribute("stroke-linecap", "square"); svg.append(path); return path; };
      const a = mk(`M${x0} ${y0} L${x1} ${y0}`), b = mk(`M${x0} ${y0} L${x0} ${y1}`);
      const len = Math.abs(x1 - x0);
      for (const s of [a, b]) { s.style.strokeDasharray = `${len} ${len}`; }
      frame.append(svg);
      return { svg, a, b, len };
    });
    // the settle, capped at the picture's own pixels
    const cap = el.naturalWidth ? Math.max(1, 1 / Math.max(fw / el.naturalWidth, fh / el.naturalHeight)) : p.settle_from;
    const s0 = Math.min(p.settle_from, cap), easeOut = ML.bezier(0, 0, 0.58, 1);
    // the settle, then the brackets; a short scene runs both quicker so the mount is whole before the cut
    const need = 0.85 + (corners.length - 1) * 0.08 + 0.4, k = Math.min(1, Math.max(0.4, end - at - 0.1) / need);
    const drawAt = at + 0.85 * k;
    ctx.sfx(drawAt, "tap", 0.22);
    return {
      draw(t) {
        const vis = t >= at - 1e-6;
        frame.style.visibility = vis ? "visible" : "hidden";
        frame.style.opacity = ML.lin(t, at, at + 0.4 * k).toFixed(4);
        const u = easeOut(ML.lin(t, at, at + k));
        el.style.opacity = (0.9 * ML.lin(t, at, at + 0.6 * k)).toFixed(4);
        const sc = s0 + (1 - s0) * u;
        el.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(5);
        marks.forEach((m, i) => {
          const q = ML.out(t, drawAt + i * 0.08 * k, drawAt + (i * 0.08 + 0.4) * k);
          m.svg.style.visibility = q > 0 ? "visible" : "hidden";
          const o = (m.len * (1 - q)).toFixed(3);
          m.a.style.strokeDashoffset = o; m.b.style.strokeDashoffset = o;
        });
      },
    };
  },
});
