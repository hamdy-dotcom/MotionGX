// Arc in: the word (or its letters / words) travels in along a curve and levels out into the line. Three paths:
//  · pivot-swing — every piece rotates about one pivot ~600px left-below the slot (right-below from top-right, high
//    above from bottom), starting -25deg (out of the slot) and swinging to 0 on cubic-bezier(0.2, 1.2, 0.3, 1) with a
//    small overshoot; letters may lag 0.02 s each for a fan. Rotating every piece about the same pivot moves the line
//    as one rigid body, so "whole" needs no wrapper and the slot box itself never leaves its place.
//  · arc — piece i starts on a tilted hill (angles -40 → +30deg along the line), rotated to the hill's tangent, lifted
//    by its height on the curve, motion-blurred in its first frames; it springs to the straight baseline in 0.4 s with
//    a -4deg rotation overshoot, 0.06 s stagger (mid-state: letters stepping up a hill).
//  · towed-path — a guide (plane / cursor / dot, or nothing) runs an SVG ellipse or wave (1.2 s power1.inOut) leaving
//    a fading dotted trail (dash 2 6); each piece rides the path behind the guide (its position sampled at t − i·0.04),
//    small and blurred, then FLIPs to its slot in 0.4 s power3.out.
// Arabic: pieces are whole words (ML.split never breaks a joined word); left / right mirror for RTL.
// Sources: prompt-motion sudo-kiran "no storyboard", blue-clarity "ok so seeing lots", thismacapital "la video a été"
// (reference only — our own code).
ML.define({
  id: "text-in.arc-in",
  category: "text-in",
  name: "Arc in",
  does: "The word or its letters travel in along a curve — swinging round a pivot, stepping up an arc, or towed behind a guide along a path — and level out into the line.",
  says: ["energy", "playful", "flow", "arrival", "speed"],
  energy: 4,
  targets: ["headline", "word", "line"],
  duration: [0.5, 2],
  params: {
    path: { type: "choice", options: ["pivot-swing", "arc", "towed-path"], default: "pivot-swing" },
    from: { type: "choice", options: ["top-left", "top-right", "bottom"], default: "top-left" },
    pivot: { type: "number", range: [300, 900], default: 600, unit: "px" },
    rotation: { type: "number", range: [10, 40], default: 25, unit: "deg" },
    overshoot: { type: "number", range: [0, 6], default: 4, unit: "deg" },
    split: { type: "choice", options: ["whole", "letters", "words"], default: "whole" },
    stagger: { type: "number", range: [0, 0.08], default: 0.02, unit: "s" },
    duration: { type: "number", range: [0.4, 1.4], default: 0.5, unit: "s" },
    guide: { type: "choice", options: ["none", "plane", "cursor", "dot"], default: "none" },
    track: { type: "choice", options: ["ellipse", "wave"], default: "ellipse" },
  },
  pairs: ["text-in.punchline", "accent.dotted-target-arc"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:sudo-kiran-no-storyboard-no-detailed", license: "reference", note: "with blue-clarity-ok-so-seeing-lots and thismacapital-la-video-a-ete; our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const W = ctx.f.W, H = ctx.f.H;
    const units = ML.split(el, p.split === "letters" ? "chars" : "words");
    if (!units.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const boxes = units.map((u) => ctx.box(u));
    const n = units.length;
    const L = Math.min(...boxes.map((b) => b.x)), R = Math.max(...boxes.map((b) => b.x + b.w));
    const T = Math.min(...boxes.map((b) => b.y)), B = Math.max(...boxes.map((b) => b.y + b.h));
    // reading order (RTL: right → left) for the stagger
    const order = units.map((_, i) => i).sort((a, b) => (Math.abs(boxes[a].y - boxes[b].y) > fs * 0.5 ? boxes[a].y - boxes[b].y : rtl ? boxes[b].x - boxes[a].x : boxes[a].x - boxes[b].x));
    const rank = new Array(n); order.forEach((ui, r) => (rank[ui] = r));
    // the stagger tightens when a long line would not land before the move ends
    const room = n > 1 ? Math.max(0.01, (end - at - Math.max(0.4, p.duration) - 0.3) / (n - 1)) : 0;
    const lag = p.split === "whole" ? 0 : Math.min(p.stagger, room);
    const from = rtl ? (p.from === "top-left" ? "top-right" : p.from === "top-right" ? "top-left" : p.from) : p.from;
    const swing = ML.bezier(0.2, 1.2, 0.3, 1);
    const pieces = units.map((u, i) => ({ u, b: boxes[i], r: rank[i] }));
    const last = at + (n - 1) * Math.max(lag, p.path === "arc" ? (p.split === "whole" ? 0 : Math.min(0.06, room)) : 0);
    ctx.sfx(at, "whoosh.soft", 0.4);

    // ── pivot-swing ──
    if (p.path === "pivot-swing") {
      const k = Math.max(0.5, fs / 104); // the pivot distance reads against the type's size
      const P = from === "bottom" ? { x: (L + R) / 2, y: T - p.pivot * k } : { x: from === "top-left" ? L - p.pivot * k : R + p.pivot * k, y: B + p.pivot * k * 0.35 };
      const sign = from === "top-right" ? 1 : from === "bottom" ? (rtl ? -1 : 1) : -1; // swings in from the reading start
      pieces.forEach((x) => { x.u.style.transformOrigin = `${(P.x - x.b.x).toFixed(1)}px ${(P.y - x.b.y).toFixed(1)}px`; x.at = at + x.r * lag; });
      ctx.sfx(at + p.duration * 0.7, "land.light", 0.22);
      return {
        draw(t) {
          const leave = ML.clamp((t - (end - 0.25)) / 0.18);
          el.style.opacity = (1 - leave).toFixed(4);
          for (const x of pieces) {
            const q = ML.lin(t, x.at, x.at + p.duration), e = swing(q);
            const bump = p.overshoot * Math.pow(Math.sin(Math.PI * ML.clamp((q - 0.4) / 0.6)), 2) * 0.6;
            const rot = sign * (p.rotation * (1 - Math.min(1, e)) - bump);
            x.u.style.opacity = (t < x.at ? 0 : Math.min(1, ML.lin(t, x.at, x.at + p.duration * 0.3))).toFixed(4);
            x.u.style.rotate = Math.abs(rot) < 1e-3 ? "none" : `${rot.toFixed(3)}deg`;
          }
        },
      };
    }

    // ── arc: letters stepping up a hill, then springing flat ──
    if (p.path === "arc") {
      const step = p.split === "whole" ? 0 : Math.min(Math.max(0.06, lag), room);
      const span = Math.max(1, R - L), cx = (L + R) / 2;
      const rise = from === "bottom" ? 1 : -1; // bottom: starts below the line; top-*: starts above it
      const sideX = from === "top-left" ? -1 : from === "top-right" ? 1 : 0;
      const land = Math.max(0.4, p.duration * 0.8);
      pieces.forEach((x) => {
        const s = ML.clamp((x.b.x + x.b.w / 2 - L) / span), s2 = rtl ? 1 - s : s;
        x.th = (-40 + 70 * s2) * (p.rotation / 35) * (rtl ? -1 : 1); // tangent angle on the tilted hill
        const rr = span * 0.9; // the hill's radius
        x.dy = rise * fs * 0.9 - fs * 0.8 * s2 + rr * (1 - Math.cos((x.th * Math.PI) / 180)) * 0.35; // stepping up the hill in reading order
        x.dx = sideX * fs * 1.2 + (x.b.x + x.b.w / 2 - cx) * -0.15;
        x.at = at + x.r * step;
        x.u.style.transformOrigin = "50% 80%";
      });
      ctx.sfx(last + land * 0.6, "land.light", 0.22);
      return {
        draw(t) {
          const leave = ML.clamp((t - (end - 0.25)) / 0.18);
          el.style.opacity = (1 - leave).toFixed(4);
          for (const x of pieces) {
            if (t < x.at) { x.u.style.opacity = "0"; continue; }
            const e = ML.out(t, x.at, x.at + land);
            const ov = p.overshoot * Math.sin(Math.PI * ML.clamp((ML.lin(t, x.at, x.at + land) - 0.45) / 0.55)) * Math.sign(x.th || 1);
            const rot = x.th * (1 - e) - ov;
            x.u.style.opacity = Math.min(1, ML.lin(t, x.at, x.at + 0.1)).toFixed(4);
            x.u.style.translate = e >= 1 ? "none" : `${(x.dx * (1 - e)).toFixed(2)}px ${(x.dy * (1 - e)).toFixed(2)}px`;
            x.u.style.rotate = Math.abs(rot) < 1e-3 ? "none" : `${rot.toFixed(3)}deg`;
            const bl = 6 * (1 - ML.lin(t, x.at, x.at + 0.12));
            x.u.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          }
        },
      };
    }

    // ── towed-path: a guide runs a path, pieces ride behind it and flip to their slots ──
    const host = ctx.scene || ctx.stage;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;overflow:visible;z-index:2;`;
    const trail = document.createElementNS(NS, "path");
    const dash = Math.max(2, fs * 0.05);
    trail.setAttribute("fill", "none");
    trail.setAttribute("stroke", "var(--x-accent)");
    trail.setAttribute("stroke-width", String(Math.max(2, fs * 0.04)));
    trail.setAttribute("stroke-linecap", "round");
    trail.setAttribute("stroke-dasharray", `${dash.toFixed(1)} ${(dash * 3).toFixed(1)}`);
    svg.append(trail);
    let guide = null;
    const g = Math.max(18, fs * 0.38);
    if (p.guide !== "none") {
      guide = document.createElementNS(NS, p.guide === "dot" ? "circle" : "path");
      if (p.guide === "dot") { guide.setAttribute("r", (g * 0.35).toFixed(1)); guide.setAttribute("fill", "var(--x-accent)"); }
      else if (p.guide === "cursor") { guide.setAttribute("d", `M0 0 L0 ${g} L${g * 0.28} ${g * 0.74} L${g * 0.5} ${g * 1.15} L${g * 0.66} ${g * 1.07} L${g * 0.45} ${g * 0.68} L${g * 0.8} ${g * 0.68} Z`); guide.setAttribute("fill", "var(--x-pointer)"); guide.setAttribute("stroke", "var(--x-pointer-edge)"); guide.setAttribute("stroke-width", "2"); }
      else { guide.setAttribute("d", `M${g * 0.6} 0 L${-g * 0.6} ${-g * 0.45} L${-g * 0.25} 0 L${-g * 0.6} ${g * 0.45} Z`); guide.setAttribute("fill", "var(--x-accent)"); guide.setAttribute("stroke", "var(--x-accent-ink)"); guide.setAttribute("stroke-width", "1.5"); }
      svg.append(guide);
    }
    host.append(svg);
    const cx = (L + R) / 2, cy = (T + B) / 2, m = Math.max(40, ctx.f.m || 64);
    const rx = Math.min(W / 2 - m, (R - L) / 2 + fs * 1.2), ry = Math.max(fs * 0.7, Math.min(Math.max(fs * 1.4, (B - T) * 0.9 + fs * 0.6), H * 0.3, cy - 24, H - 24 - cy)); // the track stays on the frame
    const dir = rtl ? -1 : 1, turn = from === "top-right" || (from === "bottom" && rtl) ? -1 : 1; // `from` is already mirrored for RTL
    const at0 = from === "bottom" ? Math.PI / 2 : from === "top-right" ? -Math.PI / 4 : (-3 * Math.PI) / 4;
    // s ∈ [0, 1] along the track (pure)
    const pt = p.track === "wave"
      ? (s) => ({ x: W / 2 + dir * (s - 0.5) * (W - 2 * m), y: cy + (from === "bottom" ? 1 : -1) * Math.sin(Math.PI * 2 * 1.25 * s) * Math.min(fs * 1.5, H * 0.12) * (1 - s * 0.5) })
      : (s) => { const a = at0 + turn * s * Math.PI * 1.75; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; };
    const travel = Math.max(0.8, Math.min(2.4, p.duration * 2.4, end - at - 0.7));
    const inout = (x) => 0.5 - 0.5 * Math.cos(Math.PI * ML.clamp(x)); // power1.inOut (sine-like)
    const sAt = (time) => inout((time - at) / travel);
    // whole words need more room on the path than letters, or they ride in a clump
    const tow = Math.max(0.04, lag || 0.04, p.split !== "letters" || ML.ARABIC.test(el.textContent || "") ? 0.12 : 0);
    pieces.forEach((x) => { x.rel = at + travel * (0.45 + 0.5 * (x.r / Math.max(1, n - 1))); x.cx = x.b.x + x.b.w / 2; x.cy = x.b.y + x.b.h / 2; });
    const flip = 0.4;
    pieces.forEach((x) => { const q = pt(sAt(x.rel - (x.r + 1) * tow)); x.rx = q.x; x.ry = q.y; });
    const done = Math.max(...pieces.map((x) => x.rel)) + flip;
    ctx.sfx(done - 0.1, "land.light", 0.22);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        const on = t >= at && t < end;
        svg.style.display = on ? "block" : "none";
        if (on) {
          const s = sAt(t), s0 = Math.max(0, s - 0.4), N = 40;
          let d = "";
          for (let i = 0; i <= N; i++) { const q = pt(s0 + ((s - s0) * i) / N); d += `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }
          trail.setAttribute("d", d);
          trail.style.opacity = (0.75 * (1 - ML.lin(t, at + travel - 0.1, at + travel + 0.5))).toFixed(4);
          if (guide) {
            const q = pt(s), q2 = pt(Math.min(1, s + 0.01)), q1 = pt(Math.max(0, s - 0.01));
            const ang = (Math.atan2(q2.y - q1.y, q2.x - q1.x) * 180) / Math.PI;
            guide.setAttribute("transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})${p.guide === "plane" ? ` rotate(${ang.toFixed(2)})` : ""}`);
            guide.style.opacity = (Math.min(1, ML.lin(t, at, at + 0.15)) * (1 - ML.lin(t, at + travel, at + travel + 0.3))).toFixed(4);
          }
        }
        for (const x of pieces) {
          if (t < at + 0.02) { x.u.style.opacity = "0"; continue; }
          let px, py, sc, bl;
          if (t < x.rel) {
            const q = pt(sAt(t - (x.r + 1) * tow));
            px = q.x; py = q.y; sc = 0.45; bl = 6;
            x.u.style.opacity = (t - (x.r + 1) * tow < at ? 0 : 0.85).toFixed(4);
          } else {
            const e = ML.out(t, x.rel, x.rel + flip);
            px = x.rx + (x.cx - x.rx) * e; py = x.ry + (x.cy - x.ry) * e; sc = 0.45 + 0.55 * e; bl = 6 * (1 - e);
            x.u.style.opacity = "1";
          }
          const dx = px - x.cx, dy = py - x.cy;
          x.u.style.translate = Math.abs(dx) + Math.abs(dy) < 0.01 ? "none" : `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
          x.u.style.scale = sc >= 1 ? "none" : sc.toFixed(4);
          x.u.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});
