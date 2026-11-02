// Content pushes the frame until it bends: the word grows (scale 1 → grow over ~1.5 s) inside a thin frame drawn as an
// SVG path with bezier edges. Each edge's displacement = max(0, content bound − frame edge) × k + a 2 px sine wobble,
// shaped along the edge so it bulges where the letters press (the middle of a side, the span of the word on top and
// bottom). "one" pins the word to its trailing side so it pushes into the leading edge (right in Latin, left in Arabic);
// "all" grows from the centre and bends every side. An optional chapter label switches with the pressure
// ("CONTROL" → "PRESSURE" → "ESCAPE"). With break_out the pressed edge splits at the bulge, its two halves swing open
// and the word slips past the line. The word's own box never grows (an inner span scales), so the layout holds.
// Source: prompt-motion "pankajkumar-dev-opus-5-5-is-insanely" (reference only — rebuilt as our own code).
ML.define({
  id: "element.frame-bulge-pressure",
  category: "element",
  name: "Content pushes the frame until it bends",
  does: "The word grows until it presses against the thin frame border, which bulges outward under the pressure and finally lets it break out.",
  says: ["problem", "energy", "scale", "urgency"],
  energy: 4,
  targets: ["headline", "stage"],
  duration: [1.5, 3],
  params: {
    edges: { type: "choice", options: ["one", "all"], default: "one" },
    break_out: { type: "bool", default: true },
    grow: { type: "number", range: [1.05, 1.25], default: 1.12 },
    press: { type: "number", range: [1, 2.5], default: 1.6, unit: "s" },
    chapters: { type: "text", default: "CONTROL,PRESSURE,ESCAPE" },
    text: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "camera.impact-shake"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:pankajkumar-dev-opus-5-5-is-insanely", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;

    // the word: the headline wrapped in an inner span (it scales; the slot keeps its box), or our own word on the stage
    let inner, wordHost = null;
    if (own) {
      inner = doc.createElement("span");
      inner.style.cssText = "display:inline-block;position:relative;";
      while (own.firstChild) inner.append(own.firstChild);
      own.append(inner);
    } else {
      wordHost = mk("div", `position:absolute;left:${f.safe.x}px;top:${f.safe.y}px;width:${f.safe.w}px;height:${f.safe.h}px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:6;`, host);
      inner = mk("span", `display:inline-block;position:relative;white-space:nowrap;font:var(--x-head-weight) var(--x-hero-size)/1.02 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-hero-track)"};color:var(--x-ink);`, wordHost, p.text || (rtl ? "ضغط" : "PRESSURE"));
      ML.fit(inner, f.safe.w * 0.7);
    }
    const B0 = ctx.box(inner);
    const g = ML.clamp(p.grow, 1.05, 1.25);
    const one = p.edges === "one";
    const leadRight = !rtl; // the edge the word presses in "one"
    // a base scale (≤ 1, so always sharp) that leaves room on the stage for the growth, the bulge and the escape
    const gut = 24 * k;
    const avail = one ? (leadRight ? f.W - gut - B0.x : B0.x + B0.w - gut) : Math.min(B0.x + B0.w / 2 - gut, f.W - gut - B0.x - B0.w / 2) * 2;
    const s0 = Math.min(1, avail / (B0.w * (g + (g - 1) * (one ? 1.3 : 0.7))));
    // the word's box at the base scale (scaled about its trailing side in "one", its centre in "all")
    const B = { w: B0.w * s0, h: B0.h * s0, y: B0.y + (B0.h * (1 - s0)) / 2 };
    B.x = one ? (leadRight ? B0.x : B0.x + B0.w - B.w) : B0.x + (B0.w - B.w) / 2;
    // frame: pressure starts about a third of the way through the growth
    const padX = Math.max(6 * k, (one ? B.w * (g - 1) : (B.w * (g - 1)) / 2) * 0.32);
    const padY = Math.max(5 * k, ((B.h * (g - 1)) / 2) * 0.3);
    const FX = B.x - padX, FY = B.y - padY, FW = B.w + padX * 2, FH = B.h + padY * 2;
    const lw = Math.max(1.5, 2.2 * k);
    const sv = doc.createElementNS(NS, "svg");
    sv.setAttribute("viewBox", `0 0 ${f.W} ${f.H}`);
    sv.style.cssText = `position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px;overflow:visible;pointer-events:none;z-index:5;`;
    host.append(sv);
    const path = (w) => { const e = doc.createElementNS(NS, "path"); e.setAttribute("fill", "none"); e.setAttribute("stroke", "var(--x-ink)"); e.setAttribute("stroke-width", w); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round"); sv.append(e); return e; };
    const edgeEls = { top: path(lw), right: path(lw), bottom: path(lw), left: path(lw) };
    const halves = [path(lw), path(lw)];
    const leadKey = leadRight ? "right" : "left";

    // chapter label: a legend sitting on the frame's top edge at the trailing corner (where the edge barely moves)
    const DEF_EN = "CONTROL,PRESSURE,ESCAPE";
    const chap = (rtl && p.chapters === DEF_EN ? "تحكّم,ضغط,انطلاق" : String(p.chapters || "")).split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    const labSize = Math.max(16, Math.min(22 * k, B.h * 0.22));
    const lab = chap.length ? mk("div", `position:absolute;top:${Math.max(4 * k, FY - labSize * 1.45)}px;${rtl ? "" : `left:${FX + labSize * 1.2}px;`}padding:0 ${labSize * 0.5}px;background:var(--x-ground);font:var(--x-label-weight) ${labSize}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);white-space:nowrap;pointer-events:none;z-index:6;direction:${rtl ? "rtl" : "ltr"};`, host) : null;
    if (lab && rtl) lab.style.right = `${f.W - (FX + FW) + labSize * 1.2}px`;

    // times
    const span = Math.max(1, end - at);
    const press = Math.min(ML.clamp(p.press, 1, 2.5), span * 0.62);
    const tA = at + 0.25, tB = tA + press; // growth, then the break
    const wob = 2 * k;
    const scaleAt = (t) => 1 + (g - 1) * ML.ease(t, tA, tB); // relative to the base scale
    ctx.sfx(tA, "riser", 0.28);
    if (p.break_out) ctx.sfx(tB, "hit", 0.5);
    else ctx.sfx(tB - 0.1, "snap", 0.3);
    const chapT = [at, tA + press * 0.45, tB];

    // content bounds at a scale (the word's origin: centre, or its trailing side in "one")
    const bounds = (s) => {
      const cy = B.y + B.h / 2, hh = (B.h * s) / 2;
      if (!one) { const cx = B.x + B.w / 2, hw = (B.w * s) / 2; return { l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh }; }
      return leadRight ? { l: B.x, r: B.x + B.w * s, t: cy - hh, b: cy + hh } : { l: B.x + B.w - B.w * s, r: B.x + B.w, t: cy - hh, b: cy + hh };
    };
    const K = 1.15;
    // one edge as points: a bump along its length where the letters press, plus the wobble while pressed
    const N = 18;
    const edgePts = (key, s, t) => {
      const c = bounds(s);
      const over = key === "right" ? c.r - (FX + FW) : key === "left" ? FX - c.l : key === "top" ? FY - c.t : c.b - (FY + FH);
      const active = one ? key === leadKey || key === "top" || key === "bottom" : true;
      const amp = active ? Math.max(0, over) * K : 0;
      const live = amp > 0.3 ? 1 : 0;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        let prof;
        if (key === "left" || key === "right") prof = Math.pow(Math.sin(Math.PI * u), 0.7);
        else {
          // top / bottom: pressed across the word's span (in "one", strongest toward the leading side)
          const x = FX + FW * u, lo = c.l, hi = c.r;
          const inside = ML.clamp((x - FX) / Math.max(1, lo - FX + B.w * 0.08)) * ML.clamp((FX + FW - x) / Math.max(1, FX + FW - hi + B.w * 0.08));
          prof = Math.pow(Math.sin(Math.PI * u), 0.5) * (0.4 + 0.6 * inside);
          if (one) prof *= leadRight ? 0.3 + 0.7 * u : 1 - 0.7 * u;
        }
        const d = amp * prof + live * wob * Math.sin(t * 19 + u * 9 + (key.length * 1.7)) * Math.sin(Math.PI * u);
        if (key === "top") pts.push([FX + FW * u, FY - d]);
        else if (key === "bottom") pts.push([FX + FW * u, FY + FH + d]);
        else if (key === "left") pts.push([FX - d, FY + FH * u]);
        else pts.push([FX + FW + d, FY + FH * u]);
      }
      return pts;
    };
    // Catmull-Rom through the points → cubic beziers
    const bez = (pts) => {
      let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
      }
      return d;
    };
    // the pressed edge at the moment it breaks (fixed), split in two
    const atBreak = edgePts(leadKey, g, tB);
    const mid = Math.floor(N / 2);
    const halfA = atBreak.slice(0, mid + 1), halfB = atBreak.slice(mid);

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.26);
        const vis = t >= at - 0.05;
        sv.style.visibility = vis ? "visible" : "hidden";
        sv.style.opacity = (ML.out(t, at, at + 0.25) * (1 - leave)).toFixed(4);
        if (wordHost) wordHost.style.opacity = (ML.out(t, at - 0.1, at + 0.2) * (1 - leave)).toFixed(4);
        else if (own) own.style.opacity = (1 - leave).toFixed(4);
        const broke = p.break_out && t >= tB;
        // the word: grows, then slips past the opened edge
        const s = scaleAt(t);
        const esc = broke ? ML.back(t, tB, tB + 0.45, 1.4) : 0;
        const escX = one ? (leadRight ? 1 : -1) * padX * 2.2 * esc : 0;
        const kick = broke ? 0.03 * ML.pulse(t, tB + 0.05, 0.04, 0.25) : 0;
        inner.style.transformOrigin = one ? (leadRight ? "0% 50%" : "100% 50%") : "50% 50%";
        inner.style.transform = `translateX(${escX.toFixed(2)}px) scale(${((s + kick) * s0).toFixed(4)})`;
        // the frame
        for (const key of ["top", "right", "bottom", "left"]) {
          const hide = broke && key === leadKey;
          edgeEls[key].style.display = hide ? "none" : "";
          if (!hide) edgeEls[key].setAttribute("d", bez(edgePts(key, s, t)));
        }
        halves.forEach((h, i) => {
          h.style.display = broke ? "" : "none";
          if (!broke) return;
          const pts = i === 0 ? halfA : halfB;
          const pivot = i === 0 ? pts[0] : pts[pts.length - 1];
          const u = ML.back(t, tB, tB + 0.4, 1.8);
          const ang = (i === 0 ? -1 : 1) * (leadRight ? 1 : -1) * 38 * u;
          h.setAttribute("d", bez(pts));
          h.setAttribute("transform", `rotate(${ang.toFixed(2)} ${pivot[0].toFixed(2)} ${pivot[1].toFixed(2)})`);
          h.setAttribute("opacity", (1 - 0.45 * ML.lin(t, tB + 0.3, tB + 0.8)).toFixed(4));
        });
        if (lab) {
          const idx = chapT.reduce((v, ct, i) => (t >= ct && (i < 2 || p.break_out) ? i : v), 0);
          const name = chap[Math.min(idx, chap.length - 1)];
          if (lab.textContent !== name) lab.textContent = name;
          const since = t - chapT[Math.min(idx, 2)];
          const flick = idx > 0 ? ML.out(since, 0, 0.18) : ML.out(t, at, at + 0.3);
          lab.style.opacity = ((0.35 + 0.65 * flick) * (vis ? 1 : 0) * (1 - leave)).toFixed(4);
          lab.style.color = idx === chap.length - 1 && idx > 0 ? "var(--x-accent)" : "var(--x-dim)";
          lab.style.translate = `0 ${((1 - flick) * 6 * k).toFixed(2)}px`;
        }
      },
    };
  },
});
