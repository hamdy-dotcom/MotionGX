// Letters swing in on a curve: each letter starts offset along an arc (from the reading end: +300 px x, +200 px y in a
// 1080 frame, rotated 40–70°) and flies a curved path to its slot in 0.6 s, `stagger` apart — x on power3.out, y on
// back.out, so the path bends (arc); "wave" adds a travelling sine to y, "spiral" winds the letter round its slot on a
// shrinking radius. Motion blur is an SVG feGaussianBlur per letter, along its velocity and proportional to its speed
// (0 → 12 px → 0). Rotation overshoots by a few degrees and settles; mid-flight the word reads as a wave. Arabic (or
// split "word") swings whole words — joined letters never split — and RTL mirrors the side it comes from.
// Source: prompt-motion:motiondsgnr-yo-opus-5-5-raw (reference only — our own rebuild).
ML.define({
  id: "kinetic.letters-arc-swing",
  category: "kinetic",
  name: "Letters swing in on a curve",
  does: "The letters of a word fly in on a curved path, tumbling and blurred, and settle into a straight heavy word.",
  says: ["energy", "playful", "arrival"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [0.8, 2],
  params: {
    path: { type: "choice", options: ["arc", "wave", "spiral"], default: "arc" },
    from: { type: "choice", options: ["right", "below", "scatter"], default: "right" },
    blur: { type: "bool", default: true },
    split: { type: "choice", options: ["chars", "word"], default: "chars" },
    stagger: { type: "number", range: [0.02, 0.1], default: 0.05, unit: "s" },
    fly: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    heavy: { type: "bool", default: true },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument, NS = "http://www.w3.org/2000/svg";
    if (p.heavy) Object.assign(el.style, { fontFamily: "var(--x-head-font)", fontWeight: "max(var(--x-head-weight), 800)", color: "var(--x-ink)" });
    // the letters fly over the scene, never behind what follows them in it
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "5";
    const parts = ML.split(el, p.split === "word" ? "words" : "chars");
    if (!parts.length) return null;
    const k = Math.min(f.W, f.H) / 1080, side = rtl ? -1 : 1;
    // a fixed bank of directional blurs (x by y, 1 px steps to 12): a letter picks the one for its velocity, so no
    // filter is ever rewritten between frames
    const uid = "ml-las-" + Math.round(ML.rnd(at * 7.3 + parts.length, 2) * 1e9);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    Object.assign(svg.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    let bank = "";
    for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) if (x + y) bank += `<filter id="${uid}-${x}-${y}" x="-200%" y="-80%" width="500%" height="260%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${x} ${y}"/></filter>`;
    svg.innerHTML = bank;
    el.append(svg);
    // starting offsets per letter
    const starts = parts.map((_, i) => {
      const r1 = ML.rnd(i + 1, 3), r2 = ML.rnd(i + 1, 5), rot = (40 + 30 * r1) * (r2 < 0.5 ? -1 : 1);
      if (p.from === "below") return { x: side * (40 + 80 * r1) * k, y: (380 + 120 * r2) * k, r: rot };
      if (p.from === "scatter") { const a = r1 * Math.PI * 2, d = (320 + 160 * r2) * k; return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: rot }; }
      return { x: side * (300 + 40 * r2) * k, y: (200 + 30 * r1) * k, r: Math.abs(rot) * side };
    });
    const t0 = parts.map((_, i) => at + i * p.stagger), F = p.fly;
    ctx.sfx(at, "whoosh.soft", 0.3);
    ctx.sfx(t0[t0.length - 1] + F * 0.8, "land.light", 0.2);
    const p3 = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    const bk = (x, c = 1.7) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); // back.out
    // a letter's pose at time t (pure)
    const pose = (i, t) => {
      const u = ML.clamp((t - t0[i]) / F), s = starts[i];
      if (u <= 0) return { x: s.x, y: s.y, r: s.r, u };
      let x, y;
      if (p.path === "spiral") {
        const R = Math.hypot(s.x, s.y) * (1 - p3(u)), a = Math.atan2(s.y, s.x) + side * Math.PI * 1.5 * p3(u);
        x = Math.cos(a) * R; y = Math.sin(a) * R;
      } else {
        x = s.x * (1 - p3(u)); y = s.y * (1 - bk(u));
        if (p.path === "wave") y += Math.sin(u * Math.PI * 2 + i * 0.7) * 60 * k * (1 - u);
      }
      // rotation: tumble in, overshoot a few degrees, settle
      const r = s.r * (1 - p3(u)) - Math.sign(s.r) * 3 * Math.sin(Math.PI * ML.clamp((u - 0.55) / 0.45));
      return { x, y, r, u };
    };
    return {
      draw(t) {
        ML.show(el, t, at - 1e-3, end - 0.25, { kind: "fade", dur: 0.01 });
        parts.forEach((c, i) => {
          const a = pose(i, t);
          c.style.opacity = ML.lin(t, t0[i], t0[i] + 0.12).toFixed(4);
          c.style.transform = a.u >= 1 ? "none" : `translate(${a.x.toFixed(2)}px, ${a.y.toFixed(2)}px) rotate(${a.r.toFixed(2)}deg)`;
          if (!p.blur || a.u <= 0 || a.u >= 1) { c.style.filter = "none"; return; }
          // speed over the last 1/60 s → blur along the motion (0 → 12 px → 0)
          const b = pose(i, t - 1 / 60), vx = Math.abs(a.x - b.x) * 60, vy = Math.abs(a.y - b.y) * 60;
          const sx = Math.round(Math.min(12, vx / 220)), sy = Math.round(Math.min(12, vy / 220));
          c.style.filter = sx + sy ? `url(#${uid}-${sx}-${sy})` : "none";
        });
      },
    };
  },
});
