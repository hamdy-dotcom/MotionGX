// Straight line ripples into a sine wave: an SVG path sampled at 120 points, y = A(t)·sin(2πx/λ + ωt). The amplitude
// eases 0 → A over 0.8 s; the wave travels at one cycle per 1.5 s (rightward, leftward in Arabic) or stands
// (sin(2πx/λ)·cos(ωt)). The stroke thins a little as the amplitude grows. On a drawn line (an svg line / path or a
// thin rule) the wave replaces it; on a text line it runs underneath as an underline.
// Source: prompt-motion buildfastwithai (reference only) — rebuilt as our own SVG code.
ML.define({
  id: "accent.line-to-wave",
  category: "accent",
  name: "Straight line ripples into a sine wave",
  does: "A flat horizontal line starts to undulate into a travelling sine wave.",
  says: ["flow", "energy", "ambient"],
  energy: 2,
  targets: ["line"],
  duration: [1, 4],
  params: {
    amplitude: { type: "number", range: [4, 30], default: 12, unit: "px" },
    wavelength: { type: "number", range: [120, 400], default: 280, unit: "px" },
    mode: { type: "choice", options: ["travelling", "standing"], default: "travelling" },
  },
  pairs: ["accent.ecg-heartbeat-line"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:buildfastwithai-opus-5-5-just-created", license: "reference", note: "our own SVG rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const NS = "http://www.w3.org/2000/svg";
    // where the line runs: over a drawn line (replacing it), under a text line, else across the picture region
    let x0 = f.pic.x + f.pic.w * 0.1, x1 = f.pic.x + f.pic.w * 0.9, y = f.pic.y + f.pic.h / 2, replace = false;
    if (el && el !== stage) {
      const b = ctx.box(el);
      const drawn = el instanceof SVGElement || b.h < 16 * k || !el.textContent.trim();
      if (drawn) { x0 = b.x; x1 = b.x + b.w; y = b.y + b.h / 2; replace = true; }
      else {
        // under the text itself (not its whole block): measure the ink
        const r = document.createRange(); r.selectNodeContents(el);
        const s = stage.getBoundingClientRect(), kk = s.width / (stage.offsetWidth || 1) || 1, rr = r.getBoundingClientRect();
        const tx = (rr.left - s.left) / kk, tw = rr.width / kk;
        x0 = Math.max(f.safe.x, tx); x1 = Math.min(f.safe.x + f.safe.w, tx + tw);
        y = Math.min(H - 40 * k, b.y + b.h + (p.amplitude + 18) * k);
      }
    }
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6;visibility:hidden;will-change:transform" // its own layer: the frame under it rasterises the same every time;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.style.stroke = "var(--x-accent)";
    svg.append(path);
    host.append(svg);

    const A = p.amplitude * k, lam = p.wavelength * k, omega = (Math.PI * 2) / 1.5, dir = ctx.rtl ? -1 : 1;
    const N = 120, span = x1 - x0;
    const D = Math.max(0.6, end - at), grow = Math.min(0.8, D * 0.4);
    ctx.sfx(at, "whoosh.soft", 0.12);
    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.3, end);
        const on = r >= 0 && leave < 1;
        svg.style.visibility = on ? "visible" : "hidden";
        if (replace) el.style.opacity = on ? "0" : "";
        if (!on) return;
        // the flat line draws out from its middle, then the ripple grows in
        const draw = ML.out(r, 0, Math.min(0.3, D * 0.2));
        const amp = A * ML.ease(r, Math.min(0.15, D * 0.1), Math.min(0.15, D * 0.1) + grow) * (1 - 0.5 * leave);
        const mid = (x0 + x1) / 2, half = (span / 2) * draw;
        let d = "";
        for (let i = 0; i <= N; i++) {
          const x = mid - half + (2 * half * i) / N;
          const ph = (2 * Math.PI * (x - x0)) / lam;
          const yy = p.mode === "standing" ? Math.sin(ph) * Math.cos(omega * r) : Math.sin(ph - dir * omega * r);
          d += `${i ? "L" : "M"}${x.toFixed(2)} ${(y + amp * yy).toFixed(2)}`;
        }
        path.setAttribute("d", d);
        path.setAttribute("stroke-width", ((3 - 0.9 * (amp / Math.max(0.001, A))) * k * 1.2).toFixed(3));
        svg.style.opacity = (1 - leave).toFixed(3);
      },
    };
  },
});
