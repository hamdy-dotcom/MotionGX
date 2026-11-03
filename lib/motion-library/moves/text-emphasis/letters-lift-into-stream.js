// Letters lift into a stream: the text breaks into glyph sprites at their own places; a ripple from a trigger point
// (the centre, a cursor tap or the leading edge) reaches each glyph at distance / speed. Each turns to the glow colour
// with a soft glow, rises off the page (growing 1 -> 1.4) into an open ring turning over the trigger — a vortex with
// room for every glyph — tumbling until its turn, then joins a long winding ribbon carrying the glyphs one after another out of the frame (forward in the reading
// direction, or up), wobbled by seeded noise, trailing tiny sparks; the rest of the page recedes into the ground (so
// in a light or a dark look alike). Arabic: whole words are the sprites, so joined letters never break.
// Source: own rebuild of prompt-motion reference ajith-io-omg-i-asked-claude ("turn text into something alive").
ML.define({
  id: "text-emphasis.letters-lift-into-stream",
  category: "text-emphasis",
  name: "Letters lift off the page into a glowing stream",
  does: "The words on the page break into individual glowing letters (whole words in Arabic) that rise, swirl and leave one after another in a winding glowing stream across the frame.",
  says: ["change", "reveal", "energy", "story"],
  energy: 4,
  targets: ["line", "headline", "screen"],
  duration: [2, 4],
  params: {
    trigger: { type: "choice", options: ["centre", "cursor", "edge"], default: "centre" },
    direction: { type: "choice", options: ["right", "up"], default: "right" },
    colour: { type: "text", default: "accent" },
    speed: { type: "number", range: [300, 3000], default: 800, unit: "px/s" },
    swirl: { type: "number", range: [0, 2], default: 1 },
    sparks: { type: "bool", default: true },
    dim: { type: "number", range: [0, 0.6], default: 0.45 },
  },
  pairs: ["background.particle-field", "camera.push-in"],
  avoid: ["calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:ajith-io-omg-i-asked-claude", license: "reference", note: "our own rebuild as DOM sprites driven from t with seeded noise" },
  setup(ctx) {
    const { el, p, at, end, stage, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const host = ctx.scene || stage; // the scene covers the stage (inset 0), so stage px hold
    const tones = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)", good: "var(--x-good)" };
    const tone = tones[p.colour] || (/^var\(--x-[a-z0-9-]+\)$/.test(String(p.colour)) ? p.colour : tones.accent);
    const glyphs = ML.split(el, "chars"); // Latin letters, whole Arabic words
    if (!glyphs.length) return null;
    const base = getComputedStyle(el).color;
    const W = stage.offsetWidth, H = stage.offsetHeight, S = Math.min(W, H) / 1080;
    const eb = ctx.box(el);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const pos = glyphs.map((g) => { const b = ctx.box(g); return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, wide: b.w > fs * 1.6 }; }); // wide: a whole word
    // the trigger point
    const fwd = rtl ? -1 : 1;
    let c;
    if (p.trigger === "edge") c = { x: rtl ? eb.x + eb.w : eb.x, y: eb.y + eb.h / 2 };
    else if (p.trigger === "cursor") c = { x: eb.x + eb.w * (rtl ? 0.68 : 0.32), y: eb.y + eb.h * 0.55 };
    else c = { x: eb.x + eb.w / 2, y: eb.y + eb.h / 2 };
    // the page dims under the stream; the target rides above it
    const dimEl = doc.createElement("div");
    Object.assign(dimEl.style, { position: "absolute", inset: "0", background: "var(--x-ground)", opacity: "0", pointerEvents: "none", zIndex: "2" });
    host.append(dimEl);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "3";
    // the ripple ring (and a cursor dot for the cursor trigger)
    const fx = doc.createElement("div");
    Object.assign(fx.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "4", overflow: "hidden" });
    host.append(fx);
    const pulse = doc.createElement("div");
    Object.assign(pulse.style, { position: "absolute", left: c.x + "px", top: c.y + "px", width: "0", height: "0", borderRadius: "50%", border: `${Math.max(1.5, 2 * S)}px solid ${tone}`, transform: "translate(-50%, -50%)", opacity: "0" });
    fx.append(pulse);
    let cursor = null;
    if (p.trigger === "cursor") {
      cursor = doc.createElement("div");
      const r = 16 * S;
      Object.assign(cursor.style, { position: "absolute", left: c.x - r + "px", top: c.y - r + "px", width: 2 * r + "px", height: 2 * r + "px", borderRadius: "50%", background: "var(--x-pointer)", border: `${2 * S}px solid var(--x-pointer-edge)`, boxShadow: "var(--x-shadow)", opacity: "0" });
      fx.append(cursor);
    }
    const tap = at + (p.trigger === "cursor" ? 0.3 : 0.05);
    // timing: each glyph lifts when the ripple reaches it, orbits, and joins the stream in its turn, the ones nearest the
    // way out first, so the stream is a ribbon of glyphs and not a clump; all of it fits before `end`
    const dist = pos.map((q) => Math.hypot(q.x - c.x, q.y - c.y));
    const maxD = Math.max(1, ...dist);
    const n = glyphs.length, up = p.direction === "up", small = Math.min(W, H);
    const avail = Math.max(1, end - tap - 0.15);
    const spread = Math.min(Math.max(0.35, maxD / (p.speed * S)), avail * 0.2);
    const way = up ? c.y + 160 * S : (rtl ? c.x : W - c.x) + 160 * S; // the ribbon's length: to past the frame's edge
    // a short way out is crossed faster, leaving more time between glyphs: the ribbon keeps its spacing
    const travel = ML.clamp(avail * 0.45, 0.55, 2.2) * ML.clamp(way / (0.6 * Math.max(W, H)), 0.5, 1);
    const turns = Math.max(0, avail - spread - 0.15 - travel);
    const start = dist.map((d) => tap + (d / maxD) * spread);
    const lead = pos.map((q, i) => (up ? -q.y : fwd * q.x) + ML.rnd(i, 12) * eb.w * 0.15);
    const order = pos.map((_, i) => i).sort((a, b) => lead[b] - lead[a]);
    const join = new Array(n);
    order.forEach((i, k) => { join[i] = Math.max(start[i] + 0.3, tap + spread + 0.15 + (k / Math.max(1, n - 1)) * turns); });
    // the ring: wide enough to seat every glyph with room, risen just off the page and kept on the frame
    const FLAT = 0.75, ringRoom = pos.reduce((a, q) => a + q.w + fs * 0.2, 0) * 1.3;
    const ring = Math.min(Math.max(ringRoom / 6.283, Math.max(...pos.map((q) => q.w)) * 0.7, 90 * S), 0.34 * small) * Math.min(1, p.swirl);
    const ringY = Math.max(c.y - 140 * S, 0.06 * H + ring * FLAT + fs * 0.6);
    const seat = new Array(n);
    order.forEach((i, k) => { seat[i] = (k / n) * 6.283 + 2.2; });
    const G = glyphs.map((g, i) => {
      // the orbit is flattened: taken in that squashed space, so it starts exactly at the glyph
      const ex = pos[i].x - c.x, ey = (pos[i].y - c.y) / FLAT;
      return {
        a0: Math.atan2(ey, ex), r0: Math.hypot(ex, ey),
        r1: ring * (0.88 + 0.24 * ML.rnd(i, 3)),
        tumble: (ML.rnd(i, 4) < 0.5 ? -1 : 1) * 360 * (0.4 + 0.6 * ML.rnd(i, 5)) * (pos[i].wide ? 0.25 : 1),
        grow: pos[i].wide ? 0.12 : 0.4,
        ph1: ML.rnd(i, 6) * 6.283, ph2: ML.rnd(i, 7) * 6.283,
        lane: ML.rnd(i, 8) - 0.5, // its place across the stream's width
      };
    });
    const bandY = H * 0.42 - c.y; // a sideways stream sweeps down to the frame's middle band, wherever the text sat
    const amp = 0.07 * small, laneW = 0.12 * small;
    const smooth = (x) => { x = ML.clamp(x); return x * x * (3 - 2 * x); };
    /** where glyph i is at time `tt`, on the stage */
    const at2 = (i, tt) => {
      const q = G[i], rise = smooth((tt - start[i]) / 0.5);
      // the vortex: each glyph slides from its place on the page to its seat on the ring, which keeps turning
      const open = rise * Math.min(1, p.swirl), a = q.a0 + (seat[i] - q.a0) * open + (rtl ? -1 : 1) * 1.1 * p.swirl * Math.max(0, tt - start[i]);
      const r = q.r0 + (q.r1 - q.r0) * open;
      const ox = c.x + Math.cos(a) * r;
      const oy = c.y + (ringY - c.y) * open + Math.sin(a) * r * FLAT;
      // the ribbon: accelerating along a winding line, each glyph on its lane, wobbled by seeded noise
      const tv = ML.clamp((tt - join[i]) / travel), v = Math.pow(tv, 1.6), s = v * way;
      const wind = amp * Math.sin(v * 9 + 0.6) * Math.sqrt(v), side = q.lane * laneW * (0.4 + v);
      const wob = 16 * S * smooth(tv / 0.3);
      const sx = (up ? c.x + 0.25 * fwd * s + wind + side : c.x + fwd * s) + wob * Math.sin(tt * 5 + q.ph1);
      const sy = (up ? c.y - s : c.y + bandY * smooth(v * 1.6) + wind + side) + wob * Math.cos(tt * 4 + q.ph2);
      const b = smooth(tv / 0.4);
      return { x: ox + (sx - ox) * b, y: oy + (sy - oy) * b, rise, v, tv };
    };
    // sparks: tiny dots trailing each glyph along its own path
    const sparks = [];
    if (p.sparks) glyphs.forEach((g, i) => { for (let k = 0; k < 3; k++) { const d = doc.createElement("i"); const r = (2.5 + 2.5 * ML.rnd(i, 10 + k)) * S; Object.assign(d.style, { position: "absolute", left: -r + "px", top: -r + "px", width: 2 * r + "px", height: 2 * r + "px", borderRadius: "50%", background: tone, boxShadow: `0 0 ${6 * S}px ${tone}`, opacity: "0" }); fx.append(d); sparks.push({ d, i, lag: 0.05 + 0.07 * k + 0.05 * ML.rnd(i, 20 + k) }); } });
    ctx.sfx(tap, "swell", 0.4);
    if (p.trigger === "cursor") ctx.sfx(tap, "click", 0.3);
    ctx.sfx(tap + spread + 0.15, "whoosh.soft", 0.25);
    return {
      draw(t) {
        dimEl.style.opacity = (p.dim * ML.ease(t, tap, tap + 0.8)).toFixed(4);
        const rp = ML.lin(t, tap, tap + spread + 0.3);
        pulse.style.opacity = rp > 0 && rp < 1 ? ((1 - rp) * 0.8).toFixed(4) : "0";
        const rr = rp * (maxD + 60 * S) * 2;
        pulse.style.width = pulse.style.height = rr.toFixed(1) + "px";
        if (cursor) {
          const press = 1 - 0.25 * ML.pulse(t, tap, 0.06, 0.15);
          cursor.style.opacity = (ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, tap + 0.4, tap + 0.7))).toFixed(4);
          cursor.style.transform = `scale(${press.toFixed(4)})`;
        }
        glyphs.forEach((g, i) => {
          if (t <= start[i]) { g.style.transform = "none"; g.style.color = ""; g.style.textShadow = "none"; g.style.opacity = "1"; return; }
          const q = at2(i, t), dx = q.x - pos[i].x, dy = q.y - pos[i].y;
          const col = ML.clamp((t - start[i]) / 0.3);
          const sc = 1 + G[i].grow * q.rise - 0.3 * q.v; // up off the page, smaller as the stream takes it away
          const age = (t - start[i]) / (join[i] + travel - start[i]);
          const rot = G[i].tumble * Math.pow(Math.min(1, age), 1.2);
          g.style.color = `color-mix(in srgb, ${tone} ${(col * 100).toFixed(1)}%, ${base})`;
          g.style.textShadow = `0 0 ${(8 * S * col).toFixed(2)}px ${tone}, 0 0 ${(22 * S * col).toFixed(2)}px color-mix(in srgb, ${tone} 45%, transparent)`;
          g.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          g.style.opacity = q.tv >= 1 ? "0" : (1 - ML.lin(q.tv, 0.88, 1)).toFixed(4);
        });
        for (const s of sparks) {
          const tt = t - s.lag * 1.4;
          if (tt <= start[s.i] + 0.1) { s.d.style.opacity = "0"; continue; }
          const q = at2(s.i, tt);
          s.d.style.opacity = (0.9 * ML.clamp((tt - start[s.i] - 0.1) / 0.25) * (1 - ML.lin(q.tv, 0.75, 1))).toFixed(4);
          s.d.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px)`;
        }
      },
    };
  },
});
