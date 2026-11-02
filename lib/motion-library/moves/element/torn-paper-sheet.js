// Torn handmade paper sheet: a sheet of washi, cotton rag or kraft with torn deckled edges, pulled fibres, formation
// clouds, flecks and real thickness hangs (pegged, swaying) or lies in frame (optionally with a rolled corner); when
// `backlight` is on, light behind the sheet eases in (1 − e^(−k·dt), k 4.5 → 0.5–1 s) and glows through the thin parts.
// The outline is four seeded tear lines (the source's tearLine: a random walk that runs straight, turns and runs again,
// plus three fbm octaves) with per-stock amplitudes (cut sides 3–4, torn 54–96 samples at 3400 per sheet unit) and the
// fibres pulled past each torn edge (fray); three offset copies behind give it thickness (tinted .94 / .87 / .80). The
// field per pixel: formation clouds (fbm), long fibres (ridged noise stretched by the stock's fa / fb), tooth and
// flecks; back-light transmission tr = 0.74 + (0.5 − form)·0.85 + (0.5 − lowfbm)·0.45 − fibre·0.22 − fleck·0.45, times
// the stock's transmission (washi 1.0, rag .42, kraft .16). Baked once in setup to two canvases (lit from the front,
// lit from behind); each frame draws them from t (sway, entrance, backlight mix) in 2D canvas — the WebGL shader's
// look, painted. On an image target the picture is printed on the sheet (multiplied, never enlarged); on a card the
// sheet is its mount and sways with it. Stock colours are mixed from the look (panel, ground, ink, light-2).
// Source: MengTo/Skills 3d/3d-paper-material demo.html (MIT): STOCKS (tearA, fray, fa/fb, speck, thick, trans),
// tearLine / buildEdge (kibori's), the transmission line of the sheet shader — rebuilt in 2D canvas.
ML.define({
  id: "element.torn-paper-sheet",
  category: "element",
  name: "Torn handmade paper sheet",
  does: "A sheet of washi, rag or kraft paper with torn deckled edges, fibres and real thickness hangs or lies in frame; light behind glows through the thin parts.",
  says: ["luxury", "story", "calm", "brand", "trust"],
  energy: 2,
  targets: ["image", "card", "scene"],
  duration: [2, 10],
  params: {
    stock: { type: "choice", options: ["washi", "rag", "kraft"], default: "washi" },
    backlight: { type: "bool", default: false },
    pose: { type: "choice", options: ["hung", "laid", "rolled-corner"], default: "hung" },
  },
  pairs: ["camera.slow-push", "text-in.punchline"],
  avoid: ["urgency", "speed", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/3d/3d-paper-material/demo.html", license: "MIT", note: "stocks, tearLine/buildEdge fray, thickness layers and the back-light transmission term, rebuilt in 2D canvas" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage && el !== ctx.scene ? el : null;
    const isImg = own && own.tagName === "IMG";
    const STOCK = {
      washi: { tint: "color-mix(in srgb, var(--x-panel) 86%, var(--x-light-2))", fa: [1.9, 54], fb: [44, 2.3], relief: 0.55, speck: [190, 0.9955], trans: 1.0, edge: 0.88, tearA: [64, 72, 60, 76], fray: [1, 1, 1, 1], frayScale: 12, thick: 0.0045, seed: 11 },
      rag: { tint: "color-mix(in srgb, var(--x-panel) 90%, var(--x-ground))", fa: [15, 17], fb: [16, 14], relief: 0.32, speck: [240, 0.9985], trans: 0.42, edge: 0.9, tearA: [3, 58, 3, 54], fray: [0, 0.7, 0, 0.7], frayScale: 6, thick: 0.0085, seed: 23 },
      kraft: { tint: "color-mix(in srgb, color-mix(in srgb, var(--x-light-2) 52%, var(--x-ink)) 62%, var(--x-panel))", fa: [7, 26], fb: [26, 7], relief: 0.8, speck: [150, 0.984], trans: 0.16, edge: 0.78, tearA: [96, 3, 4, 3], fray: [1.2, 0, 0, 0], frayScale: 8, thick: 0.011, seed: 37 },
    };
    const st = STOCK[p.stock] || STOCK.washi;
    // ── colours from the look ──
    const probe = doc.createElement("div"); probe.style.display = "none"; host.append(probe);
    const rgb = (css) => { probe.style.color = ""; probe.style.color = css; const s = getComputedStyle(probe).color, n = (s.match(/-?[\d.]+/g) || [0, 0, 0]).map(Number); return s.startsWith("color(") ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3); };
    const tint = rgb(st.tint), ink = rgb("var(--x-ink)"), warm = rgb("color-mix(in srgb, var(--x-panel) 70%, var(--x-light-2))");
    probe.remove();

    // ── the sheet's box (stage px) ──
    const S0 = Math.min(f.W, f.H);
    let sheet;
    if (own) {
      const b = ctx.box(own), pad = Math.min(b.w, b.h) * (isImg ? 0.08 : 0.1) + S0 * 0.02;
      sheet = { x: b.x - pad, y: b.y - pad * (p.pose === "hung" ? 1.4 : 1), w: b.w + pad * 2, h: b.h + pad * (p.pose === "hung" ? 2.4 : 2), inner: b };
    } else {
      const R = f.pic, ar = 1.55 / 2.2;
      let h = R.h * 0.9, w = h * ar;
      if (w > R.w * 0.8) { w = R.w * 0.8; h = w / ar; }
      sheet = { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h, inner: null };
    }
    const SW = Math.round(sheet.w), SH = Math.round(sheet.h);
    const ppu = SW / 1.55; // px per sheet unit (the source's A4 is 1.55 units wide)
    const TSpx = 3400 / ppu; // tear samples per px
    const M = Math.ceil(S0 * 0.03); // room for torn edges and fibres
    const CW = SW + M * 2, CH = SH + M * 2;

    // ── the source's noise and tear line (kibori's) ──
    const h1 = (i, s) => { let n = (Math.imul(i, 374761393) + Math.imul(s, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const n1 = (x, s) => { const i = Math.floor(x), q = x - i, u = q * q * (3 - 2 * q), a = h1(i, s); return a + (h1(i + 1, s) - a) * u; };
    const fbmJ = (x, s, o) => { let v = 0, a = 0.5, n = 0; for (let k = 0; k < o; k++) { v += a * n1(x, s + k * 31); n += a; x *= 2.07; a *= 0.5; } return v / n; };
    const lcg = (seed) => { let sd = seed | 0; return () => { sd = (Math.imul(sd, 1664525) + 1013904223) | 0; return (sd >>> 8) / 16777216; }; };
    const rf = lcg(st.seed * 977 + 13);
    function tearLine(n, A, seed) {
      const y = new Float32Array(n); let s = 0, v = 0, m = 0, q = 0;
      for (let i = 0; i < n; i++) { s += -s * 0.08 + (rf() - 0.5) * 0.4; if (rf() < 0.006) s += (rf() - 0.5) * 4.0; v += s * 0.5; v -= v * 0.02; y[i] = v; m += v; q += v * v; }
      m /= n; const sd = Math.sqrt(Math.max(1e-6, q / n - m * m));
      for (let i = 0; i < n; i++) y[i] = A * (0.14 * (y[i] - m) / sd + 1.7 * (fbmJ(i / 320, seed, 2) - 0.5) + 0.55 * (fbmJ(i / 64, seed + 3, 2) - 0.5) + 0.16 * (fbmJ(i / 9, seed + 7, 2) - 0.5)) + (rf() - 0.5) * 0.45;
      return y;
    }
    const VIS = 1.6; // the sheet is seen at video distance: tears a little bolder than at print scale
    const sides = [SW, SH, SW, SH].map((len, k) => {
      const n = Math.max(8, Math.round(len * TSpx));
      const edge = tearLine(n, st.tearA[k], st.seed + k * 5);
      const fib = [];
      if (st.fray[k] > 0) for (let x = 0; x < n; x += (0.45 + rf() * 0.9) * 6) {
        if (rf() < 0.35) continue;
        const i = Math.min(n - 1, x | 0), long = rf() < 0.05;
        const len2 = (long ? 5 + rf() * 10 : 0.8 + rf() * rf() * 5.5) * st.frayScale;
        const ang = Math.PI / 2 + (rf() - 0.5) * (long ? 2.2 : 1.7);
        if (rf() > Math.min(1, st.fray[k])) continue;
        fib.push({ x: x / TSpx, y0: (edge[i] - rf() * 2.2) / TSpx * VIS, dx: Math.cos(ang) * len2 / TSpx * VIS, dy: Math.sin(ang) * len2 / TSpx * VIS, bend: (rf() - 0.5) * len2 * 0.5 / TSpx, al: long ? 0.18 + rf() * 0.22 : 0.3 + rf() * 0.45, lw: Math.max(0.6, (long ? 0.3 + rf() * 0.25 : 0.35 + rf() * 0.4) * 1.7) });
      }
      return { n, edge: (i) => (edge[Math.min(n - 1, Math.max(0, Math.round(i * TSpx)))] / TSpx) * VIS, fib };
    });
    // outline in canvas px (outward = positive edge offset)
    const outline = new Path2D(), pts = [];
    for (let x = 0; x <= SW; x += 1) pts.push([M + x, M - sides[0].edge(x)]);
    for (let y = 0; y <= SH; y += 1) pts.push([M + SW + sides[1].edge(y), M + y]);
    for (let x = SW; x >= 0; x -= 1) pts.push([M + x, M + SH + sides[2].edge(x)]);
    for (let y = SH; y >= 0; y -= 1) pts.push([M - sides[3].edge(y), M + y]);
    pts.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
    outline.closePath();
    const sideM = (k, x, y) => [[M + x, M - y], [M + SW + y, M + x], [M + x, M + SH + y], [M - y, M + x]][k];

    // ── the field, baked per pixel ──
    const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return s - Math.floor(s); };
    const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v); const A = hash2(i, j), B = hash2(i + 1, j), C = hash2(i, j + 1), D = hash2(i + 1, j + 1); return A + (B - A) * a + (C - A) * b + (A - B - C + D) * a * b; };
    const fbm = (x, y, o) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); n += a; x = x * 2.03 + 11.7; y = y * 2.03 + 11.7; a *= 0.5; } return s / n; };
    const ridged = (x, y) => 1 - Math.abs(vnoise(x, y) * 2 - 1);
    const sm = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const mk = () => { const c = doc.createElement("canvas"); c.width = CW; c.height = CH; return c; };
    const refl = mk(), tran = mk();
    const gR = refl.getContext("2d"), gT = tran.getContext("2d");
    const imR = gR.createImageData(CW, CH), imT = gT.createImageData(CW, CH);
    const seedO = st.seed * 3.1;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const qx = (x - M) / ppu + seedO, qy = (y - M) / ppu;
      const form = fbm(qx * 7, qy * 7, 4);
      const low = fbm(qx * 2.2 + 7, qy * 2.2 + 7, 3);
      const wx = qx + (vnoise(qx * 9, qy * 9) - 0.5) * 0.02, wy = qy + (vnoise(qx * 9 + 5, qy * 9) - 0.5) * 0.02;
      const fa = ridged(wx * st.fa[0] * 2, wy * st.fa[1] * 2), fb2 = ridged(wx * st.fb[0] * 2 + 3, wy * st.fb[1] * 2);
      const fibre = Math.max(sm(0.945, 0.997, fa), sm(0.955, 0.997, fb2));
      const sc = st.speck[0] * 0.7, fx = qx * sc - Math.floor(qx * sc), fy = qy * sc - Math.floor(qy * sc), fleck = hash2(Math.floor(qx * sc), Math.floor(qy * sc) + 0.5) > st.speck[1] ? sm(0.42, 0.2, Math.hypot(fx - 0.5, (fy - 0.5) * 1.6)) : 0;
      const tooth = hash2(x * 0.71, y * 0.37);
      const k = (y * CW + x) * 4;
      const lum = 0.95 + (form - 0.5) * 0.09 + fibre * st.relief * 0.09 + (tooth - 0.5) * 0.035 - fleck * 0.45;
      const fc = fleck > 0 ? 0.75 : 1;
      imR.data[k] = tint[0] * lum * fc; imR.data[k + 1] = tint[1] * lum * fc; imR.data[k + 2] = tint[2] * lum * (fc * 0.95); imR.data[k + 3] = 255;
      const tr = Math.max(0, (0.74 + (0.5 - form) * 0.85 + (0.5 - low) * 0.45 - fibre * 0.22 - fleck * 0.45) * st.trans);
      // lit from behind: thin parts take the light's colour and brighten, thick parts (fibres, flecks) stay the stock's
      const kq = ML.clamp(tr), L = 0.8 + 0.32 * Math.min(1.3, tr);
      for (let c = 0; c < 3; c++) imT.data[k + c] = Math.min(255, (tint[c] * (1 - kq) + warm[c] * kq) * L);
      imT.data[k + 3] = 255;
    }
    // the field, then cut to the sheet with the thickness layers behind and the fray in front
    const bake = (g, im, isT) => {
      const fld = mk(); fld.getContext("2d").putImageData(im, 0, 0);
      g.clearRect(0, 0, CW, CH);
      const th = st.thick * ppu * 1.4;
      [0.8, 0.87, 0.94].forEach((tn, i) => { // three offset copies behind, darkest farthest
        const o = th * (3 - i) / 3;
        g.save(); g.translate(o * 0.6, o); g.fillStyle = `rgb(${tint.map((v) => v * tn * (isT ? 0.85 : 1)).join(",")})`; g.fill(outline); g.restore();
      });
      g.save(); g.clip(outline); g.drawImage(fld, 0, 0);
      // a paler feathered strip inside the torn edges (thinner paper before it parts)
      g.lineWidth = Math.max(2, S0 * 0.004); g.strokeStyle = `rgba(${(isT ? warm : tint).map((v) => Math.min(255, v * 1.06)).join(",")},${isT ? 0.55 : 0.5})`; g.stroke(outline);
      g.restore();
      // the fray: fibres standing proud of each torn edge
      g.lineCap = "round"; g.strokeStyle = `rgb(${tint.map((v) => v * st.edge).join(",")})`;
      sides.forEach((s, k) => s.fib.forEach((q) => {
        const [x0, y0] = sideM(k, q.x, q.y0), [x1, y1] = sideM(k, q.x + q.dx, q.y0 + q.dy), [xc, yc] = sideM(k, q.x + q.dx / 2 + q.bend, q.y0 + q.dy / 2);
        g.globalAlpha = Math.min(1, q.al * 1.25); g.lineWidth = q.lw;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(xc, yc, x1, y1); g.stroke();
      }));
      g.globalAlpha = 1;
    };
    bake(gR, imR, false);
    bake(gT, imT, true);
    // the picture printed on the sheet (multiplied: the paper shows through), at its own size or smaller
    if (isImg && own.complete && own.naturalWidth) {
      const b = sheet.inner, ix = b.x - sheet.x + M, iy = b.y - sheet.y + M;
      const nw = own.naturalWidth, nh = own.naturalHeight, s = Math.max(b.w / nw, b.h / nh), sw = b.w / s, sh = b.h / s;
      for (const [g, a] of [[gR, 1], [gT, 0.8]]) {
        g.save(); g.clip(outline); g.globalCompositeOperation = "multiply"; g.globalAlpha = a;
        g.drawImage(own, (nw - sw) / 2, (nh - sh) / 2, sw, sh, ix, iy, b.w, b.h);
        g.restore();
      }
    }
    // a rolled corner: cut the bottom corner on the start side's far end and draw the curl over it
    if (p.pose === "rolled-corner") {
      const c = Math.min(SW, SH) * 0.22, right = !rtl;
      const ax = right ? M + SW - c : M + c, ay = M + SH, bx = right ? M + SW : M, by = M + SH - c;
      for (const [g, isT] of [[gR, false], [gT, true]]) {
        g.save(); g.globalCompositeOperation = "destination-out";
        g.beginPath(); g.moveTo(ax, ay + M); g.lineTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx + (right ? M : -M), by); g.lineTo(bx + (right ? M : -M), ay + M); g.closePath(); g.fill();
        g.restore();
        // the flap: the cut triangle folded over the fold line, shaded like a cylinder
        const fx = right ? M + SW - c : M + c, fy = M + SH - c;
        const gr = g.createLinearGradient((ax + bx) / 2, (ay + by) / 2, fx, fy);
        const col = (k) => `rgb(${(isT ? warm : tint).map((v) => Math.round(v * k)).join(",")})`;
        gr.addColorStop(0, col(0.78)); gr.addColorStop(0.35, col(1.0)); gr.addColorStop(1, col(0.9));
        g.save(); g.shadowColor = `rgba(${ink.join(",")},0.28)`; g.shadowBlur = c * 0.12; g.shadowOffsetY = c * 0.03;
        g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(fx + (right ? c * 0.12 : -c * 0.12), fy + c * 0.55, fx, fy); g.quadraticCurveTo(fx + (right ? c * 0.55 : -c * 0.55), fy + c * 0.12, bx, by); g.closePath();
        g.fillStyle = gr; g.fill(); g.restore();
      }
    }

    // ── the display canvas (with room for the shadow, the halo and the sway) ──
    const room = Math.round(S0 * 0.08);
    const cv = doc.createElement("canvas");
    cv.width = CW + room * 2; cv.height = CH + room * 2;
    const left = sheet.x - M - room, top = sheet.y - M - room;
    cv.style.cssText = `position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${cv.width}px;height:${cv.height}px;pointer-events:none;`;
    if (isImg) { cv.style.zIndex = "4"; host.append(cv); }
    else if (own) { cv.style.zIndex = "4"; host.append(cv); if (getComputedStyle(own).position === "static") own.style.position = "relative"; own.style.zIndex = "5"; } // the sheet is the card's mount: over whatever the card sits in, under the card
    else { cv.style.zIndex = "0"; host.insertBefore(cv, host.firstChild); }
    const g = cv.getContext("2d");
    const hung = p.pose === "hung";
    const piv = hung ? [room + CW / 2, room + M] : [room + CW / 2, room + CH / 2];
    const restRot = hung ? 0 : (rtl ? 2.2 : -2.2);
    const tb = at + 0.6;
    ctx.sfx(at, hung ? "whoosh.soft" : "card", 0.3);
    if (p.backlight) ctx.sfx(tb, "swell", 0.25);
    const shadowCol = `rgba(${ink.join(",")},`;
    const oc = own ? [sheet.inner.x + sheet.inner.w / 2, sheet.inner.y + sheet.inner.h / 2] : null;
    return {
      draw(t) {
        g.clearRect(0, 0, cv.width, cv.height);
        if (t < at) { cv.style.visibility = "hidden"; if (own) { own.style.opacity = "1"; if (!isImg) { own.style.translate = "none"; own.style.rotate = "none"; } } return; }
        cv.style.visibility = "visible";
        const e = ML.lin(t, at, at + 0.35);
        const drop = hung ? (1 - ML.step(t - at, ML.SPRING.soft)) * -S0 * 0.06 : (1 - ML.out(t, at, at + 0.6)) * -S0 * 0.02;
        const sway = hung ? 1.1 * Math.sin(((t - at) / 5.2) * Math.PI * 2) + 0.35 * Math.sin(((t - at) / 2.3) * Math.PI * 2 + 1) + (1 - ML.lin(t, at, at + 1.2)) * 2.5 * Math.sin((t - at) * 6) : 0.25 * Math.sin(((t - at) / 7) * Math.PI * 2);
        const rot = ((restRot + sway) * Math.PI) / 180;
        const back = p.backlight ? (t > tb ? 1 - Math.exp(-(t - tb) * 4.5) : 0) : 0;
        const leave = 1 - ML.lin(t, end - 0.3, end);
        cv.style.opacity = (e * leave).toFixed(4);
        g.save();
        g.translate(piv[0], piv[1] + drop); g.rotate(rot); g.translate(-piv[0], -piv[1]);
        // the light behind: a warm halo around the sheet
        if (back > 0.002) {
          // an ellipse that fades out inside the canvas (no square edge)
          const hx = room + CW / 2, hy = room + CH / 2, ax = cv.width / 2, ay = cv.height / 2;
          g.save(); g.translate(hx, hy); g.scale(1, ay / ax);
          const hg = g.createRadialGradient(0, 0, ax * 0.3, 0, 0, ax);
          hg.addColorStop(0, `rgba(${warm.join(",")},${(0.5 * back).toFixed(3)})`); hg.addColorStop(1, `rgba(${warm.join(",")},0)`);
          g.fillStyle = hg; g.beginPath(); g.arc(0, 0, ax, 0, Math.PI * 2); g.fill(); g.restore();
        }
        // the cast shadow (off the wall when hung, tight when laid)
        g.save(); g.translate(room, room);
        g.shadowColor = shadowCol + (hung ? 0.22 : 0.3) * (1 - back * 0.7) + ")"; g.shadowBlur = S0 * (hung ? 0.035 : 0.014);
        g.shadowOffsetX = S0 * (hung ? 0.012 : 0.004) * (rtl ? -1 : 1); g.shadowOffsetY = S0 * (hung ? 0.022 : 0.008);
        g.fillStyle = `rgb(${tint.join(",")})`; g.fill(outline);
        g.restore();
        g.drawImage(refl, room, room);
        if (back > 0.002) { g.globalAlpha = back; g.drawImage(tran, room, room); g.globalAlpha = 1; }
        // pegs at the top when hung
        if (hung) {
          const pw = S0 * 0.018, ph = S0 * 0.05;
          g.fillStyle = shadowCol + "0.82)";
          for (const u of [0.22, 0.78]) { const x = room + M + SW * u; g.beginPath(); g.roundRect(x - pw / 2, room + M - ph * 0.55, pw, ph, pw * 0.35); g.fill(); }
        }
        g.restore();
        // the target rides on the sheet
        if (isImg) own.style.opacity = (1 - e).toFixed(4);
        else if (own) {
          own.style.opacity = (e * leave).toFixed(4);
          const pcx = left + piv[0], pcy = top + piv[1];
          const dx = oc[0] - pcx, dy = oc[1] - pcy, c = Math.cos(rot), s = Math.sin(rot);
          own.style.translate = `${(c * dx - s * dy - dx).toFixed(2)}px ${(s * dx + c * dy - dy + drop).toFixed(2)}px`;
          own.style.rotate = `${((rot * 180) / Math.PI).toFixed(3)}deg`;
        }
      },
    };
  },
});
