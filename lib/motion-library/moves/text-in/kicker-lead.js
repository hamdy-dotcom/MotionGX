// Kicker then lead: a small lead word or line ('Meet', 'that', a caption) lands first, then the big main word or line
// arrives beneath or beside it. The kicker (2–10× smaller, accent, label face) fades in 0.18 s — on its own, or on a
// thin rule ~1.3× its width that draws from its start edge in 0.3 s (power2.out). After the gap the main line comes in:
// rise-blur (y 26 → 0, blur 6 → 0, 0.4 s power3.out), blur-tint ('Meet' + name: from near-ground, blur 10, x +12 to
// the accent, blur 0, x 0 over 0.45 s) or a plain rise. Placements: stacked (kicker above), corner (kicker at the main
// line's top start corner), inline (kicker before it on the baseline), diagonal (setup upper start, payoff offset lower
// end, with thin accent hairlines from the frame edge). A connective can take its own short beat first, alone and
// centred (0.4 s), and an optional mono subline follows 0.3 s after the main line. A logo target is the main 'line':
// the kicker comes from the param and the logo arrives on a plain rise (never blurred or tinted).
// Source: prompt-motion (heyiammallik, elliot-garreffa, majin-appsheet, anthonyriera) — reference only; our own code.
ML.define({
  id: "text-in.kicker-lead",
  category: "text-in",
  name: "Kicker then lead",
  does: "A small lead word or line ('Meet', 'that', a caption) lands first, then the big main word or line arrives beneath or beside it.",
  says: ["story", "brand", "arrival", "reveal", "simplicity"],
  energy: 3,
  targets: ["word", "headline", "line", "logo"],
  duration: [0.6, 2],
  params: {
    gap: { type: "number", range: [0.15, 0.5], default: 0.25, unit: "s" },
    size_ratio: { type: "number", range: [2, 10], default: 4, unit: "x" },
    placement: { type: "choice", options: ["stacked", "corner", "inline", "diagonal"], default: "stacked" },
    rule: { type: "bool", default: false },
    main_in: { type: "choice", options: ["rise-blur", "blur-tint", "rise"], default: "rise-blur" },
    connective_solo: { type: "bool", default: false },
    subline: { type: "bool", default: false },
    kicker: { type: "text", default: "" },
    subline_text: { type: "text", default: "" },
    sync: { type: "choice", options: ["gap", "spoken"], default: "gap" },
  },
  pairs: ["text-in.punchline", "text-in.kicker-rule"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:heyiammallik-i-asked-opus-5-5", license: "reference", note: "also elliot-garreffa, majin-appsheet, anthonyriera — rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    let el = ctx.el;
    if (!el) return null;
    const mark = /^(svg|img)$/i.test(el.tagName) ? el : null, markH = mark ? ctx.box(mark).h : 0;
    if (mark) { const host = document.createElement("span"); host.style.display = "block"; mark.replaceWith(host); host.append(mark); el = host; }
    const mainIn = mark ? "rise" : p.main_in;
    const cs = getComputedStyle(el), fs = markH || parseFloat(cs.fontSize) || 56;
    // the kicker: given as a param, else the line's first word (first two on a long line)
    const all = mark ? [] : el.textContent.trim().split(/\s+/);
    let kick = p.kicker.trim(), main = mark ? "" : el.textContent.trim();
    if (!kick && all.length > 1) { const n = all.length > 5 ? 2 : 1; kick = all.slice(0, n).join(" "); main = all.slice(n).join(" "); }
    if (!kick) kick = "—";
    const align = cs.textAlign === "center" ? "center" : "start";
    el.textContent = "";
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const kfs = Math.max(22, fs / p.size_ratio);
    const kWrap = document.createElement("span"), kText = document.createElement("span"), mainEl = mark || document.createElement("span");
    kText.textContent = kick; if (!mark) mainEl.textContent = main;
    Object.assign(kWrap.style, { display: "inline-flex", flexDirection: "column", alignItems: "stretch", gap: (kfs * 0.35).toFixed(1) + "px", font: `var(--x-label-weight) ${kfs.toFixed(1)}px/1.2 ${ML.ARABIC.test(kick) ? "var(--x-arabic)" : "var(--x-label-font)"}`, letterSpacing: rtl || ML.ARABIC.test(kick) ? "0" : "var(--x-label-track)", textTransform: rtl ? "none" : "var(--x-label-case)", color: "var(--x-accent)", whiteSpace: "nowrap" });
    Object.assign(mainEl.style, { display: "inline-block" });
    kWrap.append(kText);
    let rule = null;
    if (p.rule) { rule = document.createElement("span"); Object.assign(rule.style, { display: "block", height: Math.max(1, kfs / 16).toFixed(1) + "px", width: "130%", alignSelf: align === "center" ? "center" : "auto", background: "var(--x-accent)", transformOrigin: rtl ? "right center" : "left center" }); kWrap.append(rule); }
    let subEl = null;
    if (p.subline && p.subline_text) { subEl = document.createElement("span"); subEl.textContent = p.subline_text; Object.assign(subEl.style, { display: "block", font: `500 ${Math.max(22, fs / 6).toFixed(1)}px/1.3 var(--x-mono-font)`, color: "var(--x-dim)", marginTop: "0.6em", letterSpacing: ML.ARABIC.test(p.subline_text) ? "0" : "0.08em" }); }
    const hair = [];
    if (p.placement === "inline") {
      Object.assign(el.style, { display: "flex", alignItems: "baseline", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", columnGap: (kfs * 0.8).toFixed(1) + "px" });
      el.append(kWrap, mainEl);
      if (subEl) { subEl.style.flexBasis = "100%"; subEl.style.textAlign = align; el.append(subEl); }
    } else if (p.placement === "diagonal") {
      Object.assign(el.style, { display: "grid", rowGap: (kfs * 0.6).toFixed(1) + "px" });
      kWrap.style.justifySelf = "start"; mainEl.style.justifySelf = "end"; mainEl.style.textAlign = "end";
      el.append(kWrap, mainEl);
      if (subEl) { subEl.style.justifySelf = "end"; el.append(subEl); }
      // thin accent hairlines crossing in from the frame edges, through each line
      for (const k of [0, 1]) { const h = document.createElement("span"); Object.assign(h.style, { position: "absolute", height: "1px", width: "40%", background: "color-mix(in srgb, var(--x-accent) 60%, transparent)", pointerEvents: "none" }); el.append(h); hair.push(h); }
    } else {
      Object.assign(el.style, { display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: (kfs * 0.5).toFixed(1) + "px" });
      el.append(kWrap, mainEl);
      if (subEl) el.append(subEl);
    }
    // corner: the kicker sits at the main line's top start corner, tucked close
    const kb = ctx.box(kWrap), mb = ctx.box(mainEl);
    if (p.placement === "corner") {
      const dx = rtl ? mb.x + mb.w - (kb.x + kb.w) : mb.x - kb.x;
      kWrap.style.translate = `${dx.toFixed(1)}px ${(fs * 0.12).toFixed(1)}px`;
    }
    if (hair.length) {
      const eb = ctx.box(el);
      hair[0].style.top = (kb.y - eb.y + kb.h / 2).toFixed(1) + "px";
      hair[1].style.top = (mb.y - eb.y + mb.h * 0.55).toFixed(1) + "px";
      // the setup's hairline runs from the start edge to the kicker; the payoff's from the end edge to the main line
      Object.assign(hair[0].style, rtl ? { right: "auto", left: (kb.x + kb.w - eb.x + kfs).toFixed(1) + "px", width: "200vw" } : { left: "auto", right: (eb.x + eb.w - kb.x + kfs).toFixed(1) + "px", width: "200vw" });
      Object.assign(hair[1].style, rtl ? { left: "auto", right: (eb.x + eb.w - mb.x + kfs).toFixed(1) + "px", width: "200vw" } : { right: "auto", left: (mb.x + mb.w - eb.x + kfs).toFixed(1) + "px", width: "200vw" });
    }
    // timing
    const solo = p.connective_solo ? 0.4 : 0;
    const tK = at, tMainBase = at + solo + p.gap;
    const tMain = p.sync === "spoken" ? Math.min(tMainBase + 1.5, Math.max(tMainBase, ctx.word(mark ? "" : main.split(/\s+/)[0], tMainBase))) : tMainBase;
    const tSub = tMain + 0.3;
    ctx.sfx(tK, "tap", 0.2); ctx.sfx(tMain, "tap", 0.35);
    const mainDur = mainIn === "blur-tint" ? 0.45 : 0.4;
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // power3.out
    // the solo beat: the connective, alone and centred over the line, before the main arrives
    let soloEl = null;
    if (solo) {
      soloEl = document.createElement("span"); soloEl.textContent = kick;
      Object.assign(soloEl.style, { position: "absolute", left: "0", right: "0", top: "50%", translate: "0 -50%", textAlign: "center", font: `var(--x-head-weight) ${(kfs * 1.6).toFixed(1)}px/1.1 var(--x-head-font)`, color: "var(--x-ink)", pointerEvents: "none" });
      el.append(soloEl);
    }
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = String(1 - leave);
        // solo connective
        if (soloEl) soloEl.style.opacity = (ML.lin(t, tK, tK + 0.12) * (1 - ML.lin(t, tK + solo, tK + solo + 0.12))).toFixed(4);
        const tk0 = tK + solo;
        // kicker (and its rule)
        const k = ML.out(t, tk0, tk0 + 0.18);
        kText.style.opacity = k.toFixed(4);
        kText.style.translate = `0 ${((1 - k) * kfs * 0.3).toFixed(2)}px`;
        if (rule) { const r = ML.out(t, tk0, tk0 + 0.3); rule.style.transform = `scaleX(${r.toFixed(4)})`; }
        // main
        const m = p3(t, tMain, tMain + mainDur), vis = t >= tMain ? Math.min(1, m * 1.4) : 0;
        mainEl.style.opacity = vis.toFixed(4);
        if (mainIn === "blur-tint") {
          mainEl.style.filter = m < 1 ? `blur(${((1 - m) * 10).toFixed(2)}px)` : "none";
          mainEl.style.translate = `${((1 - m) * 12 * (rtl ? -1 : 1)).toFixed(2)}px 0`;
          mainEl.style.color = `color-mix(in srgb, var(--x-accent) ${(12 + 88 * m).toFixed(1)}%, var(--x-ground))`;
        } else {
          mainEl.style.filter = mainIn === "rise-blur" && m < 1 ? `blur(${((1 - m) * 6).toFixed(2)}px)` : "none";
          mainEl.style.translate = `0 ${((1 - m) * 26).toFixed(2)}px`;
        }
        if (subEl) { const s = ML.out(t, tSub, tSub + 0.3); subEl.style.opacity = s.toFixed(4); subEl.style.translate = `0 ${((1 - s) * 8).toFixed(2)}px`; }
        if (hair.length) { const h = ML.out(t, tk0, tk0 + 0.5), h2 = ML.out(t, tMain, tMain + 0.5); hair[0].style.opacity = (h * 0.9).toFixed(4); hair[1].style.opacity = (h2 * 0.9).toFixed(4); }
      },
    };
  },
});
