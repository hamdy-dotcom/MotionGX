// Document coverage fill: a page of faint placeholder word bars (14 rows of rounded pills, seeded widths) fills word
// by word with solid ink in reading order — right to left on an RTL stage — at ~25 words a second, each word inking in
// over 0.12 s; about 1 in 12 lands in the accent (unknown) and 1 in 20 in mid grey. A paired percentage counts along
// and the fill stops short (93 %), a data viz disguised as reading: coverage, completion, learning. "real-words" sets
// real words (the stage's language, Arabic words kept whole) instead of bars. On a card target a page laid over that
// card fills it (as many rows as fit); with no target a paper card (420 × 520 proportions) with a small "CHAPTER 1" label is built on the stage.
// Source: prompt-motion:1stnoel-i-built-this-language (reference only — rebuilt as our own code).
ML.define({
  id: "data.document-coverage-fill",
  category: "data",
  name: "Document words fill in reading order",
  does: "A page of faint placeholder word bars fills word by word with solid ink in reading order, a few staying highlighted as unknown.",
  says: ["growth", "proof", "time", "result"],
  energy: 2,
  targets: ["card", "list", "chart"],
  duration: [1.5, 4],
  params: {
    speed: { type: "number", range: [10, 40], default: 25, unit: "words/s" },
    highlight_ratio: { type: "number", range: [0, 0.2], default: 0.08 },
    stop_at: { type: "number", range: [0.5, 1], default: 0.93 },
    marks: { type: "choice", options: ["bars", "real-words"], default: "bars" },
    label: { type: "text", default: "" },
    readout: { type: "bool", default: true },
  },
  pairs: ["data.digit-write", "data.counter-with-particle-swarm"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:1stnoel-i-built-this-language", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;

    // the page: the target card, or a paper card built on the stage (420 × 520 proportions)
    let card, k, built = false;
    if (el && el.offsetWidth > 120 * u && el.offsetHeight > 120 * u) {
      card = el;
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      k = Math.min(card.clientWidth / 420, card.clientHeight / 520);
    } else {
      built = true;
      const h = Math.min(f.pic.h * 0.94, f.pic.w * 0.9 * (520 / 420)), w = h * (420 / 520);
      card = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - w) / 2}px;top:${f.pic.y + (f.pic.h - h) / 2}px;width:${w}px;height:${h}px;box-sizing:border-box;background:var(--x-panel);border-radius:var(--x-radius);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);z-index:20`, stage);
      k = w / 420;
    }
    const page = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${36 * k}px ${34 * k}px;display:flex;flex-direction:column;gap:${10 * k}px;overflow:hidden;${built ? "" : "background:var(--x-panel);border-radius:inherit;z-index:5;"}`, card);
    page.style.willChange = "opacity"; // its own layer: a word recoloured repaints the same pixels whatever frame came before
    const top = mk("div", `display:flex;justify-content:space-between;align-items:baseline;margin-bottom:${14 * k}px`, page);
    const lab = mk("div", `font-size:${Math.max(20 * u, 11 * k).toFixed(1)}px`, top, p.label || (rtl ? "الفصل ١" : "CHAPTER 1"));
    lab.className = "ml-label";
    const pct = p.readout ? mk("div", `font:var(--x-label-weight) ${Math.max(24 * u, 13 * k).toFixed(1)}px var(--x-mono-font);color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate`, top, "0%") : null;

    // 14 rows of word pills (or real words), seeded so the page is the same every time
    const WORDS = rtl
      ? "في البداية كان كل شيء هادئا ثم بدأت الكلمات تظهر واحدة بعد الأخرى حتى امتلأت الصفحة بالمعنى وصار القارئ يفهم ما لم يكن يعرفه من قبل".split(" ")
      : "the morning light fell across the quiet room as she opened the old book and began to read each word slowly until the meaning of every line became clear".split(" ");
    const wordPx = Math.max(13 * k, 18 * u), rowStep = p.marks === "real-words" ? wordPx * 1.25 + 10 * k : 26 * k;
    const fits = Math.floor((card.clientHeight - 130 * k) / rowStep);
    const rows = built ? Math.min(14, Math.max(6, fits)) : Math.round(ML.clamp(fits, 4, 24)), pills = [];
    const rowH = 5 * k, gap = 4 * k * (p.marks === "real-words" ? 1.6 : 1), avail = card.clientWidth - 68 * k;
    for (let r = 0; r < rows; r++) {
      const row = mk("div", `display:flex;flex-wrap:nowrap;gap:${gap}px;align-items:center;min-height:${p.marks === "real-words" ? 0 : rowH * 3.2}px;overflow:hidden`, page);
      let used = 0, i = 0;
      const short = r % 5 === 4 ? 0.55 : 1; // a paragraph end every few lines
      while (true) {
        const n = pills.length;
        let e, w;
        if (p.marks === "real-words") {
          e = mk("span", `font:var(--x-body-weight) ${wordPx.toFixed(1)}px/1.25 var(--x-body-font);white-space:nowrap`, row, WORDS[Math.floor(ML.rnd(n, 11) * WORDS.length)]);
          w = e.offsetWidth;
          if (used + w > avail * short && i > 0) { e.remove(); break; }
        } else {
          w = (12 + 28 * ML.rnd(n, 11)) * k;
          if (used + w > avail * short && i > 0) break;
          e = mk("span", `display:block;flex:none;width:${w.toFixed(1)}px;height:${rowH.toFixed(1)}px;border-radius:${rowH}px`, row);
        }
        used += w + gap; i++;
        const kind = ML.rnd(n, 13) < +p.highlight_ratio ? "accent" : ML.rnd(n, 17) < 0.05 ? "dim" : "ink";
        pills.push({ e, kind });
      }
    }
    const N = pills.length;
    const FAINT = "color-mix(in srgb, var(--x-dim) 22%, transparent)";
    const target = Math.max(1, Math.round(N * ML.clamp(+p.stop_at || 0.93, 0.05, 1)));
    // the pace: `speed` words a second, quickened only if the page would not reach its stop inside the span
    const t0 = at + (built ? 0.35 : 0.1);
    const room = Math.max(0.4, end - 0.5 - t0);
    const speed = Math.max(+p.speed || 25, target / room);
    const times = pills.map((_, i) => t0 + i / speed);
    for (let i = 0; i < target; i += Math.max(1, Math.round(speed / 4))) ctx.sfx(times[i], "key", 0.12);
    ctx.sfx(times[target - 1] + 0.12, "tap", 0.25);

    return {
      draw(t) {
        if (built) ML.show(card, t, at, end - 0.25);
        else page.style.opacity = (ML.ease(t, at, at + 0.25) * (1 - ML.ease(t, end - 0.3, end - 0.05))).toFixed(4);
        let done = 0;
        pills.forEach((x, i) => {
          const a = i < target ? ML.lin(t, times[i], times[i] + 0.12) : 0;
          if (a >= 1) done++;
          const to = x.kind === "accent" ? "color-mix(in srgb, var(--x-accent) 62%, transparent)" : x.kind === "dim" ? "var(--x-dim)" : "var(--x-ink)";
          const c = a <= 0 ? FAINT : a >= 1 ? to : `color-mix(in srgb, ${to} ${(a * 100).toFixed(1)}%, ${FAINT})`;
          if (p.marks === "real-words") x.e.style.color = c; else x.e.style.background = c;
        });
        if (pct) {
          const v = t < t0 ? 0 : Math.round((Math.min(target, Math.max(0, (t - t0) * speed)) / N) * 100);
          const s = v + "%";
          if (pct.textContent !== s) pct.textContent = s;
        }
      },
    };
  },
});
