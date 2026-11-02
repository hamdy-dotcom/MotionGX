// Punchline card (product-film's Punchlines): a full-frame card alone between product scenes, one or two centred
// lines of very large words. The block sits left 0 / right 0 with its vertical centre at card.y (≈ 40 % of the frame
// height, 430 px on 1080p) and translate −50 %; a grid with justify-items centre; each line a flex row, gap 0.26 em,
// nowrap. Every word keeps its slot from the first frame (opacity, never removed), so a centred line never re-centres
// while it builds; each lands on its spoken word (else on the beat) blurring in from 16 px and rising 36 px over 0.3 s
// on cubic-bezier(0.22, 1, 0.36, 1). The card holds 1–1.5 bars after its last word, then leaves with a 12 px blur
// (words rise 16 px out). With a brand element, a brand texture covers the ground and is thinned in a band behind
// the words — never a panel. Two lines are balanced by measured width (the wider kept smallest).
// Source: Rieranthony/product-film-skill, templates/kit/punchlines.tsx + reference/ingredients.md "Punchlines" (MIT).
ML.define({
  id: "kinetic.punchline-card",
  category: "kinetic",
  name: "Punchline card",
  does: "A full-frame card with up to two centred lines of very large words building beat by beat, alone between product scenes.",
  says: ["story", "focus", "brand", "result"],
  energy: 3,
  targets: ["headline", "stage"],
  duration: [1.5, 4],
  params: {
    lines: { type: "number", range: [1, 2], default: 1 },
    size: { type: "number", range: [120, 160], default: 140, unit: "px" },
    brand_element: { type: "bool", default: false },
    hold_bars: { type: "number", range: [1, 1.5], default: 1 },
    accent: { type: "choice", options: ["last", "none"], default: "last" },
    sync: { type: "choice", options: ["spoken", "beat"], default: "spoken" },
    bpm: { type: "number", range: [80, 140], default: 120 },
    text: { type: "text", default: "" },
  },
  pairs: ["camera.push-in", "transition.blur-swap"],
  avoid: ["ambient"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "product-film-skill:templates/kit/punchlines.tsx", license: "MIT", note: "ingredients.md (Punchlines)" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    const host = ctx.scene || stage;
    // the words: the param text, else the target's own text (a stage target reads the scene's headline)
    const src = el && el !== stage ? el : host.querySelector(".ml-title");
    const text = (p.text || (src ? src.textContent : "") || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const words = text.split(" ");
    const kSize = Math.min(f.W, f.H) / 1080, size = p.size * kSize, maxW = f.W - f.m * 2;
    const beat = 60 / p.bpm, bar = beat * 4;

    // the card: the look's ground over the whole frame, an optional brand texture, the word block
    const card = document.createElement("div");
    Object.assign(card.style, { position: "absolute", inset: "0", zIndex: "7", background: "var(--x-ground)", pointerEvents: "none", overflow: "hidden" });
    card.setAttribute("dir", rtl ? "rtl" : "ltr");
    host.append(card);
    let tex = null, texCol = "#000";
    if (p.brand_element) {
      tex = document.createElement("canvas");
      tex.width = Math.round(f.W / 2); tex.height = Math.round(f.H / 2);
      Object.assign(tex.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
      card.append(tex);
      texCol = getComputedStyle(card).getPropertyValue("--x-accent").trim() || "#888";
    }
    const block = document.createElement("div");
    Object.assign(block.style, { position: "absolute", left: "0", right: "0", top: (f.H * (430 / 1080)).toFixed(1) + "px", translate: "0 -50%", display: "grid", justifyItems: "center", font: `var(--x-head-weight) ${size.toFixed(1)}px / 1.08 var(--x-head-font)`, letterSpacing: "var(--x-head-track)", color: "var(--x-ink)" });
    card.append(block);
    const mkLine = () => { const d = document.createElement("div"); Object.assign(d.style, { display: "flex", alignItems: "center", gap: "0.26em", whiteSpace: "nowrap" }); return d; };
    const spans = words.map((w, i) => {
      const s = document.createElement("span");
      s.textContent = w;
      Object.assign(s.style, { display: "inline-flex", alignItems: "center" });
      if (p.accent === "last" && i === words.length - 1 && words.length > 1) s.style.color = "var(--x-accent)";
      return s;
    });
    // lines: one if it fits; two (balanced by width) when asked, or when one line would shrink below 70 %
    const probe = mkLine(); spans.forEach((s) => probe.append(s)); block.append(probe);
    const widthOf = (a, b) => { if (b <= a) return 0; const r = spans[b - 1].getBoundingClientRect(), l = spans[a].getBoundingClientRect(); return (Math.max(r.right, l.right) - Math.min(r.left, l.left)) / (stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1); };
    const one = widthOf(0, spans.length);
    let cut = 0;
    if (spans.length > 1 && (Math.round(p.lines) >= 2 || one > maxW / 0.7)) {
      let best = Infinity;
      for (let i = 1; i < spans.length; i++) { const m = Math.max(widthOf(0, i), widthOf(i, spans.length)); if (m < best) { best = m; cut = i; } }
    }
    probe.remove();
    const rows = cut ? [spans.slice(0, cut), spans.slice(cut)] : [spans];
    const lineEls = rows.map((r) => { const d = mkLine(); r.forEach((s) => d.append(s)); block.append(d); return d; });
    // fit: the widest line inside the frame margins
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const widest = Math.max(...lineEls.map((d) => d.getBoundingClientRect().width / k));
    if (widest > maxW) block.style.fontSize = ((size * maxW) / widest).toFixed(1) + "px";
    const fs = parseFloat(block.style.fontSize) || size;

    // times: each word on its spoken word, else on the beat
    const times = words.map((w, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(w, at + i * beat)) : at + i * beat));
    for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i], times[i - 1] + 0.08);
    const last = times[times.length - 1] + 0.3;
    const out = Math.max(last + 0.2, Math.min(end - 0.22, last + p.hold_bars * bar));
    const first = times[0];
    times.forEach((t, i) => ctx.sfx(t, i === times.length - 1 ? "land.light" : "tap", i === times.length - 1 ? 0.45 : 0.22));
    const bandY = f.H * (430 / 1080), bandH = fs * rows.length * 1.1;

    return {
      draw(t) {
        const on = t >= first - 0.12 && t < Math.max(end, out + 0.25);
        card.style.visibility = on ? "visible" : "hidden";
        if (src) src.style.visibility = on ? "hidden" : "";
        if (!on) return;
        card.style.opacity = ML.lin(t, first - 0.12, first).toFixed(4);
        const leave = ML.clamp((t - out) / 0.18);
        block.style.opacity = (1 - leave).toFixed(4);
        block.style.filter = leave > 0 ? `blur(${(leave * 12).toFixed(2)}px)` : "none";
        spans.forEach((s, i) => {
          const u = ML.land(t, times[i], times[i] + 0.3);
          s.style.opacity = u.toFixed(4);
          s.style.filter = u < 1 ? `blur(${((1 - u) * 16).toFixed(2)}px)` : "none";
          s.style.translate = `0 ${(((1 - u) * 36 - leave * 16) * kSize).toFixed(2)}px`;
        });
        if (tex) {
          // the brand texture: a drifting field of accent dots, thinned in a band behind the words
          const c = tex.getContext("2d"), W = tex.width, H = tex.height, s = W / f.W, step = Math.max(10, Math.round(f.W * 0.028 * s));
          c.clearRect(0, 0, W, H);
          c.fillStyle = texCol;
          const drift = (t * 18 * s) % step;
          for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) {
            const gx = Math.round(x / step), gy = Math.round(y / step);
            const py = y + drift, d = Math.abs(py / s - bandY) / bandH, thin = ML.clamp((d - 0.35) / 0.4);
            const r = step * 0.16 * (0.55 + 0.45 * ML.rnd(gx, gy));
            c.globalAlpha = 0.28 * thin;
            if (c.globalAlpha < 0.01) continue;
            c.beginPath(); c.arc(x + ((gy % 2) * step) / 2, py, r, 0, Math.PI * 2); c.fill();
          }
          c.globalAlpha = 1;
        }
      },
    };
  },
});
