// Handwritten note with a drawn arrow: a handwritten label writes on beside an object, then a curved, slightly wobbly
// hand-drawn arrow draws from it to the thing it names and its head ticks in. Our own rebuild of four prompt-motion
// references: the label in the look's hand font (Caveat / Aref Ruqaa), tilted −4..−2°, writes on by a clip-path inset
// opening from the reading side over 0.3–0.5 s (or pops 0.6 → 1 with a −6° → −2° turn on back-out, or types in); the
// arrow is an SVG cubic with a seeded wobble, round caps, drawn by stroke-dashoffset 1 → 0 over 0.4 s in-out; its head
// is two short strokes drawn in the last 0.1 s. Either can appear alone (label "none" = arrow only, arrow off = label
// only). Colour by meaning: red = problem / impact (the look's bad hue), blue = a neutral note, ink, or the accent.
// Placed outside the target on the chosen side (mirrored in Arabic, where the note sits on the reading side), kept on
// the frame. Arabic labels are one text run (never split), so their letters stay joined.
// Sources: prompt-motion himanshutwtxs-this-is-insane-opus, ajith-io-claude-cooked-really-hard,
// chatgptastra-opus-5-5-15, ik-builds-i-was-quoted-3000 (reference only — our own code).
ML.define({
  id: "accent.handwritten-annotation",
  category: "accent",
  name: "Handwritten note with a drawn arrow",
  does: "A handwritten label writes on beside an object and a curved hand-drawn arrow draws from it to the thing it names.",
  says: ["playful", "story", "focus", "connection", "step", "simplicity"],
  energy: 2,
  targets: ["label", "shape", "word", "card"],
  duration: [0.8, 3],
  params: {
    label: { type: "choice", options: ["write-on", "pop", "type-in", "none"], default: "write-on" },
    arrow: { type: "bool", default: true },
    curve: { type: "choice", options: ["cw", "ccw"], default: "cw" },
    colour: { type: "choice", options: ["red", "blue", "ink", "accent"], default: "red" },
    side: { type: "choice", options: ["right", "left"], default: "right" },
    text: { type: "text", default: "" },
    jitter: { type: "bool", default: false },
  },
  pairs: ["accent.callout-leader", "text-emphasis.marker-circle"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:himanshutwtxs-this-is-insane-opus", license: "reference", note: "with ajith-io-claude-cooked-really-hard, chatgptastra-opus-5-5-15, ik-builds-i-was-quoted-3000; our own code" },
  setup(ctx) {
    const { p, at, end, stage, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const el = ctx.el && ctx.el !== stage ? ctx.el : host.querySelector(".ml-panel");
    const tb = el ? ctx.box(el) : { x: f.pic.x + f.pic.w * 0.3, y: f.pic.y + f.pic.h * 0.4, w: f.pic.w * 0.4, h: f.pic.h * 0.2 };
    const minSide = Math.min(f.W, f.H), k = minSide / 1080;
    const COL = { red: "var(--x-bad)", blue: "color-mix(in oklab, var(--x-accent) 65%, var(--x-ink))", ink: "var(--x-ink)", accent: "var(--x-accent)" };
    const col = COL[p.colour] || COL.red;
    // the side the note sits on: "right" is the side after the text in reading order, so it mirrors in Arabic
    const toRight = (p.side !== "left") !== rtl;
    const txt = String(p.text || "").trim() || (rtl ? "شوف دي!" : "look at this!");
    const fs = ML.clamp(tb.h * 0.9, 34 * k, 58 * k);

    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:24;visibility:hidden;will-change:transform";
    host.append(layer);
    // the label: one run of hand-written text
    const lab = doc.createElement("div");
    lab.textContent = txt;
    lab.setAttribute("dir", rtl ? "rtl" : "ltr");
    lab.style.cssText = `position:absolute;white-space:nowrap;font:500 ${fs.toFixed(1)}px/1.1 var(--x-hand-font);color:${col};letter-spacing:0;transform-origin:50% 60%;`;
    layer.append(lab);
    const lw = lab.offsetWidth, lh = lab.offsetHeight;
    // place: diagonally outside the target on its side, above it when there's room, else below; kept inside the frame
    const gapX = Math.max(40 * k, minSide * 0.05), gapY = Math.max(60 * k, minSide * 0.08);
    const safe = { x0: f.m * 0.5, x1: f.W - f.m * 0.5, y0: f.safe.y * 0.6, y1: f.H - f.safe.y * 0.6 };
    const above = tb.y - gapY - lh > safe.y0;
    let lx = toRight ? tb.x + tb.w * 0.72 + gapX : tb.x + tb.w * 0.28 - gapX - lw;
    if (lx + lw > safe.x1) lx = safe.x1 - lw;
    if (lx < safe.x0) lx = safe.x0;
    const ly = above ? tb.y - gapY - lh : Math.min(tb.y + tb.h + gapY, safe.y1 - lh);
    lab.style.left = lx.toFixed(1) + "px"; lab.style.top = ly.toFixed(1) + "px";
    const tilt = -2 - 2 * ML.rnd(lx, 3); // −2..−4°

    // the arrow: from the label's edge nearest the target to a point just outside the target's edge
    const sv = (tag, a, parent) => { const e = doc.createElementNS(NS, tag); for (const [kk, v] of Object.entries(a)) e.setAttribute(kk, v); parent.append(e); return e; };
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}` }, layer);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;will-change:transform";
    const sx = ML.clamp(tb.x + tb.w / 2, lx + lw * 0.15, lx + lw * 0.85);
    const startX = toRight ? Math.min(lx + lw * 0.3, sx) : Math.max(lx + lw * 0.7, sx);
    const startY = above ? ly + lh * 1.05 : ly - lh * 0.1;
    const endX = ML.clamp(toRight ? tb.x + tb.w * 0.72 : tb.x + tb.w * 0.28, tb.x + 8 * k, tb.x + tb.w - 8 * k);
    const endY = above ? tb.y - 10 * k : tb.y + tb.h + 10 * k;
    const dx = endX - startX, dy = endY - startY, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, bend = (p.curve === "ccw" ? -1 : 1) * (rtl ? -1 : 1) * L * 0.38;
    const w = (i) => (ML.rnd(i, Math.round(lx)) - 0.5) * L * 0.06; // the hand's wobble, seeded
    const c1 = [startX + dx * 0.25 + nx * bend + w(1), startY + dy * 0.25 + ny * bend + w(2)];
    const c2 = [startX + dx * 0.8 + nx * bend * 0.6 + w(3), startY + dy * 0.8 + ny * bend * 0.6 + w(4)];
    const sw = Math.max(2, 3.2 * k);
    const shaft = sv("path", { d: `M${startX.toFixed(1)} ${startY.toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": sw.toFixed(2) }, svg);
    shaft.style.stroke = col;
    const len = shaft.getTotalLength();
    shaft.setAttribute("stroke-dasharray", `${len.toFixed(2)} ${(len + 10).toFixed(2)}`);
    // the head: two short strokes at the tip, along the tangent
    const tip = shaft.getPointAtLength(len), back = shaft.getPointAtLength(Math.max(0, len - 6));
    const ang = Math.atan2(tip.y - back.y, tip.x - back.x), hl = Math.max(16 * k, L * 0.12);
    const heads = [0.55, -0.5].map((da) => {
      const a = ang + Math.PI + da;
      const e = sv("path", { d: `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L${(tip.x + Math.cos(a) * hl).toFixed(1)} ${(tip.y + Math.sin(a) * hl).toFixed(1)}`, fill: "none", "stroke-linecap": "round", "stroke-width": sw.toFixed(2), "stroke-dasharray": `${hl.toFixed(2)} ${(hl + 10).toFixed(2)}` }, svg);
      e.style.stroke = col; return e;
    });

    // timing: label first, the arrow after it (or the arrow alone)
    const hasLabel = p.label !== "none", hasArrow = p.arrow !== false || !hasLabel;
    lab.style.display = hasLabel ? "" : "none";
    svg.style.display = hasArrow ? "" : "none";
    const labDur = p.label === "pop" ? 0.22 : p.label === "type-in" ? Math.min(0.9, 0.05 * Array.from(txt).length + 0.15) : 0.45;
    const aT0 = hasLabel ? at + labDur * 0.8 : at, aT1 = aT0 + 0.4, hT1 = aT1 + 0.1;
    if (hasLabel) ctx.sfx(at, p.label === "pop" ? "pop.soft" : "tap", 0.25);
    if (hasArrow) ctx.sfx(aT0, "whoosh.soft", 0.15);

    return {
      draw(t) {
        if (t < at - 1e-6 || t > end + 0.05) { layer.style.visibility = "hidden"; return; }
        layer.style.visibility = "visible";
        const leave = ML.ease(t, end - 0.25, end);
        layer.style.opacity = (1 - leave).toFixed(4);
        // a boiling hand: the tilt steps a little every 1/8 s (seeded), when asked
        const boil = p.jitter ? (ML.rnd(Math.floor(t * 8), 5) - 0.5) * 1.2 : 0;
        if (hasLabel) {
          if (p.label === "pop") {
            const u = ML.back(t, at, at + labDur, 2);
            lab.style.opacity = ML.lin(t, at, at + 0.06).toFixed(4);
            lab.style.transform = `rotate(${(-6 + (tilt + 6) * Math.min(1, u) + boil).toFixed(2)}deg) scale(${(0.6 + 0.4 * u).toFixed(4)})`;
            lab.style.clipPath = "none";
          } else if (p.label === "type-in") {
            lab.textContent = ML.typed(txt, t, at, at + labDur) || "​";
            lab.style.transform = `rotate(${(tilt + boil).toFixed(2)}deg)`;
          } else {
            // write-on: the clip opens from the reading side (left in English, right in Arabic)
            const u = ML.lin(t, at, at + labDur), cut = ((1 - u) * 104).toFixed(2);
            lab.style.clipPath = rtl ? `inset(-30% -4% -30% ${cut}%)` : `inset(-30% ${cut}% -30% -4%)`;
            lab.style.transform = `rotate(${(tilt + boil).toFixed(2)}deg)`;
          }
        }
        if (hasArrow) {
          const u = ML.ease(t, aT0, aT1);
          shaft.setAttribute("stroke-dashoffset", (len * (1 - u)).toFixed(2));
          shaft.style.opacity = u > 0 ? "1" : "0";
          const h = ML.out(t, aT1, hT1);
          heads.forEach((e) => { e.setAttribute("stroke-dashoffset", (hl * (1 - h)).toFixed(2)); e.style.opacity = h > 0 ? "1" : "0"; });
        }
      },
    };
  },
});
