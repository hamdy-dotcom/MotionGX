// Setup line + heavy payoff (html-reel's titles): a light first line sets up the thought, a beat passes, then a heavy
// accent line answers it. Two type roles — setup light (the serif at 400, or condensed caps at 300), payoff black
// caps (800–900) in the accent at ≈ 1.3–2× the setup size. The setup stays on one line if it fits 87 % of the width,
// else it splits into two balanced lines (the split that keeps the wider line smallest — html-reel's buildTitles).
// The payoff takes the largest size that fits the width including its final dot. Enter: setup words mask-rise 0.7 s
// power3.out (word by word on their spoken words, or the line at once); hold the beat; payoff mask-rise 0.6 s
// power4.out or a clip-path wipe inset(0 100% 0 0) → inset(0) in 0.5 s; the accent period pops last with a 2 px
// settle. The block sits low (≈ 22 % from the bottom) inside the safe band, centred or at the start edge, and leaves
// upward. Text: `setup` / `payoff` params, else the target's text split before its last words.
// Source: MengTo/Skills media/html-reel demo/index.html#buildTitles + reel-clock.css; web-design/editorial-portfolio-chapters (MIT).
ML.define({
  id: "kinetic.setup-payoff",
  category: "kinetic",
  name: "Setup line + heavy payoff",
  does: "A light first line sets up the thought, a beat passes, then a heavy accent line answers it.",
  says: ["story", "reveal", "result", "focus", "energy"],
  energy: 3,
  targets: ["headline", "line", "word"],
  duration: [1.8, 4.5],
  params: {
    beat: { type: "number", range: [0.3, 1], default: 0.5, unit: "s" },
    payoff_enter: { type: "choice", options: ["rise", "wipe"], default: "rise" },
    setup_style: { type: "choice", options: ["serif", "condensed-light"], default: "serif" },
    align: { type: "choice", options: ["center", "left"], default: "center" },
    timing: { type: "choice", options: ["line", "per-word"], default: "per-word" },
    accent_dot: { type: "bool", default: true },
    scale: { type: "number", range: [1.3, 2.1], default: 1.8 },
    over_footage: { type: "bool", default: false },
    setup: { type: "text", default: "" },
    payoff: { type: "text", default: "" },
  },
  pairs: ["background.slow-gradient", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:media/html-reel", license: "MIT", note: "demo/index.html#buildTitles, reel-clock.css; editorial-portfolio-chapters ARTICLE.md" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const all = (el.textContent || "").trim().replace(/\s+/g, " ");
    let setupText = (p.setup || "").trim(), payText = (p.payoff || "").trim();
    if (!setupText || !payText) {
      // split the target: at its first stop / dash / colon, else before its last half
      const m = /^(.+?)[.:—–,؛،]\s+(.+)$/.exec(all);
      if (m) { setupText = setupText || m[1]; payText = payText || m[2]; }
      else { const w = all.split(" "); const c = w.length > 1 ? Math.ceil(w.length / 2) : 1; setupText = setupText || w.slice(0, c).join(" "); payText = payText || w.slice(c).join(" ") || w.join(" "); }
    }
    payText = payText.replace(/[.!؟?]+$/, "");
    if (!setupText || !payText) return null;
    const isAr = (s) => ML.ARABIC.test(s);
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const maxW = f.safe.w;
    const setupFs = Math.min(f.W * 0.085, f.H * 0.075);

    const block = document.createElement("div");
    Object.assign(block.style, { position: "absolute", left: f.safe.x + "px", width: maxW + "px", bottom: (f.H * 0.22).toFixed(1) + "px", zIndex: "6", pointerEvents: "none", display: "grid", justifyItems: p.align === "center" ? "center" : "start", textAlign: p.align === "center" ? "center" : "start", rowGap: (setupFs * 0.12).toFixed(1) + "px" });
    block.setAttribute("dir", rtl ? "rtl" : "ltr");
    if (p.over_footage) block.style.textShadow = "0 2px 24px color-mix(in srgb, var(--x-device) 55%, transparent)";
    host.append(block);
    const serif = p.setup_style === "serif";
    const setupFont = serif ? `400 ${setupFs.toFixed(1)}px / 1.1 var(--x-serif-font)` : `300 ${setupFs.toFixed(1)}px / 1.05 var(--x-head-font)`;
    const setupCase = !serif && !isAr(setupText) ? "uppercase" : "none";
    // a word in a mask: the inner rises from below the mask's floor
    const mask = (text, cls) => {
      const m = document.createElement("span");
      Object.assign(m.style, { display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.06em 0.04em 0.12em", margin: "-0.06em -0.04em -0.12em" });
      const inn = document.createElement("span");
      inn.textContent = text;
      inn.style.display = "inline-block";
      if (cls) inn.className = cls;
      m.append(inn);
      return { m, inn };
    };
    // setup lines: one if ≤ 87 % of the width, else two balanced
    const probe = document.createElement("div");
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", whiteSpace: "nowrap", font: setupFont, textTransform: setupCase });
    host.append(probe);
    const widthOf = (s) => { probe.textContent = s; return probe.getBoundingClientRect().width / k; };
    const sw = setupText.split(" ");
    let lines = [sw];
    if (widthOf(setupText) > maxW * 0.87 && sw.length > 1) {
      let best = null;
      for (let i = 1; i < sw.length; i++) { const m = Math.max(widthOf(sw.slice(0, i).join(" ")), widthOf(sw.slice(i).join(" "))); if (!best || m < best.m) best = { i, m }; }
      lines = [sw.slice(0, best.i), sw.slice(best.i)];
    }
    // the payoff: the largest size ≤ scale × setup that fits the width with its dot
    const payFontAt = (s) => `900 ${s.toFixed(1)}px / 0.98 var(--x-head-font)`;
    let payFs = setupFs * p.scale;
    Object.assign(probe.style, { font: payFontAt(payFs), textTransform: isAr(payText) ? "none" : "uppercase", letterSpacing: isAr(payText) ? "0" : "-0.01em" });
    const pw = widthOf(payText) + (p.accent_dot ? payFs * 0.26 : 0);
    if (pw > maxW) payFs = (payFs * maxW) / pw;
    probe.remove();

    const setupWords = [];
    for (const line of lines) {
      const d = document.createElement("div");
      Object.assign(d.style, { font: setupFont, textTransform: setupCase, color: "var(--x-ink)", letterSpacing: !serif && !isAr(setupText) ? "0.02em" : "0", whiteSpace: "nowrap" });
      line.forEach((w, i) => { if (i) d.append(" "); const x = mask(w); d.append(x.m); setupWords.push({ ...x, w }); });
      block.append(d);
    }
    const pay = document.createElement("div");
    Object.assign(pay.style, { font: payFontAt(payFs), textTransform: isAr(payText) ? "none" : "uppercase", letterSpacing: isAr(payText) ? "0" : "-0.01em", color: "var(--x-accent)", whiteSpace: "nowrap", marginTop: (setupFs * 0.1).toFixed(1) + "px" });
    const payWords = payText.split(" ").map((w, i) => { if (i) pay.append(" "); const x = mask(w); pay.append(x.m); return { ...x, w }; });
    let dot = null;
    if (p.accent_dot) {
      dot = document.createElement("i");
      Object.assign(dot.style, { display: "inline-block", width: "0.17em", height: "0.17em", borderRadius: "50%", background: "var(--x-ink)", marginInlineStart: "0.06em", verticalAlign: "baseline" });
      payWords[payWords.length - 1].inn.append(dot);
    }
    block.append(pay);

    // times: setup words on their spoken words (or the line at once), the beat, then the payoff
    const sTimes = setupWords.map((x, i) => (p.timing === "per-word" ? Math.max(at, ctx.word(x.w, at + i * 0.14)) : at));
    for (let i = 1; i < sTimes.length; i++) sTimes[i] = Math.max(sTimes[i], sTimes[i - 1] + 0.06);
    const setupDone = sTimes[sTimes.length - 1] + 0.45;
    const payAt = Math.min(end - 1.1, Math.max(setupDone + p.beat, p.timing === "per-word" ? ctx.word(payWords[0].w, 0) : 0));
    const pTimes = payWords.map((x, i) => (p.payoff_enter === "wipe" ? payAt : payAt + i * 0.08));
    const payDone = (p.payoff_enter === "wipe" ? payAt + 0.5 : pTimes[pTimes.length - 1] + 0.6);
    const dotAt = payDone - 0.05, leaveAt = Math.max(dotAt + 0.5, end - 0.35);
    ctx.sfx(sTimes[0], "whoosh.soft", 0.2);
    ctx.sfx(payAt + 0.12, "hit", 0.5);
    if (dot) ctx.sfx(dotAt, "pop.soft", 0.3);
    const p3 = (x) => 1 - Math.pow(1 - x, 4), p4 = (x) => 1 - Math.pow(1 - x, 5);

    return {
      draw(t) {
        el.style.visibility = t >= at ? "hidden" : "";
        block.style.visibility = t >= at ? "visible" : "hidden";
        const lv = ML.ease(t, leaveAt, leaveAt + 0.3);
        block.style.translate = `0 ${(-lv * setupFs * 0.9).toFixed(2)}px`;
        block.style.opacity = (1 - lv).toFixed(4);
        setupWords.forEach((x, i) => { const u = p3(ML.lin(t, sTimes[i], sTimes[i] + 0.7)); x.inn.style.translate = `0 ${((1 - u) * 110).toFixed(2)}%`; });
        if (p.payoff_enter === "wipe") {
          const u = ML.ease(t, payAt, payAt + 0.5);
          payWords.forEach((x) => (x.inn.style.translate = "none"));
          const cut = ((1 - u) * 100).toFixed(2);
          pay.style.clipPath = u >= 1 ? "none" : rtl ? `inset(-10% 0 -10% ${cut}%)` : `inset(-10% ${cut}% -10% 0)`;
        } else payWords.forEach((x, i) => { const u = p4(ML.lin(t, pTimes[i], pTimes[i] + 0.6)); x.inn.style.translate = `0 ${((1 - u) * 110).toFixed(2)}%`; });
        if (dot) {
          const u = ML.back(t, dotAt, dotAt + 0.28, 2.2);
          dot.style.scale = t < dotAt ? "0" : Math.max(0, Math.min(1.25, u)).toFixed(4);
          dot.style.translate = `0 ${(-(1 - ML.out(t, dotAt + 0.12, dotAt + 0.32)) * 2).toFixed(2)}px`;
        }
      },
    };
  },
});
