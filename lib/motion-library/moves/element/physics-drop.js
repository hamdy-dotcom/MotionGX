// Bodies fall, bounce and settle: 5–30 bodies of four sizes (r = 12 + (i % 4)·5, scaled to the region) drop under
// gravity, bounce off the walls (vx ·= −0.94) and a floor line (vy ·= −restitution), knock into each other and come to
// rest in a pile. Ported from the source's "matter" canvas painter: two rows of 7 starts
// (x = 40 + (i % 7)·max(32, (W − 80)/6), y = 35 + ⌊i / 7⌋·58), vx = (i % 3 − 1)·0.7, per 60 Hz step vy += gravity;
// floor at H − 30 − r; fill accent at alpha .28 + .45·(r / 32); a 1 px floor line at H − 31, alpha .22. To stay a pure
// function of t the whole run is simulated once in setup on a fixed 1/60 s step (seeded, no Math.random) and each frame
// reads its step — the source's rAF loop becomes a cached table. Added for a pile: circle–circle contacts and floor
// friction, and the bounce dies away over the run so bodies are truly at rest before the end whatever its length; a run
// under 3 s plays the simulation faster so they still land. Drops: rows (all at once), beats (one by one), burst (thrown
// up from the top centre). Bodies: auto (a logo target → logos, a list target → its own items falling as pills, else
// circles), circles, boxes, pills, logos (the scene's logo drawn in each), icons, stats (pills carrying the `labels`, or
// the list's items; with neither they stay blank bars — this move never invents a figure). A scripted pointer can grab
// and fling one body (fling). Mirrored in Arabic.
// Source: MengTo/Skills web-design/matterjs/demo/index.html (MIT: the "matter" canvas mode; same painter in the
// blue-laser / framed-tech / tailwindcss / css-alpha-masking / staggered-word-reveal demos).
ML.define({
  id: "element.physics-drop",
  category: "element",
  name: "Bodies fall, bounce and settle",
  does: "A handful of shapes, icons or logos of a few sizes fall under gravity, bounce off the walls and a floor line, and come to rest in a pile.",
  says: ["playful", "energy", "arrival", "result", "celebration", "scale"],
  energy: 3,
  targets: ["shape", "logo", "list", "stage"],
  duration: [1.5, 5],
  params: {
    count: { type: "number", range: [5, 30], default: 14 },
    shape: { type: "choice", options: ["auto", "circles", "boxes", "pills", "logos", "icons", "stats"], default: "auto" },
    labels: { type: "text", default: "" },
    gravity: { type: "number", range: [0.08, 0.3], default: 0.16 },
    restitution: { type: "number", range: [0.3, 0.85], default: 0.78 },
    drop: { type: "choice", options: ["rows", "beats", "burst"], default: "rows" },
    fling: { type: "bool", default: false },
    floor: { type: "bool", default: true },
  },
  pairs: ["element.ball-bounce", "text-in.punchline", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "MengTo/Skills:web-design/matterjs", license: "MIT", note: "demo/index.html 'matter' canvas mode ported, simulated once on a fixed step so every frame is a function of t" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const own = el && el !== stage ? el : null;
    let A = f.pic;
    if (own) { const b = ctx.box(own); if (b.w > f.W * 0.4 && b.h > f.H * 0.2) A = b; }
    if (!own && el === stage) A = f.safe;
    const cv = doc.createElement("canvas");
    cv.style.cssText = `position:absolute;left:${A.x}px;top:${A.y}px;width:${A.w}px;height:${A.h}px;pointer-events:none;z-index:8;`;
    host.append(cv);
    const W = Math.max(40, Math.round(A.w)), H = Math.max(40, Math.round(A.h));
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const color = (v) => { const s = doc.createElement("span"); s.style.color = v; host.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const accent = color("var(--x-accent)"), accent2 = color("var(--x-accent-2)"), ink = color("var(--x-ink)"), panel = color("var(--x-panel)"), aink = color("var(--x-accent-ink)"), edge = color("var(--x-line)"), pointer = color("var(--x-pointer)"), pedge = color("var(--x-pointer-edge)");
    const font = getComputedStyle(host).getPropertyValue("--x-head-font").trim() || "sans-serif";
    const weight = getComputedStyle(host).getPropertyValue("--x-head-weight").trim() || "700";
    // what falls: the target decides when the shape is left on auto; a list's own items fall in its place
    const ownIsPic = own && (/^(svg|img)$/i.test(own.tagName) || own.dataset.slot === "logo");
    const items = own && !ownIsPic && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const shape = p.shape !== "auto" ? p.shape : ownIsPic ? "logos" : items.length ? "stats" : "circles";
    const given = String(p.labels || "").split(/[,،|]/).map((x) => x.trim()).filter(Boolean);
    const labels = given.length ? given : shape === "stats" ? items : [];
    const fromList = shape === "stats" && !given.length && items.length > 0;
    const pillish = shape === "pills" || shape === "stats";

    // the logo, rasterised once (its look colours inlined so the picture keeps them)
    let logoImg = null;
    if (shape === "logos") {
      const L = own && /^(svg|img)$/i.test(own.tagName) ? own : host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
      try {
        if (L && L.tagName.toLowerCase() === "img") logoImg = L;
        else if (L) {
          const c = L.cloneNode(true), src = [L, ...L.querySelectorAll("*")], dst = [c, ...c.querySelectorAll("*")];
          src.forEach((e, i) => { const cs = getComputedStyle(e); dst[i].setAttribute("style", `fill:${cs.fill};stroke:${cs.stroke};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};font-size:${cs.fontSize};opacity:${cs.opacity}`); });
          c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const im = new Image(); im.src = "data:image/svg+xml;utf8," + encodeURIComponent(new XMLSerializer().serializeToString(c));
          await im.decode(); logoImg = im;
        }
      } catch (e) { logoImg = null; }
    }

    // ── the simulation, once, on a fixed 60 Hz step ──
    const n = fromList ? labels.length : Math.round(ML.clamp(p.count, 5, 30));
    const s = Math.min(W, H * 1.4) / 480; // the source's px at a ~480 px canvas
    const G = ML.clamp(p.gravity, 0.08, 0.3) * s, E = ML.clamp(p.restitution, 0.3, 0.85);
    const floorY = H - 30 * s * (p.floor ? 1 : 0.2);
    const mir = (x) => (rtl ? W - x : x);
    const span = Math.max(1, end - at);
    // the run's seconds → simulation steps: a short run plays it faster, so bodies still land and settle
    const rate = 60 * Math.max(1, 3 / span), steps = Math.ceil((span + 0.1) * rate);
    const B = Array.from({ length: n }, (_, i) => {
      const r = fromList ? 40 * s : (12 + (i % 4) * 5) * s * (shape === "stats" ? 1.35 : shape === "logos" ? 1.4 : 1); // a list's items are read: all one large size
      let x, y, vx, vy = 0, rel = 0;
      if (p.drop === "burst") { x = W / 2 + (ML.rnd(i, 1) - 0.5) * 60 * s; y = 35 * s; vx = (ML.rnd(i, 2) - 0.5) * 7 * s; vy = -(1.5 + ML.rnd(i, 3) * 3) * s; }
      else { x = 40 * s + (i % 7) * Math.max(32 * s, (W - 80 * s) / 6); y = 35 * s + Math.floor(i / 7) * 58 * s; vx = ((i % 3) - 1) * 0.7 * s; }
      if (p.drop === "beats") { x = W * (0.2 + 0.6 * ML.rnd(i, 4)); y = -r; rel = Math.round((i * Math.min(0.25, (span * 0.55) / n)) * rate); }
      x = ML.clamp(x, r, W - r);
      return { r, x: mir(x), y, vx: rtl ? -vx : vx, vy, rel, a: ML.rnd(i, 5) * 6.28, hit: false };
    });
    // the fling: a pointer comes in, grabs body 0 and throws it up and across
    const grabS = Math.round(span * 0.55 * rate), holdS = 24;
    const tab = new Float32Array(steps * n * 3);
    const hits = [];
    const freeze = Math.round(steps * 0.9);
    for (let k = 0; k < steps; k++) {
      // the rest: the bounce fades from 40% to 70% of the run, the last speed bleeds off, then the pile holds still
      if (k > freeze) { for (let i = 0; i < n * 3; i++) tab[k * n * 3 + i] = tab[(k - 1) * n * 3 + i]; continue; }
      const prog = k / steps, Ek = E * (1 - ML.clamp((prog - 0.4) / 0.3)), calm = prog > 0.75 ? 0.92 : 1;
      for (let i = 0; i < n; i++) {
        const b = B[i];
        if (k < b.rel) continue;
        if (p.fling && i === 0 && k >= grabS && k < grabS + holdS) {
          // carried along an arc
          const u = (k - grabS) / holdS, fx = b.gx + (rtl ? -1 : 1) * W * 0.25 * u, fy = b.gy - H * 0.35 * Math.sin(u * Math.PI * 0.5);
          b.vx = fx - b.x; b.vy = fy - b.y; b.x = fx; b.y = fy;
          continue;
        }
        if (p.fling && i === 0 && k === grabS - 1) { b.gx = b.x; b.gy = b.y; }
        b.vy += G; b.vx *= calm; if (Math.abs(b.vy) < 2 * s) b.vy *= calm; b.x += b.vx; b.y += b.vy;
        if (b.x < b.r || b.x > W - b.r) { b.vx *= -0.94; b.x = ML.clamp(b.x, b.r, W - b.r); }
        if (b.y > floorY - b.r) {
          if (!b.hit && b.vy > 2 * s) { b.hit = true; hits.push(k); }
          b.y = floorY - b.r; b.vy *= -Ek; b.vx *= 0.97;
          if (Math.abs(b.vy) < 0.6 * s) b.vy = 0;
        }
        b.a += b.vx / b.r;
      }
      // contacts between bodies (equal mass): push apart, exchange the normal speed with restitution
      for (let it = 0; it < 2; it++) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = B[i], c = B[j];
        if (k < a.rel || k < c.rel) continue;
        const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1e-6, o = a.r + c.r - d;
        if (o <= 0) continue;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * o / 2; a.y -= ny * o / 2; c.x += nx * o / 2; c.y += ny * o / 2;
        const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (vn < 0) { const j2 = (-(1 + Ek * 0.5) * vn) / 2; a.vx -= j2 * nx; a.vy -= j2 * ny; c.vx += j2 * nx; c.vy += j2 * ny; }
        a.vx *= 0.995; c.vx *= 0.995;
      }
      for (let i = 0; i < n; i++) { const b = B[i]; b.x = ML.clamp(b.x, b.r, W - b.r); b.y = Math.min(b.y, floorY - b.r); const o = (k * n + i) * 3; tab[o] = b.x; tab[o + 1] = b.y; tab[o + 2] = k < b.rel ? NaN : b.a; }
    }
    // about one sound per beat: the first floor hits, at least 0.22 s apart
    let last = -1;
    for (const k of hits) { const t = at + k / rate; if (t - last >= 0.22) { ctx.sfx(t, "drop", 0.3); last = t; } }
    if (p.fling) ctx.sfx(at + grabS / rate, "click", 0.3);
    // each pill's type, fitted once: pills are as wide as their body allows
    const fontOf = (i, w, h) => { const txt = labels[i % labels.length]; let fs = h * 0.5; g.font = `${weight} ${fs}px ${font}`; const tw = g.measureText(txt).width; if (tw > w * 0.84) fs *= (w * 0.84) / tw; return `${weight} ${fs.toFixed(1)}px ${font}`; };
    const fonts = labels.length ? B.map((b, i) => fontOf(i, b.r * 2.6, b.r * 1.7)) : [];
    const glyphs = [(x, y, r) => { g.moveTo(x - r * 0.4, y); g.lineTo(x - r * 0.1, y + r * 0.3); g.lineTo(x + r * 0.45, y - r * 0.35); }, (x, y, r) => { g.moveTo(x - r * 0.4, y); g.lineTo(x + r * 0.4, y); g.moveTo(x, y - r * 0.4); g.lineTo(x, y + r * 0.4); }, (x, y, r) => { g.moveTo(x - r * 0.35, y + r * 0.3); g.lineTo(x, y - r * 0.35); g.lineTo(x + r * 0.35, y + r * 0.3); }];
    const rr = (x, y, w, h, rad) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, rad); else g.rect(x, y, w, h); };
    const outA = Math.max(at + 1, end - 0.35);

    return {
      draw(t) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.clearRect(0, 0, W, H);
        const vis = t >= at - 1e-6;
        cv.style.visibility = vis ? "visible" : "hidden";
        if (fromList) own.style.visibility = vis ? "hidden" : ""; // its items are the ones falling
        if (!vis) return;
        const o = ML.lin(t, at, at + 0.15) * (1 - ML.ease(t, outA, outA + 0.35));
        const k = ML.clamp(Math.floor((t - at) * rate), 0, steps - 1);
        if (p.floor) { g.globalAlpha = 0.22 * o; g.fillStyle = accent; g.fillRect(0, floorY - 1, W, Math.max(1, s * 0.6)); }
        for (let i = 0; i < n; i++) {
          const q = (k * n + i) * 3, x = tab[q], y = tab[q + 1], a = tab[q + 2];
          if (Number.isNaN(a)) continue;
          const r = B[i].r, alpha = 0.28 + 0.45 * (r / (32 * s));
          g.save(); g.translate(x, pillish ? y + r * 0.1 : y); // a pill is flatter than its body: it rests on the floor, not above it
          if (shape === "circles") { g.globalAlpha = alpha * o; g.fillStyle = accent; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
          else if (shape === "boxes") { g.rotate(a * 0.15 + (ML.rnd(i, 6) - 0.5) * 0.5); g.globalAlpha = alpha * o; g.fillStyle = i % 3 ? accent : accent2; rr(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.3); g.fill(); }
          else if (pillish) {
            g.rotate((ML.rnd(i, 7) - 0.5) * 0.2);
            const w = r * 2.6, h = r * 1.7;
            g.globalAlpha = o; g.fillStyle = shape === "pills" && !labels.length ? (i % 2 ? accent : accent2) : panel; rr(-w / 2, -h / 2, w, h, h / 2); g.fill();
            if (shape === "stats" || labels.length) {
              g.strokeStyle = edge; g.lineWidth = Math.max(1, s); g.stroke(); g.fillStyle = i % 2 ? accent : ink;
              if (labels.length) { const txt = labels[i % labels.length]; g.font = fonts[i]; g.textAlign = "center"; g.textBaseline = "middle"; g.direction = ML.ARABIC.test(txt) ? "rtl" : "ltr"; g.fillText(txt, 0, h * 0.04); }
              else { g.globalAlpha = o * 0.45; rr(-w * 0.28, -h * 0.08, w * 0.56, h * 0.16, h * 0.08); g.fill(); } // no figure given: a blank bar, never an invented number
            }
          } else if (shape === "logos") {
            g.rotate(a);
            g.globalAlpha = o; g.fillStyle = panel; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = edge; g.lineWidth = Math.max(1, s); g.stroke();
            if (logoImg && (logoImg.naturalWidth || logoImg.width)) { const iw = logoImg.naturalWidth || logoImg.width, ih = logoImg.naturalHeight || logoImg.height, sc = Math.min((r * 1.5) / iw, (r * 1.5) / ih, 1); g.drawImage(logoImg, (-iw * sc) / 2, (-ih * sc) / 2, iw * sc, ih * sc); }
            else { g.fillStyle = accent; rr(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9, r * 0.25); g.fill(); }
          } else {
            g.rotate(a);
            g.globalAlpha = (0.55 + 0.45 * (r / (32 * s))) * o; g.fillStyle = i % 2 ? accent : accent2; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
            g.globalAlpha = o; g.strokeStyle = aink; g.lineWidth = Math.max(1.5, r * 0.14); g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); glyphs[i % glyphs.length](0, 0, r); g.stroke();
          }
          g.restore();
        }
        // the pointer: in from the corner, grab, throw, rest
        if (p.fling) {
          const kg = grabS, sx = rtl ? W * 0.05 : W * 0.95, sy = H * 0.1;
          let px = null, py = null;
          const tg = at + kg / rate;
          if (t >= tg - 0.6 && kg + holdS < steps) {
            const tgt = { x: tab[((kg - 1) * n) * 3], y: tab[((kg - 1) * n) * 3 + 1] };
            if (t < tg) { const u = ML.ease(t, tg - 0.6, tg); px = sx + (tgt.x - sx) * u; py = sy + (tgt.y - sy) * u; }
            else if (k < kg + holdS) { const q = (k * n) * 3; px = tab[q]; py = tab[q + 1]; }
            else { const q = ((kg + holdS - 1) * n) * 3; px = tab[q]; py = tab[q + 1]; }
          }
          if (px != null) {
            const ps = 26 * s * 0.8, press = k >= kg && k < kg + holdS ? 0.9 : 1;
            g.save(); g.translate(px, py); g.scale(press, press); g.globalAlpha = o * (1 - ML.lin(k, kg + holdS + 12, kg + holdS + 40)); // it lets go and leaves
            g.beginPath(); g.moveTo(0, 0); g.lineTo(0, ps); g.lineTo(ps * 0.28, ps * 0.75); g.lineTo(ps * 0.5, ps * 1.1); g.lineTo(ps * 0.62, ps * 1.04); g.lineTo(ps * 0.42, ps * 0.7); g.lineTo(ps * 0.75, ps * 0.7); g.closePath();
            g.fillStyle = pointer; g.fill(); g.strokeStyle = pedge; g.lineWidth = Math.max(1, s); g.stroke(); g.restore();
          }
        }
        g.globalAlpha = 1;
      },
    };
  },
});
