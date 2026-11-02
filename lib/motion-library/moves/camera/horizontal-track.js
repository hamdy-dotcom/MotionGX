// Horizontal gallery track: the camera tracks sideways along one row of N items (pictures, proof cards or list items),
// each 60–80% of the frame wide with a 24–48 px gap. The track's x = pad − progress·(trackWidth − itemWidth), so the
// first item sits centred at the start and the last one centred at the end; progress runs 0 → 1 from `at` to `end`
// with ease none (a scrub) or sine.inOut. With inner_parallax each item's picture counter-translates ±8% of the item
// inside its overflow-hidden frame (only as far as the picture's own pixels allow: never enlarged past them).
// RTL: the row is mirrored — it starts at the right and the camera travels leftwards through it.
// Source: MengTo/Skills web-design/cinematic-scroll-storytelling ("Gallery or proof: scroll-scrubbed horizontal") (MIT),
// rebuilt as a pure function of t.
ML.define({
  id: "camera.horizontal-track",
  category: "camera",
  name: "Horizontal gallery track",
  does: "The camera tracks sideways along a row of images or proof cards, each sliding past the frame in sequence.",
  says: ["proof", "list", "story"],
  energy: 2,
  targets: ["image", "card", "list"],
  duration: [3, 10],
  params: {
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    items: { type: "number", range: [3, 8], default: 4 },
    item_width: { type: "number", range: [0.6, 0.8], default: 0.7, unit: "frame" },
    ease: { type: "choice", options: ["none", "sine.inOut"], default: "sine.inOut" },
    inner_parallax: { type: "bool", default: true },
  },
  pairs: ["text-in.soft-rise", "camera.layer-parallax"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/cinematic-scroll-storytelling", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const N = Math.round(ML.clamp(p.items, 3, 8));
    const iw = W * ML.clamp(p.item_width, 0.6, 0.8);
    const gap = ML.clamp(W * 0.025, 24, 48);
    const pic = f.pic;
    const ih = Math.min(pic.h * 0.94, iw / (f.tall ? 0.82 : f.wide ? 1.55 : 1.2));
    const top = pic.y + (pic.h - ih) / 2;
    // the row runs against reading order when mirrored (direction flips under an RTL stage)
    const mirrored = (p.direction === "rtl") !== !!ctx.rtl;

    // what the row is made of: the list's items, copies of the card, or the picture at varied crops
    const isImg = el.tagName === "IMG";
    const listKids = [...el.children].filter((c) => c.offsetParent !== null || c.getClientRects().length);
    const kind = isImg ? "image" : listKids.length >= 2 && el.matches('[data-slot="list"], ul, ol') ? "list" : listKids.length >= 2 && !el.classList.contains("ml-panel") ? "list" : "card";
    const region = el.closest(".ml-pic") || el;

    const track = document.createElement("div");
    track.style.cssText = `position:absolute;left:0;top:${top}px;height:${ih}px;width:${N * iw + (N - 1) * gap}px;display:flex;gap:${gap}px;z-index:3;pointer-events:none;flex-direction:${mirrored ? "row-reverse" : "row"};will-change:transform`;
    const inner = [];
    let natural = 0;
    if (isImg) natural = el.naturalWidth || 0;
    for (let i = 0; i < N; i++) {
      const item = document.createElement("div");
      item.style.cssText = `position:relative;flex:0 0 ${iw}px;height:100%;overflow:hidden;border-radius:var(--x-pic-radius);box-shadow:var(--x-shadow);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color)`;
      const tag = document.createElement("div");
      tag.className = "ml-label";
      tag.textContent = `${String(i + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
      tag.style.cssText = "position:absolute;left:28px;bottom:24px;z-index:2;direction:ltr;unicode-bidi:isolate;padding:8px 14px;border-radius:var(--x-radius-s);background:var(--x-panel);color:var(--x-ink)";
      if (ctx.rtl) { tag.style.left = "auto"; tag.style.right = "28px"; }
      if (kind === "image") {
        const img = document.createElement("img");
        img.src = el.currentSrc || el.src;
        img.alt = "";
        // a different crop per item: object-position walks across the picture
        const ox = N > 1 ? (i / (N - 1)) * 100 : 50, oy = 30 + ML.rnd(i, 7) * 40;
        img.style.cssText = `position:absolute;top:0;height:100%;left:0;width:100%;object-fit:cover;object-position:${ox.toFixed(1)}% ${oy.toFixed(1)}%;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
        item.append(img);
        inner.push(img);
      } else if (kind === "card") {
        const c = el.cloneNode(true);
        c.removeAttribute("data-slot");
        c.querySelectorAll("[data-slot]").forEach((n) => n.removeAttribute("data-slot"));
        c.style.cssText += ";position:absolute;inset:0;width:auto;height:auto;margin:0;box-shadow:none;border:0;border-radius:0;overflow:hidden";
        item.append(c);
        inner.push(c);
      } else {
        const src = listKids[i % listKids.length];
        const face = document.createElement("div");
        face.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:28px;padding:8%";
        const n = document.createElement("div");
        n.textContent = String(i + 1).padStart(2, "0");
        n.style.cssText = `font:var(--x-head-weight) ${Math.round(ih * 0.28)}px/1 var(--x-head-font);color:var(--x-accent);letter-spacing:var(--x-hero-track)`;
        const tx = document.createElement("div");
        tx.textContent = src.textContent.trim();
        tx.style.cssText = `font:var(--x-head-weight) ${Math.round(Math.min(ih * 0.12, iw * 0.09))}px/1.15 var(--x-head-font);color:var(--x-ink);letter-spacing:var(--x-head-track)`;
        face.append(n, tx);
        item.append(face);
        inner.push(face);
        tag.style.display = "none";
      }
      item.append(tag);
      track.append(item);
    }
    host.append(track);
    // the picture's own slack for the counter-move: at most 16% wider, never past its pixels
    const over = kind === "image" ? (natural ? ML.clamp(natural / iw, 1, 1.16) : 1.16) : 1.1;
    const slack = p.inner_parallax ? (over - 1) * iw : 0;
    if (kind === "image" && slack > 0) inner.forEach((img) => { img.style.width = `${(over * 100).toFixed(2)}%`; img.style.left = `${(-50 * (over - 1)).toFixed(2)}%`; });

    const trackW = N * iw + (N - 1) * gap;
    const pad = (W - iw) / 2;
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const fadeIn = 0.3;
    // a soft whoosh as each new item reaches the centre
    for (let i = 1; i < N; i++) {
      const target = i / (N - 1);
      // invert the ease to find when progress reaches target (bisection: setup only)
      let lo = 0, hi = 1;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; ((p.ease === "none" ? m : sine(m)) < target ? (lo = m) : (hi = m)); }
      const tt = at + lo * (end - at) - 0.25;
      if (i <= 6) ctx.sfx(Math.max(at, tt), "whoosh.soft", 0.14);
    }
    return {
      draw(t) {
        const on = t >= at - 1e-6;
        const vis = on ? ML.lin(t, at, at + fadeIn) * (1 - ML.lin(t, end - 0.2, end)) : 0;
        region.style.visibility = on && vis > 0.98 ? "hidden" : "";
        track.style.visibility = vis > 0 ? "visible" : "hidden";
        track.style.opacity = vis.toFixed(4);
        const raw = ML.lin(t, at, end);
        const prog = p.ease === "none" ? raw : sine(raw);
        // world x of the row's first (reading-order) item: mirrored rows read from the right
        const x = mirrored ? pad - (trackW - iw) + prog * (trackW - iw) : pad - prog * (trackW - iw);
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
        if (slack > 0) {
          inner.forEach((node, i) => {
            const k = mirrored ? N - 1 - i : i; // DOM index → visual slot under row-reverse
            const cx = x + k * (iw + gap) + iw / 2; // the item's centre on screen
            const off = ML.clamp((cx - W / 2) / (W / 2 + iw / 2), -1, 1); // −1 left … 1 right
            node.style.translate = `${(-off * slack * 0.5).toFixed(2)}px 0`;
          });
        }
      },
    };
  },
});
