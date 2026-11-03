// Running tally on events: a total or balance changes on each event (a card lands, a step finishes, a ring breaks), not
// on a smooth clock — either a hard swap at the event + 0.15 s, or a short tween to the new total (0.3 s power2.out) —
// with a scale bump (1 → `bump`, back.out, 0.25 s) and a brief brighten toward the accent, then back. Large: a heavy
// total with an optional small unit ("/month") and a small grey label above ("Typical separate stack"); small: a
// 12 px-style bold accent caps status line ("2,393 CREDITS LEFT"). Ending (optional): the value turns from ink to bad
// (0.3 s) with a small note fading in below. Compressed time (html-demo film rule): with `time_ratio` > 1 a small clock
// runs the app's time at that many seconds per film second ("in 2:14"), while the numbers stay true. Events: a steady
// beat across the move, or the spoken words' times. The state is a fold over the events up to t (pure).
// On a number slot the slot itself tallies (from its own figure); on a label it becomes the status line.
// Sources: MengTo/Skills web-design/html-demo SKILL.md + references/film.md (MIT: beats folded per moment, credits spent /
// left per step, compressed demo time); prompt-motion kantamk-i-gave-claude-opus, bizibeast-motion-designers-are-cooked
// (reference only).
ML.define({
  id: "data.event-tally",
  category: "data",
  name: "Running tally on events",
  does: "A total or balance changes on each event with a small bump, and may turn colour at the end.",
  says: ["proof", "money", "result", "time", "problem", "urgency"],
  energy: 2,
  targets: ["number", "label"],
  duration: [1, 6],
  params: {
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    change: { type: "choice", options: ["swap", "tween"], default: "tween" },
    bump: { type: "number", range: [1, 1.2], default: 1.06 },
    final_colour: { type: "bool", default: false },
    time_ratio: { type: "number", range: [1, 30], default: 1 },
    size: { type: "choice", options: ["small", "large"], default: "large" },
    events: { type: "number", range: [2, 10], default: 4 },
    sync: { type: "choice", options: ["steady", "spoken"], default: "steady" },
    start: { type: "number", range: [0, 1000000], default: 2400 },
    step: { type: "number", range: [1, 100000], default: 7 },
    label: { type: "text", default: "" },
    unit: { type: "text", default: "" },
    note: { type: "text", default: "" },
  },
  pairs: ["data.escape-rings-bounce", "data.odometer"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/html-demo/references/film.md", license: "MIT", note: "with prompt-motion kantamk-i-gave-claude-opus + bizibeast-motion-designers-are-cooked as reference" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const ownTxt = el ? String(el.textContent || "").trim() : "";
    const ownNum = parseFloat(ownTxt.replace(/[^\d.]/g, ""));
    const isNum = !!(el && el.childElementCount === 0 && /\d/.test(ownTxt) && Number.isFinite(ownNum));
    const decimals = isNum && /\.\d+/.test(ownTxt) ? ownTxt.split(".")[1].replace(/\D/g, "").length : 0;
    const prefix = isNum ? (ownTxt.match(/^[^\d]*/) || [""])[0] : "";
    const suffix = isNum ? (ownTxt.match(/[^\d.,]*$/) || [""])[0] : "";
    const fmt = (v) => prefix + Math.max(0, v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

    // the events: a steady beat, or the spoken words inside the move
    const ne = Math.round(ML.clamp(p.events, 2, 10));
    const a0 = at + 0.35, a1 = Math.max(a0 + 0.3, end - (p.final_colour ? 1.5 : 0.6)); // the red turn and its note need time to be read
    let evT = Array.from({ length: ne }, (_, i) => a0 + ((a1 - a0) * i) / Math.max(1, ne - 1));
    if (p.sync === "spoken") { const ws = (ctx.words || []).map((w) => w.t).filter((x) => x >= a0 && x <= a1); if (ws.length >= 2) evT = ws.slice(0, 10); }
    const sign = p.direction === "down" ? -1 : 1;
    const base = isNum && +p.start === 2400 ? ownNum : +p.start;
    const vals = [base];
    evT.forEach((_, i) => { const d = Math.max(1, Math.round(+p.step * (0.5 + ML.rnd(i, 51)))); vals.push(Math.max(0, vals[i] + sign * d)); });
    evT.forEach((t) => ctx.sfx(t, "blip", 0.3));

    // the readout
    const large = p.size === "large";
    let host, val;
    const labTxt = p.label || (isNum || !el ? (rtl ? "الرصيد" : "BALANCE") : ownTxt);
    if (el) { el.textContent = ""; Object.assign(el.style, { position: "relative" }); if (getComputedStyle(el).display === "inline") el.style.display = "inline-block"; host = el; }
    else host = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y + f.pic.h / 2}px;width:${f.pic.w}px;translate:0 -50%;display:flex;justify-content:center;z-index:20;will-change:transform`, ctx.scene || stage);
    const box = mk("div", `display:inline-flex;flex-direction:column;align-items:flex-start;gap:${6 * u}px;direction:${rtl ? "rtl" : "ltr"};will-change:transform`, host);
    const smallType = Math.round((f.tall ? 28 : 22) * u); // label, note and clock: readable on a phone
    const elFs = el ? parseFloat(getComputedStyle(el).fontSize) || 100 : 160 * u;
    if (large) {
      if (!isNum || p.label) mk("div", `font:var(--x-label-weight) ${smallType}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`, box, labTxt);
      const line = mk("div", `display:flex;align-items:baseline;gap:${8 * u}px`, box);
      val = mk("span", `display:inline-block;font:800 ${isNum ? elFs : Math.max(elFs, 110 * u)}px/1 var(--x-head-font);letter-spacing:var(--x-hero-track);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;transform-origin:${rtl ? "100%" : "0%"} 70%`, line);
      if (p.unit) mk("span", `font:500 ${Math.round(Math.max(26 * u, elFs * 0.24))}px/1 var(--x-body-font);color:var(--x-dim)`, line, p.unit);
    } else {
      const line = mk("div", `display:flex;align-items:baseline;gap:${10 * u}px;font:800 ${Math.round(34 * u)}px/1.1 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-accent)`, box);
      val = mk("span", `display:inline-block;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;transform-origin:${rtl ? "100%" : "0%"} 70%`, line);
      // a figure with its own words ("2,393 CREDITS LEFT") needs no default label after it
      const words = p.label || (isNum && suffix.trim() ? "" : labTxt);
      if (p.unit || words) mk("span", "", line, [p.unit, words].filter(Boolean).join(" "));
    }
    const note = p.final_colour ? mk("div", `font:500 ${smallType}px/1.3 var(--x-body-font);color:var(--x-bad)`, box, p.note || (rtl ? "تعدّى الميزانية" : "over budget")) : null;
    const clock = p.time_ratio > 1 ? mk("div", `font:500 ${smallType}px/1 var(--x-mono-font);color:var(--x-dim);direction:${rtl ? "rtl" : "ltr"}`, box) : null;
    const tFinal = evT[evT.length - 1] + 0.4;
    const baseCol = large ? "var(--x-ink)" : "var(--x-accent)";
    const backOut = (x, c = 1.7) => { const y = ML.clamp(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y; };

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at - 0.1, at + 0.25);
        box.style.opacity = (enter * (1 - leave)).toFixed(4);
        // fold the events up to t
        let k = 0; for (let i = 0; i < evT.length; i++) if (t >= evT[i]) k = i + 1;
        let v = vals[k];
        if (k > 0) {
          const te = evT[k - 1];
          if (p.change === "swap") v = t >= te + 0.15 ? vals[k] : vals[k - 1];
          else { const x = ML.clamp((t - te) / 0.3); v = vals[k - 1] + (vals[k] - vals[k - 1]) * (1 - (1 - x) * (1 - x)); }
        }
        val.textContent = fmt(decimals ? v : Math.round(v));
        // the bump + brighten on the latest event
        let s = 1, glow = 0;
        if (k > 0) {
          const te = evT[k - 1] + (p.change === "swap" ? 0.15 : 0), x = (t - te) / 0.25;
          if (x >= 0 && x < 1) { const up = x < 0.4 ? backOut(x / 0.4) : 1 - ML.ease(x, 0.4, 1); s = 1 + (ML.clamp(p.bump, 1, 1.2) - 1) * up; }
          glow = ML.pulse(t, te + 0.05, 0.04, 0.3);
        }
        val.style.scale = s === 1 ? "none" : s.toFixed(4);
        const red = p.final_colour ? ML.ease(t, tFinal, tFinal + 0.3) : 0;
        const c0 = red > 0 ? `color-mix(in srgb, var(--x-bad) ${(red * 100).toFixed(1)}%, ${baseCol})` : baseCol;
        val.style.color = glow > 0.01 ? `color-mix(in srgb, ${large ? "var(--x-accent)" : "var(--x-accent-2)"} ${(glow * 55).toFixed(1)}%, ${c0})` : c0;
        if (note) { const n = ML.out(t, tFinal + 0.15, tFinal + 0.5); note.style.opacity = n.toFixed(4); note.style.translate = `0 ${((1 - n) * 8 * u).toFixed(2)}px`; }
        if (clock) {
          const s2 = Math.max(0, t - at) * p.time_ratio, m = Math.floor(s2 / 60), r = Math.floor(s2 - m * 60);
          clock.textContent = (rtl ? "خلال " : "in ") + `${m}:${String(r).padStart(2, "0")}`;
        }
      },
    };
  },
});
