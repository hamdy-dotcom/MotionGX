// Crack and shatter: cracks run across the word in slow motion, then it bursts into faceted shards that fly out, tumble,
// land and settle. Ported from MengTo/Skills ice-frost-skill-vfx (frost-energy.mjs, MIT) into 2D on the target:
//   · the cracks — three "across" planes at 16–24 %, 37–48 %, 63–73 % along the target's long axis (the spike's height
//     in the source), tilted 0.25–0.7 rad, plus one "along" it beyond the first; long targets get a few more across
//     cuts. Each runs from a point on the surface as reach·(t/d)^0.7 over 0.32 + 0.12·h s with a bright running front,
//     near to far 0.1 s apart, at time scale 0.55 while they run (slow-mo);
//   · the shatter (~1.4 s) with a 0.1 s ink impact frame, cutting exactly along the planes seen (convex clipping, the
//     "along" crack only splits pieces beyond the first cut); the base end stays as a stump;
//   · the pieces launch out 1.6 + 2.2·e^(−0.4 d) m/s and up 1.6–3.4 m/s, spinning 3–9 rad/s, as rigid bodies on a floor
//     below the target: one deepest-corner contact, restitution 0.22 above 0.6 m/s, friction 0.55, then each tips onto
//     the face nearest the floor over 0.22 s and rests — the source's integrator, in 2D.
//   · crystal variant: Voronoi cells (≤ 16 seeds, the long axis squeezed 0.45), edges cracking out from the impact.
// For video the whole simulation is precomputed in setup from the seed at a fixed 240 Hz, per-piece transforms stored
// per tick, so draw(t) only samples it: seeking is exact. Cracks are clipped to the glyphs (a background-clip:text
// copy carries them); colours are read from the look's variables.
ML.define({
  id: "text-emphasis.crack-and-shatter",
  category: "text-emphasis",
  name: "Crack, then shatter into pieces that land",
  does: "Cracks run across a word or object in slow motion, then it bursts into faceted shards that fly out, tumble, land and settle.",
  says: ["change", "problem", "energy", "before-after", "transition"],
  energy: 5,
  targets: ["headline", "logo", "card", "image", "shape"],
  duration: [1.5, 3.5],
  params: {
    pieces: { type: "choice", options: ["plane-cuts", "voronoi"], default: "plane-cuts" },
    material: { type: "choice", options: ["ice", "glass", "crystal", "stone"], default: "glass" },
    speed: { type: "choice", options: ["slow-mo", "real"], default: "slow-mo" },
    seed: { type: "number", range: [0, 9999], default: 1 },
    force: { type: "number", range: [0.3, 1.5], default: 1 },
    stump: { type: "bool", default: true },
    flash: { type: "bool", default: true },
  },
  pairs: ["transition.flash-cut", "camera.impact-shake"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:game-combat/ice-frost-skill-vfx", license: "MIT", note: "assets/frost-energy.mjs: crack planes, crack running front, shatterSpike + updateFrags rigid bodies, ported to 2D" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const seed = Math.round(p.seed) || 0;
    let rk = 0;
    const R = (a, b) => a + (b - a) * ML.rnd(seed * 7.31 + 1.7, ++rk);
    const slow = p.speed === "slow-mo", TS = slow ? 0.55 : 1;
    // ── the target's bounds (its text where it is text), padded so glyph overhangs are inside ──
    const st = stage.getBoundingClientRect(), K = st.width / (stage.offsetWidth || 1) || 1;
    const tag = el.tagName.toLowerCase(), replaced = tag === "img" || tag === "svg" || tag === "canvas" || tag === "video";
    const textual = !replaced && !el.querySelector("img,svg,canvas,video") && el.textContent.trim();
    let tr;
    if (textual) { const rg = document.createRange(); rg.selectNodeContents(el); tr = rg.getBoundingClientRect(); } else tr = el.getBoundingClientRect();
    const eb = ctx.box(el);
    const pad = Math.max(4, Math.min(tr.width, tr.height) / K * 0.06);
    const B = { x: (tr.left - st.left) / K - pad, y: (tr.top - st.top) / K - pad, w: tr.width / K + pad * 2, h: tr.height / K + pad * 2 };
    const long = B.w >= B.h ? "x" : "y", L = Math.max(B.w, B.h), Sh = Math.min(B.w, B.h);
    // the base end (the stump): reading start on a wide target, the bottom on a tall one
    const baseAtMax = long === "x" ? rtl : true;
    // along-axis coordinate 0 (base) → 1 (far end), and back to local px
    const toLocal = (a, c) => { const al = baseAtMax ? 1 - a : a; return long === "x" ? [al * B.w, c * B.h] : [c * B.w, al * B.h]; };
    const along = (x, y) => { const a = long === "x" ? x / B.w : y / B.h; return baseAtMax ? 1 - a : a; };
    // ── geometry helpers (local px, y down) ──
    const clip = (poly, n, d) => { // keep n·p <= d
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const P = poly[i], Q = poly[(i + 1) % poly.length], dp = n[0] * P[0] + n[1] * P[1] - d, dq = n[0] * Q[0] + n[1] * Q[1] - d;
        if (dp <= 0) out.push(P);
        if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const s = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * s, P[1] + (Q[1] - P[1]) * s]); }
      }
      return out;
    };
    const area = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const P = poly[i], Q = poly[(i + 1) % poly.length]; s += P[0] * Q[1] - Q[0] * P[1]; } return s / 2; };
    const centroid = (poly) => { let cx = 0, cy = 0, a = 0; for (let i = 0; i < poly.length; i++) { const P = poly[i], Q = poly[(i + 1) % poly.length], c = P[0] * Q[1] - Q[0] * P[1]; a += c; cx += (P[0] + Q[0]) * c; cy += (P[1] + Q[1]) * c; } a /= 2; return Math.abs(a) < 1e-9 ? poly[0] : [cx / (6 * a), cy / (6 * a)]; };
    const rectPoly = [[0, 0], [B.w, 0], [B.w, B.h], [0, B.h]];
    /** a line through the rect: its two ends on the rect's edges */
    const segOf = (n, d) => { const pts = []; const c = clip(rectPoly, n, d); for (const q of c) if (Math.abs(n[0] * q[0] + n[1] * q[1] - d) < 1e-6) pts.push(q); if (pts.length < 2) return null; return [pts[0], pts[pts.length - 1]]; };
    // ── cracks and pieces ──
    let cracks = [], pieces;
    const t0 = at + 0.1;
    if (p.pieces === "voronoi") {
      const n = Math.max(6, Math.min(16, Math.round(5 + (L / Sh) * 2)));
      const sx = long === "x" ? 0.45 : 1, sy = long === "y" ? 0.45 : 1; // the long axis squeezed: cells stretch along it
      const seeds = Array.from({ length: n }, (_, i) => [R(0.04, 0.96) * B.w, R(0.06, 0.94) * B.h]);
      pieces = seeds.map((s, i) => {
        let poly = rectPoly;
        for (let j = 0; j < n && poly.length; j++) {
          if (j === i) continue;
          const o = seeds[j], m = [((s[0] + o[0]) / 2), ((s[1] + o[1]) / 2)];
          // the bisector in the squeezed space, mapped back: normal (o − s) scaled twice
          const nn = [(o[0] - s[0]) * sx * sx, (o[1] - s[1]) * sy * sy];
          poly = clip(poly, nn, nn[0] * m[0] + nn[1] * m[1]);
        }
        return { poly, stump: false };
      }).filter((q) => q.poly.length >= 3 && Math.abs(area(q.poly)) > 1);
      // the crack network: every cell edge, revealed by one front from the impact point
      const O = toLocal(R(0.35, 0.65), R(0.3, 0.7)), segs = [];
      for (const q of pieces) for (let i = 0; i < q.poly.length; i++) {
        const P = q.poly[i], Q = q.poly[(i + 1) % q.poly.length];
        const onEdge = (A) => A[0] < 0.5 || A[1] < 0.5 || A[0] > B.w - 0.5 || A[1] > B.h - 0.5;
        if (onEdge(P) && onEdge(Q) && (Math.abs(P[0] - Q[0]) < 0.5 || Math.abs(P[1] - Q[1]) < 0.5)) continue; // the outline
        if (segs.some(([a, b]) => Math.hypot(a[0] - Q[0], a[1] - Q[1]) + Math.hypot(b[0] - P[0], b[1] - P[1]) < 1)) continue;
        segs.push([P, Q]);
      }
      const reach = Math.max(...segs.flat().map((q) => Math.hypot(q[0] - O[0], q[1] - O[1])), 1);
      const dur = (0.32 + 0.12 * 2) / TS * 1.4;
      cracks = segs.map((sg) => ({ seg: sg, O, reach, t: t0, dur, disc: true }));
    } else {
      // across cuts along the long axis (3 for a spike-like target, more for a long line), then one along it
      const extra = Math.max(0, Math.min(4, Math.round(L / Sh / 2.2) - 1));
      const fr = [0.16 + R(0, 0.08), 0.42 + R(-0.05, 0.06), 0.68 + R(-0.05, 0.05)];
      for (let i = 0; i < extra; i++) fr.push(0.3 + (0.6 * (i + 0.5)) / extra + R(-0.04, 0.04));
      fr.sort((a, b) => a - b);
      const planes = [];
      fr.forEach((a, k) => {
        const tau = R(0.25, 0.7) * (ML.rnd(seed + k * 3.3, 9) < 0.5 ? -1 : 1);
        // the cut runs across the long axis, tilted tau from square; its normal points along the axis
        const c = toLocal(a, 0.5);
        let nx, ny;
        if (long === "x") { nx = Math.cos(tau); ny = Math.sin(tau); } else { ny = Math.cos(tau); nx = Math.sin(tau); }
        const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
        planes.push({ n: [nx, ny], d: nx * c[0] + ny * c[1], a, kind: "across" });
      });
      {
        const c = toLocal(0.62, 0.5 + R(-0.12, 0.12)), tl = R(-0.15, 0.15);
        let nx, ny;
        if (long === "x") { nx = Math.sin(tl) * (Sh / L); ny = 1; } else { nx = 1; ny = Math.sin(tl) * (Sh / L); }
        const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
        planes.push({ n: [nx, ny], d: nx * c[0] + ny * c[1], a: 0.5, kind: "along" });
      }
      // pieces: split by every plane in order; the along cut only splits pieces beyond the first cut
      let ps = [{ poly: rectPoly }];
      for (const P of planes) {
        const next = [];
        for (const q of ps) {
          const cc = centroid(q.poly);
          if (P.kind === "along" && along(cc[0], cc[1]) < planes[0].a) { next.push(q); continue; }
          const A = clip(q.poly, P.n, P.d), Bp = clip(q.poly, [-P.n[0], -P.n[1]], -P.d);
          if (A.length >= 3 && Math.abs(area(A)) > 1 && Bp.length >= 3 && Math.abs(area(Bp)) > 1) next.push({ poly: A }, { poly: Bp });
          else next.push(q);
        }
        ps = next;
      }
      pieces = ps.map((q) => ({ poly: q.poly, stump: p.stump && Math.min(...q.poly.map((v) => along(v[0], v[1]))) < 0.02 && along(...centroid(q.poly)) < planes[0].a }));
      // cracks: each starts on the surface and runs through, near to far 0.1 s apart (in slowed time)
      let order = 0;
      const gapK = Math.min(0.1, 0.32 / Math.max(1, planes.length - 1)); // near to far 0.1 s apart (closer on long targets)
      planes.forEach((P, k) => {
        let sg = segOf(P.n, P.d);
        if (!sg) return;
        if (P.kind === "along") {
          // it runs only beyond the first cut (it splits only the pieces there)
          const Q = planes[0], far = toLocal(1, 0.5), sgn = Math.sign(Q.n[0] * far[0] + Q.n[1] * far[1] - Q.d) || 1;
          const c = clip([sg[0], sg[1], sg[0]], [-Q.n[0] * sgn, -Q.n[1] * sgn], -Q.d * sgn);
          if (c.length < 2) return;
          let a0 = c[0], a1 = c[0], best = -1;
          for (const u of c) for (const v of c) { const dd = Math.hypot(u[0] - v[0], u[1] - v[1]); if (dd > best) { best = dd; a0 = u; a1 = v; } }
          if (best < 2) return;
          sg = [a0, a1];
        }
        const top = ML.rnd(seed + k, 4) < 0.5 ? 0 : 1, O = sg[top];
        const reach = Math.hypot(sg[0][0] - sg[1][0], sg[0][1] - sg[1][1]);
        const h = P.kind === "along" ? 1 : P.a;
        cracks.push({ seg: sg, O, reach, t: t0 + (order++ * gapK) / TS, dur: (0.32 + 0.12 * h + (P.kind === "along" ? 0.1 : 0)) / TS, disc: false, P });
      });
    }
    const lastCrack = Math.max(...cracks.map((c) => c.t + c.dur));
    const tS = Math.max(at + (slow ? 1.4 : 0.8), lastCrack + 0.08);
    // ── materials: colours read from the look ──
    const rgb = (v) => { const pr = document.createElement("i"); pr.style.color = v; pr.style.display = "none"; host.append(pr); const c = getComputedStyle(pr).color; pr.remove(); return c; };
    const MAT = {
      glass: { line: rgb("var(--x-panel)"), front: rgb("var(--x-accent-2)"), glint: 0.35 },
      ice: { line: rgb("color-mix(in srgb, var(--x-accent-2) 55%, var(--x-panel))"), front: rgb("var(--x-panel)"), glint: 0.45 },
      crystal: { line: rgb("var(--x-accent-2)"), front: rgb("var(--x-panel)"), glint: 0.55 },
      stone: { line: rgb("var(--x-ground)"), front: rgb("var(--x-accent)"), glint: 0 },
    }[p.material] || null;
    const mat = MAT || { line: rgb("var(--x-panel)"), front: rgb("var(--x-accent-2)"), glint: 0.35 };
    const lw = Math.max(1.6, Sh * 0.022);
    // ── the crack carrier: a copy over the target whose glyphs clip the crack drawing ──
    const copyStyle = (c) => {
      const cs = getComputedStyle(el);
      for (const k of ["font", "letterSpacing", "wordSpacing", "lineHeight", "textAlign", "textTransform", "direction", "whiteSpace", "color", "padding", "boxSizing", "textWrap", "fontFeatureSettings"]) try { c.style[k] = cs[k]; } catch (e) { /* not all exist */ }
    };
    const strip = (c) => { c.removeAttribute("data-slot"); c.removeAttribute("id"); c.querySelectorAll?.("[data-slot],[id]").forEach((n) => { n.removeAttribute("data-slot"); n.removeAttribute("id"); }); c.setAttribute("aria-hidden", "true"); return c; };
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "8" });
    host.append(layer);
    let carrier;
    if (textual) {
      carrier = strip(el.cloneNode(true)); copyStyle(carrier);
      Object.assign(carrier.style, { position: "absolute", left: eb.x + "px", top: eb.y + "px", width: eb.w + "px", height: eb.h + "px", margin: "0", webkitTextFillColor: "transparent", color: "transparent", webkitBackgroundClip: "text", backgroundClip: "text" });
      carrier.querySelectorAll("*").forEach((n) => { n.style.webkitTextFillColor = "transparent"; });
    } else {
      carrier = document.createElement("div");
      Object.assign(carrier.style, { position: "absolute", left: B.x + "px", top: B.y + "px", width: B.w + "px", height: B.h + "px" });
    }
    layer.append(carrier);
    // ── the pieces: a clipped copy of the target each ──
    const elOff = { x: eb.x - B.x, y: eb.y - B.y };
    const P = pieces.map((q, i) => {
      const w = document.createElement("div");
      const c0 = centroid(q.poly);
      Object.assign(w.style, { position: "absolute", left: B.x.toFixed(2) + "px", top: B.y.toFixed(2) + "px", width: B.w.toFixed(2) + "px", height: B.h.toFixed(2) + "px", clipPath: `polygon(${q.poly.map((v) => `${v[0].toFixed(2)}px ${v[1].toFixed(2)}px`).join(", ")})`, transformOrigin: `${c0[0].toFixed(2)}px ${c0[1].toFixed(2)}px`, visibility: "hidden" });
      let c;
      if (tag === "svg" || tag === "img" || tag === "canvas") { c = strip(el.cloneNode(true)); Object.assign(c.style, { position: "absolute", left: elOff.x + "px", top: elOff.y + "px", width: eb.w + "px", height: eb.h + "px", margin: "0" }); }
      else { c = strip(el.cloneNode(true)); copyStyle(c); Object.assign(c.style, { position: "absolute", left: elOff.x + "px", top: elOff.y + "px", width: eb.w + "px", height: eb.h + "px", margin: "0" }); }
      w.append(c);
      layer.append(w);
      return { w, c0, poly: q.poly, stump: q.stump, i };
    });
    // the impact frame: an ink veil over the scene for 0.1 s, the pieces inverted on it
    const veil = document.createElement("div");
    Object.assign(veil.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", background: "var(--x-ink)", opacity: "0", pointerEvents: "none", zIndex: "7" });
    if (p.flash) host.append(veil);
    // ── the simulation, precomputed at 240 Hz (metres, y up, floor at 0) ──
    const ppm = L / 1.9; // the target's long side ≈ 1.9 m, like the source's spikes
    const floorY = Math.min(f.H - Math.max(24, f.H * 0.05), B.y + B.h + Math.max(B.h * 1.4, f.H * 0.12));
    const HZ = 240, simScale = slow ? 0.8 : 1;
    const simDur = Math.max(0.2, (end - tS + 0.2) * simScale), N = Math.ceil(simDur * HZ) + 2;
    const impact = toLocal(0.5, 0.5), Cx = B.x + impact[0], Cy = B.y + impact[1];
    const wallL = 0, wallR = f.W / ppm;
    let firstLand = Infinity;
    const sims = P.map((q) => {
      const cxs = B.x + q.c0[0], cys = B.y + q.c0[1];
      const verts = q.poly.map((v) => [(v[0] - q.c0[0]) / ppm, -(v[1] - q.c0[1]) / ppm]);
      const rg2 = verts.reduce((s, v) => s + v[0] * v[0] + v[1] * v[1], 0) / verts.length;
      const rad = Math.sqrt(rg2), invI = 1 / (0.4 * rg2 + 1e-6);
      const out = new Float64Array(N * 3);
      let x = cxs / ppm, y = (floorY - cys) / ppm, th = 0, vx = 0, vy = 0, w = 0;
      if (!q.stump) {
        const dx = (cxs - Cx) / ppm, dist = Math.abs(dx) + Math.abs(cys - Cy) / ppm * 0.3;
        const dir = Math.abs(dx) < 1e-3 ? (ML.rnd(seed + q.i, 11) < 0.5 ? -1 : 1) : Math.sign(dx);
        const k = p.force * (0.8 + 0.6 * ML.rnd(seed + q.i * 1.7, 12));
        // on screen the horizontal throw is held to what the frame can show
        vx = dir * (1.6 + 2.2 * Math.exp(-dist * 0.4)) * k * 0.3 + (ML.rnd(seed + q.i, 13) - 0.5) * 0.6;
        vy = (1.6 + 1.8 * ML.rnd(seed + q.i, 14)) * k;
        // pieces further from the base get an extra push along the axis, away from it
        const a = along(q.c0[0], q.c0[1]), push = (0.4 + ML.rnd(seed + q.i, 15)) * a * 0.3;
        if (long === "x") vx += (baseAtMax ? -1 : 1) * push; else vy += push;
        // never thrown out of the top of the frame: the rise is capped by the room above
        const room = Math.max(0.05, (cys - Math.max(16, f.H * 0.02)) / ppm - rad), vmax = Math.sqrt(2 * 9.8 * room);
        if (vy > vmax) vy = vmax;
        w = (ML.rnd(seed + q.i, 16) < 0.5 ? -1 : 1) * (3 + 6 * ML.rnd(seed + q.i, 17)) * Math.min(1.6, 0.25 / Math.max(rad, 0.02) + 0.3);
      }
      let rest = q.stump, still = 0, touch = 0, age = 0, contact = false, settle = null;
      const h = 1 / HZ;
      const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
      for (let n = 0; n < N; n++) {
        out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = th;
        if (rest) continue;
        age += h;
        if (settle) {
          settle.t += h;
          const e = ML.ease(settle.t, 0, 0.22);
          th = settle.from + (settle.to - settle.from) * e;
          let lo = Infinity; for (const v of verts) lo = Math.min(lo, rot(v, th)[1]);
          y = -lo;
          if (settle.t >= 0.22) rest = true;
          continue;
        }
        vy -= 9.8 * h; x += vx * h; y += vy * h; th += w * h;
        // the deepest corner below the floor: one contact, an impulse with friction
        let lo = 0, ci = -1;
        for (let i = 0; i < verts.length; i++) { const r = rot(verts[i], th); const yy = y + r[1]; if (yy < lo) { lo = yy; ci = i; } }
        contact = ci >= 0;
        if (contact) {
          if (firstLand === Infinity) firstLand = age;
          y -= lo;
          const r = rot(verts[ci], th);
          let vcx = vx - w * r[1], vcy = vy + w * r[0];
          if (vcy < 0) {
            const rxn = r[0];
            const jn = (-(1 + (vcy < -0.6 ? 0.22 : 0)) * vcy) / (1 + invI * rxn * rxn); // no bounce at a crawl
            vy += jn; w += invI * r[0] * jn;
            vcx = vx - w * r[1];
            const vt = Math.abs(vcx);
            if (vt > 1e-5) {
              const sg = Math.sign(vcx), rxt = -r[1] * sg;
              const jt = Math.min(vt / (1 + invI * rxt * rxt), 0.55 * jn);
              vx -= sg * jt; w += invI * r[1] * sg * jt;
            }
          }
          // resting contact: Coulomb friction (0.55) on the sliding speed as well as the impulse friction above
          vx -= Math.sign(vx) * Math.min(Math.abs(vx), 0.55 * 9.8 * h);
          w *= Math.exp(-3 * h); vx *= Math.exp(-1.2 * h);
        } else w *= Math.exp(-0.3 * h);
        // the stage's sides
        let xl = Infinity, xr = -Infinity; for (const v of verts) { const r = rot(v, th); xl = Math.min(xl, x + r[0]); xr = Math.max(xr, x + r[0]); }
        if (xl < wallL) { x += wallL - xl; if (vx < 0) vx = -vx * 0.3; }
        if (xr > wallR) { x -= xr - wallR; if (vx > 0) vx = -vx * 0.3; }
        // asleep: tip it onto the face nearest the floor and rest there
        const slowNow = contact && Math.hypot(vx, vy) < 0.35 && Math.abs(w) * rad < 0.12;
        if (age > 2.6 && contact) { vx *= Math.exp(-4 * h); vy *= Math.exp(-4 * h); w *= Math.exp(-4 * h); }
        still = slowNow ? still + h : 0;
        touch += contact ? h : 0;
        if (still > 0.18 || touch > 0.9) {
          let best = 0, bd = -2;
          for (let i = 0; i < verts.length; i++) {
            const A = verts[i], Bv = verts[(i + 1) % verts.length];
            let nx = Bv[1] - A[1], ny = -(Bv[0] - A[0]);
            const mx = (A[0] + Bv[0]) / 2, my = (A[1] + Bv[1]) / 2;
            if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
            const [rx, ry] = rot([nx, ny], th), l = Math.hypot(rx, ry) || 1;
            if (-ry / l > bd) { bd = -ry / l; best = Math.atan2(ry, rx); }
          }
          let dlt = -Math.PI / 2 - best; while (dlt > Math.PI) dlt -= 2 * Math.PI; while (dlt < -Math.PI) dlt += 2 * Math.PI;
          settle = { from: th, to: th + dlt, t: 0 };
          vx = vy = w = 0;
        }
      }
      return out;
    });
    // ── sound: a snap as the first crack starts, the hit on the shatter, the pieces landing ──
    ctx.sfx(cracks.length ? Math.min(...cracks.map((c) => c.t)) : t0, "snap", 0.3);
    ctx.sfx(tS, "hit", 0.7);
    if (Number.isFinite(firstLand)) ctx.sfx(tS + firstLand / simScale + 0.05, "land.light", 0.35);
    // ── drawing the cracks at a moment: the part of each segment within the running front's reach, as CSS gradient
    // layers (a segment = a stripe through its own bounding box; a front = a radial glow), painted synchronously ──
    const off = textual ? { x: B.x - eb.x, y: B.y - eb.y } : { x: 0, y: 0 };
    const crackLayers = (t) => {
      const img = [], size = [], pos = [];
      const seg = (X0, Y0, X1, Y1, col, w, o) => {
        const dx = X1 - X0, dy = Y1 - Y0, len = Math.hypot(dx, dy);
        if (len < 0.5) return;
        const m = w * 1.5, bx = Math.min(X0, X1) - m, by = Math.min(Y0, Y1) - m, bw = Math.abs(dx) + 2 * m, bh = Math.abs(dy) + 2 * m;
        const px = -dy / len, py = dx / len, ang = (Math.atan2(px, -py) * 180) / Math.PI;
        const c = o < 1 ? `color-mix(in srgb, ${col} ${(o * 100).toFixed(1)}%, transparent)` : col;
        img.push(`linear-gradient(${ang.toFixed(3)}deg, transparent calc(50% - ${(w / 2 + 0.6).toFixed(2)}px), ${c} calc(50% - ${(w / 2).toFixed(2)}px), ${c} calc(50% + ${(w / 2).toFixed(2)}px), transparent calc(50% + ${(w / 2 + 0.6).toFixed(2)}px))`);
        size.push(`${bw.toFixed(2)}px ${bh.toFixed(2)}px`); pos.push(`${(bx + off.x).toFixed(2)}px ${(by + off.y).toFixed(2)}px`);
      };
      const glow = (X, Y, r, col, o) => {
        img.push(`radial-gradient(closest-side, color-mix(in srgb, ${col} ${(o * 100).toFixed(1)}%, transparent), transparent)`);
        size.push(`${(r * 2).toFixed(2)}px ${(r * 2).toFixed(2)}px`); pos.push(`${(X - r + off.x).toFixed(2)}px ${(Y - r + off.y).toFixed(2)}px`);
      };
      for (const c of cracks) {
        if (t < c.t) continue;
        const u = Math.min(1, (t - c.t) / c.dur), r = c.reach * Math.pow(u, 0.7);
        const [A, Bq] = c.seg, O = c.O;
        const dx = Bq[0] - A[0], dy = Bq[1] - A[1], ll = dx * dx + dy * dy || 1;
        const fx = A[0] - O[0], fy = A[1] - O[1];
        const bq = 2 * (fx * dx + fy * dy), cq = fx * fx + fy * fy - r * r, disc = bq * bq - 4 * ll * cq;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc), s0 = Math.max(0, (-bq - sq) / (2 * ll)), s1 = Math.min(1, (-bq + sq) / (2 * ll));
        if (s1 <= s0) continue;
        const X0 = A[0] + dx * s0, Y0 = A[1] + dy * s0, X1 = A[0] + dx * s1, Y1 = A[1] + dy * s1;
        // the running front: a bright tip on each end still moving
        const fr = 1 - u;
        if (fr > 0.001) {
          for (const [atEnd, X, Y] of [[s0 <= 1e-6, X0, Y0], [s1 >= 1 - 1e-6, X1, Y1]]) {
            if (atEnd) continue;
            const dl = Math.hypot(X - O[0], Y - O[1]) || 1, tl = Math.min(r, Sh * 0.3), ux = (X - O[0]) / dl, uy = (Y - O[1]) / dl;
            glow(X, Y, lw * 5, mat.front, 0.9 * fr);
            seg(X - ux * tl, Y - uy * tl, X, Y, mat.front, lw * 2, 0.5 + 0.5 * fr);
          }
        }
        seg(X0, Y0, X1, Y1, mat.line, lw, 0.95);
      }
      return { img: img.join(", "), size: size.join(", "), pos: pos.join(", ") };
    };
    return {
      draw(t) {
        const lv = ML.ease(t, end - 0.3, end - 0.05);
        const broken = t >= tS;
        // before the break: the target, its cracks running through it
        el.style.opacity = broken ? "0" : "1";
        const cl = !broken ? crackLayers(t) : { img: "" };
        carrier.style.backgroundImage = cl.img || "none";
        if (cl.img) { carrier.style.backgroundSize = cl.size; carrier.style.backgroundPosition = cl.pos; carrier.style.backgroundRepeat = "no-repeat"; }
        carrier.style.visibility = broken || !cl.img ? "hidden" : "visible";
        // the impact frame: ink veil, pieces inverted, for 0.1 s
        const fl = broken && p.flash ? (t < tS + 1 / 30 ? 1 : 1 - ML.lin(t, tS + 1 / 30, tS + 0.1)) : 0;
        veil.style.opacity = (fl * 0.92).toFixed(4);
        // after: the pieces, from the stored simulation
        const st_ = (t - tS) * simScale, fi = Math.max(0, Math.min(N - 1.001, st_ * HZ)), i0 = Math.floor(fi), a = fi - i0;
        for (let k = 0; k < P.length; k++) {
          const q = P[k];
          if (!broken) { q.w.style.visibility = "hidden"; continue; }
          const s = sims[k], o0 = i0 * 3, o1 = Math.min(N - 1, i0 + 1) * 3;
          const x = s[o0] + (s[o1] - s[o0]) * a, y = s[o0 + 1] + (s[o1 + 1] - s[o0 + 1]) * a, th = s[o0 + 2] + (s[o1 + 2] - s[o0 + 2]) * a;
          const X = x * ppm, Y = floorY - y * ppm;
          const dx = X - (B.x + q.c0[0]), dy = Y - (B.y + q.c0[1]);
          q.w.style.visibility = "visible";
          q.w.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${(-th).toFixed(5)}rad)`;
          q.w.style.opacity = (1 - lv).toFixed(4);
          const glint = mat.glint * Math.max(0, Math.sin(th * 2 + k * 1.3)) * (q.stump ? 0 : 1);
          q.w.style.filter = fl > 0.01 ? "invert(1)" : glint > 0.01 ? `brightness(${(1 + glint).toFixed(3)})` : "none";
        }
      },
    };
  },
});
