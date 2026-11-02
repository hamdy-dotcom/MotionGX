// Word card cuts: one huge word per full-frame card, hard-cut to the next on the beat — from a frame-fast montage
// (0.12–0.25 s holds, 4–8 frames at 30 fps) to half-second category flips — ending on a held card. Heavy caps in the
// head face, cap height about a fifth of the frame (fitted to the width), centred. The colourway cycles per card: ink
// on ground, accent on ground, ink on a full accent field with a radial vignette (transparent 40% → 35% shade), and an
// inverted ink field with ground text; the first frame of an inverted card is a lighter tint flash. Optional 1.04 → 1
// settle over 0.12 s, a prompt chip at the top ("> …"), a mono page counter ("02/05") and sub-label at the foot.
// Cuts land on the spoken words when the voice says them inside the run, else on the hold. Arabic: one word per card.
// Source: prompt-motion majin-appsheet-claude-code-opus-5-5-pv-ai, 0xfemyn-wtf-nah-opus-5-5, emollick-how-do-you-explain
// (reference only — our own rebuild).
ML.define({
  id: "kinetic.word-card-cuts",
  category: "kinetic",
  name: "Word card cuts",
  does: "One huge word per card hard-cuts to the next on the beat, the background flipping colour per card, from a frame-fast montage to half-second category flips.",
  says: ["energy", "urgency", "list", "brand", "choice"],
  energy: 5,
  targets: ["word", "headline", "scene"],
  duration: [1, 4],
  params: {
    hold: { type: "number", range: [0.12, 0.6], default: 0.25, unit: "s" },
    palette: { type: "choice", options: ["plain", "accent-text", "inverted-field", "cycle"], default: "cycle" },
    counter: { type: "bool", default: false },
    chip: { type: "bool", default: false },
    settle: { type: "bool", default: false },
    case: { type: "choice", options: ["upper", "as-is"], default: "upper" },
    sync: { type: "choice", options: ["spoken", "hold"], default: "spoken" },
  },
  pairs: ["kinetic.verb-acts-out", "rhythm.beat-pulse"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:majin-appsheet-claude-code-opus-5-5-pv-ai", license: "reference", note: "also 0xfemyn-wtf-nah-opus-5-5 and emollick-how-do-you-explain; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const f = ctx.f, W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const isStage = !el || el === ctx.stage || el === ctx.scene;
    const textOf = (n) => (n && n.textContent ? n.textContent.replace(/\s+/g, " ").trim() : "");
    const src = isStage ? textOf(host.querySelector(".ml-title")) || (ctx.words || []).map((w) => w.w).join(" ") : textOf(el);
    const words = src.split(" ").map((w) => w.replace(/[.,،؛!?…:]+$/u, "")).filter(Boolean).slice(0, 6);
    if (!words.length) return null;
    const n = words.length;
    // ── the cut times ──
    let times = words.map((_, i) => at + i * p.hold);
    if (p.sync === "spoken") {
      const said = words.map((w, i) => ctx.word(w, NaN, words.slice(0, i).filter((x) => ML.plain(x) === ML.plain(w)).length + 1));
      if (said.every((x, i) => Number.isFinite(x) && x >= at && x < end - 0.3 && (i === 0 || x > said[i - 1]))) times = said;
    }
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.12);
    times.forEach((t, i) => { if (p.hold >= 0.3 || i % 2 === 0 || i === n - 1) ctx.sfx(t, "snap", i === n - 1 ? 0.4 : 0.25); });
    // ── colourways: [field, ink, vignette, inverted] ──
    const WAYS = {
      plain: [["var(--x-ground)", "var(--x-ink)", false, false]],
      "accent-text": [["var(--x-ground)", "var(--x-accent)", false, false]],
      "inverted-field": [["var(--x-accent)", "var(--x-ink)", true, true]],
      cycle: [["var(--x-ground)", "var(--x-ink)", false, false], ["var(--x-ground)", "var(--x-accent)", false, false], ["var(--x-accent)", "var(--x-ink)", true, true], ["var(--x-ink)", "var(--x-ground)", false, true]],
    }[p.palette] || [["var(--x-ground)", "var(--x-ink)", false, false]];
    // ── the layer ──
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", overflow: "hidden", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" });
    const vignette = doc.createElement("div");
    Object.assign(vignette.style, { position: "absolute", inset: "0", background: "radial-gradient(closest-side, transparent 40%, color-mix(in srgb, var(--x-ink) 35%, transparent))" });
    const word = doc.createElement("div");
    Object.assign(word.style, { position: "relative", font: `700 ${(H * 0.2 / 0.72).toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "-0.025em", textTransform: p.case === "upper" && !rtl ? "uppercase" : "none", whiteSpace: "nowrap", textAlign: "center", direction: rtl ? "rtl" : "ltr" });
    layer.append(vignette, word);
    host.append(layer);
    // one fitted size per word (the cap height stays put unless the word is too wide)
    const base = (Math.min(H * 0.2, W * 0.24) / 0.72);
    const sizes = words.map((w) => { word.style.fontSize = base + "px"; word.textContent = w; const ww = word.offsetWidth; return ww > W * 0.86 ? (base * W * 0.86) / ww : base; });
    // chrome
    const mono = `500 ${(22 * k).toFixed(1)}px var(--x-mono-font)`;
    let chip = null, counter = null, sub = null;
    if (p.chip) {
      chip = doc.createElement("div");
      const head = textOf(host.querySelector(".ml-title")) || "";
      chip.textContent = "> " + (head && head !== src ? head : words[0]);
      Object.assign(chip.style, { position: "absolute", top: (f.safe.y * 0.7).toFixed(1) + "px", left: "50%", translate: "-50% 0", font: mono, padding: `${10 * k}px ${20 * k}px`, borderRadius: "var(--x-radius-s)", border: "1px solid currentColor", whiteSpace: "nowrap", opacity: "0.8", direction: rtl ? "rtl" : "ltr" });
      layer.append(chip);
    }
    if (p.counter) {
      counter = doc.createElement("div");
      Object.assign(counter.style, { position: "absolute", bottom: (f.safe.y * 0.6).toFixed(1) + "px", [rtl ? "left" : "right"]: f.m + "px", font: mono, letterSpacing: "0.1em", opacity: "0.75", direction: "ltr" });
      sub = doc.createElement("div");
      sub.textContent = textOf(host.querySelector("[data-slot='label'], [data-slot-sample='label']")) || "";
      Object.assign(sub.style, { position: "absolute", bottom: (f.safe.y * 0.6).toFixed(1) + "px", [rtl ? "right" : "left"]: f.m + "px", font: mono, letterSpacing: rtl ? "0" : "0.14em", textTransform: rtl ? "none" : "uppercase", opacity: "0.6" });
      layer.append(counter, sub);
    }
    const hideSource = !isStage;
    const pad = (x) => String(x).padStart(2, "0");
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (hideSource) el.style.opacity = on ? "0" : "";
        if (!on) return;
        let i = 0;
        for (let j = 0; j < n; j++) if (t >= times[j]) i = j;
        const [fieldC, inkC, vig, inv] = WAYS[i % WAYS.length];
        const flash = inv && t - times[i] < 1 / 30;
        layer.style.background = flash ? `color-mix(in srgb, ${fieldC} 55%, var(--x-panel))` : fieldC;
        layer.style.color = inkC;
        vignette.style.opacity = vig ? "1" : "0";
        if (word.textContent !== words[i]) word.textContent = words[i];
        word.style.fontSize = sizes[i].toFixed(2) + "px";
        const s = p.settle ? 1.04 - 0.04 * ML.out(t, times[i], times[i] + 0.12) : 1;
        word.style.scale = s === 1 ? "none" : s.toFixed(4);
        if (counter) counter.textContent = pad(i + 1) + "/" + pad(n);
      },
    };
  },
});
