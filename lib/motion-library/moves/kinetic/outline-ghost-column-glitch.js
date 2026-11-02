// Letters land through outline ghost columns: over each letter a vertical column of 6–8 outline copies (1 px stroke,
// 30% ink — or filled at low ink) scrolls downward; the solid letter drops into its slot with a horizontal slice glitch
// (3–5 bands offset up to ±20 px for 0.15 s, re-cut every 0.04 s) and an RGB split, in a seeded random order (or left
// to right) with a 0.08 s stagger. Small square pixels (accent / ink) blink at seeded spots around the word. Once every
// letter has landed the columns fade to 15%. All of it stepped from t and seeded: the same t, the same picture.
// Latin only: Arabic letters join, so they cannot land one by one (rtl: false).
// Source: our own rebuild of prompt-motion "ndhabarde11-wtf-claude-opus-5-5" — reference only.
ML.define({
  id: "kinetic.outline-ghost-column-glitch",
  category: "kinetic",
  name: "Letters land through outline ghost columns",
  does: "Each letter drops into place through a vertical column of repeated outline copies, with slice glitch and pixel sparks.",
  says: ["tech", "energy"],
  energy: 5,
  targets: ["headline", "word"],
  duration: [1, 3],
  params: {
    order: { type: "choice", options: ["random", "ltr"], default: "random" },
    ghost: { type: "choice", options: ["outline", "filled"], default: "outline" },
    copies: { type: "number", range: [4, 10], default: 7 },
    seed: { type: "number", range: [1, 9999], default: 11 },
    stagger: { type: "number", range: [0.04, 0.14], default: 0.08, unit: "s" },
    pixels: { type: "bool", default: true },
  },
  pairs: ["text-in.glitch-in", "background.scanlines"],
  avoid: ["calm", "luxury", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:ndhabarde11-wtf-claude-opus-5-5", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const chars = ML.split(el, "chars").filter((c) => (c.textContent || "").trim());
    if (!chars.length) return null;
    const S = p.seed, n = chars.length;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const N = Math.max(4, Math.min(10, Math.round(p.copies)));
    // landing order: seeded shuffle, or reading order
    const rank = chars.map((_, i) => i);
    if (p.order === "random") rank.sort((a, b) => ML.rnd(a, S) - ML.rnd(b, S));
    const landAt = new Array(n);
    rank.forEach((ci, r) => { landAt[ci] = at + 0.18 + r * p.stagger; });
    const allIn = Math.max(...landAt) + 0.15;
    const sw = Math.max(1, fs / 120);
    const ghostCss = p.ghost === "outline"
      ? { color: "transparent", webkitTextStroke: `${sw.toFixed(2)}px color-mix(in srgb, var(--x-ink) 30%, transparent)` }
      : { color: "color-mix(in srgb, var(--x-ink) 14%, transparent)" };
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate"; // the columns sit behind the letters but never behind the stage's ground
    const per = chars.map((c, i) => {
      c.style.position = "relative";
      const ch = c.textContent; // the letter, read before anything is added inside it
      const h = c.offsetHeight;
      // the column: N copies stacked upward from the slot, inside a clip that ends at the slot's foot
      const clip = doc.createElement("span");
      Object.assign(clip.style, { position: "absolute", left: "-0.1em", right: "-0.1em", bottom: "0", height: `${h * (N - 1.5)}px`, overflow: "hidden", pointerEvents: "none", zIndex: "-1" });
      const col = doc.createElement("span");
      Object.assign(col.style, { position: "absolute", left: "0.1em", right: "0.1em", bottom: "0", display: "flex", flexDirection: "column", alignItems: "center" });
      for (let j = 0; j < N + 1; j++) { const g = doc.createElement("span"); g.textContent = ch; Object.assign(g.style, { display: "block", height: h + "px", lineHeight: h + "px", ...ghostCss }); col.append(g); }
      clip.append(col); c.append(clip);
      // the glitch slices: copies of the letter, each showing one horizontal band
      const nb = 3 + Math.floor(ML.rnd(i, S + 2) * 3);
      const slices = [];
      for (let b = 0; b < nb; b++) {
        const s = doc.createElement("span");
        s.textContent = ch;
        Object.assign(s.style, { position: "absolute", left: "0", top: "0", pointerEvents: "none", clipPath: `inset(${((b / nb) * 100).toFixed(2)}% 0 ${(100 - ((b + 1) / nb) * 100).toFixed(2)}% 0)` });
        c.append(s); slices.push(s);
      }
      // the letter's own glyph is the first text node: wrap it so it can hide while the slices play
      const tn = [...c.childNodes].find((x) => x.nodeType === 3);
      const glyph = doc.createElement("span"); glyph.textContent = tn ? tn.textContent : ch; if (tn) tn.replaceWith(glyph);
      glyph.style.display = "inline-block";
      return { c, h, col, clip, slices, glyph, speed: (1.6 + ML.rnd(i, S + 3) * 1.2) * h };
    });
    // pixels: seeded squares around the word
    const px = [];
    if (p.pixels) {
      const W = el.offsetWidth, H = el.offsetHeight, k = Math.min(ctx.f.W, ctx.f.H) / 1080;
      for (let i = 0; i < 18; i++) {
        const q = doc.createElement("span"), size = (4 + ML.rnd(i, S + 5) * 4) * k * 1.6;
        Object.assign(q.style, { position: "absolute", left: (ML.rnd(i, S + 6) * 1.1 - 0.05) * W + "px", top: (ML.rnd(i, S + 7) * 1.8 - 0.4) * H + "px", width: size + "px", height: size + "px", background: ML.rnd(i, S + 8) > 0.4 ? "var(--x-accent)" : "var(--x-ink)", pointerEvents: "none" });
        el.append(q); px.push(q);
      }
    }
    rank.forEach((ci, r) => r % 3 === 0 && ctx.sfx(landAt[ci], "snap", 0.3));
    ctx.sfx(at, "blip", 0.2);
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        el.style.opacity = (1 - leave).toFixed(4);
        const settle = ML.ease(t, allIn, allIn + 0.4); // the columns fade from 30% to 15% once all are in
        per.forEach(({ h, col, clip, slices, glyph, speed }, i) => {
          const L = landAt[i];
          // the column appears just before its letter and scrolls down for the whole move
          const colIn = ML.lin(t, L - 0.3, L - 0.12);
          clip.style.opacity = (colIn * (1 - 0.5 * settle)).toFixed(4);
          clip.style.visibility = colIn > 0 ? "visible" : "hidden";
          const off = ((Math.max(0, t - (L - 0.3)) * speed) % h + h) % h;
          col.style.transform = `translate3d(0, ${(off - h).toFixed(2)}px, 0)`;
          // the letter: drops a short way into the slot as the glitch plays
          const g = t >= L && t < L + 0.15, landed = t >= L;
          const drop = landed ? (1 - ML.out(t, L, L + 0.12)) * -0.35 * h : 0;
          glyph.style.visibility = landed && !g ? "visible" : "hidden";
          glyph.style.translate = "none";
          const stepI = Math.floor((t - L) / 0.04);
          const split = g ? (1 - (t - L) / 0.15) : 0;
          slices.forEach((s, b) => {
            s.style.visibility = g ? "visible" : "hidden";
            if (!g) return;
            const dx = (ML.rnd(i * 13 + b, S + stepI) - 0.5) * 40 * (fs / 140);
            s.style.transform = `translate(${dx.toFixed(2)}px, ${drop.toFixed(2)}px)`;
            const r = (3 * split * Math.max(1, fs / 120)).toFixed(2);
            s.style.textShadow = `${r}px 0 var(--x-accent), -${r}px 0 var(--x-accent-2)`;
          });
        });
        // pixels blink on a 10 fps seeded clock while the letters land
        const live = t >= at && t < allIn + 0.6;
        const tick = Math.floor(t * 10);
        px.forEach((q, i) => { q.style.visibility = live && ML.rnd(i * 7 + tick, S + 9) > 0.6 ? "visible" : "hidden"; });
      },
    };
  },
});
