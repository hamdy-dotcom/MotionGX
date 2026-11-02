// Bracketed word: big '[' and ']' glyphs (serif, ~1.55× the type) hold a word between them. In: its letters appear
// left to right (0.05 s stagger), the newest showing a random glyph in the accent for ~3 frames before settling in
// the true ink. Swap (the next beat, or the next spoken word of the line): the old letters tumble out — rotateX
// 0 → 70deg, up 30px, blur 6px, 0.03 s stagger, 0.3 s power2.in — while the brackets glide to the new word's measured
// width (0.45 s power3.inOut) and the new letters scramble in; a 2px accent underline draws under each word left →
// right in 0.4 s once it settles. The target's text is cut into `words` beats (a 3-word manifesto: see / understand /
// act); the last one stays. Glyphs are picked from a seed of (letter, frame), every letter keeps its measured width,
// so nothing shifts or flickers between renders. Arabic: whole words fade in between the brackets (never a scrambled
// letter), anchored and underlined from the right. A beat count the run has no time for merges into fewer beats.
// Source: prompt-motion reflex-cloud "this is legit insane" (reference only — our own code).
ML.define({
  id: "text-in.bracket-word",
  category: "text-in",
  name: "Bracketed word",
  does: "A word scrambles in between big square brackets; on the next beat it tumbles out and the brackets slide apart to fit the new word.",
  says: ["change", "step", "tech", "focus"],
  energy: 3,
  targets: ["word", "headline"],
  duration: [1, 4],
  params: {
    brackets: { type: "choice", options: ["square", "curly", "none"], default: "square" },
    scramble_colour: { type: "choice", options: ["accent", "white"], default: "accent" },
    underline: { type: "bool", default: true },
    stagger: { type: "number", range: [0.03, 0.08], default: 0.05, unit: "s" },
    words: { type: "number", range: [1, 4], default: 3 },
  },
  pairs: ["text-in.scramble", "rhythm.beat-lock"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:reflex-cloud-this-is-legit-insane", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim();
    if (!text) return null;
    // the beats: the text's words cut into `words` balanced groups, in order
    const all = text.split(/\s+/), n = Math.max(1, Math.min(Math.round(p.words), all.length, Math.floor((end - at - 0.4) / 0.7)));
    const groups = [];
    for (let k = 0, i = 0; k < n; k++) { const take = Math.round(((k + 1) * all.length) / n) - Math.round((k * all.length) / n); groups.push(all.slice(i, i + take).join(" ")); i += take; }
    let fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const BR = { square: ["[", "]"], curly: ["{", "}"], none: ["", ""] }[p.brackets] || ["[", "]"];
    el.textContent = "";
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;white-space:nowrap;vertical-align:middle;";
    const brk = (c) => { const s = document.createElement("span"); s.textContent = c; s.setAttribute("aria-hidden", "true"); s.style.cssText = `font-family:var(--x-serif-font);font-weight:300;font-size:1.55em;line-height:1;color:var(--x-dim);padding:0 ${c ? "0.12em" : "0"};`; return s; };
    const open = brk(BR[0]), close = brk(BR[1]);
    const mid = document.createElement("span");
    mid.style.cssText = "position:relative;display:inline-block;";
    wrap.append(open, mid, close);
    el.append(wrap);
    const chunks = groups.map((g) => {
      const c = document.createElement("span");
      c.textContent = g;
      c.style.cssText = `position:absolute;${rtl ? "right" : "left"}:0;top:0;white-space:pre;`;
      mid.append(c);
      return c;
    });
    // the longest beat and its brackets must fit the slot's width (measured before the letters are cut)
    const room = Math.min(ctx.box(el).w || ctx.f.W, ctx.f.W - 2 * ctx.f.m), widest = Math.max(...chunks.map((c) => c.offsetWidth)) + open.offsetWidth + close.offsetWidth;
    if (widest > room) { fs *= room / widest; el.style.fontSize = fs.toFixed(2) + "px"; }
    const beats = chunks.map((c, k) => {
      const letters = ML.split(c, "chars");
      letters.forEach((l) => { l.dataset.ch = l.textContent; const w = l.offsetWidth; l.style.width = w + "px"; l.style.textAlign = "center"; l.style.transformOrigin = "50% 100%"; });
      return { c, letters, w: c.offsetWidth, h: c.offsetHeight, ar: ML.ARABIC.test(c.textContent) };
    });
    const lineH = Math.max(...beats.map((b) => b.h));
    mid.style.height = lineH + "px";
    let ul = null;
    if (p.underline) {
      ul = document.createElement("span");
      ul.setAttribute("aria-hidden", "true");
      ul.style.cssText = `position:absolute;${rtl ? "right" : "left"}:0;bottom:${(-fs * 0.08).toFixed(1)}px;height:${Math.max(2, fs * 0.035).toFixed(1)}px;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;`;
      mid.append(ul);
    }
    // beat times: steady slots over the run, or the spoken word that opens each beat when it comes later
    const slot = Math.max(0.6, (end - at - 0.5) / n);
    const times = [];
    groups.forEach((g, k) => { const fb = at + k * slot; let tk = k === 0 ? at : Math.max(fb, ctx.word(g.split(" ")[0], fb)); if (k) tk = Math.max(tk, times[k - 1] + 0.6); times.push(Math.min(tk, Math.max(at, end - 0.7))); });
    beats.forEach((b, k) => {
      b.in = times[k] + (b.ar ? 0.2 : k ? 0.12 : 0.05); // a whole Arabic word waits for the brackets to open round it
      b.out = k + 1 < n ? times[k + 1] : Infinity;
      b.settle = b.in + (b.letters.length - 1) * p.stagger + 0.1 + 0.1;
      ctx.sfx(times[k], "key", 0.3);
    });
    const SET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*/<>";
    const scr = p.scramble_colour === "accent" ? "var(--x-accent)" : "";
    const pin = 0.1; // ~3 frames of a random glyph before the letter settles
    const persp = (fs * 6).toFixed(0);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.visibility = t < at ? "hidden" : "visible";
        el.style.opacity = (1 - leave).toFixed(4);
        const br = ML.lin(t, at, at + 0.15);
        open.style.opacity = close.style.opacity = br.toFixed(4);
        // the brackets' gap: the width of the beat on stage, gliding to the next
        let w = beats[0].w * ML.ease(t, at, at + 0.45), cur = 0;
        beats.forEach((b, k) => { if (k && t >= times[k]) { w = beats[k - 1].w + (b.w - beats[k - 1].w) * ML.ease(t, times[k], times[k] + 0.45); cur = k; } });
        mid.style.width = w.toFixed(2) + "px";
        const frame = Math.floor(t * 30);
        beats.forEach((b, k) => {
          const shown = t >= b.in - 0.001 && t < b.out + 0.3 + b.letters.length * 0.03 + 0.05;
          b.c.style.visibility = shown ? "visible" : "hidden";
          if (!shown) return;
          b.letters.forEach((l, j) => {
            const a = b.in + j * p.stagger;
            if (t < a) { l.style.opacity = "0"; l.textContent = l.dataset.ch; l.style.color = ""; l.style.transform = "none"; l.style.filter = "none"; return; }
            if (b.ar) { l.style.opacity = ML.lin(t, a, a + 0.25).toFixed(4); }
            else {
              const fresh = t < a + pin;
              l.textContent = fresh ? SET[Math.floor(ML.rnd(k * 97 + j, frame) * SET.length) % SET.length] : l.dataset.ch;
              l.style.color = fresh ? scr : "";
              l.style.opacity = "1";
            }
            // the tumble out on the next beat
            const o = b.out + j * 0.03, e = t < o ? 0 : Math.pow(ML.lin(t, o, o + 0.3), 2);
            if (e > 0) {
              l.style.transform = `perspective(${persp}px) translateY(${(-30 * (fs / 90) * e).toFixed(2)}px) rotateX(${(70 * e).toFixed(2)}deg)`;
              l.style.filter = `blur(${(6 * e).toFixed(2)}px)`;
              l.style.opacity = (1 - e).toFixed(4);
            } else { l.style.transform = "none"; l.style.filter = "none"; }
          });
        });
        if (ul) {
          // each word draws its own line once it settles; the old line fades as the swap begins
          const fading = cur > 0 && t < beats[cur].settle, b = fading ? beats[cur - 1] : beats[cur];
          ul.style.width = b.w + "px";
          ul.style.transform = `scaleX(${ML.out(t, b.settle, b.settle + 0.4).toFixed(4)})`;
          ul.style.opacity = (fading ? 1 - ML.lin(t, times[cur], times[cur] + 0.18) : t < b.settle ? 0 : 1).toFixed(4);
        }
      },
    };
  },
});
