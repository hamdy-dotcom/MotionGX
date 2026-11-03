// Dot opens into a dial: a 10 px glowing accent dot (at 720p, scaled to the stage) grows a large thin circle
// (1.5 px accent, radius 0 → 190 px in 0.4 s expo.out); 8–60 short ticks (20 px) just inside the ring fade in one
// after another, rotate as a group at 90°/s and pulse in length. Then the dial makes room for the headline: the circle
// grows past the frame (its radius animated, never a scale-up, so the 1.5 px stroke stays crisp) or its arc erases
// behind itself, 0.5 s power2.in.
// Source: prompt-motion "utopyaszx-opus-5-5-medium-make" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-to-dial",
  category: "element",
  name: "Dot opens into a dial",
  does: "A dot grows a large thin circle with radial tick marks that spin, then the ring opens up for the headline.",
  says: ["time", "precision", "arrival"],
  energy: 3,
  targets: ["shape"],
  duration: [1.2, 2.5],
  params: {
    ticks: { type: "number", range: [8, 60], default: 12 },
    end: { type: "choice", options: ["scale-out", "erase-arc"], default: "scale-out" },
    radius: { type: "number", range: [100, 300], default: 190, unit: "px" },
    spin: { type: "number", range: [0, 180], default: 90, unit: "deg/s" },
  },
  pairs: ["text-in.punchline", "element.dot-ripple-rings"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:utopyaszx-opus-5-5-medium-make", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const B = own ? ctx.box(own) : f.pic;
    const k = Math.min(f.W, f.H) / 720;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const R = Math.min(ML.clamp(p.radius, 100, 300) * k, Math.min(f.W, f.H) * 0.42);
    const n = Math.round(ML.clamp(p.ticks, 8, 60));
    const tl = 20 * k * Math.min(1, 24 / n + 0.4);

    // painted on a canvas every frame (an SVG re-rastered in parts antialiases differently frame to frame)
    const cv = doc.createElement("canvas");
    cv.width = f.W; cv.height = f.H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:6;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const probe = doc.createElement("div"); host.append(probe);
    const col = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const INK = col("--x-ink"), ACC = col("--x-accent"); probe.remove();
    const sw = 1.5 * k;
    const tw = Math.max(1, sw * (n > 30 ? 0.8 : 1.2));
    const dotR = 5 * k;
    const r0 = at + 0.25, r1 = r0 + 0.4;
    const e0 = Math.max(r1 + 0.05, end - 0.55), e1 = e0 + 0.5; // leaves by the end of the slot
    const tickIn = Math.min(0.35, Math.max(0.05, e0 - r0 - 0.4)); // the ticks' stagger, shorter in a short slot
    const in2 = ML.bezier(0.55, 0, 1, 0.45); // power2.in
    const far = Math.hypot(Math.max(cx, f.W - cx), Math.max(cy, f.H - cy)) + 20;
    const turn = rtl ? -1 : 1; // the dial runs with the reading direction
    ctx.sfx(at, "blip", 0.25);
    ctx.sfx(r0, "whoosh.soft", 0.3);
    ctx.sfx(e0 + 0.1, "whoosh.soft", 0.25);

    return {
      draw(t) {
        if (own) own.style.opacity = t >= at ? "0" : "";
        g.clearRect(0, 0, f.W, f.H);
        const on = t >= at - 0.05 && t < e1 + 0.05;
        cv.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        const ex = in2(ML.lin(t, e0, e1));
        const d = ML.back(t, at - 0.05, at + 0.2, 2);
        // the dot and its soft glow, breathing
        const dr = dotR * d * (1 - ex);
        if (dr > 0) {
          g.globalAlpha = 1; g.fillStyle = ACC; g.shadowColor = ACC; g.shadowBlur = dotR * 3.2 * (0.8 + 0.2 * Math.sin((t - at) * 6));
          g.beginPath(); g.arc(cx, cy, dr, 0, Math.PI * 2); g.fill();
          g.shadowBlur = 0;
        }
        // the ring: grows on expo.out; leaves past the frame or erases its arc
        const grow = ML.expo(t, r0, r1);
        let r = R * grow, o = t >= r0 ? 1 : 0, a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2;
        if (p.end === "scale-out") { r = R + (far - R) * ex; o *= 1 - ML.lin(t, e0 + 0.25, e1); }
        else if (turn > 0) a0 += Math.PI * 2 * ex; else a1 -= Math.PI * 2 * ex;
        if (r > 0.2 && o > 0 && a1 - a0 > 1e-3) {
          g.globalAlpha = o; g.strokeStyle = ACC; g.lineWidth = sw;
          g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
        }
        // ticks: in one after another, spinning, pulsing; out with the ring
        const rot = turn * (p.spin * Math.max(0, t - r0));
        const r2 = Math.max(0, r - tl * 0.6 - sw * 3);
        g.strokeStyle = INK; g.lineWidth = tw; g.lineCap = "round";
        for (let i = 0; i < n; i++) {
          const b0 = r0 + 0.15 + (i / n) * tickIn, v = ML.out(t, b0, b0 + 0.2);
          if (v <= 0 || ex >= 1) continue;
          const pul = 1 + 0.25 * Math.sin((t - r0) * 7 - i * ((Math.PI * 2) / n) * 2);
          const len = tl * v * pul * (1 - ex);
          const ang = ((i / n) * 360 + rot) * (Math.PI / 180);
          const c = Math.cos(ang), s = Math.sin(ang);
          g.globalAlpha = v * (i % 3 === 0 ? 1 : 0.55) * (1 - ex);
          g.beginPath(); g.moveTo(cx + c * r2, cy + s * r2); g.lineTo(cx + c * (r2 - len), cy + s * (r2 - len)); g.stroke();
        }
        g.globalAlpha = 1;
      },
    };
  },
});
