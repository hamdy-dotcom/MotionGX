// Masked rise: each line, word or letter slides up out of its own invisible slot, cut at the mask edge until it
// lands — the classic editorial headline entrance. No fade by default: the mask does the reveal. Variations: lines /
// words / letters (letters stay whole words in Arabic), on a stagger or on the spoken words (0.03 s lead, html-reel),
// from below or above, a tilted card-flip settle (mirrored for RTL), the cinematic fade + blur, a small overshoot, an
// accent / muted line, one big word per beat with hard cuts, and exits (reverse up, sink down, cut).
// Source: MengTo/Skills (MIT) — html-reel reel-clock.js word() + reel-clock.css .reel-mask (padding .14em .05em .2em,
// matching negative margin; hidden at 120-135% for big type), animation-systems .maskLine (translateY 110% -> 0,
// .8s cubic-bezier(.16,1,.3,1), delays 0/.12/.24, last line in accent), cinematic-gsap-lenis initTextReveals.
ML.define({
  id: "text-in.mask-rise",
  category: "text-in",
  name: "Masked rise",
  does: "Each line, word or letter slides up out of its own invisible slot, cut off at the mask edge until it lands — the classic editorial headline entrance.",
  says: ["reveal", "arrival", "luxury", "story", "precision", "energy", "calm"],
  energy: 3,
  targets: ["headline", "line", "word", "label", "list"],
  duration: [0.5, 4],
  params: {
    split: { type: "choice", options: ["lines", "words", "letters"], default: "lines" },
    distance: { type: "number", range: [100, 135], default: 110, unit: "%" },
    duration: { type: "number", range: [0.25, 1.4], default: 0.8, unit: "s" },
    stagger: { type: "number", range: [0.015, 0.3], default: 0.12, unit: "s" },
    ease: { type: "choice", options: ["cubic-bezier(.16,1,.3,1)", "power4.out", "power3.out", "cubic-bezier(.22,1,.36,1)", "power2.out", "expo.out"], default: "cubic-bezier(.16,1,.3,1)" },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    tilt: { type: "number", range: [0, 8], default: 0, unit: "deg" },
    fade: { type: "bool", default: false },
    blur: { type: "number", range: [0, 10], default: 0, unit: "px" },
    overshoot: { type: "number", range: [0, 4], default: 0, unit: "%" },
    accent: { type: "choice", options: ["none", "last-line", "last-word", "muted-line"], default: "none" },
    mode: { type: "choice", options: ["build", "one-word-per-beat"], default: "build" },
    exit: { type: "choice", options: ["none", "reverse-up", "sink-down", "cut"], default: "none" },
  },
  pairs: ["text-emphasis.accent-word", "camera.push-in", "accent.segment-bars"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:media/html-reel (reel-clock.js word, reel-clock.css .reel-mask) + web-design/animation-systems (.maskLine)", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 100;
    const lhRaw = parseFloat(cs.lineHeight);
    const beat = p.mode === "one-word-per-beat";
    const LH = beat ? 1.02 : Number.isFinite(lhRaw) ? lhRaw / fs : 1.15;
    const sign = p.direction === "down" ? -1 : 1;
    // the mask's room: enough around the glyph that it never clips at rest (html-reel: .14em .05em .2em; tight leading
    // and Arabic's deep descenders and marks need more), and the travel grows with it so the hidden glyph shows no sliver
    const need = ML.clamp((1 - LH) / 2 + (rtl ? 0.28 : 0.12), rtl ? 0.2 : 0.08, rtl ? 0.36 : 0.22);
    const D = Math.max(p.distance / 100, 1 + (need + 0.03) / LH);
    const room = Math.max(need, ML.clamp((D - 1) * LH - 0.03, 0.04, 0.2));
    const far = rtl ? 0.3 : 0.14;
    const padTop = sign > 0 ? far : room, padBot = sign > 0 ? room : Math.max(far, need);
    const maskCss = (block) => ({ display: block ? "block" : "inline-block", overflow: "hidden", verticalAlign: "top", padding: `${padTop}em 0.05em ${padBot}em`, margin: `-${padTop}em -0.05em -${padBot}em` });
    const wrap = (node, block) => { const m = doc.createElement(block ? "div" : "span"); Object.assign(m.style, maskCss(block)); node.parentNode.insertBefore(m, node); m.append(node); return m; };

    // words, grouped into lines as laid out now
    const letters = p.split === "letters" && p.mode !== "one-word-per-beat";
    const words = letters ? (ML.split(el, "chars"), [...el.querySelectorAll(".ml-w")]) : ML.split(el, "words");
    const lineOf = [];
    let tops = [];
    words.forEach((w) => { const y = w.offsetTop; let i = tops.findIndex((v) => Math.abs(v - y) < fs * 0.4); if (i < 0) { tops.push(y); i = tops.length - 1; } lineOf.push(i); });
    const order = tops.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const lineIdx = lineOf.map((i) => order.indexOf(i));
    const nLines = Math.max(1, tops.length);

    // spoken time of each word (or the stagger fallback), html-reel's 0.03 s lead
    const spoken = (w, fb) => (p.sync === "spoken" ? Math.max(at, ctx.word(w.textContent, fb) - 0.03) : fb);
    const curves = {
      "cubic-bezier(.16,1,.3,1)": ML.bezier(0.16, 1, 0.3, 1),
      "cubic-bezier(.22,1,.36,1)": ML.bezier(0.22, 1, 0.36, 1),
      "power4.out": (x) => 1 - Math.pow(1 - x, 4),
      "power3.out": (x) => 1 - Math.pow(1 - x, 3),
      "power2.out": (x) => 1 - Math.pow(1 - x, 2),
      "expo.out": (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    };
    const curve = curves[p.ease] || curves["cubic-bezier(.16,1,.3,1)"];

    /** units: { inner, mask, at, line, word } */
    let units = [];
    // a list: every word sits inside block-level children (a headline's <em> is inline and stays part of its line)
    const kids = [...el.children].every((k) => !k.classList.contains("ml-w") && getComputedStyle(k).display !== "inline") ? [...el.children] : [];
    if (beat) {
      // one big word per beat, all in one slot; a hard cut to the next
      const box = doc.createElement("span");
      Object.assign(box.style, maskCss(false), { display: "inline-grid", fontSize: "var(--x-hero-size)", lineHeight: "1.02", whiteSpace: "nowrap" });
      const texts = words.map((w) => w.textContent);
      el.textContent = "";
      el.append(box);
      const inners = texts.map((s) => { const n = doc.createElement("span"); n.textContent = s; Object.assign(n.style, { gridArea: "1 / 1", display: "inline-block", justifySelf: "center" }); box.append(n); return n; });
      // the widest word fits the slot
      const widest = Math.max(...inners.map((n) => n.offsetWidth), 1), maxW = el.clientWidth * 0.96;
      if (widest > maxW) box.style.fontSize = `${(parseFloat(getComputedStyle(box).fontSize) * maxW / widest).toFixed(2)}px`;
      const cad = Math.max(0.45, Math.min(0.75, (end - at - 0.5) / Math.max(1, texts.length)));
      let prev = -Infinity;
      units = inners.map((n, i) => { const w0 = spoken(n, at + i * cad); const t0 = Math.max(w0, prev + 0.4); prev = t0; return { inner: n, mask: box, at: t0, line: 0, word: i }; });
    } else if (p.split === "lines" && kids.length > 1) {
      // a list keeps its items (chips, rows): each rises whole out of its own slot
      units = kids.map((k, li) => ({ inner: k, mask: wrap(k, getComputedStyle(k).display === "block"), at: 0, line: li, word: words.findIndex((w) => k.contains(w)) }));
      units.forEach((u, i) => { u.at = spoken(words[Math.max(0, u.word)] || u.inner, at + i * p.stagger); });
    } else if (p.split === "lines") {
      // a block mask per line, the line's words inside one inline-block (so a centred line stays centred)
      const groups = Array.from({ length: nLines }, () => []);
      words.forEach((w, i) => groups[lineIdx[i]].push(w));
      // a marked word (<em>, a coloured span) keeps its style when its line is rebuilt
      words.forEach((w) => { if (w.parentElement !== el) { const c = getComputedStyle(w); Object.assign(w.style, { color: c.color, fontStyle: c.fontStyle, fontWeight: c.fontWeight, fontFamily: c.fontFamily }); } });
      el.textContent = "";
      units = groups.map((g, li) => {
        const m = doc.createElement("div"); Object.assign(m.style, maskCss(true));
        const inner = doc.createElement("span"); inner.style.display = "inline-block"; inner.style.whiteSpace = "nowrap";
        g.forEach((w, k) => { if (k) inner.append(" "); inner.append(w); });
        m.append(inner); el.append(m);
        return { inner, mask: m, at: 0, line: li, word: words.indexOf(g[0]) };
      });
      units.forEach((u, i) => { u.at = spoken(words[u.word], at + i * p.stagger); });
    } else if (p.split === "words") {
      units = words.map((w, i) => ({ inner: w, mask: wrap(w, false), at: 0, line: lineIdx[i], word: i }));
      units.forEach((u, i) => { u.at = spoken(u.inner, at + i * p.stagger); });
    } else {
      const chars = [...el.querySelectorAll(".ml-c")];
      const ws = words;
      units = chars.map((c) => { const wi = ws.findIndex((w) => w === c || w.contains(c)); return { inner: c, mask: wrap(c, false), at: 0, line: lineIdx[Math.max(0, wi)] || 0, word: wi }; });
      const firstOf = new Map();
      units.forEach((u, i) => { if (!firstOf.has(u.word)) firstOf.set(u.word, i); });
      units.forEach((u, i) => {
        const fb = at + i * p.stagger;
        u.at = p.sync === "spoken" ? spoken(ws[u.word] || u.inner, at + firstOf.get(u.word) * p.stagger) + (i - firstOf.get(u.word)) * Math.min(p.stagger, 0.03) : fb;
      });
    }
    // a stagger that would not land inside the scene is pressed together; times only move forward
    if (!beat && p.sync === "stagger" && units.length > 1) {
      const span = units[units.length - 1].at - at, avail = Math.max(0.05, (end - at) * 0.75 - p.duration);
      if (span > avail) units.forEach((u) => { u.at = at + (u.at - at) * (avail / span); });
    }
    for (let i = 1; i < units.length; i++) units[i].at = Math.max(units[i].at, units[i - 1].at + (beat ? 0.4 : 0));

    // accent: the last line / last word in brand colour, or a muted middle line
    const lastLine = Math.max(...units.map((u) => u.line));
    if (p.accent === "last-line") words.forEach((w, i) => { if (lineIdx[i] === lastLine) w.style.color = "var(--x-accent)"; });
    if (p.accent === "last-word" && words.length) words[words.length - 1].style.color = "var(--x-accent)";
    if (p.accent === "muted-line" && nLines > 1) { const mid = nLines >= 3 ? 1 : nLines - 1; words.forEach((w, i) => { if (lineIdx[i] === mid) w.style.color = "var(--x-dim)"; }); }
    if (beat && p.accent !== "none") units[units.length - 1].inner.style.color = "var(--x-accent)";

    // the tilt variant pivots on the top corner where the line starts (mirrored for RTL)
    const tilt = p.tilt * (rtl ? -1 : 1);
    if (p.tilt) units.forEach((u) => { u.inner.style.transformOrigin = rtl ? "100% 0" : "0 0"; });

    // exit
    const n = units.length, lastLand = (units[n - 1]?.at || at) + (beat ? 0.35 : p.duration);
    const exD = 0.4, exSt = beat ? 0 : Math.min(0.05, 0.6 / Math.max(1, n));
    const exitAt = p.exit === "none" ? Infinity : p.exit === "cut" ? Math.max(lastLand, end - 0.04) : Math.max(lastLand + 0.1, end - exD - exSt * (n - 1) - 0.05);

    // sound: about one per beat
    let lastS = -1;
    units.forEach((u) => { if (u.at - lastS >= 0.3) { ctx.sfx(u.at, beat ? "hit" : "whoosh.soft", beat ? 0.35 : 0.22); lastS = u.at; } });

    const dur = beat ? 0.35 : p.duration;
    const ov = p.overshoot;
    return {
      draw(t) {
        units.forEach((u, i) => {
          let x = ML.lin(t, u.at, u.at + dur);
          let e = beat ? curves["expo.out"](x) : curve(x);
          // overshoot a little past the rest line and settle
          let y = sign * (D * 100 * (1 - e) - ov * Math.sin(Math.PI * e) * e);
          let o = p.fade || p.blur ? ML.clamp(x / 0.3) : 1;
          let vis = t >= u.at - 1e-6;
          if (beat) { const next = units[i + 1]; if (next && t >= next.at) vis = false; } // hard cut to the next word
          // exit
          if (t >= exitAt) {
            if (p.exit === "cut") vis = false;
            else {
              const k = n - 1 - i; // reverse order
              const q = ML.lin(t, exitAt + k * exSt, exitAt + k * exSt + exD), qe = q * q * q; // power3.in
              y += (p.exit === "reverse-up" ? -1 : 1) * D * 100 * qe;
              if (p.fade || p.blur) o *= 1 - qe;
              if (q >= 1) vis = false;
            }
          }
          u.inner.style.visibility = vis ? "visible" : "hidden";
          u.inner.style.translate = `0 ${y.toFixed(3)}%`;
          u.inner.style.rotate = tilt ? `${(tilt * (1 - e)).toFixed(3)}deg` : "0deg";
          u.inner.style.opacity = o.toFixed(4);
          const b = p.blur * (1 - e);
          u.inner.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "none";
        });
      },
    };
  },
});
