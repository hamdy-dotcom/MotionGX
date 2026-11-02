// Overprint stamp: bold words stamp on one at a time like risograph ink — a hard 1-2 frame appear with scale
// 1.06 -> 1 in 0.12 s and a one-frame 2-3 px registration slip that settles — in grainy accent ink multiplied over a
// coloured shape, so the overlap prints deeper. The print wobbles ±1 px every 2 frames. Whole words, any script.
// Source: our own rebuild of prompt-motion "rneayan-opus-5-5-risograph-style" — reference only.
ML.define({
  id: "text-in.overprint-stamp",
  category: "text-in",
  name: "Overprint stamp",
  does: "Bold words stamp on one at a time like risograph ink, overprinting what is under them with a slight misregistration jitter.",
  says: ["playful", "brand", "story"],
  energy: 3,
  targets: ["word", "headline"],
  duration: [0.6, 3],
  params: {
    blend: { type: "choice", options: ["multiply", "none"], default: "multiply" },
    slip: { type: "number", range: [0, 4], default: 2.5, unit: "px" },
    cadence: { type: "number", range: [0.3, 0.8], default: 0.6, unit: "s" },
    sync: { type: "choice", options: ["beat", "spoken"], default: "beat" },
    wobble: { type: "bool", default: true },
    grain: { type: "bool", default: true },
    shape: { type: "choice", options: ["circle", "block", "none"], default: "circle" },
  },
  pairs: ["background.paper-grain", "accent.riso-shapes"],
  avoid: ["luxury", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:rneayan-opus-5-5-risograph-style", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    // heavy ink: the look's headline face at its heaviest
    el.style.fontFamily = "var(--x-head-font)";
    el.style.fontWeight = "800";
    const k = fs / 60; // the slip is given at ~60 px type
    const id = `ml-riso-${Math.floor(ML.rnd(at * 997 + fs, (el.textContent || "").length) * 1e9)}`;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    // grain: a fixed turbulence punches tiny speckles out of the ink (seeded by the filter, the same every frame)
    if (p.grain) {
      const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.innerHTML = `<filter id="${id}" x="-15%" y="-25%" width="130%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="${(0.9 / Math.max(0.6, k * 0.6)).toFixed(3)}" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4 2.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
      el.append(svg);
    }
    const words = ML.split(el, "words");
    words.forEach((w) => {
      w.style.color = "var(--x-accent)";
      if (p.blend === "multiply") w.style.mixBlendMode = "multiply";
      if (p.grain) w.style.filter = `url(#${id})`;
    });
    // the coloured shape the ink overprints, sitting behind the first part of the words (from the reading start)
    let shape = null;
    if (p.shape !== "none") {
      shape = doc.createElement("span");
      const L = Math.min(...words.map((w) => w.offsetLeft)), R = Math.max(...words.map((w) => w.offsetLeft + w.offsetWidth));
      const T = Math.min(...words.map((w) => w.offsetTop)), B = Math.max(...words.map((w) => w.offsetTop + w.offsetHeight));
      const h = B - T || fs * 1.2;
      const d = Math.min(h * 1.5, (R - L) * 0.6);
      const wd = p.shape === "block" ? Math.min(d * 1.8, R - L) : d;
      const cx = rtl ? R - (R - L) * 0.28 : L + (R - L) * 0.28;
      Object.assign(shape.style, { position: "absolute", left: `${(cx - wd / 2).toFixed(1)}px`, top: `${((T + B) / 2 - d / 2).toFixed(1)}px`, width: `${wd.toFixed(1)}px`, height: `${d.toFixed(1)}px`, background: "var(--x-accent-2)", borderRadius: p.shape === "circle" ? "50%" : "calc(var(--x-radius) * 0.3)", zIndex: "-1", opacity: "0", pointerEvents: "none" });
      if (p.grain) shape.style.filter = `url(#${id})`;
      el.prepend(shape);
    }
    // times: on the beat (or on the spoken words), never closer than 0.15 s
    let prev = -Infinity;
    const times = words.map((w, i) => {
      const fb = at + 0.12 + i * p.cadence;
      const x = p.sync === "spoken" ? Math.max(at + 0.12, ctx.word(w.textContent, fb)) : fb;
      prev = Math.max(x, prev + 0.15);
      return prev;
    });
    const room = (end - at) * 0.8;
    const span = times[times.length - 1] - at;
    if (span > room && span > 0) times.forEach((x, i) => { times[i] = at + (x - at) * (room / span); });
    times.forEach((x) => ctx.sfx(x, "snap", 0.3));
    const slip = p.slip * k;
    const frame = 1 / 30;
    return {
      draw(t) {
        // print wobble: ±1 px every 2 frames, seeded by the frame pair
        if (p.wobble && t >= at) {
          const step = Math.floor(t / (frame * 2));
          el.style.translate = `${((ML.rnd(step, 1) - 0.5) * 2 * k).toFixed(2)}px ${((ML.rnd(step, 2) - 0.5) * 2 * k).toFixed(2)}px`;
        } else el.style.translate = "none";
        if (shape) { const s = ML.lin(t, at, at + 0.05); shape.style.opacity = s.toFixed(3); shape.style.scale = (1.04 - 0.04 * ML.out(t, at, at + 0.12)).toFixed(4); }
        words.forEach((w, i) => {
          const a = times[i];
          if (t < a) { w.style.opacity = "0"; return; }
          w.style.opacity = ML.lin(t, a, a + frame * 1.5).toFixed(4);
          w.style.scale = (1.06 - 0.06 * ML.out(t, a, a + 0.12)).toFixed(4);
          // one frame off register, then it settles to a hair's misprint
          const off = t < a + frame ? 1 : 0.18 + 0.82 * Math.exp(-(t - a - frame) / 0.04);
          const dir = ML.rnd(i, 5) < 0.5 ? -1 : 1;
          w.style.translate = `${(dir * slip * off).toFixed(2)}px ${(-slip * 0.6 * off).toFixed(2)}px`;
          w.style.textShadow = `${(-dir * slip * off * 0.8).toFixed(2)}px ${(slip * 0.5 * off).toFixed(2)}px 0 color-mix(in srgb, var(--x-accent-2) 55%, transparent)`;
        });
      },
    };
  },
});
