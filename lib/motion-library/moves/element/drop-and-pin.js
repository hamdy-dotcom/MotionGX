// Drop and pin — a two-part assembly: a heavy piece lowers onto its place, settles with a 1–2 px bounce, then a small
// secondary piece (a peg, a badge, a check or a bolt) drops in to lock it. Ported from MengTo/Skills
// horizontal-scroll-scenes (MIT), scene 3 "kigumi": .beam2 { translateY((1 − e) · −190px) } with e a power2 in-out over
// the drop, and .peg2 { opacity clamp((p − 0.72) · 6), translateY((1 − clamp((p − 0.72) · 4)) · −30px) } — the peg
// shows only after 72 % of the run and drops 30 px. The progress p runs over drop / pin_delay seconds, so the pin
// starts as the piece lands. A landing thud on the piece, a short one on the pin.
ML.define({
  id: "element.drop-and-pin",
  category: "element",
  name: "Drop and pin",
  does: "A heavy piece lowers onto its place and settles, then a small secondary piece drops in to lock it.",
  says: ["step", "precision", "result", "trust"],
  energy: 2,
  targets: ["shape", "card", "image"],
  duration: [1, 2],
  params: {
    drop: { type: "number", range: [80, 300], default: 190, unit: "px" },
    pin_delay: { type: "number", range: [0.5, 0.9], default: 0.72 },
    pin: { type: "choice", options: ["peg", "badge", "check", "bolt"], default: "peg" },
  },
  pairs: ["element.fade-rise", "text-in.punchline", "element.elastic-ground-line"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "MengTo/Skills:agent-skills/web-design/horizontal-scroll-scenes/demo.html", license: "MIT", note: ".beam2 / .peg2 craft rules, rebuilt as a function of t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    let el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) {
      // nothing to drop: a beam on two posts in the picture region (the kigumi joint, abstract, look-coloured)
      const holder = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;pointer-events:none;z-index:6;`, host);
      const bw = Math.min(f.pic.w * 0.78, 760 * k), bh = 92 * k, by = f.pic.h * 0.5 - bh;
      for (const s of [-1, 1]) mk("div", `position:absolute;left:${f.pic.w / 2 + s * bw * 0.32 - 34 * k}px;top:${by + bh}px;width:${68 * k}px;height:${Math.min(f.pic.h * 0.38, 300 * k)}px;border-radius:calc(min(var(--x-radius), ${14 * k}px)) calc(min(var(--x-radius), ${14 * k}px)) 0 0;background:var(--x-panel-2);border:var(--x-edge) solid var(--x-edge-color);`, holder);
      el = mk("div", `position:absolute;left:${(f.pic.w - bw) / 2}px;top:${by}px;width:${bw}px;height:${bh}px;box-sizing:border-box;border-radius:calc(min(var(--x-radius), ${18 * k}px));background:linear-gradient(180deg, var(--x-accent), color-mix(in srgb, var(--x-accent) 78%, var(--x-ink)));box-shadow:var(--x-shadow);`, holder);
    }
    const b = ctx.box(el);
    const drop = ML.clamp(p.drop, 80, 300) * k;
    const d = ML.clamp(p.pin_delay, 0.5, 0.9);
    const D = Math.min(0.9, Math.max(0.4, (end - at) * 0.6)); // the drop's seconds
    const T = D / d; // the whole run: the pin starts as the piece lands
    const land = at + D;

    // the pin, in stage px over the piece's resting box
    const ps = ML.clamp(Math.min(b.w, b.h) * 0.24, 30 * k, 76 * k);
    const corner = p.pin !== "peg";
    const px = corner ? (rtl ? b.x - ps * 0.3 : b.x + b.w - ps * 0.7) : b.x + b.w / 2 - ps * 0.22;
    const py = corner ? b.y - ps * 0.3 : b.y - ps * 0.55;
    const pin = mk("div", `position:absolute;left:${px}px;top:${py}px;width:${corner ? ps : ps * 0.44}px;height:${corner ? ps : ps * 1.1}px;pointer-events:none;z-index:7;opacity:0;`, host);
    if (p.pin === "peg") {
      mk("div", `position:absolute;inset:0;border-radius:${ps * 0.12}px;background:var(--x-ink);box-shadow:var(--x-shadow);`, pin);
      mk("div", `position:absolute;left:18%;right:18%;top:10%;height:12%;border-radius:999px;background:var(--x-ground);opacity:.35;`, pin);
    } else if (p.pin === "badge") {
      const c = mk("div", `position:absolute;inset:0;border-radius:50%;background:var(--x-accent);color:var(--x-accent-ink);box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;font:var(--x-head-weight) ${ps * 0.5}px/1 var(--x-head-font);`, pin, "1");
      c.dir = "ltr";
    } else {
      const svg = sv("svg", { viewBox: "0 0 40 40", width: ps, height: ps }, pin);
      svg.style.cssText = "display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,.18));";
      if (p.pin === "check") {
        sv("circle", { cx: 20, cy: 20, r: 19, fill: "var(--x-good)" }, svg);
        sv("path", { d: "M11 20.5 L17.5 27 L29.5 13.5", fill: "none", stroke: "var(--x-accent-ink)", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      } else {
        const hex = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${(20 + 19 * Math.cos(a)).toFixed(2)},${(20 + 19 * Math.sin(a)).toFixed(2)}`; }).join(" ");
        sv("polygon", { points: hex, fill: "var(--x-ink)" }, svg);
        sv("circle", { cx: 20, cy: 20, r: 8, fill: "var(--x-panel-2)" }, svg);
        sv("path", { d: "M14 20 H26", stroke: "var(--x-ink)", "stroke-width": 3, "stroke-linecap": "round" }, svg);
      }
    }
    const pinLand = at + (d + 0.25) * T;
    ctx.sfx(land, "land", 0.45);
    ctx.sfx(pinLand, "land.light", 0.3);
    const inOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
    return {
      draw(t) {
        if (t < at) { el.style.opacity = "0"; pin.style.opacity = "0"; return; }
        const e = inOut(ML.lin(t, at, land));
        // settle: a 1–2 px bounce after the landing, gone in ~0.35 s
        const s = t > land ? -2 * k * Math.sin((t - land) * 26) * Math.exp(-(t - land) * 9) : 0;
        const y = (1 - e) * -drop + s;
        el.style.opacity = ML.lin(t, at, at + 0.15).toFixed(4);
        el.style.translate = Math.abs(y) < 0.01 ? "none" : `0 ${y.toFixed(2)}px`;
        // the pin: shows after pin_delay of the run and drops 30 px; it rides the settle
        const q = (t - at) / T;
        const o = ML.clamp((q - d) * 6), dy = (1 - ML.clamp((q - d) * 4)) * -30 * k;
        const ps2 = t > pinLand ? -1.2 * k * Math.sin((t - pinLand) * 30) * Math.exp(-(t - pinLand) * 12) : 0;
        pin.style.opacity = o.toFixed(4);
        pin.style.translate = `0 ${(dy + s + ps2).toFixed(2)}px`;
      },
    };
  },
});
