// Season blend: the same place changes season in place — no cut. One 4-weight state [spring, summer, fall, winter]
// summing to 1 drives everything: sky, sun height and tint, hills, ground, foliage colour and coverage, blossom, fall
// litter, particle drift (petals, pollen, leaves, snow), settled snow and the warm window of a house. Closed form for
// video (the skill's per-frame lerp at rate 1.4 integrated): w(t) = target + (start − target) · exp(−k (t − at)), with
// k = 1.4 · 2.5 / duration, so the blend reaches ~97 % at `duration`. Every colour is resolved each frame from the
// authored season values × the weights (never re-tinting last frame's colour: it would drift). Deciduous crowns thin
// for winter by a deterministic per-blob threshold; evergreens keep their coverage. Settled snow = winter weight ×
// smoothstep(0.3, 0.85, how much a face looks up) — tops of tiers, roofs, hill crests and the ground. The season
// values are mixes of the look's own variables (its accents, good / bad, window lights, panel, ink), so a brand keeps
// its palette through the year. 2D use: the same weights drive the scene's --x-accent (tokens), so the type recolours
// with the season. Painted on a canvas per frame from t only, behind the scene's content. On a picture target the
// picture stays the place: it is graded by the weights (sepia, saturation, brightness; never blurred) under a canvas of
// light, particles and, with the snow cue, a settled drift along its foot — no landscape painted over it.
// Source: MengTo/Skills 3d/3d-four-seasons (MIT: the 4-weight state, exp(−1.4·dt) blend, resolve-from-base rule,
// deterministic foliage thinning, the settled-snow formula), rebuilt as a 2D canvas painting.
ML.define({
  id: "transition.season-blend",
  category: "transition",
  name: "Season blend",
  does: "The same place changes season in place: foliage recolours and thins, the light warms or cools, the particle drift changes and (with the snow cue) snow settles on upward faces.",
  says: ["change", "time", "before-after", "transition", "story"],
  energy: 2,
  targets: ["scene", "image", "stage"],
  duration: [1.5, 4],
  params: {
    from: { type: "choice", options: ["spring", "summer", "fall", "winter"], default: "summer" },
    to: { type: "choice", options: ["spring", "summer", "fall", "winter"], default: "fall" },
    duration: { type: "number", range: [1.5, 4], default: 2.5, unit: "s" },
    cues: { type: "choice", options: ["palette", "palette+particles", "palette+particles+snow"], default: "palette+particles" },
    tokens: { type: "bool", default: true },
  },
  pairs: ["transition.crossfade", "text-in.punchline"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "MengTo/Skills:agent-skills/3d/3d-four-seasons", license: "MIT", note: "2D canvas rebuild of the season-weight system" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    const scene = ctx.scene || stage;
    const pic = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const SEASONS = ["spring", "summer", "fall", "winter"];
    const si = (s) => Math.max(0, SEASONS.indexOf(s === "autumn" ? "fall" : s));
    // where it paints
    const cv = document.createElement("canvas");
    let W, H, host;
    if (pic) {
      host = pic.offsetParent || pic.parentElement;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      W = pic.offsetWidth; H = pic.offsetHeight;
      cv.style.cssText = `position:absolute;left:${pic.offsetLeft}px;top:${pic.offsetTop}px;width:${W}px;height:${H}px;border-radius:${getComputedStyle(pic).borderRadius};pointer-events:none`;
      pic.after(cv);
    } else {
      host = scene; W = scene.offsetWidth || ctx.f.W; H = scene.offsetHeight || ctx.f.H;
      cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
      scene.insertBefore(cv, scene.firstChild);
    }
    cv.width = Math.round(W); cv.height = Math.round(H);
    const g = cv.getContext("2d");
    // the season table, in look variables, resolved to rgb once
    const probe = document.createElement("div"); host.append(probe);
    const one = document.createElement("canvas"); one.width = one.height = 1; const og = one.getContext("2d", { willReadFrequently: true });
    const rgb = (css) => { probe.style.color = css; og.clearRect(0, 0, 1, 1); og.fillStyle = "#000"; og.fillStyle = getComputedStyle(probe).color; og.fillRect(0, 0, 1, 1); const d = og.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const M = (a, pa, b) => `color-mix(in srgb, ${a} ${pa}%, ${b})`;
    const V = (n) => `var(--x-${n})`;
    const T = {
      skyTop: [M(V("accent-2"), 40, V("panel")), M(V("accent"), 62, V("panel")), M(V("light-2"), 40, M(V("accent-2"), 45, V("panel"))), M(V("accent"), 20, M(V("panel"), 78, V("dim")))],
      skyLow: [M(V("light-2"), 22, V("panel")), M(V("accent-2"), 28, V("panel")), M(V("light-2"), 60, M(V("light-1"), 35, V("panel"))), M(V("panel"), 86, V("dim"))],
      sun: [M(V("light-2"), 45, V("panel")), M(V("light-2"), 30, V("panel")), M(V("light-2"), 80, V("light-1")), M(V("panel"), 88, V("accent-2"))],
      far: [M(V("light-3"), 45, V("panel")), M(V("good"), 55, V("panel")), M(V("light-2"), 50, M(V("good"), 30, V("panel"))), M(V("panel"), 72, V("dim"))],
      near: [M(V("light-3"), 78, V("panel")), M(V("good"), 82, V("ink")), M(V("light-2"), 55, M(V("bad"), 40, V("ink"))), M(V("panel"), 62, V("dim"))],
      leafA: [M(V("light-3"), 72, V("panel")), M(V("good"), 78, V("ink")), M(V("light-2"), 88, V("bad")), M(V("light-2"), 35, V("ink"))],
      leafB: [M(V("light-3"), 85, V("good")), M(V("good"), 65, V("ink")), M(V("bad"), 80, V("light-2")), M(V("bad"), 30, V("ink"))],
      ever: [M(V("good"), 70, V("ink")), M(V("good"), 60, V("ink")), M(V("good"), 48, V("ink")), M(V("good"), 38, V("ink"))],
    };
    const C = {}; for (const [k, list] of Object.entries(T)) C[k] = list.map(rgb);
    const fixed = { trunk: rgb(M(V("ink"), 70, V("light-2"))), blossom: rgb(M(V("bad"), 35, V("panel"))), snow: rgb(V("panel")), pollen: rgb(M(V("light-2"), 60, V("panel"))), house: rgb(M(V("panel"), 80, V("light-2"))), roof: rgb(M(V("bad"), 55, V("ink"))), glow: rgb(V("light-2")), cool: rgb(V("accent")) };
    probe.remove();
    const SUN_Y = [0.34, 0.2, 0.56, 0.64], SUN_R = [0.07, 0.085, 0.095, 0.06], COVER = [0.86, 1, 0.82, 0.02];
    const DENS = [0.22, 0.1, 0.6, p.cues === "palette+particles+snow" ? 0.95 : 0.3];
    const particles = p.cues !== "palette", settle = p.cues === "palette+particles+snow";
    const mixc = (list, w) => { let r = 0, gg = 0, b = 0; for (let i = 0; i < 4; i++) { r += list[i][0] * w[i]; gg += list[i][1] * w[i]; b += list[i][2] * w[i]; } return [r, gg, b]; };
    const css = (c, a = 1) => `rgba(${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${a.toFixed(4)})`;
    const lerpc = (a, b, x) => [a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x, a[2] + (b[2] - a[2]) * x];
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    // the place: fixed geometry, seeded
    const S = Math.min(W, H), dir = ctx.rtl ? -1 : 1;
    const hz = H * (H > W * 1.2 ? 0.6 : 0.62);
    const farY = (x) => hz - H * 0.07 - Math.sin(x / W * 5.1 + 0.6) * H * 0.025 - Math.sin(x / W * 11.3 + 2) * H * 0.012;
    const nearY = (x) => hz + H * 0.04 - Math.sin(x / W * 3.2 + 1.4) * H * 0.03;
    const trees = [];
    const nT = W > H ? 11 : 7;
    for (let i = 0; i < nT; i++) {
      const x = W * (0.04 + 0.92 * ((i + 0.5 + (ML.rnd(i, 1) - 0.5) * 0.6) / nT));
      const s = S * (0.09 + 0.06 * ML.rnd(i, 2)) * (W > H ? 1 : 1.25);
      trees.push({ i, x, y: nearY(x) + S * 0.02 * ML.rnd(i, 3), s, ever: ML.rnd(i, 4) < 0.38 });
    }
    trees.sort((a, b) => a.y - b.y);
    const houseX = W * (ctx.rtl ? 0.7 : 0.3), houseW = S * 0.16;
    const blobs = Array.from({ length: 16 }, (_, j) => ({ a: ML.rnd(j, 11) * Math.PI * 2, r: 0.2 + 0.55 * Math.sqrt(ML.rnd(j, 12)), s: 0.24 + 0.14 * ML.rnd(j, 13) }));
    const nP = Math.round(90 * (W * H) / (1080 * 1920) + 40);
    const D = Math.min(ML.clamp(p.duration, 1.5, 4), Math.max(0.5, end - at)), k = (1.4 * 2.5) / D; // reaches its season before the scene ends
    const w0 = [0, 0, 0, 0], w1 = [0, 0, 0, 0]; w0[si(p.from)] = 1; w1[si(p.to)] = 1;
    const weights = (t) => { const e = t <= at ? 1 : Math.exp(-k * (t - at)); return w1.map((x, i) => x + (w0[i] - x) * e); };
    ctx.sfx(at, "swell", 0.4);
    const was = scene.style.getPropertyValue("--x-accent");
    // the grade a picture takes per season, over any filter its look already gives it
    const SEPIA = [0.05, 0, 0.32, 0.06], SAT = [1.06, 1.12, 0.94, 0.55], BRI = [1.03, 1, 0.98, 1.06];
    const picBase = pic && getComputedStyle(pic).filter !== "none" ? getComputedStyle(pic).filter + " " : "";
    const sum = (w, list) => w.reduce((s, x, i) => s + x * list[i], 0);
    // particles: each one belongs to a season's band (density × weight), so the drift changes with the blend
    const drift = (t, w) => {
      const wind = dir * (20 + 40 * w[2]);
      for (let i = 0; i < nP; i++) {
        const r = ML.rnd(i, 51); let acc = 0, type = -1, edge = 0;
        for (let s2 = 0; s2 < 4; s2++) { const band = DENS[s2] * w[s2]; if (r < acc + band) { type = s2; edge = Math.min(r - acc, acc + band - r); break; } acc += band; }
        if (type < 0) continue;
        const a = ML.clamp(edge / 0.03);
        const v = [55, 18, 95, 50][type] * (0.7 + 0.6 * ML.rnd(i, 52)) * (S / 1080);
        const yy = ((ML.rnd(i, 53) * (H + 80) + v * t) % (H + 80)) - 40;
        const xx = (((ML.rnd(i, 54) * W + wind * t + Math.sin(t * (1 + ML.rnd(i, 55)) + i) * S * 0.02) % W) + W) % W;
        const sz = S * [0.008, 0.004, 0.012, 0.006][type] * (0.7 + 0.6 * ML.rnd(i, 56));
        const col = type === 0 ? fixed.blossom : type === 1 ? fixed.pollen : type === 2 ? (ML.rnd(i, 57) < 0.5 ? C.leafA[2] : C.leafB[2]) : fixed.snow;
        g.fillStyle = css(col, a * (type === 1 ? 0.7 : 0.95));
        g.beginPath();
        if (type === 3 || type === 1) g.arc(xx, yy, sz, 0, Math.PI * 2);
        else g.ellipse(xx, yy, sz, sz * 0.5, t * (1.5 + 2 * ML.rnd(i, 58)) + i, 0, Math.PI * 2);
        g.fill();
      }
    };
    return {
      draw(t) {
        const w = weights(t), [wSp, , wFa, wWi] = w;
        g.clearRect(0, 0, W, H);
        if (pic) {
          pic.style.filter = `${picBase}sepia(${sum(w, SEPIA).toFixed(4)}) saturate(${sum(w, SAT).toFixed(4)}) brightness(${sum(w, BRI).toFixed(4)})`;
          const sc = mixc(C.sun, w), lx = W * (ctx.rtl ? 0.26 : 0.74), ly = H * sum(w, SUN_Y) * 0.6;
          const lg = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.7);
          lg.addColorStop(0, css(sc, 0.3)); lg.addColorStop(1, css(sc, 0));
          g.fillStyle = lg; g.fillRect(0, 0, W, H);
          g.fillStyle = css(fixed.cool, 0.1 * wWi); g.fillRect(0, 0, W, H);
          if (settle && wWi > 0.01) { g.fillStyle = css(fixed.snow, wWi * 0.92); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.9 - Math.sin(x / W * 7 + 1) * H * 0.018 - Math.sin(x / W * 17) * H * 0.008); g.lineTo(W, H); g.closePath(); g.fill(); }
          if (particles) drift(t, w);
          return;
        }
        // sky and sun
        const sky = g.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, css(mixc(C.skyTop, w))); sky.addColorStop(1, css(mixc(C.skyLow, w)));
        g.fillStyle = sky; g.fillRect(0, 0, W, hz + 4);
        const sunC = mixc(C.sun, w), sy = hz * w.reduce((s, x, i) => s + x * SUN_Y[i], 0), sr = S * w.reduce((s, x, i) => s + x * SUN_R[i], 0), sx = W * (ctx.rtl ? 0.26 : 0.74);
        const glow = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 4.5);
        glow.addColorStop(0, css(sunC, 0.55)); glow.addColorStop(1, css(sunC, 0));
        g.fillStyle = glow; g.fillRect(0, 0, W, hz);
        g.fillStyle = css(sunC); g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
        // far hills, their crests catching snow
        const far = mixc(C.far, w), near = mixc(C.near, w), snowAmt = settle ? wWi : 0;
        const ridge = (fy, col, bottom) => { g.fillStyle = css(col); g.beginPath(); g.moveTo(0, bottom); for (let x = 0; x <= W; x += 8) g.lineTo(x, fy(x)); g.lineTo(W, bottom); g.closePath(); g.fill(); };
        ridge(farY, far, hz + H * 0.1);
        if (snowAmt > 0.01) { g.fillStyle = css(fixed.snow, snowAmt * 0.9); g.beginPath(); for (let x = 0; x <= W; x += 8) g.lineTo(x, farY(x)); for (let x = W; x >= 0; x -= 8) g.lineTo(x, farY(x) + H * 0.012 * smooth(0.3, 0.85, 0.5 + 0.5 * Math.cos(x / W * 5.1 + 0.6))); g.closePath(); g.fill(); }
        ridge(nearY, near, H);
        if (snowAmt > 0.01) { g.fillStyle = css(fixed.snow, snowAmt * 0.88); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, nearY(x)); g.lineTo(W, H); g.closePath(); g.fill(); }
        // fall litter on the ground
        if (wFa > 0.01) for (let i = 0; i < 70; i++) { const x = ML.rnd(i, 21) * W, y = nearY(x) + (H - nearY(x)) * (0.05 + 0.9 * ML.rnd(i, 22)); g.fillStyle = css(ML.rnd(i, 23) < 0.5 ? C.leafA[2] : C.leafB[2], wFa * (1 - snowAmt) * 0.85); g.beginPath(); g.ellipse(x, y, S * 0.008, S * 0.004, ML.rnd(i, 24) * 3, 0, Math.PI * 2); g.fill(); }
        // the house, its window warm in winter
        const hy = nearY(houseX) + S * 0.01, hh = houseW * 0.62;
        g.fillStyle = css(fixed.house); g.fillRect(houseX - houseW / 2, hy - hh, houseW, hh);
        g.fillStyle = css(fixed.roof); g.beginPath(); g.moveTo(houseX - houseW * 0.6, hy - hh); g.lineTo(houseX, hy - hh - houseW * 0.42); g.lineTo(houseX + houseW * 0.6, hy - hh); g.closePath(); g.fill();
        if (snowAmt > 0.01) { g.fillStyle = css(fixed.snow, snowAmt); g.beginPath(); g.moveTo(houseX - houseW * 0.6, hy - hh); g.lineTo(houseX, hy - hh - houseW * 0.42); g.lineTo(houseX + houseW * 0.6, hy - hh); g.lineTo(houseX + houseW * 0.45, hy - hh - houseW * 0.05); g.lineTo(houseX, hy - hh - houseW * 0.33); g.lineTo(houseX - houseW * 0.45, hy - hh - houseW * 0.05); g.closePath(); g.fill(); }
        const winA = 0.25 + 0.75 * wWi;
        g.fillStyle = css(lerpc(fixed.trunk, fixed.glow, winA)); g.fillRect(houseX - houseW * 0.3, hy - hh * 0.7, houseW * 0.22, houseW * 0.2); g.fillRect(houseX + houseW * 0.08, hy - hh * 0.7, houseW * 0.22, houseW * 0.2);
        if (wWi > 0.05) { const wg = g.createRadialGradient(houseX, hy - hh * 0.6, 0, houseX, hy - hh * 0.6, houseW * 0.7); wg.addColorStop(0, css(fixed.glow, 0.35 * wWi)); wg.addColorStop(1, css(fixed.glow, 0)); g.fillStyle = wg; g.fillRect(houseX - houseW, hy - hh * 1.5, houseW * 2, hh * 2); }
        // trees
        const cover = w.reduce((s, x, i) => s + x * COVER[i], 0);
        for (const tr of trees) {
          const { x, y, s, i } = tr;
          if (tr.ever) {
            g.fillStyle = css(fixed.trunk); g.fillRect(x - s * 0.05, y - s * 0.3, s * 0.1, s * 0.3);
            const ec = mixc(C.ever, w);
            for (let k2 = 0; k2 < 3; k2++) {
              const by = y - s * 0.25 - k2 * s * 0.42, bw = s * (0.55 - k2 * 0.13), th = s * 0.62;
              g.fillStyle = css(ec); g.beginPath(); g.moveTo(x - bw, by); g.lineTo(x, by - th); g.lineTo(x + bw, by); g.closePath(); g.fill();
              // snow on the upward face of each tier
              const up = snowAmt * smooth(0.3, 0.85, 0.9);
              if (up > 0.01) { g.fillStyle = css(fixed.snow, up); g.beginPath(); g.moveTo(x - bw * 0.42, by - th * 0.58); g.lineTo(x, by - th); g.lineTo(x + bw * 0.42, by - th * 0.58); g.lineTo(x + bw * 0.2, by - th * 0.5); g.lineTo(x, by - th * 0.6); g.lineTo(x - bw * 0.2, by - th * 0.5); g.closePath(); g.fill(); }
            }
            continue;
          }
          // deciduous: trunk and branches always, a crown that thins by a per-blob threshold
          g.strokeStyle = css(fixed.trunk); g.lineCap = "round";
          g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 0.75); g.stroke();
          g.lineWidth = s * 0.035;
          for (let b = 0; b < 5; b++) { const a = -Math.PI / 2 + (b - 2) * 0.45 + (ML.rnd(i, 30 + b) - 0.5) * 0.3, L = s * (0.35 + 0.15 * ML.rnd(i, 40 + b)), y0 = y - s * (0.5 + 0.08 * b); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + Math.cos(a) * L, y0 + Math.sin(a) * L); g.stroke(); if (snowAmt > 0.05) { g.strokeStyle = css(fixed.snow, snowAmt * 0.8); g.lineWidth = s * 0.015; g.beginPath(); g.moveTo(x, y0 - s * 0.02); g.lineTo(x + Math.cos(a) * L, y0 + Math.sin(a) * L - s * 0.02); g.stroke(); g.strokeStyle = css(fixed.trunk); g.lineWidth = s * 0.035; } }
          const cy = y - s * 0.95;
          blobs.forEach((bl, j) => {
            const thr = ML.rnd(i * 31 + j, 7), a = ML.clamp((cover - thr) / 0.1);
            if (a <= 0.003) return;
            const col = ML.rnd(i * 17 + j, 8) < 0.5 ? mixc(C.leafA, w) : mixc(C.leafB, w);
            const bx = x + Math.cos(bl.a) * bl.r * s * 0.55, by = cy + Math.sin(bl.a) * bl.r * s * 0.45;
            g.fillStyle = css(col, a); g.beginPath(); g.arc(bx, by, bl.s * s, 0, Math.PI * 2); g.fill();
            if (wSp > 0.02 && ML.rnd(i * 7 + j, 9) < 0.55) { g.fillStyle = css(fixed.blossom, wSp * a); g.beginPath(); g.arc(bx + bl.s * s * 0.3, by - bl.s * s * 0.2, bl.s * s * 0.22, 0, Math.PI * 2); g.fill(); }
          });
        }
        // light: warm haze in spring, cool fill in winter, strong day in summer
        g.fillStyle = css(sunC, 0.1 * wSp + 0.06 * wFa); g.fillRect(0, 0, W, H);
        g.fillStyle = css(fixed.cool, 0.08 * wWi); g.fillRect(0, 0, W, H);
        if (particles) drift(t, w);
        // tokens: the scene's accent follows the season's foliage
        if (p.tokens && !pic) { const c = mixc(C.leafA, w); scene.style.setProperty("--x-accent", `rgb(${c.map((x) => Math.round(x)).join(",")})`); }
        else if (was) scene.style.setProperty("--x-accent", was);
      },
    };
  },
});
