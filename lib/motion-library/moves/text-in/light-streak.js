// Light streak reveal: a glowing streak travels along the line in reading direction and the words appear in its wake,
// as if written by a comet. The head is a long thin gradient (transparent → bright) with a soft glow copy and a bright
// core. Text is revealed by a mask whose edge follows the head minus `trail` px with a `feather` px soft edge, so the
// letters fade in just behind it. Fast: ~0.4 s cubic in-out for a bold headline; slow: ≥1.8 s quad in-out for a calm
// line. Several lines: the streak runs line 1, then carries on from the start of line 2, and fades after the last
// word. RTL: it runs right to left and the mask follows; words are never split (each word is masked whole).
// Source: prompt-motion (ceowinkz, ryzoft) — reference only; our own code.
ML.define({
  id: "text-in.light-streak",
  category: "text-in",
  name: "Light streak reveal",
  does: "A glowing streak of light travels along the line and the words appear in its wake, as if written by a comet.",
  says: ["reveal", "tech", "speed", "luxury", "calm", "story"],
  energy: 3,
  targets: ["headline", "line"],
  duration: [0.5, 3],
  params: {
    speed: { type: "choice", options: ["fast", "slow"], default: "fast" },
    duration: { type: "number", range: [0.3, 2.5], default: 0.4, unit: "s" },
    colour: { type: "choice", options: ["accent", "accent-2", "ink"], default: "accent" },
    lines: { type: "number", range: [1, 3], default: 1 },
    trail: { type: "number", range: [20, 80], default: 40, unit: "px" },
    feather: { type: "number", range: [20, 80], default: 60, unit: "px" },
  },
  pairs: ["background.aurora", "text-in.kicker-rule"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ceowinkz-wtf-ai-just-made", license: "reference", note: "also ryzoft-unrelated-to-game-development — rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 80, k = fs / 80; // the source sizes are for ~80 px type
    // a mask cuts at the word's box: extra height (taken back by the margin) keeps Arabic marks and descenders inside it
    for (const w of words) { w.style.paddingBlock = "0.3em"; w.style.marginBlock = "-0.3em"; }
    // force the asked number of rows when the line sets on fewer
    const rowsOf = () => { const r = []; for (const w of words) { const top = Math.round(w.offsetTop); let row = r.find((x) => Math.abs(x.top - top) < fs * 0.3); if (!row) { row = { top, words: [] }; r.push(row); } row.words.push(w); } return r.sort((a, b) => a.top - b.top); };
    let rows = rowsOf();
    const want = Math.min(Math.round(p.lines), words.length);
    if (rows.length < want) {
      for (let i = 1; i < want; i++) { const w = words[Math.round((i * words.length) / want)]; w.before(document.createElement("br")); }
      rows = rowsOf();
    }
    // each row's extent (element px) and its share of the streak's path
    const eb = ctx.box(el);
    const R = rows.map((r) => {
      const bs = r.words.map((w) => ctx.box(w));
      const x0 = Math.min(...bs.map((b) => b.x)) - eb.x, x1 = Math.max(...bs.map((b) => b.x + b.w)) - eb.x;
      const y0 = Math.min(...bs.map((b) => b.y)) - eb.y, y1 = Math.max(...bs.map((b) => b.y + b.h)) - eb.y;
      return { ...r, x0, x1, y0, y1, bs: bs.map((b) => ({ x: b.x - eb.x, w: b.w })) };
    });
    const trail = p.trail * k, feather = p.feather * k, pad = trail + feather; // the head runs a little past each end
    const lens = R.map((r) => r.x1 - r.x0 + pad * 2), total = lens.reduce((a, b) => a + b, 0);
    const dur = Math.min(p.speed === "slow" ? Math.max(p.duration, 1.8) : p.duration, Math.max(0.2, end - at - 0.3)); // finishes before the line leaves
    const e = p.speed === "slow" ? (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2) : (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    // the streak: a long gradient tail with a blurred glow copy and a bright core at its head
    const col = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", ink: "var(--x-ink)" }[p.colour] || "var(--x-accent)";
    const streak = document.createElement("div");
    const tailW = 300 * k * (p.speed === "slow" ? 1.4 : 1), th = Math.max(2, 2 * k);
    Object.assign(streak.style, { position: "absolute", left: "0", top: "0", width: tailW + "px", height: (th * 8) + "px", pointerEvents: "none", zIndex: "2" });
    const dirG = rtl ? "to left" : "to right";
    const glow = document.createElement("div"), line = document.createElement("div"), core = document.createElement("div");
    Object.assign(glow.style, { position: "absolute", inset: `${th * 2.5}px 0`, background: `linear-gradient(${dirG}, transparent, ${col} 80%, ${col})`, filter: `blur(${(10 * k).toFixed(1)}px)`, opacity: "0.9" });
    Object.assign(line.style, { position: "absolute", left: "0", right: "0", top: "50%", height: th + "px", translate: "0 -50%", background: `linear-gradient(${dirG}, transparent, color-mix(in srgb, ${col} 60%, var(--x-accent-ink)) 80%, var(--x-accent-ink))` });
    const cw = 60 * k, chh = 8 * k;
    Object.assign(core.style, { position: "absolute", top: "50%", width: cw + "px", height: chh + "px", translate: "0 -50%", [rtl ? "left" : "right"]: (-cw / 2) + "px", borderRadius: "50%", background: `radial-gradient(closest-side, var(--x-accent-ink), ${col} 55%, transparent)`, boxShadow: `0 0 ${(18 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, ${col} 70%, transparent)` });
    streak.append(glow, line, core);
    el.append(streak);
    ctx.sfx(at, "whoosh.soft", 0.35);
    // where the head is at distance s along the path: { row, x } (x in element px)
    const headAt = (s) => {
      let acc = 0;
      for (let i = 0; i < R.length; i++) {
        if (s <= acc + lens[i] || i === R.length - 1) { const d = Math.min(lens[i], s - acc); return { i, x: rtl ? R[i].x1 + pad - d : R[i].x0 - pad + d }; }
        acc += lens[i];
      }
      return { i: R.length - 1, x: rtl ? R[R.length - 1].x0 - pad : R[R.length - 1].x1 + pad };
    };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        const u = ML.lin(t, at, at + dur), s = total * e(u), h = headAt(s);
        // the mask edge of each row: done rows open, rows ahead closed, the head row trailing the head
        R.forEach((r, i) => {
          r.words.forEach((w, j) => {
            const b = r.bs[j];
            if (t < at || i > h.i) { w.style.webkitMaskImage = w.style.maskImage = "linear-gradient(transparent, transparent)"; return; }
            if (i < h.i || u >= 1) { w.style.webkitMaskImage = w.style.maskImage = "none"; return; }
            const edge = rtl ? h.x + trail : h.x - trail; // the reveal edge, behind the head
            if (!rtl) { const a = edge - b.x; const m = `linear-gradient(to right, #000 ${(a - feather).toFixed(1)}px, transparent ${a.toFixed(1)}px)`; w.style.webkitMaskImage = w.style.maskImage = m; }
            else { const a = b.x + b.w - edge; const m = `linear-gradient(to left, #000 ${(a - feather).toFixed(1)}px, transparent ${a.toFixed(1)}px)`; w.style.webkitMaskImage = w.style.maskImage = m; }
          });
        });
        // the streak: on its row, tail behind the head; fades in at the start, out after the last word
        const on = t >= at && u < 1 ? ML.lin(t, at, at + 0.06) : t >= at + dur ? 1 - ML.lin(t, at + dur, at + dur + 0.18) : 0;
        streak.style.opacity = on.toFixed(4);
        const r = R[h.i], cy = (r.y0 + r.y1) / 2 + fs * 0.06;
        const left = rtl ? h.x : h.x - tailW;
        streak.style.translate = `${left.toFixed(2)}px ${(cy - th * 4).toFixed(2)}px`;
      },
    };
  },
});
