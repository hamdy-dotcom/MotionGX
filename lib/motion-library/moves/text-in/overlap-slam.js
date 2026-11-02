// Overlap slam: a heavy 900-weight caps line slams in (scale 1.3 -> 1 + opacity in 0.12 s, hard), then a bigger accent
// line lands a beat later overlapping the bottom of the first by a share of its cap height, sitting on top — y up from
// below with scale 1.15 -> 1 in 0.15 s expo.out and a 2-frame flash. Then it holds still. The headline's words split
// into the two lines (first half / second half); whole words, so any script.
// Source: our own rebuild of prompt-motion "kloss-xyz-had-to-test-this" — reference only.
ML.define({
  id: "text-in.overlap-slam",
  category: "text-in",
  name: "Overlap slam",
  does: "A heavy condensed line slams in, then a bigger accent line lands a beat later overlapping the bottom of the first.",
  says: ["energy", "urgency", "arrival"],
  energy: 5,
  targets: ["headline"],
  duration: [0.5, 2],
  params: {
    overlap: { type: "number", range: [10, 40], default: 25, unit: "%" },
    accent_line: { type: "choice", options: ["2", "1"], default: "2" },
    size_ratio: { type: "number", range: [1, 1.6], default: 1.3, unit: "x" },
    gap: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    flash: { type: "bool", default: true },
  },
  pairs: ["rhythm.beat-cut", "camera.shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:kloss-xyz-had-to-test-this", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const doc = el.ownerDocument;
    const words = (el.textContent || "").trim().split(/\s+/).filter(Boolean);
    const cut = Math.max(1, Math.ceil(words.length / 2));
    const texts = words.length > 1 ? [words.slice(0, cut).join(" "), words.slice(cut).join(" ")] : [words[0] || "", words[0] || ""];
    const accentIdx = p.accent_line === "1" ? 0 : 1;
    // the room the pair has: the slot's band, measured before the lines move in
    const avail = Math.max(el.offsetHeight, el.parentElement ? el.parentElement.clientHeight : 0);
    el.textContent = "";
    Object.assign(el.style, { display: "flex", flexDirection: "column", alignItems: "center", textTransform: "uppercase", letterSpacing: "-0.01em" });
    const lines = texts.map((s, i) => {
      const n = doc.createElement("div");
      n.textContent = s;
      Object.assign(n.style, { font: "900 100px/0.9 var(--x-head-font)", whiteSpace: "nowrap", position: "relative", zIndex: String(i + 1), color: i === accentIdx ? "var(--x-accent)" : "var(--x-ink)", transformOrigin: "50% 60%" });
      el.append(n);
      return n;
    });
    // width-fit: line 1 fills the slot, the accent line is size_ratio bigger (or as big as still fits)
    const W = el.clientWidth * 0.96;
    const heroMax = parseFloat(getComputedStyle(el).getPropertyValue("--x-hero-size")) || 168;
    const w0 = lines[0].offsetWidth || 1, w1 = lines[1].offsetWidth || 1;
    const big = p.size_ratio;
    let s0 = Math.min((W / w0) * 100, heroMax * 1.2), s1 = Math.min(s0 * (accentIdx === 1 ? big : 1 / big), (W / w1) * 100);
    if (accentIdx === 0) { s1 = Math.min((W / w1) * 100, heroMax * 1.2); s0 = Math.min(s1 * big, (W / w0) * 100); }
    // the pair stays within the room it has (the slot's band)
    const cap = ctx.rtl || ML.ARABIC.test(el.textContent || texts.join(" ")) ? 0.5 : 0.72; // Arabic has no caps: a shorter overlap keeps line 1 readable
    const tall = () => s0 * 0.9 + s1 * 0.9 - (p.overlap / 100) * cap * Math.min(s0, s1);
    if (tall() > avail) { const k = avail / tall(); s0 *= k; s1 *= k; }
    lines[0].style.fontSize = `${s0.toFixed(1)}px`;
    lines[1].style.fontSize = `${s1.toFixed(1)}px`;
    lines[1].style.marginTop = `${(-(p.overlap / 100) * cap * s0).toFixed(1)}px`;
    // the flash: two frames of light over the stage
    let flash = null;
    if (p.flash) {
      flash = doc.createElement("div");
      Object.assign(flash.style, { position: "absolute", inset: "0", background: "var(--x-accent-2)", mixBlendMode: "screen", pointerEvents: "none", opacity: "0", zIndex: "50" });
      (ctx.scene || stage || el).append(flash);
    }
    const t1 = at, t2 = Math.min(at + p.gap, Math.max(at + 0.2, end - 0.3));
    ctx.sfx(t1, "hit", 0.45);
    ctx.sfx(t2, "hit", 0.6);
    const rise = s1 * 0.3;
    return {
      draw(t) {
        // line 1: slams from 1.3, hard
        const a = ML.lin(t, t1, t1 + 0.12);
        const a2 = 1 - Math.pow(1 - a, 4);
        lines[0].style.opacity = (t < t1 ? 0 : a2).toFixed(4);
        lines[0].style.scale = (1.3 - 0.3 * a2).toFixed(4);
        // line 2: up from below with 1.15 -> 1 on expo.out
        const b = ML.expo(t, t2, t2 + 0.15);
        lines[1].style.opacity = (t < t2 ? 0 : Math.min(1, ML.lin(t, t2, t2 + 0.05))).toFixed(4);
        lines[1].style.translate = `0 ${((1 - b) * rise).toFixed(2)}px`;
        lines[1].style.scale = (1.15 - 0.15 * b).toFixed(4);
        if (flash) {
          const f = t >= t2 && t < t2 + 0.067 ? 0.55 : t >= t2 + 0.067 && t < t2 + 0.1 ? 0.2 : 0;
          flash.style.opacity = String(f);
        }
      },
    };
  },
});
