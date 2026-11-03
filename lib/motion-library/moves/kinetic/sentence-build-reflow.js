// Sentence builds, reflowing: the statement grows one word at a time (EVERY → EVERY FRAME → EVERY FRAME ON PURPOSE.)
// and every addition reflows what is already there. The layout of each state is computed up front (the words laid out
// for real at that state's size inside the target's width), then each word FLIPs from its place in the previous state
// to its place in the new one over 0.3 s expo.out, while the new word enters from off the frame (side or below) with a
// 16 px → 0 blur. As it grows the block can shrink (scale 1 → min_scale); words are set at the largest size and only
// ever scaled down, so the final state is the target's own size and nothing is enlarged. One state per spoken word
// (or per beat). Arabic: words stay whole and the line flows right to left.
// Source: prompt-motion:ajith-io-wtf-made-with-claude (reference only — our own rebuild).
ML.define({
  id: "kinetic.sentence-build-reflow",
  category: "kinetic",
  name: "Sentence builds, reflowing",
  does: "Words are added one at a time; each addition reflows the existing words (shift, shrink, wrap) until the full statement stands.",
  says: ["story", "energy", "step"],
  energy: 4,
  targets: ["headline", "line"],
  duration: [1.5, 5],
  params: {
    entry_from: { type: "choice", options: ["right", "left", "below"], default: "below" },
    shrink: { type: "bool", default: true },
    min_scale: { type: "number", range: [0.6, 1], default: 0.75 },
    cadence: { type: "choice", options: ["word-timings", "beat"], default: "word-timings" },
    flip: { type: "number", range: [0.2, 0.6], default: 0.3, unit: "s" },
    blur: { type: "number", range: [0, 24], default: 16, unit: "px" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:ajith-io-wtf-made-with-claude", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    if (!el) return null;
    const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const host = ctx.scene || stage;
    const cs = getComputedStyle(el), elFs = parseFloat(cs.fontSize);
    const box = ctx.box(el);
    el.style.visibility = "hidden"; // the layer builds these words: the slot never flashes its full line first
    const ar = ML.ARABIC.test(words.join(" "));
    const n = words.length, minS = p.shrink ? Math.min(1, p.min_scale) : 1;
    const baseFs = elFs / minS; // the first state's size; the last state is the target's own
    const scaleAt = (k) => (n < 2 ? minS : 1 - (1 - minS) * (k / (n - 1)));

    // the layer: over the target's box, the same font, words absolutely placed
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px", zIndex: "5", pointerEvents: "none", font: `${cs.fontStyle} ${cs.fontWeight} ${baseFs.toFixed(2)}px / ${cs.lineHeight === "normal" ? 1.1 : parseFloat(cs.lineHeight) / elFs} ${cs.fontFamily}`, letterSpacing: ar ? "0" : cs.letterSpacing, textTransform: cs.textTransform, color: cs.color });
    layer.setAttribute("dir", rtl ? "rtl" : "ltr");
    host.append(layer);
    const spans = words.map((w) => { const s = document.createElement("span"); s.textContent = w; Object.assign(s.style, { position: "absolute", left: "0", top: "0", whiteSpace: "pre", transformOrigin: "0 0", display: "inline-block" }); layer.append(s); return s; });

    // the layout of every state, measured for real
    const meas = document.createElement("div");
    const align = cs.textAlign === "start" ? (rtl ? "right" : "left") : cs.textAlign === "end" ? (rtl ? "left" : "right") : cs.textAlign;
    Object.assign(meas.style, { position: "absolute", left: "0", top: "0", width: box.w + "px", visibility: "hidden", textAlign: align, font: "inherit", letterSpacing: "inherit", textTransform: "inherit", textWrap: "balance" });
    meas.setAttribute("dir", rtl ? "rtl" : "ltr");
    layer.append(meas);
    const states = [];
    for (let k = 0; k < n; k++) {
      let s = scaleAt(k);
      meas.style.fontSize = (baseFs * s).toFixed(2) + "px";
      meas.textContent = "";
      const ms = words.slice(0, k + 1).map((w, i) => { const x = document.createElement("span"); x.textContent = w; x.style.display = "inline-block"; if (i) meas.append(" "); meas.append(x); return x; });
      // a word too long for the box at this state's size: the state comes down until it fits
      const widest = Math.max(...ms.map((x) => x.offsetWidth));
      if (widest > box.w) { s *= box.w / widest; meas.style.fontSize = (baseFs * s).toFixed(2) + "px"; }
      const H = meas.offsetHeight, dy = (box.h - H) / 2; // each state centred on the target's box
      states.push(ms.map((x) => ({ x: x.offsetLeft, y: x.offsetTop + dy, s })));
    }
    meas.remove();

    // the times: one state per spoken word (or per beat)
    const beat = Math.max(0.18, Math.min(0.55, ((end - at) * 0.75) / n));
    const room = Math.max(0.04, Math.min(0.12, ((end - at) * 0.8) / n)); // always a beat between words, inside the run
    const times = words.map((w, i) => (i === 0 ? at : p.cadence === "word-timings" ? Math.max(at, ctx.word(w, at + i * beat)) : at + i * beat));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + room);
    for (let i = n - 1; i >= 0; i--) times[i] = Math.max(at, Math.min(times[i], end - 0.5 - (n - 1 - i) * room));
    times.forEach((t, i) => ctx.sfx(t, i === n - 1 ? "land.light" : "tap", i === n - 1 ? 0.35 : 0.2));
    // the entry offset: off the frame on the chosen side (sides mirror in RTL)
    const side = p.entry_from === "below" ? 0 : (p.entry_from === "right" ? 1 : -1) * (rtl ? -1 : 1);
    const offX = side > 0 ? f.W - box.x + 20 : side < 0 ? -(box.x + box.w + 20) : 0, offY = side === 0 ? f.H - box.y + 20 : 0;

    return {
      draw(t) {
        const on = t >= at;
        layer.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.filter = leave > 0 ? `blur(${(leave * 12).toFixed(2)}px)` : "none";
        // the current state and how far into its reflow
        let k = 0; for (let i = 0; i < n; i++) if (t >= times[i]) k = i;
        const u = ML.expo(t, times[k], times[k] + p.flip);
        spans.forEach((s, i) => {
          if (i > k) { s.style.visibility = "hidden"; return; }
          s.style.visibility = "visible";
          const to = states[k][i];
          let x, y, sc, b = 0;
          if (i === k) {
            // the new word: from off the frame into its slot, blurring in
            const e = ML.expo(t, times[k], times[k] + p.flip * 1.6);
            x = to.x + offX * (1 - e); y = to.y + offY * (1 - e); sc = to.s; b = (1 - e) * p.blur;
          } else {
            const fr = states[k - 1][i];
            x = fr.x + (to.x - fr.x) * u; y = fr.y + (to.y - fr.y) * u; sc = fr.s + (to.s - fr.s) * u;
          }
          s.style.transform = `translate(${x.toFixed(2)}px, ${(y - leave * 16).toFixed(2)}px) scale(${Math.min(1, sc).toFixed(4)})`;
          s.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
