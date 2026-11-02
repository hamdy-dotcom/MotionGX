// Word swap cut: inside a still headline only one word changes — it flips to a synonym and on, and (optionally) back
// to the first, on the beat with a hard cut (the new word is simply there on the next frame) and a small punch,
// scale 1.06 → 1 over 0.15 s. The swap word sits in the accent the whole time so the eye stays on it; 0.5–0.7 s per
// word (FRAME → PIXEL → FRAME). The slot keeps the widest word's width (text centred in it) so the line never moves,
// or lets a centred line re-centre. Whole words only — Arabic-safe.
// Source: prompt-motion motiondsgnr-yo-opus-5-5-raw (reference) — our own code.
ML.define({
  id: "text-emphasis.word-swap-cut",
  category: "text-emphasis",
  name: "Hard-cut word swap on the beat",
  does: "Inside a still headline one word flips to a synonym and back on the beat with a hard cut and a small punch.",
  says: ["choice", "playful", "energy", "change"],
  energy: 3,
  targets: ["word"],
  duration: [1, 4],
  params: {
    words: { type: "text", default: "" },
    "per-word": { type: "number", range: [0.4, 0.8], default: 0.6, unit: "s" },
    punch: { type: "number", range: [1, 1.1], default: 1.06 },
    return: { type: "bool", default: true },
    "fixed-width": { type: "bool", default: true },
    "slot-word": { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const want = ML.plain(p["slot-word"] || "");
    const w = (want && words.find((x) => ML.plain(x.textContent) === want)) || words[words.length - 1];
    // keep trailing punctuation outside the swap
    const m = w.textContent.match(/^(.*?)([.,،؛؟?!…:]*)$/);
    const real = m[1], tail = m[2];
    // the other words: named (comma-separated), else the voice's own words not in this line
    const clean = (x) => String(x).replace(/[.,،؛؟?!…:«»"'()]/g, "");
    const inLine = new Set(words.map((x) => ML.plain(x.textContent)));
    let alts = String(p.words || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!alts.length) alts = (ctx.words || []).map((v) => clean(typeof v === "string" ? v : v.w)).filter((x) => x && !inLine.has(ML.plain(x)));
    alts = alts.filter((x, i, a) => ML.plain(x) !== ML.plain(real) && a.findIndex((y) => ML.plain(y) === ML.plain(x)) === i);
    if (!alts.length) alts = words.filter((x) => x !== w).map((x) => clean(x.textContent)).filter(Boolean).slice(0, 2);
    // how many fit in the run at this pace
    const room = Math.max(1, Math.floor((end - at - 0.5) / p["per-word"]) - (p.return ? 1 : 0));
    const seq = [real, ...alts.slice(0, Math.min(3, room))];
    if (p.return && seq.length > 1) seq.push(real);
    w.textContent = "";
    const slot = document.createElement("span");
    Object.assign(slot.style, { display: "inline-block", textAlign: "center", color: "var(--x-accent)", transformOrigin: "50% 60%", whiteSpace: "pre" });
    w.append(slot);
    if (tail) w.append(tail);
    const sk = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const widths = seq.map((x) => { slot.textContent = x; return slot.getBoundingClientRect().width / sk; });
    if (p["fixed-width"]) slot.style.width = Math.max(...widths).toFixed(2) + "px";
    slot.textContent = real;
    const T = seq.map((_, i) => at + 0.25 + i * p["per-word"]);
    T.slice(1).forEach((t) => ctx.sfx(t, "tap", 0.3));
    return {
      draw(t) {
        let k = 0;
        for (let i = 1; i < T.length; i++) if (t >= T[i]) k = i;
        if (slot.textContent !== seq[k]) slot.textContent = seq[k];
        const hit = k > 0 ? 1 - ML.out(t, T[k], T[k] + 0.15) : 0;
        const s = 1 + (p.punch - 1) * hit;
        slot.style.transform = s > 1.0001 ? `scale(${s.toFixed(4)})` : "none";
      },
    };
  },
});
