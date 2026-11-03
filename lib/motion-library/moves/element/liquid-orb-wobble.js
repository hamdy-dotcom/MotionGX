// Wobbling liquid orb: a clear liquid sphere hangs over its target, its outline r(θ, t) = 1 + Σ modes — three P2
// modes (about three axes) and a P3 mode on springs (ω 7.2 / 8.1 / 6.6 / 11.3 rad/s, damping 0.16 + 0.25 × settle),
// each a closed-form damped sine from every kick time (so any t is seekable), a warped noise drift of 4.2 % (halved
// as it settles), a fine 0.5 % octave, and up to 4 capillary rings running round from where it was struck (derivative
// of a Gaussian, amplitude e^(−1.6 age), width × (1 + 0.8 age)). The 2D port of tide-crystal's water orb: the blob is
// painted per frame on a canvas from t. Inside it, every pixel is the target seen through a real ball of water: the
// bent onto a copy of what sits behind it — magnified by the index of water (1.333) in the middle, squeezed toward the
// rim, the colours parting slightly at the edge — sliding with the P2 modes; then a rim, a specular glint and a soft caustic. Colours come from the look (read once in setup): the lights are
// the look's lightest colour. The copy is drawn large enough that the magnified target stays sharp.
// Source: MengTo/Skills agent-skills/game-combat/water-crystal-skill-vfx/assets/tide-crystal.mjs (MIT).
ML.define({
  id: "element.liquid-orb-wobble",
  category: "element",
  name: "Wobbling liquid orb",
  does: "A clear liquid sphere hangs over its target, magnifying it like a ball of water, its surface wobbling on springs and running with rings each time it is struck.",
  says: ["flow", "calm", "playful", "focus"],
  energy: 2,
  targets: ["logo", "shape", "number"],
  duration: [2, 8],
  params: {
    size: { type: "number", range: [80, 400], default: 200, unit: "px" },
    kick: { type: "number", range: [0, 1], default: 0.5 },
    tint: { type: "choice", options: ["clear", "brand"], default: "clear" },
    kicks: { type: "number", range: [1, 4], default: 2 },
    seed: { type: "number", range: [0, 99], default: 7 },
  },
  pairs: ["background.mesh-gradient", "text-in.punchline"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:agent-skills/game-combat/water-crystal-skill-vfx", license: "MIT", note: "tide-crystal's mode springs, warp drift and capillary rings ported to a 2D canvas blob" },
  async setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const B = el ? ctx.box(el) : { x: f.pic.x + f.pic.w / 2, y: f.pic.y + f.pic.h / 2, w: 0, h: 0 };
    const R0 = ML.clamp(p.size, 80, 400) * (Math.min(f.W, f.H) / 1080) / 2;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const pad = R0 * 0.5, side = Math.ceil((R0 + pad) * 2);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = doc.createElement("canvas");
    cv.width = side * dpr; cv.height = side * dpr;
    cv.style.cssText = `position:absolute;left:${cx - side / 2}px;top:${cy - side / 2}px;width:${side}px;height:${side}px;pointer-events:none;z-index:7;`;
    host.append(cv);
    const g = cv.getContext("2d");
    // colours from the look, normalised by the canvas itself
    const cs = getComputedStyle(host);
    const v = (n) => { g.fillStyle = "#000"; const c = cs.getPropertyValue(n).trim(); if (c) g.fillStyle = c; return g.fillStyle; };
    const ground = v("--x-ground"), ink = v("--x-ink"), accent = v("--x-accent"), accent2 = v("--x-accent-2");
    const lum = (c) => { const m = String(c).match(/^#(..)(..)(..)/) || []; return m[0] ? 0.2126 * parseInt(m[1], 16) + 0.7152 * parseInt(m[2], 16) + 0.0722 * parseInt(m[3], 16) : 0; };
    const lamp = [ground, ink, v("--x-panel"), v("--x-accent-ink")].sort((a, b) => lum(b) - lum(a))[0]; // the look's lightest colour lights the water
    // what is behind the orb, drawn once a few times larger than it shows (the lens magnifies it, and it stays sharp)
    const SS = 3;
    const back = doc.createElement("canvas");
    back.width = side * SS; back.height = side * SS;
    const bg = back.getContext("2d", { willReadFrequently: true });
    bg.scale(SS, SS);
    const ox0 = cx - side / 2, oy0 = cy - side / 2;
    bg.fillStyle = ground; bg.fillRect(0, 0, side, side);
    // the panel the target sits on, where it really is
    for (let n = el && el.parentElement; n && n !== host.parentElement; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { const b = ctx.box(n), rr = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0; bg.fillStyle = c; bg.beginPath(); bg.roundRect(b.x - ox0, b.y - oy0, b.w, b.h, rr); bg.fill(); break; }
    }
    const textAt = (node, fill, fs) => {
      const ncs = getComputedStyle(node), r = doc.createRange(); r.selectNodeContents(node);
      const st = host.getBoundingClientRect(), k = st.width / (host.offsetWidth || 1) || 1, rb = node instanceof SVGElement ? null : r.getBoundingClientRect();
      const b = rb && rb.width ? { x: (rb.left - st.left) / k, y: (rb.top - st.top) / k, w: rb.width / k, h: rb.height / k } : ctx.box(node);
      bg.font = ncs.fontWeight + " " + fs + "px " + ncs.fontFamily;
      if ("letterSpacing" in bg) bg.letterSpacing = ncs.letterSpacing === "normal" ? "0px" : ncs.letterSpacing;
      bg.fillStyle = fill; bg.textAlign = "center"; bg.textBaseline = "middle"; bg.direction = ML.ARABIC.test(node.textContent) ? "rtl" : "ltr";
      bg.fillText(node.textContent.trim(), b.x + b.w / 2 - ox0, b.y + b.h / 2 - oy0);
    };
    const drawn = (im, b) => { try { bg.drawImage(im, b.x - ox0, b.y - oy0, b.w, b.h); } catch (e) { /* an image that cannot be drawn leaves the panel behind */ } };
    if (el && el.tagName.toLowerCase() === "svg") {
      // the shapes through a copy with their look colours written in, the words with the page's own fonts
      const copy = el.cloneNode(true), real = [...el.querySelectorAll("*")], twin = [...copy.querySelectorAll("*")];
      twin.forEach((c, i) => { const r = getComputedStyle(real[i]); c.setAttribute("fill", r.fill); c.setAttribute("stroke", r.stroke); });
      copy.querySelectorAll("text").forEach((x) => x.remove());
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg"); copy.setAttribute("width", B.w * SS); copy.setAttribute("height", B.h * SS);
      const im = new Image();
      im.src = "data:image/svg+xml;utf8," + encodeURIComponent(new XMLSerializer().serializeToString(copy));
      await im.decode().catch(() => {});
      drawn(im, B);
      const scale = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.height ? B.h / el.viewBox.baseVal.height : 1;
      el.querySelectorAll("text").forEach((x) => textAt(x, getComputedStyle(x).fill, parseFloat(getComputedStyle(x).fontSize) * scale));
    } else if (el) {
      const imgs = el.tagName === "IMG" ? [el] : [...el.querySelectorAll("img")];
      imgs.forEach((im) => drawn(im, ctx.box(im)));
      if (el.tagName !== "IMG" && el.textContent.trim()) { const e = getComputedStyle(el); textAt(el, e.color, parseFloat(e.fontSize) || 60); }
    }
    // the lens: a ray entering the water at height h lands on the plane behind it at s(h): magnified 1/0.75 ≈ 1.33× in the
    // middle (the index of water), squeezed toward the rim so the target stays whole and readable (the flip a solid ball
    // of water shows at its rim turned to black noise on type). The colours part where it squeezes: a slight edge fringe
    let src = null; // a tainted picture cannot be read: then the copy is drawn through a plain magnification
    try { src = bg.getImageData(0, 0, back.width, back.height).data; } catch (e) { src = null; }
    const TAB = 256;
    const lensTable = (bend) => Float32Array.from({ length: TAB + 1 }, (_, i) => { const h = i / TAB; return h * (0.75 + bend * Math.pow(h, 5)); });
    const TABLES = [lensTable(0.42), lensTable(0.45), lensTable(0.48)];
    const lensSide = side * dpr, lens = doc.createElement("canvas"); lens.width = lens.height = lensSide;
    const lg = lens.getContext("2d"), frame = src ? lg.createImageData(lensSide, lensSide) : null;

    // kicks: the first lands at `at` + 0.25, the rest spread through the span; each strikes from a seeded side
    const nK = Math.round(ML.clamp(p.kicks, 1, 4)), K = ML.clamp(p.kick, 0, 1), sd = p.seed || 0;
    const spanT = Math.max(1, end - at - 0.8);
    const kicks = Array.from({ length: nK }, (_, i) => ({ t: at + 0.25 + (i * spanT) / nK, a: ML.rnd(i + 1, sd + 3) * Math.PI * 2, amp: (i === 0 ? 1 : 0.55 + 0.3 * ML.rnd(i, sd + 9)) * (0.03 + 0.09 * K) }));
    kicks.forEach((k, i) => ctx.sfx(k.t, i ? "pop.soft" : "pop", i ? 0.18 : 0.3));
    const W = [7.2, 8.1, 6.6, 11.3], AX = [0, Math.PI / 3, (2 * Math.PI) / 3, 0];
    const settleAt = (t) => ML.clamp((t - at) / Math.max(2, spanT));
    // the four mode amplitudes: Σ over kicks of a damped sine (closed form, from each kick time)
    const modes = (t) => {
      const z = 0.16 + 0.25 * settleAt(t);
      return W.map((w, i) => kicks.reduce((s, k, j) => {
        const dt = t - k.t; if (dt <= 0) return s;
        const wd = w * Math.sqrt(1 - z * z), proj = i < 3 ? Math.cos(2 * (k.a - AX[i])) : Math.cos(3 * k.a);
        return s + k.amp * (i < 3 ? 1 : 0.5) * proj * Math.exp(-z * w * dt) * Math.sin(wd * dt) * (1 + 0.15 * ML.rnd(i, j + sd));
      }, 0));
    };
    // smooth seeded noise round the outline, drifting in time
    const PH = Array.from({ length: 6 }, (_, i) => ML.rnd(i + 11, sd) * Math.PI * 2);
    const drift = (th, t) => Math.sin(2 * th + PH[0] + t * 0.9) * 0.45 + Math.sin(3 * th + PH[1] - t * 0.7) * 0.35 + Math.sin(5 * th + PH[2] + t * 1.3) * 0.2;
    const fine = (th, t) => Math.sin(9 * th + PH[3] + t * 2.1) * 0.5 + Math.sin(13 * th + PH[4] - t * 2.7) * 0.5;
    const radiusAt = (th, t, m, settle) => {
      let r = 1 + m[0] * Math.cos(2 * (th - AX[0])) + m[1] * Math.cos(2 * (th - AX[1])) + m[2] * Math.cos(2 * (th - AX[2])) + m[3] * Math.cos(3 * th);
      r += 0.042 * (1 - 0.5 * settle) * drift(th, t) * 0.5 + 0.005 * fine(th, t);
      for (let k = Math.max(0, kicks.length - 4); k < kicks.length; k++) { // up to 4 capillary rings
        const age = t - kicks[k].t; if (age < 0 || age > 2.5) continue;
        let a = Math.abs(((th - kicks[k].a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
        const x = a - age * 2.6, w = 0.18 * (1 + age * 0.8);
        r += kicks[k].amp * 0.9 * Math.exp(-age * 1.6) * (-x / w) * Math.exp(-(x * x) / (w * w));
      }
      return r;
    };
    const N = 96;
    const leave0 = Math.max(at + 1, end - 0.35);
    return {
      draw(t) {
        const inn = ML.out(t, at, at + 0.4), lv = ML.clamp((t - leave0) / 0.3), vis = inn * (1 - lv);
        cv.style.visibility = vis > 0.001 ? "visible" : "hidden";
        if (vis <= 0.001) return;
        cv.style.opacity = vis.toFixed(4);
        const m = modes(t), st = settleAt(t), Rr = R0 * (0.85 + 0.15 * inn);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, side, side);
        const c = side / 2;
        g.beginPath();
        for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI * 2, r = Rr * radiusAt(th, t, m, st); const x = c + Math.cos(th) * r, y = c + Math.sin(th) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.closePath();
        g.save();
        g.clip();
        // the water: each pixel looks through the ball at its own height on the wobbling outline, onto the copy, per colour
        const ox = m[1] * Rr * 0.6, oy = m[2] * Rr * 0.6;
        if (src) {
          const px = frame.data, bw = back.width, bh = back.height, R1 = Rr * dpr * 1.35, c1 = lensSide / 2, K = SS / dpr;
          const radii = Float32Array.from({ length: N + 1 }, (_, i) => Rr * dpr * radiusAt((i / N) * Math.PI * 2, t, m, st));
          px.fill(0);
          const y0 = Math.max(0, Math.floor(c1 - R1)), y1 = Math.min(lensSide, Math.ceil(c1 + R1));
          for (let y = y0; y < y1; y++) for (let x = y0; x < y1; x++) {
            const dx = x + 0.5 - c1, dy = y + 0.5 - c1, d = Math.hypot(dx, dy);
            const ang = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2), fi = (ang / (Math.PI * 2)) * N, i0 = fi | 0;
            const edge = radii[i0] + (radii[i0 + 1] - radii[i0]) * (fi - i0);
            if (d >= edge + 1) continue;
            const rho = Math.min(1, d / edge), ux = d ? dx / d : 0, uy = d ? dy / d : 0, o = (x + y * lensSide) * 4;
            for (let ch = 0; ch < 3; ch++) {
              const q = rho * TAB, q0 = q | 0, tb = TABLES[ch], sh = tb[q0] + (tb[Math.min(TAB, q0 + 1)] - tb[q0]) * (q - q0);
              // into the copy's pixels, bilinear
              const sx = ML.clamp((c + ox + ux * sh * Rr) * SS, 0, bw - 1.001), sy = ML.clamp((c + oy + uy * sh * Rr) * SS, 0, bh - 1.001);
              const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, a = (ix + iy * bw) * 4 + ch;
              const top = src[a] + (src[a + 4] - src[a]) * fx, bot = src[a + bw * 4] + (src[a + bw * 4 + 4] - src[a + bw * 4]) * fx;
              px[o + ch] = top + (bot - top) * fy;
            }
            px[o + 3] = 255;
          }
          lg.putImageData(frame, 0, 0);
          g.drawImage(lens, 0, 0, side, side);
        } else {
          const mag = 1.25 + m[0] * 0.8;
          g.drawImage(back, 0, 0, back.width, back.height, c - c * mag + ox, c - c * mag + oy, side * mag, side * mag);
        }
        // the body: clear water (a cool rim-dark gradient) or tinted by the brand
        const body = g.createRadialGradient(c - Rr * 0.25, c - Rr * 0.3, Rr * 0.1, c, c, Rr * 1.1);
        if (p.tint === "brand") { body.addColorStop(0, hexA(accent2, 0.18)); body.addColorStop(0.7, hexA(accent, 0.32)); body.addColorStop(1, hexA(accent, 0.6)); }
        else { body.addColorStop(0, hexA(lamp, 0.1)); body.addColorStop(0.72, hexA(accent, 0.05)); body.addColorStop(1, hexA(ink, 0.3)); }
        g.fillStyle = body; g.fillRect(0, 0, side, side);
        // a caustic crescent at the bottom, a glint at the top-left
        const cau = g.createRadialGradient(c + Rr * 0.15, c + Rr * 0.7, 0, c + Rr * 0.15, c + Rr * 0.7, Rr * 0.6);
        cau.addColorStop(0, hexA(lamp, 0.45)); cau.addColorStop(1, hexA(lamp, 0));
        g.fillStyle = cau; g.fillRect(0, 0, side, side);
        g.restore();
        // rim
        g.lineWidth = Math.max(1.5, Rr * 0.018); g.strokeStyle = hexA(ink, 0.28); g.stroke();
        g.lineWidth = Math.max(1, Rr * 0.01); g.strokeStyle = hexA(lamp, 0.7); g.stroke();
        const gx = c - Rr * (0.38 + m[1] * 0.4), gy = c - Rr * (0.42 + m[0] * 0.4);
        g.save(); g.translate(gx, gy); g.rotate(-0.6); g.scale(1, 0.55);
        const gl = g.createRadialGradient(0, 0, 0, 0, 0, Rr * 0.24); gl.addColorStop(0, hexA(lamp, 0.95)); gl.addColorStop(1, hexA(lamp, 0));
        g.fillStyle = gl; g.beginPath(); g.arc(0, 0, Rr * 0.24, 0, Math.PI * 2); g.fill(); g.restore();
      },
    };
    function hexA(col, a) {
      const s = String(col).trim();
      if (/^#([0-9a-f]{3}){1,2}$/i.test(s)) { let h = s.slice(1); if (h.length === 3) h = h.split("").map((x) => x + x).join(""); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
      const m = s.match(/rgba?\(([^)]+)\)/); if (m) { const [r, gg, b] = m[1].split(/[ ,/]+/).map(Number); return `rgba(${r},${gg},${b},${a})`; }
      return `color-mix(in srgb, ${s} ${Math.round(a * 100)}%, transparent)`;
    }
  },
});
