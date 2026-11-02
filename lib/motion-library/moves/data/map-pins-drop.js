// Pins drop onto a map: a flat stylised street map — the look's second panel tone as land, panel-white streets
// (≈ 8–14 px, a rotated grid of majors and minors), soft good-colour park blobs and an accent-2 river — eases in from
// scale 1.2 to 1 with a pan over 0.8 s. Then pins (accent teardrops ≈ 24 px scaled, each with a tiny ground shadow)
// drop from −40 px with a bounce-out over 0.35 s, `stagger` apart in a seeded random order. One featured pin, darker
// and 1.4×, lands last near the centre with a pulsing ring (r 10 → 36 px, fading, every 1.2 s) and a pill label sliding
// out from it toward the reading direction. The whole map and its pins are painted on one canvas from t every frame
// (vector, at the stage's pixels — no picture enlarged, the same pixels every time); the label is type.
// On an image the map takes the picture's place; on a list the featured label is the list's first item; on the
// stage it fills the picture region.
// Source: prompt-motion "danilowm-cursor-usando-o-opus" (reference only: rebuilt as our own code).
ML.define({
  id: "data.map-pins-drop",
  category: "data",
  name: "Pins drop onto a map",
  does: "A flat stylised street map pans in and pins drop onto it in a cascade, then one featured pin pulses with a label.",
  says: ["connection", "proof", "scale", "list"],
  energy: 3,
  targets: ["image", "stage", "list"],
  duration: [1.5, 4],
  params: {
    pins: { type: "number", range: [5, 60], default: 24 },
    featured: { type: "bool", default: true },
    stagger: { type: "number", range: [0.02, 0.1], default: 0.04, unit: "s" },
    label: { type: "text", default: "" },
    pan: { type: "bool", default: true },
  },
  pairs: ["data.globe-turn-to-location", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "prompt-motion:danilowm-cursor-usando-o-opus", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const scene = ctx.scene || stage, hb = ctx.box(scene);
    const slot = el ? el.getAttribute("data-slot") : "";
    // where: the picture's own box, else the picture region
    let R;
    if (el && slot === "image") R = ctx.box(el);
    else { const w = Math.min(f.pic.w * 0.94, f.wide ? f.W * 0.6 : f.W * 0.9), h = Math.min(f.pic.h * 0.92, w * (f.wide ? 0.62 : 1.1)); R = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + (f.pic.h - h) / 2, w, h }; }
    const W = Math.round(R.w), H = Math.round(R.h);
    const box = mk("div", `position:absolute;left:${Math.round(R.x - hb.x)}px;top:${Math.round(R.y - hb.y)}px;width:${W}px;height:${H}px;z-index:20;overflow:hidden;border-radius:var(--x-pic-radius);visibility:hidden;will-change:opacity`, scene);
    const cv = mk("canvas", `position:absolute;left:0;top:0;width:${W}px;height:${H}px`, box);
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    // the look's colours, resolved once
    const col = (v) => { cv.style.color = `var(${v})`; return getComputedStyle(cv).color; };
    const C = { land: col("--x-panel-2"), street: col("--x-panel"), park: col("--x-good"), river: col("--x-accent-2"), pin: col("--x-accent"), ink: col("--x-ink"), panel: col("--x-panel") };
    cv.style.color = "";
    // the map, in map units (the box's px), drawn under a camera
    const S = Math.min(W, H);
    const ang = (rtl ? -1 : 1) * 0.32;
    const parks = Array.from({ length: 3 }, (_, i) => ({ x: W * (0.15 + 0.7 * ML.rnd(i, 3)), y: H * (0.15 + 0.7 * ML.rnd(i, 4)), rx: S * (0.1 + 0.08 * ML.rnd(i, 5)), ry: S * (0.07 + 0.06 * ML.rnd(i, 6)), a: ML.rnd(i, 7) * Math.PI }));
    const river = [[-0.1, 0.72 + 0.1 * ML.rnd(1, 9)], [0.3, 0.55], [0.62, 0.8], [1.1, 0.6]].map(([x, y]) => [x * W, y * H]);
    const drawMap = () => {
      g.fillStyle = C.land; g.fillRect(-W, -H, W * 3, H * 3);
      g.save(); g.globalAlpha = 0.28; g.fillStyle = C.park;
      parks.forEach((k) => { g.beginPath(); g.ellipse(k.x, k.y, k.rx, k.ry, k.a, 0, Math.PI * 2); g.fill(); });
      g.restore();
      g.save(); g.globalAlpha = 0.35; g.strokeStyle = C.river; g.lineWidth = S * 0.05; g.lineCap = "round";
      g.beginPath(); g.moveTo(river[0][0], river[0][1]); g.bezierCurveTo(river[1][0], river[1][1], river[2][0], river[2][1], river[3][0], river[3][1]); g.stroke();
      g.restore();
      // streets: a rotated grid, every third line a major
      g.save(); g.translate(W / 2, H / 2); g.rotate(ang); g.strokeStyle = C.street; g.lineCap = "butt";
      const step = S * 0.085, ext = Math.hypot(W, H);
      for (let k = -Math.ceil(ext / step); k <= Math.ceil(ext / step); k++) {
        const major = k % 3 === 0, jit = (ML.rnd(k + 50, 11) - 0.5) * step * 0.3;
        g.lineWidth = (major ? 14 : 8) * u;
        g.beginPath(); g.moveTo(k * step + jit, -ext); g.lineTo(k * step + jit, ext); g.stroke();
        g.lineWidth = (k % 4 === 0 ? 14 : 8) * u;
        g.beginPath(); g.moveTo(-ext, k * step * 1.25 - jit); g.lineTo(ext, k * step * 1.25 - jit); g.stroke();
      }
      g.restore();
    };
    // pins: seeded places (kept apart), a seeded drop order, the featured pin last near the centre
    const n = Math.round(ML.clamp(p.pins, 5, 60));
    const minD = Math.sqrt((W * H) / n) * 0.5;
    const pins = [];
    for (let i = 0, tries = 0; pins.length < n && tries < n * 40; tries++, i++) {
      const x = W * (0.08 + 0.84 * ML.rnd(i, 17)), y = H * (0.12 + 0.8 * ML.rnd(i, 19));
      if (pins.every((q) => Math.hypot(q.x - x, q.y - y) > minD) || tries > n * 30) pins.push({ x, y, o: ML.rnd(i, 23) });
    }
    let feat = null;
    if (p.featured) {
      let best = 0, bd = 1e9;
      pins.forEach((q, i) => { const d = Math.hypot(q.x - W * 0.5, q.y - H * 0.5); if (d < bd) { bd = d; best = i; } });
      feat = pins.splice(best, 1)[0];
    }
    pins.sort((a, b) => a.o - b.o);
    const st = ML.clamp(p.stagger, 0.02, 0.1);
    const t0 = at + 0.65; // the map has mostly settled
    const room = Math.max(0.3, end - 0.9 - t0 - (feat ? 0.25 : 0));
    const gap = Math.min(st, room / Math.max(1, pins.length));
    pins.forEach((q, i) => (q.t = t0 + i * gap));
    if (feat) feat.t = t0 + pins.length * gap + 0.12;
    ctx.sfx(at, "whoosh.soft", 0.2);
    ctx.sfx(t0, "drop", 0.35);
    for (let i = 8; i < pins.length; i += 10) ctx.sfx(pins[i].t, "pop.soft", 0.15);
    if (feat) ctx.sfx(feat.t + 0.2, "pop", 0.35);
    // the label
    const labTxt = p.label || (slot === "list" && el.children.length ? (el.children[0].textContent || "").trim() : "") || (rtl ? "وسط البلد" : "Downtown");
    const pill = mk("div", `position:absolute;left:0;top:0;padding:${(10 * u).toFixed(1)}px ${(20 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-ink);color:var(--x-panel);font:600 ${(24 * u).toFixed(1)}px var(--x-body-font);white-space:nowrap;box-shadow:var(--x-shadow);visibility:hidden;direction:${rtl ? "rtl" : "ltr"}`, box, labTxt);
    const bounceOut = (x) => { const n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375; };
    const pinR = 12 * u;
    const drawPin = (x, y, k, lift, color, dark) => {
      const r = pinR * k;
      // ground shadow: smaller and fainter while the pin is up
      g.save(); g.globalAlpha = 0.22 * (1 - Math.min(1, lift / (40 * u)) * 0.6); g.fillStyle = C.ink;
      g.beginPath(); g.ellipse(x, y, r * 0.75, r * 0.28, 0, 0, Math.PI * 2); g.fill(); g.restore();
      const cy = y - lift - r * 1.9;
      g.fillStyle = color;
      g.beginPath(); g.arc(x, cy, r, Math.PI * 0.82, Math.PI * 2.18); g.lineTo(x, y - lift); g.closePath(); g.fill();
      if (dark) { g.save(); g.globalAlpha = 0.32; g.fillStyle = C.ink; g.fill(); g.restore(); }
      g.fillStyle = C.panel; g.beginPath(); g.arc(x, cy, r * 0.38, 0, Math.PI * 2); g.fill();
    };
    return {
      draw(t) {
        if (t < at - 1e-6) { box.style.visibility = "hidden"; return; }
        box.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), en = ML.out(t, at, at + 0.3);
        box.style.opacity = (en * (1 - leave)).toFixed(4);
        // the camera: 1.2 → 1 with a pan, 0.8 s
        const e = ML.ease(t, at, at + 0.8), s = 1.2 - 0.2 * e;
        const px = p.pan ? (rtl ? 1 : -1) * W * 0.06 * (1 - e) : 0, py = p.pan ? H * 0.03 * (1 - e) : 0;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        g.setTransform(s, 0, 0, s, W / 2 + px - (W / 2) * s, H / 2 + py - (H / 2) * s);
        drawMap();
        pins.forEach((q) => {
          if (t < q.t) return;
          const b = bounceOut(ML.lin(t, q.t, q.t + 0.35));
          drawPin(q.x, q.y, 1, (1 - b) * 40 * u, C.pin, false);
        });
        let fx = 0, fy = 0;
        if (feat) {
          fx = feat.x * s + W / 2 + px - (W / 2) * s; fy = feat.y * s + H / 2 + py - (H / 2) * s;
          if (t >= feat.t) {
            const since = t - feat.t - 0.35;
            if (since > 0) {
              const ph = (since % 1.2) / 1.2, r = (10 + 26 * ph) * u * 1.4;
              g.save(); g.globalAlpha = 0.45 * (1 - ph); g.strokeStyle = C.pin; g.lineWidth = 3 * u;
              g.beginPath(); g.arc(feat.x, feat.y, r, 0, Math.PI * 2); g.stroke(); g.restore();
            }
            const b = bounceOut(ML.lin(t, feat.t, feat.t + 0.35));
            drawPin(feat.x, feat.y, 1.4, (1 - b) * 40 * u, C.pin, true);
          }
        }
        // the pill slides out from the featured pin toward the reading direction
        if (feat && t >= feat.t + 0.3) {
          pill.style.visibility = "visible";
          const q = ML.out(t, feat.t + 0.3, feat.t + 0.65), pw = pill.offsetWidth, ph2 = pill.offsetHeight;
          const gapX = pinR * 1.4 + 10 * u, headY = fy - pinR * 1.4 * 1.9;
          let x = rtl ? fx - gapX - pw : fx + gapX;
          x = ML.clamp(x, 8 * u, W - pw - 8 * u);
          pill.style.translate = `${Math.round(x + (rtl ? 1 : -1) * (1 - q) * 24 * u)}px ${Math.round(ML.clamp(headY - ph2 / 2, 4, H - ph2 - 4))}px`;
          pill.style.clipPath = rtl ? `inset(0 0 0 ${((1 - q) * 100).toFixed(2)}% round 999px)` : `inset(0 ${((1 - q) * 100).toFixed(2)}% 0 0 round 999px)`;
        } else pill.style.visibility = "hidden";
      },
    };
  },
});
