// Infinite zoom: the camera dives into a point (the target's centre — a pupil, a hole) that opens as an aperture onto a
// self-similar tunnel which keeps opening ahead. The tunnel is rings of ornaments, each ring `ring_ratio` the size of
// the one outside it; the camera scale is s = e^(k·τ) (k = speed, /s), and since the picture is self-similar, the ring
// index simply recycles every time s passes 1/ratio (phase = k·τ / ln(1/ratio)), so the dive never ends. A spiral
// rotation of `rotation` deg/s turns the whole tunnel, each ring offset by its own (recycled) index; the outer rings go
// soft and the far centre falls into a dark core. Solid bands in the look's accent, panel and ink give it depth. Vectors
// painted on a canvas every frame from t, so nothing pixelates. content "logo" repeats the scene's own logo around each
// step of the tunnel (a raster logo never past its pixels).
// With keep_text the headline stays above the tunnel, readable.
// Source: prompt-motion monokern-holy-shii-gave-opus (reference only: our own rebuild).
ML.define({
  id: "camera.infinite-zoom",
  category: "camera",
  name: "Infinite zoom into a self-similar tunnel",
  does: "The camera dives into a point (a pupil, a hole) that turns out to hold a self-similar tunnel that keeps opening ahead.",
  says: ["focus", "change", "energy"],
  energy: 4,
  targets: ["scene", "image"],
  duration: [1.5, 6],
  params: {
    speed: { type: "number", range: [0.8, 2.5], default: 1.5, unit: "/s" },
    rotation: { type: "number", range: [0, 30], default: 15, unit: "deg/s" },
    ring_ratio: { type: "number", range: [0.5, 0.75], default: 0.6 },
    content: { type: "choice", options: ["ornament", "rings", "logo", "pattern"], default: "ornament" },
    aperture: { type: "number", range: [0.3, 1.2], default: 0.6, unit: "s" },
    outer_blur: { type: "bool", default: true },
    keep_text: { type: "bool", default: true },
  },
  pairs: ["camera.impact-shake", "transition.flash-cut"],
  avoid: ["calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:monokern-holy-shii-gave-opus", license: "reference", note: "our own rebuild" },
  async setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    // the dive point: the target's centre, or the frame's
    let cx = W / 2, cy = H / 2;
    if (el && el !== stage && el !== host) { const b = ctx.box(el); cx = b.x + b.w / 2; cy = b.y + b.h / 2; }
    // look colours, resolved once (a canvas needs real colours)
    const probe = document.createElement("div");
    host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const C = { ground: col("--x-ground"), ink: col("--x-ink"), accent: col("--x-accent"), accent2: col("--x-accent-2"), panel: col("--x-panel"), panel2: col("--x-panel-2"), dim: col("--x-dim") };
    probe.remove();
    const clear = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0]; return `rgba(${m[0]},${m[1]},${m[2]},0)`; };
    const stageCss = getComputedStyle(stage);
    // content "logo": the scene's own logo as a drawable image (look variables resolved: an SVG image cannot read them)
    let mark = null;
    if (p.content === "logo") {
      const src = el && el.matches && el.matches("svg, img") ? el : host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
      if (src) {
        const b = ctx.box(src), svg = src.tagName.toLowerCase() === "svg", im = new Image();
        if (svg) {
          const c = src.cloneNode(true);
          c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const xml = new XMLSerializer().serializeToString(c).replace(/var\((--x-[a-z0-9-]+)\)/g, (_, v) => stageCss.getPropertyValue(v).trim().replace(/"/g, "'"));
          im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
        } else im.src = src.currentSrc || src.src;
        try { await im.decode(); mark = { im, aspect: b.w && b.h ? b.w / b.h : 1, maxW: svg ? Infinity : im.naturalWidth }; } catch { mark = null; }
      }
    }

    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;z-index:4;pointer-events:none;visibility:hidden`;
    host.append(cv);
    const head = host.querySelector(".ml-head");
    const headZ = head ? head.style.zIndex : "";
    // the headline's own calm patch on the tunnel (keep_text): a ground-coloured rounded plate behind its lines
    let plate = null;
    if (head && p.keep_text) {
      const r = document.createRange(); r.selectNodeContents(head);
      const s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1, b = r.getBoundingClientRect();
      if (b.width > 0) plate = { x: (b.left - s.left) / kk - 40, y: (b.top - s.top) / kk - 28, w: b.width / kk + 80, h: b.height / kk + 56 };
    }
    const g = cv.getContext("2d");

    const ratio = ML.clamp(p.ring_ratio, 0.5, 0.75);
    const k = ML.clamp(p.speed, 0.8, 2.5);
    const spin = (ML.clamp(p.rotation, 0, 30) * Math.PI) / 180 * (ctx.rtl ? -1 : 1);
    const Rmax = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.15; // a ring this big covers the frame
    const L = Math.log(1 / ratio);
    const RINGS = Math.ceil(Math.log(Rmax / 4) / L) + 2;
    const apDur = ML.clamp(p.aperture, 0.3, 1.2);
    const fills = [C.accent, C.panel, C.accent2, C.ink];
    const PETALS = [C.panel, C.accent, C.ink, C.accent2]; // each band's ornament, in contrast with its fill

    function ornament(id, R, rot) {
      // one ring of ornaments: petals around the ring, a dot between each pair, a thin circle line
      const n = 12, petal = R * (1 - ratio) * 0.42;
      const ink = PETALS[id % 4];
      g.fillStyle = ink;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2, r = R - petal * 1.1;
        g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a);
        g.beginPath(); g.moveTo(-petal, 0); g.quadraticCurveTo(0, -petal * 0.55, petal, 0); g.quadraticCurveTo(0, petal * 0.55, -petal, 0); g.fill();
        g.restore();
        const b = a + Math.PI / n, rr = R - petal * 0.5;
        g.beginPath(); g.arc(cx + Math.cos(b) * rr, cy + Math.sin(b) * rr, Math.max(1, petal * 0.16), 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.lineWidth = Math.max(1, R * 0.008); g.strokeStyle = C.ink; g.stroke();
    }
    function polygon(R, sides, rot) {
      g.beginPath();
      for (let i = 0; i <= sides; i++) { const a = rot + (i / sides) * Math.PI * 2; i ? g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R) : g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      g.closePath();
    }
    function roundSquare(R, rot) {
      const s = R * 0.72, r = s * 0.28;
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.beginPath(); g.roundRect(-s, -s, s * 2, s * 2, r); g.restore();
    }
    function layer(id, R, rot) {
      // filled band from R inward (the next ring paints over the inside), so every ring reads as a solid step
      switch (p.content) {
        case "rings":
          g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = fills[((id % 4) + 4) % 4]; g.fill();
          g.beginPath(); g.arc(cx, cy, R * (1 - (1 - ratio) * 0.18), 0, Math.PI * 2); g.lineWidth = Math.max(1, R * 0.01); g.strokeStyle = C.ground; g.stroke();
          break;
        case "logo":
          roundSquare(R, rot); g.fillStyle = mark ? (id % 2 ? C.panel : C.panel2) : id % 2 ? C.accent : C.panel; g.fill();
          g.lineWidth = Math.max(1, R * 0.012); g.strokeStyle = C.ink; g.stroke();
          if (mark) {
            // the logo around the band between this step and the next, always upright: a logo is never shown tilted or upside down
            // sized to sit whole inside the band (the next step paints over anything past it); corners sit further out
            const band = 0.72 * R * (1 - ratio), d = 0.72 * R * (1 + ratio) * 0.5, lw = Math.min(band * 0.78, band * 0.5 * mark.aspect), lh = lw / mark.aspect;
            if (lh > 3 && lw <= mark.maxW) for (let i = 0; i < 8; i++) {
              const a = rot + (i / 8) * Math.PI * 2;
              const dd = i % 2 ? d * 1.22 : d;
              g.save(); g.translate(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd);
              g.drawImage(mark.im, -lw / 2, -lh / 2, lw, lh); g.restore();
            }
          }
          break;
        case "pattern": {
          polygon(R, 6, rot); g.fillStyle = id % 2 ? C.panel : C.accent2; g.fill();
          const n = 6, d = R * 0.86;
          g.fillStyle = id % 2 ? C.accent : C.ink;
          for (let i = 0; i < n; i++) { const a = rot + ((i + 0.5) / n) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1, R * 0.045), 0, Math.PI * 2); g.fill(); }
          break;
        }
        default:
          g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = fills[id % 4]; g.fill();
          ornament(id, R, rot);
      }
    }
    ctx.sfx(at, "riser", 0.35);
    ctx.sfx(at + apDur, "whoosh.heavy", 0.2);
    return {
      draw(t) {
        const tau = t - at;
        const on = tau >= 0 && t <= end;
        cv.style.visibility = on ? "visible" : "hidden";
        if (head && p.keep_text) head.style.zIndex = on ? "5" : headZ;
        if (!on) return;
        const phase = (k * tau) / L, base = Math.floor(phase), frac = phase - base;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W, H);
        // the aperture: a circle opening from the dive point, growing exponentially as if the camera were diving at it
        const ap = ML.lin(t, at, at + apDur);
        const apR = ap >= 1 ? Infinity : 6 * Math.pow(Rmax / 6, ap * ap * (3 - 2 * ap));
        g.save();
        if (apR !== Infinity) { g.beginPath(); g.arc(cx, cy, apR, 0, Math.PI * 2); g.clip(); }
        g.fillStyle = C.ground; g.fillRect(0, 0, W, H);
        // rings from the outside in: ring j has radius Rmax·ratio^(j − frac); its identity (colour, offset) is j + base
        for (let j = 0; j < RINGS; j++) {
          const R = Rmax * Math.pow(ratio, j - frac) * 1.0;
          if (R < 2) break;
          const id = j + base;
          const rot = spin * tau + id * 0.35;
          const blur = p.outer_blur && !mark ? Math.max(0, (R / Rmax - 0.9) * 30) : 0;
          g.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : "none";
          // depth: the far centre fades into the ground
          g.globalAlpha = ML.clamp(0.25 + (Math.log(R / 2) / Math.log(Rmax / 2)) * 0.9, 0, 1);
          layer(id, R, rot);
        }
        g.filter = "none"; g.globalAlpha = 1;
        // the far end: a dark core the tunnel keeps falling into
        const core = Rmax * Math.pow(ratio, RINGS - 1 - frac);
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(4, core * 3));
        gr.addColorStop(0, C.ink); gr.addColorStop(1, clear(C.ink));
        g.fillStyle = gr; g.globalAlpha = 0.85; g.beginPath(); g.arc(cx, cy, Math.max(4, core * 3), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        g.restore();
        if (apR !== Infinity) { g.beginPath(); g.arc(cx, cy, apR, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke(); }
        if (plate) {
          g.globalAlpha = 0.88 * ML.clamp((Math.min(apR, 1e6) - Math.hypot(plate.x + plate.w / 2 - cx, plate.y + plate.h / 2 - cy) + plate.w / 2) / (plate.w * 0.5));
          if (apR === Infinity) g.globalAlpha = 0.88;
          g.fillStyle = C.ground; g.beginPath(); g.roundRect(plate.x, plate.y, plate.w, plate.h, Math.min(plate.h / 2, parseFloat(stageCss.getPropertyValue("--x-radius")) || 0)); g.fill(); g.globalAlpha = 1;
        }
      },
    };
  },
});
