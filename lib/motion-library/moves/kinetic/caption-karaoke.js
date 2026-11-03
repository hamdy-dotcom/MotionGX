// Karaoke captions: a short line of what is said, the word being spoken in the accent colour. Lines are broken the
// explainer's way (captionLines): at most 30 characters (22 on tall) — or, cinematic, 1–3 words — breaking at sentence
// ends or the limit, never ending a line on a small word (a, and, the, to, your…: it goes down with the next), a
// comma breaking once the line is past 45 % of the limit; a line stays up until the next if the gap is under 0.5 s.
// "clean": body face 46 px weight 600 in the look's lightest colour with an 8-direction 2.5–3 px outline in its darkest (or a
// box behind: dark ground, 4/14/6 px padding) — light fill on a dark edge in any look, dark or light; "cinematic": the
// head face at 800, ~78 px on a 1080 stage, a 5 px outline, each word appearing as it is said (reveal "auto" gives clean
// whole lines and cinematic word by word; "line" / "word-by-word" force either). Sits at the bottom, the lower third, or the
// split seam (mid-frame on 9:16). Plain small captions undo big cinematic type: keep them off scenes whose big type
// says the same words. Arabic: whole words, right to left, the outline drawn around joined letters.
// Source: MengTo/Skills media/html-explainer-video scripts/explainer.js#captionLines + explainer.css .x-cap (MIT);
// media/html-reel scripts/preview-reel.mjs#captionLines (the cinematic word-by-word variant).
ML.define({
  id: "kinetic.caption-karaoke",
  category: "kinetic",
  name: "Karaoke captions",
  does: "Captions show a short line of what is said with the spoken word in the accent colour — clean subtitle style or heavy cinematic word-by-word.",
  says: ["story", "simplicity", "energy"],
  energy: 2,
  targets: ["line", "word"],
  duration: [1, 60],
  params: {
    style: { type: "choice", options: ["clean", "cinematic"], default: "clean" },
    reveal: { type: "choice", options: ["auto", "line", "word-by-word"], default: "auto" },
    max_chars: { type: "number", range: [18, 30], default: 30 },
    max_words: { type: "number", range: [1, 3], default: 3 },
    edge: { type: "choice", options: ["outline", "box"], default: "outline" },
    position: { type: "choice", options: ["bottom", "lower-third", "seam"], default: "bottom" },
  },
  pairs: ["camera.push-in", "kinetic.big-type-drift"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:media/html-explainer-video", license: "MIT", note: "scripts/explainer.js captionLines + drawCaps, explainer.css .x-cap; html-reel preview-reel.mjs for the cinematic mode" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const k = Math.min(f.W, f.H) / 1080;
    const cine = p.style === "cinematic";
    // ── the words: the voice inside the run, else the slot's text spread over it ──
    let words = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t < end - 0.1).map((w) => [w.w, w.t, Math.min(w.e ?? w.t + 0.3, end)]);
    if (!words.length) {
      const ws = ((el && el.textContent) || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      if (!ws.length) return null;
      const span = (end - at - 0.4) / ws.length;
      words = ws.map((w, i) => [w, at + i * span, at + (i + 0.85) * span]);
    }
    // ── captionLines (ported): a line never ends on a small word; commas break past 45 %; short gaps are bridged ──
    const max = Math.min(Math.round(ML.clamp(p.max_chars, 18, 30)), f.tall ? 22 : 30);
    const maxWords = cine ? Math.round(ML.clamp(p.max_words, 1, 3)) : Infinity;
    const small = /^(a|an|and|at|but|by|for|in|is|it|of|on|or|so|the|to|with|your|و|في|من|على|ولا|يا)$/i;
    const lines = [];
    let cur = [];
    const flush = () => { if (cur.length) lines.push({ from: cur[0][1], to: cur[cur.length - 1][2], words: cur }); cur = []; };
    for (const w of words) {
      const len = cur.reduce((n, x) => n + String(x[0]).length + 1, 0);
      if (cur.length && (len + String(w[0]).length > max || cur.length >= maxWords)) {
        const held = [];
        while (cur.length > 1 && small.test(String(cur[cur.length - 1][0]))) held.unshift(cur.pop());
        flush();
        cur = held;
      }
      cur.push(w);
      if (/[.!?؟:]$/.test(String(w[0])) || (/[,،]$/.test(String(w[0])) && len > max * 0.45)) flush();
    }
    flush();
    for (let i = 0; i < lines.length - 1; i++) if (lines[i + 1].from - lines[i].to < 0.5) lines[i].to = lines[i + 1].from;
    if (!lines.length) return null;
    if (cine) words.forEach((w, i) => i % 2 === 0 && ctx.sfx(w[1], "tap", 0.12));
    // ── the caption ──
    const size = (cine ? 78 : 46) * k, ow = (cine ? 5 : 2.75) * k;
    const box = p.edge === "box";
    // the caption's light fill and dark edge, whichever way round the look has them
    const probe = doc.createElement("div"), cv = doc.createElement("canvas").getContext("2d");
    host.append(probe);
    const lum = (v) => { probe.style.color = v; cv.fillStyle = getComputedStyle(probe).color; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
    const tones = ["var(--x-ground)", "var(--x-panel)", "var(--x-ink)"].map((v) => [lum(v), v]).sort((a, b) => a[0] - b[0]);
    probe.remove();
    const darkTone = tones[0][1], lightTone = tones[tones.length - 1][1];
    const y = p.position === "seam" ? f.H * 0.5 : p.position === "lower-third" ? f.H * 0.68 : f.safe.y + f.safe.h - size * 1.2;
    const cap = doc.createElement("div");
    Object.assign(cap.style, { position: "absolute", left: f.m + "px", width: f.W - f.m * 2 + "px", top: (y - size * 0.6).toFixed(1) + "px", zIndex: "9", pointerEvents: "none", display: "grid", justifyItems: "center", alignItems: "start", textAlign: "center", direction: rtl ? "rtl" : "ltr" });
    const edge = darkTone;
    // every line built once, stacked in one cell; a frame only shows one and colours its words
    const built = lines.map((c) => {
      const line = doc.createElement("span");
      Object.assign(line.style, {
        gridArea: "1 / 1",
        font: cine ? `800 ${size.toFixed(1)}px / 1.1 var(--x-head-font)` : `600 ${size.toFixed(1)}px / 1.1 var(--x-body-font)`,
        color: lightTone,
        // the explainer's 8-direction outline, drawn as a stroke under the fill (shadows of one word overprint the next)
        webkitTextStroke: box ? "0" : `${(ow * 2).toFixed(2)}px ${edge}`,
        paintOrder: "stroke fill",
        background: box ? darkTone : "transparent",
        padding: box ? `${4 * k}px ${14 * k}px ${6 * k}px` : "0",
        borderRadius: box ? `min(var(--x-radius), ${8 * k}px)` : "0",
        textTransform: cine && !rtl ? "uppercase" : "none",
        letterSpacing: cine && !rtl ? "-0.01em" : "0",
        maxWidth: "100%",
        visibility: "hidden",
      });
      const spans = c.words.map((w, j) => { const e = doc.createElement("span"); e.textContent = w[0]; line.append(e); if (j < c.words.length - 1) line.append(" "); return e; });
      cap.append(line);
      return { line, spans };
    });
    host.append(cap);
    const byWord = p.reveal === "word-by-word" || (p.reveal !== "line" && cine);
    return {
      draw(t) {
        if (el && el !== ctx.stage) el.style.opacity = t < end ? "0" : ""; // from the scene's start: the slot must not flash before the caption comes
        const i = t >= at - 1e-6 && t < end ? lines.findIndex((c) => t >= c.from && t < c.to) : -1;
        built.forEach((b, j) => { b.line.style.visibility = j === i ? "visible" : "hidden"; });
        if (i < 0) return;
        const c = lines[i];
        // the spoken word: the one being said, held across a breath so the accent doesn't flicker between words; word-by-word keeps the latest said lit
        let now = c.words.findIndex((w) => t >= w[1] && t < w[2]);
        if (now < 0) { const last = c.words.reduce((n, w, j) => (t >= w[1] ? j : n), -1); if (last >= 0 && (byWord || t < c.words[last][2] + 0.25)) now = last; }
        built[i].spans.forEach((e, j) => {
          e.style.visibility = byWord && t < c.words[j][1] ? "hidden" : "";
          e.style.color = j === now ? "var(--x-accent)" : "";
        });
      },
    };
  },
});
