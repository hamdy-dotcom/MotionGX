// Caption builds word by word: each word of the caption appears exactly when it is said, building a short block of
// 1–3 lines (a line breaks after 3 words, 2 on a tall frame) that clears at the end of the phrase or when it is full.
// Condensed caps in the head face at 4.5 % of the frame height, the look's ink with a soft drop shadow; the newest
// word in the accent while the earlier ones stay ink (newest_colour), or no highlight at all — then the motion is
// the emphasis. Entry "instant": opacity in 0.05 s with a 4 px rise; "fade-rise": 0.1 s with a 6 px rise
// (power2.out); "pop": scale 0.6 → 1.08 → 1 (back.out(2.5), 0.22 s), opacity in 0.06 s. Block set centred, left or
// right (mirrored in Arabic) in the lower part of the safe area. Driven by the voice's word timings, else spread over
// the run. Arabic: whole words, never letters; no caps.
// Source: prompt-motion emollick-how-do-you-explain and sab8a-opus-5-5-openedit-prompt (reference only — our own code).
ML.define({
  id: "kinetic.caption-word-build",
  category: "kinetic",
  name: "Caption builds word by word",
  does: "Caption words appear one at a time exactly as spoken, building a short 1-2 line block, the newest word optionally in an accent colour.",
  says: ["story", "energy"],
  energy: 3,
  targets: ["line", "word"],
  duration: [1, 6],
  params: {
    newest_colour: { type: "bool", default: true },
    max_lines: { type: "number", range: [1, 3], default: 2 },
    align: { type: "choice", options: ["center", "left", "right"], default: "center" },
    entry: { type: "choice", options: ["instant", "fade-rise", "pop"], default: "instant" },
  },
  pairs: ["camera.push-in", "kinetic.center-word-sequence"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:sab8a-opus-5-5-openedit-prompt", license: "reference", note: "also emollick-how-do-you-explain; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const k = Math.min(f.W, f.H) / 1080;
    // ── the words and their times ──
    let words = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t < end - 0.2).map((w) => ({ w: w.w, t: Math.max(at, w.t) }));
    if (!words.length) {
      const ws = ((el && el.textContent) || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      if (!ws.length) return null;
      const span = Math.min(0.35, (end - at - 0.5) / ws.length);
      words = ws.map((w, i) => ({ w, t: at + i * span }));
    }
    // ── blocks: lines of 2–3 words, up to max_lines, clearing on a phrase end ──
    const perLine = f.tall ? 2 : 3, maxLines = Math.round(ML.clamp(p.max_lines, 1, 3));
    const blocks = [];
    let cur = null;
    words.forEach((w) => {
      if (!cur || (cur.lines.length >= maxLines && cur.lines[cur.lines.length - 1].length >= perLine)) { cur = { lines: [[]] }; blocks.push(cur); }
      let line = cur.lines[cur.lines.length - 1];
      if (line.length >= perLine) { line = []; cur.lines.push(line); }
      line.push(w);
      if (/[.!?؟:،,]$/.test(w.w)) cur = null; // the phrase ends: the next word starts a fresh block
    });
    blocks.forEach((b, i) => { b.from = b.lines[0][0].t; b.to = i + 1 < blocks.length ? blocks[i + 1].lines[0][0].t : end; });
    words.forEach((w, i) => { if (p.entry === "pop" || i % 2 === 0) ctx.sfx(w.t, "tap", 0.15); });
    // ── the layer ──
    const phys = p.align === "center" ? "center" : (p.align === "right") !== rtl ? "right" : "left";
    const size = f.H * 0.045;
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: f.safe.x + "px", width: f.safe.w + "px", top: (f.safe.y + f.safe.h * 0.62).toFixed(1) + "px", height: (f.safe.h * 0.38).toFixed(1) + "px", zIndex: "8", pointerEvents: "none", display: "grid", alignItems: "center", justifyItems: phys === "center" ? "center" : phys === "left" ? "start" : "end", direction: rtl ? "rtl" : "ltr" });
    const built = blocks.map((b) => {
      const box = doc.createElement("div");
      Object.assign(box.style, { gridArea: "1 / 1", textAlign: phys, fontFamily: "var(--x-head-font)", fontWeight: "800", fontStretch: "condensed", fontSize: size.toFixed(1) + "px", lineHeight: "1.12", textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "-0.01em", color: "var(--x-ink)", textShadow: `0 ${(3 * k).toFixed(1)}px ${(14 * k).toFixed(1)}px color-mix(in srgb, var(--x-ground) 70%, transparent)`, maxWidth: "100%" });
      const spans = [];
      b.lines.forEach((ln) => {
        const row = doc.createElement("div");
        row.style.whiteSpace = "nowrap";
        ln.forEach((w, j) => { const s = doc.createElement("span"); s.style.display = "inline-block"; s.textContent = w.w; row.append(s); if (j < ln.length - 1) row.append(" "); spans.push({ s, t: w.t }); });
        box.append(row);
      });
      layer.append(box);
      return { box, spans };
    });
    host.append(layer);
    // a block too wide for the safe area is set smaller (whole words, never broken)
    built.forEach(({ box }) => { const w = box.scrollWidth; if (w > f.safe.w) box.style.fontSize = ((size * f.safe.w) / w * 0.98).toFixed(2) + "px"; });
    const p2 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 3); // power2.out
    return {
      draw(t) {
        if (el && el !== ctx.stage) el.style.opacity = t >= at - 1e-6 && t < end ? "0" : "";
        const on = t >= at - 1e-6 && t < end;
        built.forEach(({ box, spans }, i) => {
          const b = blocks[i], vis = on && t >= b.from && t < b.to;
          box.style.display = vis ? "block" : "none"; // display: its words set themselves visible
          if (!vis) return;
          const newest = spans.reduce((n, x, j) => (t >= x.t ? j : n), -1);
          spans.forEach(({ s, t: a }, j) => {
            if (t < a) { Object.assign(s.style, { visibility: "hidden", opacity: "", translate: "", scale: "", color: "" }); return; }
            s.style.visibility = "visible";
            s.style.color = p.newest_colour && j === newest ? "var(--x-accent)" : "";
            let o = 1, y = 0, sc = 1;
            if (p.entry === "instant") { o = ML.lin(t, a, a + 0.05); y = (1 - o) * 4 * k; }
            else if (p.entry === "fade-rise") { const u = p2(t, a, 0.1); o = u; y = (1 - u) * 6 * k; }
            else { o = ML.lin(t, a, a + 0.06); sc = 0.6 + 0.4 * ML.back(t, a, a + 0.22, 2.5); }
            s.style.opacity = o.toFixed(4);
            s.style.translate = y > 0.005 ? `0 ${y.toFixed(2)}px` : "none";
            s.style.scale = Math.abs(sc - 1) > 0.0005 ? sc.toFixed(4) : "none";
          });
        });
      },
    };
  },
});
