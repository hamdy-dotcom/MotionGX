// Wobbling liquid orb: a clear liquid sphere hangs over its target, its outline r(θ, t) = 1 + Σ modes — three P2
// modes (about three axes) and a P3 mode on springs (ω 7.2 / 8.1 / 6.6 / 11.3 rad/s, damping 0.16 + 0.25 × settle),
// each a closed-form damped sine from every kick time (so any t is seekable), a warped noise drift of 4.2 % (halved
// as it settles), a fine 0.5 % octave, and up to 4 capillary rings running round from where it was struck (derivative
// of a Gaussian, amplitude e^(−1.6 age), width × (1 + 0.8 age)). The 2D port of tide-crystal's water orb: the blob is
// painted per frame on a canvas from t, filled with a displaced, refracted copy of what sits behind it (the target,
// redrawn through the lens with an IOR-1.333 magnification and a slight colour-fringe), a rim, a specular glint and
// a soft caustic. Colours come from the look (read once in setup).
// Source: MengTo/Skills agent-skills/game-combat/water-crystal-skill-vfx/assets/tide-crystal.mjs (MIT).
ML.define({
  id: "element.liquid-orb-wobble",
  category: "element",
  name: "Wobbling liquid orb",
  does: "A clear liquid sphere hangs in place, its surface wobbling on springs and rippling with rings when something hits it.",
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
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
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
    // colours from the look
    const cs = getComputedStyle(host);
    const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
    const ground = v("--x-ground", "#f6f4ee"), ink = v("--x-ink", "#14141c"), accent = v("--x-accent", "#5558e3"), accent2 = v("--x-accent-2", "#8f92ff");
    const fontHead = v("--x-head-font", "sans-serif"), weight = v("--x-head-weight", "700");
    // what is behind the orb: the target's text drawn into an offscreen layer once (for the refracted copy)
    const back = doc.createElement("canvas");
    back.width = side * dpr; back.height = side * dpr;
    const bg = back.getContext("2d");
    bg.scale(dpr, dpr);
    // the ground behind the target: its nearest painted ancestor (a panel), else the look's ground
    let under = ground;
    for (let n = el && el.parentElement; n && n !== host.parentElement; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { under = c; break; } }
    bg.fillStyle = under; bg.fillRect(0, 0, side, side);
    if (el) {
      const text = (el.textContent || "").trim();
      const ecs = getComputedStyle(el);
      if (text) {
        const fs = el.tagName.toLowerCase() === "svg" ? B.h * 0.55 : parseFloat(ecs.fontSize) || 60;
        bg.font = `${ecs.fontWeight || weight} ${fs}px ${el.tagName.toLowerCase() === "svg" ? fontHead : ecs.fontFamily}`;
        bg.fillStyle = ink; bg.textAlign = "center"; bg.textBaseline = "middle"; bg.direction = rtl ? "rtl" : "ltr";
        bg.fillText(text, side / 2 + (el.tagName.toLowerCase() === "svg" ? B.w * 0.15 : 0), side / 2);
      }
      if (el.tagName.toLowerCase() === "svg" && el.querySelector("rect,circle,path")) {
        const m = el.querySelector("rect,circle,path"), mb = ctx.box(m);
        bg.fillStyle = accent;
        const x = mb.x - (cx - side / 2), y = mb.y - (cy - side / 2), r = Math.min(mb.w, mb.h) * 0.28;
        bg.beginPath(); bg.roundRect ? bg.roundRect(x, y, mb.w, mb.h, r) : bg.rect(x, y, mb.w, mb.h); bg.fill();
      }
    }

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
        const inn = ML.out(t, at - 0.1, at + 0.35), lv = ML.clamp((t - leave0) / 0.3), vis = inn * (1 - lv);
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
        // the refracted copy: what's behind, magnified through the lens (1/1.333 → ~1.25×), its centre pulled by the
        // P2 modes, with a slight fringe from two offset passes
        const mag = 1.25 + m[0] * 0.8, ox = m[1] * Rr * 0.6, oy = m[2] * Rr * 0.6;
        const drawCopy = (dx, alpha) => { g.globalAlpha = alpha; g.drawImage(back, 0, 0, back.width, back.height, c - (c * mag) + ox + dx, c - (c * mag) + oy, side * mag, side * mag); };
        drawCopy(0, 1);
        g.globalCompositeOperation = "multiply"; drawCopy(Rr * 0.012, 0.25); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
        // the body: clear water (a cool rim-dark gradient) or tinted by the brand
        const body = g.createRadialGradient(c - Rr * 0.25, c - Rr * 0.3, Rr * 0.1, c, c, Rr * 1.1);
        if (p.tint === "brand") { body.addColorStop(0, hexA(accent2, 0.18)); body.addColorStop(0.7, hexA(accent, 0.32)); body.addColorStop(1, hexA(accent, 0.6)); }
        else { body.addColorStop(0, "rgba(255,255,255,0.10)"); body.addColorStop(0.72, hexA(accent, 0.06)); body.addColorStop(1, hexA(ink, 0.22)); }
        g.fillStyle = body; g.fillRect(0, 0, side, side);
        // a caustic crescent at the bottom, a glint at the top-left
        const cau = g.createRadialGradient(c + Rr * 0.15, c + Rr * 0.7, 0, c + Rr * 0.15, c + Rr * 0.7, Rr * 0.6);
        cau.addColorStop(0, "rgba(255,255,255,0.45)"); cau.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = cau; g.fillRect(0, 0, side, side);
        g.restore();
        // rim
        g.lineWidth = Math.max(1.5, Rr * 0.018); g.strokeStyle = hexA(ink, 0.28); g.stroke();
        g.lineWidth = Math.max(1, Rr * 0.01); g.strokeStyle = "rgba(255,255,255,0.7)"; g.stroke();
        const gx = c - Rr * (0.38 + m[1] * 0.4), gy = c - Rr * (0.42 + m[0] * 0.4);
        g.save(); g.translate(gx, gy); g.rotate(-0.6); g.scale(1, 0.55);
        const gl = g.createRadialGradient(0, 0, 0, 0, 0, Rr * 0.24); gl.addColorStop(0, "rgba(255,255,255,0.95)"); gl.addColorStop(1, "rgba(255,255,255,0)");
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
