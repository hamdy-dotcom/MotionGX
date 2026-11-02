// Implode to a point: everything on screen (badges, chips, dots, words, the panel they sit on) is pulled into one point
// — each piece tweens to it (scale -> 0.06, opacity -> 0) over 0.4 s power3.in, staggered 0.02 s by distance (nearest
// first), the headline scaling down first; optional spiral (each piece turns +40deg about the point while its radius
// goes to 0); the point squashes 1.1 on the merge. The point is the frame's centre, or an accent dot beside the headline
// (it pops 0 -> 60 px in 0.2 s back.out and the glyphs collapse into it). Then the point becomes the next thing:
//   iris   a 6 px glowing dot pulses, a disc grows 0 -> 1.5x the diagonal in 0.5 s expo.inOut with a lighter ring edge,
//          a second disc 0.12 s behind reveals the light ground of the next scene;
//   tile   a 10 px glowing square blooms to 90 px in 0.4 s back.out(1.2), radius 20 %, brief speed lines;
//   travel the 24 px dot shrinks to 10 px and slides to the next scene's chart origin (the safe area's lower start
//          corner) in 0.4 s expo.inOut;
//   fade   a 4 px dot with a breathing radial halo (r 200 px, 40 %) while the frame fades to black over 0.4 s;
//   cut    the dot shrinks 60 -> 0 in 0.15 s and the frame cuts.
// Pieces are the scene's leaves (text, pictures, svgs, chips); a panel's chrome is handed to an empty shell of the same
// box that implodes with them, so no piece is transformed twice. Colour is a look name or a --x- variable.
// Source: prompt-motion rammanq-wow-just-tried-this, leadnotifi-opus-5-5-i-made, agonaliu-opus-5-5-one-shotted-this,
// misbahsy-opus-5-5-is-incredible, macrohou-rip-motion-designers-absolutely, sudo-kiran-i-have-asked-opus (reference
// only: our own rebuild).
ML.define({
  id: "transition.implode-to-point",
  category: "transition",
  name: "Implode to a point",
  does: "Everything on screen is pulled into a single point, which then becomes the next thing: an expanding iris, a tile, a chart origin, or a fading glow.",
  says: ["simplicity", "connection", "transition", "change", "relief", "focus", "calm"],
  energy: 4,
  targets: ["scene", "logo", "shape", "headline", "line"],
  duration: [0.5, 1.4],
  params: {
    point: { type: "choice", options: ["centre", "beside-text"], default: "centre" },
    spiral: { type: "bool", default: false },
    end: { type: "choice", options: ["iris", "tile", "travel", "fade", "cut"], default: "iris" },
    glow: { type: "bool", default: true },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["transition.colour-field-cut", "data.chart-grow", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:rammanq-wow-just-tried-this", license: "reference", note: "with leadnotifi-opus-5-5-i-made, agonaliu-opus-5-5-one-shotted-this, misbahsy-opus-5-5-is-incredible, macrohou-rip-motion-designers-absolutely, sudo-kiran-i-have-asked-opus; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, rtl = !!ctx.rtl;
    const c = String(p.colour || "accent").trim();
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|accent-ink|ink|dim|good|bad|device)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const head = scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");

    // the pieces: leaves of the target (or of the whole scene); chrome-only containers become shells
    const root = own || scene;
    const leaves = [], shells = [];
    const hasText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const chrome = (e) => { const cs = getComputedStyle(e); return (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) > 0; };
    const walk = (e) => {
      if (e.nodeType !== 1 || e.dataset.mlLayer) return;
      const tag = e.tagName.toLowerCase();
      if (tag === "svg" || tag === "img" || tag === "canvas" || tag === "video" || hasText(e) || !e.children.length) { if (e.offsetWidth || e.getBoundingClientRect().width) leaves.push(e); return; }
      if (e !== root && chrome(e)) shells.push(e);
      for (const ch of e.children) walk(ch);
    };
    if (own && (hasText(own) || /^(svg|img|canvas)$/i.test(own.tagName))) leaves.push(own); else walk(root);
    if (!leaves.length) return null;

    // the layer above the scene: shells, the point, the ends
    const layer = document.createElement("div");
    layer.dataset.mlLayer = "1";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;visibility:hidden";
    stage.append(layer);
    // shells sit under the scene's own content (first in the scene), so the pieces stay on top of their panel
    const under = document.createElement("div");
    under.dataset.mlLayer = "1";
    under.style.cssText = "position:absolute;inset:0;pointer-events:none;visibility:hidden";
    scene.prepend(under);
    const shellEls = shells.map((e) => {
      const b = ctx.box(e), cs = getComputedStyle(e);
      const d = document.createElement("div");
      d.className = e.className;
      d.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;padding:0;margin:0;box-sizing:border-box;border-radius:${cs.borderRadius};transform-origin:50% 50%`;
      under.append(d);
      return { src: e, el: d, b };
    });

    // the point
    let P = { x: W / 2, y: H / 2 }, dotPop = 0;
    if (p.point === "beside-text" && head) {
      const r = document.createRange(); r.selectNodeContents(head);
      const rects = [...r.getClientRects()], last = rects[rects.length - 1] || head.getBoundingClientRect();
      const s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1;
      const lx = ((rtl ? last.left : last.right) - s.left) / kk, ly = (last.top + last.height * 0.55 - s.top) / kk;
      P = { x: ML.clamp(lx + (rtl ? -50 : 50) * k, 40 * k, W - 40 * k), y: ly };
      dotPop = 0.2;
    }
    const pieces = [...leaves.map((e) => ({ e, b: ctx.box(e), shell: false })), ...shellEls.map((s) => ({ e: s.el, b: s.b, shell: true }))].map((q) => {
      const cx = q.b.x + q.b.w / 2, cy = q.b.y + q.b.h / 2;
      return { ...q, cx, cy, dist: Math.hypot(cx - P.x, cy - P.y), head: q.e === head };
    });
    // nearest first, 0.02 s apart (capped so a busy scene still collapses in time); the headline goes first
    const order = [...pieces].sort((a, b) => a.dist - b.dist);
    const step = Math.min(0.02, 0.24 / Math.max(1, order.length - 1));
    order.forEach((q, i) => { q.delay = i * step; });
    pieces.forEach((q) => { if (q.head) q.delay = 0; });
    const t0 = at + dotPop, dur = 0.4;
    const tMerge = t0 + Math.max(...pieces.map((q) => q.delay + dur));
    const p3in = (x) => x * x * x;

    // the dot (the point itself) and the ends
    const glow = p.glow ? `0 0 ${18 * k}px ${4 * k}px color-mix(in srgb, ${col} 65%, transparent), 0 0 ${60 * k}px ${10 * k}px color-mix(in srgb, ${col} 30%, transparent)` : "none";
    const dot = document.createElement("div");
    dot.style.cssText = `position:absolute;left:0;top:0;border-radius:50%;background:${col};box-shadow:${glow}`;
    const R = Math.hypot(Math.max(P.x, W - P.x), Math.max(P.y, H - P.y));
    const discA = document.createElement("div"), discB = document.createElement("div");
    discA.style.cssText = `position:absolute;inset:0;background:${col};clip-path:circle(0px at ${P.x}px ${P.y}px)`;
    discB.style.cssText = `position:absolute;inset:0;background:var(--x-ground);background-image:var(--x-ground-image);clip-path:circle(0px at ${P.x}px ${P.y}px)`;
    const ringEl = document.createElement("div");
    ringEl.style.cssText = `position:absolute;left:0;top:0;border-radius:50%;border:${Math.max(2, 6 * k)}px solid color-mix(in srgb, ${col} 45%, var(--x-accent-ink));box-sizing:border-box`;
    const tile = document.createElement("div");
    tile.style.cssText = `position:absolute;left:0;top:0;background:${col};box-shadow:${glow}`;
    const lines = Array.from({ length: 8 }, (_, i) => { const l = document.createElement("div"); l.style.cssText = `position:absolute;left:0;top:0;height:${Math.max(2, 3 * k)}px;border-radius:2px;background:${col};transform-origin:0 50%`; l.dataset.i = i; return l; });
    const black = document.createElement("div");
    black.style.cssText = "position:absolute;inset:0;background:var(--x-device)";
    const halo = document.createElement("div");
    halo.style.cssText = `position:absolute;left:${P.x - 200 * k}px;top:${P.y - 200 * k}px;width:${400 * k}px;height:${400 * k}px;border-radius:50%;background:radial-gradient(circle, color-mix(in srgb, var(--x-accent-ink) 40%, transparent) 0%, transparent 70%)`;
    const parts = { iris: [discA, ringEl, discB], tile: [tile, ...lines], travel: [], fade: [black, halo], cut: [] };
    layer.append(...(parts[p.end] || []), dot);
    // travel: the next scene's chart origin — the safe area's lower start corner
    const T = { x: rtl ? f.safe.x + f.safe.w - 40 * k : f.safe.x + 40 * k, y: f.safe.y + f.safe.h - 40 * k };
    const diag = Math.hypot(W, H);

    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(tMerge, p.end === "tile" ? "pop" : p.end === "cut" ? "snap" : "pop.soft", 0.35);
    const place = (el, x, y, w, h) => { el.style.left = (x - w / 2).toFixed(2) + "px"; el.style.top = (y - h / 2).toFixed(2) + "px"; el.style.width = w.toFixed(2) + "px"; el.style.height = h.toFixed(2) + "px"; };
    const backOut = (t, a, b, c) => { const x = ML.lin(t, a, b) - 1; return x >= 0 ? 1 : 1 + (c + 1) * x * x * x + c * x * x; };

    return {
      draw(t) {
        const on = t >= at;
        // the pieces
        for (const q of pieces) {
          const e = q.e;
          if (!on) { if (!q.shell) { e.style.translate = ""; e.style.scale = ""; e.style.rotate = ""; e.style.opacity = ""; e.style.transformOrigin = ""; } continue; }
          const u = p3in(ML.lin(t, t0 + q.delay, t0 + q.delay + dur));
          const ang = p.spiral ? (40 * Math.PI / 180) * u * (rtl ? -1 : 1) : 0;
          const rx = (q.cx - P.x) * (1 - u), ry = (q.cy - P.y) * (1 - u);
          const nx = P.x + rx * Math.cos(ang) - ry * Math.sin(ang), ny = P.y + rx * Math.sin(ang) + ry * Math.cos(ang);
          e.style.transformOrigin = "50% 50%";
          e.style.translate = `${(nx - q.cx).toFixed(2)}px ${(ny - q.cy).toFixed(2)}px`;
          e.style.scale = (1 - 0.94 * u).toFixed(4);
          e.style.rotate = ang ? `${((ang * 180) / Math.PI).toFixed(2)}deg` : "";
          e.style.opacity = (1 - ML.clamp((u - 0.55) / 0.45)).toFixed(4);
        }
        // panel chrome hands over to its shell from the start
        for (const s of shellEls) {
          s.src.style.background = on ? "transparent" : "";
          s.src.style.boxShadow = on ? "none" : "";
          s.src.style.borderColor = on ? "transparent" : "";
        }
        layer.style.visibility = on ? "visible" : "hidden";
        under.style.visibility = on ? "visible" : "hidden";
        scene.style.visibility = "";
        if (!on) return;
        // the dot: pops beside the text first, grows as pieces arrive, squashes 1.1 on the merge
        let ds = 0;
        if (dotPop) ds = 60 * k * backOut(t, at, at + 0.2, 1.7);
        else ds = (6 + 18 * ML.lin(t, t0, tMerge)) * k;
        let sq = 1;
        if (t >= tMerge) sq = 1 + 0.1 * Math.sin(Math.PI * ML.lin(t, tMerge, tMerge + 0.12));
        let dx = P.x, dy = P.y, dw = ds * sq, dh = ds / sq, dO = 1;
        const e0 = tMerge + 0.12; // the end starts after the squash
        if (p.end === "iris") {
          const pulse = ML.pulse(t, e0 + 0.08, 0.06, 0.12);
          if (t >= tMerge) { const s0 = 6 * k * (1 + 0.6 * pulse); dw = s0 * sq; dh = s0 / sq; }
          const g0 = e0 + 0.2;
          const rA = 1.5 * diag * ML.ease(t, g0, g0 + 0.5) * ((t >= g0) ? 1 : 0), rB = 1.5 * diag * ML.ease(t, g0 + 0.12, g0 + 0.62) * ((t >= g0 + 0.12) ? 1 : 0);
          discA.style.clipPath = `circle(${rA.toFixed(2)}px at ${P.x}px ${P.y}px)`;
          discB.style.clipPath = `circle(${rB.toFixed(2)}px at ${P.x}px ${P.y}px)`;
          const rr = Math.max(0, rA - 2 * k);
          ringEl.style.visibility = rA > 1 && rB < R ? "visible" : "hidden";
          place(ringEl, P.x, P.y, 2 * rr, 2 * rr);
          if (rA > 12 * k) dO = 0;
          if (rB >= R) scene.style.visibility = "hidden";
        } else if (p.end === "tile") {
          const g = backOut(t, e0, e0 + 0.4, 1.2), sz = (10 + 80 * g) * k;
          tile.style.visibility = t >= tMerge ? "visible" : "hidden";
          place(tile, P.x, P.y, sz, sz);
          tile.style.borderRadius = (sz * 0.2).toFixed(2) + "px";
          if (t >= tMerge) dO = 0;
          const lp = ML.lin(t, e0, e0 + 0.3), lo = Math.sin(Math.PI * lp);
          lines.forEach((l, i) => {
            const a = (i / lines.length) * 360 + 22.5, r0 = sz * 0.6 + 40 * k * lp;
            l.style.visibility = lp > 0 && lp < 1 ? "visible" : "hidden";
            l.style.left = (P.x + Math.cos((a * Math.PI) / 180) * r0).toFixed(2) + "px";
            l.style.top = (P.y + Math.sin((a * Math.PI) / 180) * r0).toFixed(2) + "px";
            l.style.width = (36 * k * lo).toFixed(2) + "px";
            l.style.rotate = `${a}deg`;
            l.style.opacity = lo.toFixed(4);
          });
        } else if (p.end === "travel") {
          const m = ML.ease(t, e0, e0 + 0.4);
          if (t >= tMerge) { const s0 = (24 - 14 * m) * k; dw = s0 * sq; dh = s0 / sq; dx = P.x + (T.x - P.x) * m; dy = P.y + (T.y - P.y) * m; }
        } else if (p.end === "fade") {
          const fo = ML.lin(t, e0, e0 + 0.4);
          black.style.opacity = fo.toFixed(4);
          const br = 1 + 0.12 * Math.sin((t - e0) * Math.PI * 2 * 1.6);
          halo.style.opacity = t >= tMerge ? (0.9 * (t < e0 + 0.4 ? 1 : 1 - ML.lin(t, e0 + 0.4, e0 + 0.9))).toFixed(4) : "0";
          halo.style.scale = br.toFixed(4);
          if (t >= tMerge) { const s0 = 4 * k; dw = s0; dh = s0; dO = 1 - ML.lin(t, e0 + 0.4, e0 + 0.9); }
          if (fo >= 1) scene.style.visibility = "hidden";
        } else if (p.end === "cut") {
          if (t >= tMerge) { const s0 = 60 * k * (1 - ML.lin(t, e0, e0 + 0.15)); dw = s0; dh = s0; }
          if (t >= e0 + 0.15) scene.style.visibility = "hidden";
        }
        dot.style.visibility = dw > 0.3 && dO > 0.005 ? "visible" : "hidden";
        place(dot, dx, dy, dw, dh);
        dot.style.opacity = dO.toFixed(4);
      },
    };
  },
});
