// Blur morph swap: a word (or a numeral) blurs and ghosts into its replacement in place — a double exposure midway.
// Old: blur 0 → b, opacity 1 → 0, scaleX 1 → 1.1 over ~0.8 × speed (0.25–0.3 s). New, on the same baseline, starting
// 0.1 s before the old is gone: blur b → 0, opacity 0 → 1, y 10 → 0 over `speed`. The two sit in one inline box whose
// width tweens from the old word's to the new one's (0.3 s power2.inOut), so the surrounding words reflow smoothly.
// Numeral → words: a bold number becomes its spelled-out value in the look's italic serif (and back for words →
// numeral), with an optional tracked-caps caption fading in 0.2 s later under it. Opposites read best (Stop → Start):
// with no `to` given, a known opposite is used. Arabic words swap whole. A replacement too wide for the line is set
// smaller until it fits, on the same baseline. The word's own span stays the box, so an entrance on the line still
// carries it.
// Source: prompt-motion sudiyasa-celerating-100-eyezonbot-users, sudo-kiran-i-have-asked-opus (reference) — our own code.
ML.define({
  id: "text-emphasis.blur-morph-swap",
  category: "text-emphasis",
  name: "Word dissolves into another through a blur",
  does: "A word (or a numeral) blurs and ghosts into its replacement in place, a double exposure midway.",
  says: ["change", "before-after", "luxury", "result"],
  energy: 3,
  targets: ["word", "number"],
  duration: [0.8, 2.5],
  params: {
    content: { type: "choice", options: ["word", "numeral-to-words", "words-to-numeral"], default: "word" },
    blur: { type: "number", range: [4, 14], default: 10, unit: "px" },
    speed: { type: "number", range: [0.25, 0.6], default: 0.35, unit: "s" },
    "style-contrast": { type: "bool", default: false },
    caption: { type: "bool", default: false },
    word: { type: "text", default: "" },
    to: { type: "text", default: "" },
    "caption-text": { type: "text", default: "" },
    delay: { type: "number", range: [0, 1.5], default: 0.35, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sudiyasa-celerating-100-eyezonbot-users", license: "reference", note: "our own rebuild; also sudo-kiran-i-have-asked-opus" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const roomW = (getComputedStyle(el).display.startsWith("inline") ? el.parentElement : el).clientWidth || el.offsetWidth;
    // ── number words (English, Modern Standard Arabic) ──
    const EN1 = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
    const EN10 = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
    const en = (n) => {
      if (n < 20) return EN1[n];
      if (n < 100) return EN10[Math.floor(n / 10)] + (n % 10 ? "-" + EN1[n % 10] : "");
      if (n < 1000) return EN1[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + en(n % 100) : "");
      if (n < 1e6) return en(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + en(n % 1000) : "");
      return en(Math.floor(n / 1e6)) + " million" + (n % 1e6 ? " " + en(n % 1e6) : "");
    };
    const AR1 = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر"];
    const AR10 = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
    const AR100 = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];
    const ar = (n) => {
      if (n <= 12) return AR1[n];
      if (n < 20) return AR1[n % 10] + " عشر";
      if (n < 100) return (n % 10 ? AR1[n % 10] + " و" : "") + AR10[Math.floor(n / 10)];
      if (n < 1000) return AR100[Math.floor(n / 100)] + (n % 100 ? " و" + ar(n % 100) : "");
      if (n < 1e6) { const k = Math.floor(n / 1000), r = n % 1000; const th = k === 1 ? "ألف" : k === 2 ? "ألفان" : k <= 10 ? ar(k) + " آلاف" : ar(k) + " ألف"; return th + (r ? " و" + ar(r) : ""); }
      return String(n);
    };
    const toLatinDigits = (s) => s.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    // "4,500", "$20", "30%": the value and its unit; a decimal has no short spoken form, so it stays a numeral
    const numOf = (s) => { const m = toLatinDigits(s).trim().match(/^(\$)?\s*(\d[\d,٬\s]*)\s*([%٪])?$/); return m ? { n: parseInt(m[2].replace(/[,٬\s]/g, ""), 10), money: !!m[1], pct: !!m[3] } : null; };
    const spell = (v) => (rtl ? ar(v.n) + (v.pct ? " بالمئة" : v.money ? " دولار" : "") : en(v.n) + (v.pct ? " percent" : v.money ? " dollars" : ""));
    const parseEn = (s) => {
      const map = {}; EN1.forEach((w, i) => (map[w] = i)); EN10.forEach((w, i) => w.trim() && (map[w] = i * 10));
      let total = 0, cur = 0, any = false;
      for (const w of s.toLowerCase().replace(/-/g, " ").split(/\s+/)) {
        if (w in map) { cur += map[w]; any = true; } else if (w === "hundred") cur *= 100; else if (w === "thousand") { total += cur * 1000; cur = 0; } else if (w === "million") { total += cur * 1e6; cur = 0; } else if (w !== "and") return null;
      }
      return any ? total + cur : null;
    };
    let arMap = null;
    const parseAr = (s) => {
      if (!ML.ARABIC.test(s)) return null;
      if (!arMap) { arMap = new Map(); for (let n = 0; n < 10000; n++) arMap.set(ML.plain(ar(n)), n); }
      return arMap.get(ML.plain(s)) ?? null;
    };
    const OPP = { stop: "start", start: "stop", no: "yes", yes: "no", old: "new", new: "old", slow: "fast", fast: "slow", hard: "easy", easy: "hard", later: "now", never: "always", more: "less", less: "more", before: "after", after: "before", lose: "win", manual: "auto", "قديم": "جديد", "صعب": "سهل", "بطيء": "سريع", "بعدين": "دلوقتي" };
    const pickWord = () => {
      const q = ML.plain(p.word || "");
      if (q) { const w = words.find((x) => ML.plain(x.textContent).includes(q)); if (w) return w; }
      if (p.content === "numeral-to-words") { const w = words.find((x) => /[\d٠-٩]/.test(x.textContent)); if (w) return w; }
      return [...words].reverse().find((x) => ML.plain(x.textContent) in OPP) || words[words.length - 1];
    };
    let oldW = pickWord();
    // the run of words to replace: words → numeral takes the whole spelled run
    let run = [oldW];
    if (p.content === "words-to-numeral") {
      let best = null;
      for (let i = 0; i < words.length; i++) for (let j = i; j < words.length; j++) { const s = words.slice(i, j + 1).map((w) => w.textContent).join(" "), v = parseAr(s) ?? parseEn(s); if (v != null && (!best || j - i > best[1] - best[0])) best = [i, j, v]; }
      if (best) run = words.slice(best[0], best[1] + 1);
    }
    const oldText = run.map((w) => w.textContent).join(" ");
    const tail = (oldText.match(/[.,،؛؟?!…:]+$/) || [""])[0];
    let newText = String(p.to || "").trim();
    if (!newText) {
      if (p.content === "numeral-to-words") { const v = numOf(oldText.replace(tail, "")); newText = v ? spell(v) : oldText; }
      else if (p.content === "words-to-numeral") { const s = oldText.replace(tail, ""), n = parseAr(s) ?? parseEn(s); newText = n != null ? n.toLocaleString("en-US") : oldText; }
      else { const o = OPP[ML.plain(oldText)]; newText = o || (rtl ? "دلوقتي" : "now"); const cap = oldText.charAt(0); if (o && cap !== cap.toLowerCase()) newText = newText.charAt(0).toUpperCase() + newText.slice(1); }
      newText += tail && !newText.endsWith(tail) ? tail : "";
    }
    // one inline box holding both, its width tweening between them (the neighbours reflow with it)
    const box = run[0];
    Object.assign(box.style, { display: "inline-block", position: "relative", whiteSpace: "nowrap", verticalAlign: "baseline" });
    box.textContent = "";
    // remove the rest of the run (and the spaces between) — they are replaced as one
    for (let i = 1; i < run.length; i++) { const prev = run[i].previousSibling; if (prev && prev.nodeType === 3 && /^\s+$/.test(prev.textContent)) prev.remove(); run[i].remove(); }
    const a = document.createElement("span"), b = document.createElement("span");
    a.textContent = oldText; b.textContent = newText;
    const contrast = p["style-contrast"] || p.content === "numeral-to-words";
    const boldNum = p.content === "words-to-numeral";
    Object.assign(a.style, { display: "inline-block", whiteSpace: "nowrap", transformOrigin: "50% 60%" });
    Object.assign(b.style, { display: "inline-block", whiteSpace: "nowrap", position: "absolute", top: "0", insetInlineStart: "0" });
    if (contrast) Object.assign(b.style, { fontFamily: "var(--x-serif-font)", fontStyle: ML.ARABIC.test(newText) ? "normal" : "italic", fontWeight: "400" });
    if (boldNum) Object.assign(b.style, { fontFamily: "var(--x-head-font)", fontWeight: "800", fontStyle: "normal" });
    box.append(a, b);
    // widths in el px: the old word in flow (it keeps the box's baseline), the new one measured in flow, then absolute
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    b.style.display = "none";
    const WA = a.getBoundingClientRect().width / k;
    b.style.display = "inline-block"; b.style.position = "static"; a.style.display = "none";
    let WB = b.getBoundingClientRect().width / k;
    if (WB > roomW) { b.style.fontSize = ((parseFloat(getComputedStyle(b).fontSize) * roomW) / WB).toFixed(2) + "px"; WB = b.getBoundingClientRect().width / k; }
    // the same baseline whatever the face or size: the old word's, measured in the box, against the new word's in its own
    const baseIn = (span, of) => { const pr = document.createElement("i"); Object.assign(pr.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" }); span.append(pr); const y = (pr.getBoundingClientRect().top - of.getBoundingClientRect().top) / k; pr.remove(); return y; };
    const baseB = baseIn(b, b);
    a.style.display = "inline-block"; b.style.position = "absolute";
    const baseA = baseIn(a, box), sizeB = parseFloat(getComputedStyle(b).fontSize);
    b.style.top = (baseA - baseB).toFixed(2) + "px";
    let cap = null;
    if (p.caption) {
      cap = document.createElement("span");
      cap.textContent = String(p["caption-text"] || "").trim() || oldText;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 56, ar1 = ML.ARABIC.test(cap.textContent);
      Object.assign(cap.style, { position: "absolute", top: (baseA + sizeB * 0.34).toFixed(2) + "px", insetInlineStart: "0", width: "max-content", font: `var(--x-label-weight) ${Math.max(18, fs * 0.18).toFixed(1)}px var(--x-label-font)`, letterSpacing: ar1 ? "0" : "var(--x-label-track)", textTransform: ar1 ? "none" : "var(--x-label-case)", color: "var(--x-dim)", opacity: "0" });
      box.append(cap);
    }
    const sp = ML.clamp(p.speed, 0.15, 1), dOld = Math.max(0.2, sp * 0.8);
    const said = ctx.word(oldText, at);
    const T = Math.max(at + p.delay, Math.min(said + 0.25, end - sp - 0.4));
    const nAt = T + dOld - 0.1;
    ctx.sfx(T, "whoosh.soft", 0.28);
    const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    return {
      draw(t) {
        const uo = ML.out(t, T, T + dOld);
        a.style.opacity = (1 - uo).toFixed(4);
        a.style.filter = uo > 0.001 ? `blur(${(uo * p.blur).toFixed(2)}px)` : "none";
        a.style.scale = uo > 0.001 ? `${(1 + 0.1 * uo).toFixed(4)} 1` : "none";
        const un = ML.out(t, nAt, nAt + sp);
        b.style.opacity = un.toFixed(4);
        b.style.filter = un < 0.999 ? `blur(${((1 - un) * p.blur).toFixed(2)}px)` : "none";
        b.style.translate = un < 0.999 ? `0 ${((1 - un) * 10).toFixed(2)}px` : "none";
        const wk = p2io(ML.lin(t, T + dOld / 2 - 0.15, T + dOld / 2 + 0.15));
        box.style.width = (WA + (WB - WA) * wk).toFixed(2) + "px";
        if (cap) cap.style.opacity = ML.out(t, nAt + 0.2, nAt + 0.4).toFixed(4);
      },
    };
  },
});
