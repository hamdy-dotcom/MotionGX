// Recipe step card pops in: beside the object, the step's big verb ("FILL") stamps in first — heavy, in the accent,
// scale 1.6 → 1 in 0.2 s — then a small card (the panel colour, a 1.5 px ink outline, radius 8, a hard offset shadow)
// scales 0.85 → 1 and rises y 10 → 0 on back.out in 0.3 s while the verb travels into its line inside it. The card
// reads "STEP 1 OF 6" (small, the accent, label face), the verb (heavy), the object ("ICE"), a details line, and a
// sub-step progress — a bar with "0/3" filling as each sub-step happens, or a row of dots. With a target the card sits
// at its side with the most room (vertically centred on it, kept inside the frame); with none, in the picture region.
// RTL mirrors the side, the stamp's offset and the bar's fill direction; Arabic words stay whole.
// Source: prompt-motion ror-fly-opus-5-5-rendered-this (reference only — rebuilt as our own code).
ML.define({
  id: "ui.step-card-pop",
  category: "ui",
  name: "Recipe step card pops in",
  does: "A small card appears beside the object reading 'STEP 1 OF 6 — FILL — ICE' with a mini progress bar, its big verb stamped first.",
  says: ["step", "list", "time"],
  energy: 2,
  targets: ["card", "label"],
  duration: [0.8, 2],
  params: {
    steps_total: { type: "number", range: [2, 10], default: 6 },
    step: { type: "number", range: [1, 10], default: 1 },
    progress: { type: "choice", options: ["bar", "dots"], default: "bar" },
    substeps: { type: "number", range: [1, 6], default: 3 },
    verb: { type: "text" },
    object: { type: "text" },
    details: { type: "text" },
  },
  pairs: ["ui.step-dots-progress", "ui.checklist-tick", "text-in.punchline"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:ror-fly-opus-5-5-rendered-this", license: "reference", note: "verb stamp 1.6 → 1 (0.2 s), outlined card with offset shadow 0.85 → 1 + y 10 → 0 back.out (0.3 s), verb moves into it, sub-step progress" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const num = (n) => (rtl ? Number(n).toLocaleString("ar-EG") : String(n));
    const total = Math.round(p.steps_total), stepN = Math.min(total, Math.round(p.step)), subs = Math.round(p.substeps);
    const verb = p.verb || (rtl ? "اِملا" : "FILL");
    const object = p.object || (rtl ? "تلج" : "ICE");
    const details = p.details != null ? p.details : rtl ? "لحد حافة الكوباية" : "to the rim of the glass";
    const px = (v) => (v * k).toFixed(2) + "px";

    // the card, built in place so it can be measured; positioned once we know its size
    const CW = Math.min(440 * k, f.W * 0.62);
    const card = mk("div", `position:absolute;left:0;top:0;width:${CW.toFixed(1)}px;box-sizing:border-box;padding:${px(24)} ${px(28)};z-index:7;background:var(--x-panel);color:var(--x-ink);border:${Math.max(1, 1.5 * k).toFixed(2)}px solid var(--x-ink);border-radius:${px(8)};box-shadow:${px(5)} ${px(5)} 0 var(--x-ink);display:flex;flex-direction:column;gap:${px(6)};transform-origin:50% 100%;opacity:0;will-change:transform, opacity;`, host);
    card.dir = rtl ? "rtl" : "ltr";
    mk("div", `font:var(--x-label-weight) ${px(17)} var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-accent);`, card, rtl ? `الخطوة ${num(stepN)} من ${num(total)}` : `Step ${stepN} of ${total}`);
    const verbFont = `font:900 ${px(66)}/1 var(--x-head-font);letter-spacing:var(--x-head-track);text-transform:${rtl ? "none" : "uppercase"};`;
    const slot = mk("div", `${verbFont}visibility:hidden;align-self:flex-start;color:var(--x-accent);`, card, verb);
    mk("div", `font:var(--x-head-weight) ${px(34)}/1.1 var(--x-head-font);text-transform:${rtl ? "none" : "uppercase"};`, card, object);
    if (details) mk("div", `font:var(--x-body-weight) ${px(22)}/1.3 var(--x-body-font);color:var(--x-dim);`, card, details);
    const prog = mk("div", `display:flex;align-items:center;gap:${px(12)};margin-top:${px(10)};`, card);
    let fill = null, dots = [], count = null;
    if (p.progress === "dots") {
      dots = Array.from({ length: subs }, () => mk("span", `width:${px(14)};height:${px(14)};border-radius:50%;box-sizing:border-box;border:${Math.max(1, 1.5 * k).toFixed(2)}px solid var(--x-ink);background:transparent;`, prog));
    } else {
      const track = mk("div", `flex:1;height:${px(10)};border-radius:${px(5)};border:${Math.max(1, 1.5 * k).toFixed(2)}px solid var(--x-ink);box-sizing:border-box;overflow:hidden;background:var(--x-panel-2);`, prog);
      fill = mk("div", `width:100%;height:100%;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0"} 50%;transform:scaleX(0);`, track);
    }
    count = mk("span", `font:var(--x-label-weight) ${px(18)} var(--x-mono-font);font-variant-numeric:tabular-nums;color:var(--x-dim);min-width:2.6em;text-align:end;`, prog, `${num(0)}/${num(subs)}`);
    const CH = card.offsetHeight;

    // where it sits: beside the target (the side with more room), or in the picture region
    let x, y;
    if (el) {
      const b = ctx.box(el), gap = 36 * k, roomR = f.W - (b.x + b.w), roomL = b.x;
      const preferEnd = rtl ? roomL >= CW + gap : roomR >= CW + gap;
      const right = rtl ? !preferEnd && roomR > roomL : preferEnd || roomR > roomL;
      x = right ? b.x + b.w + gap : b.x - gap - CW;
      y = b.y + b.h / 2 - CH / 2;
    } else {
      x = f.pic.x + (f.pic.w - CW) / 2; y = f.pic.y + (f.pic.h - CH) / 2;
    }
    x = ML.clamp(x, f.m * 0.5, f.W - f.m * 0.5 - CW);
    y = ML.clamp(y, f.safe.y, f.safe.y + f.safe.h - CH);
    card.style.left = x.toFixed(1) + "px"; card.style.top = y.toFixed(1) + "px";

    // the stamped verb: its own layer in the scene, landing at the slot inside the card
    const bw = card.clientLeft; // the outline: offsets are measured from inside it
    const sb = { x: x + bw + slot.offsetLeft, y: y + bw + slot.offsetTop };
    const verbEl = mk("div", `position:absolute;left:${sb.x.toFixed(1)}px;top:${sb.y.toFixed(1)}px;${verbFont}font-size:${px(66 * 1.6 * 1.4)};color:var(--x-accent);white-space:nowrap;z-index:8;transform-origin:0 0;opacity:0;will-change:transform, opacity;`, host, verb);
    verbEl.dir = rtl ? "rtl" : "ltr";
    if (rtl) { verbEl.style.left = "auto"; verbEl.style.right = (f.W - (x + bw + slot.offsetLeft + slot.offsetWidth)).toFixed(1) + "px"; verbEl.style.transformOrigin = "100% 0"; }
    // the stamp spot: above the card, out to the side it reads from, 1.4× as big
    const BIG = 1.4, side = rtl ? 1 : -1;
    const sx = side * 60 * k, sy = -Math.min(CH * 0.35 + 40 * k, y - f.safe.y + 20 * k);

    // timing: stamp, card, verb settles, sub-steps through the rest
    const tStamp = at, tCard = at + 0.3, tMove = at + 0.36, tSub0 = at + 0.85; // the stamp holds a beat, so it reads first
    const gone = (t) => ML.lin(t, end - 0.25, end);
    const room = Math.max(0.3, end - 0.3 - tSub0), gapSub = Math.min(0.6, room / subs);
    const subT = Array.from({ length: subs }, (_, i) => tSub0 + i * gapSub);
    ctx.sfx(tStamp, "hit", 0.5);
    ctx.sfx(tCard, "pop.soft", 0.3);
    subT.forEach((t) => ctx.sfx(t, "tap", 0.2));

    return {
      draw(t) {
        // verb: stamp at the side (1.6 → 1 of BIG), then travel into the slot (BIG → 1)
        const st = ML.out(t, tStamp, tStamp + 0.2), mv = ML.ease(t, tMove, tMove + 0.32);
        verbEl.style.opacity = t < tStamp ? "0" : (ML.lin(t, tStamp, tStamp + 0.06) * (1 - gone(t))).toFixed(4);
        // drawn at its biggest and only ever scaled down (stays sharp); once in the slot the card's own line takes over
        const s = ((1.6 - 0.6 * st) * (BIG + (1 - BIG) * mv)) / (1.6 * BIG);
        const dx = sx * (1 - mv), dy = sy * (1 - mv), landed = mv >= 1;
        verbEl.style.visibility = landed ? "hidden" : "visible";
        slot.style.visibility = landed ? "visible" : "hidden";
        verbEl.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(4)})`;
        // card: 0.85 → 1, y 10 → 0, back.out
        const c = ML.back(t, tCard, tCard + 0.3, 1.7);
        card.style.opacity = t < tCard ? "0" : (ML.lin(t, tCard, tCard + 0.12) * (1 - gone(t))).toFixed(4);
        card.style.transform = t >= tCard + 0.3 ? "none" : `translateY(${((1 - c) * 10 * k).toFixed(2)}px) scale(${(0.85 + 0.15 * c).toFixed(4)})`;
        // sub-steps
        let done = 0;
        subT.forEach((a) => { done += ML.out(t, a, a + 0.25); });
        if (fill) fill.style.transform = `scaleX(${(done / subs).toFixed(4)})`;
        dots.forEach((d, i) => { const u = ML.out(t, subT[i], subT[i] + 0.2); d.style.background = u <= 0 ? "transparent" : `color-mix(in srgb, var(--x-accent) ${(u * 100).toFixed(1)}%, transparent)`; });
        const whole = subT.filter((a) => t >= a + 0.12).length, txt = `${num(whole)}/${num(subs)}`;
        if (count.textContent !== txt) count.textContent = txt;
      },
    };
  },
});
