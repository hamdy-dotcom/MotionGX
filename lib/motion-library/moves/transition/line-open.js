// Line open: a glowing point shoots out into a thin line of light (like a scanner powering on). Anticipation first:
// the dot pops in and shrinks 1 -> 0.3 over 0.15 s (power2.in), or a ball flattens into the line (width x many,
// height -> 0.1 in 0.2 s power4.in); then the line — 1-2 px, linear-gradient(transparent -> colour -> transparent),
// a 12 px glow — grows from the point to `length` of the frame in 0.45 s (expo.out). Its end: it stays as a divider
// (under the headline), splits into two edges moving apart to frame the content (0.4 s), or a colour field grows out
// of it, 2 px -> the whole frame centred on the line over 0.35 s (power3.inOut) with soft 20 px blurred edges.
// Vertical runs the same along the other axis. Sizes are shares of the short side.
// Source: prompt-motion dale-vaz-claude-opus-5-5-is, kyonax-on-tech-yes-i-also-did, m1n9-k7-this-is-insane-opus
// (reference only: our own rebuild).
ML.define({
  id: "transition.line-open",
  category: "transition",
  name: "Line open",
  does: "A glowing point shoots out into a thin line of light, which then becomes a divider, splits into two edges that frame the content, or opens into a full colour field.",
  says: ["reveal", "arrival", "transition", "tech", "energy"],
  energy: 3,
  targets: ["stage", "scene", "shape"],
  duration: [0.5, 1.2],
  params: {
    from: { type: "choice", options: ["dot", "ball", "none"], default: "dot" },
    axis: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    end: { type: "choice", options: ["divider", "frame", "field"], default: "divider" },
    length: { type: "number", range: [0.2, 1], default: 0.4 },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.mask-rise", "transition.collapse-to-line"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:dale-vaz-claude-opus-5-5-is", license: "reference", note: "our own rebuild; also kyonax-on-tech-yes-i-also-did, m1n9-k7-this-is-insane-opus" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage;
    const c = String(p.colour || "accent").trim(), n = c.replace(/\s+/g, "-");
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|accent-ink|ink|dim|good|bad|panel|panel-2|ground|device)$/.test(n) ? `var(--x-${n})` : "var(--x-accent)";
    const vert = p.axis === "vertical";
    // where the point sits: the target's centre; a divider sits under the headline, a frame / field on its centre
    const isEl = ctx.el && ctx.el !== stage;
    const head = host.querySelector(".ml-title");
    let cx = W / 2, cy = H / 2, frameGap = 7.4 * v;
    if (isEl) { const b = ctx.box(ctx.el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; frameGap = Math.max(frameGap, (vert ? b.w : b.h) / 2 + 2.4 * v); }
    else if (head) {
      const b = ctx.box(head);
      cx = b.x + b.w / 2;
      // a divider sits under the whole headline block (title + sub), never through a line of text
      const blk = head.parentElement && head.parentElement.classList.contains("ml-head") ? [...head.parentElement.children] : [head];
      const bottom = Math.max(...blk.map((e) => { const r = ctx.box(e); return r.y + r.h; }));
      // in the clear space under the block: never on the edge of the content below it
      const below = host.querySelector(".ml-pic > *"), belowY = below ? ctx.box(below).y : Infinity;
      if (p.end === "divider") cy = vert ? cy : Math.min(H - f.m, bottom + 3.2 * v, belowY > bottom ? (bottom + belowY) / 2 : Infinity);
      else {
        // edges frame the words themselves (the block runs the whole column), and stay on the frame
        const rg = document.createRange(); rg.selectNodeContents(head);
        const textW = rg.getBoundingClientRect().width / (stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1);
        cy = b.y + b.h / 2;
        frameGap = vert ? Math.min(textW / 2 + 3.4 * v, Math.min(cx, W - cx) - 1.5 * v) : Math.max(frameGap, b.h / 2 + 2.4 * v);
      }
      // a vertical divider takes the gutter beside a side headline, else the reading-end margin: it never crosses content
      if (vert && p.end === "divider") cx = f.at === "side" ? f.head.x + f.head.w + 2.6 * v : ctx.rtl ? f.m / 2 : W - f.m / 2;
    }
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    host.append(layer);
    const mk = (css) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;" + css; layer.append(d); return d; };
    const thick = Math.max(2, 0.17 * v);
    const span = (vert ? H : W) * ML.clamp(p.length, 0.2, 1);
    const glow = `0 0 ${(1.1 * v).toFixed(1)}px color-mix(in srgb, ${col} 70%, transparent), 0 0 ${(0.35 * v).toFixed(1)}px ${col}`;
    const grad = `linear-gradient(${vert ? "180deg" : "90deg"}, transparent 0%, ${col} 22%, color-mix(in srgb, ${col} 60%, var(--x-accent-ink)) 50%, ${col} 78%, transparent 100%)`;
    // the colour field (under the lines), soft-edged across the line
    const soft = 1.85 * v;
    const field = mk(`background:${col};opacity:0;` + (vert ? `top:0;height:${H}px;` : `left:0;width:${W}px;`) +
      `-webkit-mask-image:linear-gradient(${vert ? "90deg" : "180deg"}, transparent 0, #000 ${soft}px, #000 calc(100% - ${soft}px), transparent 100%);mask-image:linear-gradient(${vert ? "90deg" : "180deg"}, transparent 0, #000 ${soft}px, #000 calc(100% - ${soft}px), transparent 100%)`);
    // two lines on top of each other: one stays, both split in "frame"
    const lineCss = (vert ? `width:${thick}px;height:${span}px;` : `height:${thick}px;width:${span}px;`) + `background:${grad};box-shadow:${glow};border-radius:${thick}px;opacity:0`;
    const lines = [mk(lineCss), mk(lineCss)];
    // the point: a dot or a ball
    const d0 = p.from === "ball" ? 3.4 * v : 1.6 * v;
    const dot = mk(`width:${d0}px;height:${d0}px;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, ${col} 40%, var(--x-accent-ink)) 0%, ${col} 60%);box-shadow:${glow};opacity:0`);
    // timings
    const pop = at + 0.1, aA = at + 0.15, aB = aA + (p.from === "ball" ? 0.2 : 0.15);
    const L0 = p.from === "none" ? at : aB - 0.02, L1 = L0 + 0.45;
    const E0 = L1 - 0.08, E1 = E0 + (p.end === "field" ? 0.35 : 0.4);
    const leave = Math.max(E1 + 0.2, end - 0.3);
    const p2in = (x) => x * x * x, p4in = (x) => x ** 5;
    const p3io = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
    if (p.from !== "none") ctx.sfx(at, "blip", 0.25);
    ctx.sfx(L0, "whoosh.soft", 0.3);
    if (p.end === "field") ctx.sfx(E0, "swell", 0.3);
    const place = (el, w, h, x, y, sx = 1) => {
      el.style.width = w.toFixed(2) + "px"; el.style.height = h.toFixed(2) + "px";
      el.style.transform = `translate(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px)` + (sx !== 1 ? ` scale${vert ? "Y" : "X"}(${sx.toFixed(4)})` : "");
    };
    return {
      draw(t) {
        // the point
        if (p.from === "none" || t < at) dot.style.opacity = "0";
        else {
          const in1 = ML.back(t, at, pop, 2);
          let w = d0, h = d0, o = Math.min(1, ML.lin(t, at, at + 0.05));
          if (p.from === "dot") { const s = 1 - 0.7 * p2in(ML.lin(t, aA, aB)); w = h = d0 * s * Math.max(0.01, in1); }
          else { const k = p4in(ML.lin(t, aA, aB)); w = d0 * Math.max(0.01, in1) * (1 + (span * 0.12 / d0) * k); h = Math.max(thick, d0 * Math.max(0.01, in1) * (1 - 0.9 * k)); if (vert) [w, h] = [h, w]; }
          o *= 1 - ML.lin(t, L0, L0 + 0.08);
          dot.style.opacity = o.toFixed(4);
          place(dot, w, h, cx, cy);
        }
        // the line grows from the point (both ways, so it reads the same in either direction)
        const g = ML.expo(t, L0, L1);
        const lo = (t >= L0 ? 1 : 0) * (1 - ML.ease(t, leave, leave + 0.3));
        const fieldU = p.end === "field" ? p3io(ML.lin(t, E0, E1)) : 0;
        const split = p.end === "frame" ? ML.out(t, E0, E1) * frameGap : 0;
        lines.forEach((ln, i) => {
          const off = (i === 0 ? -1 : 1) * split;
          ln.style.opacity = (lo * (p.end === "field" ? 1 - ML.lin(t, E1 - 0.1, E1) : 1)).toFixed(4);
          ln.style.transformOrigin = "50% 50%";
          const x = vert ? cx + off : cx, y = vert ? cy : cy + off;
          ln.style.transform = `translate(${(x - (vert ? thick : span) / 2).toFixed(2)}px, ${(y - (vert ? span : thick) / 2).toFixed(2)}px) scale${vert ? "Y" : "X"}(${Math.max(0.0001, g).toFixed(4)})`;
        });
        // the field: 2 px -> the whole frame, centred on the line
        if (p.end === "field" && t >= E0) {
          const full = 2 * (vert ? Math.max(cx, W - cx) : Math.max(cy, H - cy)) + 2 * soft;
          const s = thick + (full - thick) * fieldU;
          field.style.opacity = "1"; // the field is the next scene's ground: it holds
          if (vert) { field.style.width = s.toFixed(2) + "px"; field.style.transform = `translateX(${(cx - s / 2).toFixed(2)}px)`; }
          else { field.style.height = s.toFixed(2) + "px"; field.style.transform = `translateY(${(cy - s / 2).toFixed(2)}px)`; }
        } else field.style.opacity = "0";
      },
    };
  },
});
