// One word at a time, centre: big single words replace each other in the middle of the frame, each landing on its
// spoken word (or on a steady beat), then the sequence hands over to the real line, which rises word by word.
// Each word is its own absolutely centred title in the head face at weight 800, 120–180 px on a 1080 stage (fitted
// to the width), one visible at a time; colours alternate accent / ink, or one colour. Entry "blur-zoom" (ours, from
// the studio hook): from word time − 0.1 s, opacity 0 → 1, scale 1.35 → 1, blur 16 → 0 px over 0.35 s power3.out;
// "snap": scale 1.15 → 1 with opacity in 0.12 s. Exit "fade-shrink": 0.15 s before the next word, opacity → 0 and
// scale → 0.9 over 0.25 s; "cut": hard cut as the next word starts. The words play on a cleared stage, the look's ground
// over the scene as in the source's words-only hook, until the hand-over (clear_stage off: over the scene as it is).
// Chrome: a soft lighter radial centre always; an optional
// mono index ("01") above the reading-start letter; an accent underline (6 × 30 px bar under the first letter — the
// rightmost in Arabic — or the whole word) growing scaleX 0 → 1 in 0.12 s and repositioning per word; an optional
// glow (soft outer glow + drop shadow); an optional index label under the word ("02 / 05", mono, wide tracking, 50 %)
// fading in 0.2 s after the slam, with a thin frame-high circle behind slowly turning and growing 1 → 1.03. A heavy
// soft hit per word. Arabic: whole words, no tracking; the underline sits under the reading start (the right).
// Source: MotionGX studio engine lib/studio-engine/assets/scenes.js S.hook (s.data.words) — own; prompt-motion
// shinskinakamoto-claude-opus-5-5-is, sab8a-opus-5-5-openedit-prompt, maxalexweber-i-made-this-with (reference).
ML.define({
  id: "kinetic.center-word-sequence",
  category: "kinetic",
  name: "One word at a time, centre",
  does: "Big single words replace each other in the centre of the frame, each landing on its spoken word.",
  says: ["energy", "list", "arrival", "story", "brand"],
  energy: 4,
  targets: ["word", "headline", "label"],
  duration: [1, 5],
  params: {
    entry: { type: "choice", options: ["blur-zoom", "snap"], default: "blur-zoom" },
    exit: { type: "choice", options: ["fade-shrink", "cut"], default: "fade-shrink" },
    scale_from: { type: "number", range: [1.1, 1.5], default: 1.35 },
    size: { type: "number", range: [120, 180], default: 150, unit: "px" },
    colours: { type: "choice", options: ["alternate", "single"], default: "alternate" },
    index: { type: "bool", default: false },
    underline: { type: "choice", options: ["none", "first-letter", "word"], default: "none" },
    cadence: { type: "choice", options: ["word-timings", "beat"], default: "word-timings" },
    glow: { type: "bool", default: false },
    index_label: { type: "bool", default: false },
    clear_stage: { type: "bool", default: true },
    words: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "transition.flash-cut", "kinetic.caption-word-build"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.hook season words; chrome and snap variants rebuilt from prompt-motion shinskinakamoto-claude-opus-5-5-is, sab8a-opus-5-5-openedit-prompt, maxalexweber-i-made-this-with (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const k = Math.min(f.W, f.H) / 1080;
    const textOf = (n) => (n && n.textContent ? n.textContent.replace(/\s+/g, " ").trim() : "");
    // the words: the `words` param (comma or space separated), else the slot's own words
    const own = el && el !== ctx.stage ? textOf(el) : textOf(host.querySelector(".ml-title"));
    const list = (String(p.words || "").trim() ? String(p.words).split(/\s*,\s*|\s+/) : own.split(" ")).map((w) => w.replace(/[.,،؛!?؟…:]+$/u, "")).filter(Boolean).slice(0, 8);
    if (!list.length) return null;
    const n = list.length;
    // the hand-over: the real line rises at the end (S.hook: vo end − 0.8), the sequence fits before it
    const handOver = el && el !== ctx.stage ? Math.max(at + 0.6, end - 0.8) : end;
    const room = Math.max(0.3, handOver - at);
    let times;
    if (p.cadence === "beat") times = list.map((_, i) => at + 0.1 + i * Math.min(0.4, (room - 0.3) / n));
    else times = list.map((w, i) => { const fb = at + 0.1 + ((i + 0.5) / (n + 1)) * room; const x = ctx.word(w, fb, list.slice(0, i).filter((y) => ML.plain(y) === ML.plain(w)).length + 1); return x >= at && x < handOver ? x : fb; });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.18);
    const snap = p.entry === "snap";
    const starts = times.map((t) => (snap ? t : t - 0.1));
    const ends = times.map((_, i) => (i + 1 < n ? times[i + 1] : handOver));
    times.forEach((t, i) => ctx.sfx(snap ? t : t - 0.1, "hit", 0.35));
    // ── the stage of words ──
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "7", pointerEvents: "none", overflow: "hidden", direction: rtl ? "rtl" : "ltr" });
    let ground = null;
    if (p.clear_stage !== false) {
      ground = doc.createElement("div");
      Object.assign(ground.style, { position: "absolute", inset: "0", background: "var(--x-ground)", backgroundImage: "var(--x-ground-image)" });
      layer.append(ground);
    }
    const glowBg = doc.createElement("div");
    Object.assign(glowBg.style, { position: "absolute", inset: "0", background: "radial-gradient(circle closest-side at 50% 50%, color-mix(in srgb, var(--x-panel) 70%, transparent), transparent)" });
    layer.append(glowBg);
    let ring = null;
    if (p.index_label) {
      ring = doc.createElement("div");
      const d = f.H * 0.92;
      Object.assign(ring.style, { position: "absolute", left: ((f.W - d) / 2).toFixed(1) + "px", top: ((f.H - d) / 2).toFixed(1) + "px", width: d.toFixed(1) + "px", height: d.toFixed(1) + "px", borderRadius: "50%", border: `${Math.max(1, k).toFixed(1)}px solid color-mix(in srgb, var(--x-ink) 20%, transparent)`, boxSizing: "border-box", borderTopColor: "color-mix(in srgb, var(--x-ink) 8%, transparent)" });
      layer.append(ring);
    }
    const base = ML.clamp(p.size, 120, 180) * k;
    const items = list.map((w, i) => {
      const box = doc.createElement("div");
      Object.assign(box.style, { position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", visibility: "hidden" });
      const word = doc.createElement("div");
      Object.assign(word.style, { position: "relative", fontFamily: "var(--x-head-font)", fontWeight: "800", fontSize: base.toFixed(1) + "px", lineHeight: "1.1", letterSpacing: rtl ? "0" : "-0.03em", whiteSpace: "nowrap", color: p.colours === "alternate" && i % 2 === 0 ? "var(--x-accent)" : "var(--x-ink)" });
      if (p.glow) word.style.textShadow = "0 0 24px color-mix(in srgb, var(--x-panel) 35%, transparent), 0 4px 12px color-mix(in srgb, var(--x-ink) 30%, transparent)";
      word.textContent = w;
      box.append(word);
      layer.append(box);
      return { box, word };
    });
    host.append(layer);
    // fit each word to the width, then hang the chrome off its measured box
    const maxW = f.W - f.m * 2;
    items.forEach((it) => { const w = it.word.offsetWidth; if (w > maxW) it.word.style.fontSize = ((base * maxW) / w).toFixed(2) + "px"; });
    items.forEach((it, i) => {
      const fs = parseFloat(it.word.style.fontSize), W0 = it.word.offsetWidth;
      // the reading-start letter's width (first letter; Arabic: the first word is one glyph run, so a share of it)
      let lw = fs * 0.55;
      if (!rtl) { const r = doc.createRange(); const tn = it.word.firstChild; if (tn && tn.length) { r.setStart(tn, 0); r.setEnd(tn, Math.min(1, tn.length)); const kk = it.word.getBoundingClientRect().width / (W0 || 1) || 1; lw = r.getBoundingClientRect().width / kk; } }
      const startX = rtl ? W0 - lw : 0;
      if (p.index) {
        const idx = doc.createElement("div");
        idx.textContent = String(i + 1).padStart(2, "0");
        Object.assign(idx.style, { position: "absolute", left: (startX + (rtl ? lw - 30 * k : 0)).toFixed(1) + "px", bottom: "100%", fontFamily: "var(--x-mono-font)", fontSize: (22 * k).toFixed(1) + "px", letterSpacing: "0.1em", color: "var(--x-dim)", direction: "ltr" });
        it.word.append(idx);
      }
      if (p.underline !== "none") {
        const bar = doc.createElement("div");
        const bw = p.underline === "word" ? W0 : Math.max(30 * k, lw * 0.8), bx = p.underline === "word" ? 0 : rtl ? W0 - bw : 0;
        Object.assign(bar.style, { position: "absolute", left: bx.toFixed(1) + "px", top: "96%", width: bw.toFixed(1) + "px", height: (Math.max(6, fs * 0.04) * 1).toFixed(1) + "px", background: "var(--x-accent)", transformOrigin: rtl ? "100% 50%" : "0 50%" });
        it.word.append(bar);
        it.bar = bar;
      }
      if (p.index_label) {
        const lab = doc.createElement("div");
        lab.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
        Object.assign(lab.style, { position: "absolute", left: "50%", translate: "-50% 0", top: `calc(100% + ${(20 * k).toFixed(1)}px)`, fontFamily: "var(--x-mono-font)", fontSize: (22 * k).toFixed(1) + "px", letterSpacing: "0.3em", color: "var(--x-ink)", whiteSpace: "nowrap", direction: "ltr" });
        it.word.append(lab);
        it.lab = lab;
      }
    });
    // the hand-over: the slot's own words rise in, one by one
    const handWords = el && el !== ctx.stage ? ML.split(el, "words") : [];
    const p3 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 4); // power3.out
    const sf = ML.clamp(p.scale_from, 1.1, 1.5);
    return {
      draw(t) {
        const run = t >= at - 0.1 - 1e-6 && t < handOver;
        layer.style.display = run ? "block" : "none"; // display, not visibility: a child set visible would show through a hidden parent
        // the slot stays hidden until the hand-over, then rises word by word
        if (el && el !== ctx.stage) {
          el.style.opacity = t < end ? (t >= handOver ? "1" : "0") : ""; // from the scene's start: the line must not flash before the first word
          handWords.forEach((w, j) => {
            const u = ML.land(t, handOver + j * 0.08, handOver + j * 0.08 + 0.45);
            const live = t >= handOver && t < end;
            w.style.opacity = live ? u.toFixed(4) : "";
            w.style.translate = live && u < 1 ? `0 ${((1 - u) * 40 * k).toFixed(2)}px` : "none";
          });
        }
        if (!run) return;
        if (ground) ground.style.opacity = ML.lin(t, at - 0.1, at + 0.05).toFixed(4);
        glowBg.style.opacity = ML.lin(t, at - 0.1, at + 0.3).toFixed(4);
        if (ring) { const u = ML.lin(t, at, handOver); ring.style.rotate = (u * 40).toFixed(3) + "deg"; ring.style.scale = (1 + 0.03 * u).toFixed(5); }
        items.forEach((it, i) => {
          const a = starts[i], b = ends[i];
          let o = 0, sc = 1, bl = 0;
          if (t >= a) {
            if (snap) { const u = p3(t, a, 0.12); o = ML.lin(t, a, a + 0.12); sc = 1.15 - 0.15 * u; }
            else { const u = p3(t, a, 0.35); o = u; sc = sf - (sf - 1) * u; bl = (1 - u) * 16; }
            if (p.exit === "cut") { if (t >= (i + 1 < n ? starts[i + 1] : b)) o = 0; } // never two words up at once
            else { const x = i === n - 1 ? ML.ease(t, b - 0.25, b) : ML.ease(t, b - 0.15, b + 0.1); o *= 1 - x; sc *= 1 - 0.1 * x; }
          }
          it.box.style.visibility = o > 0.001 ? "visible" : "hidden";
          if (o <= 0.001) return;
          it.word.style.opacity = o.toFixed(4);
          it.word.style.scale = Math.abs(sc - 1) > 0.0005 ? sc.toFixed(4) : "none";
          it.word.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          if (it.bar) it.bar.style.scale = `${ML.out(t, times[i], times[i] + 0.12).toFixed(4)} 1`;
          if (it.lab) it.lab.style.opacity = (0.5 * ML.lin(t, times[i] + 0.2, times[i] + 0.4)).toFixed(4);
        });
      },
    };
  },
});
