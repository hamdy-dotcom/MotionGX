// Stacked card deck: a small stack of square photo cards, offset like a deck, pops in tilted. `count` copies stacked
// back to front, card k (0 = front) offset k·offset_x across and k·offset_y down (scaled with the card, 200 px at
// 1080 as in the source), opacity 1 − k·.2; the front card is the hero picture, the ones behind other pictures of the
// scene or other crops of it. The group pops (from scale .8, rotation 8° → tilt) on the pop spring, and the cards fan
// out from one pile to their offsets just after, back cards last. RTL: the deck fans toward the left and the tilt
// mirrors. 2D only (no 3D), so nothing is ever scaled above 1.
// Source: MotionGX's own studio engine, lib/studio-engine/assets/scenes.js S.wall (the carousel stack + its pop).
ML.define({
  id: "photo.stack-fan",
  category: "photo",
  name: "Stacked card deck",
  does: "A small stack of square photo cards, offset like a deck, pops in tilted.",
  says: ["list", "choice"],
  energy: 2,
  targets: ["image", "card"],
  duration: [0.6, 2],
  params: {
    count: { type: "number", range: [2, 5], default: 3 },
    offset_x: { type: "number", range: [10, 40], default: 22, unit: "px" },
    offset_y: { type: "number", range: [6, 30], default: 14, unit: "px" },
    tilt: { type: "number", range: [0, 10], default: 4, unit: "deg" },
  },
  pairs: ["photo.settle-glint", "photo.record-swap-player", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card.fan",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.wall carousel stack (left k·22, top k·14, opacity 1 − k·.2) and pop(car, { from: .8, rot: 8, toRot: 4 })" },
  async setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const scene = ctx.scene || ctx.stage;
    const n = Math.round(ML.clamp(p.count, 2, 5));
    const tilt = ML.clamp(p.tilt, 0, 10) * (rtl ? -1 : 1);

    // where the deck sits: the target's own box (a wrapper takes a picture's place in the layout)
    const replaced = /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    const b = ctx.box(el);
    let host = el;
    if (replaced) {
      const cs = getComputedStyle(el);
      host = document.createElement("div");
      host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${b.w}px;height:${b.h}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};box-sizing:border-box`;
      el.parentNode.insertBefore(host, el);
      host.append(el);
      el.style.position = "absolute"; el.style.inset = "0"; el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0";
    } else if (getComputedStyle(el).position === "static") el.style.position = "relative";
    (replaced ? [el] : [...el.children]).forEach((x) => (x.style.visibility = "hidden"));

    // the pictures: the target's own, then the scene's others, else one painted from the look
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    const pics = [];
    for (const i of [own, ...scene.querySelectorAll("img")].filter(Boolean)) {
      let s = i.currentSrc || i.src;
      if (!s || pics.some((q) => q.from === s)) continue;
      const from = s, w = i.naturalWidth || 0, h = i.naturalHeight || 0;
      // a vector picture is rasterised once at its own size, so its copies never re-rasterise between two frames
      if (w && h && /^data:image\/svg|\.svg(\?|$)/i.test(s)) { try { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(i, 0, 0, w, h); s = c.toDataURL("image/png"); } catch (e) { /* keep the vector */ } }
      pics.push({ from, src: s, w, h });
    }
    if (!pics.length) {
      const probe = document.createElement("div"); host.append(probe);
      probe.style.cssText = "position:absolute;color:var(--x-accent);background-color:var(--x-accent-2)";
      const c1 = getComputedStyle(probe).color, c2 = getComputedStyle(probe).backgroundColor; probe.remove();
      const c = document.createElement("canvas"); c.width = c.height = 900;
      const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 900, 900); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.fillRect(0, 0, 900, 900);
      pics.push({ src: c.toDataURL("image/png"), w: 900, h: 900 });
    }

    // sizes: square cards that fit the box with the whole fan and the tilt's swing
    const bw = Math.max(60, b.w), bh = Math.max(60, b.h);
    let size = Math.min(bh * 0.8, bw * 0.8);
    let k = size / 200;
    const fit = () => { const ex = (n - 1) * p.offset_x * k, ey = (n - 1) * p.offset_y * k; return Math.max((size + ex) / (bw * 0.86), (size + ey) / (bh * 0.86)); };
    for (let i = 0; i < 4 && fit() > 1; i++) { size /= fit(); k = size / 200; }
    const ox = p.offset_x * k * (rtl ? -1 : 1), oy = p.offset_y * k;
    const extX = (n - 1) * Math.abs(ox), extY = (n - 1) * oy;

    const group = document.createElement("div");
    group.style.cssText = `position:absolute;left:${((bw - size - extX) / 2).toFixed(1)}px;top:${((bh - size - extY) / 2).toFixed(1)}px;width:${(size + extX).toFixed(1)}px;height:${(size + extY).toFixed(1)}px;transform-origin:50% 50%;pointer-events:none;will-change:transform;visibility:hidden`;
    host.append(group);
    const cards = [];
    for (let i = n - 1; i >= 0; i--) {
      const pic = pics[i % pics.length];
      const c = document.createElement("div");
      c.style.cssText = `position:absolute;${rtl ? "right" : "left"}:0;top:0;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;border-radius:min(var(--x-pic-radius), ${(size * 0.12).toFixed(1)}px);overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);box-sizing:border-box`;
      const im = document.createElement("img");
      im.decoding = "sync"; im.src = pic.src; im.alt = "";
      const pos = ["50% 50%", "15% 50%", "85% 50%", "35% 30%", "65% 70%"][i % 5];
      im.style.cssText = `display:block;width:100%;height:100%;object-fit:cover;object-position:${pos};filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      c.append(im);
      // behind the hero, the back cards dim toward the ground like the source's stack
      if (i > 0) { const veil = document.createElement("div"); veil.style.cssText = `position:absolute;inset:0;background:var(--x-ground);opacity:${(i * 0.08).toFixed(2)}`; c.append(veil); }
      group.append(c);
      cards[i] = c;
    }
    await Promise.all(cards.map((c) => c.querySelector("img").decode().catch(() => {})));

    const fanAt = at + 0.12;
    ctx.sfx(at, "card.fan", 0.4);

    return {
      draw(t) {
        if (t < at) { group.style.visibility = "hidden"; return; }
        group.style.visibility = "visible";
        // the pop: scale .8 → 1, rotation 8° → tilt, on the pop spring
        const s = ML.step(t - at, ML.SPRING.pop);
        const sc = Math.min(1, 0.8 + 0.2 * s); // never past 1
        const rot = (rtl ? -8 : 8) + (tilt - (rtl ? -8 : 8)) * s;
        group.style.opacity = ML.lin(t, at, at + 0.12).toFixed(4);
        group.style.transform = `rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
        // the fan: each card from the pile to its offset, front first
        for (let i = 0; i < n; i++) {
          const u = ML.out(t, fanAt + i * 0.05, fanAt + i * 0.05 + 0.45);
          const c = cards[i];
          c.style.translate = `${(i * ox * u).toFixed(2)}px ${(i * oy * u).toFixed(2)}px`;
          c.style.opacity = (1 - i * 0.2).toFixed(3);
        }
      },
    };
  },
});
