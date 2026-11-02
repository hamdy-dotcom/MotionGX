// Caption pill: the spoken line in a rounded pill (the look's panel at 92 %, or its ink when "dark"; a soft shadow),
// optionally with a small tracked-caps kicker in the accent above it ("• LABEL") and a smaller dim second line under
// it (a translation or the sub-line). The pill comes in y -12 → 0 with opacity over 0.4 s power3.out; on each new line
// its width eases to fit the text (0.3 s power2.out) while the text cross-fades (0.25 s) — or, with word_reveal, the
// old words blur out together (0.2 s) and the new ones come in blur 8 → 0, y 6 → 0, 0.25 s, 0.12 s apart. It leaves
// with opacity → 0 and y -6 over 0.3 s. Sits bottom centre, top centre or bottom corner (bottom-left; bottom-right in
// Arabic). The lines are what the voice says inside the run, else the slot's own text. Arabic: whole words, RTL.
// Source: prompt-motion buildfastwithai-opus-5-5-high-just, amol909s-opus-5-5-on-medium, lemomo-ai-lemo-opuscar-skill-
// opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.caption-pill",
  category: "kinetic",
  name: "Caption pill",
  does: "A rounded caption pill holds the spoken line (optionally a kicker above or a translation below) and swaps or refills per line.",
  says: ["story", "proof"],
  energy: 1,
  targets: ["line", "label"],
  duration: [1, 6],
  params: {
    position: { type: "choice", options: ["bottom", "top", "bottom-left"], default: "bottom" },
    style: { type: "choice", options: ["light", "dark"], default: "light" },
    second_line: { type: "bool", default: false },
    word_reveal: { type: "bool", default: false },
    kicker: { type: "bool", default: false },
  },
  pairs: ["device.phone-screen", "camera.push-in", "ui.type-into-field"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:buildfastwithai-opus-5-5-high-just", license: "reference", note: "also amol909s-opus-5-5-on-medium and lemomo-ai-lemo-opuscar-skill-opus-5-5; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const k = Math.min(f.W, f.H) / 1080;
    const maxChars = f.tall ? 28 : 40;
    const textOf = (n) => (n && n.textContent ? n.textContent.replace(/\s+/g, " ").trim() : "");
    // ── the lines ──
    const said = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t < end - 0.3);
    let lines = [];
    if (said.length) {
      let cur = [];
      const flush = () => { if (cur.length) lines.push({ t: cur[0].t, text: cur.map((x) => x.w).join(" ") }); cur = []; };
      for (const w of said) { if (cur.length && cur.map((x) => x.w).join(" ").length + w.w.length + 1 > maxChars) flush(); cur.push(w); if (/[.!?؟:]$/.test(w.w)) flush(); }
      flush();
    } else {
      const ws = textOf(el).split(" ").filter(Boolean);
      if (!ws.length) return null;
      const chunks = [];
      let cur = [];
      for (const w of ws) { if (cur.length && cur.join(" ").length + w.length + 1 > maxChars) { chunks.push(cur); cur = []; } cur.push(w); }
      if (cur.length) chunks.push(cur);
      const span = (end - at - 0.4) / chunks.length;
      lines = chunks.map((c, i) => ({ t: at + i * span, text: c.join(" ") }));
    }
    lines[0].t = at;
    for (let i = 1; i < lines.length; i++) lines[i].t = Math.max(lines[i].t, lines[i - 1].t + 0.8);
    lines = lines.filter((l, i) => i === 0 || l.t < end - 0.6);
    ctx.sfx(at, "pop.soft", 0.25);
    // ── the pill ──
    const dark = p.style === "dark";
    const pill = doc.createElement("div");
    const padY = 18 * k, padX = 32 * k;
    Object.assign(pill.style, {
      position: "absolute", zIndex: "9", pointerEvents: "none", boxSizing: "border-box", overflow: "hidden",
      padding: `${padY}px ${padX}px`, borderRadius: `min(var(--x-radius), ${14 * k}px)`,
      background: dark ? "var(--x-ink)" : "color-mix(in srgb, var(--x-panel) 92%, transparent)",
      color: dark ? "var(--x-ground)" : "var(--x-ink)", boxShadow: "var(--x-shadow)",
      display: "flex", flexDirection: "column", alignItems: p.position === "bottom-left" ? "flex-start" : "center", gap: `${6 * k}px`,
      direction: rtl ? "rtl" : "ltr", textAlign: p.position === "bottom-left" ? "start" : "center",
    });
    const kick = p.kicker ? textOf(el && el.dataset && el.dataset.kicker ? { textContent: el.dataset.kicker } : host.querySelector(".ml-label")) : "";
    let kickEl = null;
    if (kick) {
      kickEl = doc.createElement("div");
      kickEl.textContent = "• " + kick;
      Object.assign(kickEl.style, { fontFamily: "var(--x-label-font)", fontWeight: "var(--x-label-weight)", fontSize: (20 * k).toFixed(1) + "px", letterSpacing: rtl ? "0" : "var(--x-label-track)", textTransform: rtl ? "none" : "uppercase", color: "var(--x-accent)", whiteSpace: "nowrap" });
      pill.append(kickEl);
    }
    const stack = doc.createElement("div");
    Object.assign(stack.style, { display: "grid", justifyItems: p.position === "bottom-left" ? "start" : "center" });
    pill.append(stack);
    const lineEls = lines.map((l) => {
      const e = doc.createElement("div");
      Object.assign(e.style, { gridArea: "1 / 1", fontFamily: "var(--x-body-font)", fontWeight: "600", fontSize: (36 * k).toFixed(1) + "px", lineHeight: "1.25", whiteSpace: "nowrap" });
      e.textContent = l.text;
      stack.append(e);
      return e;
    });
    const second = p.second_line ? textOf(el && el.dataset && el.dataset.second ? { textContent: el.dataset.second } : host.querySelector(".ml-sub")) : "";
    let secEl = null;
    if (second) {
      secEl = doc.createElement("div");
      secEl.textContent = second;
      Object.assign(secEl.style, { fontFamily: "var(--x-body-font)", fontSize: (24 * k).toFixed(1) + "px", lineHeight: "1.3", color: dark ? "color-mix(in srgb, var(--x-ground) 65%, transparent)" : "var(--x-dim)", whiteSpace: "nowrap" });
      pill.append(secEl);
    }
    host.append(pill);
    // measure: each line's own width (shrunk to fit the frame), the pill's width per line
    const room = f.W - f.m * 2 - padX * 2;
    const fitW = (e) => { const w = e.scrollWidth; if (w > room) { e.style.fontSize = ((parseFloat(e.style.fontSize) * room) / w).toFixed(2) + "px"; } return Math.min(w, room); };
    const fixed = Math.max(kickEl ? fitW(kickEl) : 0, secEl ? fitW(secEl) : 0);
    const widths = lineEls.map((e) => Math.max(fitW(e), fixed) + padX * 2 + 2);
    const pillH = pill.offsetHeight;
    // place
    const yTop = p.position === "top" ? f.safe.y : f.safe.y + f.safe.h - pillH;
    pill.style.top = yTop.toFixed(1) + "px";
    const words = p.word_reveal ? lineEls.map((e) => ML.split(e, "words")) : [];
    const q3 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 4); // power3.out
    return {
      draw(t) {
        if (el && el !== ctx.stage) el.style.opacity = t >= at - 1e-6 && t < end ? "0" : "";
        const on = t >= at - 1e-6 && t < end;
        pill.style.display = on ? "flex" : "none"; // display, not visibility: its lines set themselves visible
        if (!on) return;
        // in / out of the whole pill
        const inn = q3(t, at, 0.4), out = ML.out(t, end - 0.32, end - 0.02);
        pill.style.opacity = (inn * (1 - out)).toFixed(4);
        pill.style.translate = `0 ${((1 - inn) * -12 * k - out * 6 * k).toFixed(2)}px`;
        // the current line, the width easing from the last one's
        let i = 0;
        for (let j = 0; j < lines.length; j++) if (t >= lines[j].t) i = j;
        const w = i > 0 ? widths[i - 1] + (widths[i] - widths[i - 1]) * ML.out(t, lines[i].t, lines[i].t + 0.3) : widths[0];
        pill.style.width = w.toFixed(2) + "px";
        if (p.position === "bottom-left") { pill.style.left = rtl ? "auto" : f.m + "px"; pill.style.right = rtl ? f.m + "px" : "auto"; }
        else pill.style.left = ((f.W - w) / 2).toFixed(2) + "px";
        lineEls.forEach((e, j) => {
          const a = lines[j].t, b = j + 1 < lines.length ? lines[j + 1].t : Infinity;
          if (!p.word_reveal) {
            // a 0.25 s cross-fade at each swap
            const v = (j === 0 ? 1 : ML.lin(t, a, a + 0.25)) * (1 - ML.lin(t, b, b + 0.25));
            e.style.opacity = v.toFixed(4);
            e.style.visibility = v > 0.001 ? "visible" : "hidden";
            return;
          }
          // word reveal: the old words blur out together, the new ones arrive one by one
          const gone = ML.lin(t, b - 0.2, b);
          e.style.visibility = t >= a - 1e-6 && t < b ? "visible" : "hidden";
          e.style.opacity = (1 - gone).toFixed(4);
          e.style.filter = gone > 0.001 ? `blur(${(gone * 8).toFixed(2)}px)` : "none";
          words[j].forEach((s, n) => {
            const u = ML.out(t, a + 0.05 + n * 0.12, a + 0.3 + n * 0.12);
            s.style.opacity = u.toFixed(4);
            s.style.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(2)}px)` : "none";
            s.style.translate = u < 1 ? `0 ${((1 - u) * 6 * k).toFixed(2)}px` : "none";
          });
        });
      },
    };
  },
});
