// Particles assemble into a shape: a fixed seeded pool of 800–4000 glowing particles (1–4 px) streams in and condenses
// into a target —
//  · icon: points along an SVG icon's strokes (getPointAtLength) plus brighter nodes joined by faint lines;
//  · logo: the scene's logo (or the target picture) sampled on a 4–6 px grid;
//  · dot-matrix: a halftone — dots in grid slots around the mark, the mark itself knocked out and left empty;
//  · text / word: the glyphs of the headline (or its first word) where they are laid out (whole words: Arabic stays
//    joined).
// Assemble: per-particle delay 0–0.4 s (text: by line, top first), 0.75 s on power3.inOut, a curl-noise offset that
// decays to 0. phases "rings" adds the choreography first: a rotating arc (0.4 s) → two concentric rings r 70 / 150
// (0.5 s) → collapse to a noisy disc (0.4 s power3.in) → the target (0.5 s expo.out). On arrival (90%) the solid
// crossfades in over 0.2 s with a glow (the real logo / text, or the icon's stroke), snap_grid snaps the swarm into
// mosaic squares, and a few larger squares detach and drift. Idle: the shape breathes 1 ± 0.02, particles jitter
// 0.5 px. disperse: from the solid, each particle flies to a seeded direction 80–300 px in 0.8 s power3.out with
// jitter, fading. reform: shape → a noisy ellipse cloud (0.5 s power2.in) → the next shape (0.9 s expo.out).
// Origins: left / right (streams in from that edge; mirrored in Arabic), scatter, rings, image (from inside the target
// box). Additive glow on dark looks. Painted per frame from t only. target "auto" takes the slot it was given (a logo or
// picture → logo, text → text, nothing → icon). Every choreography compresses to fit a short run; a crisp target (logo,
// text) replaces the swarm once it has crossfaded in, unless snap_grid keeps the mosaic as the final picture.
// Sources: prompt-motion robvjourney-opus-5-5-is-cooking, motiondsgnr-yo-opus-5-5-raw, madhav-xo-pretty-cool-with-just,
// manuelogomigo-i-gave-claude-opus, jayscambler-credit-to-opus-5-5, kyonax-on-tech-yes-i-also-did,
// bogdandragomir-this-was-made-entirely (reference only — our own canvas rebuild).
ML.define({
  id: "element.particle-assemble",
  category: "element",
  name: "Particles assemble into a shape",
  does: "A cloud of glowing dots streams in and condenses into an icon, logo, dot-matrix mark or lines of text - or the shape bursts back into drifting dust and reforms as the next one.",
  says: ["change", "reveal", "tech", "brand", "connection", "arrival", "energy", "transition", "flow"],
  energy: 4,
  targets: ["logo", "shape", "stage", "image", "screen"],
  duration: [1.2, 3.5],
  params: {
    direction: { type: "choice", options: ["assemble", "disperse", "reform"], default: "assemble" },
    target: { type: "choice", options: ["auto", "icon", "logo", "dot-matrix", "text", "word"], default: "auto" },
    count: { type: "number", range: [800, 4000], default: 1500 },
    origin: { type: "choice", options: ["left", "right", "scatter", "rings", "image"], default: "scatter" },
    snap_grid: { type: "bool", default: false },
    phases: { type: "choice", options: ["direct", "rings"], default: "direct" },
    icon: { type: "choice", options: ["bolt", "check", "star", "heart"], default: "bolt" },
    seed: { type: "number", range: [1, 99], default: 7 },
  },
  pairs: ["text-in.particle-assemble", "element.particle-sphere", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:robvjourney-opus-5-5-is-cooking", license: "reference", note: "also motiondsgnr, madhav-xo, manuelogomigo, jayscambler, kyonax, bogdandragomir; our own canvas rebuild" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, S0 = p.seed;
    const R = (i, j) => ML.rnd(i + S0 * 7.13, j);
    const own = el && el !== stage ? el : null;
    const cv = doc.createElement("canvas");
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:9;`;
    host.append(cv);
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const color = (v) => { const s = doc.createElement("span"); s.style.color = v; host.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const accent = color("var(--x-accent)"), accent2 = color("var(--x-accent-2)");
    const lum = (() => { g.fillStyle = color("var(--x-ground)"); g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; g.clearRect(0, 0, 1, 1); return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255; })();
    const additive = lum < 0.4;

    // ── where the shape goes ──
    const ob = own ? ctx.box(own) : null;
    const small = !ob || Math.max(ob.w, ob.h) < Math.min(W, H) * 0.3;
    const side = Math.min(f.pic.w, f.pic.h) * 0.62;
    const sq = small ? { x: W / 2 - side / 2, y: f.pic.y + f.pic.h / 2 - side / 2, w: side, h: side } : { x: ob.x + ob.w / 2 - Math.min(ob.w, ob.h) * 0.4, y: ob.y + ob.h / 2 - Math.min(ob.w, ob.h) * 0.4, w: Math.min(ob.w, ob.h) * 0.8, h: Math.min(ob.w, ob.h) * 0.8 };
    const ICONS = {
      bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
      check: "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M7.5 12.5l3 3 6-6.5",
      star: "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z",
      heart: "M12 20.5S3 15 3 8.8A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 9 2.3C21 15 12 20.5 12 20.5z",
    };
    const off = doc.createElement("canvas"); off.width = W; off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    // sample the filled pixels of `off` inside a box on a grid; returns [[x, y], …]
    const sampleFilled = (bx, step) => {
      const x0 = Math.max(0, Math.floor(bx.x)), y0 = Math.max(0, Math.floor(bx.y)), w = Math.min(W - x0, Math.ceil(bx.w)), h = Math.min(H - y0, Math.ceil(bx.h));
      if (w <= 0 || h <= 0) return [];
      const d = o.getImageData(x0, y0, w, h).data, out = [];
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 120) out.push([x0 + x, y0 + y]);
      return out;
    };
    const fitStep = (count, area) => ML.clamp(Math.sqrt(area / Math.max(1, count)), 2, 8 * k + 2);
    const iconPath = (name) => {
      const svg = doc.createElementNS(NS, "svg"); svg.style.cssText = "position:absolute;width:0;height:0;visibility:hidden;";
      const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", ICONS[name] || ICONS.bolt); svg.append(pa); host.append(svg);
      return { pa, svg };
    };
    const sc = sq.w / 24, mapX = (x) => sq.x + x * sc, mapY = (y) => sq.y + y * sc;
    const N0 = Math.round(ML.clamp(p.count, 800, 4000));

    // a target: { pts: [[x, y]], nodes: [[x, y]], solid(alpha) draws the crisp shape, el: a real element to crossfade, cell }
    async function build(kind, iconName) {
      if (kind === "icon") {
        const { pa, svg } = iconPath(iconName);
        const L = pa.getTotalLength(), m = Math.max(80, Math.min(N0, 1400)), pts = [], nodes = [];
        for (let i = 0; i < m; i++) { const q = pa.getPointAtLength((i / m) * L); pts.push([mapX(q.x), mapY(q.y)]); }
        for (let i = 0; i < 14; i++) { const q = pa.getPointAtLength((i / 14) * L); nodes.push([mapX(q.x), mapY(q.y)]); }
        svg.remove();
        const P2 = new Path2D(ICONS[iconName] || ICONS.bolt);
        return { pts, nodes, cell: 4 * k + 2, solid: (a) => { g.save(); g.globalAlpha = a; g.translate(sq.x, sq.y); g.scale(sc, sc); g.lineWidth = 1.05; g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = accent; g.shadowColor = accent; g.shadowBlur = 20 * k; g.stroke(P2); g.restore(); } };
      }
      if (kind === "dot-matrix") {
        o.clearRect(0, 0, W, H);
        o.save(); o.translate(sq.x, sq.y); o.scale(sc, sc); o.lineWidth = 3.2; o.lineJoin = "round"; o.lineCap = "round"; o.strokeStyle = "#000"; o.fillStyle = "#000"; const P2 = new Path2D(ICONS[iconName] || ICONS.bolt); o.stroke(P2); if (iconName !== "check") o.fill(P2); o.restore();
        const pad = sq.w * 0.12, bx = { x: sq.x - pad, y: sq.y - pad, w: sq.w + pad * 2, h: sq.h + pad * 2 };
        const cell = Math.max(4 * k * 1.4, bx.w / 64), d = o.getImageData(Math.floor(bx.x), Math.floor(bx.y), Math.ceil(bx.w), Math.ceil(bx.h)).data, bw = Math.ceil(bx.w);
        const pts = [];
        for (let y = cell / 2; y < bx.h; y += cell) for (let x = cell / 2; x < bx.w; x += cell) {
          const rr = Math.hypot(x - bx.w / 2, y - bx.h / 2); if (rr > bx.w / 2) continue; // a round badge of dots
          if (d[(Math.floor(y) * bw + Math.floor(x)) * 4 + 3] > 60) continue; // the knock-out
          pts.push([bx.x + x, bx.y + y]);
        }
        return { pts, nodes: [], cell, square: true, solid: null };
      }
      if (kind === "logo") {
        let L = own && (/^(svg|img)$/i.test(own.tagName) || own.querySelector("svg, img")) ? own : host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
        if (L && !/^(svg|img)$/i.test(L.tagName)) L = L.querySelector("svg, img");
        if (!L) return build("icon", iconName);
        const b = ctx.box(L);
        let img = L;
        if (L.tagName.toLowerCase() !== "img") {
          const c = L.cloneNode(true), src = [L, ...L.querySelectorAll("*")], dst = [c, ...c.querySelectorAll("*")];
          src.forEach((e, i) => { const cs = getComputedStyle(e); dst[i].setAttribute("style", `fill:${cs.fill};stroke:${cs.stroke};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};font-size:${cs.fontSize};opacity:${cs.opacity}`); });
          c.setAttribute("xmlns", NS); c.setAttribute("width", b.w); c.setAttribute("height", b.h);
          img = new Image(); img.src = "data:image/svg+xml;utf8," + encodeURIComponent(new XMLSerializer().serializeToString(c));
          try { await img.decode(); } catch (e) { return build("icon", iconName); }
        }
        o.clearRect(0, 0, W, H); o.drawImage(img, b.x, b.y, b.w, b.h);
        // a picture from another origin can't be read back: the icon stands in rather than the film failing
        let pts; try { pts = sampleFilled(b, 2); } catch (e) { return build("icon", iconName); }
        const step = Math.max(1, Math.floor(pts.length / Math.min(N0, 2400)));
        pts = pts.filter((_, i) => i % step === 0);
        return { pts, nodes: [], cell: Math.max(3, fitStep(pts.length, b.w * b.h)), el: L, area: b.w * b.h, solid: null };
      }
      // text / word
      let T = own && !/^(svg|img)$/i.test(own.tagName) && (own.textContent || "").trim() ? own : host.querySelector(".ml-title");
      if (!T) return build("icon", iconName);
      let units = ML.split(T, "words");
      if (kind === "word") units = units.slice(0, 1);
      o.clearRect(0, 0, W, H); o.fillStyle = "#000";
      const boxes = units.map((w) => {
        const cs = getComputedStyle(w), b = ctx.box(w);
        o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; o.direction = rtl ? "rtl" : "ltr"; o.textAlign = rtl ? "right" : "left"; o.textBaseline = "alphabetic";
        if ("letterSpacing" in o) o.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        const txt = cs.textTransform === "uppercase" ? w.textContent.toUpperCase() : w.textContent;
        const m = o.measureText(txt), fs = parseFloat(cs.fontSize), asc = m.fontBoundingBoxAscent || fs * 0.8, desc = m.fontBoundingBoxDescent || fs * 0.2;
        o.fillText(txt, rtl ? b.x + b.w : b.x, b.y + (b.h - (asc + desc)) / 2 + asc);
        return b;
      });
      const bb = boxes.reduce((a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), r: Math.max(a.r, b.x + b.w), btm: Math.max(a.btm, b.y + b.h) }), { x: 1e9, y: 1e9, r: -1e9, btm: -1e9 });
      const area = { x: bb.x, y: bb.y, w: bb.r - bb.x, h: bb.btm - bb.y };
      let pts = sampleFilled(area, 2);
      const step = Math.max(1, Math.floor(pts.length / Math.min(N0, 3000)));
      pts = pts.filter((_, i) => i % step === 0);
      return { pts, nodes: [], cell: 4 * k + 1, el: kind === "word" ? units[0] : T, text: true, area: area.w * area.h, solid: null };
    }

    const NEXT = { bolt: "star", check: "heart", star: "check", heart: "bolt" };
    const kind = p.target !== "auto" ? p.target : own && (/^(svg|img)$/i.test(own.tagName) || own.querySelector("svg, img")) ? "logo" : own && (own.textContent || "").trim() ? "text" : "icon";
    const T1 = await build(kind, p.icon);
    const T2 = p.direction === "reform" ? await build(kind === "icon" || kind === "dot-matrix" ? kind : "icon", kind === "icon" || kind === "dot-matrix" ? NEXT[p.icon] : p.icon) : null;
    if (!T1.pts.length) T1.pts.push([W / 2, H / 2]);
    if (T2 && !T2.pts.length) T2.pts.push([W / 2, H / 2]);
    // a dot-matrix needs a particle in every slot of its grid: the pool grows to fill it
    const n = Math.round(ML.clamp(Math.max(N0, T1.square ? T1.pts.length : 0, T2 && T2.square ? T2.pts.length : 0), 800, 4000));
    const cen = (T) => { let x = 0, y = 0; for (const q of T.pts) { x += q[0]; y += q[1]; } return [x / T.pts.length, y / T.pts.length]; };
    const [cx, cy] = cen(T1);
    const ext = T1.pts.reduce((a, q) => Math.max(a, Math.hypot(q[0] - cx, q[1] - cy)), 1);

    // ── the pool ──
    const tA = new Float32Array(n * 2), tB = new Float32Array(n * 2), org = new Float32Array(n * 2), del = new Float32Array(n), sz = new Float32Array(n), ph = new Float32Array(n);
    const yMin = T1.pts.reduce((a, q) => Math.min(a, q[1]), 1e9), yMax = T1.pts.reduce((a, q) => Math.max(a, q[1]), -1e9);
    const lead = rtl ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const q = T1.pts[Math.floor(R(i, 1) * T1.pts.length) % T1.pts.length], extra = i >= T1.pts.length ? 1 : 0;
      // every target point gets at least one particle when there are enough; fewer particles than points thin the whole
      // shape evenly (the points are in scan order: taking the first n would draw only its top)
      const qq = T1.pts.length > n ? T1.pts[Math.floor((i * T1.pts.length) / n)] : i < T1.pts.length ? T1.pts[i] : q;
      tA[i * 2] = qq[0] + extra * (R(i, 2) - 0.5) * 2; tA[i * 2 + 1] = qq[1] + extra * (R(i, 3) - 0.5) * 2;
      if (T2) { const b = T2.pts[T2.pts.length > n ? Math.floor((i * T2.pts.length) / n) : i < T2.pts.length ? i : Math.floor(R(i, 4) * T2.pts.length) % T2.pts.length]; tB[i * 2] = b[0]; tB[i * 2 + 1] = b[1]; }
      let ox, oy;
      const og = p.origin === "left" || p.origin === "right" ? ((p.origin === "left") !== rtl ? -1 : 1) : 0;
      if (og) { ox = og < 0 ? -R(i, 5) * W * 0.35 - 20 : W + R(i, 5) * W * 0.35 + 20; oy = cy + (R(i, 6) - 0.5) * H * 0.7; }
      else if (p.origin === "rings") { const a = R(i, 5) * Math.PI * 2, rr = (i % 2 ? 1.6 : 2.4) * ext + (R(i, 6) - 0.5) * 20 * k; ox = cx + Math.cos(a) * rr; oy = cy + Math.sin(a) * rr; }
      else if (p.origin === "image" && ob) { ox = ob.x + R(i, 5) * ob.w; oy = ob.y + R(i, 6) * ob.h; }
      else { ox = -W * 0.1 + R(i, 5) * W * 1.2; oy = -H * 0.1 + R(i, 6) * H * 1.2; }
      org[i * 2] = ox; org[i * 2 + 1] = oy;
      del[i] = T1.text ? 0.4 * ((qq[1] - yMin) / Math.max(1, yMax - yMin)) + R(i, 7) * 0.05 : og ? 0.4 * ML.clamp((og < 0 ? qq[0] - (cx - ext) : cx + ext - qq[0]) / (2 * ext)) : R(i, 7) * 0.4;
      // finer dots on a small target (a logo in a corner would turn to mud under 6 px dots)
      sz[i] = (1 + R(i, 8) * (R(i, 9) < 0.15 ? 3 : 1.5)) * Math.max(1, k * 1.7) * (T1.area ? ML.clamp(Math.sqrt(T1.area) / (420 * k), 0.4, 1) : 1);
      ph[i] = R(i, 10) * 6.28;
    }
    // a few larger squares that detach and drift after arrival
    const loose = Array.from({ length: 8 }, (_, j) => { const i = Math.floor(R(j, 20) * n); const a = R(j, 21) * Math.PI * 2; return { i, dx: Math.cos(a), dy: Math.sin(a), s: (4 + R(j, 22) * 4) * k * 1.3 }; });

    const p3io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), p3o = (x) => 1 - Math.pow(1 - x, 3), p3i = (x) => x * x * x, p2i = (x) => x * x, ex = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
    const ring = p.phases === "rings" && p.direction === "assemble";
    const D = 0.75, arrive = ring ? at + 1.8 : at + 0.4 + D; // all landed
    const solidT = ring ? at + 1.7 : at + 0.4 + D * 0.9;
    // disperse / reform times
    const disT = at + 0.35, refA = at + 0.45, refB = refA + 0.5, refEnd = refB + 0.9 + 0.2;
    const outA = Math.max(at + 1, end - 0.35);
    // the choreography's own seconds, played faster when the run is shorter than it needs
    const need = ring ? 2 : p.direction === "reform" ? 2.05 : p.direction === "disperse" ? 1.15 : 1.35;
    const tk = ML.clamp((end - at - 0.35) / need, 0.3, 1), real = (x) => at + (x - at) * tk;
    const realEl = T1.el && T1.el !== stage ? T1.el : null;
    if (p.direction === "assemble") { ctx.sfx(at, "riser", 0.25); ctx.sfx(real(solidT), "swell", 0.35); }
    else if (p.direction === "disperse") ctx.sfx(real(disT), "whoosh.soft", 0.35);
    else { ctx.sfx(real(refA), "whoosh.soft", 0.3); ctx.sfx(real(refB + 0.6), "swell", 0.3); }
    // curl-ish noise: a divergence-free swirl from two sines
    const curl = (x, y, t, i) => { const a = Math.sin(y * 0.012 + t * 1.7 + ph[i]) + Math.cos(x * 0.009 - t * 1.3); return [Math.cos(a * 2.2), Math.sin(a * 2.2)]; };
    const cell = Math.max(3, T1.cell || 4);
    const snap = p.snap_grid && p.direction !== "disperse";
    const glowEl = realEl && p.direction === "assemble" && !snap;

    return {
      draw(t0) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
        g.shadowBlur = 0;
        g.clearRect(0, 0, W, H);
        const vis = t0 >= at - 1e-6 && t0 <= outA + 0.5;
        cv.style.visibility = vis ? "visible" : "hidden";
        const fadeOut = 1 - ML.ease(t0, outA, outA + 0.35);
        const t = at + (t0 - at) / tk;
        // the real element: hidden until the particles land (assemble), shown then gone (disperse)
        if (realEl) {
          let a = 1;
          if (p.direction === "assemble") a = snap ? 0 : ML.lin(t, solidT, solidT + 0.2);
          else if (p.direction === "disperse") a = 1 - ML.lin(t, disT, disT + 0.15);
          else a = 1 - ML.lin(t, refA - 0.05, refA + 0.1);
          if (t < at) a = p.direction === "assemble" ? 0 : 1;
          realEl.style.opacity = a.toFixed(4);
          // the arrival's glow, gone again in half a second
          if (glowEl) { const gl = ML.lin(t, solidT, solidT + 0.2) * (1 - ML.ease(t, solidT + 0.2, solidT + 0.7)); realEl.style.filter = gl > 0.004 ? `drop-shadow(0 0 ${(20 * k * gl).toFixed(2)}px ${accent})` : "none"; }
        }
        if (!vis) return;
        if (additive) g.globalCompositeOperation = "lighter";
        const tt = t - at;
        // idle comes up slowly after the arrival, so nothing jumps when a particle lands
        const idle = ML.lin(t, p.direction === "reform" ? refEnd : arrive, (p.direction === "reform" ? refEnd : arrive) + 0.5);
        const breathe = 1 + 0.02 * idle * Math.sin(tt * 2.2);
        // a crisp target takes over: the swarm clears once it has crossfaded in
        const clear = realEl && p.direction === "assemble" && !snap ? 1 - ML.lin(t, solidT + 0.1, solidT + 0.4) : 1;
        const partAlpha = fadeOut * clear * ML.lin(t, at, at + 0.15);
        for (let pass = 0; pass < 2; pass++) {
          g.fillStyle = pass ? accent2 : accent;
          for (let i = pass; i < n; i += 2) {
            let x, y, a = partAlpha, e;
            const ax = tA[i * 2], ay = tA[i * 2 + 1];
            if (p.direction === "assemble") {
              const ox = org[i * 2], oy = org[i * 2 + 1];
              if (ring) {
                // arc → rings → noisy disc → target
                const ang0 = (i / n) * Math.PI * 1.2 + tt * 3, arcR = ext * 1.3;
                const ka = [cx + Math.cos(ang0) * arcR, cy + Math.sin(ang0) * arcR];
                const rr = (i % 2 ? 70 : 150) * k * (ext / (150 * k) > 1.4 ? ext / (150 * k) / 1.4 : 1), ang1 = (i / n) * Math.PI * 4 + tt * 1.5;
                const kr = [cx + Math.cos(ang1) * rr, cy + Math.sin(ang1) * rr];
                const dr = Math.sqrt(R(i, 11)) * 40 * k, ang2 = R(i, 12) * 6.28;
                const kd = [cx + Math.cos(ang2) * dr, cy + Math.sin(ang2) * dr];
                const u1 = p3o(ML.lin(t, at, at + 0.4)), u2 = p3io(ML.lin(t, at + 0.4, at + 0.9)), u3 = p3i(ML.lin(t, at + 0.9, at + 1.3)), u4 = ex(ML.lin(t, at + 1.3, at + 1.8));
                x = ox + (ka[0] - ox) * u1; y = oy + (ka[1] - oy) * u1;
                x += (kr[0] - x) * u2; y += (kr[1] - y) * u2;
                x += (kd[0] - x) * u3; y += (kd[1] - y) * u3;
                x += (ax - x) * u4; y += (ay - y) * u4;
                e = u4;
              } else {
                e = p3io(ML.lin(t, at + del[i], at + del[i] + D));
                const c = curl(ox, oy, tt, i), amp = (1 - e) * 60 * k * Math.sin(Math.PI * Math.min(1, e * 1.2 + 0.05));
                x = ox + (ax - ox) * e + c[0] * amp; y = oy + (ay - oy) * e + c[1] * amp;
              }
            } else if (p.direction === "disperse") {
              const u = p3o(ML.lin(t, disT + R(i, 13) * 0.08, disT + 0.8));
              const ang = R(i, 14) * Math.PI * 2, dist = (80 + R(i, 15) * 220) * k * 1.4;
              const c = curl(ax, ay, tt, i);
              x = ax + (Math.cos(ang) * dist + c[0] * 12 * k) * u; y = ay + (Math.sin(ang) * dist + c[1] * 12 * k) * u;
              a *= (t < disT ? 0.35 : 1) * (1 - 0.85 * u);
              e = 1 - u;
            } else {
              // reform: A → noisy ellipse cloud → B
              const ang = R(i, 16) * Math.PI * 2, rr = Math.sqrt(R(i, 17)), nz = (R(i, 18) - 0.5) * 0.25;
              const ex2 = cx + Math.cos(ang) * ext * 1.2 * (rr + nz), ey2 = cy + Math.sin(ang) * ext * 0.7 * (rr + nz);
              const u1 = p2i(ML.lin(t, refA, refB)), u2 = ex(ML.lin(t, refB + R(i, 19) * 0.15, refB + R(i, 19) * 0.15 + 0.9));
              x = ax + (ex2 - ax) * u1; y = ay + (ey2 - ay) * u1;
              x += (tB[i * 2] - x) * u2; y += (tB[i * 2 + 1] - y) * u2;
              e = u2 + (1 - u1) * (1 - u2);
            }
            // idle: breathe about the centre, jitter 0.5 px
            if (e >= 1 && idle > 0) { x = cx + (x - cx) * breathe + Math.sin(tt * 9 + ph[i]) * 0.5 * k * idle; y = cy + (y - cy) * breathe + Math.cos(tt * 8 + ph[i]) * 0.5 * k * idle; }
            const sAr = snap ? ML.lin(t, arrive, arrive + 0.25) : 0;
            if (sAr > 0) { x += (Math.round(x / cell) * cell - x) * sAr; y += (Math.round(y / cell) * cell - y) * sAr; }
            const s = sAr > 0 ? sz[i] + (cell * 0.8 - sz[i]) * sAr : T1.square ? cell * 0.62 : sz[i];
            g.globalAlpha = ML.clamp(a);
            g.fillRect(x - s / 2, y - s / 2, s, s);
          }
        }
        // after the arrival: the solid, the node lines, the loose squares
        const solidA = snap ? 0 : ML.lin(t, at, at + 0.15) * (p.direction === "assemble" ? ML.lin(t, solidT, solidT + 0.2) : p.direction === "disperse" ? 1 - ML.lin(t, disT, disT + 0.2) : ML.lin(t, refEnd - 0.3, refEnd - 0.1));
        const TT = p.direction === "reform" ? T2 : T1;
        // the solid breathes with its swarm
        g.save(); g.translate(cx, cy); g.scale(breathe, breathe); g.translate(-cx, -cy);
        if (solidA > 0 && TT.solid) TT.solid(solidA * fadeOut);
        if (solidA > 0 && TT.nodes.length) {
          g.globalAlpha = 0.25 * solidA * fadeOut; g.strokeStyle = accent; g.lineWidth = Math.max(1, k);
          g.beginPath(); TT.nodes.forEach((q, j) => { const r2 = TT.nodes[(j + 3) % TT.nodes.length]; g.moveTo(q[0], q[1]); g.lineTo(r2[0], r2[1]); }); g.stroke();
          g.fillStyle = accent2; g.globalAlpha = solidA * fadeOut;
          for (const q of TT.nodes) { g.beginPath(); g.arc(q[0], q[1], 3.5 * k * 1.3, 0, Math.PI * 2); g.fill(); }
        }
        g.restore();
        if (p.direction !== "disperse") {
          const t0 = p.direction === "reform" ? refEnd : arrive, u = ML.lin(t, t0, t0 + 1.6);
          if (u > 0) for (const L of loose) {
            const bx = p.direction === "reform" ? tB[L.i * 2] : tA[L.i * 2], by = p.direction === "reform" ? tB[L.i * 2 + 1] : tA[L.i * 2 + 1];
            const d = p3o(u) * 120 * k;
            g.globalAlpha = (1 - u) * 0.9 * fadeOut; g.fillStyle = accent2;
            g.fillRect(bx + L.dx * d - L.s / 2, by + L.dy * d - L.s / 2, L.s, L.s);
          }
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
      },
    };
  },
});
