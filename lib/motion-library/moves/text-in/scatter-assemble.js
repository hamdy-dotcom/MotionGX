// Scatter assemble: every letter starts at its own seeded spot — pushed out ±radius px, dropped 20–80 px, turned up to
// ±rotation° and optionally oversized — and flies home (power3 out, or a spring of stiffness 260 / damping 18), one
// after another in reading or seeded order, so lines build one after the next. Big version: one letter in the accent,
// and on lock a burst of small squares (ink / accent / dim) that drift and fade. Latin only: letters must split.
// Sources: prompt-motion blushpetal795 "wtf made this with…", codestackr "I keep seeing all…" (reference only — our
// own rebuild).
ML.define({
  id: "text-in.scatter-assemble",
  category: "text-in",
  name: "Scatter assemble",
  does: "Letters fly in from scattered, rotated positions (from slightly off to oversized and far) and lock together into the word.",
  says: ["playful", "energy", "change", "arrival"],
  energy: 4,
  targets: ["word", "line", "headline"],
  duration: [0.6, 1.8],
  params: {
    radius: { type: "number", range: [60, 400], default: 120, unit: "px" },
    rotation: { type: "number", range: [0, 90], default: 60, unit: "deg" },
    start_scale: { type: "number", range: [1, 3], default: 1, unit: "x" },
    order: { type: "choice", options: ["reading", "random"], default: "reading" },
    stagger: { type: "number", range: [0.02, 0.06], default: 0.03, unit: "s" },
    motion: { type: "choice", options: ["power3.out", "spring"], default: "power3.out" },
    particles: { type: "bool", default: false },
    accent_letter: { type: "bool", default: false },
    seed: { type: "number", range: [1, 99], default: 7 },
  },
  pairs: ["accent.impact-burst", "text-emphasis.letter-wave"],
  avoid: ["luxury", "calm", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:blushpetal795-wtf-made-this-with", license: "reference", note: "also codestackr-i-keep-seeing-all; our own code" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const S = p.seed;
    const chars = ML.split(el, "chars");
    const n = chars.length;
    if (!n) return null;
    el.style.position = "relative";
    // order of arrival: reading order, or a seeded shuffle
    const order = chars.map((_, i) => i);
    if (p.order === "random") order.sort((a, b) => ML.rnd(a, S + 11) - ML.rnd(b, S + 11));
    const rank = new Array(n); order.forEach((ci, r) => (rank[ci] = r));
    const DUR = 0.5;
    // a long line tightens its stagger to lock before the move's end
    const st = Math.min(p.stagger, Math.max(0.005, (end - 0.3 - DUR - at) / Math.max(1, n - 1)));
    const from = chars.map((c, i) => {
      const sx = ML.rnd(i, S) < 0.5 ? -1 : 1, sr = ML.rnd(i, S + 3) < 0.5 ? -1 : 1;
      return {
        x: sx * (0.5 + 0.5 * ML.rnd(i, S + 1)) * p.radius,
        y: (20 + 60 * ML.rnd(i, S + 2)) * (ML.rnd(i, S + 5) < 0.3 ? -1 : 1),
        r: sr * (0.45 + 0.55 * ML.rnd(i, S + 4)) * p.rotation,
        s: p.start_scale,
        a: at + rank[i] * st,
      };
    });
    const accentAt = p.accent_letter ? Math.floor(ML.rnd(S, 9) * n) : -1;
    if (accentAt >= 0) chars[accentAt].style.color = "var(--x-accent)";
    const curve = p.motion === "spring" ? (x) => ML.step(x, { stiffness: 260, damping: 18 }) : (x) => 1 - Math.pow(1 - ML.clamp(x / DUR), 3);
    const lockAll = at + (n - 1) * st + DUR;
    // the burst: small squares thrown from the letters as they lock
    const bits = [];
    if (p.particles) {
      const eb = el.getBoundingClientRect(), k = eb.width / (el.offsetWidth || 1) || 1;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
      const cols = ["var(--x-ink)", "var(--x-accent)", "var(--x-dim)"];
      const count = Math.min(28, Math.max(10, n * 2));
      for (let j = 0; j < count; j++) {
        const ci = Math.floor(ML.rnd(j, S + 21) * n), r = chars[ci].getBoundingClientRect();
        const size = 6 + 10 * ML.rnd(j, S + 22), ang = ML.rnd(j, S + 23) * Math.PI * 2;
        const d = document.createElement("span");
        d.style.cssText = `position:absolute;left:0;top:0;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;background:${cols[j % 3]};pointer-events:none;visibility:hidden;`;
        el.append(d);
        bits.push({ d, x: (r.left - eb.left + r.width / 2) / k, y: (r.top - eb.top + r.height / 2) / k, dx: Math.cos(ang), dy: Math.sin(ang), dist: fs * (0.4 + 0.9 * ML.rnd(j, S + 24)), spin: (ML.rnd(j, S + 25) - 0.5) * 240, a: from[ci].a + DUR * 0.8 });
      }
    }
    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(lockAll - 0.05, "land.light", 0.35);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        chars.forEach((c, i) => {
          const f = from[i];
          if (t < f.a) { c.style.visibility = "hidden"; return; }
          c.style.visibility = "visible";
          const u = curve(t - f.a), w = 1 - u;
          c.style.opacity = Math.min(1, ML.lin(t, f.a, f.a + DUR * 0.35)).toFixed(4);
          c.style.translate = Math.abs(w) < 1e-4 ? "none" : `${(f.x * w).toFixed(2)}px ${(f.y * w).toFixed(2)}px`;
          c.style.rotate = Math.abs(w) < 1e-4 ? "none" : `${(f.r * w).toFixed(2)}deg`;
          const s = 1 + (f.s - 1) * w;
          c.style.scale = Math.abs(s - 1) < 1e-4 ? "none" : s.toFixed(4);
        });
        for (const b of bits) {
          const life = ML.lin(t, b.a, b.a + 0.9);
          if (t < b.a || life >= 1) { b.d.style.visibility = "hidden"; continue; }
          const u = 1 - Math.pow(1 - life, 3), x = b.x + b.dx * b.dist * u, y = b.y + b.dy * b.dist * u - 12 * life;
          b.d.style.visibility = "visible";
          b.d.style.opacity = (1 - life).toFixed(4);
          b.d.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${(b.spin * u).toFixed(1)}deg)`;
        }
      },
    };
  },
});
