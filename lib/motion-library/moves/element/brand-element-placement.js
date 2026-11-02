// One brand element carried across the film: a single mark (the logo target, or a built mascot mark) lives on its own
// layer above the scenes (z 4: over world scenes and textures, under cursors and text) and leaps between named spots
// as the film moves on. placement(t) is a sum of springs (ML.track) over the spots' keys — x, y and size each — and
// every leap rides an arc: vertical offset −h·sin(π·u), u the leap's own spring progress. Cut-outs (the mascot's eyes)
// sit on a ground-coloured backing so lines and UI never show through. Spots: centre, corner (top reading-end),
// corner-start, top, bottom, bottom-corner, beside-headline, pic, left, right — a comma list, one leap per change,
// spread over the move's span (or each on a spoken word: "spot@word").
// Source: Rieranthony/product-film-skill reference/ingredients.md "One brand element across the film" + engine.md
// (keyed tracks summed of springs) (MIT).
ML.define({
  id: "element.brand-element-placement",
  category: "element",
  name: "One brand element carried across the film",
  does: "A single logo mark or mascot stays on screen through the film, leaping on arcs between named spots as scenes change.",
  says: ["brand", "connection", "story"],
  energy: 3,
  targets: ["logo"],
  duration: [3, 60],
  params: {
    spots: { type: "text", default: "centre,corner" },
    arc_height: { type: "number", range: [0, 200], default: 80, unit: "px" },
    spring: { type: "choice", options: ["glide", "snappy", "heavy"], default: "glide" },
  },
  pairs: ["camera.world-canvas-camera", "text-in.punchline"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:plugins/product-film/skills/product-film/reference/ingredients.md", license: "MIT", note: "One brand element across the film; placement as keyed spring tracks (reference/engine.md)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:4;";
    ctx.stage.append(layer); // on the stage, not a scene: it outlives scene changes
    const carrier = doc.createElement("div");
    carrier.style.cssText = "position:absolute;left:0;top:0;transform-origin:50% 50%;";
    layer.append(carrier);

    // the mark: a copy of the logo (the slot itself stays put, hidden while the copy travels), or a built mascot mark
    let bw, bh, maxScale = Infinity;
    if (own) {
      const B = ctx.box(own);
      bw = B.w; bh = B.h;
      const copy = own.cloneNode(true);
      copy.removeAttribute("data-slot");
      copy.style.cssText = `position:relative;display:block;width:${bw}px;height:${bh}px;margin:0;`;
      if (own.tagName === "IMG" && own.naturalWidth) maxScale = own.naturalWidth / bw; // never past its pixels
      // a ground-coloured backing behind the mark so nothing shows through its holes
      const back = doc.createElement("div");
      back.style.cssText = `position:absolute;inset:${-bh * 0.12}px ${-bh * 0.18}px;border-radius:var(--x-radius-s);background:var(--x-ground);opacity:.92;`;
      carrier.append(back, copy);
    } else {
      bw = bh = 160 * k;
      const s = doc.createElementNS(NS, "svg");
      s.setAttribute("viewBox", "0 0 100 100"); s.setAttribute("width", bw); s.setAttribute("height", bh);
      s.style.cssText = "display:block;overflow:visible;";
      const el = (tag, a) => { const e = doc.createElementNS(NS, tag); for (const [x, v] of Object.entries(a)) e.setAttribute(x, v); s.append(e); return e; };
      el("rect", { x: 6, y: 6, width: 88, height: 88, rx: 30, style: "fill:var(--x-ground)" }); // backing for the cut-out eyes
      el("path", { d: "M36 6 H64 A30 30 0 0 1 94 36 V64 A30 30 0 0 1 64 94 H36 A30 30 0 0 1 6 64 V36 A30 30 0 0 1 36 6 Z M34 38 a7 9 0 1 0 0.01 0 Z M66 38 a7 9 0 1 0 0.01 0 Z", style: "fill:var(--x-accent);fill-rule:evenodd" });
      el("path", { d: "M36 64 Q50 74 64 64", style: "fill:none;stroke:var(--x-accent-ink);stroke-width:5;stroke-linecap:round" });
      carrier.append(s);
    }
    carrier.style.width = bw + "px"; carrier.style.height = bh + "px";

    // spots: centre of the mark (stage px) and the width it takes there
    const m = f.m, endSide = (x) => (rtl ? x : W - x);
    const small = Math.min(W * 0.16, 240 * k), mid = Math.min(W * 0.3, 420 * k), big = Math.min(W * 0.42, 620 * k);
    const sizeFor = (w) => w / bw;
    const SP = {
      centre: () => ({ x: W / 2, y: H / 2, s: sizeFor(big) }),
      center: () => SP.centre(),
      corner: () => ({ x: endSide(m + small / 2), y: f.safe.y + (small * bh) / bw / 2 + 8 * k, s: sizeFor(small) }),
      "corner-start": () => ({ x: W - endSide(m + small / 2), y: f.safe.y + (small * bh) / bw / 2 + 8 * k, s: sizeFor(small) }),
      "bottom-corner": () => ({ x: endSide(m + small / 2), y: f.safe.y + f.safe.h - (small * bh) / bw / 2, s: sizeFor(small) }),
      top: () => ({ x: W / 2, y: f.safe.y + (mid * bh) / bw / 2, s: sizeFor(mid) }),
      bottom: () => ({ x: W / 2, y: f.safe.y + f.safe.h - (mid * bh) / bw / 2, s: sizeFor(mid) }),
      "beside-headline": () => ({ x: f.wide ? endSide(m + small * 0.6) : W / 2, y: f.wide ? f.head.y + f.head.h / 2 : f.head.y + f.head.h + (small * bh) / bw / 2, s: sizeFor(small) }),
      pic: () => ({ x: f.pic.x + f.pic.w / 2, y: f.pic.y + f.pic.h / 2, s: sizeFor(Math.min(f.pic.w * 0.6, big)) }),
      left: () => ({ x: m + mid / 2, y: H / 2, s: sizeFor(mid) }),
      right: () => ({ x: W - m - mid / 2, y: H / 2, s: sizeFor(mid) }),
    };
    const list = String(p.spots || "centre,corner").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    const parsed = (list.length ? list : ["centre", "corner"]).map((x) => { const [name, w] = x.split("@"); return { spot: (SP[name] || SP.centre)(), word: w }; });
    parsed.forEach((q) => { q.spot.s = Math.min(q.spot.s, maxScale); });

    // when each leap starts: spread over the span, or on its spoken word
    const span = Math.max(0.6, end - at - 0.8), n = parsed.length;
    const keysT = parsed.map((q, i) => (i === 0 ? at : Math.max(at + 0.4, q.word ? ctx.word(q.word, at + (i * span) / n) : at + (i * span) / n)));
    for (let i = 1; i < n; i++) keysT[i] = Math.max(keysT[i], keysT[i - 1] + 0.5);
    const cfg = p.spring === "snappy" ? { stiffness: 320, damping: 26 } : p.spring === "heavy" ? { stiffness: 90, damping: 22, mass: 1.6 } : ML.SPRING.glide;
    const kx = parsed.map((q, i) => [keysT[i], q.spot.x]), ky = parsed.map((q, i) => [keysT[i], q.spot.y]), ks = parsed.map((q, i) => [keysT[i], Math.log(q.spot.s)]);
    keysT.slice(1).forEach((t) => ctx.sfx(t, "whoosh.soft", 0.3));
    ctx.sfx(at, "pop.soft", 0.3);

    return {
      draw(t) {
        if (own) own.style.visibility = t >= at - 1e-6 ? "hidden" : "";
        if (t < at - 1e-6) { layer.style.visibility = "hidden"; return; }
        layer.style.visibility = "visible";
        let x = ML.track(t, kx, cfg), y = ML.track(t, ky, cfg), s = Math.exp(ML.track(t, ks, cfg));
        // each leap rides an arc over its own progress
        for (let i = 1; i < n; i++) {
          const u = ML.clamp(ML.step(t - keysT[i], cfg));
          const h = p.arc_height * k * Math.min(1, Math.hypot(parsed[i].spot.x - parsed[i - 1].spot.x, parsed[i].spot.y - parsed[i - 1].spot.y) / (200 * k));
          y -= h * Math.sin(Math.PI * u);
        }
        const pop = ML.step(t - at, ML.SPRING.pop);
        s *= Math.max(0, pop);
        carrier.style.opacity = ML.lin(t, at, at + 0.1).toFixed(4);
        carrier.style.transform = `translate(${(x - bw / 2).toFixed(2)}px, ${(y - bh / 2).toFixed(2)}px) scale(${s.toFixed(4)})`;
      },
    };
  },
});
