// Scramble decode: the text first shows as a run of code symbols that resolve into the real letters. At time t the
// first k(t) letters (in reading or seeded order) are true and the rest show a symbol from the charset, re-picked
// every `repick` frames from a seed of the frame number (so the same t always shows the same symbols); k advances at
// `rate` letters a second on power1.inOut. Symbols in the dim ink, resolved letters in the full ink; each letter keeps
// its measured width, so the line never shifts. Words mode swaps whole words instead of letters. Optional pill.
// Sources: prompt-motion jayscambler "credit to opus…", misbahsy "opus is incredible" (reference only — our own code).
ML.define({
  id: "text-in.scramble",
  category: "text-in",
  name: "Scramble decode",
  does: "A word appears as a run of random code symbols that resolve one by one into the real letters.",
  says: ["tech", "reveal", "brand"],
  energy: 3,
  targets: ["word", "headline", "label"],
  duration: [0.5, 2],
  params: {
    charset: { type: "choice", options: ["code", "binary", "katakana", "blocks", "alpha"], default: "code" },
    order: { type: "choice", options: ["ltr", "random"], default: "ltr" },
    rate: { type: "number", range: [8, 30], default: 16, unit: "chars/s" },
    repick: { type: "number", range: [1, 4], default: 2, unit: "frames" },
    unit: { type: "choice", options: ["letters", "words"], default: "letters" },
    container: { type: "choice", options: ["none", "pill"], default: "none" },
  },
  pairs: ["text-in.rule-rise", "ui.terminal-type"],
  avoid: ["luxury", "calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:misbahsy-opus-5-5-is-incredible", license: "reference", note: "also jayscambler-credit-to-opus-5-5; our own code" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    const SETS = {
      code: "<>/{}[]_*+01=;#",
      binary: "01",
      katakana: "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン",
      blocks: "█▓▒░▄▀▌▐■▪",
      alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZ#*",
    };
    const set = Array.from(SETS[p.charset] || SETS.code), wide = p.charset === "katakana";
    const pill = p.container === "pill";
    if (pill) {
      const box = document.createElement("span");
      box.style.cssText = "display:inline-block;padding:0.14em 0.6em;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);";
      while (el.firstChild) box.append(el.firstChild);
      el.append(box);
    }
    const units = ML.split(el, p.unit === "letters" ? "chars" : "words");
    const n = units.length;
    if (!n) return null;
    // each unit keeps its true text (transparent while scrambled) and shows its symbols on a layer centred over it,
    // so the line never shifts, whatever face arrives
    const truth = units.map((u) => u.textContent);
    const masks = units.map((u) => {
      u.style.position = "relative";
      const m = document.createElement("span");
      m.setAttribute("aria-hidden", "true");
      m.style.cssText = p.unit === "letters" ? `position:absolute;left:50%;top:${wide ? "50%" : "0"};translate:-50% ${wide ? "-50%" : "0"};${wide ? "font-size:0.62em;" : ""}white-space:pre;pointer-events:none;` : "position:absolute;left:0;right:0;top:0;text-align:center;overflow:hidden;white-space:pre;pointer-events:none;";
      u.append(m);
      return m;
    });
    const order = units.map((_, i) => i);
    if (p.order === "random") order.sort((a, b) => ML.rnd(a, 5) - ML.rnd(b, 5));
    const rank = new Array(n); order.forEach((ui, r) => (rank[ui] = r));
    const letters = p.unit === "letters" ? n : truth.reduce((s, w) => s + Array.from(w).length, 0);
    const total = Math.max(0.3, Math.min(letters / p.rate, end - at - 0.5));
    const inout = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const sym = (i, j, frame) => set[Math.floor(ML.rnd(i * 31 + j, frame + 1) * set.length) % set.length];
    for (let s = 0; s <= total + 1e-6; s += 0.25) ctx.sfx(at + s, "key", 0.22);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        if (t < at) { el.style.visibility = "hidden"; return; }
        el.style.visibility = "visible";
        el.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.08)) * (1 - leave)).toFixed(4);
        const k = n * inout(ML.lin(t, at, at + total));
        const frame = Math.floor((t * 30) / Math.max(1, Math.round(p.repick)));
        units.forEach((u, i) => {
          const done = rank[i] < k - 1e-6 || t >= at + total;
          // full-width symbols (katakana) take about two letters' room: half as many in a word
          const src = Array.from(truth[i]), keep = wide && p.unit !== "letters" ? src.filter((_, j) => j % 2 === 0) : src;
          const txt = done ? "" : keep.map((ch, j) => (/\s/.test(ch) ? ch : sym(i, j, frame))).join("");
          if (masks[i].textContent !== txt) masks[i].textContent = txt;
          u.style.color = done ? "" : "transparent";
          masks[i].style.color = pill ? "var(--x-accent-ink)" : "var(--x-dim)";
          masks[i].style.opacity = pill ? "0.6" : "1";
        });
      },
    };
  },
});
