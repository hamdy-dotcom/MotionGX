// Dot stretches into a line: a small accent dot with a soft glow fades / scales in (0.2 s), optionally pulses
// 1 → 1.3 twice (a thin halo ring breathing with it), elongates into a pill (width ×~7 up to 120 px, height
// squashing to 75 %, 0.22 s power2.in), then shoots out into a thin glowing line (height → 2 px, glow 0 0 10 px)
// across the frame or to a fixed length in 0.35 s on cubic-bezier(0.7, 0, 0.2, 1), centred on the dot or extending
// to one side first. The halo fades during the stretch; the line then holds as a horizon / divider / wipe edge.
// The line is a real box re-laid every frame (never a scale-up), so it stays crisp at 2 px. Horizontal or vertical;
// "left" / "right" follow reading, so they mirror in Arabic.
// Source: prompt-motion "hanifproduktif-use-this-prompt-in", "buildfastwithai-opus-5-5-just-created",
// "zaqailo-the-consistency-of-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-to-line",
  category: "element",
  name: "Dot stretches into a line",
  does: "A small dot pulses, elongates sideways into a bar, then shoots out into a thin glowing line across the frame.",
  says: ["change", "flow", "transition", "arrival", "tech", "precision"],
  energy: 3,
  targets: ["shape", "line", "stage"],
  duration: [0.8, 1.5],
  params: {
    end: { type: "choice", options: ["full-width", "fixed"], default: "full-width" },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    pulse: { type: "bool", default: true },
    extend: { type: "choice", options: ["both", "left", "right"], default: "both" },
    size: { type: "number", range: [8, 16], default: 12, unit: "px" },
    length: { type: "number", range: [0.2, 0.9], default: 0.6 },
    thickness: { type: "number", range: [1, 4], default: 2, unit: "px" },
    glow: { type: "bool", default: true },
  },
  pairs: ["element.dot-ripple-rings", "text-in.punchline", "transition.line-open"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:hanifproduktif-use-this-prompt-in", license: "reference", note: "also buildfastwithai-opus-5-5-just-created, zaqailo-the-consistency-of-opus; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const k = Math.min(f.W, f.H) / 720;
    const vert = p.orientation === "vertical";
    // where the dot sits: under a line of text (a divider), on a shape's centre, or the frame's centre
    let cx = f.W / 2, cy = f.H / 2;
    const isText = own && (own.textContent || "").trim() && !own.querySelector("svg,img");
    if (own) {
      const B = ctx.box(own);
      cx = B.x + B.w / 2;
      cy = isText && !vert ? B.y + B.h + Math.max(8 * k, B.h * 0.1) : B.y + B.h / 2;
      if (isText && vert) cx = rtl ? B.x + B.w + 24 * k : B.x - 24 * k;
    }
    const d = ML.clamp(p.size, 8, 16) * k;
    const th = Math.max(1, Math.round(ML.clamp(p.thickness, 1, 4) * (k > 1 ? k * 0.75 : 1))); // whole pixels: crisp
    // the line's two ends along its axis, from the dot
    const axisLen = vert ? f.H : f.W, c = vert ? cy : cx;
    const fwd = p.extend === "both" ? 0 : (p.extend === "right" ? 1 : -1) * (rtl && !vert ? -1 : 1);
    const span = p.end === "fixed" ? axisLen * ML.clamp(p.length, 0.2, 0.9) : null;
    let lo, hi;
    if (fwd === 0) { lo = span ? c - span / 2 : 0; hi = span ? c + span / 2 : axisLen; }
    else if (fwd > 0) { lo = c; hi = span ? Math.min(axisLen, c + span) : axisLen; }
    else { lo = span ? Math.max(0, c - span) : 0; hi = c; }

    const mk = (css) => { const e = doc.createElement("div"); e.style.cssText = css; host.append(e); return e; };
    const halo = mk(`position:absolute;box-sizing:border-box;border-radius:50%;border:${Math.max(1, k)}px solid color-mix(in srgb, var(--x-accent) 55%, transparent);pointer-events:none;z-index:6;`);
    const bar = mk(`position:absolute;background:var(--x-accent);pointer-events:none;z-index:6;`);

    // the beats (in, pulse / hold, pill, line) squeeze to fit a short slot
    const q = ML.clamp((end - at - 0.3) / ((p.pulse ? 0.55 : 0.45) + 0.77), 0.45, 1);
    const t0 = at, t1 = at + 0.2 * q; // in
    const tp = (p.pulse ? 0.55 : 0.45) * q; // pulse twice / hold
    const s0 = t1 + tp, s1 = s0 + 0.22 * Math.max(0.7, q), s2 = s1 + 0.35 * Math.max(0.7, q);
    const in2 = ML.bezier(0.55, 0, 1, 0.45), shoot = ML.bezier(0.7, 0, 0.2, 1);
    const go = Math.max(s2 + 0.2, end - 0.25);
    ctx.sfx(t0, "blip", 0.22);
    ctx.sfx(s1 - 0.05, "whoosh.soft", 0.35);

    return {
      draw(t) {
        if (own && !isText) own.style.opacity = t >= t0 ? "0" : ""; // the dot takes over from a shape; a text line stays above its divider
        const on = t >= t0 && t < go + 0.25;
        bar.style.visibility = halo.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const fade = 1 - ML.clamp((t - go) / 0.25);
        // dot size with the pulse
        const appear = ML.out(t, t0, t1);
        let pul = 1;
        if (p.pulse) { const u = ML.lin(t, t1, t1 + tp); pul = u > 0 && u < 1 ? 1 + 0.3 * Math.pow(Math.sin(u * Math.PI * 2), 2) : 1; }
        const base = d * (0.4 + 0.6 * appear) * pul;
        // stretch 1 → pill, stretch 2 → line
        const a = in2(ML.lin(t, s0, s1)), b = shoot(ML.lin(t, s1, s2));
        const pillLen = Math.min(120 * k, d * 7), pillTh = d * 0.75;
        let len = base + (pillLen - base) * a, thick = base + (pillTh - base) * a;
        let start = c - len / 2; // the bar's near end along the axis
        if (fwd > 0) start = c - base / 2;
        if (fwd < 0) start = c + base / 2 - len;
        if (b > 0) {
          const fromLo = start, fromHi = start + len;
          const nlo = fromLo + (lo - fromLo) * b, nhi = fromHi + (hi - fromHi) * b;
          start = nlo; len = nhi - nlo; thick = pillTh + (th - pillTh) * b;
        }
        let cross = vert ? cx : cy;
        if (b >= 1) { cross = Math.round(cross - thick / 2) + thick / 2; start = Math.round(start); len = Math.round(len); } // at rest, on whole pixels
        if (vert) { bar.style.left = (cross - thick / 2).toFixed(2) + "px"; bar.style.top = start.toFixed(2) + "px"; bar.style.width = thick.toFixed(2) + "px"; bar.style.height = len.toFixed(2) + "px"; }
        else { bar.style.left = start.toFixed(2) + "px"; bar.style.top = (cross - thick / 2).toFixed(2) + "px"; bar.style.width = len.toFixed(2) + "px"; bar.style.height = thick.toFixed(2) + "px"; }
        bar.style.borderRadius = (Math.min(len, thick) / 2).toFixed(2) + "px";
        bar.style.opacity = (Math.min(1, appear * 1.4) * fade).toFixed(4);
        const gl = p.glow ? (b > 0 ? 10 * k : d * 0.9) : 0;
        bar.style.boxShadow = gl ? `0 0 ${gl.toFixed(1)}px color-mix(in srgb, var(--x-accent) 70%, transparent)` : "none";
        // halo: breathes with the pulse, fades as the dot stretches
        const hs = d * (1.8 + (pul - 1) * 2.4) * appear, ho = (p.pulse ? 0.9 : 0.5) * appear * (1 - ML.lin(t, s0, s1));
        halo.style.left = (cx - hs / 2).toFixed(2) + "px"; halo.style.top = (cy - hs / 2).toFixed(2) + "px";
        halo.style.width = halo.style.height = hs.toFixed(2) + "px";
        halo.style.opacity = (ho * fade).toFixed(4);
      },
    };
  },
});
