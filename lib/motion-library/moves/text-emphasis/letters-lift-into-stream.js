// Letters lift into a stream: the text breaks into glyph sprites at their own places; a ripple from a trigger point
// (the centre, a cursor tap or the leading edge) reaches each glyph at distance / speed. Each turns to the glow colour
// with a soft glow, rises off the page (growing 1 -> 1.4), orbits the trigger as a vortex, tumbles 0-360° and is
// carried away in a stream (forward in the reading direction, or up), wobbled by seeded curl-like noise, trailing tiny
// sparks; the rest of the page dims. Arabic: whole words are the sprites, so joined letters never break.
// Source: own rebuild of prompt-motion reference ajith-io-omg-i-asked-claude ("turn text into something alive").
ML.define({
  id: "text-emphasis.letters-lift-into-stream",
  category: "text-emphasis",
  name: "Letters lift off the page into a glowing stream",
  does: "The words on the page break into individual glowing letters that rise up and swirl into a glowing stream across the frame.",
  says: ["change", "reveal", "energy", "story"],
  energy: 4,
  targets: ["line", "headline", "screen"],
  duration: [1.5, 4],
  params: {
    trigger: { type: "choice", options: ["centre", "cursor", "edge"], default: "centre" },
    direction: { type: "choice", options: ["right", "up"], default: "right" },
    colour: { type: "text", default: "accent" },
    speed: { type: "number", range: [300, 3000], default: 800, unit: "px/s" },
    swirl: { type: "number", range: [0, 2], default: 1 },
    sparks: { type: "bool", default: true },
    dim: { type: "number", range: [0, 0.5], default: 0.28 },
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
    const pos = glyphs.map((g) => { const b = ctx.box(g); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
    // the trigger point
    const fwd = rtl ? -1 : 1;
    let c;
    if (p.trigger === "edge") c = { x: rtl ? eb.x + eb.w : eb.x, y: eb.y + eb.h / 2 };
    else if (p.trigger === "cursor") c = { x: eb.x + eb.w * (rtl ? 0.68 : 0.32), y: eb.y + eb.h * 0.55 };
    else c = { x: eb.x + eb.w / 2, y: eb.y + eb.h / 2 };
    // the page dims under the stream; the target rides above it
    const dimEl = doc.createElement("div");
    Object.assign(dimEl.style, { position: "absolute", inset: "0", background: "var(--x-ink)", opacity: "0", pointerEvents: "none", zIndex: "2" });
    host.append(dimEl);
    el.style.position = el.style.position || "relative";
    el.style.zIndex = "3";
    // the ripple ring (and a cursor dot for the cursor trigger)
    const fx = doc.createElement("div");
    Object.assign(fx.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "4", overflow: "hidden" });
    host.append(fx);
    const ring = doc.createElement("div");
    Object.assign(ring.style, { position: "absolute", left: c.x + "px", top: c.y + "px", width: "0", height: "0", borderRadius: "50%", border: `${Math.max(1.5, 2 * S)}px solid ${tone}`, transform: "translate(-50%, -50%)", opacity: "0" });
    fx.append(ring);
    let cursor = null;
    if (p.trigger === "cursor") {
      cursor = doc.createElement("div");
      const r = 16 * S;
      Object.assign(cursor.style, { position: "absolute", left: c.x - r + "px", top: c.y - r + "px", width: 2 * r + "px", height: 2 * r + "px", borderRadius: "50%", background: "var(--x-pointer)", border: `${2 * S}px solid var(--x-pointer-edge)`, boxShadow: "var(--x-shadow)", opacity: "0" });
      fx.append(cursor);
    }
    const tap = at + (p.trigger === "cursor" ? 0.3 : 0.05);
    // timing: each glyph starts when the ripple reaches it; the whole stream fits before `end`
    const dist = pos.map((q) => Math.hypot(q.x - c.x, q.y - c.y));
    const maxD = Math.max(1, ...dist);
    // the ripple's travel (at least half a second, so it reads), then each glyph's life fills what is left
    const avail = Math.max(1, end - tap - 0.15);
    const spread = Math.min(Math.max(0.5, maxD / (p.speed * S)), avail * 0.3);
    const life = ML.clamp(avail - spread, 0.8, 3.2);
    const start = dist.map((d) => tap + (d / maxD) * spread);
    const G = glyphs.map((g, i) => ({
      a0: Math.atan2(pos[i].y - c.y, pos[i].x - c.x),
      r0: Math.max(20 * S, dist[i]),
      spin: (0.8 + 0.6 * ML.rnd(i, 2)) * p.swirl * (rtl ? -1 : 1),
      // rises 100-300 px off the page, never past the top of the frame before the stream takes it
      lift: Math.min((100 + 200 * ML.rnd(i, 3)) * S, Math.max(30 * S, pos[i].y - 0.14 * H)),
      tumble: (ML.rnd(i, 4) < 0.5 ? -1 : 1) * 360 * (0.4 + 0.6 * ML.rnd(i, 5)),
      ph1: ML.rnd(i, 6) * 6.283, ph2: ML.rnd(i, 7) * 6.283,
      lane: (ML.rnd(i, 8) - 0.5) * 0.5, // spread across the stream
    }));
    const stream = p.direction === "up" ? { x: 0.25 * fwd, y: -1 } : { x: fwd, y: -0.1 };
    // a sideways stream sweeps across the frame's middle band, wherever the text sat
    const bandY = p.direction === "up" ? 0 : H * 0.42 - c.y;
    const reach = Math.hypot(W, H) * 0.9;
    // where a glyph is at age u (0..1 of its life), relative to the stage
    const at2 = (i, u) => {
      const q = G[i], e = u * u * (3 - 2 * u);
      const a = q.a0 + q.spin * Math.PI * e;
      const r = q.r0 * (1 - 0.55 * Math.sin(Math.PI * Math.min(1, e * 1.2)) * 0.6) + q.lift * 0.25 * e;
      let x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r * 0.5 - q.lift * Math.min(1, e * 2.2);
      y += bandY * Math.min(1, e * 1.3) * 0.8;
      // carried by the stream (accelerating), spread across its width, wobbled by seeded noise
      const s = Math.pow(u, 2.2) * reach;
      x += stream.x * s - stream.y * q.lane * s * 0.35 + 18 * S * Math.sin(u * 7 + q.ph1) * e;
      y += stream.y * s + stream.x * q.lane * s * 0.35 + 18 * S * Math.cos(u * 6 + q.ph2) * e;
      return { x, y };
    };
    // sparks: tiny dots trailing each glyph along its own path
    const sparks = [];
    if (p.sparks) glyphs.forEach((g, i) => { for (let k = 0; k < 2; k++) { const d = doc.createElement("i"); const r = (2 + 2 * ML.rnd(i, 10 + k)) * S; Object.assign(d.style, { position: "absolute", left: -r + "px", top: -r + "px", width: 2 * r + "px", height: 2 * r + "px", borderRadius: "50%", background: tone, boxShadow: `0 0 ${6 * S}px ${tone}`, opacity: "0" }); fx.append(d); sparks.push({ d, i, lag: 0.05 + 0.06 * k + 0.04 * ML.rnd(i, 20 + k) }); } });
    glyphs.forEach((g) => { g.style.willChange = "transform"; });
    ctx.sfx(tap, "swell", 0.4);
    if (p.trigger === "cursor") ctx.sfx(tap, "click", 0.3);
    return {
      draw(t) {
        dimEl.style.opacity = (p.dim * ML.ease(t, tap, tap + 0.8)).toFixed(4);
        const rp = ML.lin(t, tap, tap + spread + 0.3);
        ring.style.opacity = rp > 0 && rp < 1 ? ((1 - rp) * 0.8).toFixed(4) : "0";
        const rr = rp * (maxD + 60 * S) * 2;
        ring.style.width = ring.style.height = rr.toFixed(1) + "px";
        if (cursor) {
          const press = 1 - 0.25 * ML.pulse(t, tap, 0.06, 0.15);
          cursor.style.opacity = (ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, tap + 0.4, tap + 0.7))).toFixed(4);
          cursor.style.transform = `scale(${press.toFixed(4)})`;
        }
        glyphs.forEach((g, i) => {
          const u = (t - start[i]) / life;
          if (u <= 0) { g.style.transform = "none"; g.style.color = ""; g.style.textShadow = "none"; g.style.opacity = "1"; return; }
          const uu = Math.min(1, u);
          const q = at2(i, uu);
          const dx = q.x - pos[i].x, dy = q.y - pos[i].y;
          const col = ML.clamp(u / 0.18);
          const sc = 1 + 0.4 * ML.clamp(u / 0.5);
          const rot = G[i].tumble * Math.pow(uu, 1.2);
          g.style.color = `color-mix(in srgb, ${tone} ${(col * 100).toFixed(1)}%, ${base})`;
          g.style.textShadow = `0 0 ${(8 * S * col).toFixed(2)}px ${tone}`;
          g.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
          const off = q.x < -80 * S || q.x > W + 80 * S || q.y < -80 * S || q.y > H + 80 * S;
          g.style.opacity = u >= 1 || off ? "0" : (1 - ML.lin(uu, 0.82, 1)).toFixed(4);
        });
        for (const s of sparks) {
          const u = (t - start[s.i]) / life - s.lag;
          if (u <= 0.02 || u >= 1) { s.d.style.opacity = "0"; continue; }
          const q = at2(s.i, u);
          s.d.style.opacity = (0.9 * ML.clamp(u / 0.1) * (1 - ML.lin(u, 0.7, 1))).toFixed(4);
          s.d.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px)`;
        }
      },
    };
  },
});
