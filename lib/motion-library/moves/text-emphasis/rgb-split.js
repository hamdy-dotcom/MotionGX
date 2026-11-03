// RGB split: the target carries copies of itself in two channel colours (the look's --x-bad and --x-accent-2, with a
// --x-dim ghost in the settle) behind its crisp base, blended screen on a dark ground and multiply on a light one.
//  · impact: base scale 1.12 → 1 in 0.35 s expo.out; fringes start ±offset px x / ±1 px y and converge to ~1 px in
//    0.3 s, then close up over 0.5 s so the word holds crisp (hold-jitter is the one that stays split); optional flash (a panel-coloured veil 25 % → 0 in 0.15 s) and a 3 px rattle for 4 frames.
//  · stamp-sequence: one word at a time, heavy caps with −3 / +3 px channel shadows, each popping 1.08 → 1 over
//    0.12 s with a 1-frame flicker, holding `per-word` s, hard-cutting to the next; the whole line lands last.
//  · ghost-settle: every line drawn 3–4 times, each copy and line seeded its own ±8–20 px x / ±3 px y offset, decaying
//    to 0 in 0.4 s (steps(6) when settle is stepped).
//  · hold-jitter: fringes sit at a third of the offset and jitter ±2 px every 30 fps frame from a frame-seeded value.
// direction out plays it in reverse (converged → split → gone). field puts a ground behind the scene: the look's own,
// a paper (--x-panel-2 with an ink vignette), or an ink band behind the target (its text turns to the ground colour).
// Source: prompt-motion:grace-sunnyy-opus5-5-15 + apoorvjain25-i-gave-claude-opus + majin-appsheet-claude-code-opus-5-5-pv-ai
// + adamdesgns-wtf-made-with-single (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.rgb-split",
  category: "text-emphasis",
  name: "RGB channel split on a word",
  does: "A word or giant glyph carries two colour-channel fringes that jitter and converge into one crisp image, as an impact, a beat-by-beat stamp, a settling ghost stack or a held jitter.",
  says: ["energy", "tech", "change", "urgency", "problem", "result"],
  energy: 4,
  targets: ["word", "headline", "line", "logo"],
  duration: [0.3, 3],
  params: {
    mode: { type: "choice", options: ["impact", "stamp-sequence", "ghost-settle", "hold-jitter"], default: "impact" },
    offset: { type: "number", range: [2, 20], default: 8, unit: "px" },
    settle: { type: "choice", options: ["smooth", "stepped"], default: "smooth" },
    flash: { type: "bool", default: false },
    shake: { type: "bool", default: false },
    field: { type: "choice", options: ["look", "cream", "black"], default: "look" },
    direction: { type: "choice", options: ["in", "out"], default: "in" },
    "per-word": { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
  },
  pairs: ["text-emphasis.slice-glitch", "rhythm.beat-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:grace-sunnyy-opus5-5-15", license: "reference", note: "our own rebuild; also apoorvjain25-i-gave-claude-opus, majin-appsheet-claude-code-opus-5-5-pv-ai, adamdesgns-wtf-made-with-single" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const isSvg = el instanceof SVGElement;
    const host = ctx.scene || ctx.stage;
    // the field behind the scene
    if (p.field !== "look") {
      const f = document.createElement("div");
      f.setAttribute("aria-hidden", "true");
      Object.assign(f.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "-1" });
      if (p.field === "cream") f.style.background = "radial-gradient(ellipse at 50% 45%, transparent 35%, color-mix(in srgb, var(--x-ink) 45%, transparent) 100%), var(--x-panel-2)";
      else {
        // black: an ink band across the frame behind the target only, so the rest of the scene keeps its contrast
        const b = ctx.box(el), pad = Math.max(12, b.h * 0.12);
        Object.assign(f.style, { inset: "auto", left: "0", right: "0", top: (b.y - pad).toFixed(1) + "px", height: (b.h + pad * 2).toFixed(1) + "px", background: "var(--x-ink)" });
      }
      host.style.isolation = "isolate";
      host.prepend(f);
      if (p.field === "black") el.style.color = "var(--x-ground)";
    }
    // dark or light ground → screen or multiply
    const bg = getComputedStyle(ctx.stage).backgroundColor.match(/[\d.]+/g) || [255, 255, 255];
    let dark = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2] < 128;
    if (p.field === "black") { const ink = getComputedStyle(ctx.stage).color.match(/[\d.]+/g) || [0, 0, 0]; dark = 0.299 * ink[0] + 0.587 * ink[1] + 0.114 * ink[2] < 128; }
    if (p.field === "cream") dark = false;
    const fs = isSvg ? el.getBoundingClientRect().height : parseFloat(getComputedStyle(el).fontSize) || 56;
    const k = Math.max(0.4, Math.min(2.5, fs / 70));
    // base + copies: the target's content in one box the copies cover exactly
    let wrap, core;
    if (isSvg) {
      wrap = el.parentElement; core = el;
      if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
      // the crisp logo stays on top of its fringes, or their blend would stain it for good
      core.style.position = "relative"; core.style.zIndex = "2";
    }
    else {
      wrap = document.createElement("span");
      Object.assign(wrap.style, { display: "inline-block", position: "relative", maxWidth: "100%", isolation: "isolate" });
      core = document.createElement("span");
      Object.assign(core.style, { display: "inline-block", position: "relative", zIndex: "2" });
      while (el.firstChild) core.append(el.firstChild);
      wrap.append(core); el.append(wrap);
      ML.split(core, "words");
    }
    const copy = (col, z) => {
      const d = document.createElement(isSvg ? "div" : "span");
      d.setAttribute("aria-hidden", "true");
      Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: String(z), mixBlendMode: dark ? "screen" : "multiply", opacity: "0", textAlign: "inherit" });
      if (isSvg) {
        const b = ctx.box(el), hb = ctx.box(wrap);
        Object.assign(d.style, { left: (b.x - hb.x).toFixed(1) + "px", top: (b.y - hb.y).toFixed(1) + "px", width: b.w.toFixed(1) + "px", height: b.h.toFixed(1) + "px" });
        const c = el.cloneNode(true); c.removeAttribute("data-slot"); c.style.position = "static"; c.setAttribute("fill", col); c.style.width = "100%"; c.style.height = "100%"; c.querySelectorAll("*").forEach((n) => { if (n.getAttribute("fill") && n.getAttribute("fill") !== "none") n.setAttribute("fill", col); });
        d.append(c);
      } else { d.innerHTML = core.innerHTML; d.style.color = col; }
      wrap.append(d);
      return d;
    };
    const red = copy("var(--x-bad)", 1), cyan = copy("var(--x-accent-2)", 1), grey = copy("var(--x-dim)", 0);
    const copies = [red, cyan, grey];
    // lines (ghost-settle): word spans grouped by their row
    const lineOf = [];
    if (!isSvg) {
      const ws = [...core.querySelectorAll(".ml-w")];
      const tops = [...new Set(ws.map((w) => Math.round(w.offsetTop / 4)))];
      ws.forEach((w, i) => (lineOf[i] = tops.indexOf(Math.round(w.offsetTop / 4))));
    }
    const words = isSvg ? [] : [...core.querySelectorAll(".ml-w")];
    const copyWords = copies.map((c) => (isSvg ? [] : [...c.querySelectorAll(".ml-w")]));
    // the stamp (stamp-sequence)
    const stamp = document.createElement("span");
    stamp.setAttribute("aria-hidden", "true");
    Object.assign(stamp.style, { position: "absolute", left: "50%", top: "50%", whiteSpace: "nowrap", fontFamily: "var(--x-head-font)", fontWeight: "800", textTransform: "uppercase", fontSize: "1.15em", zIndex: "3", opacity: "0", pointerEvents: "none" });
    if (!isSvg) wrap.append(stamp);
    const flash = document.createElement("div");
    flash.setAttribute("aria-hidden", "true");
    Object.assign(flash.style, { position: "absolute", inset: "0", background: "var(--x-panel)", pointerEvents: "none", zIndex: "20", opacity: "0" });
    if (p.flash) host.append(flash);
    const O = ML.clamp(p.offset, 2, 20) * k, out = p.direction === "out";
    const stepped = p.settle === "stepped";
    const settleCurve = (t, a, b, ease) => { let x = ML.lin(t, a, b); if (stepped) x = Math.floor(x * 6) / 6; return ease(x); };
    const expoE = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), pw = (x) => 1 - Math.pow(1 - x, 3);
    const texts = words.map((w) => w.textContent);
    const per = ML.clamp(p["per-word"], 0.3, 0.6);
    const seqEnd = p.mode === "stamp-sequence" ? at + texts.length * per : at;
    const impactAt = p.mode === "stamp-sequence" ? seqEnd : at;
    // sound: one per beat
    if (p.mode === "stamp-sequence") texts.forEach((_, i) => ctx.sfx(at + i * per, "tap", 0.3));
    if (p.mode === "hold-jitter") ctx.sfx(at, "blip", 0.3);
    else ctx.sfx(impactAt, p.mode === "ghost-settle" ? "whoosh.soft" : "hit", 0.5);
    const setFringe = (dx, dy, o) => {
      red.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
      cyan.style.translate = `${(-dx).toFixed(2)}px ${(-dy).toFixed(2)}px`;
      red.style.opacity = cyan.style.opacity = o.toFixed(4);
    };
    const shakeAt = (t, a) => {
      const f = Math.floor((t - a) * 30);
      wrap.style.translate = p.shake && t >= a && f < 4 ? `${((ML.rnd(f, 3) - 0.5) * 6).toFixed(2)}px ${((ML.rnd(f, 7) - 0.5) * 6).toFixed(2)}px` : "none";
    };
    const flashAt = (t, a) => { if (p.flash) flash.style.opacity = t >= a ? (0.25 * (1 - ML.lin(t, a, a + 0.15))).toFixed(4) : "0"; };
    return {
      draw(t) {
        // reset what each mode may set
        grey.style.opacity = "0";
        stamp.style.opacity = "0";
        core.style.opacity = "1";
        core.style.scale = "none";
        // shake and flash come back to rest on every frame, whichever way the film was seeked
        if (p.shake) wrap.style.translate = "none";
        if (p.flash) flash.style.opacity = "0";
        if (p.mode === "stamp-sequence" && t < seqEnd) {
          setFringe(0, 0, 0);
          core.style.opacity = "0";
          if (t < at) { stamp.style.opacity = "0"; return; }
          const i = Math.min(texts.length - 1, Math.floor((t - at) / per)), s = at + i * per;
          if (stamp.dataset.i !== String(i)) { stamp.textContent = texts[i]; stamp.dataset.i = String(i); }
          const f = Math.floor((t - s) * 30);
          const pop = 1.08 - 0.08 * pw(ML.lin(t, s, s + 0.12));
          stamp.style.opacity = f === 1 ? "0.35" : "1";
          stamp.style.transform = `translate(-50%, -50%) scale(${pop.toFixed(4)})`;
          const sh = 3 * k;
          stamp.style.textShadow = `${-sh}px 0 var(--x-accent-2), ${sh}px 0 var(--x-bad)`;
          shakeAt(t, s);
          flashAt(t, s);
          return;
        }
        if (p.mode === "hold-jitter") {
          const on = out ? 1 - ML.lin(t, end - 0.3, end) : ML.lin(t, at, at + 0.12);
          const f = Math.floor(t * 30);
          const jx = (ML.rnd(f, 11) * 2 - 1) * 2 * k, jy = (ML.rnd(f, 13) * 2 - 1) * k;
          setFringe(t >= at ? O / 3 + jx : 0, t >= at ? jy : 0, t >= at ? 0.85 * on : 0);
          if (out) core.style.opacity = (1 - ML.lin(t, end - 0.2, end)).toFixed(4);
          return;
        }
        if (p.mode === "ghost-settle") {
          const a = impactAt, D = 0.4;
          let u = settleCurve(t, a, a + D, pw);
          if (out) u = 1 - u;
          const vis = out ? 1 - ML.lin(t, a + D - 0.1, a + D) : ML.lin(t, a, a + 0.08);
          const amt = 1 - u;
          [red, cyan, grey].forEach((c, ci) => {
            c.style.opacity = (vis * (amt > 0.01 ? (ci === 2 ? 0.5 : 0.85) : 0)).toFixed(4);
            c.style.translate = "none";
            copyWords[ci].forEach((w, wi) => {
              const L = lineOf[wi] || 0, sg = ML.rnd(L * 7 + ci, 3) < 0.5 ? -1 : 1;
              const dx = sg * (8 + 12 * ML.rnd(L * 13 + ci, 5)) * k * amt, dy = (ML.rnd(L * 17 + ci, 9) * 2 - 1) * 3 * k * amt;
              w.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
            });
          });
          core.style.opacity = vis.toFixed(4);
          if (!out) words.forEach((w, wi) => { const L = lineOf[wi] || 0; w.style.translate = `${((ML.rnd(L * 19, 21) * 2 - 1) * 4 * k * amt).toFixed(2)}px 0`; });
          shakeAt(t, a); flashAt(t, a);
          return;
        }
        // impact (and the landing of a stamp sequence)
        const a = impactAt;
        if (t < a && !out) { setFringe(0, 0, 0); return; }
        let s = settleCurve(t, a, a + 0.35, expoE), c = settleCurve(t, a, a + 0.3, pw);
        if (out) { s = 1 - s; c = 1 - c; }
        const amt = 1 - c;
        core.style.scale = (1 + 0.12 * (1 - s)).toFixed(4);
        core.style.opacity = out ? (1 - ML.lin(t, a + 0.25, a + 0.35)).toFixed(4) : "1";
        const res = k * (out ? 1 : 1 - ML.lin(t, a + 0.3, a + 0.8));
        const o = out ? 1 - ML.lin(t, a + 0.25, a + 0.35) : 0.85;
        setFringe(O * amt + res, k * amt, o);
        red.style.scale = cyan.style.scale = core.style.scale;
        shakeAt(t, a); flashAt(t, a);
      },
    };
  },
});
