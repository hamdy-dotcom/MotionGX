// Triptych distribute: a central portrait appears first; side photos slide out from behind it into a slightly rotated
// three-up (or five-up). The centre polaroid mount (190 × 250 at 1080, scaled to the box) scales .9 → 1 and fades in
// over 0.6 s power3.out. The side plates start stacked behind it (x 0, rotate 0, scale .9, below it), then travel to
// x ∓spread, y +20, rotate −¾·rotation / +rotation, scale .85 over 0.8 s power3.inOut, 0.1 s apart; with five plates
// the outer pair goes to ∓1.8·spread, y +36, rotation ×1.6, scale .72, under the inner pair. Everything is measured
// from the layout: spread and mount shrink to fit the box, and a box taller than it is wide stacks the plates
// vertically (y offsets) instead. RTL: the right-hand plate leaves first and the rotations mirror. 2D only, every
// plate at scale ≤ 1.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md (the chapter triptych), rebuilt (MIT).
ML.define({
  id: "photo.triptych-distribute",
  category: "photo",
  name: "Triptych distribute",
  does: "A central portrait appears first; side photos slide out from behind it into a slightly rotated three-up.",
  says: ["story", "proof", "reveal"],
  energy: 3,
  targets: ["image"],
  duration: [1.2, 3],
  params: {
    plates: { type: "choice", options: ["3", "5"], default: "3" },
    spread: { type: "number", range: [120, 300], default: 210, unit: "px" },
    rotation: { type: "number", range: [0, 8], default: 4, unit: "deg" },
  },
  pairs: ["photo.record-swap-player", "photo.settle-glint", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md chapter triptych (centre mount first, side plates out from behind it) rebuilt as a function of t" },
  async setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const scene = ctx.scene || ctx.stage;
    const five = String(p.plates) === "5";
    const R = ML.clamp(p.rotation, 0, 8);

    // where the triptych sits: the target's own box (a wrapper takes a picture's place in the layout)
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
      const c = document.createElement("canvas"); c.width = 760; c.height = 1000;
      const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 760, 1000); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.fillRect(0, 0, 760, 1000);
      pics.push({ src: c.toDataURL("image/png"), w: 760, h: 1000 });
    }

    // ── measure: axis, mount size, spread — all fitted to the box ──
    const bw = Math.max(80, b.w), bh = Math.max(80, b.h);
    const vertical = bh > bw * 1.15;
    const rings = five ? 2 : 1;
    const outerReach = five ? 1.8 : 1, outerScale = five ? 0.72 : 0.85;
    const ASP = 190 / 250;
    let mh = vertical ? Math.min(bw * 0.8 / ASP, bh * 0.5) : bh * 0.86;
    let mw = mh * ASP, kk = mh / 250, S = p.spread * kk;
    for (let i = 0; i < 6; i++) {
      const along = vertical ? bh : bw, plate = vertical ? mh : mw;
      const room = along * 0.48 - plate / 2 - (plate * outerScale) / 2;
      const maxS = room / outerReach;
      if (maxS >= plate * 0.42) { S = Math.min(S, maxS); break; }
      mh *= 0.85; mw = mh * ASP; kk = mh / 250; S = p.spread * kk;
    }
    const lift = 20 * kk;

    const stageEl = document.createElement("div");
    stageEl.style.cssText = "position:absolute;inset:0;pointer-events:none;will-change:transform";
    host.append(stageEl);
    const mount = (pic, i) => {
      const m = document.createElement("div");
      const pad = mw * 0.055;
      m.style.cssText = `position:absolute;left:${((bw - mw) / 2).toFixed(1)}px;top:${((bh - mh) / 2).toFixed(1)}px;width:${mw.toFixed(1)}px;height:${mh.toFixed(1)}px;padding:${pad.toFixed(1)}px ${pad.toFixed(1)}px ${(mh * 0.17).toFixed(1)}px;box-sizing:border-box;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(mw * 0.025).toFixed(1)}px);box-shadow:var(--x-shadow);transform-origin:50% 50%;visibility:hidden`;
      const im = document.createElement("img");
      im.decoding = "sync"; im.src = pic.src; im.alt = "";
      const pos = ["50% 50%", "25% 50%", "75% 50%", "10% 40%", "90% 60%"][i % 5];
      im.style.cssText = `display:block;width:100%;height:100%;object-fit:cover;object-position:${pos};border-radius:min(var(--x-pic-radius), ${(mw * 0.012).toFixed(1)}px);filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      m.append(im);
      return m;
    };
    // the plates: [side (−1 left / up, +1 right / down), ring]; leave order follows reading direction
    const first = rtl ? 1 : -1;
    const plan = [[first, 1], [-first, 1]];
    if (five) plan.push([first, 2], [-first, 2]);
    const plates = plan.map(([side, ring], i) => ({ side, ring, el: mount(pics[(i + 1) % pics.length], i + 1), at: at + 0.3 + i * 0.1 }));
    // depth: outer ring at the back, then the inner ring, the centre on top
    for (const pl of plates.filter((q) => q.ring === 2)) stageEl.append(pl.el);
    for (const pl of plates.filter((q) => q.ring === 1)) stageEl.append(pl.el);
    const centre = mount(pics[0], 0);
    stageEl.append(centre);
    await Promise.all([centre, ...plates.map((q) => q.el)].map((m) => m.querySelector("img").decode().catch(() => {})));

    ctx.sfx(at, "card", 0.3);
    ctx.sfx(plates[0].at + 0.15, "card", 0.35);
    if (five) ctx.sfx(plates[2].at + 0.15, "card", 0.3);
    const dirX = rtl ? -1 : 1;

    return {
      draw(t) {
        const on = t >= at;
        // the centre: .9 → 1, fade, power3.out .6 s
        const c = ML.out(t, at, at + 0.6);
        centre.style.visibility = on ? "visible" : "hidden";
        centre.style.opacity = c.toFixed(4);
        centre.style.scale = (0.9 + 0.1 * c).toFixed(4);
        // the plates: from behind the centre to their places, power3.inOut .8 s
        for (const pl of plates) {
          const u = ML.ease(t, pl.at, pl.at + 0.8);
          const reach = pl.ring === 2 ? outerReach : 1, sc1 = pl.ring === 2 ? outerScale : 0.85;
          const rot = (pl.side < 0 ? -1 : 1) * ((pl.side < 0) !== !!rtl ? 0.75 : 1) * R * (pl.ring === 2 ? 1.6 : 1); // RTL mirrors the pair
          const along = pl.side * S * reach * u, across = lift * (pl.ring === 2 ? 1.8 : 1) * u;
          pl.el.style.visibility = on ? "visible" : "hidden";
          pl.el.style.opacity = c.toFixed(4);
          pl.el.style.translate = vertical ? `${(across * dirX).toFixed(2)}px ${along.toFixed(2)}px` : `${along.toFixed(2)}px ${across.toFixed(2)}px`;
          pl.el.style.rotate = `${(rot * u).toFixed(3)}deg`;
          pl.el.style.scale = (0.9 + (sc1 - 0.9) * u).toFixed(4);
        }
      },
    };
  },
});
