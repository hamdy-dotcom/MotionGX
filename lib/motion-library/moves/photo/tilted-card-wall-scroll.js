// Tilted wall of cards: a rotated grid of many rounded screenshot / photo cards fills the frame and drifts diagonally
// without end. 3–7 columns of 16:10 cards (radius ~14 px at 1080, 12–16 px gaps, a subtle shadow); the whole grid is
// turned −8…−18° and built larger than the frame's rotated bounds, so its edges never show (instead of the source's
// scale 1.25, which would enlarge every picture). Columns scroll along the grid's own axis — which reads as diagonal
// on screen — each wrapping seamlessly (two periods of cards per column, offset mod one period, a brick phase per
// column); `alternate` runs neighbouring columns the other way at two thirds of the speed, else the whole wall drifts
// as one. The cards are the brand's own pictures (the target's, the scene's), each with its own crop, mixed with
// screen cards drawn from the look (panel, bars, accent). Exit "push-dark": the wall pushes 1 → 1.6 (capped so no
// picture passes its own pixels) and darkens to the look's device black over 0.6 s power2.in — the source's 10 px blur
// is left out, as pictures are never blurred. RTL: the tilt and the drift mirror. `fill`: the whole frame (over the
// scene) or only the target's box.
// Source: prompt-motion viktoroddy-opus-5-5-one-shoted-this (reference only — our own rebuild of the wall).
ML.define({
  id: "photo.tilted-card-wall-scroll",
  category: "photo",
  name: "Tilted wall of cards",
  does: "A rotated grid of many rounded screenshot or photo cards fills the frame and drifts diagonally without end.",
  says: ["scale", "proof", "choice"],
  energy: 3,
  targets: ["image", "screen", "stage"],
  duration: [2, 8],
  params: {
    angle: { type: "number", range: [-18, -8], default: -14, unit: "deg" },
    columns: { type: "number", range: [3, 7], default: 5 },
    alternate: { type: "bool", default: true },
    speed: { type: "number", range: [20, 80], default: 45, unit: "px/s" },
    exit: { type: "choice", options: ["push-dark", "none"], default: "push-dark" },
    fill: { type: "choice", options: ["frame", "target"], default: "frame" },
  },
  pairs: ["text-in.punchline", "camera.push-in", "transition.recede-fade"],
  avoid: ["calm", "simplicity"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:viktoroddy-opus-5-5-one-shoted-this", license: "reference", note: "the tilted scrolling card wall and its push exit, rebuilt as our own code; nothing copied" },
  async setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const C = Math.round(ML.clamp(p.columns, 3, 7));
    const theta = ML.clamp(p.angle, -18, -8) * (rtl ? -1 : 1);

    // ── the region the wall fills ──
    const toFrame = p.fill !== "target" || !el || el === stage || el === scene;
    let VW, VH, view;
    view = document.createElement("div");
    if (toFrame) {
      VW = f.W; VH = f.H;
      view.style.cssText = `position:absolute;left:0;top:0;width:${VW}px;height:${VH}px;overflow:hidden;z-index:5;pointer-events:none;background:var(--x-ground);background-image:var(--x-ground-image);visibility:hidden`;
      scene.append(view);
    } else {
      const b = ctx.box(el), cs = getComputedStyle(el);
      VW = Math.max(80, b.w); VH = Math.max(80, b.h);
      const host = document.createElement("div");
      host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${VW}px;height:${VH}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};box-sizing:border-box`;
      el.parentNode.insertBefore(host, el);
      host.append(el);
      el.style.position = "absolute"; el.style.inset = "0"; el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0"; el.style.visibility = "hidden";
      view.style.cssText = `position:absolute;inset:0;overflow:hidden;border-radius:${cs.borderRadius};pointer-events:none;visibility:hidden;background:var(--x-ground)`;
      host.append(view);
    }

    // ── the pictures: the target's own, then the scene's others ──
    const own = el && (el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img"));
    const pics = [];
    for (const i of [own, ...scene.querySelectorAll("img")].filter(Boolean)) {
      let s = i.currentSrc || i.src;
      if (!s || pics.some((q) => q.from === s)) continue;
      const from = s, w = i.naturalWidth || 0, h = i.naturalHeight || 0;
      // a vector picture is rasterised once at its own size, so its copies never re-rasterise between two frames
      if (w && h && /^data:image\/svg|\.svg(\?|$)/i.test(s)) { try { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(i, 0, 0, w, h); s = c.toDataURL("image/png"); } catch (e) { /* keep the vector */ } }
      pics.push({ from, src: s, w, h });
    }

    // ── the grid: larger than the region's rotated bounds ──
    const unit = Math.min(VW, VH) / 1080;
    const r = (Math.abs(theta) * Math.PI) / 180;
    const margin = 40 * unit + 20;
    const GW = VW * Math.cos(r) + VH * Math.sin(r) + 2 * margin, GH = VW * Math.sin(r) + VH * Math.cos(r) + 2 * margin;
    const g = ML.clamp(14 * unit * (VW < VH ? 1 : 1.1), 6, 16);
    const cw = (GW - (C - 1) * g) / C, ch = (cw * 10) / 16, step = ch + g;
    const rows = Math.ceil(GH / step) + 1, P = rows * step;
    const grid = document.createElement("div");
    grid.style.cssText = `position:absolute;left:${((VW - GW) / 2).toFixed(1)}px;top:${((VH - GH) / 2).toFixed(1)}px;width:${GW.toFixed(1)}px;height:${GH.toFixed(1)}px;transform:rotate(${theta}deg);transform-origin:50% 50%`;
    const push = document.createElement("div");
    push.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%;will-change:transform";
    push.append(grid);
    const dark = document.createElement("div");
    dark.style.cssText = "position:absolute;inset:0;background:var(--x-device);opacity:0";
    view.append(push, dark);

    const rad = `min(var(--x-radius), ${(14 * Math.max(unit, 0.6)).toFixed(1)}px)`;
    const shadow = "0 4px 16px -6px color-mix(in srgb, var(--x-ink) 28%, transparent)";
    // a screen card from the look: a bar, a heading line, body lines and a block in the accent
    const screenCard = (i) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;background:var(--x-panel);padding:${(ch * 0.1).toFixed(1)}px;box-sizing:border-box;display:flex;flex-direction:column;gap:${(ch * 0.07).toFixed(1)}px`;
      const bar = (w, h, bg, o = 1) => { const x = document.createElement("div"); x.style.cssText = `width:${w}%;height:${h.toFixed(1)}px;border-radius:999px;background:${bg};opacity:${o};flex:0 0 auto`; d.append(x); return x; };
      bar(18 + ML.rnd(i, 1) * 10, ch * 0.05, "var(--x-dim)", 0.35);
      bar(55 + ML.rnd(i, 2) * 30, ch * 0.1, "var(--x-ink)", 0.85);
      bar(70 + ML.rnd(i, 3) * 25, ch * 0.05, "var(--x-dim)", 0.4);
      bar(40 + ML.rnd(i, 4) * 30, ch * 0.05, "var(--x-dim)", 0.4);
      const blk = document.createElement("div");
      blk.style.cssText = `flex:1 1 auto;border-radius:${(ch * 0.05).toFixed(1)}px;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));opacity:${(0.55 + ML.rnd(i, 5) * 0.4).toFixed(2)}`;
      d.append(blk);
      if (ML.rnd(i, 6) > 0.5) d.style.flexDirection = "column-reverse";
      return d;
    };
    const cols = [], imgs = [];
    for (let c = 0; c < C; c++) {
      const col = document.createElement("div");
      col.style.cssText = `position:absolute;left:${(c * (cw + g)).toFixed(1)}px;top:0;width:${cw.toFixed(1)}px;height:${(2 * P).toFixed(1)}px`;
      for (let k = 0; k < 2 * rows; k++) {
        const id = c * 97 + (k % rows); // the second period repeats the first: a seamless wrap
        const card = document.createElement("div");
        card.style.cssText = `position:absolute;left:0;top:${(k * step).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px;border-radius:${rad};overflow:hidden;background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);box-shadow:${shadow};box-sizing:border-box`;
        const usePic = pics.length && ML.rnd(id, 9) > (pics.length > 1 ? 0.3 : 0.45);
        if (usePic) {
          const pic = pics[Math.floor(ML.rnd(id, 13) * pics.length) % pics.length];
          const im = document.createElement("img");
          im.decoding = "sync"; im.src = pic.src; im.alt = "";
          im.style.cssText = `display:block;width:100%;height:100%;object-fit:cover;object-position:${(ML.rnd(id, 15) * 100).toFixed(0)}% ${(ML.rnd(id, 17) * 100).toFixed(0)}%;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
          card.append(im); imgs.push(im);
        } else card.append(screenCard(id));
        col.append(card);
      }
      grid.append(col);
      cols.push({ el: col, dir: p.alternate && c % 2 ? -1 : 1, v: p.alternate && c % 2 ? 0.66 : 1, phase: (c * step * 0.47) % P });
    }
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));

    // the push never takes a picture past its own pixels
    const minNat = pics.length ? Math.min(...pics.map((q) => q.w || Infinity)) : Infinity;
    const pushMax = Math.max(1, Math.min(1.6, minNat / cw));
    const v = ML.clamp(p.speed, 20, 80) * Math.max(unit, 0.5) * (rtl ? -1 : 1);
    const inDur = Math.max(0.3, ctx.look.dur || 0.55);
    const exitA = p.exit === "push-dark" ? Math.max(at + inDur + 0.2, end - 0.6) : Infinity;
    if (p.exit === "push-dark" && exitA < end) ctx.sfx(exitA, "whoosh.soft", 0.3);
    const mod = (x, m) => ((x % m) + m) % m;

    return {
      draw(t) {
        if (t < at) { view.style.visibility = "hidden"; return; }
        view.style.visibility = "visible";
        view.style.opacity = ML.ease(t, at, at + inDur).toFixed(4);
        // the drift: every column wraps within one period (a pure function of t)
        for (const c of cols) {
          const y = -P + mod(c.phase + c.dir * c.v * v * t, P);
          c.el.style.transform = `translateY(${y.toFixed(2)}px)`;
        }
        // the exit: push and darken, power2.in
        const x = ML.lin(t, exitA, exitA + 0.6), e = x * x;
        push.style.transform = e > 0 ? `scale(${(1 + (pushMax - 1) * e).toFixed(4)})` : "none";
        dark.style.opacity = e.toFixed(4);
      },
    };
  },
});
