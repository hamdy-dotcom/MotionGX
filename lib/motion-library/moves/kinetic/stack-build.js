// Stack builds per beat: a statement builds one line (or one word) at a time into a tight stack and ends on an
// emphasised word. Each unit appears on its spoken word / beat (~0.6–0.9 s apart): opacity 0 → 1, y 10 px → 0,
// blur 4 → 0 over 0.3 s power3.out. Grotesk: tight −0.04 em heavy type, line-height 0.92, anchored top-start at 6 %
// margins (top-right in RTL); the block steps up ~6 px with each new line to stay balanced (centred stacks re-centre
// by half a line); the emphasised unit is in the accent at a heavier weight; an optional tiny mono sub-line (40 % ink,
// tracking 0.2 em) fades in under it. Serif: centred, the first word bold serif caps (~5 % of the frame height), the
// following words regular at 70 % size, line-height 0.85 so lines touch, the final key word back in bold caps, a
// subtle shadow for moving grounds. Lines come from the real wrap of the text at the stack's width.
// Source: prompt-motion:charlesmendez-holly-cow-just-asked + prompt-motion:nft-chen-opus-5-5-three-js-prompt (reference only — our own rebuild).
ML.define({
  id: "kinetic.stack-build",
  category: "kinetic",
  name: "Stack builds per beat",
  does: "A statement builds one line or word at a time into a tight stack, ending on an emphasised word.",
  says: ["story", "urgency", "brand", "calm", "luxury"],
  energy: 3,
  targets: ["headline", "line"],
  duration: [2, 6],
  params: {
    unit: { type: "choice", options: ["line", "word"], default: "line" },
    style: { type: "choice", options: ["grotesk", "serif"], default: "grotesk" },
    align: { type: "choice", options: ["start", "center"], default: "start" },
    emphasis: { type: "choice", options: ["last", "first", "word"], default: "last" },
    key: { type: "text", default: "" },
    sub_line: { type: "bool", default: false },
    sub: { type: "text", default: "" },
    overlap: { type: "bool", default: false },
  },
  pairs: ["background.slow-gradient", "text-emphasis.accent-word"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:charlesmendez-holly-cow-just-asked", license: "reference", note: "our own rebuild; serif variant from prompt-motion:nft-chen-opus-5-5-three-js-prompt" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    if (!el) return null;
    const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const host = ctx.scene || stage;
    const ar = ML.ARABIC.test(words.join(" "));
    const serif = p.style === "serif";
    const center = serif || p.align === "center"; // the serif stack is a centred one (top-start is the grotesk's)
    el.style.visibility = "hidden"; // the block builds these words: the slot never flashes its full line first
    let fs = serif ? Math.min(f.W * 0.11, f.H * 0.11) : Math.min(f.W * 0.085, f.H * 0.1);
    const mx = f.W * 0.06, my = Math.max(f.safe.y, f.H * 0.06);
    const room = f.W - mx * 2;
    let maxW = serif ? Math.min(room, fs * 9) : Math.min(room, fs * 5.2); // a tight stack: two or three short words a line

    const block = document.createElement("div");
    Object.assign(block.style, { position: "absolute", zIndex: "6", pointerEvents: "none", width: maxW + "px", display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", textAlign: center ? "center" : "start", color: "var(--x-ink)" });
    block.setAttribute("dir", rtl ? "rtl" : "ltr");
    if (center) Object.assign(block.style, { left: ((f.W - maxW) / 2).toFixed(1) + "px" });
    else block.style[rtl ? "right" : "left"] = mx + "px";
    if (serif) block.style.textShadow = "0 2px 18px color-mix(in srgb, var(--x-ground) 55%, transparent)";
    host.append(block);
    // tight, as the technique asks; Arabic's marks and descenders need a line that clears them
    const lh = ar ? 1.14 : serif ? (p.overlap ? 0.85 : 0.98) : p.overlap ? 0.86 : 0.92;
    const fontOf = (kind) => kind === "big"
      ? `700 ${fs.toFixed(1)}px / ${lh} var(--x-serif-font)`
      : kind === "small" ? `400 ${(fs * 0.7).toFixed(1)}px / ${lh} var(--x-serif-font)`
      : `max(var(--x-head-weight), 800) ${fs.toFixed(1)}px / ${lh} var(--x-head-font)`;
    const caseOf = (kind) => (kind === "grotesk" ? "var(--x-head-case)" : kind === "big" && !ar ? "uppercase" : "none");
    // the lines: grotesk = the real wrap at the stack width; serif = first word, the middle wrapped small, last word
    let widestWord = 0;
    const wrap = (list, font) => {
      const m = document.createElement("div");
      Object.assign(m.style, { position: "absolute", visibility: "hidden", width: maxW + "px", font, textTransform: serif ? "none" : "var(--x-head-case)", letterSpacing: ar || serif ? "0" : "-0.04em" });
      m.setAttribute("dir", rtl ? "rtl" : "ltr");
      host.append(m);
      const sp = list.map((w, i) => { const s = document.createElement("span"); s.textContent = w; s.style.display = "inline-block"; if (i) m.append(" "); m.append(s); return s; });
      widestWord = Math.max(widestWord, ...sp.map((s) => s.offsetWidth));
      const rows = [];
      sp.forEach((s, i) => { const top = Math.round(s.offsetTop); if (!rows.length || rows[rows.length - 1].top !== top) rows.push({ top, words: [] }); rows[rows.length - 1].words.push(list[i]); });
      m.remove();
      return rows.map((r) => r.words);
    };
    let lines;
    const layout = () => {
      widestWord = 0;
      if (serif && words.length > 2) { wrap([words[0], words[words.length - 1]], fontOf("big")); return [{ w: [words[0]], kind: "big" }, ...wrap(words.slice(1, -1), fontOf("small")).map((w) => ({ w, kind: "small" })), { w: [words[words.length - 1]], kind: "big" }]; }
      if (serif) { wrap(words, fontOf("big")); return words.map((w) => ({ w: [w], kind: "big" })); }
      return wrap(words, fontOf("grotesk")).map((w) => ({ w, kind: "grotesk" }));
    };
    // a long statement or a long word: the type comes down until the stack fits the safe band and the margins
    for (let pass = 0; pass < 5; pass++) {
      lines = layout();
      const tall = lines.reduce((h, l) => h + (l.kind === "small" ? 0.7 : 1) * fs * lh, 0), over = Math.max(tall / (f.safe.h * 0.9), widestWord / room);
      if (over <= 1) break;
      fs /= over; maxW = serif ? Math.min(room, fs * 9) : Math.min(room, fs * 5.2);
    }
    block.style.width = maxW + "px";
    if (center) block.style.left = ((f.W - maxW) / 2).toFixed(1) + "px";
    // the emphasised unit
    const keyIdx = (() => {
      if (p.emphasis === "first") return 0;
      if (p.emphasis === "word") { const q = ML.plain(p.key || ""); const i = q ? words.findIndex((w) => ML.plain(w).includes(q)) : -1; return i >= 0 ? i : words.length - 1; }
      return words.length - 1;
    })();
    let wi = 0;
    const units = [];
    const lineEls = lines.map((ln, li) => {
      const d = document.createElement("div");
      Object.assign(d.style, { font: fontOf(ln.kind), letterSpacing: ar || serif ? "0" : "-0.04em", textTransform: caseOf(ln.kind), whiteSpace: "nowrap" });
      const lineWords = ln.w.map((w, i) => {
        const s = document.createElement("span");
        s.textContent = w; s.style.display = "inline-block";
        if (i) d.append(" ");
        d.append(s);
        return { s, idx: wi++ };
      });
      // emphasis: a line unit lights its whole line; a word unit (or a chosen key word) lights its word
      const hasKey = lineWords.some((x) => x.idx === keyIdx);
      if (hasKey) {
        const lightLine = p.unit === "line" && p.emphasis !== "word" && !serif;
        for (const x of lineWords) if (lightLine || x.idx === keyIdx) { x.s.style.color = "var(--x-accent)"; x.s.style.fontWeight = ln.kind === "small" ? "700" : "900"; }
      }
      block.append(d);
      if (p.unit === "line") units.push({ els: [d], first: ln.w[0], line: li });
      else lineWords.forEach((x, i) => units.push({ els: [x.s], first: ln.w[i], line: li }));
      return d;
    });
    let subEl = null;
    const sceneSub = host.querySelector(".ml-sub");
    const subText = (p.sub || (p.sub_line && sceneSub && sceneSub !== el ? sceneSub.textContent : "")).trim();
    if (p.sub_line && subText) {
      if (!p.sub && sceneSub) sceneSub.style.visibility = "hidden"; // it moves here: never on screen twice
      subEl = document.createElement("div");
      subEl.textContent = subText;
      Object.assign(subEl.style, { marginTop: (fs * 0.35).toFixed(1) + "px", font: `500 ${Math.max(20, fs * 0.28).toFixed(1)}px / 1.3 var(--x-mono-font)`, letterSpacing: ar ? "0" : "0.2em", textTransform: ar ? "none" : "uppercase", color: "color-mix(in srgb, var(--x-ink) 40%, transparent)", whiteSpace: "nowrap", textShadow: "none" });
      block.append(subEl);
    }
    // where the block sits: top-start at the margins, or centred on the frame (re-centring as lines arrive)
    const lineH = lineEls.map((d) => d.offsetHeight);
    const step6 = Math.min(6 * (fs / 64), (fs * 0.9) / Math.max(1, lineEls.length - 1)); // a long stack never climbs out of the safe band
    const topStart = my, cy = f.H * (f.tall ? 0.42 : 0.46);
    block.style.top = "0";

    // times: one unit per spoken word / beat
    const n = units.length;
    const span = Math.max(0.4, end - at - 0.8);
    const gap = Math.min(0.9, span / Math.max(1, n)), minGap = Math.min(0.3, span / Math.max(1, n)); // a long statement quickens inside its run
    const times = units.map((u, i) => (i === 0 ? at : Math.max(at, ctx.word(u.first, at + i * gap))));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + minGap);
    for (let i = n - 1; i >= 0; i--) times[i] = Math.max(at, Math.min(times[i], at + span - (n - 1 - i) * minGap));
    const lineTime = lineEls.map((_, li) => times[units.findIndex((u) => u.line === li)]);
    const subAt = times[n - 1] + 0.35;
    times.forEach((t, i) => ctx.sfx(t, i === n - 1 ? "land.light" : "tap", i === n - 1 ? 0.35 : 0.2));
    const p3 = (t, a) => 1 - Math.pow(1 - ML.lin(t, a, a + 0.3), 4); // power3.out
    const lift = 10 * (fs / 64);

    return {
      draw(t) {
        block.style.visibility = t >= at ? "visible" : "hidden";
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        block.style.opacity = (1 - leave).toFixed(4);
        block.style.filter = leave > 0 ? `blur(${(leave * 8).toFixed(2)}px)` : "none";
        // the block's position: steps up as lines arrive
        let y;
        if (center) { let h = 0; lineEls.forEach((_, li) => (h += lineH[li] * (li === 0 ? 1 : p3(t, lineTime[li])))); y = cy - h / 2; }
        else { let s = 0; lineEls.forEach((_, li) => { if (li) s += step6 * p3(t, lineTime[li]); }); y = topStart - s; }
        block.style.translate = `0 ${y.toFixed(2)}px`;
        units.forEach((u, i) => {
          const e = p3(t, times[i]);
          for (const x of u.els) {
            x.style.opacity = (t < times[i] ? 0 : e).toFixed(4);
            x.style.translate = `0 ${((1 - e) * lift).toFixed(2)}px`;
            x.style.filter = e < 1 && t >= times[i] ? `blur(${((1 - e) * 4).toFixed(2)}px)` : "none";
          }
        });
        if (subEl) subEl.style.opacity = ML.ease(t, subAt, subAt + 0.4).toFixed(4);
      },
    };
  },
});
