// Blinking caret becomes a dot: a thin text caret (2 × 30 at the source's scale; accent or ink) blinks alone on the
// ground — 0.5 s on, 0.5 s off, hard steps — until its cue, when it vanishes and a small ink dot appears just past it
// on the reading side, springing from 4 to 12 (back-out, 0.4 s); on the next beat the dot grows to 32 and glides to
// the centre (power2-out, 0.5 s). A quiet, minimal opener: the cursor of an empty page turning into the first mark.
// On a target the caret stands at its centre; with none, at the centre of the picture region. The dot is drawn at its
// final size and scaled down (never above 1). RTL: the dot appears to the caret's left (the reading side).
// Source: prompt-motion:hbcoop-de365c (reference only — rebuilt as our own code).
ML.define({
  id: "accent.caret-to-dot",
  category: "accent",
  name: "Blinking caret becomes a dot",
  does: "A thin red text caret blinks alone on paper, then is replaced by a small black dot that grows.",
  says: ["calm", "story", "arrival"],
  energy: 1,
  targets: ["shape"],
  duration: [1, 3],
  params: {
    colour: { type: "choice", options: ["accent", "ink"], default: "accent" },
  },
  pairs: ["text-in.punchline", "element.ball-becomes-period"],
  avoid: ["urgency", "energy", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:hbcoop-de365c", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (css, parent) => { const e = doc.createElement("div"); e.style.cssText = css; parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080 * 2.2; // the source's 2 × 30 caret at a film's scale
    const b = el && el !== stage ? ctx.box(el) : f.pic;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const layer = mk(`position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:28;visibility:hidden`, stage);
    const cw = Math.max(2, Math.round(2 * u)), ch = Math.round(30 * u);
    const caret = mk(`position:absolute;left:${(cx - cw / 2).toFixed(1)}px;top:${(cy - ch / 2).toFixed(1)}px;width:${cw}px;height:${ch}px;background:var(--x-${p.colour === "ink" ? "ink" : "accent"});will-change:opacity`, layer);
    const D = 32 * u; // the dot at its largest; smaller sizes are scale-downs
    const dot = mk(`position:absolute;left:0;top:0;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;border-radius:50%;background:var(--x-ink);will-change:transform`, layer);

    // the beats: the caret blinks for about 40 % of the run, the dot lands, then grows on the next beat
    const span = Math.max(0.9, end - at);
    const cue = at + ML.clamp(span * 0.4, 0.5, 1.4);
    const grow = cue + ML.clamp(span * 0.25, 0.45, 0.9);
    const side = rtl ? -1 : 1;
    const ox = cx + side * (cw / 2 + 14 * u), oy = cy + ch * 0.32; // where the dot appears: past the caret, near its foot
    ctx.sfx(cue, "blip", 0.25);
    ctx.sfx(grow, "pop.soft", 0.22);

    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.3, end - 0.05);
        const vis = t >= at - 1e-6 && leave < 1;
        layer.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        layer.style.opacity = (1 - leave).toFixed(4);
        // hard-step blink, 0.5 s on / 0.5 s off, from the caret's first frame
        caret.style.opacity = t < cue ? String(((t - at) % 1) < 0.5 ? 1 : 0) : "0";
        // the dot: 4 → 12 on a back-out, then 12 → 32 while it glides to the centre
        const a = ML.back(t, cue, cue + 0.4, 1.7), g = 1 - Math.pow(1 - ML.lin(t, grow, grow + 0.5), 2);
        const size = t < cue ? 0 : (4 + 8 * a) * u + (32 - 12) * u * g;
        const x = ox + (cx - ox) * g, y = oy + (cy - oy) * g;
        const s = Math.max(0, Math.min(1, size / D));
        dot.style.visibility = s > 0 ? "visible" : "hidden";
        dot.style.transform = `translate(${(x - D / 2).toFixed(2)}px, ${(y - D / 2).toFixed(2)}px) scale(${s.toFixed(4)})`;
      },
    };
  },
});
