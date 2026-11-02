// Custom cursor follower: a website-style custom cursor driven along an authored path. A precise dot follows tightly
// (the quickTo 0.12 s), a ring trails with `lag` (the 0.35–0.6 s power3.out that reads as a smooth hand) — both as
// critically damped springs over the path sampled at 30 fps, so they stay a pure function of t. Over something
// pressable the ring swells to `grow`× with a faint accent fill and a firmer border (0.35 s); the disc variant scales
// up and shows a label (optionally mix-blend-mode: difference). Hover targets are the scene's slots, else small pills.
// Sources: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system (initCursor), editorial-portfolio-chapters,
// build-threejs-scroll-worlds demo (MIT) — re-timed onto one clock.
ML.define({
  id: "ui.cursor-follower",
  category: "ui",
  name: "Custom cursor follower (dot / ring / label disc)",
  does: "A custom cursor — a precise dot with a softly trailing ring, or a lagging disc — follows the pointer and swells (with a faint fill or a label) over things that can be pressed.",
  says: ["playful", "luxury", "focus", "precision", "tech"],
  energy: 2,
  targets: ["cursor"],
  duration: [1, 5],
  params: {
    form: { type: "choice", options: ["dot+ring", "ring", "disc+label"], default: "dot+ring" },
    lag: { type: "number", range: [0.12, 0.6], default: 0.45, unit: "s" },
    grow: { type: "number", range: [1.5, 2], default: 1.75 },
    blend: { type: "choice", options: ["normal", "difference"], default: "normal" },
    label: { type: "text" },
    size: { type: "number", range: [40, 110], default: 64, unit: "px" },
  },
  pairs: ["ui.cursor-free-path", "background.grain"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "initCursor; also editorial-portfolio-chapters, build-threejs-scroll-worlds demo" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const label = p.label || (rtl ? "عرض" : "View");

    // things to hover: the scene's slots, else a row of pills in the picture region
    let targets = [...host.querySelectorAll("[data-slot]")].filter((e) => e !== ctx.stage && !layer.contains(e)).slice(0, 3);
    if (!targets.length) {
      const R = f.pic, row = mk("div", `position:absolute;left:${R.x}px;top:${(R.y + R.h * 0.5).toFixed(1)}px;width:${R.w}px;display:flex;justify-content:center;gap:${(36 * k).toFixed(1)}px;translate:0 -50%;`, layer);
      const words = rtl ? ["الخطط", "ابدأ", "تواصل"] : ["Plans", "Start", "Contact"];
      targets = words.map((w, i) => mk("div", `padding:${(26 * k).toFixed(1)}px ${(48 * k).toFixed(1)}px;border-radius:var(--x-radius-s);font:600 ${(40 * k).toFixed(1)}px var(--x-body-font);background:${i === 1 ? "var(--x-accent)" : "var(--x-panel)"};color:${i === 1 ? "var(--x-accent-ink)" : "var(--x-ink)"};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`, row, w));
    }
    const boxes = targets.map((e) => ctx.box(e));

    // the authored path: in from the reading side, a hover on each target, a drift away between them
    const t0 = at + 0.1, t1 = Math.max(t0 + 0.8, end - 0.35), safe = f.safe;
    const order = rtl ? [...boxes].sort((a, b) => b.x - a.x) : [...boxes].sort((a, b) => a.x - b.x);
    const pts = [{ x: rtl ? safe.x + safe.w * 0.9 : safe.x + safe.w * 0.1, y: safe.y + safe.h * 0.78 }];
    order.forEach((b, i) => {
      pts.push({ x: b.x + b.w * 0.5, y: b.y + b.h * 0.5, hold: true });
      if (i < order.length - 1) pts.push({ x: (b.x + b.w * 0.5 + order[i + 1].x + order[i + 1].w * 0.5) / 2, y: b.y + b.h * 0.5 + (i % 2 ? -1 : 1) * Math.max(120 * k, b.h * 1.6) });
    });
    pts.push({ x: rtl ? safe.x + safe.w * 0.22 : safe.x + safe.w * 0.78, y: safe.y + safe.h * 0.84 });
    const stops = [], hold = [];
    const step = (t1 - t0) / (pts.length - 1 + pts.filter((q) => q.hold).length * 0.8);
    let tt = t0;
    pts.forEach((q) => { stops.push({ t: tt, x: q.x, y: q.y }); if (q.hold) { hold.push(tt); tt += step * 0.8; stops.push({ t: tt, x: q.x, y: q.y }); hold.push(tt); } tt += step; });
    const P = (t) => ML.pathAt(stops, t, hold);
    const inside = (q) => boxes.some((b) => q.x >= b.x - 6 * k && q.x <= b.x + b.w + 6 * k && q.y >= b.y - 6 * k && q.y <= b.y + b.h + 6 * k);

    // springs over the sampled path (30 fps): the dot tight, the ring with the lag, hover over 0.35 s
    const kxs = [], kys = [], khs = [];
    for (let s = t0 - 0.2; s <= t1 + 0.6; s += 1 / 30) { const q = P(s); kxs.push([s, q.x]); kys.push([s, q.y]); khs.push([s, inside(q) ? 1 : 0]); }
    const spring = (lag) => ML.critical(4.6 / lag);
    const cDot = spring(0.12), cRing = spring(p.lag), cHover = spring(0.35);
    const follow = (t, cfg) => ({ x: ML.track(t, kxs, cfg), y: ML.track(t, kys, cfg) });

    const S = p.size * k;
    const diff = p.blend === "difference";
    // difference needs the look's lightest colour to show on any ground (a dark look's panel would vanish on its ground)
    const lum = (v) => { const e = mk("div", `display:none;color:${v};`, layer), c = getComputedStyle(e).color, [r, g, b] = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number); e.remove(); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / (c.startsWith("color(") ? 1 : 255); };
    const inkLighter = lum("var(--x-ink)") > lum("var(--x-panel)"), hi = inkLighter ? "var(--x-ink)" : "var(--x-panel)", lo = inkLighter ? "var(--x-panel)" : "var(--x-ink)";
    const dot = p.form === "dot+ring" ? mk("div", `position:absolute;left:0;top:0;width:${(S * 0.2).toFixed(1)}px;height:${(S * 0.2).toFixed(1)}px;margin:${(-S * 0.1).toFixed(1)}px 0 0 ${(-S * 0.1).toFixed(1)}px;border-radius:50%;background:${diff ? hi : "var(--x-accent)"};${diff ? "mix-blend-mode:difference;" : ""}`, layer) : null;
    const disc = p.form === "disc+label";
    const ringS = disc ? S * 1.6 : S;
    const ring = mk("div", `position:absolute;left:0;top:0;width:${ringS.toFixed(1)}px;height:${ringS.toFixed(1)}px;margin:${(-ringS / 2).toFixed(1)}px 0 0 ${(-ringS / 2).toFixed(1)}px;border-radius:50%;box-sizing:border-box;display:grid;place-items:center;${diff ? "mix-blend-mode:difference;" : ""}`, layer);
    const lab = disc ? mk("div", `font:var(--x-label-weight) ${(ringS * 0.3).toFixed(1)}px ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:${diff ? lo : "var(--x-ground)"};white-space:nowrap;`, ring, label) : null;
    ctx.sfx(t0, "whoosh.soft", 0.18);
    hold.filter((_, i) => i % 2 === 0).forEach((h) => ctx.sfx(h - 0.05, "tap", 0.22));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25), on = t >= at ? ML.clamp((t - at) / 0.2) : 0;
        layer.style.opacity = (on * (1 - leave)).toFixed(4);
        const h = ML.clamp(ML.track(t, khs, cHover));
        const r = follow(t, cRing);
        if (dot) { const d = follow(t, cDot); dot.style.transform = `translate(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px) scale(${(1 - 0.5 * h).toFixed(4)})`; }
        const sc = 1 + (p.grow - 1) * h;
        // the ring is drawn at its grown size so its edge stays crisp: scale only ever ≤ 1
        ring.style.width = ring.style.height = (ringS * sc).toFixed(2) + "px";
        ring.style.margin = `${(-ringS * sc / 2).toFixed(2)}px 0 0 ${(-ringS * sc / 2).toFixed(2)}px`;
        ring.style.transform = `translate(${r.x.toFixed(2)}px, ${r.y.toFixed(2)}px)`;
        if (disc) {
          ring.style.background = diff ? hi : "color-mix(in srgb, var(--x-ink) 88%, transparent)";
          ring.style.border = "none";
          lab.style.opacity = ML.clamp((h - 0.35) / 0.5).toFixed(4);
          lab.style.scale = (0.85 + 0.15 * h).toFixed(4);
        } else {
          ring.style.border = `${(2.5 * k).toFixed(2)}px solid color-mix(in srgb, ${diff ? hi : p.form === "ring" ? "var(--x-accent)" : "var(--x-ink)"} ${(42 + 18 * h).toFixed(1)}%, transparent)`;
          ring.style.background = `color-mix(in srgb, ${diff ? hi : "var(--x-accent)"} ${(h * 8).toFixed(2)}%, transparent)`;
        }
      },
    };
  },
});
