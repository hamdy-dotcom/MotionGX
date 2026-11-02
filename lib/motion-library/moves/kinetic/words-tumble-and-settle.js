// Words tumble and settle: a two-line headline set in heavy condensed caps, the key line about 2.3× the other, line
// height 0.8 so the lines overlap into one tight stack. Each word falls in from 60 px above, tilted ±8–15°, and settles
// on back.out(1.4) in 0.5 s, 45 ms apart, with a slight vertical smear (faint trailing copies) while it falls. Then the full stop
// arrives as an object — a ball bouncing in from the side on a decaying bounce path, or a dot dropping straight in —
// and lands after the key line, and a 4 px accent underline draws under the key line in the reading direction (right
// to left in Arabic). Arabic words stay whole and are never cased.
// Source: prompt-motion himanshutwtxs-this-is-insane-opus (reference only — our own rebuild).
ML.define({
  id: "kinetic.words-tumble-and-settle",
  category: "kinetic",
  name: "Words tumble and settle",
  does: "Words of a two-line headline fall in tilted and out of place, then settle into a tight overlapping stack, with an object landing as the full stop and an underline drawing.",
  says: ["playful", "energy", "arrival"],
  energy: 4,
  targets: ["headline"],
  duration: [1.2, 3],
  params: {
    stagger: { type: "number", range: [0.02, 0.1], default: 0.045, unit: "s" },
    rotation: { type: "number", range: [4, 20], default: 12, unit: "deg" },
    period_object: { type: "choice", options: ["ball", "dot", "none"], default: "ball" },
    underline: { type: "bool", default: true },
    key_line: { type: "choice", options: ["last", "first"], default: "last" },
  },
  pairs: ["kinetic.feature-word-period", "accent.progressive-stroke-draw"],
  avoid: ["luxury", "calm", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:himanshutwtxs-this-is-insane-opus", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument, f = ctx.f, k = Math.min(f.W, f.H) / 1080;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim().replace(/[.!؟?。]+$/u, "");
    const words = text.split(" ").filter(Boolean);
    if (!words.length) return null;
    const arabic = ML.ARABIC.test(text);
    // two lines: the first half of the words, then the rest (one word → one line)
    const cut = words.length > 1 ? Math.max(1, Math.floor(words.length / 2)) : words.length;
    const lines = [words.slice(0, cut), words.slice(cut)].filter((l) => l.length);
    const keyIdx = lines.length > 1 && p.key_line === "first" ? 0 : lines.length - 1;
    // ── build ──
    el.textContent = "";
    Object.assign(el.style, { position: "relative", textAlign: "center", lineHeight: "0.8", textTransform: arabic ? "none" : "uppercase", letterSpacing: arabic ? "0" : "-0.02em", fontWeight: "800", fontFamily: "var(--x-head-font)", fontStretch: "condensed", color: "var(--x-ink)", textWrap: "nowrap" });
    const spans = [], lineEls = [];
    let wi = 0;
    lines.forEach((ln, li) => {
      const L = doc.createElement("div");
      Object.assign(L.style, { whiteSpace: "nowrap", lineHeight: arabic ? "1.05" : "0.8", position: "relative" });
      L.dataset.key = li === keyIdx ? "1" : "0";
      el.append(L);
      lineEls.push(L);
      ln.forEach((w, j) => {
        if (j) L.append(" ");
        const s = doc.createElement("span");
        s.textContent = w;
        s.style.display = "inline-block";
        L.append(s);
        spans.push({ s, li, i: wi++ });
      });
    });
    // sizes: the key line ~2.3× the other, the key line fitted to the width and the stack to the band's height
    const room = el.clientWidth || f.safe.w;
    // the height it may take: its band less what else sits in it (a sub line), so the stack never shoves its neighbours off
    const par = el.parentElement, band = (par && par.clientHeight) || f.head.h;
    const others = par ? [...par.children].filter((c) => c !== el).reduce((a, c) => a + c.offsetHeight + 18, 0) : 0;
    const avail = Math.max(band - others, band * 0.55);
    const probe = 100;
    lineEls.forEach((L) => (L.style.fontSize = (L.dataset.key === "1" ? probe * 2.3 : probe) + "px"));
    const widest = Math.max(...lineEls.map((L) => L.scrollWidth || L.offsetWidth));
    let unit = (probe * room * 0.96) / Math.max(1, widest);
    const stackH = (lines.length > 1 ? 3.3 : 2.3) * (arabic ? 1.05 : 0.8);
    unit = Math.min(unit, (avail * 1.2) / stackH, 120 * k * (f.wide ? 1.2 : 1));
    lineEls.forEach((L) => (L.style.fontSize = (L.dataset.key === "1" ? unit * 2.3 : unit).toFixed(2) + "px"));
    const keyL = lineEls[keyIdx];
    // the full stop (ball / dot) after the key line's end, and the underline under the key line
    const keySpans = spans.filter((x) => x.li === keyIdx);
    const lastS = keySpans[keySpans.length - 1].s;
    const kh = unit * 2.3;
    const dotD = kh * (p.period_object === "ball" ? 0.2 : 0.15);
    const endX = rtl ? lastS.offsetLeft - dotD * 0.35 - dotD : lastS.offsetLeft + lastS.offsetWidth + dotD * 0.35;
    // the key line's baseline: a zero-size probe sitting on it
    const bp = doc.createElement("span");
    Object.assign(bp.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
    keyL.append(bp);
    const baseY = bp.offsetTop;
    bp.remove();
    const per = p.period_object !== "none" ? doc.createElement("div") : null;
    if (per) {
      Object.assign(per.style, { position: "absolute", left: endX.toFixed(1) + "px", top: (baseY - dotD).toFixed(1) + "px", width: dotD.toFixed(1) + "px", height: dotD.toFixed(1) + "px", borderRadius: "50%", background: p.period_object === "ball" ? "radial-gradient(circle at 35% 30%, var(--x-accent-2), var(--x-accent) 62%)" : "var(--x-accent)" });
      keyL.append(per);
    }
    const ul = doc.createElement("div");
    const ulW = keyL.scrollWidth, inkL = Math.min(...keySpans.map((x) => x.s.offsetLeft)), inkR = Math.max(...keySpans.map((x) => x.s.offsetLeft + x.s.offsetWidth));
    Object.assign(ul.style, { position: "absolute", left: inkL.toFixed(1) + "px", width: (inkR - inkL).toFixed(1) + "px", top: (baseY + kh * (arabic ? 0.32 : 0.06)).toFixed(1) + "px", height: Math.max(3, 4 * k * 1.5).toFixed(1) + "px", background: "var(--x-accent)", transformOrigin: rtl ? "right" : "left", display: p.underline ? "block" : "none" });
    void ulW;
    keyL.append(ul);
    // ── times ──
    const n = spans.length, fall = 0.5;
    const tw = spans.map((x) => at + x.i * p.stagger);
    const settled = tw[n - 1] + fall * 0.7;
    const perAt = settled, perLand = perAt + 0.65;
    const ulAt = (per ? perLand : settled) + 0.02;
    const tilt = spans.map((x) => (x.i % 2 ? -1 : 1) * p.rotation * (0.65 + 0.35 * ML.rnd(x.i, 6)) * (rtl ? -1 : 1));
    ctx.sfx(at + fall * 0.6, "land.light", 0.3);
    if (per) ctx.sfx(perLand, "land", 0.4);
    if (p.underline) ctx.sfx(ulAt, "whoosh.soft", 0.15);
    const side = rtl ? -1 : 1; // the ball comes in from beyond the line's end
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        el.style.opacity = (1 - leave).toFixed(4);
        el.style.translate = `0 ${(leave * 18 * k).toFixed(2)}px`;
        spans.forEach((x, j) => {
          const a = tw[j], u = ML.back(t, a, a + fall, 1.4), lin = ML.lin(t, a, a + fall);
          const shown = t >= a;
          x.s.style.opacity = shown ? Math.min(1, ML.lin(t, a, a + 0.08)).toFixed(4) : "0";
          x.s.style.transform = `translateY(${((1 - u) * -60 * k).toFixed(2)}px) rotate(${(tilt[j] * (1 - u)).toFixed(3)}deg)`;
          // vertical motion blur only while it falls fast (first ~60% of the drop)
          // (a smear of faint copies trailing upward: vertical only, and the same pixels every time)
          const mb = shown ? Math.max(0, 1 - lin / 0.6) * 9 * k : 0;
          x.s.style.textShadow = mb > 0.1 ? [0.35, 0.7, 1].map((q, m) => `0 ${(-mb * q).toFixed(2)}px 0 color-mix(in srgb, currentColor ${[30, 18, 9][m]}%, transparent)`).join(", ") : "none";
        });
        if (per) {
          if (t < perAt) per.style.opacity = "0";
          else {
            per.style.opacity = "1";
            const u = ML.lin(t, perAt, perLand);
            let dx = 0, dy = 0;
            if (p.period_object === "ball") {
              // decaying bounces: three hops, each lower, the ball rolling in from the side
              const hops = 3, ph = u * hops, hop = Math.floor(Math.min(ph, hops - 1e-6)), fr = ph - hop;
              const amp = kh * 0.9 * Math.pow(0.42, hop);
              dy = -4 * amp * fr * (1 - fr) * (u < 1 ? 1 : 0) - (hop === 0 ? (1 - fr) * kh * 0.6 : 0);
              dx = side * (1 - ML.out(t, perAt, perLand)) * kh * 2.2;
            } else {
              const v = ML.back(t, perAt, perAt + 0.4, 2);
              dy = -(1 - v) * kh * 0.9;
            }
            per.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
          }
        }
        ul.style.transform = `scaleX(${ML.out(t, ulAt, ulAt + 0.35).toFixed(4)})`;
      },
    };
  },
});
