// Glitch in: each unit (word, letter, or the whole line) stutters on for ~0.25 s — one state per 30 fps frame — as
// torn horizontal slices (clip-path insets 10–40 % tall at seeded y) offset ±jitter px, colour-split copies (one in
// --x-bad shifted −2 px, one in --x-accent +2 px, 60 %) and opacity flicker; fragment styles: slices, a low dash only,
// or the top half. Latin can scramble through A–Z # * for the first frames. Then the whole unit appears with a
// one-frame 4 px x-offset and snaps to 0. Every "random" choice is ML.rnd of (unit, frame), so it is a function of t.
// Source: prompt-motion:eyishazyer-found-another-prompt-for + teslachartz-claude-opus-5-5-leaves (reference) — our own.
ML.define({
  id: "text-in.glitch-in",
  category: "text-in",
  name: "Glitch in",
  does: "A word or label stutters on through torn horizontal slices, colour-split copies and broken fragments before locking in clean, like a signal acquiring.",
  says: ["tech", "energy", "arrival"],
  energy: 4,
  targets: ["label", "word", "headline"],
  duration: [0.3, 2],
  params: {
    duration: { type: "number", range: [0.15, 0.4], default: 0.25, unit: "s" },
    split: { type: "choice", options: ["words", "whole", "letters"], default: "words" },
    fragments: { type: "choice", options: ["slices", "dashes", "top-half"], default: "slices" },
    jitter: { type: "number", range: [0, 10], default: 6, unit: "px" },
    rgb_split: { type: "bool", default: true },
    scramble: { type: "bool", default: false },
    stagger: { type: "number", range: [0, 0.35], default: 0.3, unit: "s" },
  },
  pairs: ["text-in.scramble", "transition.glitch"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:eyishazyer-found-another-prompt-for", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    let units;
    if (p.split === "whole") { const w = document.createElement("span"); w.style.display = "inline-block"; while (el.firstChild) w.append(el.firstChild); el.append(w); units = [w]; }
    else units = ML.split(el, p.split === "letters" ? "chars" : "words");
    if (!units.length) return null;
    const FPS = 30, D = p.duration, dir = rtl ? -1 : 1;
    const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#*/<>";
    // each unit: its text in a core span + two colour copies over it
    const parts = units.map((u, i) => {
      const text = u.textContent, latin = !ML.ARABIC.test(text);
      const w = u.getBoundingClientRect().width / (el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1);
      u.textContent = "";
      Object.assign(u.style, { position: "relative" });
      if (p.scramble && latin) { u.style.width = w.toFixed(2) + "px"; u.style.textAlign = "center"; }
      const core = document.createElement("span"); core.textContent = text; core.style.display = "inline-block"; core.style.whiteSpace = "pre";
      const copy = (col) => { const c = document.createElement("span"); c.textContent = text; c.setAttribute("aria-hidden", "true"); Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: "100%", whiteSpace: "pre", color: col, pointerEvents: "none", textAlign: "inherit" }); return c; };
      const r = copy("var(--x-bad)"), b = copy("var(--x-accent)");
      // extra ink slices torn off the same word: 1–3 slices a frame, each with its own offset
      const tears = [copy("inherit"), copy("inherit")];
      u.append(core, ...tears, r, b);
      // letters stagger at a fraction of the word stagger; words at the stagger
      return { u, core, tears, r, b, text, latin, i };
    });
    // a long line still locks before the move ends
    const step = Math.min(p.split === "letters" ? Math.min(p.stagger, 0.06) : p.stagger, Math.max(0.012, (end - at - D - 0.3) / Math.max(1, parts.length - 1)));
    const starts = parts.map((_, i) => at + i * step);
    parts.forEach((x, i) => { if (p.split !== "letters" || i % 4 === 0) ctx.sfx(starts[i], "blip", 0.25); });
    const slice = (i, f, k) => {
      if (p.fragments === "top-half") return [0, 50];
      if (p.fragments === "dashes") { const top = 62 + ML.rnd(i * 7 + k, f) * 18; return [top, Math.min(100, top + 8 + ML.rnd(i, f * 3 + k) * 8)]; }
      const h = 10 + ML.rnd(i * 13 + k, f + 1) * 30, top = ML.rnd(i * 5 + k * 3, f * 7 + 2) * (100 - h);
      return [top, top + h];
    };
    const clip = ([a, b]) => `inset(${a.toFixed(1)}% -10% ${(100 - b).toFixed(1)}% -10%)`;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.2)) / 0.15);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const x of parts) {
          const s = starts[x.i], e = s + D;
          const { u, core, tears, r, b, i } = x;
          if (t < s) { u.style.opacity = "0"; continue; }
          u.style.opacity = "1";
          if (t >= e) {
            // locked: one frame 4 px off, then clean
            const off = t < e + 1 / FPS ? 4 * dir : 0;
            core.style.translate = off ? `${off}px 0` : "none";
            core.style.clipPath = "none"; core.style.opacity = "1";
            if (x.latin && p.scramble) { core.textContent = x.text; for (const c of tears) c.textContent = x.text; }
            for (const c of tears) c.style.opacity = "0";
            r.style.opacity = "0"; b.style.opacity = "0";
            continue;
          }
          const f = Math.floor((t - s) * FPS);
          const jit = (k) => (ML.rnd(i * 17 + k, f * 5 + 1) * 2 - 1) * p.jitter;
          core.style.clipPath = clip(slice(i, f, 0));
          core.style.translate = `${jit(0).toFixed(2)}px 0`;
          core.style.opacity = (0.3 + 0.7 * ML.rnd(i * 3, f + 11)).toFixed(3);
          if (x.latin && p.scramble) {
            const lockF = 3 + Math.floor(ML.rnd(i, 99) * 3);
            core.textContent = f < lockF ? Array.from(x.text).map((c, k) => (/\s/.test(c) ? c : GLYPHS[Math.floor(ML.rnd(i * 31 + k, f + 3) * GLYPHS.length)])).join("") : x.text;
            for (const c of tears) c.textContent = core.textContent;
          }
          const count = p.fragments === "slices" ? 1 + Math.floor(ML.rnd(i * 11, f + 23) * 3) : 1;
          tears.forEach((c, k) => {
            c.style.opacity = k + 1 < count ? core.style.opacity : "0";
            c.style.clipPath = clip(slice(i, f, 3 + k));
            c.style.translate = `${jit(3 + k).toFixed(2)}px 0`;
          });
          const show = p.rgb_split;
          r.style.opacity = show && ML.rnd(i, f * 2 + 5) > 0.25 ? "0.6" : "0";
          b.style.opacity = show && ML.rnd(i, f * 2 + 6) > 0.25 ? "0.6" : "0";
          r.style.clipPath = clip(slice(i, f, 1)); b.style.clipPath = clip(slice(i, f, 2));
          r.style.translate = `${(-2 + jit(1) * 0.5).toFixed(2)}px 0`;
          b.style.translate = `${(2 + jit(2) * 0.5).toFixed(2)}px 0`;
        }
      },
    };
  },
});
