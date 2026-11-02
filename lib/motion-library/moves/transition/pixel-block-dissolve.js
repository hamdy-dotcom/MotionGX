// Pixel block dissolve: the frame breaks into a grid of chunky blocks (`block` px on a 1080 short side: about 16 x 9
// on a wide frame at 120) and each block switches to the next scene instantly, stepped by frame (30 fps), in a seeded
// random, diagonal (from the reading side) or row order over 0.3 s. Blocks at the front jitter and smear sideways for
// a frame or two before they switch: a canvas paints them offset by a seeded few px with a trail of thin horizontal
// smear lines, some in the accent. The next scene is the next ground (--x-next-ground when the film sets it) with the
// chapter's title, clipped to the blocks that have switched.
// Source: prompt-motion ibrahimwasim240-opus-5-5-max-effort and rendesr-love-claude-opus-5-5 (reference only: our own
// rebuild).
ML.define({
  id: "transition.pixel-block-dissolve",
  category: "transition",
  name: "Pixel block dissolve",
  does: "The frame breaks into chunky pixel blocks that step over to the next scene in random or diagonal order.",
  says: ["transition", "tech", "playful", "energy"],
  energy: 4,
  targets: ["scene"],
  duration: [0.25, 0.5],
  params: {
    order: { type: "choice", options: ["random", "diagonal", "row"], default: "random" },
    block: { type: "number", range: [8, 120], default: 60, unit: "px" },
    jitter: { type: "bool", default: true },
  },
  pairs: ["transition.glitch-noise-burst", "text-in.scramble"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:ibrahimwasim240-opus-5-5-max-effort", license: "reference", note: "with prompt-motion rendesr-love-claude-opus-5-5; our own rebuild" },
  async setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const b = Math.max(6, Math.round(ML.clamp(+p.block || 60, 8, 120) * k));
    const cols = Math.ceil(W / b), rows = Math.ceil(H / b);
    const D = 0.3, FPS = 30;
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);

    // the next scene: the next ground with the chapter's title
    const inc = document.createElement("div");
    inc.setAttribute("aria-hidden", "true");
    inc.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;visibility:hidden;background:var(--x-next-ground, var(--x-ink));color:var(--x-next-ink, var(--x-ground))";
    host.append(inc);
    const head = host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    if (head) {
      const text = head.textContent.trim();
      try { const cs = getComputedStyle(head); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, text || "A"); } catch (e) { /* as is */ }
      const r = ctx.box(head);
      const title = document.createElement("div");
      title.className = head.className;
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.textContent = text;
      title.style.cssText = `position:absolute;left:${(r.x - hb.x).toFixed(1)}px;top:${(r.y - hb.y).toFixed(1)}px;width:${r.w.toFixed(1)}px;text-align:${getComputedStyle(head).textAlign}`;
      inc.append(title);
    }
    // each block's switch time, seeded
    const blocks = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, cc = ctx.rtl ? cols - 1 - c : c;
      let o;
      if (p.order === "diagonal") o = ML.clamp((cc + r) / Math.max(1, cols + rows - 2) * 0.88 + ML.rnd(i, 3) * 0.12);
      else if (p.order === "row") o = (r + cc / cols) / rows;
      else o = ML.rnd(i, 5);
      blocks.push({ x: c * b, y: r * b, at: at + o * D, i });
    }
    blocks.sort((a, z) => a.at - z.at);
    // the front: a canvas over both, blocks about to switch jitter and smear
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:7;pointer-events:none;visibility:hidden;image-rendering:pixelated`;
    host.append(cv);
    const g = cv.getContext("2d");
    const probe = document.createElement("div"); host.append(probe);
    const colour = (v) => { probe.style.color = v; return getComputedStyle(probe).color; };
    const cNext = colour("var(--x-next-ground, var(--x-ink))"), cAcc = colour("var(--x-accent)"), cAcc2 = colour("var(--x-accent-2)"), cGround = colour("var(--x-ground)");
    probe.remove();
    for (let j = 0; j < 4; j++) ctx.sfx(at + (j * D) / 3, "blip", 0.22);
    return {
      draw(t) {
        const on = t >= at;
        inc.style.visibility = on ? "visible" : "hidden";
        if (!on) { cv.style.visibility = "hidden"; return; }
        // stepped by frame
        const tq = at + Math.floor((t - at) * FPS + 1e-6) / FPS;
        const step = Math.floor((t - at) * FPS + 1e-6);
        const done = tq >= at + D;
        if (done) inc.style.clipPath = "none";
        else {
          let d = "";
          for (const bl of blocks) { if (bl.at > tq) break; d += `M${bl.x} ${bl.y}h${b}v${b}h${-b}Z`; }
          inc.style.clipPath = d ? `path("${d}")` : "inset(100%)";
        }
        g.clearRect(0, 0, W, H);
        let any = false;
        if (p.jitter && !done) {
          for (const bl of blocks) {
            const dt = bl.at - tq;
            if (dt < -1 / FPS || dt > 2 / FPS) continue; // the front: two frames ahead, one behind
            any = true;
            const s = ML.rnd(bl.i, 11 + step), dir = ML.rnd(bl.i, 13 + step) < 0.5 ? -1 : 1;
            const jx = Math.round(dir * (2 + s * 0.35 * b));
            const fill = s < 0.18 ? cAcc : s < 0.26 ? cAcc2 : dt < 0 ? cGround : cNext;
            g.globalAlpha = dt < 0 ? 0.55 : 1;
            g.fillStyle = fill;
            g.fillRect(bl.x + jx, bl.y, b, b);
            // a horizontal smear: thin lines trailing the block
            g.globalAlpha = 0.6;
            const lines = 2 + Math.floor(ML.rnd(bl.i, 17 + step) * 3);
            for (let l = 0; l < lines; l++) {
              const ly = bl.y + Math.floor(ML.rnd(bl.i * 7 + l, 19 + step) * b);
              const lh = Math.max(1, Math.round(b * (0.04 + 0.08 * ML.rnd(bl.i + l, 23))));
              const len = Math.round(b * (0.6 + 1.6 * ML.rnd(bl.i + l * 3, 29 + step)));
              g.fillRect(dir > 0 ? bl.x + jx - len : bl.x + jx + b, ly, len, lh);
            }
            g.globalAlpha = 1;
          }
        }
        cv.style.visibility = any ? "visible" : "hidden";
      },
    };
  },
});
