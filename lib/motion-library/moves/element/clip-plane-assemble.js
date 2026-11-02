// Clip-plane self-build: the whole object exists from the first frame; a horizontal clipping plane at height h(t)
// rises through it, so everything below the line is finished and everything above is not there yet. The cut is
// closed by a solid cap sized to the footprint at that height (so the section never reads hollow), and scaffolding —
// the one thing the plane ignores — stands in the band just above the cut during each stage, growing in over the
// first 17 % of the stage and fading over its last 10 %. Stage times follow the source's [0, .21, 1.07, 1.92, 2.79,
// 3.64, 4.36] of 4.4 s (rescaled to `duration` and to the stage count); within a stage
// h = prev + (to − prev) · easeInOutQuad. Holds at 100 %. A long-lens orbit turns the object slowly. A percent and
// stage plaque rides the cut line.
// Ported to a canvas painted per frame from t (the gate's pages carry no three.js): faceted prisms projected with a
// slow orbit, truncated at the plane, the cap drawn at the cut; colours read from the look variables. "logo-extrude"
// is the source's own 2D port: a clip rect rising over an extruded mark with a cap line.
// Source: MengTo/Skills agent-skills/web-design/threejs-towers/demo (MIT) — the clipping-plane build, stage timeline,
// cap table and scaffold grow / fade.
ML.define({
  id: "element.clip-plane-assemble",
  category: "element",
  name: "Clip-plane self-build",
  does: "An object or building assembles from the ground up: everything below a rising line is finished with a solid cut top, scaffolding just above it.",
  says: ["arrival", "growth", "step", "reveal"],
  energy: 3,
  targets: ["shape", "logo", "stage"],
  duration: [3, 6.5],
  params: {
    duration: { type: "number", range: [3, 6], default: 4.4, unit: "s" },
    stages: { type: "number", range: [4, 7], default: 6 },
    scaffold: { type: "bool", default: true },
    object: { type: "choice", options: ["building", "product", "logo-extrude"], default: "building" },
    mark: { type: "text", default: "" },
    plaque: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["camera.long-lens-dolly-in", "data.odometer", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:agent-skills/web-design/threejs-towers/demo/index.html", license: "MIT", note: "clipping-plane build ported from three.js to a per-frame canvas" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop ? mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer) : null;
    const W = Math.round(R.w), H = Math.round(R.h);
    const cvs = mk("canvas", `position:absolute;left:0;top:0;width:${W}px;height:${H}px;`, layer);
    cvs.width = W; cvs.height = H;
    const g = cvs.getContext("2d");

    // look colours, resolved through a probe (var() and color-mix() become rgb)
    const probe = mk("div", "position:absolute;width:0;height:0;", layer);
    const col = (v) => { probe.style.color = `var(${v})`; const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]; return m.slice(0, 3).map(Number); };
    const C = { panel: col("--x-panel"), panel2: col("--x-panel-2"), ink: col("--x-ink"), dim: col("--x-dim"), accent: col("--x-accent"), accent2: col("--x-accent-2"), ground: col("--x-ground") };
    probe.remove();
    const mixc = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
    const rgb = (c, a = 1) => `rgba(${c.map((x) => Math.round(ML.clamp(x, 0, 255))).join(",")},${a})`;
    const shade = (c, s) => (s >= 1 ? mixc(c, [255, 255, 255], s - 1) : mixc(c, C.ink, (1 - s) * 0.9));
    const headFont = getComputedStyle(layer).getPropertyValue("--x-head-font").trim() || "sans-serif";
    const labelFont = getComputedStyle(layer).getPropertyValue("--x-label-font").trim() || "monospace";
    const headWeight = getComputedStyle(layer).getPropertyValue("--x-head-weight").trim() || "700";

    // the object: prisms [y0, y1, r0, r1, sides, colour, floors?] (world units, y up), footprint caps follow the prism
    const Q = Math.PI / 4;
    const OBJ = {
      building: [[0, 0.5, 2.5, 2.5, 4, C.panel2, 0], [0.5, 4.6, 1.85, 1.85, 4, C.panel, 0.42], [4.6, 4.85, 2.0, 2.0, 4, C.accent, 0], [4.85, 6.7, 1.45, 1.45, 4, C.panel, 0.42], [6.7, 6.9, 1.6, 1.6, 4, C.accent, 0], [6.9, 8.0, 1.0, 1.0, 4, C.panel2, 0.42], [8.0, 9.4, 0.32, 0.05, 4, C.accent, 0]],
      product: [[0, 0.25, 1.15, 1.2, 28, C.panel2, 0], [0.25, 2.2, 1.2, 1.2, 28, C.panel, 0], [2.2, 3.0, 1.2, 1.2, 28, C.accent, 0], [3.0, 3.7, 1.2, 1.2, 28, C.panel, 0], [3.7, 4.4, 1.2, 0.5, 28, C.panel, 0], [4.4, 5.0, 0.42, 0.42, 28, C.panel2, 0], [5.0, 5.8, 0.55, 0.55, 28, C.accent2, 0]],
    };
    const logoMode = p.object === "logo-extrude";
    const prisms = logoMode ? [] : OBJ[p.object] || OBJ.building;
    const Htot = logoMode ? 1 : prisms[prisms.length - 1][1];
    const maxR = logoMode ? 1 : Math.max(...prisms.map((q) => Math.max(q[2], q[3])));
    const E = 0.42; // elevation: how much of the depth shows as screen height
    const S = Math.min((H * 0.8) / (Htot + maxR * E * 2.2), (W * 0.78) / (maxR * 2.5));
    const cx = W / 2, baseY = H * 0.5 + (Htot * S) / 2 + maxR * S * E * 0.2;
    const radAt = (y) => { for (const q of prisms) if (y >= q[0] && y <= q[1]) return q[2] + (q[3] - q[2]) * ((y - q[0]) / (q[1] - q[0] || 1)); return 0; };

    // stages (source times, rescaled), heights evenly up the object with a seeded wobble
    const D = ML.clamp(p.duration, 3, 6);
    const ns = Math.round(ML.clamp(p.stages, 4, 7));
    const T = [0, (0.21 / 4.4) * D];
    for (let i = 2; i < ns; i++) T.push(T[1] + ((4.36 / 4.4) * D - T[1]) * ((i - 1) / (ns - 2)));
    const Hs = [0];
    for (let i = 1; i < ns; i++) Hs.push(i === ns - 1 ? Htot : Htot * (i / (ns - 1)) * (0.94 + ML.rnd(i, 3) * 0.1));
    const t0 = at + 0.25;
    const quad = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const stageAt = (u) => { let i = 0; for (let j = 0; j < ns; j++) if (u >= T[j]) i = j; return i; };
    // h rises from the last stage's height to this stage's over the stage's span (stage 0 is the empty site)
    const hAt = (u) => { if (u <= T[1]) return 0; const i = stageAt(u); const nx = i + 1 < ns ? T[i + 1] : D; return Hs[i - 1] + (Hs[i] - Hs[i - 1]) * quad(ML.clamp((u - T[i]) / Math.max(1e-4, nx - T[i]))); };
    const NAMES = {
      building: rtl ? ["الموقع", "الأساس", "الهيكل", "الحوائط", "الأدوار", "الواجهة", "السقف"] : ["Site", "Footing", "Frame", "Walls", "Floors", "Facade", "Roof"],
      product: rtl ? ["البداية", "القاعدة", "الجسم", "الملصق", "الكتف", "العنق", "الغطاء"] : ["Start", "Base", "Body", "Label", "Shoulder", "Neck", "Cap"],
      "logo-extrude": rtl ? ["البداية", "الرسم", "العمق", "الوجه", "الحواف", "اللمعة", "تمام"] : ["Start", "Sketch", "Depth", "Face", "Edges", "Polish", "Done"],
    };
    const names = NAMES[p.object] || NAMES.building;
    for (let i = 1; i < ns; i++) ctx.sfx(t0 + T[i], "snap", 0.16);
    ctx.sfx(t0, "riser", 0.3);
    ctx.sfx(t0 + D, "success", 0.3);

    // plaque on the cut line
    const plaque = p.plaque ? mk("div", `position:absolute;left:0;top:0;display:flex;align-items:center;gap:${10 * k}px;white-space:nowrap;padding:${8 * k}px ${14 * k}px;border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font:var(--x-label-weight) ${26 * k}px var(--x-label-font);color:var(--x-dim);`, layer) : null;
    const pPct = plaque ? mk("span", "color:var(--x-accent);", plaque, "0%") : null;
    const pName = plaque ? mk("span", rtl ? "" : "letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);", plaque, names[0]) : null;

    // logo-extrude: the mark set once
    const mark = p.mark || (own && (own.getAttribute("aria-label") || own.textContent || "").trim().split(/\s+/)[0]) || (rtl ? "م" : "M");
    const glyph = Array.from(mark).slice(0, 3).join("");
    const gSize = Math.min(H * 0.55, (W * 0.8) / Math.max(1, Array.from(glyph).length * 0.75));
    const depth = Math.round(gSize * 0.09);

    const sign = rtl ? -1 : 1;
    const proj = (x, y, z, th) => { const c = Math.cos(th), s = Math.sin(th); const xr = x * c - z * s, zr = x * s + z * c; return [cx + xr * S, baseY - y * S + zr * S * E]; };
    const goA = Math.max(t0 + D + 0.4, end - 0.3);

    function drawPrisms(h, th) {
      // ground shadow
      g.fillStyle = rgb(C.ink, 0.08);
      g.beginPath(); g.ellipse(cx, baseY + 4 * k, maxR * S * 1.25, maxR * S * E * 1.25, 0, 0, Math.PI * 2); g.fill();
      // site footprint (always there, faint)
      const fp = prisms[0], fn = fp[4];
      g.strokeStyle = rgb(C.dim, 0.35); g.lineWidth = Math.max(1, 1.5 * k); g.setLineDash([6 * k, 6 * k]);
      g.beginPath();
      for (let i = 0; i <= fn; i++) { const a = (fn === 4 ? Q : 0) + (i / fn) * Math.PI * 2; const [X, Y] = proj(Math.cos(a) * fp[2] * 1.08, 0, Math.sin(a) * fp[2] * 1.08, th); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
      g.stroke(); g.setLineDash([]);
      for (const [y0, y1, r0, r1, n, c, fl] of prisms) {
        if (h <= y0) break;
        const top = Math.min(y1, h), rt = r0 + (r1 - r0) * ((top - y0) / (y1 - y0)), cut = top < y1;
        const off = n === 4 ? Q : 0;
        const V = (y, r, i) => { const a = off + (i / n) * Math.PI * 2; return proj(Math.cos(a) * r, y, Math.sin(a) * r, th); };
        const faces = [];
        for (let i = 0; i < n; i++) {
          const am = off + ((i + 0.5) / n) * Math.PI * 2, nx = Math.cos(am), nz = Math.sin(am);
          const nxr = nx * Math.cos(th) - nz * Math.sin(th), nzr = nx * Math.sin(th) + nz * Math.cos(th);
          if (nzr <= -0.02) continue;
          faces.push({ i, nzr, lum: 0.8 + 0.22 * (-0.55 * nxr + 0.65 * nzr) });
        }
        faces.sort((a, b) => a.nzr - b.nzr);
        for (const fc of faces) {
          const a = V(y0, r0, fc.i), b = V(y0, r0, fc.i + 1), cc = V(top, rt, fc.i + 1), d = V(top, rt, fc.i);
          g.fillStyle = rgb(shade(c, fc.lum));
          g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...cc); g.lineTo(...d); g.closePath(); g.fill();
          if (n <= 8) { g.strokeStyle = rgb(C.ink, 0.12); g.lineWidth = Math.max(1, k); g.stroke(); }
          if (fl) {
            g.strokeStyle = rgb(C.ink, 0.1); g.lineWidth = Math.max(1, k);
            for (let y = y0 + fl; y < top - 0.02; y += fl) {
              const u = (y - y0) / (y1 - y0), r = r0 + (r1 - r0) * u, p1 = V(y, r, fc.i), p2 = V(y, r, fc.i + 1);
              g.beginPath(); g.moveTo(...p1); g.lineTo(...p2); g.stroke();
              // window mullions
              for (let m = 1; m < 4; m++) { const q1 = [p1[0] + (p2[0] - p1[0]) * (m / 4), p1[1] + (p2[1] - p1[1]) * (m / 4)]; g.beginPath(); g.moveTo(q1[0], q1[1]); g.lineTo(q1[0], q1[1] + fl * S * 0.55); g.stroke(); }
            }
          }
        }
        // the top: a solid cap at the cut (lighter, edged in the accent), or the prism's own roof
        g.fillStyle = rgb(cut ? mixc(shade(c, 1.06), C.accent, 0.12) : shade(c, 1.04));
        g.beginPath();
        for (let i = 0; i < n; i++) { const [X, Y] = V(top - (cut ? 0.003 : 0), rt, i); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
        g.closePath(); g.fill();
        if (cut) { g.strokeStyle = rgb(C.accent, 0.9); g.lineWidth = Math.max(1.5, 2.5 * k); g.stroke(); }
      }
    }

    function drawScaffold(h, th, u) {
      if (!p.scaffold) return;
      const si = stageAt(u);
      if (si < 1 || u >= D) return;
      const nx = si + 1 < ns ? T[si + 1] : D, local = (u - T[si]) / Math.max(1e-4, nx - T[si]);
      const grow = Math.min(1, local / 0.17), fade = local > 0.9 ? 1 - (local - 0.9) / 0.1 : 1;
      const yb = Math.max(0, h - 0.25), yt = Math.min(Htot + 0.3, Hs[si] + 0.45);
      if (yt <= yb) return;
      const r = Math.max(0.4, radAt(Math.min(Htot - 0.01, (yb + yt) / 2)) || radAt(Math.max(0, h - 0.01))) * 1.18;
      const corners = [0, 1, 2, 3].map((i) => Q + (i / 4) * Math.PI * 2);
      g.strokeStyle = rgb(mixc(C.dim, C.accent2, 0.25), 0.85 * fade); g.lineWidth = Math.max(1.5, 2.6 * k); g.lineCap = "round";
      const items = [];
      corners.forEach((a) => items.push({ kind: "v", a }));
      const step = 0.55;
      for (let y = yb + step; y <= yt + 1e-3; y += step) corners.forEach((a, i) => items.push({ kind: "h", a, b: corners[(i + 1) % 4], y }));
      corners.forEach((a, i) => items.push({ kind: "d", a, b: corners[(i + 1) % 4] }));
      items.forEach((it, idx) => {
        const d = ((idx % 9) / 9) * 0.3, gg = ML.clamp((grow - d) / (1 - d)), e = 1 - Math.pow(1 - gg, 3);
        if (gg <= 0.02) return;
        const P = (a, y) => proj(Math.cos(a) * r, y, Math.sin(a) * r, th);
        g.beginPath();
        if (it.kind === "v") { const A = P(it.a, yb), B = P(it.a, yb + (yt - yb) * e); g.moveTo(...A); g.lineTo(...B); }
        else if (it.kind === "h") { const A = P(it.a, it.y), B = P(it.b, it.y); g.moveTo(...A); g.lineTo(A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e); }
        else { const A = P(it.a, yb), B = P(it.b, yt); g.moveTo(...A); g.lineTo(A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e); }
        g.stroke();
      });
    }

    function drawLogo(hf, u) {
      g.save();
      g.font = `${headWeight} ${gSize}px ${headFont}`;
      g.textAlign = "center"; g.textBaseline = "alphabetic"; g.direction = rtl ? "rtl" : "ltr";
      const m = g.measureText(glyph);
      const asc = m.actualBoundingBoxAscent || gSize * 0.72, desc = m.actualBoundingBoxDescent || 0;
      const gw = m.width, gx = cx, gy = H / 2 + (asc - desc) / 2;
      const top = gy - asc, bot = gy + desc + depth;
      const cutY = bot - (bot - top) * hf;
      // ground shadow
      g.fillStyle = rgb(C.ink, 0.08); g.beginPath(); g.ellipse(gx, bot + 10 * k, gw * 0.6, gSize * 0.06, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.rect(0, cutY, W, H); g.clip();
      for (let i = depth; i >= 1; i--) { g.fillStyle = rgb(shade(C.accent, 0.62 + 0.18 * (1 - i / depth))); g.fillText(glyph, gx + i * 0.55 * sign, gy + i); }
      const grad = g.createLinearGradient(0, top, 0, gy + desc);
      grad.addColorStop(0, rgb(shade(C.accent, 1.12))); grad.addColorStop(1, rgb(C.accent));
      g.fillStyle = grad; g.fillText(glyph, gx, gy);
      g.restore();
      if (hf > 0 && hf < 1) {
        g.strokeStyle = rgb(C.accent, 0.95); g.lineWidth = Math.max(2, 3 * k);
        g.beginPath(); g.moveTo(gx - gw * 0.58, cutY); g.lineTo(gx + gw * 0.58, cutY); g.stroke();
        // ghost outline of what is still to come, above the cut
        g.save(); g.beginPath(); g.rect(0, 0, W, cutY); g.clip();
        g.strokeStyle = rgb(C.dim, 0.35); g.lineWidth = Math.max(1, 1.5 * k); g.setLineDash([6 * k, 6 * k]); g.strokeText(glyph, gx, gy); g.setLineDash([]);
        g.restore();
        if (p.scaffold) {
          const si = stageAt(u), nx = si + 1 < ns ? T[si + 1] : D, local = (u - T[si]) / Math.max(1e-4, nx - T[si]);
          const grow = Math.min(1, local / 0.17), fade = local > 0.9 ? 1 - (local - 0.9) / 0.1 : 1;
          const yT = bot - (bot - top) * Math.min(1, Hs[si] / Htot + 0.08);
          g.strokeStyle = rgb(mixc(C.dim, C.accent2, 0.25), 0.85 * fade); g.lineWidth = Math.max(1.5, 2.4 * k);
          for (let j = 0; j <= 4; j++) { const x = gx - gw * 0.55 + (gw * 1.1 * j) / 4; g.beginPath(); g.moveTo(x, cutY + 4 * k); g.lineTo(x, cutY - (cutY - yT) * grow); g.stroke(); }
          for (let y = cutY - 24 * k; y > yT; y -= 30 * k) { g.beginPath(); g.moveTo(gx - gw * 0.55, y); g.lineTo(gx - gw * 0.55 + gw * 1.1 * grow, y); g.stroke(); }
        }
      }
      g.restore();
      return cutY;
    }

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        const u = ML.clamp(t - t0, 0, D);
        const h = hAt(u);
        const th = 0.62 + sign * 0.14 * Math.max(0, t - at);
        g.clearRect(0, 0, W, H);
        g.save(); // every frame starts from the same canvas state (line caps, dashes, alpha)
        g.globalAlpha = ML.out(t, at, at + 0.3);
        let cutY;
        if (logoMode) cutY = drawLogo(h / Htot, u);
        else {
          drawPrisms(h, th);
          drawScaffold(h, th, u);
          cutY = baseY - h * S;
        }
        g.restore();
        if (plaque) {
          const pct = Math.round((h / Htot) * 100), si = stageAt(u);
          const txt = rtl ? `٪${pct}` : `${pct}%`;
          if (pPct.textContent !== txt) pPct.textContent = txt;
          const nm = u >= D ? names[Math.min(names.length - 1, 6)] : names[Math.min(si, names.length - 1)];
          if (pName.textContent !== nm) pName.textContent = nm;
          const pw = plaque.offsetWidth, ph = plaque.offsetHeight;
          const rr = logoMode ? W * 0.3 : (radAt(Math.max(0, Math.min(Htot - 0.01, h))) || maxR) * S * 1.3;
          const x = rtl ? cx - rr - pw - 12 * k : cx + rr + 12 * k;
          plaque.style.transform = `translate(${ML.clamp(x, 4 * k, W - pw - 4 * k).toFixed(2)}px, ${ML.clamp(cutY - ph / 2, 4 * k, H - ph - 4 * k).toFixed(2)}px)`;
          plaque.style.opacity = (ML.out(t, t0, t0 + 0.4)).toFixed(4);
        }
      },
    };
  },
});
