// Halftone slash: a thick diagonal band (a parallelogram leaning `angle` degrees) in the next scene's colour slashes
// across the frame over 0.3-0.6 s expo.inOut and wipes to it; its leading edge is a halftone grid (8-14 px spacing at
// 1080, rows offset) whose dots pop 0 -> 1 (a little overshoot) as the slash edge passes them — a ~0.01 s stagger per
// column from the edge — growing with depth into the band until they merge into the solid colour, dot radius also
// scaled by the distance to the frame's centre, and a hue gradient from the look's second accent at the edge to the
// band's colour. Painted on a canvas per frame from t. ltr = from the reading start (so it runs right to left in
// Arabic); rtl = against it. Colour: a look name or a --x- variable.
// Source: prompt-motion sudo-kiran-no-storyboard-no-detailed (reference only: our own rebuild).
ML.define({
  id: "transition.halftone-slash",
  category: "transition",
  name: "Halftone slash",
  does: "A thick diagonal band slashes across the frame, filled with a halftone dot gradient that pops in from its edge, wiping to the next scene.",
  says: ["transition", "energy", "playful"],
  energy: 4,
  targets: ["scene"],
  duration: [0.3, 0.6],
  params: {
    angle: { type: "number", range: [10, 40], default: 25, unit: "deg" },
    spacing: { type: "number", range: [8, 14], default: 10, unit: "px" },
    direction: { type: "choice", options: ["ltr", "rtl"], default: "ltr" },
    colour: { type: "text", default: "accent" },
    length: { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
  },
  pairs: ["text-in.slam", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sudo-kiran-no-storyboard-no-detailed", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const scene = ctx.scene || null;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const C = (c, fb) => {
      c = String(c || "").trim();
      if (c.startsWith("--x-")) return `var(${c})`;
      if (c === "white" || c === "light") return "var(--x-accent-ink)";
      if (c === "black" || c === "dark") return "var(--x-device)";
      if (/^(accent|accent-2|accent-ink|ink|good|bad|panel|panel-2|ground|dim|device|glow-1|glow-2)$/.test(c)) return `var(--x-${c})`;
      return fb;
    };
    const fillCss = C(p.colour, "var(--x-accent)");
    const edgeCss = /accent-2/.test(fillCss) ? "var(--x-accent)" : "var(--x-accent-2)";
    const probe = document.createElement("i");
    probe.style.display = "none";
    stage.append(probe);
    const rgb = (css) => {
      probe.style.color = css;
      const s = getComputedStyle(probe).color, v = (s.match(/[\d.]+/g) || ["0", "0", "0"]).map(Number);
      return s.startsWith("color(") ? v.slice(0, 3).map((x) => Math.round(x * 255)) : v.slice(0, 3);
    };
    const B = rgb(fillCss), A = rgb(edgeCss);
    probe.remove();
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;z-index:8;visibility:hidden`;
    stage.append(cv);
    const g = cv.getContext("2d");
    const tan = Math.tan((ML.clamp(+p.angle || 25, 10, 40) * Math.PI) / 180);
    // from the reading start: left in LTR, right in Arabic; "rtl" runs against it
    const fromLeft = (p.direction === "rtl") === !!ctx.rtl;
    const sp = ML.clamp(+p.spacing || 10, 8, 14) * k * 1.6;
    const Z = Math.min(W, H) * 0.42; // the halftone zone's depth
    const uMin = -H / 2 * tan, uMax = W + H / 2 * tan;
    const L = ML.clamp(+p.length || 0.4, 0.3, 0.6), done = at + L;
    const eio = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const edge = (t) => uMin + (uMax + Z - uMin) * eio(ML.lin(t, at, done));
    // the dot lattice (rows offset by half a step), each with its slash coordinate and centre weight
    const dots = [], maxD = Math.hypot(W, H) / 2;
    for (let j = 0, y = sp / 2; y < H + sp; y += sp * 0.866, j++) for (let x = (j % 2 ? sp / 2 : 0); x < W + sp; x += sp) {
      const xs = fromLeft ? x : W - x;
      dots.push({ x, y, s: xs + (H / 2 - y) * tan, w: 0.7 + 0.3 * (1 - Math.hypot(x - W / 2, y - H / 2) / maxD) });
    }
    const popW = sp * 3;
    const backOut = (x) => { const c = 1.7, q = x - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
    const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    const mixC = (u) => [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * u));
    ctx.sfx(at, "whoosh.soft", 0.45);
    return {
      draw(t) {
        const on = t >= at && t < end + 0.05;
        cv.style.visibility = on ? "visible" : "hidden";
        if (scene) scene.style.visibility = t >= done ? "hidden" : "";
        g.clearRect(0, 0, W, H);
        if (!on) return;
        const e = edge(t), solid = e - Z;
        // the solid band behind the halftone
        g.fillStyle = css(B);
        g.beginPath();
        const xT = solid - (H / 2) * tan, xB = solid + (H / 2) * tan, far = -W;
        const X = (x) => (fromLeft ? x : W - x);
        g.moveTo(X(far), 0); g.lineTo(X(xT + sp * 1.5), 0); g.lineTo(X(xB + sp * 1.5), H); g.lineTo(X(far), H); g.closePath(); g.fill();
        if (solid >= uMax) return;
        // the halftone edge: dots pop as the edge passes, grow with depth until they merge
        const bands = 8;
        const buckets = Array.from({ length: bands }, () => []);
        for (const d of dots) {
          const depth = e - d.s;
          if (depth <= 0 || depth >= Z) continue;
          const pop = backOut(ML.clamp(depth / popW)), z = depth / Z;
          const r = sp * (0.12 + 0.62 * Math.pow(z, 0.8)) * (d.w + (1 - d.w) * z) * pop;
          if (r > 0.3) buckets[Math.min(bands - 1, Math.floor(z * bands))].push(d.x, d.y, r);
        }
        buckets.forEach((b, i) => {
          if (!b.length) return;
          g.fillStyle = css(mixC((i + 0.5) / bands));
          g.beginPath();
          for (let q = 0; q < b.length; q += 3) { g.moveTo(b[q] + b[q + 2], b[q + 1]); g.arc(b[q], b[q + 1], b[q + 2], 0, Math.PI * 2); }
          g.fill();
        });
      },
    };
  },
});
