// Items orbit a centre: avatars, icon tiles, letter-mark logos or dots circle one core — an icon tile (radius 22 %) in
// a soft halo with a ping pulse, a disc that pops (scale 0 → 1, back.out, 0.4 s), or a statistic with its label — on
// 1–4 rings (35 / 55 / 75 / 95 % of the box, hairlines fading outward; the first dashed as in blue-cloudy, the rest
// drawn on by dash-offset in 0.4 s). Entry: spread (each item flies out from the centre to its radius, scale 0 → 1,
// back.out(1.8), 0.4 s, 0.04 s apart), burst-cross (they shoot out to N / E / S / W first, then glide onto the
// ring) or fade-scale (each ring fades and grows 0.9 → 1 in 1.2 s power3.out, 0.1 s apart). Orbit: each ring turns at
// the speed, alternate rings the other way and slower outward (like 25 / 35 / 45 / 60 s a turn); items stay upright
// (the counter-rotation) or ride the ring's angle; a tilted orbit becomes an ellipse with a little depth (0.88–1, 2D).
// Tiles carry a matching soft glow. Turning direction mirrors in Arabic.
// Source: MengTo/Skills web-design blue-cloudy-clean-modern + gooey-blob-system demos (MIT): the dashed 160 px ring
// rotating t·15° with glass icon chips counter-rotating −t·15° to stay upright, two faint static outer rings, a hub
// with a ping; prompt-motion notdwd / shinskinakamoto pieces (reference only) for the spread and burst entries.
ML.define({
  id: "element.orbit-ring",
  category: "element",
  name: "Items orbit a centre",
  does: "Avatars, icon tiles or dots circle a central icon, disc or statistic on one or more rings, spreading out from the centre first.",
  says: ["connection", "brand", "scale", "trust", "list", "playful", "calm"],
  energy: 2,
  targets: ["logo", "image", "number", "shape", "list"],
  duration: [2, 10],
  params: {
    rings: { type: "number", range: [1, 4], default: 1 },
    items: { type: "number", range: [3, 16], default: 6 },
    item: { type: "choice", options: ["avatars", "icons", "logos", "dots"], default: "icons" },
    speed: { type: "number", range: [6, 40], default: 20, unit: "deg/s" },
    entry: { type: "choice", options: ["spread", "burst-cross", "fade-scale"], default: "spread" },
    tilt: { type: "number", range: [0, 70], default: 0, unit: "deg" },
    centre: { type: "choice", options: ["icon", "disc", "stat"], default: "icon" },
    upright: { type: "bool", default: true },
    ring: { type: "choice", options: ["dashed", "solid"], default: "dashed" },
    label: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.avatar-stack", "data.odometer"],
  avoid: ["urgency", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/blue-cloudy-clean-modern", license: "MIT", note: "rotating dashed ring with upright counter-rotating chips, faint outer rings and a ping hub from the blue-cloudy and gooey-blob demos; spread / burst entries rebuilt from prompt-motion notdwd-stop-asking-opus-5-5, shinskinakamoto-claude-opus-5-5-is, notdwd-another-one-1000-ai (reference only)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer);
    const S = Math.min(R.w, R.h * (1 / Math.max(0.3, Math.cos((p.tilt * Math.PI) / 180))), R.w) * 0.96;
    const cx = R.w / 2, cy = R.h / 2;
    const tiltC = Math.cos((ML.clamp(p.tilt, 0, 70) * Math.PI) / 180);
    const nR = Math.round(ML.clamp(p.rings, 1, 4));
    const fr = [[0.62], [0.42, 0.82], [0.35, 0.62, 0.9], [0.35, 0.55, 0.75, 0.95]][nR - 1];
    const radii = fr.map((x) => (S * x) / 2);
    const ringA = [18, 13, 9, 6];
    // rings: one svg under everything
    const svg = doc.createElementNS(NS, "svg"); svg.setAttribute("width", R.w); svg.setAttribute("height", R.h); svg.style.cssText = "position:absolute;inset:0;overflow:visible;"; layer.append(svg);
    const circles = radii.map((r, i) => {
      const e = doc.createElementNS(NS, "ellipse"); e.setAttribute("cx", cx); e.setAttribute("cy", cy); e.setAttribute("rx", r); e.setAttribute("ry", r * tiltC);
      e.setAttribute("fill", "none"); e.setAttribute("stroke", `color-mix(in srgb, var(--x-ink) ${ringA[i]}%, transparent)`); e.setAttribute("stroke-width", String(Math.max(1, 1.6 * k)));
      svg.append(e);
      const dashed = p.ring === "dashed" && i === 0;
      const L = 2 * Math.PI * Math.sqrt((r * r + (r * tiltC) ** 2) / 2);
      if (dashed) e.setAttribute("stroke-dasharray", `${6 * k} ${8 * k}`); else { e.setAttribute("stroke-dasharray", `${L} ${L}`); }
      return { e, dashed, L, r };
    });
    // the centre
    const core = mk("div", `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;`, layer);
    const coreSize = Math.min(radii[0] * 0.9, 120 * k * 1.3);
    const halo = mk("div", `position:absolute;left:${-coreSize * 0.95}px;top:${-coreSize * 0.95}px;width:${coreSize * 1.9}px;height:${coreSize * 1.9}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent) 12%, var(--x-panel-2));`, core);
    const ping = mk("div", `position:absolute;left:${-coreSize * 0.95}px;top:${-coreSize * 0.95}px;width:${coreSize * 1.9}px;height:${coreSize * 1.9}px;border-radius:50%;border:${Math.max(1, 2 * k)}px solid color-mix(in srgb, var(--x-accent) 45%, transparent);box-sizing:border-box;`, core);
    let centreEl;
    const numText = own && /\d/.test(own.textContent || "") ? own.textContent.trim() : rtl ? "+٥٠" : "50+";
    if (p.centre === "disc") {
      centreEl = mk("div", `position:absolute;left:${-coreSize * 0.6}px;top:${-coreSize * 0.6}px;width:${coreSize * 1.2}px;height:${coreSize * 1.2}px;border-radius:50%;background:var(--x-accent);box-shadow:0 0 ${30 * k}px color-mix(in srgb, var(--x-accent) 45%, transparent);`, core);
    } else if (p.centre === "stat") {
      halo.style.background = "var(--x-panel)"; halo.style.boxShadow = "var(--x-shadow)";
      centreEl = mk("div", `position:absolute;left:${-coreSize * 0.95}px;top:${-coreSize * 0.95}px;width:${coreSize * 1.9}px;height:${coreSize * 1.9}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${4 * k}px;`, core);
      const num = mk("div", `font:var(--x-head-weight) ${coreSize * 0.5}px/1 var(--x-head-font);color:var(--x-ink);letter-spacing:var(--x-head-track);white-space:nowrap;direction:ltr;`, centreEl, numText);
      mk("div", `font:var(--x-label-weight) ${coreSize * 0.14}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);white-space:nowrap;`, centreEl, p.label || (rtl ? "تكامل" : "integrations"));
      const w = num.offsetWidth; if (w > coreSize * 1.6) num.style.fontSize = (coreSize * 0.5 * (coreSize * 1.6) / w).toFixed(2) + "px";
    } else {
      centreEl = mk("div", `position:absolute;left:${-coreSize / 2}px;top:${-coreSize / 2}px;width:${coreSize}px;height:${coreSize}px;border-radius:22%;background:var(--x-accent);box-shadow:0 ${8 * k}px ${30 * k}px color-mix(in srgb, var(--x-accent) 40%, transparent);display:flex;align-items:center;justify-content:center;overflow:hidden;`, core);
      // the brand's own mark when the target is one (a copy, drawn no larger than itself), else a spark
      if (own && (own.tagName === "svg" || own.tagName === "IMG")) {
        centreEl.style.background = "var(--x-panel)";
        const c = own.cloneNode(true); c.removeAttribute("data-slot");
        const ow = ob.w, oh = ob.h, sc = Math.min((coreSize * 0.8) / ow, (coreSize * 0.8) / oh, own.tagName === "IMG" ? 1 : 4);
        c.style.cssText = `width:${ow * sc}px;height:${oh * sc}px;display:block;object-fit:contain;direction:ltr;`; // a mark is drawn left to right in any language
        centreEl.append(c);
      } else {
        const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `width:${coreSize * 0.5}px;height:${coreSize * 0.5}px;`;
        const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"); pa.setAttribute("fill", "var(--x-accent-ink)"); s.append(pa); centreEl.append(s);
      }
    }
    // the items, dealt round the rings (outer rings take more)
    const n = Math.round(ML.clamp(p.items, 3, 16));
    const weights = radii.map((r) => r), wsum = weights.reduce((a, b) => a + b, 0);
    const perRing = radii.map((_, i) => Math.max(1, Math.round((n * weights[i]) / wsum)));
    let diff = n - perRing.reduce((a, b) => a + b, 0); for (let i = perRing.length - 1; diff !== 0; i = (i - 1 + perRing.length) % perRing.length) { if (diff > 0) { perRing[i]++; diff--; } else if (perRing[i] > 1) { perRing[i]--; diff++; } }
    const pic = own && own.tagName === "IMG" ? own : host.querySelector("img");
    const glyphs = ["M5 12l5 5 9-10", "M4 6h16v12H4zM4 9h16", "M12 3l9 16H3z", "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 8v4l3 2", "M4 18l6-6 4 4 6-8", "M7 4h10v16H7zM10 17h4", "M4 12a8 8 0 0 1 16 0M8 12a4 4 0 0 1 8 0", "M6 8h12M6 12h12M6 16h8"];
    const LET = rtl ? "أبجدهوزحطيكلمنسع" : "ABCDEFGHJKLMNPQR";
    const items = [];
    let idx = 0;
    perRing.forEach((cnt, ri) => {
      const sizeBase = p.item === "dots" ? 6 * k * 1.4 : Math.min((radii[ri] * 2 * Math.PI) / cnt * 0.55, (44 + ri * 6) * k * 1.3);
      for (let j = 0; j < cnt; j++, idx++) {
        const D = sizeBase;
        const e = mk("div", `position:absolute;left:0;top:0;width:${D}px;height:${D}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;`, layer);
        if (p.item === "dots") { e.style.borderRadius = "50%"; e.style.background = idx % 3 === 0 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 55%, var(--x-panel-2))"; }
        else if (p.item === "avatars") {
          e.style.borderRadius = "50%"; e.style.border = `${Math.max(2, D / 20)}px solid var(--x-panel)`; e.style.boxShadow = "var(--x-shadow)";
          e.style.background = `color-mix(in srgb, var(--x-accent) ${30 + ((idx * 23) % 50)}%, var(--x-panel-2))`;
          if (pic) { const im = mk("img", `width:100%;height:100%;object-fit:cover;object-position:${(10 + ((idx * 37) % 80)).toFixed(0)}% ${(15 + ((idx * 53) % 70)).toFixed(0)}%;display:block;`, e); im.src = pic.currentSrc || pic.src; im.alt = ""; }
          else mk("span", `font:var(--x-head-weight) ${D * 0.4}px/1 var(--x-head-font);color:var(--x-accent-ink);`, e, LET[idx % LET.length]);
        } else {
          e.style.borderRadius = "22%"; e.style.background = "var(--x-panel)"; e.style.border = "var(--x-edge) solid var(--x-edge-color)";
          e.style.boxShadow = `0 ${4 * k}px ${16 * k}px color-mix(in srgb, var(--x-accent) 25%, transparent)`;
          if (p.item === "logos") mk("span", `font:var(--x-head-weight) ${D * 0.42}px/1 var(--x-head-font);color:${idx % 2 ? "var(--x-accent)" : "var(--x-ink)"};letter-spacing:-0.04em;`, e, LET[idx % LET.length] + (rtl ? "" : LET[(idx * 5 + 3) % LET.length].toLowerCase()));
          else { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `width:${D * 0.5}px;height:${D * 0.5}px;`; const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", glyphs[idx % glyphs.length]); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", "var(--x-accent)"); pa.setAttribute("stroke-width", "2"); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); s.append(pa); e.append(s); }
        }
        // irregular spots on the ring (blue-cloudy), evened out a little
        const a0 = (j / cnt) * Math.PI * 2 - Math.PI / 2 + (ML.rnd(idx, 7) - 0.5) * (Math.PI / cnt) * 0.6 + ri * 0.4;
        items.push({ e, D, ri, a0, idx });
      }
    });
    const dirn = rtl ? -1 : 1;
    const speedOf = (ri) => p.speed * [1, 0.72, 0.56, 0.42][ri] * (ri % 2 ? -1 : 1) * dirn;
    const coreT = at;
    const st = 0.04;
    const itemT = (it) => at + 0.25 + (p.entry === "fade-scale" ? it.ri * 0.1 : it.idx * st);
    const ringT = (ri) => at + 0.1 + ri * 0.08;
    ctx.sfx(coreT, p.centre === "disc" ? "pop" : "pop.soft", 0.35);
    ctx.sfx(at + 0.25, "whoosh.soft", 0.25);
    if (n > 5) ctx.sfx(at + 0.25 + Math.floor(n / 2) * st, "pop.soft", 0.25);
    const leaveA = Math.max(at + 1.6, end - 0.3);
    const p3out = (x) => 1 - Math.pow(1 - x, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (ML.lin(t, at - 0.05, at + 0.12) * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        // rings
        circles.forEach((c, ri) => {
          if (p.entry === "fade-scale") { const u = p3out(ML.lin(t, ringT(ri), ringT(ri) + 1.2)); c.e.style.opacity = u.toFixed(4); c.e.setAttribute("stroke-dashoffset", c.dashed ? String((-(t - at) * 12 * k).toFixed(2)) : "0"); c.e.setAttribute("rx", (c.r * (0.9 + 0.1 * u)).toFixed(2)); c.e.setAttribute("ry", (c.r * tiltC * (0.9 + 0.1 * u)).toFixed(2)); }
          else if (c.dashed) { c.e.style.opacity = ML.lin(t, ringT(ri), ringT(ri) + 0.4).toFixed(4); c.e.setAttribute("stroke-dashoffset", String((-(t - at) * speedOf(ri) * 0.6 * k).toFixed(2))); }
          else c.e.setAttribute("stroke-dashoffset", (c.L * (1 - ML.ease(t, ringT(ri), ringT(ri) + 0.4))).toFixed(2));
        });
        // centre
        const pop = t < coreT ? 0 : ML.back(t, coreT, coreT + 0.4, 1.7);
        centreEl.style.transform = `scale(${Math.max(0, pop).toFixed(4)})`;
        halo.style.transform = `scale(${ML.out(t, coreT, coreT + 0.5).toFixed(4)})`;
        const ph = ((t - coreT) % 2) / 2, pingOn = t > coreT + 0.4;
        ping.style.opacity = pingOn ? ((1 - ph) * 0.8).toFixed(4) : "0";
        ping.style.transform = `scale(${(1 + ph * 0.45).toFixed(4)})`;
        // items
        items.forEach((it) => {
          const r = radii[it.ri], a = it.a0 + ((speedOf(it.ri) * Math.max(0, t - at)) * Math.PI) / 180;
          const ox = Math.cos(a) * r, oy = Math.sin(a) * r * tiltC;
          const depth = p.tilt > 0 ? 0.88 + 0.12 * (Math.sin(a) + 1) / 2 : 1;
          const T0 = itemT(it);
          let x = ox, y = oy, s = 1, o = 1;
          if (p.entry === "spread") { const u = t < T0 ? 0 : ML.back(t, T0, T0 + 0.4, 1.8); const d = ML.out(t, T0, T0 + 0.4); x = ox * d; y = oy * d; s = Math.max(0, u); o = ML.lin(t, T0, T0 + 0.1); }
          else if (p.entry === "burst-cross") {
            const q = it.idx % 4, b = 75 * k * 1.4 + radii[0] * 0.25, bx = [0, b, 0, -b][q] * dirn, by = [-b, 0, b, 0][q];
            const u1 = ML.out(t, T0, T0 + 0.25), u2 = ML.ease(t, T0 + 0.25, T0 + 0.75);
            x = bx * u1 + (ox - bx) * u2; y = by * u1 + (oy - by) * u2; s = Math.max(0, t < T0 ? 0 : ML.back(t, T0, T0 + 0.3, 1.8)); o = ML.lin(t, T0, T0 + 0.1);
          } else { const u = p3out(ML.lin(t, T0, T0 + 1.2)); s = 0.9 + 0.1 * u; o = u; x = ox * (0.9 + 0.1 * u); y = oy * (0.9 + 0.1 * u); }
          const rot = p.upright ? 0 : (a * 180) / Math.PI + 90;
          it.e.style.transform = `translate(${(cx + x - it.D / 2).toFixed(2)}px, ${(cy + y - it.D / 2).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${(s * depth).toFixed(4)})`;
          it.e.style.opacity = o.toFixed(4);
          it.e.style.zIndex = p.tilt > 0 ? String(Math.round(depth * 1000) * 32 + it.idx) : "";
        });
      },
    };
  },
});
