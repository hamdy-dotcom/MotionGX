// Collapse to a line: a word, a ring or a shape squashes vertically into a thin accent line (scaleY 1 -> 0.02 with
// scaleX 1 -> 1.4 for a word, -> 6 for a ring, power4.in, colour shifting to the accent), a 1-2 px line of the same
// width fades in as the source goes, a short glow streak runs along it, then its width eases to `length` of the frame
// and it stays as the baseline for what comes next (or shrinks to a dot, or wipes off). Optional anticipation for the
// ring: a second concentric ring offset 4 px. Sizes are shares of the short side; the streak runs the reading way.
// Source: prompt-motion tolgayhickiran-motion-graphics-from-a, reflex-cloud-this-is-legit-insane (reference only:
// our own rebuild).
ML.define({
  id: "transition.collapse-to-line",
  category: "transition",
  name: "Collapse to a line",
  does: "A ring or a word squashes vertically into a thin accent line that stretches across the frame and stays as the baseline for what comes next.",
  says: ["transition", "change", "flow", "simplicity"],
  energy: 3,
  targets: ["word", "line", "shape", "scene"],
  duration: [0.4, 0.8],
  params: {
    from: { type: "choice", options: ["ring", "word", "shape"], default: "word" },
    to: { type: "choice", options: ["line", "dot"], default: "line" },
    length: { type: "number", range: [0.3, 1], default: 0.4 },
    end: { type: "choice", options: ["stay", "wipe-off"], default: "stay" },
    anticipate: { type: "bool", default: true },
  },
  pairs: ["text-in.rule-rise", "data.line-draw"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:tolgayhickiran-motion-graphics-from-a", license: "reference", note: "our own rebuild; also reflex-cloud-this-is-legit-insane" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage; // inside the scene: when the scene goes, its line goes with it
    const target = ctx.el && ctx.el !== stage ? ctx.el : null;
    const isText = (e) => !!e && !(e instanceof SVGElement) && !!e.textContent.trim();
    // what squashes: a word (the target, or with no target the scene's headline); a target that is itself a shape;
    // otherwise (below) a ring or a shape built for the move
    const src = p.from === "word" ? target || host.querySelector(".ml-title, .ml-hero") : target && !isText(target) ? target : null;
    // the words' own box, not their block's: a centred line in a wide block must not collapse to the block's width
    const inkBox = (e) => {
      if (!isText(e)) return ctx.box(e);
      const r = document.createRange(); r.selectNodeContents(e);
      const s = stage.getBoundingClientRect(), k = s.width / (stage.offsetWidth || 1) || 1, q = r.getBoundingClientRect();
      return q.width ? { x: (q.left - s.left) / k, y: (q.top - s.top) / k, w: q.width / k, h: q.height / k } : ctx.box(e);
    };
    // where it happens: the target's centre, else the frame's centre
    const b = src || target ? inkBox(src || target) : { x: W / 2, y: H / 2, w: 0, h: 0 };
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const srcBox = src ? ctx.box(src) : null;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden";
    host.append(layer);
    const mk = (css, x = 0, y = 0) => { const d = document.createElement("div"); d.style.cssText = `position:absolute;left:${x}px;top:${y}px;` + css; layer.append(d); return d; };
    // the source when it is not the word itself: a ring (r ~ 5.5 vmin) or a filled shape
    const r = 5.6 * v;
    let shape = null, echo = null;
    if (!src) {
      const ring = p.from === "ring" || p.from === "word";
      shape = mk(`width:${2 * r}px;height:${2 * r}px;border-radius:50%;box-sizing:border-box;` + (ring ? `border:${Math.max(2, 0.45 * v).toFixed(1)}px solid var(--x-ink);` : "background:var(--x-ink);border-radius:var(--x-radius);"), cx - r, cy - r); // placed by left / top: the scale below must not scale its position
      if (ring && p.anticipate) {
        const g = 0.37 * v; // ~4 px at 1080
        echo = mk(`width:${2 * (r + g)}px;height:${2 * (r + g)}px;border-radius:50%;box-sizing:border-box;border:${Math.max(1.5, 0.3 * v).toFixed(1)}px solid var(--x-accent)`, cx - r - g, cy - r - g);
      }
    }
    const srcColor = src ? getComputedStyle(src).color : "";
    const srcW = src ? b.w : 2 * r;
    const growX = Math.min(p.from === "word" ? 1.4 : 6, (W * 0.96) / Math.max(1, srcW)); // a word 1.4x, a ring 6x, never past the frame
    const lineH = Math.max(2, 0.26 * v);
    const line = mk(`height:${lineH.toFixed(1)}px;width:1px;background:var(--x-accent);border-radius:${lineH}px;box-shadow:0 0 ${(0.6 * v).toFixed(1)}px color-mix(in srgb, var(--x-accent) 60%, transparent);opacity:0;transform-origin:50% 50%`);
    const streak = mk(`height:${(lineH * 3).toFixed(1)}px;width:${(14 * v).toFixed(1)}px;background:linear-gradient(90deg, transparent, var(--x-accent-ink), transparent);filter:blur(${(0.55 * v).toFixed(1)}px);opacity:0`);
    // timings (s from at)
    const pre = !src && p.from === "ring" && p.anticipate ? 0.25 : 0;
    const sq = at + pre, sqEnd = sq + (src ? 0.3 : 0.35);
    const ln = sqEnd - 0.06, stA = sqEnd, stB = stA + 0.2, exA = sqEnd + 0.1, exB = exA + 0.3;
    const finalW = p.to === "dot" ? lineH * 3 : W * p.length;
    const wipeA = Math.max(exB + 0.3, end - 0.4), wipeB = wipeA + 0.3;
    const p4in = (x) => x ** 5, p3in = (x) => x ** 4;
    const dir = ctx.rtl ? -1 : 1;
    ctx.sfx(sq + 0.1, "whoosh.soft", 0.3);
    if (p.to === "dot") ctx.sfx(exB, "blip", 0.25);
    return {
      draw(t) {
        const s = (src ? p4in : p3in)(ML.lin(t, sq, sqEnd));
        const gone = ML.lin(t, sqEnd - 0.04, sqEnd);
        const sy = 1 - 0.98 * s, sx = 1 + (growX - 1) * s;
        if (src) {
          src.style.transformOrigin = `${(cx - srcBox.x).toFixed(1)}px ${(cy - srcBox.y).toFixed(1)}px`;
          src.style.scale = t < sq ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
          src.style.color = t < sq ? "" : `color-mix(in srgb, var(--x-accent) ${(s * 100).toFixed(1)}%, ${srcColor})`;
          src.style.opacity = (1 - gone).toFixed(4);
        }
        if (shape) {
          shape.style.scale = `${sx.toFixed(4)} ${sy.toFixed(4)}`;
          shape.style.borderColor = shape.style.background ? "" : `color-mix(in srgb, var(--x-accent) ${(s * 100).toFixed(1)}%, var(--x-ink))`;
          if (shape.style.background) shape.style.background = `color-mix(in srgb, var(--x-accent) ${(s * 100).toFixed(1)}%, var(--x-ink))`;
          shape.style.opacity = (1 - gone).toFixed(4);
        }
        if (echo) {
          const a = ML.out(t, at, at + pre);
          echo.style.opacity = (a * (1 - ML.lin(t, sq, sq + 0.12))).toFixed(4);
          echo.style.scale = (0.94 + 0.06 * a).toFixed(4);
        }
        // the line: the squashed width, then out to its final width; a dot shrinks to a point and grows round
        const lh = p.to === "dot" ? lineH + lineH * 2 * ML.out(t, exA, exB) : lineH;
        const w0 = srcW * growX;
        const ex = ML.out(t, exA, exB);
        let w = w0 + (finalW - w0) * ex;
        let lo = ML.lin(t, ln, sqEnd + 0.02);
        if (p.end === "wipe-off" && t > wipeA) {
          const wv = ML.ease(t, wipeA, wipeB);
          // wipe toward the reading end: the trailing edge catches up
          const keep = w * (1 - wv);
          const x0 = cx - w / 2 + (dir > 0 ? w - keep : 0);
          line.style.width = keep.toFixed(2) + "px";
          line.style.transform = `translate(${x0.toFixed(2)}px, ${(cy - lh / 2).toFixed(2)}px)`;
          lo *= wv < 1 ? 1 : 0;
        } else {
          line.style.width = w.toFixed(2) + "px";
          line.style.transform = `translate(${(cx - w / 2).toFixed(2)}px, ${(cy - lh / 2).toFixed(2)}px)`;
        }
        line.style.opacity = lo.toFixed(4);
        line.style.borderRadius = p.to === "dot" && ex > 0.9 ? "50%" : `${lineH}px`;
        line.style.height = lh.toFixed(2) + "px";
        // the glow streak along it, the reading way
        const sk = ML.lin(t, stA, stB);
        const sw = 14 * v, span = w0 + sw;
        const sxp = dir > 0 ? cx - span / 2 + span * sk - sw / 2 : cx + span / 2 - span * sk - sw / 2;
        streak.style.opacity = (sk > 0 && sk < 1 ? Math.sin(Math.PI * sk) : 0).toFixed(4);
        streak.style.transform = `translate(${sxp.toFixed(2)}px, ${(cy - lineH * 1.5).toFixed(2)}px)`;
      },
    };
  },
});
