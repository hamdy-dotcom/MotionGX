// Dictionary annotation: a bold word lands (a cut, or a quick 0.25 s rise), a heavy rule (6px, red by default) draws
// under it in 0.3 s from the reading start, and a small italic serif definition ("v. to bring into being") fades in
// at its top corner, sliding 10px home, 0.3 s after the rule. The rule runs under each line of the word's ink; the
// note sits at the word's top-right (top-left, or below), mirrored for RTL and kept on the frame. Sizes follow the
// word (never under 28px: the reference's 16px note cannot be read on a phone). When the corner has no room beside a
// wide word, the note sits above it, or below when something else stands directly above. Arabic: an upright note (a
// slanted Arabic face is a browser's fake) with an Arabic default.
// Source: prompt-motion ghinaiya-nirmal "motion designers are cooked" (reference only — our own code).
ML.define({
  id: "text-in.dictionary-annotation",
  category: "text-in",
  name: "Dictionary annotation",
  does: "A bold word lands with a red underline and a small italic dictionary-style definition appears at its corner.",
  says: ["story", "precision", "brand", "focus"],
  energy: 2,
  targets: ["word", "label"],
  duration: [0.8, 3],
  params: {
    position: { type: "choice", options: ["top-right", "top-left", "below"], default: "top-right" },
    rule: { type: "bool", default: true },
    rule_weight: { type: "number", range: [2, 8], default: 6, unit: "px" },
    rule_colour: { type: "choice", options: ["bad", "accent", "ink"], default: "bad" },
    annotation: { type: "text", default: "v. to bring into being" },
    delay: { type: "number", range: [0.1, 0.5], default: 0.3, unit: "s" },
    land: { type: "choice", options: ["rise", "cut"], default: "rise" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:ghinaiya-nirmal-motion-designers-are-cooked", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const W = ctx.f.W, H = ctx.f.H, m = Math.max(24, ctx.f.m || 48);
    // the word is the look's heavy headline type, whatever slot it sits in
    el.style.fontFamily = "var(--x-head-font)"; el.style.fontWeight = "var(--x-head-weight)"; el.style.color = "var(--x-ink)";
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const info = words.map((u) => ctx.box(u));
    const lines = [];
    for (const b of info) { let g = lines.find((l) => Math.abs(l.y - b.y) < fs * 0.5); if (!g) lines.push((g = { y: b.y, l: b.x, r: b.x + b.w, b: b.y + b.h })); g.l = Math.min(g.l, b.x); g.r = Math.max(g.r, b.x + b.w); g.b = Math.max(g.b, b.y + b.h); }
    lines.sort((a, b) => a.y - b.y);
    const host = ctx.scene || ctx.stage;
    const COL = { bad: "var(--x-bad)", accent: "var(--x-accent)", ink: "var(--x-ink)" };
    const weight = p.rule_weight * Math.max(0.5, fs / 120);
    const drop = fs * (ML.ARABIC.test(el.textContent || "") ? 0.07 : 0); // clear of the descenders (Arabic reaches lower)
    const ruleAt = at + (p.land === "cut" ? 0.1 : 0.25);
    const rules = p.rule ? lines.map((g, i) => {
      const r = document.createElement("div");
      r.setAttribute("aria-hidden", "true");
      r.style.cssText = `position:absolute;left:${g.l.toFixed(1)}px;top:${(g.b + drop).toFixed(1)}px;width:${(g.r - g.l).toFixed(1)}px;height:${weight.toFixed(1)}px;background:${COL[p.rule_colour] || COL.bad};transform-origin:${rtl ? "100%" : "0%"} 50%;pointer-events:none;z-index:2;`;
      host.append(r);
      return { r, at: ruleAt + i * 0.12 };
    }) : [];
    // the note
    const note = document.createElement("div");
    note.setAttribute("aria-hidden", "true");
    const DEF = "v. to bring into being";
    note.textContent = p.annotation === DEF && ML.ARABIC.test(el.textContent || "") ? "فعل: أوجد من العدم" : p.annotation || "";
    note.dir = "auto";
    note.style.cssText = `position:absolute;left:0;top:0;font-family:var(--x-serif-font);font-style:${ML.ARABIC.test(note.textContent) ? "normal" : "italic"};font-weight:400;font-size:${Math.max(28, fs * 0.18).toFixed(1)}px;line-height:1.2;color:var(--x-dim);white-space:nowrap;pointer-events:none;z-index:2;`;
    host.append(note);
    const nw = note.offsetWidth, nh = note.offsetHeight;
    const first = lines[0], lastL = lines[lines.length - 1];
    const side = p.position === "below" ? "below" : (p.position === "top-right") !== !!rtl ? "right" : "left";
    const under = () => { ny = lastL.b + drop + weight + fs * 0.12; };
    let nx, ny;
    if (side === "below") { nx = rtl ? lastL.r - nw : lastL.l; under(); }
    else {
      const gapX = fs * 0.06, fits = side === "right" ? first.r + gapX + nw <= W - m * 0.5 : first.l - gapX - nw >= m * 0.5;
      if (fits) { nx = side === "right" ? first.r + gapX : first.l - gapX - nw; ny = first.y - nh * 0.1; }
      else {
        nx = side === "right" ? first.r - nw : first.l;
        if (el.previousElementSibling) { nx = side === "right" ? lastL.r - nw : lastL.l; under(); } else ny = first.y - nh - fs * 0.04;
      }
    }
    nx = ML.clamp(nx, m * 0.5, W - m * 0.5 - nw); ny = ML.clamp(ny, 8, H - nh - 8);
    note.style.left = nx.toFixed(1) + "px"; note.style.top = ny.toFixed(1) + "px";
    const noteAt = ruleAt + p.delay;
    const slide = 10 * Math.max(0.6, fs / 120) * (side === "left" ? -1 : rtl && side === "below" ? -1 : 1);
    ctx.sfx(at, p.land === "cut" ? "hit" : "land.light", 0.3);
    if (p.rule) ctx.sfx(ruleAt, "tap", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        const on = t >= at && t < end;
        el.style.visibility = t < at ? "hidden" : "visible";
        if (p.land === "rise") {
          const e = ML.land(t, at, at + 0.25);
          el.style.opacity = (Math.min(1, e * 1.3) * (1 - leave)).toFixed(4);
          el.style.translate = e >= 1 ? "none" : `0 ${((1 - e) * fs * 0.25).toFixed(2)}px`;
        } else el.style.opacity = (1 - leave).toFixed(4);
        for (const x of rules) {
          const e = ML.out(t, x.at, x.at + 0.3);
          x.r.style.display = on && e > 0 ? "block" : "none";
          x.r.style.transform = `scaleX(${e.toFixed(4)})`;
          x.r.style.opacity = (1 - leave).toFixed(4);
        }
        const e = ML.out(t, noteAt, noteAt + 0.3);
        note.style.display = on && e > 0 ? "block" : "none";
        note.style.opacity = (e * (1 - leave)).toFixed(4);
        note.style.translate = e >= 1 ? "none" : `${((1 - e) * slide).toFixed(2)}px 0`;
      },
    };
  },
});
