// Kicker with rule: a small tracked label (eyebrow, chapter name, subtitle) appears with thin rules drawing out beside
// or under it. Eyebrow: a row (gap ~0.6em) with a 28–36 px × 1–2 px accent rule (or a small square) that scales from
// its start edge in ~0.35 s (power2.out), then the label ('01 / Name' in tabular figures when numbered) fades / rises
// 6 px over 0.3 s from 0.1 s later. Flanked: line + label + line, the lines growing outward from the label while the
// tracking settles 0.6em → the look's. Banner: two rules start at the text edges and extend outward ending in small
// arrowheads, the label typed at 20 chars/s; it leaves by retracting the rules. Underline: heavy caps with letters
// rising in a 0.03 s stagger over a 3 px underline drawn from the start. On a rule: the line sits on the left end of a
// rule and builds word by word (opacity + 6 px, 0.2 s, ~0.35 s a beat). RTL: rules on the right, drawing right to left;
// no tracking animation on Arabic, letters never split.
// Source: MengTo/Skills web-design/scroll-world-storytelling (the .eyebrow: inline-flex, gap 12px, 36×1px rule,
// uppercase .2em, '01 / Destination') and gsap-scrolltrigger-storytelling (MIT); banner / underline / on-rule from
// prompt-motion (kangaroohere, 0xevinho, gdgtify), rebuilt as our own code.
ML.define({
  id: "text-in.kicker-rule",
  category: "text-in",
  name: "Kicker with rule",
  does: "A small tracked label (eyebrow, chapter name, subtitle) appears with thin rules drawing out beside or under it.",
  says: ["step", "precision", "brand", "luxury", "arrival", "story"],
  energy: 1,
  targets: ["label", "line", "headline"],
  duration: [0.5, 1.5],
  params: {
    layout: { type: "choice", options: ["eyebrow", "flanked", "banner", "underline", "on-rule"], default: "eyebrow" },
    rule_length: { type: "number", range: [20, 160], default: 32, unit: "px" },
    rule_weight: { type: "number", range: [1, 3], default: 1, unit: "px" },
    marker: { type: "choice", options: ["rule", "square", "arrow"], default: "rule" },
    numbering: { type: "bool", default: false },
    number: { type: "number", range: [1, 99], default: 1 },
    tracking_settle: { type: "bool", default: true },
    label_in: { type: "choice", options: ["fade-rise", "type", "word-by-word", "letters"], default: "fade-rise" },
    draw: { type: "number", range: [0.3, 0.6], default: 0.4, unit: "s" },
  },
  pairs: ["text-in.kicker-lead", "text-in.punchline"],
  avoid: ["urgency", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling", license: "MIT", note: "eyebrow rule + label; banner / underline / on-rule variants rebuilt from prompt-motion references" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 22;
    const k = fs / 12; // the sources are drawn for an 11–12 px label: everything scales with the label
    const len = p.rule_length * k, weight = Math.max(1, p.rule_weight * k * 0.6);
    const arabic = ML.ARABIC.test(el.textContent);
    const baseTrack = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    const text = el.textContent.trim();
    el.textContent = "";
    const label = document.createElement("span");
    label.style.display = "inline-block"; label.style.whiteSpace = "nowrap";
    if (p.numbering) {
      const n = document.createElement("span");
      n.textContent = `${String(Math.round(p.number)).padStart(2, "0")} / `;
      n.style.fontVariantNumeric = "tabular-nums"; n.style.color = "var(--x-accent)";
      label.append(n);
    }
    const body = document.createElement("span"); body.textContent = text; label.append(body);
    const row = document.createElement("span");
    Object.assign(row.style, { display: "inline-flex", alignItems: "center", gap: (fs * 0.6).toFixed(1) + "px", position: "relative", whiteSpace: "nowrap" });
    const startO = rtl ? "right center" : "left center", endO = rtl ? "left center" : "right center";
    const mkRule = (w, origin) => { const r = document.createElement("span"); Object.assign(r.style, { display: "block", flex: "none", width: w.toFixed(1) + "px", height: weight.toFixed(1) + "px", background: "var(--x-accent)", transformOrigin: origin }); return r; };
    const arrowHead = (r, side) => {
      // a small arrowhead at the rule's outer end
      const a = document.createElement("span"), s = Math.max(4, weight * 3);
      Object.assign(a.style, { position: "absolute", top: "50%", width: s + "px", height: s + "px", borderTop: `${weight}px solid var(--x-accent)`, borderRight: `${weight}px solid var(--x-accent)`, [side]: "0", translate: `0 -50%`, rotate: side === "right" ? "45deg" : "-135deg" });
      r.style.position = "relative"; r.append(a);
    };
    const rules = []; // { el, origin-from: 'start' | 'end' | 'in' }
    let underline = null;
    if (p.layout === "eyebrow") {
      let m;
      if (p.marker === "square") { m = mkRule(weight * 6, startO); m.style.height = (weight * 6).toFixed(1) + "px"; }
      else { m = mkRule(len, startO); if (p.marker === "arrow") arrowHead(m, rtl ? "left" : "right"); }
      row.append(m, label); rules.push(m);
    } else if (p.layout === "flanked" || p.layout === "banner") {
      const L = p.layout === "banner" ? Math.max(len, 140 * k * 0.5) : len;
      // the lines grow outward from the label: the one before it from its end, the one after it from its start
      const a = mkRule(L, endO), b = mkRule(L, startO);
      if (p.layout === "banner" || p.marker === "arrow") { arrowHead(a, rtl ? "right" : "left"); arrowHead(b, rtl ? "left" : "right"); }
      row.append(a, label, b); rules.push(a, b);
    } else if (p.layout === "underline") {
      Object.assign(row.style, { flexDirection: "column", alignItems: "flex-start", gap: (fs * 0.35).toFixed(1) + "px" });
      Object.assign(label.style, { fontWeight: "800", fontSize: (fs * 1.27).toFixed(1) + "px" });
      underline = mkRule(0, startO); underline.style.width = "100%"; underline.style.height = Math.max(2, 3 * k * 0.6).toFixed(1) + "px"; underline.style.alignSelf = "stretch";
      row.append(label, underline); rules.push(underline);
    } else {
      // on-rule: the line sits on the start end of a long rule
      Object.assign(row.style, { flexDirection: "column", alignItems: "flex-start", gap: (fs * 0.3).toFixed(1) + "px" });
      const r = mkRule(Math.max(len * 3, 120 * k * 0.6), startO);
      label.style.letterSpacing = "0.02em"; label.style.textTransform = "none";
      row.append(label, r); rules.push(r);
    }
    if (arabic) { label.style.letterSpacing = "0"; label.style.textTransform = "none"; label.style.fontFamily = "var(--x-arabic)"; } // joined letters are never spaced apart
    el.append(row);
    // how the label comes in
    const tLabel = at + 0.1, chars = Array.from(label.textContent);
    let parts = null;
    if (p.label_in === "word-by-word" || p.layout === "on-rule") parts = ML.split(body, "words");
    else if (p.label_in === "letters" || p.layout === "underline") parts = ML.split(body, "chars");
    const track0 = p.layout === "underline" ? "0.5em" : "0.6em", trackEnd = p.layout === "underline" ? "0.3em" : baseTrack;
    const settle = p.tracking_settle && !arabic && (p.layout === "flanked" || p.layout === "underline");
    const stagger = p.layout === "on-rule" || p.label_in === "word-by-word" ? 0.35 : 0.03;
    const partDur = p.layout === "on-rule" || p.label_in === "word-by-word" ? 0.2 : 0.3;
    const typeEnd = tLabel + chars.length / 20;
    ctx.sfx(at, "tap", 0.2);
    const fullText = body.textContent;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.22);
        // rules draw out (and retract on the way out)
        const r = ML.out(t, at, at + p.draw) * (1 - ML.ease(leave, 0, 1));
        for (const x of rules) x.style.transform = `scaleX(${r.toFixed(4)})`;
        const v = 1 - leave;
        if (p.label_in === "type" && !parts) {
          body.textContent = t < tLabel ? "" : ML.typed(fullText, t, tLabel, typeEnd);
          label.style.opacity = (t >= tLabel ? v : 0).toFixed(4);
        } else if (parts) {
          label.style.opacity = v.toFixed(4);
          parts.forEach((w, i) => { const u = ML.out(t, tLabel + i * stagger, tLabel + i * stagger + partDur); w.style.opacity = u.toFixed(4); w.style.translate = `0 ${((1 - u) * 6 * k * 0.5).toFixed(2)}px`; });
        } else {
          const u = ML.out(t, tLabel, tLabel + 0.3);
          label.style.opacity = (u * v).toFixed(4);
          label.style.translate = `0 ${((1 - u) * 6 * k * 0.5).toFixed(2)}px`;
        }
        if (settle) { const s = ML.out(t, tLabel, tLabel + (p.layout === "underline" ? 0.5 : 0.6)); label.style.letterSpacing = `calc(${track0} * ${(1 - s).toFixed(4)} + ${trackEnd} * ${s.toFixed(4)})`; }
        if (underline) underline.style.opacity = "1";
      },
    };
  },
});
