// Ledger lines: short statement lines rise in one by one from masks while a mono timecode beside them ticks to each
// line's moment. Two columns: on the start side a small mono timecode (MM:SS:FF of the line's moment in the scene) that
// updates as each line starts; beside it the lines in the light body weight, the last — the punch line — in the
// accent, heavy, set in capitals. Each line rises from below its own mask in 0.6 s (power3.out), line i at
// i × interval (0.5–1 s). Optionally small evidence cards (a thumbnail block + a mono caption) rise and fade in beside
// the final lines. The lines come from the slot: its <br> / line breaks / '|' if it has them, else its words dealt
// into `lines` rows (words are never split, so Arabic stays joined).
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md (the ledger chapter: timecode column +
// masked line rises) (MIT), rebuilt as our own code.
ML.define({
  id: "text-in.ledger-lines",
  category: "text-in",
  name: "Ledger lines",
  does: "Short statement lines rise in one by one from masks while a mono timecode beside them ticks to each line's moment.",
  says: ["story", "time", "step", "proof", "list"],
  energy: 2,
  targets: ["line", "list"],
  duration: [2, 6],
  params: {
    lines: { type: "number", range: [2, 6], default: 4 },
    interval: { type: "number", range: [0.5, 1], default: 0.7, unit: "s" },
    timecode: { type: "bool", default: true },
    evidence: { type: "bool", default: false },
    size: { type: "number", range: [0.4, 1], default: 0.6, unit: "em" },
    punch: { type: "bool", default: true },
  },
  pairs: ["text-in.kicker-rule", "data.count-up"],
  avoid: ["playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md ledger technique; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    // a list's items are already small: they keep their own size (a headline's line steps down by `size`)
    const listy = el.children.length > 1 && !/<br/i.test(el.innerHTML);
    const fs0 = parseFloat(getComputedStyle(listy ? el.children[0] : el).fontSize) || 80;
    // the rows: the slot's own breaks, else its words dealt evenly into `lines` rows
    let rows;
    const html = el.innerHTML;
    if (/<br\s*\/?>/i.test(html) || /\n|\|/.test(el.textContent.trim()) || el.children.length > 1) {
      rows = (el.children.length > 1 && !/<br/i.test(html) ? [...el.children].map((c) => c.textContent) : el.innerText.split(/\n|\|/)).map((s) => s.trim()).filter(Boolean);
    } else {
      const words = el.textContent.trim().split(/\s+/), n = Math.max(1, Math.min(Math.round(p.lines), words.length, Math.max(2, Math.ceil(words.length / 2))));
      rows = Array.from({ length: n }, (_, i) => words.slice(Math.round((i * words.length) / n), Math.round(((i + 1) * words.length) / n)).join(" "));
    }
    // the ledger keeps to roughly the room the slot had: the rows shrink rather than push the layout around
    const budget = Math.max(el.getBoundingClientRect().height * 1.35, fs0 * 2.2);
    const lfs = listy ? Math.max(20, fs0) : Math.max(20, Math.min(fs0 * p.size, budget / (rows.length * 1.24))), tcfs = Math.max(20, lfs / 4);
    el.textContent = "";
    Object.assign(el.style, { display: "grid", gridTemplateColumns: p.timecode ? "auto 1fr" : "1fr", columnGap: (lfs * 0.6).toFixed(1) + "px", alignItems: "start", textAlign: "start", position: "relative" });
    const tc = document.createElement("span");
    if (p.timecode) {
      Object.assign(tc.style, { font: `500 ${tcfs.toFixed(1)}px/1 var(--x-mono-font)`, color: "var(--x-dim)", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums", paddingTop: (lfs * 0.38).toFixed(1) + "px", direction: "ltr", unicodeBidi: "isolate" });
      el.append(tc);
    }
    const col = document.createElement("div");
    Object.assign(col.style, { display: "grid", rowGap: (lfs * 0.12).toFixed(1) + "px", justifyItems: "start" });
    el.append(col);
    const items = rows.map((r, i) => {
      const mask = document.createElement("div"), inner = document.createElement("div");
      // room above and below inside the mask, so Arabic marks and deep descenders aren't cut
      Object.assign(mask.style, { overflow: "hidden", padding: `${(lfs * 0.16).toFixed(1)}px 0`, margin: `${(-lfs * 0.16).toFixed(1)}px 0` });
      inner.textContent = r;
      const last = p.punch && i === rows.length - 1 && rows.length > 1;
      Object.assign(inner.style, last
        ? { font: `800 ${lfs.toFixed(1)}px/1.1 var(--x-head-font)`, textTransform: rtl ? "none" : "uppercase", letterSpacing: rtl ? "0" : "-0.01em", color: "var(--x-accent)", fontStretch: "condensed" }
        : { font: `300 ${lfs.toFixed(1)}px/1.1 var(--x-body-font)`, color: "var(--x-ink)", letterSpacing: rtl ? "0" : "normal" });
      mask.append(inner); col.append(mask);
      return { mask, inner };
    });
    // when each line lands: its interval, tightened if the run wouldn't otherwise land and hold before the end
    const iv = rows.length > 1 ? Math.max(0.2, Math.min(p.interval, (end - 0.3 - at - 0.6 - 0.5) / (rows.length - 1))) : p.interval;
    const times = items.map((_, i) => at + i * iv);
    const tcOf = (s) => { const f = Math.max(0, Math.round(s * 30)), ff = f % 30, ss = Math.floor(f / 30) % 60, mm = Math.floor(f / 1800); return [mm, ss, ff].map((v) => String(v).padStart(2, "0")).join(":"); };
    // evidence cards beside the final lines; each is captioned with its line's timecode (no language to translate)
    const cards = [];
    if (p.evidence) {
      const cw = Math.max(lfs * 2.2, tcfs * 6), host = document.createElement("div"); // a card is at least as wide as its timecode
      Object.assign(host.style, { position: "absolute", insetInlineEnd: "0", bottom: "0", display: "flex", gap: (lfs * 0.25).toFixed(1) + "px" });
      col.style.paddingInlineEnd = (cw * 2 + lfs * 0.75).toFixed(1) + "px"; // the lines keep clear of the cards
      for (let k = 0; k < 2; k++) {
        const c = document.createElement("div");
        c.className = "ml-panel";
        Object.assign(c.style, { padding: (lfs * 0.12).toFixed(1) + "px", display: "grid", gap: (lfs * 0.1).toFixed(1) + "px", width: cw.toFixed(1) + "px", boxSizing: "border-box" });
        const th = document.createElement("div");
        Object.assign(th.style, { height: (cw * 0.6).toFixed(1) + "px", borderRadius: "calc(var(--x-radius) * 0.35)", background: `linear-gradient(${135 + k * 40}deg, var(--x-accent), var(--x-accent-2))`, opacity: "0.85" });
        const cap = document.createElement("div");
        cap.textContent = tcOf(times[Math.max(0, times.length - 2 + k)] - ctx.from);
        Object.assign(cap.style, { font: `500 ${tcfs.toFixed(1)}px/1 var(--x-mono-font)`, color: "var(--x-dim)", letterSpacing: "0.08em", direction: "ltr" });
        c.append(th, cap); host.append(c); cards.push(c);
      }
      el.append(host);
    }
    times.forEach((t) => ctx.sfx(t, "tap", 0.2));
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // power3.out
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.22);
        el.style.opacity = (1 - leave).toFixed(4);
        items.forEach((it, i) => {
          const u = p3(t, times[i], times[i] + 0.6);
          it.inner.style.translate = `0 ${((1 - u) * 115).toFixed(2)}%`;
          it.inner.style.visibility = t < times[i] ? "hidden" : "visible";
        });
        if (p.timecode) {
          const k = times.reduce((v, x, i) => (t >= x ? i : v), -1);
          tc.textContent = tcOf(k < 0 ? 0 : times[k] - ctx.from);
          tc.style.opacity = t < at ? "0" : "1";
          // a small rise each time it ticks to a new line
          const tick = k < 0 ? 1 : ML.out(t, times[k], times[k] + 0.25);
          tc.style.translate = `0 ${((1 - tick) * tcfs * 0.4).toFixed(2)}px`;
        }
        cards.forEach((c, i) => {
          const t0 = times[Math.max(0, times.length - 2 + i)] + 0.2, u = ML.out(t, t0, t0 + 0.5);
          c.style.opacity = u.toFixed(4); c.style.translate = `0 ${((1 - u) * lfs * 0.3).toFixed(2)}px`;
        });
      },
    };
  },
});
