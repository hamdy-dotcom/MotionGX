// Long text collapse: a long ugly string (a URL, an address, a code) types out in small mono; once wider than 70% of
// the slot the line slides so the caret stays in view. Then the line squeezes to nothing toward its centre (scaleX
// 1 -> 0.05, blur 0 -> 10, 0.35 s power3.in) and a neat pill (dark glass, full radius, a mark + the short text with
// its key word in the accent) or a solid accent button grows out of the same point (0.8 -> 1, 0.4 s back.out) while
// its text types. Optional kicker above in tiny mono with the character count in the accent. The long string always
// reads left to right (it is a URL / code); the pill holds the target's own words, whole, so Arabic is safe.
// Source: own rebuild of prompt-motion reference steventey-claude-opus-5-5-feels.
ML.define({
  id: "text-emphasis.long-text-collapse",
  category: "text-emphasis",
  name: "Long text collapses into a neat pill",
  does: "A long ugly string (URL, address, code) types out and scrolls off the edge, then compresses into a short pill or button.",
  says: ["simplicity", "before-after", "tech"],
  energy: 3,
  targets: ["line", "label", "card"],
  duration: [1.5, 4],
  params: {
    end: { type: "choice", options: ["pill", "button"], default: "pill" },
    rate: { type: "number", range: [20, 80], default: 40, unit: "chars/s" },
    kicker: { type: "bool", default: true },
    long: { type: "text", default: "" },
    short: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-click", "text-emphasis.offset-shadow"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:steventey-claude-opus-5-5-feels", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const shortText = (p.short || el.textContent || "").trim().replace(/\s+/g, " ");
    // the long string: given, or a believable tracking link built from the short text
    const slug = shortText.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "link";
    const hex = (k, len) => Array.from({ length: len }, (_, i) => "0123456789abcdef"[Math.floor(ML.rnd(i + k * 31, 13) * 16)]).join("");
    const latin = /^[a-z0-9-]+$/.test(slug) ? slug : "p-" + hex(9, 6);
    // (a path, not a made-up domain: no invented address ever shows in a brand's film)
    const longText = p.long || `/checkout/session/${hex(1, 12)}/${latin}?ref=${hex(2, 8)}&utm_source=social&utm_medium=video&utm_campaign=${latin}-${hex(3, 6)}&cid=${hex(4, 16)}`;
    const chars = Array.from(longText);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 104;
    // sized from the target, but a label or a card's small text still has to carry a readable line and pill
    const st = ctx.stage, unit = Math.min(st.offsetWidth, st.offsetHeight) / 1080;
    const S = Math.max(fs / 104, 0.62 * unit);
    const W = Math.max(el.clientWidth, (el.parentElement ? el.parentElement.clientWidth : 0) * 0.6) || 900;
    el.textContent = "";
    Object.assign(el.style, { width: W + "px", flex: "none", textTransform: "none", letterSpacing: "0", display: "grid", justifyItems: "center", alignContent: "center", rowGap: `${(14 * S).toFixed(1)}px` });
    // kicker: tiny mono, the count in the accent
    const kick = doc.createElement("div");
    Object.assign(kick.style, { font: `var(--x-label-weight) ${(22 * S).toFixed(1)}px var(--x-label-font)`, letterSpacing: rtl ? "0" : "var(--x-label-track)", textTransform: rtl ? "none" : "var(--x-label-case)", color: "var(--x-dim)", whiteSpace: "nowrap" });
    const count = doc.createElement("span"); count.style.color = "var(--x-accent)";
    kick.append(count, doc.createTextNode(rtl ? " حرف" : " chars"));
    if (p.kicker) el.append(kick);
    // the stack: the long line and the pill in one cell
    const cell = doc.createElement("div");
    Object.assign(cell.style, { display: "grid", width: W + "px", justifyItems: "center", alignItems: "center" });
    el.append(cell);
    const win = doc.createElement("div");
    win.dir = "ltr";
    Object.assign(win.style, { gridArea: "1 / 1", width: W + "px", overflow: "hidden", textAlign: "left", font: `500 ${(30 * S).toFixed(1)}px/1.4 var(--x-mono-font)`, color: "var(--x-ink)", padding: `${(6 * S).toFixed(1)}px 0` });
    const line = doc.createElement("div");
    Object.assign(line.style, { display: "inline-block", whiteSpace: "pre", transformOrigin: "50% 50%" });
    const typedEl = doc.createElement("span");
    const caret = doc.createElement("span");
    Object.assign(caret.style, { display: "inline-block", width: "0.55em", height: "1.1em", verticalAlign: "-0.18em", background: "var(--x-accent)", marginLeft: "0.05em" });
    line.append(typedEl, caret);
    win.append(line);
    cell.append(win);
    // the pill / button
    const pill = doc.createElement("div");
    const button = p.end === "button";
    Object.assign(pill.style, {
      gridArea: "1 / 1", display: "inline-flex", alignItems: "center", gap: `${(16 * S).toFixed(1)}px`, whiteSpace: "nowrap",
      padding: `${(16 * S).toFixed(1)}px ${(34 * S).toFixed(1)}px`, borderRadius: button ? "var(--x-radius)" : "var(--x-radius-s)",
      background: button ? "var(--x-accent)" : "color-mix(in srgb, var(--x-ink) 88%, transparent)",
      color: button ? "var(--x-accent-ink)" : "var(--x-panel)", boxShadow: "var(--x-shadow)",
      font: `var(--x-head-weight) ${(52 * S).toFixed(1)}px/1.15 var(--x-head-font)`, letterSpacing: ML.ARABIC.test(shortText) ? "0" : "var(--x-head-track)",
    });
    const mark = doc.createElement("span");
    Object.assign(mark.style, { width: "0.8em", height: "0.8em", flex: "none", borderRadius: "28%", background: button ? "var(--x-accent-ink)" : "var(--x-accent)" });
    const txt = doc.createElement("span");
    const words = shortText.split(" ");
    const wordEls = words.map((w, i) => { const s = doc.createElement("span"); s.textContent = (i ? " " : "") + w; if (i === words.length - 1 && words.length > 1 && !button) s.style.color = "color-mix(in srgb, var(--x-accent) 55%, var(--x-panel))"; /* the accent, lifted toward the pill's own text so it reads on the pill */ txt.append(s); return s; });
    pill.append(mark, txt);
    if (button) { const ar = doc.createElement("span"); ar.textContent = rtl ? "←" : "→"; pill.append(ar); }
    cell.append(pill);
    // the pill fits the slot
    const maxW = W * 0.96;
    if (pill.offsetWidth > maxW) pill.style.fontSize = `${((52 * S * maxW) / pill.offsetWidth).toFixed(1)}px`;
    // measure the full line's width per character (mono)
    typedEl.textContent = longText;
    const fullW = typedEl.offsetWidth || 1, cw = fullW / chars.length;
    typedEl.textContent = "";
    const winW = win.clientWidth || W;
    // timing: typing, a short hold, the squeeze, the pill
    const span = Math.max(1, end - at);
    const typeD = Math.min(chars.length / p.rate, span * 0.45, Math.max(0.25, span - 1.1)); // squeeze + pill always fit
    const t1 = at + typeD, sq = t1 + 0.25, pop = sq + 0.3;
    for (let k = 0; k < Math.floor(typeD / 0.3); k++) ctx.sfx(at + k * 0.3, "key", 0.18);
    ctx.sfx(sq, "whoosh.soft", 0.25);
    ctx.sfx(pop, "pop", 0.35);
    // the pill's text types in by words (whole words: Arabic-safe)
    const wordTimes = words.map((_, i) => pop + 0.12 + (i * 0.25) / Math.max(1, words.length));
    return {
      draw(t) {
        const shown = Math.round(chars.length * ML.lin(t, at, t1));
        typedEl.textContent = chars.slice(0, shown).join("");
        count.textContent = String(shown);
        kick.style.opacity = ML.lin(t, at - 0.05, at + 0.15).toFixed(4);
        caret.style.opacity = t < at ? "0" : t < t1 ? "1" : String(ML.blink(t - t1, 0.5));
        // keep the caret in view once the line is past 70% of the window
        const w = shown * cw, keep = winW * 0.7;
        const scroll = Math.max(0, w - keep);
        const q = ML.lin(t, sq, sq + 0.35), qe = q * q * q; // power3.in
        const sx = 1 - 0.95 * qe;
        // squeeze toward the window's centre
        const visibleCentre = scroll + Math.min(w, winW) / 2;
        line.style.transformOrigin = `${visibleCentre.toFixed(1)}px 50%`;
        line.style.transform = `translateX(${(-scroll + (winW / 2 - (visibleCentre - scroll)) * qe).toFixed(2)}px) scaleX(${sx.toFixed(4)})`;
        line.style.filter = qe > 0.01 ? `blur(${(10 * qe).toFixed(2)}px)` : "none";
        win.style.visibility = q >= 1 || t < at - 0.001 ? "hidden" : "visible";
        // the pill grows out of the same point
        const b = ML.back(t, pop, pop + 0.4, 1.7);
        const on = t >= pop;
        pill.style.visibility = on ? "visible" : "hidden";
        pill.style.opacity = ML.clamp((t - pop) / 0.12).toFixed(4);
        pill.style.transform = `scale(${(0.8 + 0.2 * b).toFixed(4)})`;
        wordEls.forEach((s, i) => { s.style.opacity = t >= wordTimes[i] ? "1" : "0"; });
      },
    };
  },
});
