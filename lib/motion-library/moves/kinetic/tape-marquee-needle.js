// Tape marquee with a centre needle: a seamless track of items (condensed caps title + a small mono meta line under it,
// small accent "~" between) streams sideways like tape past a small accent triangle at the top centre. Each item's
// distance from the centre d = |itemCentre − frameCentre| / (W / 2) sets it: opacity 1 − 0.75·smoothstep(d), weight
// 700 − range·d, scale 1.06 at d = 0 — so whichever crosses the needle grows bold and dark while the rest stay pale.
// Every item box is measured once at its boldest, so weight changes never reflow the track. The first item stands on
// the needle at `at` and the rest follow in order. Velocity kicks on the beats (speed × kick, easing back over 0.8 s
// power2.out) are integrated in closed form, so the offset stays a pure function of t:
// x(t) = v·(t − at) + Σ (kick − 1)·v·0.8·(1 − (1 − u)⁴) / 4, u = (t − beat) / 0.8. RTL runs the other way.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md (MIT) — the tape list, rebuilt seekable.
ML.define({
  id: "kinetic.tape-marquee-needle",
  category: "kinetic",
  name: "Tape marquee with centre needle",
  does: "Names stream past like tape; whichever crosses the centre needle grows bold and dark while the rest stay pale.",
  says: ["list", "time", "focus", "flow"],
  energy: 3,
  targets: ["list", "word"],
  duration: [3, 10],
  params: {
    speed: { type: "number", range: [20, 240], default: 140, unit: "px/s" },
    kick_on_beat: { type: "bool", default: true },
    kick: { type: "number", range: [1, 4], default: 3 },
    weight_range: { type: "number", range: [200, 700], default: 500 },
    direction: { type: "choice", options: ["left", "right"], default: "left" },
  },
  pairs: ["kinetic.marquee", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md tape list with centre needle, rebuilt as a seekable track" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, k = Math.min(W, H) / 1080;
    const textOf = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    const isStage = !el || el === ctx.stage;
    let items = [];
    if (!isStage && el.children.length > 1) items = [...el.children].map(textOf).filter(Boolean);
    else if (!isStage && textOf(el)) items = textOf(el).split(" ");
    if (!items.length) items = (ctx.words || []).map((w) => w.w);
    if (!items.length) return null;
    // ── the band ──
    const band = doc.createElement("div");
    Object.assign(band.style, { position: "absolute", left: "0", width: W + "px", overflow: "hidden", zIndex: "4", pointerEvents: "none", direction: "ltr", padding: `${38 * k}px 0 ${22 * k}px` });
    const fade = "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)";
    band.style.maskImage = fade; band.style.webkitMaskImage = fade;
    host.append(band);
    const track = doc.createElement("div");
    Object.assign(track.style, { display: "flex", alignItems: "flex-start", width: "max-content", direction: "ltr" });
    band.append(track);
    const dir = (p.direction === "right" ? -1 : 1) * (rtl ? -1 : 1); // +1 runs to the left
    const titlePx = (ctx.f.wide ? 84 : 68) * k, metaPx = 24 * k, gap = 46 * k;
    const cells = [];
    const makeGroup = () => {
      const g = doc.createElement("div");
      Object.assign(g.style, { display: "flex", alignItems: "flex-start", gap: gap + "px", paddingInlineEnd: gap + "px", flex: "none" });
      // what arrives next must be the next item: running rightwards the track is laid out in reverse
      const order = items.map((txt, i) => [txt, i]);
      if (dir < 0) order.reverse();
      order.forEach(([txt, i]) => {
        const cell = doc.createElement("div");
        Object.assign(cell.style, { display: "flex", flexDirection: "column", alignItems: "center", flex: "none", direction: rtl ? "rtl" : "ltr" });
        const title = doc.createElement("div");
        title.textContent = txt;
        Object.assign(title.style, { font: `700 ${titlePx}px / 1 var(--x-head-font)`, textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "-0.01em", color: "var(--x-ink)", whiteSpace: "nowrap", textAlign: "center", transformOrigin: "50% 60%" });
        const meta = doc.createElement("div");
        meta.textContent = String(i + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
        Object.assign(meta.style, { font: `500 ${metaPx}px var(--x-mono-font)`, letterSpacing: "0.12em", color: "var(--x-dim)", marginTop: 12 * k + "px", direction: "ltr" });
        cell.append(title, meta);
        g.append(cell);
        const sep = doc.createElement("div");
        sep.textContent = "~";
        Object.assign(sep.style, { font: `500 ${titlePx * 0.5}px / ${titlePx}px var(--x-mono-font)`, color: "var(--x-accent)", flex: "none" });
        g.append(sep);
        cells.push({ cell, title, meta });
      });
      track.append(g);
      return g;
    };
    const first = makeGroup();
    // boxes sized at the boldest weight: the weight tween never reflows the track
    for (const c of cells) c.cell.style.width = Math.ceil(c.cell.offsetWidth + titlePx * 0.12) + "px";
    let guard = 0;
    while (first.offsetWidth < W && guard++ < 12) { const extra = makeGroup(); for (const n of [...extra.children]) first.append(n); extra.remove(); }
    for (const c of cells) if (!c.cell.style.width) c.cell.style.width = Math.ceil(c.cell.offsetWidth + titlePx * 0.12) + "px";
    const gw = first.offsetWidth;
    const copies = Math.ceil(W / gw) + 1;
    const groupCells = cells.slice();
    for (let c = 0; c < copies; c++) {
      const g = first.cloneNode(true); g.setAttribute("aria-hidden", "true"); track.append(g);
      [...g.children].filter((n) => n.childElementCount === 2).forEach((cell, i) => cells.push({ cell, title: cell.firstChild, meta: cell.lastChild, base: groupCells[i] }));
    }
    // centres of every cell within the track (measured once)
    const tb = ctx.box(track);
    for (const c of cells) { const b = ctx.box(c.cell); c.cx = b.x - tb.x + b.w / 2; }
    // needle: small accent triangle at the top centre
    const needle = doc.createElement("div");
    Object.assign(needle.style, { position: "absolute", top: 6 * k + "px", left: (W / 2 - 14 * k).toFixed(1) + "px", width: "0", height: "0", borderLeft: `${14 * k}px solid transparent`, borderRight: `${14 * k}px solid transparent`, borderTop: `${20 * k}px solid var(--x-accent)` });
    band.append(needle);
    // where it sits: across the target's middle (the stage's middle for the stage)
    const bh = band.offsetHeight;
    let cy = H / 2;
    if (!isStage) { const b = ctx.box(el); cy = b.y + b.h / 2; }
    band.style.top = Math.max(ctx.f.safe.y * 0.5, Math.min(H - bh - ctx.f.safe.y * 0.3, cy - bh / 2)).toFixed(1) + "px";
    // beats: the spoken words inside the run, at least 0.9 s apart
    const beats = [];
    if (p.kick_on_beat && p.kick > 1) for (const w of ctx.words || []) if (w.t >= at + 0.3 && w.t < end - 0.6 && (!beats.length || w.t - beats[beats.length - 1] >= 0.9)) beats.push(w.t);
    beats.forEach((b) => ctx.sfx(b, "tap", 0.2));
    // the first item stands on the needle at `at`
    const c0 = cells[dir > 0 ? 0 : items.length - 1].cx, ph0 = dir > 0 ? c0 - W / 2 : W / 2 - c0 + gw;
    const offsetAt = (t) => {
      let x = ph0 + p.speed * k * Math.max(0, t - at);
      for (const b of beats) { if (t <= b) break; const u = Math.min(1, (t - b) / 0.8); x += (p.kick - 1) * p.speed * k * 0.8 * (1 - Math.pow(1 - u, 4)) / 4; }
      return x;
    };
    const smooth = (x) => x * x * (3 - 2 * x);
    const hideSource = !isStage && el !== ctx.scene;
    const lead = at - (ctx.from ?? 0) > 0.2; // a move starting with its scene never flashes the source first
    return {
      draw(t) {
        const show = ML.ease(t, at, at + 0.35) * (1 - ML.ease(t, end - 0.3, end));
        band.style.opacity = show.toFixed(4);
        band.style.visibility = show > 0.001 ? "visible" : "hidden";
        if (hideSource) el.style.opacity = !lead ? "0" : t < at ? "" : t < at + 0.35 ? (1 - show).toFixed(4) : "0";
        const ph = ((offsetAt(t) % gw) + gw) % gw;
        const x = dir > 0 ? -ph : -(gw - ph);
        track.style.transform = `translateX(${x.toFixed(2)}px)`;
        for (const c of cells) {
          const d = Math.min(1, Math.abs(c.cx + x - W / 2) / (W / 2));
          const s = smooth(d);
          c.cell.style.opacity = (1 - 0.75 * s).toFixed(4);
          c.title.style.fontWeight = String(Math.round(Math.max(100, 700 - p.weight_range * d) / 100) * 100);
          c.title.style.fontVariationSettings = `"wght" ${Math.max(100, 700 - p.weight_range * d).toFixed(0)}`;
          c.title.style.scale = (1 + 0.06 * (1 - smooth(Math.min(1, d * 4)))).toFixed(4);
          c.meta.style.color = d < 0.12 ? "var(--x-accent)" : "var(--x-dim)";
        }
      },
    };
  },
});
