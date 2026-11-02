// Typewriter: the text types itself out with a caret riding the end. Deterministic: every keystroke has a time worked
// out once (rate chars/s, or a word at a time, or one char per beat = 0.25 s; seeded ±jitter; +0.05 s at a word
// boundary, +0.12 s after punctuation), squeezed if needed so typing ends before the scene does; draw(t) only counts
// how many keystrokes are behind t. Latin letters appear (hard step, or a 0.08 s fade); an Arabic word grows from its
// reading start as a clip of the whole shaped word, the clip landing on each letter's measured edge (a mark stays with
// its letter), so its letters stay joined and none is cut in half. The caret (block, bar with a glow,
// underscore, none) blinks hard at the blink rate while idle — before typing (pre-blink) and twice after it ends, then
// hides — and is solid while typing. Anchor at the reading start (layout fixed from the first frame), or centred: the
// line being typed slides so the typed part stays centred as it grows. Styles: headline, mono caption, status (mono
// caps with a seeded scramble flicker per letter and an animating ellipsis), serif annotation (italic serif with a FIG
// label), service row (words separated by dots, item by item with fade + 4 px). Accent word (the longest): serif
// italic, colour, or a brush highlight drawn behind the last line. Containers: an RPG pixel dialogue box (hard border,
// bevel, hard shadow, a tab, width opening in 4 steps, blips) or a taped paper strip (hand font, stepped at 12 fps).
// Lead-ins: mono kicker, an icon popping in beside the text, a section counter whose tracking collapses, a first-0.3 s
// blur. Extras: weight grows light-grey → bold-ink after typing (per-letter wave); backspace out before the cut.
// After: hold, clear, or move up and shrink to become a header.
// Source: prompt-motion references (quickdesignio, hbcoop, math-files, micheleharmonic, kloss-xyz, pluginplay…) and
// MengTo/Skills editorial-portfolio-chapters (MIT) — our own code.
ML.define({
  id: "text-in.typewriter",
  category: "text-in",
  name: "Typewriter",
  does: "Text types itself out character by character (or word by word) with a caret riding the end — terminal block, thin bar or underscore — from a big question to a tiny mono status line.",
  says: ["tech", "story", "precision", "time", "step", "focus", "arrival"],
  energy: 2,
  targets: ["headline", "line", "label", "list", "word"],
  duration: [1.5, 5],
  params: {
    rate: { type: "number", range: [4, 40], default: 14, unit: "chars/s" },
    unit: { type: "choice", options: ["chars", "words", "per-beat"], default: "chars" },
    char_in: { type: "choice", options: ["instant", "fade"], default: "instant" },
    jitter: { type: "number", range: [0, 0.04], default: 0, unit: "s" },
    caret: { type: "choice", options: ["block", "bar", "underscore", "none"], default: "bar" },
    caret_colour: { type: "text", default: "accent" },
    blink: { type: "number", range: [1, 2], default: 2, unit: "Hz" },
    pre_blink: { type: "number", range: [0, 1], default: 0.6, unit: "s" },
    anchor: { type: "choice", options: ["left", "centre"], default: "left" },
    style: { type: "choice", options: ["headline", "mono-caption", "status", "serif-annotation", "service-row"], default: "headline" },
    accent: { type: "choice", options: ["none", "serif-italic", "colour", "brush-highlight"], default: "none" },
    container: { type: "choice", options: ["none", "rpg-box", "paper-strip"], default: "none" },
    lead: { type: "choice", options: ["none", "kicker", "icon", "counter", "blur"], default: "none" },
    lead_text: { type: "text", default: "" },
    weight_grow: { type: "bool", default: false },
    backspace: { type: "bool", default: false },
    after: { type: "choice", options: ["hold", "clear", "move-up-shrink"], default: "hold" },
  },
  pairs: ["background.dither-grain", "text-in.scramble"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:quickdesignio-opus-5-5-this-entire", license: "reference", note: "our own deterministic rebuild of the typewriter variants seen across ~20 references" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    // only live text can be typed: an SVG or image slot stays untouched
    if (!el || el.namespaceURI !== "http://www.w3.org/1999/xhtml" || !(el.textContent || "").trim()) return null;
    const arabic = ML.ARABIC.test(el.textContent || "");
    const cs0 = getComputedStyle(el);
    if (cs0.position === "static") el.style.position = "relative";
    el.style.textWrap = "wrap";
    el.style.textAlign = p.anchor === "centre" ? "center" : "start";
    // ── the look of the field, set before anything is measured ──
    const mono = "var(--x-mono-font), var(--x-arabic)";
    if (p.style === "mono-caption" || p.style === "status") {
      Object.assign(el.style, { fontFamily: mono, fontWeight: "500", fontSize: Math.max(20, f.W * (p.style === "status" ? 0.026 : 0.022)).toFixed(1) + "px", lineHeight: "1.5" });
      if (!arabic) { el.style.textTransform = "uppercase"; el.style.letterSpacing = p.style === "status" ? "0.08em" : "0.16em"; }
      el.style.color = p.style === "status" ? "var(--x-dim)" : "color-mix(in srgb, var(--x-ink) 62%, transparent)";
    } else if (p.style === "serif-annotation") {
      // Arabic takes the serif's own Arabic face, upright: never a fake italic
      Object.assign(el.style, { fontFamily: "var(--x-serif-font, serif)", fontStyle: arabic ? "normal" : "italic", fontWeight: "400", letterSpacing: "0" });
    } else if (p.style === "service-row") {
      el.style.fontWeight = "500"; el.style.fontSize = (parseFloat(cs0.fontSize) * 0.55).toFixed(1) + "px";
    }
    if (p.container === "rpg-box") {
      Object.assign(el.style, { fontFamily: mono, fontSize: Math.min(parseFloat(getComputedStyle(el).fontSize), Math.min(f.W, f.H) * 0.052).toFixed(1) + "px", lineHeight: "1.35", padding: "0.55em 0.75em", background: "var(--x-panel)", border: "3px solid var(--x-ink)", borderRadius: "4px", boxShadow: "inset 0 -0.14em 0 var(--x-line), inset 0 0.08em 0 var(--x-panel-2), 4px 4px 0 var(--x-ink)", letterSpacing: "0", textTransform: "none" });
    } else if (p.container === "paper-strip") {
      Object.assign(el.style, { width: "90%", marginInline: "auto", boxSizing: "border-box", padding: "0.4em 0.6em", background: "var(--x-panel)", boxShadow: "var(--x-shadow)", borderRadius: "3px", fontFamily: "var(--x-hand-font)", fontWeight: "500", letterSpacing: "0", fontSize: (parseFloat(getComputedStyle(el).fontSize) * 0.7).toFixed(1) + "px" });
    }
    const units = ML.split(el, "chars");
    if (!units.length) return null;
    const words = [...el.querySelectorAll(".ml-w")];
    // the accent word: the longest
    const accentW = words.reduce((a, b) => (b.textContent.length > a.textContent.length ? b : a), words[0]);
    if (p.accent === "serif-italic") {
      if (ML.ARABIC.test(accentW.textContent)) Object.assign(accentW.style, { fontFamily: "var(--x-serif-font, serif)", fontWeight: "400", color: "var(--x-accent)" });
      else Object.assign(accentW.style, { fontFamily: "var(--x-serif-font, serif)", fontStyle: "italic", fontWeight: "400", fontSize: "1.1em", color: "var(--x-accent)", letterSpacing: "0", textTransform: "none" });
    } else if (p.accent === "colour") accentW.style.color = "var(--x-accent)";
    // service row: dots between the items
    const seps = [];
    if (p.style === "service-row") words.slice(0, -1).forEach((w) => { const s = document.createElement("span"); s.textContent = "·"; s.style.cssText = "display:inline-block;margin-inline:0.35em;color:var(--x-accent)"; w.after(s); seps.push(s); });
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const labelCss = `display:block;font:var(--x-label-weight) ${Math.max(16, Math.min(28, fs * 0.28)).toFixed(1)}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);margin-bottom:0.6em;font-style:normal`;
    // lead-ins and labels, added outside the typed text; tracking breaks Arabic joins, so an Arabic label sets none
    const plainAr = (s) => { if (ML.ARABIC.test(s.textContent)) { s.style.letterSpacing = "0"; s.style.textTransform = "none"; s.dataset.ar = "1"; } };
    let lead = null, icon = null, fig = null, tab = null, dots = null;
    if (p.lead === "kicker") { lead = document.createElement("span"); lead.style.cssText = labelCss + ";color:var(--x-accent);font-family:var(--x-mono-font)"; lead.textContent = "> " + (p.lead_text || "01"); plainAr(lead); el.prepend(lead); }
    if (p.lead === "counter") { lead = document.createElement("span"); lead.style.cssText = labelCss + ";color:var(--x-dim)"; lead.textContent = p.lead_text || "01 / 04"; plainAr(lead); el.prepend(lead); }
    if (p.lead === "icon") {
      icon = document.createElement("span");
      icon.style.cssText = `display:inline-grid;place-items:center;width:1em;height:1em;vertical-align:-0.12em;margin-inline-end:8px;border-radius:calc(var(--x-radius) * 0.35);background:var(--x-accent);color:var(--x-accent-ink);font:700 0.55em var(--x-mono-font);font-style:normal`;
      icon.textContent = rtl ? "<" : ">"; words[0].before(icon);
    }
    if (p.style === "serif-annotation") { fig = document.createElement("span"); fig.style.cssText = labelCss + ";color:var(--x-dim);font-variant:small-caps"; fig.textContent = p.lead_text && p.lead === "none" ? p.lead_text : arabic ? "شكل ١" : "FIG. 1"; plainAr(fig); el.prepend(fig); }
    if (p.container === "rpg-box") { tab = document.createElement("span"); tab.style.cssText = `position:absolute;top:-0.95em;inset-inline-start:0.6em;padding:0.1em 0.5em;font:700 0.5em var(--x-mono-font);background:var(--x-accent);color:var(--x-accent-ink);border:3px solid var(--x-ink)`; tab.textContent = p.lead_text || "01"; el.append(tab); }
    const tapes = [];
    if (p.container === "paper-strip") for (const side of [0, 1]) { const tp = document.createElement("span"); tp.style.cssText = `position:absolute;top:-0.35em;${side ? "right" : "left"}:6%;width:2.2em;height:0.6em;background:color-mix(in srgb, var(--x-accent) 26%, var(--x-panel-2));box-shadow:0 1px 2px var(--x-line);rotate:${side ? 8 : -8}deg`; el.append(tp); tapes.push(tp); }
    if (p.style === "status") { dots = document.createElement("span"); dots.style.cssText = "display:inline-block"; dots.innerHTML = "<span>.</span><span>.</span><span>.</span>"; el.append(dots); }
    // weight grow never moves the layout: each letter (each Arabic word) holds the width of its boldest self
    if (p.weight_grow) {
      units.forEach((u) => { u.style.fontWeight = "700"; });
      const held = units.map((u) => ctx.box(u).w);
      units.forEach((u, i) => { Object.assign(u.style, { fontWeight: "300", width: held[i].toFixed(2) + "px", textAlign: "center" }); });
    }
    // ── keystrokes ──
    const steps = []; // { u, word, ar, frac, last }
    words.forEach((w, wi) => {
      const ar = w.classList.contains("ml-c");
      if (ar) {
        // one keystroke per letter, a mark staying with its letter; each clip stops at that letter's measured edge
        const node = w.firstChild, text = w.textContent, wb = w.getBoundingClientRect(), range = document.createRange();
        const ends = [];
        for (let i = 0, off = 0, cs = Array.from(text); i < cs.length; i++) { off += cs[i].length; if (i + 1 === cs.length || !/\p{M}/u.test(cs[i + 1])) ends.push(off); }
        let prev = 0;
        ends.forEach((off, k) => {
          range.setStart(node, 0); range.setEnd(node, off);
          const fr = k === ends.length - 1 ? 1 : ML.clamp((wb.right - range.getBoundingClientRect().left) / (wb.width || 1), prev, 1);
          prev = fr;
          steps.push({ u: w, w, wi, ar: true, frac: fr });
        });
      }
      else for (const c of w.querySelectorAll(".ml-c")) steps.push({ u: c, w, wi, ar: false, frac: 1 });
    });
    const bySteps = p.unit === "words" ? words.map((w, wi) => steps.filter((s) => s.wi === wi)) : steps.map((s) => [s]);
    const dt = p.unit === "per-beat" ? 0.25 : 1 / p.rate;
    let tau = 0;
    const raw = [];
    bySteps.forEach((grp, i) => {
      const len = p.unit === "words" ? grp.length + 1 : 1;
      tau = Math.max(raw.length ? raw[raw.length - 1] + 0.005 : 0, tau + dt * len + p.jitter * (2 * ML.rnd(i, 3) - 1));
      raw.push(tau);
      const s = grp[grp.length - 1], next = bySteps[i + 1];
      if (next && next[0].wi !== s.wi && p.unit === "chars") tau += 0.05;
      if (!s.ar && /[.,!?;:…]/.test(s.u.textContent)) tau += 0.12;
    });
    const t0 = at + (p.lead === "kicker" || p.lead === "counter" || p.lead === "icon" ? 0.35 : 0) + (p.container === "rpg-box" ? 0.32 : 0) + p.pre_blink;
    const room = Math.max(0.3, end - 0.7 - t0 - (p.backspace ? 0.3 + steps.length * 0.03 : 0));
    const k = raw.length && raw[raw.length - 1] > room ? room / raw[raw.length - 1] : 1;
    bySteps.forEach((grp, i) => grp.forEach((s) => { s.t = t0 + raw[i] * k; }));
    const tLast = steps[steps.length - 1].t;
    // a key sound every third letter; each word, or each beat, has its own
    bySteps.forEach((grp, i) => { if (p.unit !== "chars" || i % 3 === 0) ctx.sfx(grp[0].t, p.container === "rpg-box" ? "blip" : "key", p.container === "rpg-box" ? 0.18 : 0.22); });
    if (p.after === "move-up-shrink") ctx.sfx(tLast + 0.45, "whoosh.soft", 0.2);
    // ── where the caret sits after each keystroke (measured at rest, relative to el's padding box) ──
    const eb = ctx.box(el), bx = el.clientLeft, by = el.clientTop;
    const rel = (u) => { const b = ctx.box(u); return { x: b.x - eb.x - bx, y: b.y - eb.y - by, w: b.w, h: b.h }; };
    const wbox = new Map(words.map((w) => [w, rel(w)]));
    const lineKey = (b) => Math.round((b.y + b.h / 2) / (fs * 0.6));
    const lines = new Map();
    for (const w of words) { const b = wbox.get(w), kk = lineKey(b); if (!lines.has(kk)) lines.set(kk, { l: Infinity, r: -Infinity, words: [] }); const L = lines.get(kk); L.l = Math.min(L.l, b.x); L.r = Math.max(L.r, b.x + b.w); L.words.push(w); }
    const lineOfWord = new Map(); for (const [kk, L] of lines) for (const w of L.words) lineOfWord.set(w, kk);
    const pos = steps.map((s) => {
      const b = s.ar ? wbox.get(s.w) : rel(s.u);
      return { x: s.ar ? b.x + b.w * (1 - s.frac) : b.x + b.w, y: b.y, h: b.h, ar: s.ar, line: lineOfWord.get(s.w) };
    });
    const first = steps[0], fb = first.ar ? wbox.get(first.w) : rel(first.u);
    const pos0 = { x: first.ar ? fb.x + fb.w : fb.x, y: fb.y, h: fb.h, ar: first.ar, line: lineOfWord.get(first.w) };
    // ── caret ──
    const cc = String(p.caret_colour || "accent").trim();
    const colour = /^--x-[a-z0-9-]+$/.test(cc) ? `var(${cc})` : ["accent", "accent-2", "ink", "dim", "good", "bad"].includes(cc) ? `var(--x-${cc})` : "var(--x-accent)";
    let caret = null;
    if (p.caret !== "none") { caret = document.createElement("span"); caret.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;background:${colour}`; if (p.caret === "bar") caret.style.boxShadow = `0 0 8px ${colour}`; el.append(caret); }
    const cw = p.caret === "block" ? fs * 0.56 : p.caret === "bar" ? Math.max(2, fs * 0.05) : fs * 0.55;
    // ── brush highlight behind the last line ──
    let brush = null;
    if (p.accent === "brush-highlight") {
      el.style.isolation = "isolate";
      const lastL = [...lines.values()].reduce((a, b) => (wbox.get(b.words[0]).y > wbox.get(a.words[0]).y ? b : a));
      const yb = wbox.get(lastL.words[0]);
      brush = document.createElement("span");
      brush.style.cssText = `position:absolute;z-index:-1;left:${(lastL.l - fs * 0.12).toFixed(1)}px;top:${(yb.y + yb.h * 0.45).toFixed(1)}px;width:${(lastL.r - lastL.l + fs * 0.24).toFixed(1)}px;height:${(yb.h * 0.42).toFixed(1)}px;background:color-mix(in srgb, var(--x-accent) 38%, transparent);border-radius:0.2em 0.5em 0.3em 0.6em;rotate:-2deg;transform-origin:${rtl ? "100%" : "0%"} 50%;scale:0 1`;
      el.append(brush);
    }
    const tBack = p.backspace ? Math.max(tLast + 0.6, end - 0.3 - steps.length * 0.03) : Infinity;
    const tClear = p.after === "clear" && !p.backspace ? Math.min(end - 0.12, tLast + 0.6) : Infinity;
    const caretGone = tLast + 2 / p.blink + 0.05;
    const GL = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/";
    if (p.style === "status") units.forEach((u) => { u.dataset.o = u.textContent; });
    const wordFirstStep = new Map(); steps.forEach((s, i) => { if (!wordFirstStep.has(s.w)) wordFirstStep.set(s.w, i); });
    const wordLastStep = new Map(); steps.forEach((s, i) => wordLastStep.set(s.w, i));
    // the strip's tilt goes on last: everything above was measured upright
    if (p.container === "paper-strip") el.style.rotate = "-1deg";
    return {
      draw(t) {
        const tq = p.container === "paper-strip" ? Math.floor(t * 12 + 1e-6) / 12 : t;
        let count = 0;
        while (count < steps.length && steps[count].t <= tq + 1e-9) count++;
        if (tq > tBack) count = Math.max(0, steps.length - Math.floor((tq - tBack) / 0.03));
        const gone = t >= tClear;
        el.style.opacity = gone ? "0" : t < at ? "0" : "1";
        // the field itself: lead blur, container opening, move-up-shrink
        let filter = p.lead === "blur" ? (1 - ML.out(t, at, at + 0.3)) * 6 : 0;
        el.style.filter = filter > 0.05 ? `blur(${filter.toFixed(2)}px)` : "none";
        if (p.container === "rpg-box") { const st = Math.floor(ML.lin(t, at, at + 0.3) * 4) / 4; el.style.clipPath = st >= 1 ? "none" : rtl ? `inset(-40% -10px -10px ${((1 - st) * 100).toFixed(1)}%)` : `inset(-40% ${((1 - st) * 100).toFixed(1)}% -10px -10px)`; }
        if (p.container === "paper-strip") el.style.opacity = gone ? "0" : ML.lin(t, at, at + 0.2).toFixed(4);
        if (p.after === "move-up-shrink") { const u = ML.out(t, tLast + 0.45, tLast + 0.95); el.style.translate = u > 0 ? `0 ${(-u * fs * 0.85).toFixed(2)}px` : "none"; el.style.scale = u > 0 ? (1 - 0.12 * u).toFixed(4) : "none"; el.style.transformOrigin = p.anchor === "centre" ? "50% 0" : rtl ? "100% 0" : "0 0"; }
        if (lead) {
          lead.style.opacity = ML.lin(t, at, at + 0.3).toFixed(4);
          if (p.lead === "counter" && !lead.dataset.ar) lead.style.letterSpacing = `${(0.04 + 0.16 * (1 - ML.out(t, at, at + 0.5))).toFixed(3)}em`;
        }
        if (icon) icon.style.scale = Math.max(0, ML.back(t, at, at + 0.25, 1.7)).toFixed(4);
        if (fig) fig.style.opacity = t >= at ? "1" : "0";
        // the caret's place now (after `count` keystrokes)
        const cp = count === 0 ? pos0 : pos[count - 1];
        // centred anchor: the line being typed slides so its typed part stays centred
        let shiftLine = null, shift = 0;
        if (p.anchor === "centre" && count < steps.length) {
          const L = lines.get(cp.line);
          if (L) { shiftLine = cp.line; shift = rtl ? (L.l - cp.x) / 2 : (L.r - cp.x) / 2; if (count === 0) shift = rtl ? (L.l - L.r) / 2 : (L.r - L.l) / 2; }
        }
        // letters and words
        steps.forEach((s, i) => {
          if (s.ar) return;
          const vis = i < count;
          let o = vis ? 1 : 0;
          if (vis && p.char_in === "fade" && tq < tBack) o = ML.lin(tq, s.t, s.t + 0.08);
          s.u.style.opacity = o.toFixed(3);
          if (p.style === "status") {
            const scr = !vis && tq >= s.t - 0.1 && tq < s.t && tq >= t0;
            s.u.textContent = scr ? GL[Math.floor(ML.rnd(i, Math.floor(t * 30)) * GL.length)] : s.u.dataset.o;
            if (scr) s.u.style.opacity = "0.7";
          }
        });
        if (p.weight_grow) units.forEach((u0, i) => {
          const a = tLast + 0.2 + i * 0.03, u = ML.ease(t, a, a + 0.6);
          u0.style.fontWeight = String(Math.round(300 + 400 * u));
          u0.style.color = u >= 1 ? "" : `color-mix(in srgb, var(--x-dim) ${((1 - u) * 100).toFixed(1)}%, currentColor)`;
        });
        words.forEach((w) => {
          const fi = wordFirstStep.get(w), li = wordLastStep.get(w);
          let x = shiftLine !== null && lineOfWord.get(w) === shiftLine ? shift : 0, o = 1;
          if (w.classList.contains("ml-c")) {
            const n = li - fi + 1, done = ML.clamp(count - fi, 0, n), frac = done > 0 ? steps[fi + done - 1].frac : 0;
            w.style.opacity = frac > 0 ? "1" : "0";
            w.style.clipPath = frac >= 1 || frac <= 0 ? "none" : `inset(-30% 0 -30% ${((1 - frac) * 100).toFixed(2)}%)`;
          }
          if (p.style === "service-row" && p.unit === "words") { const st = steps[fi].t, u = ML.out(tq, st, st + 0.12); o = count > fi ? u : 0; x += (1 - u) * 4 * (rtl ? -1 : 1); w.style.opacity = o.toFixed(3); }
          w.style.translate = Math.abs(x) > 0.01 ? `${x.toFixed(2)}px 0` : "none";
        });
        seps.forEach((s, j) => { const nx = wordFirstStep.get(words[j + 1]); s.style.opacity = count > nx ? "1" : "0"; const x = shiftLine !== null && lineOfWord.get(words[j]) === shiftLine ? shift : 0; s.style.translate = x ? `${x.toFixed(2)}px 0` : "none"; });
        if (dots) { const n = count >= steps.length && t < tBack ? Math.floor((t - tLast) * 3) % 4 : 0; [...dots.children].forEach((d, i) => { d.style.opacity = i < n ? "1" : "0"; }); dots.style.translate = shiftLine !== null ? `${shift.toFixed(2)}px 0` : "none"; }
        if (brush) brush.style.scale = `${ML.out(t, tLast + 0.05, tLast + 0.45).toFixed(4)} 1`;
        // the caret: blinking while idle, solid while typing, two blinks after the end, then gone
        if (caret) {
          let on;
          if (t < at || gone) on = false;
          else if (t < t0) on = ((t - at) * p.blink) % 1 < 0.5;
          else if (t <= tLast + 0.12 || (t >= tBack && count > 0)) on = true;
          else if (t < caretGone) on = ((t - tLast - 0.12) * p.blink) % 1 >= 0.5 ? false : true;
          else on = false;
          if (t >= tBack && count === 0) on = false;
          caret.style.opacity = on ? "1" : "0";
          const x = cp.x + (shiftLine !== null && cp.line === shiftLine ? shift : 0);
          let l, tp, w, h;
          if (p.caret === "underscore") { w = cw; h = Math.max(2, fs * 0.07); tp = cp.y + cp.h * 0.84; l = cp.ar ? x - w : x + fs * 0.02; }
          else if (p.caret === "block") { w = cw; h = cp.h * 0.78; tp = cp.y + cp.h * 0.12; l = cp.ar ? x - w - fs * 0.03 : x + fs * 0.03; }
          else { w = cw; h = cp.h * 0.8; tp = cp.y + cp.h * 0.1; l = cp.ar ? x - w - fs * 0.04 : x + fs * 0.04; }
          caret.style.left = l.toFixed(2) + "px"; caret.style.top = tp.toFixed(2) + "px"; caret.style.width = w.toFixed(2) + "px"; caret.style.height = h.toFixed(2) + "px";
        }
      },
    };
  },
});
