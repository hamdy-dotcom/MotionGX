// Cards tossed onto the table: each card starts off its slot — from below (y +120…160 px), from a side (x +400,
// y ±80) or from a seeded point around the frame (400–700 px away) — at opacity 0, scale 0.86, a tilt of
// ±entry_tilt (alternating, or fanned (k − mid) × 5°), optionally blurred 5 px, and lands at opacity 1, scale 1 on its
// resting angle: straight, ±2° (slight), fanned (k − mid) × 3°, or a seeded ±3…8° collage on jittered slots in rows,
// over 0.6 s expo.out (power3.out for the collage, back.out(1.2) for "around"). One per beat, on each card's spoken
// word, or a 0.12 s stagger. A card-place sound per landing (cycling samples); the shadow tightens as it lands; the
// caption fades in 0.1 s after; then a slow upward drift until the end (idle float).
// Source: MotionGX lib/studio-engine/assets/scenes.js S.wall / S.items / S.gallery (own) + prompt-motion
// "bizibeast-motion-designers-are-cooked", "agonaliu-opus-5-5-one-shotted-this", "ik-builds-i-was-quoted-3000"
// (reference only — rebuilt as our own code).
ML.define({
  id: "element.card-toss",
  category: "element",
  name: "Cards tossed onto the table",
  does: "Cards fly in from off-frame at an angle, spin a little and land in place, straight, tilted or as an overlapping collage, one per beat.",
  says: ["arrival", "list", "playful", "result", "story"],
  energy: 3,
  targets: ["card", "image", "list"],
  duration: [1, 4],
  params: {
    from: { type: "choice", options: ["below", "left", "right", "around"], default: "below" },
    count: { type: "number", range: [2, 8], default: 4 },
    entry_tilt: { type: "number", range: [0, 25], default: 6, unit: "deg" },
    resting: { type: "choice", options: ["straight", "slight-tilt", "fanned", "collage"], default: "slight-tilt" },
    distance: { type: "number", range: [120, 400], default: 140, unit: "px" },
    timing: { type: "choice", options: ["beat", "word", "stagger"], default: "beat" },
    blur: { type: "bool", default: false },
    drift: { type: "bool", default: true },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.slow-push", "transition.scatter-exit"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.wall, S.items, S.gallery", license: "own", note: "collage / 'around' variant rebuilt from prompt-motion bizibeast-motion-designers-are-cooked, agonaliu-opus-5-5-one-shotted-this, ik-builds-i-was-quoted-3000 (reference only)" },
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

    const n = Math.round(ML.clamp(p.count, 2, 8));
    const pic = own && own.tagName === "IMG" ? own : own && own.querySelector ? own.querySelector("img") : null;
    const mine = own && own.children.length > 1 ? [...own.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const DEF = rtl
      ? [["سماعة", "١٢٠٠ ج"], ["ساعة", "٢٤٥٠ ج"], ["شنطة", "٨٩٩ ج"], ["كاميرا", "٥٣٠٠ ج"], ["نضارة", "٧٥٠ ج"], ["جزمة", "١٤٠٠ ج"], ["لابتوب", "٢١٠٠٠ ج"], ["كوباية", "١٨٠ ج"]]
      : [["Headphones", "$129"], ["Watch", "$249"], ["Tote bag", "$89"], ["Camera", "$540"], ["Sunglasses", "$75"], ["Sneakers", "$140"], ["Laptop", "$1,299"], ["Mug", "$18"]];
    const items = Array.from({ length: n }, (_, i) => (mine[i] ? [mine[i], DEF[i % DEF.length][1]] : DEF[i % DEF.length]));

    // slots
    const collage = p.resting === "collage";
    let cols, rows;
    if (collage) { cols = f.tall ? (n > 4 ? 3 : 2) : Math.min(4, Math.ceil(n / 2)); rows = Math.ceil(n / cols); }
    else if (f.tall) { cols = n <= 3 ? n : Math.ceil(n / 2); rows = Math.ceil(n / cols); }
    else { cols = n <= 5 ? n : Math.ceil(n / 2); rows = Math.ceil(n / cols); }
    const aspect = 1.28; // card height / width (picture + caption)
    const gx = collage ? -0.08 : 0.08;
    let cw = Math.min((R.w * 0.92) / (cols + (cols - 1) * gx), (R.h * 0.86) / (rows * aspect + (rows - 1) * Math.max(0.06, gx) * aspect), 420 * k);
    if (collage) cw *= 1.05;
    const ch = cw * aspect;
    const gridW = cols * cw + (cols - 1) * gx * cw, gridH = rows * ch + (rows - 1) * Math.max(0.06, gx) * ch;
    const ox = (R.w - gridW) / 2, oy = (R.h - gridH) / 2;
    const mid = (n - 1) / 2;
    const slots = items.map((_, i) => {
      const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), c0 = i % cols;
      const c = rtl ? inRow - 1 - c0 : c0;
      const rowOff = (cols - inRow) * cw * (1 + gx) / 2;
      let x = ox + rowOff + c * cw * (1 + gx), y = oy + r * ch * (1 + Math.max(0.06, gx));
      if (collage) { x += (ML.rnd(i, 11) - 0.5) * cw * 0.22; y += (ML.rnd(i, 13) - 0.5) * ch * 0.16; }
      let rest = 0;
      if (p.resting === "slight-tilt") rest = i % 2 ? 2 : -2;
      else if (p.resting === "fanned") rest = (i - mid) * 3;
      else if (collage) rest = (ML.rnd(i, 17) < 0.5 ? -1 : 1) * (3 + ML.rnd(i, 19) * 5);
      return { x, y, rest };
    });
    if (p.resting === "fanned") slots.forEach((s, i) => { s.y += Math.pow(i - mid, 2) * ch * 0.02; });

    const cards = items.map(([name, price], i) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${cw * 0.045}px;display:flex;flex-direction:column;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${(cw * 0.09).toFixed(1)}px));transform-origin:50% 60%;z-index:${i + 1};opacity:0;`, layer);
      const ph = mk("div", `position:relative;flex:1;overflow:hidden;border-radius:calc(min(var(--x-pic-radius), ${(cw * 0.07).toFixed(1)}px));background:linear-gradient(${140 + i * 31}deg, color-mix(in srgb, var(--x-accent) ${30 + ((i * 17) % 50)}%, var(--x-panel-2)), color-mix(in srgb, var(--x-accent-2) ${25 + ((i * 29) % 55)}%, var(--x-panel-2)));`, c);
      if (pic) { const im = pic.cloneNode(true); im.removeAttribute("data-slot"); im.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${(i * 41) % 100}% 50%;display:block;filter:var(--x-pic-filter);`; ph.append(im); }
      else mk("div", `position:absolute;left:28%;top:22%;width:44%;aspect-ratio:1;border-radius:${i % 3 === 0 ? "50%" : i % 3 === 1 ? "22%" : "50% 50% 12% 12%"};background:color-mix(in srgb, var(--x-panel) 55%, transparent);box-shadow:0 ${cw * 0.04}px ${cw * 0.08}px color-mix(in srgb, var(--x-ink) 14%, transparent);`, ph);
      const cap = mk("div", `flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:${cw * 0.03}px;padding:${cw * 0.05}px ${cw * 0.02}px ${cw * 0.01}px;`, c);
      mk("span", `font:var(--x-body-weight) ${cw * 0.075}px/1.2 var(--x-body-font);color:var(--x-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, cap, name);
      mk("span", `font:var(--x-head-weight) ${cw * 0.09}px/1.1 var(--x-head-font);color:var(--x-ink);white-space:nowrap;`, cap, price);
      return { c, cap };
    });

    // landing times
    const span = Math.max(0.3, end - at - 1);
    const beat = Math.min(0.5, span / Math.max(1, n - 1));
    const stag = Math.min(0.12, span / Math.max(1, n - 1));
    const times = items.map(([name], i) => {
      if (p.timing === "stagger") return at + i * stag;
      if (p.timing === "word") return Math.max(at, ctx.word(name.split(/\s+/)[0], at + i * beat));
      return at + i * beat;
    });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.06);
    const dur = collage ? 0.6 : 0.65;
    times.forEach((t, i) => ctx.sfx(t + dur * 0.35, i % 3 === 2 ? "card.fan" : "card", 0.42));

    // where each card is thrown from
    const D = p.distance * k;
    const side = (s) => (rtl ? -s : s);
    const start = slots.map((s, i) => {
      if (p.from === "below") return { x: 0, y: D + 20 * k * ML.rnd(i, 3), r: (i % 2 ? 1 : -1) * p.entry_tilt };
      if (p.from === "left" || p.from === "right") { const sg = side(p.from === "right" ? 1 : -1); return { x: sg * Math.max(400 * k, D * 2), y: (ML.rnd(i, 5) - 0.5) * 160 * k, r: sg * p.entry_tilt }; }
      const a = ML.rnd(i, 7) * Math.PI * 2, d = (400 + ML.rnd(i, 9) * 300) * k;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: (ML.rnd(i, 21) < 0.5 ? -1 : 1) * Math.min(40, p.entry_tilt * 1.6) };
    });
    if (p.resting === "fanned") start.forEach((s, i) => { s.r = (i - mid) * 5 + (p.from === "below" ? 0 : s.r * 0.3); });
    const easeAt = (t, a) => (p.from === "around" ? ML.back(t, a, a + dur, 1.2) : collage ? ML.out(t, a, a + dur) : ML.expo(t, a, a + dur));
    const goA = Math.max(times[n - 1] + dur + 0.3, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        cards.forEach(({ c, cap }, i) => {
          const a = times[i], e = easeAt(t, a), S = slots[i], F = start[i];
          const drift = p.drift ? -(24 + i * 6) * k * ML.lin(t, a + dur, Math.max(a + dur + 0.5, end)) : 0;
          const x = S.x + F.x * (1 - e), y = S.y + F.y * (1 - e) + drift;
          const r = F.r + (S.rest - F.r) * Math.min(1, e);
          const sc = 0.86 + 0.14 * Math.min(1, e);
          c.style.opacity = ML.lin(t, a, a + dur * 0.3).toFixed(4);
          c.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
          // the shadow tightens as it lands (a wide, soft lift while in the air → the look's own shadow)
          const air = 1 - ML.out(t, a, a + dur);
          c.style.boxShadow = air > 0.01 ? `0 ${(40 * air * k).toFixed(1)}px ${(70 * air * k).toFixed(1)}px -${(10 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(22 * air).toFixed(1)}%, transparent), var(--x-shadow)` : "var(--x-shadow)";
          const bl = p.blur && !pic ? (1 - ML.out(t, a, a + dur * 0.8)) * 5 * k : 0;
          c.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          cap.style.opacity = ML.lin(t, a + dur * 0.5 + 0.1, a + dur * 0.5 + 0.3).toFixed(4);
        });
      },
    };
  },
});
