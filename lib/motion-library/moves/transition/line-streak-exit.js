// Line streak exit: every line of the headline block shoots sideways at its own moment — x 0 -> ±0.75 of the frame
// in 0.3 s (expo.in), smeared by a horizontal-only blur (an SVG feGaussianBlur with stdDeviation "N 0" that ramps
// with the speed), fading out over its last 30%; lines go 0.06 s apart, in alternate directions (or all one way, the
// reading way). A dark diagonal wedge (clip-path polygon) then cuts in from the reading-start edge over 0.35 s, led by
// stepped trails (copies 30% ahead, in the look's accents), once the streaks have had their moment, and fills the
// frame for the next scene. Lines are whole
// words grouped by where they wrap, so Arabic stays joined. Sizes are shares of the frame.
// Source: prompt-motion motiondsgnr-yo-opus-5-5-raw (reference only: our own rebuild).
ML.define({
  id: "transition.line-streak-exit",
  category: "transition",
  name: "Line streak exit",
  does: "Each headline line shoots sideways at a different moment, smearing into a horizontal blur streak, while a dark wedge cuts in from the edge.",
  says: ["speed", "transition", "energy"],
  energy: 5,
  targets: ["headline", "line"],
  duration: [0.4, 0.7],
  params: {
    direction: { type: "choice", options: ["alternating", "same"], default: "alternating" },
    wedge: { type: "bool", default: true },
    stagger: { type: "number", range: [0.03, 0.12], default: 0.06, unit: "s" },
    trails: { type: "number", range: [0, 3], default: 3 },
  },
  pairs: ["text-in.punchline", "transition.colour-field-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage, f } = ctx;
    if (!el) return null;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const host = ctx.scene || stage;
    // the block: the headline and the lines beside it (its sub), each split into its wrapped lines
    const block = el.parentElement && el.parentElement.classList.contains("ml-head") ? [...el.parentElement.children].filter((c) => (c.textContent || "").trim()) : [el];
    const lines = [];
    for (const part of block) {
      const words = ML.split(part, "words");
      const rows = [];
      for (const w of words) { const y = Math.round(w.offsetTop); let r = rows.find((x) => Math.abs(x.y - y) < 4); if (!r) rows.push((r = { y, ws: [] })); r.ws.push(w); }
      // rebuild the text as one block per wrapped line (same words, same breaks): each line moves on its own
      const ta = getComputedStyle(part).textAlign;
      part.textContent = "";
      for (const r of rows) {
        const d = document.createElement("div");
        d.style.cssText = `display:block;text-align:${ta};white-space:nowrap`;
        r.ws.forEach((w, i) => { if (i) d.append(" "); d.append(w); });
        part.append(d);
        lines.push(d);
      }
    }
    // a horizontal-only blur filter per line
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    const uid = "mlse" + Math.floor(ML.rnd(at * 7.3 + lines.length, 3) * 1e6);
    const blurs = lines.map((_, i) => {
      const fl = document.createElementNS(NS, "filter");
      fl.setAttribute("id", `${uid}-${i}`); fl.setAttribute("x", "-60%"); fl.setAttribute("width", "220%"); fl.setAttribute("y", "-10%"); fl.setAttribute("height", "120%");
      const g = document.createElementNS(NS, "feGaussianBlur");
      g.setAttribute("stdDeviation", "0 0");
      fl.append(g); svg.append(fl);
      return g;
    });
    host.append(svg);
    const dir0 = ctx.rtl ? -1 : 1;
    const dist = W * 0.78;
    const times = lines.map((_, i) => at + i * p.stagger);
    const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
    // the wedge (dark, with stepped trails ahead of it in the accents)
    const nT = p.wedge ? Math.round(ML.clamp(p.trails, 0, 3)) : 0;
    const wA = at + Math.max(0, lines.length - 1) * p.stagger + 0.26, wB = wA + 0.35;
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    host.append(layer);
    const cols = ["var(--x-accent-2)", "var(--x-accent)", "color-mix(in srgb, var(--x-accent) 50%, var(--x-ink))"];
    const wedges = [];
    if (p.wedge) {
      for (let k = nT; k >= 0; k--) {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;inset:0;background:${k === 0 ? "var(--x-device)" : cols[(k - 1) % 3]};visibility:hidden`;
        layer.append(d);
        wedges.push({ d, lead: k * 0.3 });
      }
    }
    const slant = Math.min(W, H) * 0.32;
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    ctx.sfx(at, "whoosh.soft", 0.4);
    if (p.wedge) ctx.sfx(wA, "whoosh.heavy", 0.3);
    return {
      draw(t) {
        lines.forEach((ln, i) => {
          const u = ML.lin(t, times[i], times[i] + 0.3), e = expoIn(u);
          const d = p.direction === "same" ? dir0 : (i % 2 === 0 ? dir0 : -dir0);
          ln.style.translate = e > 0 ? `${(d * dist * e).toFixed(2)}px 0` : "none";
          ln.style.opacity = (1 - ML.lin(u, 0.7, 1)).toFixed(4);
          // blur follows the speed: d(expo.in)/du peaks at the end
          const sd = e > 0 ? Math.min(30, 30 * e * 1.4) * (v / 10.8) : 0;
          blurs[i].setAttribute("stdDeviation", `${sd.toFixed(2)} 0`);
          ln.style.filter = sd > 0.05 ? `url(#${uid}-${i})` : "none";
        });
        for (const { d, lead } of wedges) {
          // each trail runs 30% (of a step) ahead of the one above it, so they arrive stepped
          const q = io(ML.lin(t, wA - lead * 0.12, wB - lead * 0.12));
          if (q <= 0) { d.style.visibility = "hidden"; continue; }
          d.style.visibility = "visible";
          // leading edge: a diagonal, top ahead of bottom, from the reading-start side
          const X = -slant + q * (W + 2 * slant);
          const a = X + slant, b = X - slant;
          const pts = dir0 > 0 ? `0 0, ${a.toFixed(1)}px 0, ${b.toFixed(1)}px ${H}px, 0 ${H}px` : `${W}px 0, ${(W - a).toFixed(1)}px 0, ${(W - b).toFixed(1)}px ${H}px, ${W}px ${H}px`;
          d.style.clipPath = `polygon(${pts})`;
        }
      },
    };
  },
});
