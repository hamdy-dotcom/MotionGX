// Impact burst — flash, rings and rays: a point flares white-hot and explodes into concentric coloured rings and
// radial strokes, like a target hit or an ignition. Our own rebuild of three prompt-motion references: a flash core
// (scales up, fades fast); 1–4 concentric rings (strokes thinning as they grow) expanding 0 → R on expo out over 0.6 s,
// staggered 0.05 s, the outer one with a dotted inner ring of small dots, then drifting on slowly and fading; radial
// rays starting at r ≈ 20 px and shooting out to 160–300 px while shortening (power3 out, 0.5 s, fading over their last
// 30%); tiny scatter dots and confetti dashes drifting after; the centre dot growing to a filled disc on back out as
// the burst settles. The ignition variant (preflicker) flickers a tall soft lens flare for 0.3 s first (its flicker
// is seeded by the frame number, so it is the same every render). Palette from the look: brand (accent, accent-2,
// accent-ink), multi (bad, good, accent, accent-2) or mono (accent-ink / ink). All radii are shares of the frame.
// Sources: prompt-motion ghinaiya-nirmal-motion-designers-are-cooked, shinskinakamoto-claude-opus-5-5-is,
// sudo-kiran-no-storyboard-no-detailed (reference only — our own code).
ML.define({
  id: "accent.impact-burst",
  category: "accent",
  name: "Impact burst: flash, rings and rays",
  does: "A point flares white-hot and explodes into concentric coloured rings and radial strokes, like a target hit or an ignition.",
  says: ["energy", "result", "arrival", "celebration"],
  energy: 4,
  targets: ["shape", "stage"],
  duration: [0.6, 1.8],
  params: {
    rings: { type: "number", range: [1, 4], default: 2 },
    rays: { type: "number", range: [8, 48], default: 16 },
    palette: { type: "choice", options: ["brand", "multi", "mono"], default: "brand" },
    preflicker: { type: "bool", default: false },
    size: { type: "number", range: [0.3, 1], default: 0.6 },
    settle_disc: { type: "bool", default: true },
  },
  pairs: ["accent.gradient-mapped-sprite", "data.counter-pop", "rhythm.beat-flash"],
  avoid: ["calm", "trust", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:shinskinakamoto-claude-opus-5-5-is", license: "reference", note: "with ghinaiya-nirmal-motion-designers-are-cooked and sudo-kiran-no-storyboard-no-detailed; our own code" },
  setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || stage;
    const el = ctx.el && ctx.el !== stage ? ctx.el : null;
    const b = el ? ctx.box(el) : null;
    const cx = b ? b.x + b.w / 2 : f.pic.x + f.pic.w / 2, cy = b ? b.y + b.h / 2 : f.pic.y + f.pic.h / 2;
    const minSide = Math.min(f.W, f.H), k = minSide / 1080;
    const S = ML.clamp(+p.size || 0.6, 0.3, 1) / 0.6; // 1 = the reference sizes at 1080
    const life = ML.clamp(end - at, 0.6, 1.8);
    const flick = p.preflicker ? 0.3 : 0;
    const tb = at + flick; // the burst moment

    const PAL = {
      brand: ["var(--x-accent)", "var(--x-accent-2)", "color-mix(in oklab, var(--x-accent) 50%, var(--x-accent-ink))", "var(--x-accent-ink)"],
      multi: ["var(--x-bad)", "var(--x-good)", "var(--x-accent-2)", "var(--x-accent)"],
      mono: ["var(--x-ink)", "color-mix(in srgb, var(--x-ink) 60%, transparent)", "var(--x-ink)", "var(--x-dim)"],
    };
    const pal = PAL[p.palette] || PAL.brand;
    const hot = p.palette === "mono" ? "var(--x-ink)" : "color-mix(in oklab, var(--x-accent-ink) 82%, var(--x-accent-2))";

    const sv = (tag, a, parent) => { const e = doc.createElementNS(NS, tag); for (const [kk, v] of Object.entries(a)) e.setAttribute(kk, v); parent.append(e); return e; };
    const svg = sv("svg", { width: f.W, height: f.H, viewBox: `0 0 ${f.W} ${f.H}` }, host);
    svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:21;visibility:hidden;will-change:transform"; // its own layer: the frame under it rasterises the same every time
    const g = sv("g", { transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)})` }, svg);

    // ignition flare: a tall soft ellipse (a shape, not a picture: blur is fine)
    const flare = sv("ellipse", { rx: (5 * k * S).toFixed(1), ry: (38 * k * S).toFixed(1) }, g);
    flare.style.fill = hot; flare.style.filter = `blur(${(3 * k).toFixed(1)}px)`;
    // rings: radii after the reference (110 / 200 / 290 px + one more), stroke 6 px thinning
    const NR = Math.round(ML.clamp(+p.rings || 2, 1, 4));
    const RR = [110, 200, 290, 370].map((r) => r * k * S);
    const rings = [];
    for (let i = 0; i < NR; i++) {
      const c = sv("circle", { r: 0, fill: "none" }, g); c.style.stroke = pal[i % pal.length];
      rings.push({ c, R: RR[i], d: i * 0.05 });
    }
    // dotted inner ring on the outermost
    const dotted = sv("circle", { r: 0, fill: "none", "stroke-linecap": "round" }, g); dotted.style.stroke = pal[(NR - 1) % pal.length];
    // rays
    const NY = Math.round(ML.clamp(+p.rays || 16, 8, 48));
    const rays = [];
    for (let i = 0; i < NY; i++) {
      const a = ((i + 0.5 * ML.rnd(i, 2)) / NY) * Math.PI * 2;
      const l = sv("line", { "stroke-linecap": "round" }, g); l.style.stroke = i % 3 === 0 ? hot : pal[i % pal.length];
      rays.push({ l, a, r0: 20 * k * S, r1: (160 + 140 * ML.rnd(i, 3)) * k * S, len: (30 + 90 * ML.rnd(i, 4)) * k * S, w: (1.5 + 2.5 * ML.rnd(i, 5)) * k, d: 0.04 * ML.rnd(i, 6) });
    }
    // scatter dots and confetti dashes
    const bits = [];
    for (let i = 0; i < 28; i++) {
      const a = ML.rnd(i, 7) * Math.PI * 2, dash = i % 3 === 0;
      const e = dash ? sv("line", { "stroke-linecap": "round" }, g) : sv("circle", { r: ((1.5 + 2 * ML.rnd(i, 8)) * k * S).toFixed(2) }, g);
      if (dash) e.style.stroke = pal[i % pal.length]; else e.style.fill = pal[(i + 1) % pal.length];
      bits.push({ e, a, dash, r0: (40 + 60 * ML.rnd(i, 9)) * k * S, r1: (180 + 200 * ML.rnd(i, 10)) * k * S, spin: (ML.rnd(i, 11) - 0.5) * 3, len: (8 + 8 * ML.rnd(i, 12)) * k * S });
    }
    // flash core and the centre dot
    const flash = sv("circle", { r: 0 }, g); flash.style.fill = hot;
    const core = sv("circle", { r: 0 }, g); core.style.fill = pal[0];
    ctx.sfx(tb, "hit", 0.55);

    const p3 = (x) => 1 - Math.pow(1 - ML.clamp(x), 3);
    return {
      draw(t) {
        if (t < at - 1e-6 || t > at + flick + life + 0.3 || t > end + 0.3) { svg.style.visibility = "hidden"; return; }
        svg.style.visibility = "visible";
        const all = 1 - ML.ease(t, tb + life - 0.25, tb + life + 0.05); // the whole thing clears by the end of its life
        // ignition flicker (seeded per frame)
        if (flick && t < tb + 0.08) {
          const fr = Math.floor(t * 30), o = t < tb ? 0.4 + 0.6 * ML.rnd(fr, 13) : 1 - ML.lin(t, tb, tb + 0.08);
          flare.style.opacity = o.toFixed(3);
        } else flare.style.opacity = "0";
        const e = t - tb;
        // flash core: up fast, gone fast
        const fl = e < 0 ? 0 : ML.out(t, tb, tb + 0.08) * (1 - ML.lin(t, tb + 0.05, tb + 0.3));
        flash.setAttribute("r", (fl * 70 * k * S).toFixed(2)); flash.style.opacity = fl.toFixed(3);
        // rings
        rings.forEach((r, i) => {
          const u = e < r.d ? 0 : ML.expo(t, tb + r.d, tb + r.d + 0.6);
          const drift = Math.max(0, e - 0.6) * 0.18 * r.R; // keep growing slowly afterwards
          const rad = u * r.R + drift;
          r.c.setAttribute("r", rad.toFixed(2));
          r.c.setAttribute("stroke-width", Math.max(0.6, (6 * k * S) * (1 - 0.65 * u)).toFixed(2));
          r.c.style.opacity = (u > 0 ? (1 - ML.lin(t, tb + 0.35 + r.d, tb + life)) * all : 0).toFixed(3);
          if (i === NR - 1) {
            const dr = Math.max(0, rad - 14 * k * S), circ = 2 * Math.PI * dr, n = Math.max(8, Math.round(circ / (14 * k)));
            dotted.setAttribute("r", dr.toFixed(2));
            dotted.setAttribute("stroke-width", (2.4 * k).toFixed(2));
            dotted.setAttribute("stroke-dasharray", `0.01 ${(circ / n).toFixed(3)}`);
            dotted.style.opacity = (u > 0.2 ? 0.8 * (1 - ML.lin(t, tb + 0.3, tb + life)) * all : 0).toFixed(3);
          }
        });
        // rays: travel outward and shorten, fade over their last 30%
        for (const r of rays) {
          const x = (e - r.d) / 0.5;
          if (x <= 0 || x >= 1.05) { r.l.style.opacity = "0"; continue; }
          const u = p3(x), head = r.r0 + (r.r1 - r.r0) * u, len = r.len * (1 - 0.85 * u), tail = Math.max(r.r0, head - len);
          const c = Math.cos(r.a), s = Math.sin(r.a);
          r.l.setAttribute("x1", (c * tail).toFixed(2)); r.l.setAttribute("y1", (s * tail).toFixed(2));
          r.l.setAttribute("x2", (c * head).toFixed(2)); r.l.setAttribute("y2", (s * head).toFixed(2));
          r.l.setAttribute("stroke-width", r.w.toFixed(2));
          r.l.style.opacity = ((1 - ML.lin(x, 0.7, 1)) * all).toFixed(3);
        }
        // scatter dots and confetti drift
        for (const q of bits) {
          if (e <= 0.05) { q.e.style.opacity = "0"; continue; }
          const u = ML.out(t, tb + 0.05, tb + 0.05 + life * 0.9), rr = q.r0 + (q.r1 - q.r0) * u;
          const x = Math.cos(q.a) * rr, y = Math.sin(q.a) * rr + u * u * 30 * k * S; // a little gravity
          if (q.dash) {
            const a = q.a + q.spin * u, dx = Math.cos(a) * q.len / 2, dy = Math.sin(a) * q.len / 2;
            q.e.setAttribute("x1", (x - dx).toFixed(2)); q.e.setAttribute("y1", (y - dy).toFixed(2)); q.e.setAttribute("x2", (x + dx).toFixed(2)); q.e.setAttribute("y2", (y + dy).toFixed(2));
            q.e.setAttribute("stroke-width", (2 * k).toFixed(2));
          } else { q.e.setAttribute("cx", x.toFixed(2)); q.e.setAttribute("cy", y.toFixed(2)); }
          q.e.style.opacity = (0.9 * (1 - ML.lin(u, 0.55, 1)) * all).toFixed(3);
        }
        // the centre dot: a small dot at the hit, growing to a filled disc as it settles
        const grow = p.settle_disc ? ML.back(t, tb + 0.3, tb + 0.6, 1.7) : 0;
        const rc = (e < 0 ? (flick ? 0 : 6) : 6 + 34 * Math.max(0, grow)) * k * S;
        core.setAttribute("r", Math.max(0, rc).toFixed(2));
        core.style.opacity = ((t >= tb - (flick ? 0 : 1) ? 1 : 0) * all).toFixed(3);
      },
    };
  },
});
