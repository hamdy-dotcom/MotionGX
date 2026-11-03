// Billboard stair headline: the headline reset as a compressed, all-caps billboard (head face at weight 900, line
// height .69, tracking -.045em) that fills the frame — 15 % of the stage width per em, 25 % on tall — in 2–3 block
// lines that alternate flush left / flush right, the last line flush right (the stair). It sits on the top layer, so
// its letters crash over whatever pictures are behind it. Enter "wipe": each line slides 6 % in from its flush side
// while a clip opens from that side (inset(0 100% 0 0) → inset(0)), 0.6 s power4.out, lines 0.12 s apart; "cut":
// all lines hard-cut in together on the beat, no tween (brutalist snap); "rise": each line rises out of a mask. Hold; leaves by a
// cut at the end. Arabic: the stair and the wipes mirror, no caps, no negative tracking, a taller line so the
// joined letters' marks stay whole; words stay whole (lines break between words only).
// Source: MengTo/Skills web-design/documentary-brutalist-agency demo (MIT): .hero h1 { font-size 15vw / 25vw;
// line-height .69; letter-spacing -.045em; uppercase } with span { display:block } and span:last-child right-aligned.
ML.define({
  id: "kinetic.billboard-stair-headline",
  category: "kinetic",
  name: "Billboard stair headline",
  does: "A compressed all-caps headline fills the frame in lines that alternate flush left and flush right, crashing over the photos behind it.",
  says: ["energy", "brand", "story", "urgency"],
  energy: 4,
  targets: ["headline"],
  duration: [1.5, 4],
  params: {
    lines: { type: "number", range: [2, 3], default: 2 },
    align: { type: "choice", options: ["stair", "left"], default: "stair" },
    enter: { type: "choice", options: ["wipe", "cut", "rise"], default: "wipe" },
    line_stagger: { type: "number", range: [0, 0.25], default: 0.12, unit: "s" },
  },
  pairs: ["photo.documentary-collage", "transition.hard-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/documentary-brutalist-agency", license: "MIT", note: "demo/index.html hero h1 stair; the enter wipes are ours" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const words = text.split(" ");
    const n = Math.max(1, Math.min(Math.round(ML.clamp(p.lines, 2, 3)), words.length));
    // words into n lines of balanced length (a line never breaks inside a word)
    const total = words.reduce((s, w) => s + w.length + 1, 0);
    const groups = Array.from({ length: n }, () => []);
    let pos = 0, last = 0;
    words.forEach((w, i) => {
      // the line a word's middle falls in, kept in order and leaving at least one word for every later line
      let g = Math.min(n - 1, Math.floor(((pos + w.length / 2) / total) * n));
      g = Math.min(Math.max(last, g, n - (words.length - i)), last + 1, n - 1);
      groups[g].push(w); last = g; pos += w.length + 1;
    });
    for (let i = groups.length - 1; i >= 0; i--) if (!groups[i].length) groups.splice(i, 1);
    // the layer: the safe area, type on top of the pictures
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: f.safe.x + "px", top: f.safe.y + "px", width: f.safe.w + "px", height: f.safe.h + "px", zIndex: "6", pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "center", color: "var(--x-ink)" });
    const lh = rtl ? 1.12 : 0.69;
    const box = doc.createElement("div");
    Object.assign(box.style, { width: "100%", fontFamily: "var(--x-head-font)", fontWeight: "900", lineHeight: String(lh), fontSize: "100px", fontStretch: "condensed", letterSpacing: rtl ? "0" : "-0.045em", textTransform: rtl ? "none" : "uppercase", direction: rtl ? "rtl" : "ltr" });
    layer.append(box);
    host.append(layer);
    // which side each line sits on: stair alternates and ends flush right (mirrored in Arabic); "left" keeps the reading edge
    const sides = groups.map((_, i) => (p.align === "stair" ? ((n - 1 - i) % 2 === 0 ? "end" : "start") : "start"));
    const lines = groups.map((g, i) => {
      const line = doc.createElement("div");
      const physical = (sides[i] === "end") !== rtl ? "right" : "left";
      Object.assign(line.style, { display: "block", textAlign: physical, whiteSpace: "nowrap" });
      const inner = doc.createElement("span");
      inner.style.display = "inline-block";
      inner.textContent = g.join(" ");
      line.append(inner);
      box.append(line);
      return { line, inner, physical };
    });
    // size: the source's vw size, shrunk until the widest line and the whole block fit the safe area
    let size = f.W * (f.tall ? 0.25 : 0.15);
    box.style.fontSize = size + "px";
    const widest = Math.max(...lines.map((l) => l.inner.offsetWidth));
    if (widest > f.safe.w * 0.98) size *= (f.safe.w * 0.98) / widest;
    box.style.fontSize = size.toFixed(2) + "px";
    if (box.offsetHeight > f.safe.h * 0.9) { size *= (f.safe.h * 0.9) / box.offsetHeight; box.style.fontSize = size.toFixed(2) + "px"; }
    const stag = ML.clamp(p.line_stagger, 0, 0.25);
    const times = lines.map((_, i) => (p.enter === "cut" ? at : at + i * stag)); // a cut is one hit on one beat
    const q4 = (t, a) => 1 - Math.pow(1 - ML.lin(t, a, a + 0.6), 5); // GSAP power4.out
    ctx.sfx(at, p.enter === "cut" ? "hit" : "whoosh.soft", p.enter === "cut" ? 0.35 : 0.3);
    return {
      draw(t) {
        el.style.opacity = "0"; // the billboard is the headline while this move runs
        const on = t >= at - 1e-6 && t < end;
        layer.style.display = on ? "flex" : "none"; // display, not visibility: a child set visible would show through a hidden parent
        if (!on) return;
        lines.forEach(({ line, inner, physical }, i) => {
          const a = times[i];
          if (p.enter === "cut") { line.style.visibility = t >= a ? "visible" : "hidden"; return; }
          const u = q4(t, a);
          line.style.visibility = t >= a ? "visible" : "hidden";
          if (p.enter === "rise") {
            line.style.clipPath = rtl ? "inset(-0.5em -0.3em -0.12em -0.3em)" : "inset(-0.5em -0.3em -0.06em -0.3em)";
            inner.style.translate = u >= 1 ? "none" : `0 ${((1 - u) * (rtl ? 1.3 : 0.85)).toFixed(4)}em`;
            return;
          }
          // wipe: in from the flush side, the clip opening from that side across the line's own words (not the empty column)
          const off = (1 - u) * 6 * (physical === "left" ? -1 : 1);
          inner.style.translate = u >= 1 ? "none" : `${off.toFixed(3)}% 0`;
          const hid = ((1 - u) * 100).toFixed(2);
          inner.style.clipPath = u >= 1 ? "none" : physical === "left" ? `inset(-0.5em ${hid}% -0.5em -0.3em)` : `inset(-0.5em -0.3em -0.5em ${hid}%)`;
        });
      },
    };
  },
});
