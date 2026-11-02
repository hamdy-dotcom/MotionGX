// Skew slam: heavy lines (or words) crash in one per beat — each from ±60 px, turned ±angle° with the sign alternating
// (line 1 from above at −angle, line 2 from below at +angle…), skewed ±skew°, blurred 10 px — and snap straight on
// power4 out. The last line lands in the accent, from scale 1.4, and its letters then wobble one by one (±5°, ±6 px,
// two cycles in 0.5 s, dying away). Arabic words wobble whole: their letters never come apart.
// Sources: prompt-motion rendesr "love claude opus…", crazyalphaaa "wtf made with claude" (reference only — our code).
ML.define({
  id: "text-in.skew-slam",
  category: "text-in",
  name: "Skew slam",
  does: "Heavy lines crash in tilted, skewed and blurred and snap straight, one per beat, the last word landing in a contrasting colour.",
  says: ["energy", "brand", "arrival", "playful"],
  energy: 5,
  targets: ["headline", "line"],
  duration: [0.8, 2.5],
  params: {
    angle: { type: "number", range: [3, 10], default: 6, unit: "deg" },
    skew: { type: "number", range: [0, 14], default: 10, unit: "deg" },
    split: { type: "choice", options: ["lines", "words"], default: "lines" },
    stagger: { type: "number", range: [0.2, 0.5], default: 0.35, unit: "s" },
    duration: { type: "number", range: [0.2, 0.45], default: 0.3, unit: "s" },
    wobble: { type: "bool", default: true },
    accent_last: { type: "bool", default: true },
    sync: { type: "choice", options: ["stagger", "spoken"], default: "stagger" },
  },
  pairs: ["rhythm.beat-cut", "camera.shake"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:rendesr-love-claude-opus-5-5", license: "reference", note: "also crazyalphaaa-wtf-made-with-claude; our own code" },
  async setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    // measure with the real face: wait for the faces this text uses (a page's fonts can still be arriving)
    try { const cs = getComputedStyle(el); await document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, el.textContent || "A"); await document.fonts.ready; } catch (e) { /* no font API: measure as is */ }
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")];
    if (!words.length) return null;
    let units = words;
    if (p.split === "lines") {
      // group the words by the line they sit on, then give each line a block of its own (same breaks, one box)
      const rows = [];
      for (const w of words) { const y = Math.round(w.offsetTop); let r = rows.find((x) => Math.abs(x.y - y) < 4); if (!r) rows.push((r = { y, ws: [] })); r.ws.push(w); }
      units = rows.map((r) => {
        const line = document.createElement("span");
        line.style.cssText = "display:block;transform-origin:50% 50%";
        r.ws[0].before(line);
        for (const w of r.ws) { const next = w.nextSibling; line.append(w); if (next && next.nodeType === 3) line.append(next); }
        return line;
      });
    }
    const n = units.length;
    const times = units.map((u, i) => (p.sync === "spoken" ? Math.max(at, ctx.word(u.textContent.trim().split(/\s+/)[0], at + i * p.stagger)) : at + i * p.stagger));
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.08);
    // the payoff: the last line — or, when everything sits on one line, its last word — in the accent, from 1.4
    const solo = n === 1 && words.length > 1, pay = solo ? words[words.length - 1] : units[n - 1];
    const payAt = solo ? times[0] + p.duration * 0.6 : times[n - 1];
    if (p.accent_last) pay.style.color = "var(--x-accent)";
    const wob = p.wobble ? [...pay.querySelectorAll(".ml-c")] : [];
    const flat = (x) => 1 - Math.pow(1 - ML.clamp(x), 4);
    times.forEach((t) => ctx.sfx(t, "hit", 0.35));
    if (solo) ctx.sfx(payAt, "hit", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        units.forEach((u, i) => {
          const a = times[i];
          if (t < a) { u.style.visibility = "hidden"; return; }
          u.style.visibility = "visible";
          const e = flat((t - a) / p.duration), w = 1 - e, sign = i % 2 === 0 ? -1 : 1, dirX = ctx.rtl ? -1 : 1;
          u.style.opacity = Math.min(1, ML.lin(t, a, a + p.duration * 0.3)).toFixed(4);
          u.style.translate = w < 1e-4 ? "none" : `0 ${(sign * 60 * w).toFixed(2)}px`;
          u.style.transform = w < 1e-4 ? "none" : `rotate(${(sign * p.angle * w * dirX).toFixed(3)}deg) skewX(${(-sign * p.skew * w * dirX).toFixed(3)}deg)`;
          const bl = 10 * w;
          u.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        });
        if (p.accent_last) {
          const s = t < payAt ? 1.4 : 1.4 - 0.4 * flat((t - payAt) / Math.max(p.duration, 0.3));
          pay.style.scale = s > 1.0001 ? s.toFixed(4) : "none";
          if (solo) pay.style.visibility = t < payAt ? "hidden" : "visible";
        }
        // the last line's letters wobble after it lands, two cycles in 0.5 s, dying away
        const wa = payAt + Math.max(p.duration, 0.3);
        wob.forEach((c, j) => {
          const x = t - wa - j * 0.03;
          if (x <= 0 || x >= 0.5) { c.style.rotate = "none"; c.style.translate = "none"; return; }
          const amp = 1 - x / 0.5, ph = 2 * Math.PI * 4 * x + j;
          c.style.rotate = `${(5 * amp * Math.sin(ph)).toFixed(2)}deg`;
          c.style.translate = `0 ${(-6 * amp * Math.abs(Math.sin(ph))).toFixed(2)}px`;
        });
      },
    };
  },
});
