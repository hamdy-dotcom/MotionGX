// Ring burst in: a small dot at the headline's centre pulses one to three concentric rings outward (r 20 → ring_radius,
// fading, 0.4 s, in accent / accent-2 / ink), and the headline's letters snap into existence around it in reading
// order — each clip-revealed from the top while it drops into place (y −30% → 0, scaleY 0.6 → 1, 0.18 s power3 out,
// staggered), line 2 starting 0.25 s after line 1. A one-line headline is broken into two at its middle word when
// lines = 2 and its band has the room (it stays on one line where two would overflow, as in a wide frame). Optional hollow O: an O / 0 arrives as an empty ring that fills in after its line. Arabic reveals per word.
// Source: prompt-motion oliahmed205 "just tried opus 5.5" (reference only — our own rebuild).
ML.define({
  id: "text-in.ring-burst-in",
  category: "text-in",
  name: "Ring burst in",
  does: "A dot pulses rings outward and the headline letters snap into existence around it, line by line.",
  says: ["arrival", "reveal", "energy"],
  energy: 4,
  targets: ["headline"],
  duration: [0.8, 2],
  params: {
    rings: { type: "number", range: [1, 3], default: 2 },
    ring_radius: { type: "number", range: [40, 160], default: 80, unit: "px" },
    split: { type: "choice", options: ["letters", "words"], default: "letters" },
    stagger: { type: "number", range: [0.02, 0.06], default: 0.035, unit: "s" },
    lines: { type: "number", range: [1, 2], default: 2 },
    hollow_o: { type: "bool", default: false },
  },
  pairs: ["text-in.pop-in", "accent.impact-burst"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:oliahmed205-just-tried-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, W = ctx.f.W, H = ctx.f.H, k = Math.min(W, H) / 1080;
    const units = ML.split(el, p.split === "letters" ? "chars" : "words");
    // a Latin word / number split into letters inside right-to-left text keeps its own left-to-right order
    for (const w of el.querySelectorAll(".ml-w")) if (!ML.ARABIC.test(w.textContent)) w.style.direction = "ltr";
    if (!units.length) return null;
    const words = [...el.querySelectorAll(".ml-w")];
    const lineTops = () => units.map((u) => Math.round(ctx.box(u).y));
    // two lines asked and the headline sits on one: break before the word nearest the middle
    if (Math.round(p.lines) === 2 && words.length > 1 && new Set(lineTops()).size === 1) {
      const total = words.reduce((s, w) => s + w.textContent.length, 0);
      let acc = 0, j = 1;
      for (let i = 0; i < words.length; i++) { acc += words[i].textContent.length; if (acc >= total / 2) { j = Math.min(words.length - 1, i + 1); break; } }
      const br = document.createElement("br"), band = el.parentElement;
      words[j].before(br);
      if (band && band.clientHeight) {
        const kids = [...band.children], need = kids.reduce((s, c) => s + c.offsetHeight, 0) + (parseFloat(getComputedStyle(band).rowGap) || 0) * (kids.length - 1);
        if (need > band.clientHeight * 1.1) br.remove();
      }
    }
    // group units by line, in reading order (DOM order already reads in the text's direction)
    const tops = lineTops(), fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const lineOf = [], keys = [];
    tops.forEach((y) => { let L = keys.findIndex((k2) => Math.abs(k2 - y) < fs * 0.4); if (L < 0) { keys.push(y); L = keys.length - 1; } lineOf.push(L); });
    const times = [];
    let start = at + 0.15, cur = 0, j = 0;
    units.forEach((u, i) => {
      if (lineOf[i] !== cur) { start = times[i - 1] + 0.25; cur = lineOf[i]; j = 0; }
      times.push(start + j++ * p.stagger);
    });
    // a long headline tightens to fit the run
    const first = at + 0.15, over = (times[times.length - 1] + 0.18 - first) / Math.max(0.3, end - 0.35 - first);
    if (over > 1) times.forEach((x, i) => (times[i] = first + (x - first) / over));
    const done = times[times.length - 1] + 0.18;
    const hollow = units.map((u) => p.hollow_o && /^[Oo0]$/.test(u.textContent)), hollowW = fs * 0.035;
    const lineEnd = (L) => Math.max(...times.filter((_, i) => lineOf[i] === L)) + 0.18;
    units.forEach((u, i) => {
      u.style.transformOrigin = "50% 0";
      if (hollow[i]) u.dataset.fillAt = String(lineEnd(lineOf[i]) + 0.3);
    });
    // dot and rings at the headline's centre, under the letters
    const b = ctx.box(el), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const fx = document.createElement("div");
    Object.assign(fx.style, { position: "absolute", left: cx + "px", top: cy + "px", width: "0", height: "0", pointerEvents: "none" });
    // just under the headline's own block: over any backdrop the scene has, never over the letters
    let block = el;
    while (block.parentElement && block.parentElement !== host) block = block.parentElement;
    host.insertBefore(fx, block.parentElement === host ? block : host.firstChild);
    const dot = document.createElement("div"), ds = 6 * k * 1.6;
    Object.assign(dot.style, { position: "absolute", left: -ds / 2 + "px", top: -ds / 2 + "px", width: ds + "px", height: ds + "px", borderRadius: "50%", background: "var(--x-accent)" });
    fx.append(dot);
    const cols = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-ink)"];
    const rings = [];
    for (let i = 0; i < Math.round(p.rings); i++) {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "absolute", borderRadius: "50%", border: `${(3 * k).toFixed(1)}px solid ${cols[i % 3]}`, boxSizing: "border-box" });
      fx.append(r); rings.push({ r, t0: at + i * 0.08 });
    }
    const R0 = 20 * k, R1 = p.ring_radius * k * 1.6;
    ctx.sfx(at, "pop", 0.35);
    [...new Set(lineOf)].forEach((L) => ctx.sfx(times[lineOf.indexOf(L)], "tap", 0.25));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        el.style.opacity = (1 - leave).toFixed(4);
        // the dot: pops up, pulses with the rings, fades as the letters take over
        const dIn = ML.back(t, at, at + 0.12, 2), dOut = ML.ease(t, at + 0.2, done);
        const ds2 = Math.max(0, dIn) * (1 + 0.4 * ML.pulse(t, at + 0.05, 0.04, 0.15));
        dot.style.opacity = (t >= at ? 1 - dOut : 0).toFixed(4);
        dot.style.scale = ds2.toFixed(4);
        for (const o of rings) {
          const u = ML.out(t, o.t0, o.t0 + 0.4), r = R0 + (R1 - R0) * u;
          o.r.style.visibility = t >= o.t0 && u < 1 ? "visible" : "hidden";
          o.r.style.opacity = (1 - u).toFixed(4);
          Object.assign(o.r.style, { left: -r + "px", top: -r + "px", width: 2 * r + "px", height: 2 * r + "px" });
        }
        units.forEach((u, i) => {
          const x = ML.out(t, times[i], times[i] + 0.18);
          u.style.visibility = x > 0 ? "visible" : "hidden";
          u.style.translate = x >= 1 ? "none" : `0 ${(-(1 - x) * 30).toFixed(2)}%`;
          u.style.scale = x >= 1 ? "none" : `1 ${(0.6 + 0.4 * x).toFixed(4)}`;
          u.style.clipPath = x >= 1 ? "none" : `inset(-10% -10% ${((1 - x) * 100).toFixed(2)}% -10%)`;
          if (hollow[i]) { const f = ML.ease(t, +u.dataset.fillAt, +u.dataset.fillAt + 0.25); u.style.webkitTextStroke = f >= 1 ? "" : `${(hollowW * (1 - f)).toFixed(2)}px currentColor`; u.style.webkitTextFillColor = f >= 1 ? "" : `color-mix(in srgb, currentColor ${(f * 100).toFixed(1)}%, transparent)`; }
        });
      },
    };
  },
});
