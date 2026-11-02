// Streams gather into an orb: liquid streams rise from below the frame along curling paths and pour into a sphere
// growing in mid-air. The orb's radius grows 0.02 → 0.28 (of the frame's short side, as a diameter share) as the
// streams arrive. Each stream is a tube rising up its path over 0.8–0.96 s, held whole for 0.55 s, then cut from the
// root and drained into the orb; "funnel" streams wind up a narrowing funnel (2.1–4.7 rad of turn), "figure-eight"
// streams cross themselves on a Catmull-Rom loop, "straight" streams arc up directly. The tube's cross-section wobbles
// and thins 15 % toward the orb; beads pinch off and run up it every 0.06–0.22 s; where a stream joins, a ring spreads
// and the orb wobbles. The target (a logo, a number, a shape) is gathered last: it lands inside the full orb.
// Painted on one 2D canvas, cleared and redrawn whole from t every frame. Colours from the look (brand: accent / accent-2; water: accent-2
// thinned with the panel).
// Source: MengTo/Skills game-combat/water-crystal-skill-vfx assets/tide-crystal.mjs (MIT) — the gather choreography
// (six streams, four up a funnel, two on a figure-eight, beads, ring + wobble kick on each join) ported to 2D.
ML.define({
  id: "element.stream-gather",
  category: "element",
  name: "Streams gather into an orb",
  does: "Streams rise along curling paths and pour into a growing sphere in mid-air - everything coming together in one place.",
  says: ["connection", "flow", "growth", "arrival"],
  energy: 3,
  targets: ["logo", "shape", "stage", "number"],
  duration: [1.5, 3.5],
  params: {
    streams: { type: "number", range: [2, 8], default: 6 },
    path: { type: "choice", options: ["funnel", "figure-eight", "straight"], default: "funnel" },
    liquid: { type: "choice", options: ["water", "brand"], default: "brand" },
  },
  pairs: ["element.liquid-orb-wobble", "camera.push-in"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/game-combat/water-crystal-skill-vfx", license: "MIT", note: "assets/tide-crystal.mjs gather: orb grows as six streams arrive (funnel + figure-eight), beads, ring and wobble kick; 2D port" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const host = ctx.scene || ctx.stage;
        const W = f.W, H = f.H, S = Math.min(W, H);
    const own = el && el !== ctx.stage ? el : null;
    const ob = own ? ctx.box(own) : null;
    // where the orb gathers: the target's centre, else a little above the middle of the picture region
    const cx = ob ? ob.x + ob.w / 2 : f.pic.x + f.pic.w / 2;
    const cy = ob ? ob.y + ob.h / 2 : f.pic.y + f.pic.h * 0.42;
    const Rfull = Math.min(S * 0.14 * (ob ? Math.max(1, Math.hypot(ob.w, ob.h) / (S * 0.28) * 0.9) : 1), S * 0.24, cy - 20, H - cy);
    const R0 = Math.max(2, S * 0.01);
    // one canvas over the stage, cleared and repainted whole every frame
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;pointer-events:none;z-index:" + (own ? 1 : 6) + ";";
    host.append(cv);
    const g = cv.getContext("2d");
    const brand = p.liquid !== "water";
    const probe = document.createElement("div"); probe.style.display = "none"; host.append(probe);
    const col = (css) => { probe.style.color = ""; probe.style.color = css; const c = getComputedStyle(probe).color, n = (c.match(/-?[\d.]+/g) || [0, 0, 0]).map(Number); return (c.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3)).map(Math.round); };
    const body = col(brand ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent-2) 62%, var(--x-panel))");
    const deep = col(brand ? "color-mix(in srgb, var(--x-accent) 70%, var(--x-ink))" : "color-mix(in srgb, var(--x-accent-2) 70%, var(--x-ink))");
    const lite = col(brand ? "var(--x-accent-2)" : "var(--x-panel)");
    probe.remove();
    const rgba = (c, a = 1) => `rgba(${c.join(",")},${ML.clamp(a).toFixed(3)})`;
    if (own) { own.style.position = own.style.position || "relative"; own.style.zIndex = "2"; }

    // ── the paths: from below the frame up into the orb ──
    const n = Math.round(ML.clamp(p.streams, 2, 8));
    const lcgS = (i) => (k) => ML.rnd(i * 13 + 3, k);
    const cat = (pts, u) => { // Catmull-Rom through pts
      const m = pts.length - 1, x = ML.clamp(u) * m, i = Math.min(m - 1, Math.floor(x)), s = x - i;
      const P0 = pts[Math.max(0, i - 1)], P1 = pts[i], P2 = pts[i + 1], P3 = pts[Math.min(m, i + 2)];
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * s * s + (-a + 3 * b - 3 * c2 + d) * s * s * s);
      return [c(P0[0], P1[0], P2[0], P3[0]), c(P0[1], P1[1], P2[1], P3[1])];
    };
    const streams = [];
    for (let i = 0; i < n; i++) {
      const r = lcgS(i);
      const side = (i % 2 ? -1 : 1) * (rtl ? -1 : 1);
      const kind = p.path === "funnel" ? (i < Math.ceil(n * 0.67) ? "funnel" : "eight") : p.path === "figure-eight" ? "eight" : "straight";
      const x0 = cx + side * (0.12 + 0.3 * r(1)) * W * (i % 3 === 2 ? 0.4 : 1);
      const y0 = H + 30;
      const pts = [];
      const N = 64;
      if (kind === "funnel") {
        // a funnel under the orb: wide at the floor, narrowing as it climbs; each stream winds 2.1–4.7 rad round it
        const turn = 2.1 + 2.6 * r(2), ph = (i / n) * Math.PI * 2 + r(3) * 0.6, rad0 = (0.3 + 0.12 * r(4)) * S;
        const axis0 = cx + (x0 - cx) * 0.2;
        for (let k = 0; k <= N; k++) {
          const u = k / N, e = u * u * (3 - 2 * u);
          const radius = rad0 * Math.pow(1 - u, 1.15) + Rfull * 0.35 * u;
          const a = ph + side * turn * u;
          const ax = axis0 + (cx - axis0) * e;
          pts.push([ax + Math.sin(a) * radius, y0 + (cy - y0) * u + Math.cos(a) * radius * 0.22]);
        }
        pts[N] = [cx, cy];
      } else if (kind === "eight") {
        const w8 = (0.16 + 0.1 * r(5)) * S, h8 = (cy - y0) * 0.5;
        const ctrl = [[x0, y0], [x0 + side * w8 * 0.2, y0 + h8 * 0.35], [cx - side * w8, y0 + h8 * 0.8], [cx + side * w8, y0 + h8 * 1.25], [cx - side * w8 * 0.8, y0 + h8 * 1.6], [cx + side * w8 * 0.4, y0 + h8 * 1.85], [cx, cy]];
        for (let k = 0; k <= N; k++) pts.push(cat(ctrl, k / N));
      } else {
        const bend = side * (0.1 + 0.15 * r(6)) * S;
        for (let k = 0; k <= N; k++) { const u = k / N; pts.push([x0 + (cx - x0) * u * u + bend * Math.sin(u * Math.PI), y0 + (cy - y0) * u]); }
      }
      // arc length
      const L = [0];
      for (let k = 1; k <= N; k++) L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      streams.push({ pts, L, len: L[N], w: S * (0.016 + 0.008 * r(7)), rise: 0.8 + 0.16 * r(8), seed: i * 7 + 2, poly: null, beads: [], ring: null });
    }
    // ── timing: arrivals across the window ──
    const span = Math.max(1.4, end - at - 0.4);
    const tail = 0.96 + 0.55 + 0.35;
    const gap = n > 1 ? ML.clamp((span - tail - 0.5) / (n - 1), 0.12, 0.45) : 0;
    const k = Math.min(1, (span - 0.5) / (tail + gap * (n - 1)));
    streams.forEach((s, i) => {
      s.t0 = at + i * gap * k;
      s.rise *= Math.max(0.55, k);
      s.arrive = s.t0 + s.rise;
      s.cut = s.arrive + 0.55 * Math.max(0.5, k);
      s.gone = s.cut + 0.35 * Math.max(0.6, k);
      // beads pinching off every 0.06–0.22 s while the stream flows
      let tb = s.t0 + 0.1;
      for (let b = 0; b < 24 && tb < s.cut; b++) { s.beads.push(tb); tb += 0.06 + 0.16 * ML.rnd(s.seed, 30 + b); }
    });
    const lastArrive = Math.max(...streams.map((s) => s.gone));
    ctx.sfx(at, "swell", 0.4);
    streams.forEach((s, i) => i % 2 === 0 && ctx.sfx(s.arrive, "blip", 0.22));
    if (own) ctx.sfx(lastArrive, "land.light", 0.35);
    const along = (s, d) => { // point and tangent at arc length d
      d = ML.clamp(d, 0, s.len);
      let i = 1; while (i < s.L.length - 1 && s.L[i] < d) i++;
      const a = s.pts[i - 1], b = s.pts[i], seg = s.L[i] - s.L[i - 1] || 1, u = (d - s.L[i - 1]) / seg;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, tx: (b[0] - a[0]) / seg, ty: (b[1] - a[1]) / seg };
    };
    return {
      draw(t) {
        g.clearRect(0, 0, W, H);
        // orb radius: grows with each arrival; wobble kick on each join
        let arrived = 0, wob = 0;
        for (const s of streams) {
          const q = ML.clamp((t - s.arrive) / (s.gone - s.arrive));
          arrived += q * q * (3 - 2 * q) * 0.7 + ML.lin(t, s.t0, s.arrive) * 0.3 * (t > s.t0 ? 1 : 0);
          if (t > s.arrive) wob += Math.exp(-(t - s.arrive) * 4.5) * Math.sin((t - s.arrive) * 26);
        }
        const r = t >= at ? R0 + (Rfull - R0) * (arrived / n) : 0;
        const wx = 1 + 0.06 * wob, wy = 1 - 0.06 * wob;
        for (const s of streams) {
          // head climbs the path; after the cut the tail follows it up into the orb
          const head = s.len * ML.out(t, s.t0, s.arrive) ** 0.9;
          const tl = s.len * ML.ease(t, s.cut, s.gone);
          if (t >= s.t0 && t < s.gone && head - tl >= 1) {
            const left = [], right = [], Mn = 48;
            for (let k2 = 0; k2 <= Mn; k2++) {
              const d = tl + ((head - tl) * k2) / Mn, q = along(s, d), u = d / s.len;
              const wob2 = 1 + 0.18 * Math.sin(u * 22 + t * 9 + s.seed) * Math.sin(u * 7 - t * 5);
              const tip = Math.min(1, (head - d) / (s.w * 1.2)) ** 0.5, root = Math.min(1, (d - tl) / (s.w * 1.5) + (tl > 0 ? 0 : 1)) ** 0.5;
              const hw = (s.w / 2) * (1 - 0.15 * u) * wob2 * Math.max(0.25, Math.min(tip, root));
              left.push([q.x - q.ty * hw, q.y + q.tx * hw]); right.push([q.x + q.ty * hw, q.y - q.tx * hw]);
            }
            const ptsS = left.concat(right.reverse());
            const a0 = along(s, tl), a1 = along(s, head);
            const gr = g.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
            gr.addColorStop(0, rgba(deep)); gr.addColorStop(1, rgba(body));
            g.beginPath(); ptsS.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
            g.fillStyle = gr; g.fill();
            // a hairline of light along the lit limb
            g.beginPath(); right.slice(4, -4).forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
            g.strokeStyle = rgba(lite, 0.55); g.lineWidth = Math.max(1, s.w * 0.08); g.stroke();
          }
          // beads: pinch off and run up the tube into the orb in 0.5 s
          g.fillStyle = rgba(body);
          s.beads.forEach((tb) => {
            const u = (t - tb) / 0.5;
            if (u <= 0 || u >= 1 || t > s.gone) return;
            const d = Math.min(head, tl + (s.len - tl) * (0.15 + 0.85 * u)), q = along(s, d);
            g.beginPath(); g.arc(q.x, q.y, s.w * 0.62 * Math.sin(u * Math.PI) ** 0.4, 0, Math.PI * 2); g.fill();
          });
        }
        if (r > 0.5) {
          // the orb: lit from the upper start side, its far rim deeper
          g.save(); g.translate(cx, cy); g.scale(wx, wy);
          const og = g.createRadialGradient(-r * 0.24, -r * 0.32, r * 0.05, 0, 0, r);
          og.addColorStop(0, rgba(lite)); og.addColorStop(0.45, rgba(body)); og.addColorStop(1, rgba(deep));
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = og; g.fill();
          g.rotate(-0.52); g.beginPath(); g.ellipse(-r * 0.12, -r * 0.48, r * 0.24, r * 0.12, 0, 0, Math.PI * 2); g.fillStyle = rgba(lite, 0.55); g.fill();
          g.restore();
        }
        // the ring where each stream joins
        for (const s of streams) {
          const ru = (t - s.arrive) / 0.6;
          if (ru <= 0 || ru >= 1) continue;
          g.beginPath(); g.arc(cx, cy, r * (1 + 0.6 * ML.out(ru, 0, 1)), 0, Math.PI * 2);
          g.strokeStyle = rgba(lite, 0.8 * (1 - ru)); g.lineWidth = Math.max(0.5, S * 0.006 * (1 - ru)); g.stroke();
        }
        // the target lands inside the full orb
        if (own) {
          const u = ML.land(t, lastArrive - 0.15, lastArrive + 0.45);
          own.style.opacity = u.toFixed(4);
          own.style.scale = u < 1 ? (0.85 + 0.15 * u).toFixed(4) : "none";
        }
      },
    };
  },
});
