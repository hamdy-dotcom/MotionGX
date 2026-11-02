// Slice glitch: the text is copied into 3–10 horizontal bands (clip-path insets cut at seeded heights). Every second
// 30 fps frame (15 states a second, stepped, never eased) the bands are re-cut and some of them jump sideways
// ±offset px, while two channel copies (--x-bad and --x-accent-2) sit ±channel px opposite each other behind them and
// 1–2 hairline scan lines (--x-good / --x-bad) flash at seeded heights. Every "random" value is ML.rnd(frame, band),
// so each frame is a pure function of t. Modes: hit (0.2–0.6 s, ends on a clean frame — optionally recoloured to the
// accent), exit (bands jitter while the opacity decays over ≥0.3 s, then gone), enter (the reverse), swap (3–4 frames
// in which the string turns into `word`, the colour switches to the accent and a 30 % ghost 20 px along the reading
// direction fades out — 0.25 s in all). Arabic words are never split: a band clips whole shaped text.
// Source: prompt-motion:tolgayhickiran-motion-graphics-from-a + ceowinkz-wtf-ai-just-made + adamdesgns-wtf-made-with-single
// (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.slice-glitch",
  category: "text-emphasis",
  name: "Headline breaks into glitch slices",
  does: "The headline tears into horizontal slices that jump sideways with colour fringes for a few frames, then snaps back clean, leaves, or re-forms as a new word.",
  says: ["energy", "tech", "change", "problem"],
  energy: 5,
  targets: ["headline", "word", "line", "logo"],
  duration: [0.3, 1.2],
  params: {
    mode: { type: "choice", options: ["hit", "exit", "enter", "swap"], default: "hit" },
    bands: { type: "number", range: [3, 10], default: 6 },
    offset: { type: "number", range: [10, 40], default: 24, unit: "px" },
    channel: { type: "number", range: [0, 8], default: 6, unit: "px" },
    duration: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    scanlines: { type: "bool", default: true },
    recolour: { type: "bool", default: false },
    word: { type: "text", default: "" },
  },
  pairs: ["text-in.glitch-in", "transition.glitch-bar-wipe"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:tolgayhickiran-motion-graphics-from-a", license: "reference", note: "our own rebuild; also ceowinkz-wtf-ai-just-made, adamdesgns-wtf-made-with-single" },
  setup(ctx) {
    const { el, p, at, rtl } = ctx;
    if (!el) return null;
    const isSvg = el instanceof SVGElement;
    // the core: everything the target holds, in one inline box the layers can cover exactly
    let core, box;
    if (isSvg) core = box = el;
    else {
      box = document.createElement("span");
      Object.assign(box.style, { display: "inline-block", position: "relative", maxWidth: "100%" });
      core = document.createElement("span");
      while (el.firstChild) core.append(el.firstChild);
      box.append(core);
      el.append(box);
    }
    const oldHTML = isSvg ? "" : core.innerHTML;
    const newText = String(p.word || "").trim();
    const fs = isSvg ? el.getBoundingClientRect().height : parseFloat(getComputedStyle(el).fontSize) || 100;
    const k = Math.max(0.5, Math.min(2.5, fs / 104)); // px params read at a 104 px headline
    const N = Math.round(ML.clamp(p.bands, 3, 10)), dir = rtl ? -1 : 1;
    // an SVG logo has no text to copy: its layers are the SVG itself, re-cut on a wrapper
    const host = isSvg ? el.parentElement : box;
    if (isSvg) { host.style.position = host.style.position || "relative"; }
    const layer = (html, col, z) => {
      const d = document.createElement(isSvg ? "div" : "span");
      d.setAttribute("aria-hidden", "true");
      Object.assign(d.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", whiteSpace: "inherit", textAlign: "inherit", pointerEvents: "none", opacity: "0", zIndex: String(z) });
      if (isSvg) { const b = ctx.box(el), hb = ctx.box(host); Object.assign(d.style, { left: (b.x - hb.x).toFixed(1) + "px", top: (b.y - hb.y).toFixed(1) + "px", width: b.w.toFixed(1) + "px", height: b.h.toFixed(1) + "px" }); const c = el.cloneNode(true); c.removeAttribute("data-slot"); c.style.width = "100%"; c.style.height = "100%"; d.append(c); if (col) d.style.filter = `drop-shadow(0 0 0 ${col})`; }
      else { d.innerHTML = html; if (col) d.style.color = col; }
      host.append(d);
      return d;
    };
    const bands = Array.from({ length: N }, () => layer(oldHTML, "", 3));
    const red = layer(oldHTML, "var(--x-bad)", 1), cyan = layer(oldHTML, "var(--x-accent-2)", 2);
    const ghost = layer(newText || oldHTML, "var(--x-accent)", 0);
    const scans = [0, 1].map(() => {
      const s = document.createElement("span");
      Object.assign(s.style, { position: "absolute", left: "-12%", width: "124%", height: Math.max(1, k).toFixed(1) + "px", pointerEvents: "none", opacity: "0", zIndex: "4" });
      host.append(s);
      return s;
    });
    const setText = (html) => { if (isSvg) return; for (const b of [...bands, red, cyan]) b.innerHTML = html; };
    const H = () => (isSvg ? ctx.box(el).h : box.offsetHeight) || fs;
    const D = p.mode === "swap" ? 0.25 : p.mode === "exit" ? Math.max(0.3, p.duration) : p.duration;
    const t0 = at, t1 = at + D;
    ctx.sfx(t0, "hit", 0.45);
    if (p.mode === "swap") ctx.sfx(t0 + 0.12, "blip", 0.3);
    // one glitch state: band cuts, which bands jump and how far, channel split, scan lines — stepped every 2 frames
    const frame = (t) => Math.floor((t - t0) * 15);
    const paint = (f, amount, opacity) => {
      const h = H();
      const cuts = [0];
      for (let i = 1; i < N; i++) cuts.push(((i + (ML.rnd(f * 7 + i, 3) - 0.5) * 0.8) / N) * h);
      cuts.push(h);
      bands.forEach((b, i) => {
        const top = cuts[i], bot = cuts[i + 1];
        const jump = ML.rnd(f * 13 + i, 5) < 0.55 ? (ML.rnd(f * 3 + i * 11, 9) < 0.5 ? -1 : 1) * (0.4 + 0.6 * ML.rnd(f + i * 5, 7)) * p.offset * k * amount : 0;
        b.style.clipPath = `inset(${top.toFixed(1)}px -30% ${Math.max(0, h - bot).toFixed(1)}px -30%)`;
        b.style.translate = jump ? `${jump.toFixed(1)}px 0` : "none";
        b.style.opacity = (opacity * (ML.rnd(f * 17 + i, 2) < 0.12 * amount ? 0.4 : 1)).toFixed(3);
      });
      const ch = p.channel * k * (0.65 + 0.35 * ML.rnd(f, 21)) * amount;
      const on = p.channel > 0 && amount > 0.02;
      red.style.opacity = on ? (0.75 * opacity).toFixed(3) : "0";
      cyan.style.opacity = on ? (0.75 * opacity).toFixed(3) : "0";
      red.style.translate = `${(ch * dir).toFixed(1)}px 0`;
      cyan.style.translate = `${(-ch * dir).toFixed(1)}px 0`;
      const cy = ML.rnd(f, 31) * h * 0.6;
      red.style.clipPath = cyan.style.clipPath = `inset(${cy.toFixed(1)}px -30% ${Math.max(0, h - cy - h * (0.25 + 0.4 * ML.rnd(f, 33))).toFixed(1)}px -30%)`;
      scans.forEach((s, i) => {
        const show = p.scanlines && amount > 0.02 && (i === 0 || ML.rnd(f, 41) < 0.5);
        s.style.opacity = show ? (0.9 * opacity).toFixed(3) : "0";
        s.style.top = (ML.rnd(f * 5 + i, 43) * h).toFixed(1) + "px";
        s.style.background = i ? "var(--x-bad)" : "var(--x-good)";
      });
    };
    const clean = (opacity) => {
      for (const b of [...bands, red, cyan, ...scans]) { b.style.opacity = "0"; b.style.translate = "none"; }
      core.style.opacity = opacity.toFixed(4);
    };
    return {
      draw(t) {
        const swapped = p.mode === "swap" && t >= t0 + 0.12;
        // the string and colour of this frame (a function of t: set every frame)
        if (p.mode === "swap") {
          const html = swapped && newText ? newText : oldHTML;
          if (!isSvg && core.dataset.mlNow !== String(swapped)) { core.innerHTML = html; setText(html); core.dataset.mlNow = String(swapped); }
          core.style.color = swapped ? "var(--x-accent)" : "";
          for (const b of bands) b.style.color = swapped ? "var(--x-accent)" : "";
          const g = ML.lin(t, t0 + 0.12, t1);
          ghost.style.opacity = swapped && t < t1 ? (0.3 * (1 - g)).toFixed(3) : "0";
          ghost.style.translate = `${(20 * k * dir).toFixed(1)}px 0`;
        } else {
          const rec = p.recolour && p.mode !== "exit" && t >= t1;
          core.style.color = rec ? "var(--x-accent)" : "";
        }
        if (p.mode === "enter" && t < t0) { clean(0); return; }
        if (p.mode === "exit" && t >= t1) { clean(0); return; }
        if (t < t0 || t >= t1) { clean(1); return; }
        const u = (t - t0) / D, f = frame(t);
        let amount = 1, opacity = 1;
        if (p.mode === "exit") { opacity = Math.max(0, 1 - Math.floor(u * 9) / 9); amount = 0.6 + 0.4 * u; }
        if (p.mode === "enter") { opacity = Math.min(1, 0.2 + Math.floor(u * 9) / 9); amount = 1 - 0.4 * u; }
        // the last state before the end is already clean in hit mode: it lands on a clean frame
        if (p.mode === "hit" && t >= t1 - 1 / 15) { clean(1); return; }
        core.style.opacity = "0";
        paint(f, amount, opacity);
      },
    };
  },
});
