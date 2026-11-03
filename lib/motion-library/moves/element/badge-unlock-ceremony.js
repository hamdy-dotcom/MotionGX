// Badge unlock ceremony: an empty badge outline (hexagon, circle or shield; 2 px accent) draws itself, its
// illustration (sun, rays and hills on the look's two accents; the target's own mark on a disc when it is a logo or a picture) fills it from the bottom up (a 0.5 s clip), then it
// unlocks — the badge swells 1 → 1.08 → 1, two glow rings (1 px, scale 0.8 → 1.8, opacity .8 → 0, 0.7 s, 0.15 s apart)
// pulse out, and 60–100 sparkles (2–4 px) burst from it at 100–300 px/s, slow down, drift under gravity and twinkle
// out over 1.5–2.5 s (or rain down around it). An eyebrow ("New badge unlocked") and the badge title fade and rise
// 10 px. Particles are a canvas painted from t (closed-form paths, seeded by index); the badge is laid out at its
// swollen size and only ever scaled down.
// Source: prompt-motion "bthreeagency-you-must-be-kidding" (reference only — rebuilt as our own code).
ML.define({
  id: "element.badge-unlock-ceremony",
  category: "element",
  name: "Badge unlocks with fill, glow and gold burst",
  does: "An empty badge outline draws and fills from the bottom with its illustration, or the brand's mark, then glow rings pulse out, sparkles burst and the badge title fades in.",
  says: ["celebration", "result", "arrival"],
  energy: 4,
  targets: ["shape", "logo", "card"],
  duration: [2, 4],
  params: {
    shape: { type: "choice", options: ["hex", "circle", "shield"], default: "hex" },
    particles: { type: "choice", options: ["burst", "rain"], default: "burst" },
    count: { type: "number", range: [60, 100], default: 80 },
    title: { type: "text", default: "" },
    eyebrow: { type: "text", default: "" },
    size: { type: "number", range: [0.2, 0.4], default: 0.3 },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "data.odometer", "element.app-icon-reveal"],
  avoid: ["calm", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "prompt-motion:bthreeagency-you-must-be-kidding", license: "reference", note: "technique rebuilt as our own code: outline, bottom-up fill, double ring, canvas sparkle burst with drag + gravity" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const big = own && ctx.box(own).w > f.W * 0.4 && ctx.box(own).h > f.H * 0.2;
    const R = big ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // the backdrop sits beside the content (not inside what fades), so what it covers never ghosts through during the exit
    const back = p.backdrop ? mk("div", `position:absolute;left:${R.x - (R === f.pic ? 40 : 0)}px;top:${R.y}px;width:${R.w + (R === f.pic ? 80 : 0)}px;height:${R.h + (R === f.pic ? 70 : 0)}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:6;`, host) : null;
    if (back) host.insertBefore(back, layer);
    const uid = "bu" + Math.round(ML.rnd(R.x + R.w, R.y + 7) * 1e8);

    // the lighter and darker of the look's panel and ink: a sun stays light and a hill's shade dark on any look
    const probe = mk("span", "color:var(--x-accent)", layer), c1 = getComputedStyle(probe).color;
    probe.style.color = "var(--x-accent-2)"; const c2 = getComputedStyle(probe).color;
    const lum = (s) => { const m = (s.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return m[0] * 0.3 + m[1] * 0.6 + m[2] * 0.1; };
    probe.style.color = "var(--x-panel)"; const cp = getComputedStyle(probe).color;
    probe.style.color = "var(--x-ink)"; const ci = getComputedStyle(probe).color; probe.remove();
    const panelLight = lum(cp) >= lum(ci), lightVar = panelLight ? "var(--x-panel)" : "var(--x-ink)", darkVar = panelLight ? "var(--x-ink)" : "var(--x-panel)", c3 = panelLight ? cp : ci;

    // the canvas for the sparkles (under the badge, over the backdrop)
    const cv = mk("canvas", "position:absolute;left:0;top:0;width:100%;height:100%;", layer);
    cv.width = Math.round(R.w); cv.height = Math.round(R.h);
    const g = cv.getContext("2d");

    // badge, title, eyebrow
    const Bs = Math.min(Math.min(f.W, f.H) * ML.clamp(p.size, 0.2, 0.4), R.w * 0.6, R.h * 0.5);
    const eyebrowTxt = p.eyebrow || (rtl ? "وسام جديد اتفتح" : "New badge unlocked");
    const titleTxt = p.title || (rtl ? "المستكشف الأول" : "Early Explorer");
    const eb = mk("div", `position:absolute;white-space:nowrap;font:var(--x-label-weight) ${Bs * 0.1}px/1.2 ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-accent);will-change:transform;`, layer, eyebrowTxt);
    const ti = mk("div", `position:absolute;white-space:nowrap;font:var(--x-head-weight) ${Bs * 0.2}px/1.15 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);will-change:transform;`, layer, titleTxt);
    ML.fit(eb, R.w * 0.92); ML.fit(ti, R.w * 0.92);
    const gapT = Bs * 0.12, blockH = Bs + gapT + eb.offsetHeight + Bs * 0.04 + ti.offsetHeight;
    const by = (R.h - blockH) / 2, bx = (R.w - Bs) / 2, cx = R.w / 2, cy = by + Bs / 2;
    eb.style.left = (R.w - eb.offsetWidth) / 2 + "px"; eb.style.top = by + Bs + gapT + "px";
    ti.style.left = (R.w - ti.offsetWidth) / 2 + "px"; ti.style.top = by + Bs + gapT + eb.offsetHeight + Bs * 0.04 + "px";

    // rings behind the badge
    const rings = [0, 1].map(() => mk("div", `position:absolute;left:${cx - Bs * 0.9}px;top:${cy - Bs * 0.9}px;width:${Bs * 1.8}px;height:${Bs * 1.8}px;box-sizing:border-box;border-radius:50%;border:${Math.max(1.5, Bs / 160)}px solid var(--x-accent);box-shadow:0 0 ${Bs * 0.06}px color-mix(in srgb, var(--x-accent) 60%, transparent);will-change:transform;`, layer));

    // the badge: laid out at 1.08× and shown at 1/1.08 at rest, so its swell never enlarges anything
    const K = 1.08, Bk = Bs * K;
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `${-100 * K} ${-100 * K} ${200 * K} ${200 * K}`);
    svg.style.cssText = `position:absolute;left:${cx - Bk / 2}px;top:${cy - Bk / 2}px;width:${Bk}px;height:${Bk}px;overflow:visible;will-change:transform;`;
    layer.append(svg);
    const hex = Array.from({ length: 6 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return `${(Math.cos(a) * 92).toFixed(2)} ${(Math.sin(a) * 92).toFixed(2)}`; });
    const D = p.shape === "circle" ? "M0 -90 A90 90 0 1 1 0 90 A90 90 0 1 1 0 -90Z"
      : p.shape === "shield" ? "M0 -92 C28 -78 56 -74 80 -74 C80 -10 66 46 0 92 C-66 46 -80 -10 -80 -74 C-56 -74 -28 -78 0 -92Z"
      : `M${hex.join(" L")}Z`;
    const defs = sv("defs", {}, svg);
    const clip = sv("clipPath", { id: uid + "c" }, defs); sv("path", { d: D }, clip);
    const reveal = sv("clipPath", { id: uid + "r" }, defs); const rv = sv("rect", { x: -100, y: 100, width: 200, height: 0 }, reveal);
    const lg = sv("linearGradient", { id: uid + "g", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": "var(--x-accent-2)" }, lg); sv("stop", { offset: 1, "stop-color": "var(--x-accent)" }, lg);
    const ill = sv("g", { "clip-path": `url(#${uid}c)` }, svg);
    const fillG = sv("g", { "clip-path": `url(#${uid}r)` }, ill);
    sv("rect", { x: -100, y: -100, width: 200, height: 200, fill: `url(#${uid}g)` }, fillG);
    const rays = sv("g", { opacity: 0.35 }, fillG);
    const markOf = own && /^(svg|img)$/i.test(own.tagName) ? own : null, ry = markOf ? 0 : -18;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, b = a + 0.12; sv("path", { d: `M0 ${ry} L${Math.cos(a) * 140} ${ry + Math.sin(a) * 140} L${Math.cos(b) * 140} ${ry + Math.sin(b) * 140}Z`, fill: lightVar }, rays); }
    if (markOf) {
      // the brand's own mark on a light disc (a logo's lettering stays out: the title carries the words)
      sv("circle", { cx: 0, cy: 0, r: 58, fill: lightVar }, fillG);
      if (markOf.tagName.toLowerCase() === "img") sv("image", { href: markOf.currentSrc || markOf.src, x: -42, y: -42, width: 84, height: 84, preserveAspectRatio: "xMidYMid meet" }, fillG);
      else { const m = markOf.cloneNode(true); m.removeAttribute("data-slot"); m.removeAttribute("style"); m.querySelectorAll("text").forEach((x) => x.remove()); for (const [a, v] of [["x", -42], ["y", -42], ["width", 84], ["height", 84]]) m.setAttribute(a, v); fillG.append(m);
        try { const b = m.getBBox(); if (b.width > 0 && b.height > 0) { const s = Math.max(b.width, b.height); m.setAttribute("viewBox", `${b.x + b.width / 2 - s / 2} ${b.y + b.height / 2 - s / 2} ${s} ${s}`); } } catch (e) { /* not laid out: keep its viewBox */ } }
    } else {
      sv("circle", { cx: 0, cy: -18, r: 30, fill: lightVar, opacity: 0.92 }, fillG);
      sv("path", { d: "M-110 40 Q-50 0 0 32 T110 22 L110 110 L-110 110Z", fill: "var(--x-accent)", opacity: 0.85 }, fillG);
      sv("path", { d: "M-110 62 Q-30 30 40 58 T110 52 L110 110 L-110 110Z", fill: darkVar, opacity: 0.25 }, fillG);
    }
    const empty = sv("path", { d: D, fill: "color-mix(in srgb, var(--x-accent) 8%, transparent)" }, svg);
    const outline = sv("path", { d: D, fill: "none", stroke: "var(--x-accent)", "stroke-width": Math.max(2, 200 / Bs * 2.4), "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
    empty.parentNode.insertBefore(empty, ill);

    // sparkles, in the look's colours
    const N = Math.round(ML.clamp(p.count, 60, 100)), k = Bs / 300;
    const parts = Array.from({ length: N }, (_, i) => ({
      a: ML.rnd(i, 1) * Math.PI * 2, v: (100 + ML.rnd(i, 2) * 200) * k * 1.6, life: 1.5 + ML.rnd(i, 3), r: (2 + ML.rnd(i, 4) * 2) * k * 2.2,
      col: [c1, c1, c2, c3][Math.floor(ML.rnd(i, 5) * 4)], tw: 8 + ML.rnd(i, 6) * 10, ph: ML.rnd(i, 7) * 6.28,
      x0: (ML.rnd(i, 8) - 0.5) * Bs * 2.4, d0: ML.rnd(i, 9) * 1.1, sway: (ML.rnd(i, 10) - 0.5) * Bs * 0.25, star: ML.rnd(i, 11) < 0.3,
    }));

    // times
    const drawA = at, fillA = at + 0.45, tu = at + 1.0, txA = tu + 0.2;
    const leaveA = Math.max(txA + 0.6, end - 0.35);
    ctx.sfx(fillA, "whoosh.soft", 0.25);
    ctx.sfx(tu, "success", 0.5);
    ctx.sfx(txA + 0.05, "pop.soft", 0.22);
    const drag = 2.2, grav = 160 * k * 1.6;

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.3);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end, end + 0.2))).toFixed(4);
        if (own && (!big || !back)) own.style.opacity = t >= at ? "0" : "";
        // outline, fill, swell
        outline.setAttribute("stroke-dashoffset", (1 - ML.ease(t, drawA, drawA + 0.5)).toFixed(4));
        empty.setAttribute("opacity", ML.lin(t, drawA, drawA + 0.3).toFixed(4));
        const fu = ML.ease(t, fillA, fillA + 0.5);
        rv.setAttribute("y", (100 - 200 * fu).toFixed(2)); rv.setAttribute("height", (200 * fu).toFixed(2));
        const sw = t < tu ? 0 : Math.sin(Math.PI * ML.lin(t, tu, tu + 0.4));
        svg.style.transform = `scale(${((1 + (K - 1) * sw) / K).toFixed(4)})`;
        svg.style.filter = sw > 0.01 ? `drop-shadow(0 0 ${(Bs * 0.08 * sw).toFixed(2)}px color-mix(in srgb, var(--x-accent) 70%, transparent))` : "none";
        rings.forEach((r, i) => { const a = tu + i * 0.15, u = ML.out(t, a, a + 0.7), on = t >= a && t < a + 0.7; r.style.transform = `scale(${((0.8 + u) / 1.8).toFixed(4)})`; r.style.opacity = on ? (0.8 * (1 - u)).toFixed(4) : "0"; });
        // sparkles
        g.clearRect(0, 0, cv.width, cv.height);
        if (t >= tu - (p.particles === "rain" ? 0.1 : 0)) {
          for (const q of parts) {
            let x, y, tau, life = q.life;
            if (p.particles === "rain") {
              tau = t - (tu + q.d0); if (tau < 0 || tau > life) continue;
              x = cx + q.x0 + Math.sin(tau * 2 + q.ph) * q.sway; y = cy - Bs * 0.9 + tau * Bs * 0.9 + 0.5 * grav * 0.4 * tau * tau;
            } else {
              tau = t - tu; if (tau > life) continue;
              const s = (1 - Math.exp(-drag * tau)) / drag;
              x = cx + Math.cos(q.a) * (Bs * 0.3 + q.v * s); y = cy + Math.sin(q.a) * (Bs * 0.3 + q.v * s) + 0.5 * grav * tau * tau;
            }
            const o = (1 - tau / life) * (0.55 + 0.45 * Math.sin(tau * q.tw + q.ph)) * Math.min(1, tau * 12);
            if (o <= 0.01) continue;
            g.globalAlpha = o; g.fillStyle = q.col;
            if (q.star) { const r = q.r * 2.2; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }
            else { g.beginPath(); g.arc(x, y, q.r, 0, Math.PI * 2); g.fill(); }
          }
          g.globalAlpha = 1;
        }
        // eyebrow and title
        [eb, ti].forEach((e, i) => { const a = txA + i * 0.1, u = ML.out(t, a, a + 0.4); e.style.opacity = u.toFixed(4); e.style.transform = `translateY(${((1 - u) * Bs * 0.04).toFixed(2)}px)`; });
      },
    };
  },
});
