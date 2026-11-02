// A dot drags out a line behind it: a solid ink dot (32 px at 720p, scaled to the stage) slides sideways `length`
// over 0.8 s power2.inOut while a 3 px ink line with a slightly rough edge (a seeded wobble on its two edges, painted
// on a canvas, so every frame is the same) stays attached at the start and is exactly as long as the dot's travel.
// Then the dot glides back along the line to the other end (0.9 s) and settles at its middle (0.4 s). A geometric
// primer: point → line. Direction follows reading: "right" means forward, so it runs right-to-left in Arabic.
// Source: prompt-motion "hbcoop-de365c" (reference only — rebuilt as our own code).
ML.define({
  id: "element.dot-draws-line",
  category: "element",
  name: "A dot drags out a line behind it",
  does: "A solid dot slides sideways leaving a straight ink line, then glides back along it.",
  says: ["simplicity", "story", "step"],
  energy: 2,
  targets: ["shape"],
  duration: [1.2, 2.5],
  params: {
    direction: { type: "choice", options: ["right", "left"], default: "right" },
    length: { type: "number", range: [120, 600], default: 220, unit: "px" },
    return: { type: "bool", default: true },
    rough: { type: "number", range: [0, 3], default: 1.2, unit: "px" },
    dot: { type: "number", range: [12, 48], default: 32, unit: "px" },
  },
  pairs: ["element.dot-to-line", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:hbcoop-de365c", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const B = own ? ctx.box(own) : f.pic;
    const k = Math.min(f.W, f.H) / 720;
    const r = (ML.clamp(p.dot, 12, 48) * k) / 2;
    const L = Math.min(ML.clamp(p.length, 120, 600) * k, f.W - f.m * 2 - r * 4);
    const dir = (p.direction === "left" ? -1 : 1) * (rtl ? -1 : 1);
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2;
    const x0 = cx - (dir * L) / 2; // start: the line is centred on the target

    // painted on a canvas every frame (an SVG re-rastered in parts antialiases differently frame to frame)
    const cv = doc.createElement("canvas");
    cv.width = f.W; cv.height = f.H;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;pointer-events:none;z-index:6;`;
    host.append(cv);
    const g = cv.getContext("2d");
    const probe = doc.createElement("div"); host.append(probe); probe.style.color = "var(--x-ink)";
    const INK = getComputedStyle(probe).color; probe.remove();
    const lw = 3 * k, rough = ML.clamp(p.rough, 0, 3) * k;
    // the ink edge: seeded wobble along the line, top and bottom, one sample every ~4 px
    const NS_ = Math.max(8, Math.ceil(L / (4 * k)));
    const edge = Array.from({ length: NS_ + 1 }, (_, i) => [(ML.rnd(i, 21) - 0.5) * rough, (ML.rnd(i, 22) - 0.5) * rough]);
    const t1 = at + 0.8, t2 = t1 + 0.12, t3 = t2 + 0.9, t4 = t3 + 0.4;
    const leave = Math.max(p.return ? t4 : t1, end - 0.3);
    const io2 = ML.bezier(0.455, 0.03, 0.515, 0.955); // power2.inOut
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (p.return) ctx.sfx(t2, "whoosh.soft", 0.2), ctx.sfx(t3 + 0.2, "tap", 0.2);

    return {
      draw(t) {
        if (own) own.style.opacity = t >= at ? "0" : "";
        g.clearRect(0, 0, f.W, f.H);
        const vis = t >= at - 0.15;
        cv.style.visibility = vis ? "visible" : "hidden";
        if (!vis) return;
        const appear = ML.out(t, at - 0.15, at), gone = ML.clamp((t - leave) / 0.3);
        g.globalAlpha = 1 - gone;
        g.fillStyle = INK;
        // the dot's travel along the line: out, back to the start, settle at the middle
        const a = io2(ML.lin(t, at, t1));
        let s = a; // 0 = start, 1 = far end
        if (p.return) {
          s = 1 - io2(ML.lin(t, t2, t3));
          if (t < t2) s = a;
          if (t >= t3) s = 0.5 * ML.out(t, t3, t4);
        }
        // the line is as long as the farthest the dot has gone; once drawn it stays
        const len = L * a;
        if (len > 0.5) {
          const m = Math.max(1, Math.round((len / L) * NS_));
          g.beginPath();
          for (let i = 0; i <= m; i++) { const x = x0 + dir * (len * i) / m; g[i ? "lineTo" : "moveTo"](x, cy - lw / 2 + edge[i][0]); }
          for (let i = m; i >= 0; i--) { const x = x0 + dir * (len * i) / m; g.lineTo(x, cy + lw / 2 + edge[i][1]); }
          g.closePath(); g.fill();
          g.beginPath(); g.arc(x0, cy, lw / 2, 0, Math.PI * 2); g.fill();
        }
        g.beginPath(); g.arc(x0 + dir * L * s, cy, r * (0.6 + 0.4 * appear), 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      },
    };
  },
});
