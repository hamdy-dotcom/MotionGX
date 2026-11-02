// Scatter exit: every card, sheet or block blows apart — each piece flies 300–1200 px (stage-relative, seeded) away
// from the cluster's centre (or all downward, or all toward the reading end) over 0.5–0.6 s power2.in, spinning
// 60–180° (±60° for flat paper), softening 0 -> 10 px (pictures never blur: they only fade) and shrinking to 0.7, with a
// 0.02 s seeded stagger. Stage flip: the ground tweens light -> dark (or dark -> light) over 0.4 s power2.inOut as the
// pieces blow out; pieces still on frame darken to silhouettes, hold 0.3 s, then fade; the next first word (`next`: the
// script's own word, never one the move makes up) lands on the new ground 0.15 s after the flip — the before / after
// hinge. The whole run compresses to fit when `end` leaves less room.
// Targets: the cards given (several), a list's items, or a scene's blocks (walked down to the boxes that have a face).
// Source: prompt-motion bizibeast-motion-designers-are-cooked + sudo-kiran-built-a-product-demo (reference only: our own rebuild).
ML.define({
  id: "transition.scatter-exit",
  category: "transition",
  name: "Scatter exit",
  does: "All the cards or sheets blow apart in different directions, spinning and blurring off frame (optionally while the stage flips dark).",
  says: ["transition", "relief", "change", "before-after"],
  energy: 4,
  targets: ["card", "list", "scene", "stage"],
  duration: [0.5, 1.2],
  params: {
    direction: { type: "choice", options: ["outward", "down", "one-side"], default: "outward" },
    stage_flip: { type: "choice", options: ["none", "light-to-dark", "dark-to-light"], default: "none" },
    material: { type: "choice", options: ["cards", "paper"], default: "cards" },
    distance: { type: "number", range: [300, 1200], default: 900, unit: "px" },
    next: { type: "text", default: "" },
  },
  pairs: ["transition.colour-field-cut", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:bizibeast-motion-designers-are-cooked", license: "reference", note: "our own rebuild; stage flip from sudo-kiran-built-a-product-demo" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const S = Math.min(f.W, f.H) / 1080;
    const dirX = ctx.rtl ? -1 : 1;
    // the pieces
    const face = (e) => { const cs = getComputedStyle(e); return (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || cs.backgroundImage !== "none" || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none"; };
    const leaf = (e) => !e.children.length || /^(IMG|SVG|VIDEO|CANVAS|PICTURE)$/i.test(e.tagName) || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const walk = (n, out) => { for (const c of n.children) { if (getComputedStyle(c).display === "none" || !c.offsetWidth) continue; if (face(c) || leaf(c)) out.push(c); else walk(c, out); } return out; };
    let pieces;
    const own = ctx.els.filter((e) => e && e !== stage && e !== scene);
    if (own.length > 1) pieces = own;
    else if (own.length === 1) pieces = own[0].children.length >= 2 ? [...own[0].children] : own;
    else {
      pieces = walk(scene, []);
      // too few: break the boxes open too (their contents fly on their own, like debris)
      if (pieces.length < 5) pieces = pieces.flatMap((e) => (face(e) && e.children.length >= 2 && !leaf(e) ? [e, ...walk(e, [])] : [e]));
    }
    // transforms do nothing on an inline box
    pieces.forEach((e) => { if (getComputedStyle(e).display === "inline") e.style.display = "inline-block"; });
    const boxes = pieces.map((e) => ctx.box(e));
    const cx = boxes.reduce((s, b) => s + b.x + b.w / 2, 0) / Math.max(1, boxes.length), cy = boxes.reduce((s, b) => s + b.y + b.h / 2, 0) / Math.max(1, boxes.length);
    const isPic = (e) => /^(IMG|VIDEO|CANVAS|PICTURE)$/i.test(e.tagName) || !!e.querySelector("img,video,canvas,picture");
    const order = pieces.map((_, i) => i).sort((a, b) => ML.rnd(a, 9) - ML.rnd(b, 9));
    const paper = p.material === "paper", flip = p.stage_flip !== "none";
    const q = Math.min(1, Math.max(0.2, end - at) / Math.max(0.6 + (pieces.length - 1) * 0.02, flip ? 0.95 : 0)); // the room it has
    const plan = pieces.map((e, i) => {
      const b = boxes[i];
      let dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy;
      const len = Math.hypot(dx, dy);
      if (len < 1) { const a = ML.rnd(i, 2) * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= len; dy /= len; }
      const dist = ML.clamp(p.distance, 300, 1200) * S * (0.7 + 0.6 * ML.rnd(i, 3));
      let vx, vy;
      if (p.direction === "down") { vx = dx * 0.35 * dist + (ML.rnd(i, 4) - 0.5) * 120 * S; vy = dist * (1.1 + 0.3 * ML.rnd(i, 5)); }
      else if (p.direction === "one-side") { vx = dirX * dist * (1.1 + 0.3 * ML.rnd(i, 5)); vy = dy * 0.35 * dist + (ML.rnd(i, 4) - 0.5) * 160 * S; }
      else { vx = dx * dist; vy = dy * dist; }
      const spin = (paper ? 20 + 40 * ML.rnd(i, 6) : 60 + 120 * ML.rnd(i, 6)) * (ML.rnd(i, 7) < 0.5 ? -1 : 1);
      const start = at + order.indexOf(i) * 0.02 * q, dur = (0.5 + 0.1 * ML.rnd(i, 8)) * q;
      return { e, vx, vy, spin, start, dur, pic: isPic(e), was: { translate: e.style.translate, rotate: e.style.rotate, scale: e.style.scale, filter: e.style.filter, opacity: e.style.opacity } };
    });
    // the flip and the hinge word
    let ground = null, word = null, words = [];
    const toDark = p.stage_flip === "light-to-dark";
    if (flip) {
      ground = document.createElement("div");
      ground.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${toDark ? "var(--x-device)" : "color-mix(in srgb, var(--x-accent-ink) 90%, var(--x-ground))"};opacity:0`;
      scene.insertBefore(ground, scene.firstChild);
    }
    const text = (p.next || "").trim();
    if (text) {
      word = document.createElement("div");
      const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-hero-size")) || 168, f.W * 0.16);
      word.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 ${f.m}px;pointer-events:none;z-index:6;font:var(--x-head-weight) ${fs.toFixed(1)}px/1.05 var(--x-head-font);letter-spacing:var(--x-hero-track);color:${flip ? (toDark ? "var(--x-accent-ink)" : "var(--x-device)") : "var(--x-ink)"}`;
      const line = document.createElement("div"); line.textContent = text; word.append(line); scene.append(word); words = ML.split(line, "words"); // a plain block: a flex parent would drop the spaces
    }
    const io2 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const flipEnd = at + 0.4 * q, last = Math.max(...plan.map((x) => x.start + x.dur), at + 0.6 * q);
    const wordAt = flip ? flipEnd + 0.15 * q : last + 0.1 * q;
    ctx.sfx(at, "whoosh.heavy", 0.45);
    if (text) ctx.sfx(wordAt, "hit", 0.3);
    return {
      draw(t) {
        const fl = flip ? io2(ML.lin(t, at, flipEnd)) : 0;
        if (ground) ground.style.opacity = fl.toFixed(4);
        const sil = flip ? 1 - ML.lin(t, flipEnd + 0.3 * q, flipEnd + 0.55 * q) : 1;
        for (const c of plan) {
          if (t < c.start) { const w = c.was; c.e.style.translate = w.translate; c.e.style.rotate = w.rotate; c.e.style.scale = w.scale; c.e.style.filter = w.filter; c.e.style.opacity = w.opacity; continue; }
          const x = ML.lin(t, c.start, c.start + c.dur), u = x * x * x; // power2.in
          c.e.style.translate = `${(c.vx * u).toFixed(2)}px ${(c.vy * u).toFixed(2)}px`;
          c.e.style.rotate = `${(c.spin * u).toFixed(2)}deg`;
          c.e.style.scale = (1 - 0.3 * u).toFixed(4);
          const fx = [];
          if (!c.pic && u > 0.002) fx.push(`blur(${(10 * u).toFixed(2)}px)`);
          if (fl > 0.002) fx.push(`brightness(${(1 - (toDark ? 0.8 : 0.5) * fl).toFixed(4)})`);
          c.e.style.filter = fx.length ? fx.join(" ") : "none";
          // on a flip the pieces stay as silhouettes until `sil` takes them; otherwise they go as they leave
          const gone = flip ? 1 : c.pic ? 1 - ML.lin(x, 0.5, 1) : 1 - ML.lin(x, 0.85, 1);
          c.e.style.opacity = (gone * sil).toFixed(4);
        }
        words.forEach((w, i) => { const v = ML.land(t, wordAt + i * 0.08, wordAt + 0.35 + i * 0.08); w.style.opacity = v.toFixed(4); w.style.translate = `0 ${((1 - v) * 40 * S).toFixed(2)}px`; w.style.filter = v < 1 ? `blur(${((1 - v) * 10).toFixed(2)}px)` : "none"; });
      },
    };
  },
});
