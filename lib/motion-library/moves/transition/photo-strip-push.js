// Photo strip push: tall strips (3-6, each 1/N of the picture's width, its full height) slide in one after another,
// each from x 100% to its slot over 0.5 s on power3.inOut, 0.2 s apart, each carrying its own photo with an inner
// parallax (the photo drifts -10% of the strip inside it as it travels), and the current shot is pushed out ahead of
// the leading strip. Once every strip has landed they flatten into solid bars of a colour sampled from each strip's
// photo (a 0.2 s colour overlay), the hand-off to the next cut. Photos are the scene's own pictures (the target first,
// then the others); with one picture each strip frames a different part of it. Arabic mirrors the travel.
// Source: prompt-motion andginja-i-gave-claude-opus (reference only: our own rebuild).
ML.define({
  id: "transition.photo-strip-push",
  category: "transition",
  name: "Photo strip push",
  does: "Tall vertical strips with new photos slide in one after another, pushing the current shot, then flatten into colour bars before the next scene.",
  says: ["transition", "story", "choice"],
  energy: 3,
  targets: ["image", "scene"],
  duration: [1, 2],
  params: {
    strips: { type: "number", range: [3, 6], default: 4 },
    direction: { type: "choice", options: ["rtl", "ltr"], default: "rtl" },
    colour_bars: { type: "bool", default: true },
  },
  pairs: ["photo.framed-swap-wipe", "transition.hard-cut"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:andginja-i-gave-claude-opus", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const host = ctx.scene || stage;
    const N = Math.round(ML.clamp(+p.strips || 4, 3, 6));
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);
    // the shot: the target picture (or the first picture in it), else the picture region of the scene
    const el = ctx.el && ctx.el !== stage ? ctx.el : null;
    const shot = el ? (el.tagName === "IMG" ? el : el.querySelector("img")) || el : host.querySelector("img");
    const r = shot ? ctx.box(shot) : { x: f.pic.x + hb.x, y: f.pic.y + hb.y, w: f.pic.w, h: f.pic.h };
    const box = { x: r.x - hb.x, y: r.y - hb.y, w: r.w, h: r.h };
    const radius = shot ? getComputedStyle(shot).borderRadius : "var(--x-pic-radius)";
    const photos = [...new Set([shot, ...host.querySelectorAll("img")].filter((i) => i && i.tagName === "IMG" && i.currentSrc !== "").map((i) => i.currentSrc || i.src))];
    // travel: "rtl" = strips enter from the right; Arabic mirrors
    const fromRight = (p.direction !== "ltr") !== !!ctx.rtl;

    const frame = document.createElement("div");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:absolute;left:${box.x.toFixed(1)}px;top:${box.y.toFixed(1)}px;width:${box.w.toFixed(1)}px;height:${box.h.toFixed(1)}px;overflow:hidden;border-radius:${radius};z-index:5;pointer-events:none;visibility:hidden;background:var(--x-pic-ground)`;
    host.append(frame);
    // the current shot, pushed out ahead of the strips
    let old = null;
    if (shot && shot.tagName === "IMG") {
      old = document.createElement("img");
      old.src = shot.currentSrc || shot.src;
      old.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;object-fit:${getComputedStyle(shot).objectFit || "cover"};object-position:${getComputedStyle(shot).objectPosition};filter:var(--x-pic-filter)`;
    } else if (shot) {
      old = shot.cloneNode(true);
      old.removeAttribute("data-slot");
      old.style.position = "absolute"; old.style.inset = "0";
    }
    if (old) frame.append(old);

    const sw = box.w / N;
    const strips = [];
    for (let i = 0; i < N; i++) {
      // strip i lands in the slot farthest from where it enters first, so the strips stack in like a deck
      const slot = fromRight ? i : N - 1 - i;
      // a strip reaches from its slot to the far edge, so no gap opens behind it while the next one is on its way;
      // the strips after it cover the rest, and once all have landed each shows only its own slot
      const s = document.createElement("div");
      const span = fromRight ? box.w - slot * sw : (slot + 1) * sw;
      const left = fromRight ? slot * sw : 0;
      s.style.cssText = `position:absolute;top:0;left:${left.toFixed(2)}px;width:${(span + 0.6).toFixed(2)}px;height:100%;overflow:hidden;background:var(--x-panel-2)`;
      let img = null;
      if (photos.length) {
        img = document.createElement("img");
        img.src = photos[i % photos.length];
        // one photo: each strip frames another part of it
        const pos = photos.length > 1 ? 50 : (100 * ((i * 0.37 + 0.15) % 1)).toFixed(1);
        img.style.cssText = `position:absolute;top:0;left:${(-sw * 0.1).toFixed(2)}px;width:${(span + sw * 0.2).toFixed(2)}px;height:100%;object-fit:cover;object-position:${pos}% 50%;filter:var(--x-pic-filter)`;
        s.append(img);
      }
      const bar = document.createElement("div");
      bar.style.cssText = `position:absolute;top:0;bottom:0;${fromRight ? "left:0" : "right:0"};width:${(sw + 0.6).toFixed(2)}px;opacity:0`;
      s.append(bar);
      frame.append(s);
      strips.push({ s, img, bar, slot, span, a: at + i * 0.2, pos: img ? img.style.objectPosition : "" });
    }
    // the bars' colours: sampled from each strip's part of its photo; the look's colours when a picture can't be read
    const fallback = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-ink)", "var(--x-panel-2)", "var(--x-good)", "var(--x-dim)"];
    strips.forEach((st, i) => { st.bar.style.background = fallback[i % fallback.length]; });
    const sample = async () => {
      for (const [i, st] of strips.entries()) {
        if (!st.img) continue;
        try {
          await st.img.decode();
          const c = document.createElement("canvas"); c.width = 12; c.height = 24;
          const g = c.getContext("2d", { willReadFrequently: true });
          const nw = st.img.naturalWidth || 1, nh = st.img.naturalHeight || 1;
          // the part object-fit: cover shows in a strip 1.2 x its width
          const iw = st.span + sw * 0.2, sc = Math.max(iw / nw, box.h / nh), vw = iw / sc, vh = box.h / sc;
          const px = parseFloat(st.pos) / 100 || 0.5;
          // the slot's own part: the first strip-width of the photo on the entering side
          const part = (sw * 1.1) / sc, x0 = (nw - vw) * px + (fromRight ? 0 : vw - part);
          g.drawImage(st.img, x0, (nh - vh) / 2, part, vh, 0, 0, 12, 24);
          const d = g.getImageData(0, 0, 12, 24).data;
          let R = 0, G = 0, B = 0;
          for (let j = 0; j < d.length; j += 4) { R += d[j]; G += d[j + 1]; B += d[j + 2]; }
          const n = d.length / 4;
          st.bar.style.background = `rgb(${Math.round(R / n)},${Math.round(G / n)},${Math.round(B / n)})`;
        } catch (e) { void i; /* a picture we may not read: the look's colour stays */ }
      }
    };
    const p3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const landed = at + (N - 1) * 0.2 + 0.5, flat = landed + 0.12;
    strips.forEach((st, i) => i % 2 === 0 && ctx.sfx(st.a, "whoosh.soft", 0.3));
    if (p.colour_bars) ctx.sfx(flat, "tap", 0.25);
    return sample().then(() => ({
      draw(t) {
        const on = t >= at;
        frame.style.visibility = on ? "visible" : "hidden";
        if (shot) shot.style.visibility = on ? "hidden" : "";
        if (!on) return;
        let lead = box.w; // the edge of the strips nearest the old shot (in from-right coordinates)
        for (const st of strips) {
          const u = p3(ML.lin(t, st.a, st.a + 0.5));
          const posR = fromRight ? st.slot : N - 1 - st.slot; // its slot counted from the entering side
          const travel = (box.w - posR * sw) * (1 - u); // from x 100% of the frame to its slot
          const xr = posR * sw + travel; // its left edge, from-right coordinates
          st.s.style.transform = `translate3d(${(fromRight ? travel : -travel).toFixed(2)}px, 0, 0)`;
          st.s.style.visibility = t < st.a ? "hidden" : "visible";
          if (t >= st.a) lead = Math.min(lead, xr);
          if (st.img) st.img.style.transform = `translate3d(${((fromRight ? 1 : -1) * sw * 0.1 * (1 - u) - (fromRight ? 1 : -1) * sw * 0.1 * u).toFixed(2)}px, 0, 0)`;
          st.bar.style.opacity = p.colour_bars ? ML.lin(t, flat + st.slot * 0.03, flat + st.slot * 0.03 + 0.2).toFixed(4) : "0";
        }
        if (old) { const push = lead - box.w; old.style.transform = `translate3d(${(fromRight ? push : -push).toFixed(2)}px, 0, 0)`; }
      },
    }));
  },
});
