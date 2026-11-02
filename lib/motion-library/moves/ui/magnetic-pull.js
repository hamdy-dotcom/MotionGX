// Magnetic button pull. A scripted pointer arcs toward a CTA pill; inside an enlarged hit area (1.6×) the button
// leans toward it — offset = (pointer − centre) × strength, followed the way GSAP quickTo follows (0.45 s power3.out
// retargeted every frame; here integrated from the move's start on every draw, so it stays a pure function of t) —
// and its label leans less (label_ratio of the button's offset: a small parallax). Hover lifts the pill ≤ 1.03 (none
// under tilt: the card variant tilts rotateX / rotateY ≤ 4°, never scaled above 1 in 3D). The pointer holds, clicks
// (scale .96 → 1) and leaves; the button returns to rest in 0.6 s on elastic.out(1, .5) or power3.out. CTA pill: 1 px
// edge ink / .25, full radius, mono uppercase tracked .3em, all from the look.
// Source: MengTo/Skills web-design/cinematic-gsap-lenis-motion-system SKILL.md initMagnetic + hover recipes (MIT);
// editorial-portfolio-chapters ARTICLE.md (MIT).
ML.define({
  id: "ui.magnetic-pull",
  category: "ui",
  name: "Magnetic button pull",
  does: "As the cursor nears, the button (and less so its label) leans toward it, then springs back when it leaves or after the click.",
  says: ["focus", "arrival", "playful", "luxury"],
  energy: 2,
  targets: ["card", "cursor", "label"],
  duration: [0.8, 2.5],
  params: {
    strength: { type: "number", range: [0.1, 0.5], default: 0.3 },
    label_ratio: { type: "number", range: [0, 0.6], default: 0.5 },
    tilt: { type: "number", range: [0, 4], default: 0, unit: "deg" },
    return: { type: "choice", options: ["elastic", "power3"], default: "elastic" },
    click: { type: "bool", default: true },
    label: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "ui.button-fill"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/cinematic-gsap-lenis-motion-system", license: "MIT", note: "initMagnetic (quickTo x/y 0.45 s power3.out, strength × pointer offset) and the hover recipes; editorial-portfolio-chapters CTA" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, k = Math.min(f.W, f.H) / 1080, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const strength = ML.clamp(p.strength, 0.1, 0.5), ratio = ML.clamp(p.label_ratio, 0, 0.6), tilt = ML.clamp(p.tilt, 0, 4);

    // the button: the target's own words, the param, or a sample
    const own = el ? (el.textContent || "").trim().split(/\s+/).slice(0, 4).join(" ") : "";
    const text = String(p.label || "").trim() || own || (rtl ? "ابدأ الآن" : "Get started");
    const R = f.pic;
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:6;pointer-events:none;${tilt > 0 ? `perspective:${px(900)};` : ""}`, ctx.scene || ctx.stage);
    host.dir = rtl ? "rtl" : "ltr";
    // it stands where its target stood (the target's words are now on it), else in the middle of the region
    const tb = el ? ctx.box(el) : null, onEl = tb && tb.w > 0 && tb.h > 0;
    let cx = onEl ? tb.x + tb.w / 2 - R.x : R.w / 2, cy = onEl ? tb.y + tb.h / 2 - R.y : R.h / 2;
    if (el) el.style.visibility = "hidden";
    const btn = mk("div", `position:absolute;left:${cx}px;top:${cy}px;display:flex;align-items:center;justify-content:center;gap:${px(18)};min-width:${px(440)};height:${px(116)};box-sizing:border-box;padding:0 ${px(52)};border-radius:var(--x-radius-s);border:var(--x-edge) solid color-mix(in srgb, var(--x-ink) 25%, transparent);background:var(--x-panel);box-shadow:var(--x-shadow);color:var(--x-ink);${tilt > 0 ? "transform-style:preserve-3d;" : ""}`, host);
    const lab = mk("div", `display:flex;align-items:center;gap:${px(16)};white-space:nowrap;font:var(--x-label-weight) ${px(28)} ${rtl ? "var(--x-body-font)" : "var(--x-mono-font)"};letter-spacing:${rtl ? "0" : "0.3em"};text-transform:${rtl ? "none" : "uppercase"};`, btn);
    mk("span", "", lab, text);
    const arrow = doc.createElementNS(NS, "svg"); arrow.setAttribute("viewBox", "0 0 24 24"); arrow.setAttribute("width", (30 * k).toFixed(1)); arrow.setAttribute("height", (30 * k).toFixed(1));
    arrow.style.transform = rtl ? "scaleX(-1)" : "none";
    const ap = doc.createElementNS(NS, "path"); ap.setAttribute("d", "M4 12h15M13 6l6 6-6 6"); ap.setAttribute("fill", "none"); ap.setAttribute("stroke", "var(--x-accent)"); ap.setAttribute("stroke-width", "2.2"); ap.setAttribute("stroke-linecap", "round"); ap.setAttribute("stroke-linejoin", "round");
    arrow.append(ap); lab.append(arrow);
    const BW = btn.offsetWidth, BH = btn.offsetHeight;
    cx = ML.clamp(cx, BW / 2 + 24 * k - R.x, f.W - BW / 2 - 24 * k - R.x); cy = ML.clamp(cy, BH / 2 + 24 * k - R.y, f.H - BH / 2 - 24 * k - R.y);
    btn.style.left = cx.toFixed(1) + "px"; btn.style.top = cy.toFixed(1) + "px";
    // the hit area: 1.6× the button
    const hitW = BW * 0.8, hitH = BH * 0.8 + 40 * k;

    // the pointer
    const cur = mk("div", "position:absolute;left:0;top:0;z-index:3;", host);
    const cs = 60 * k;
    const svg = doc.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", cs.toFixed(1)); svg.setAttribute("height", cs.toFixed(1));
    svg.style.cssText = `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-3 / 24 * cs).toFixed(1)}px;overflow:visible;transform-origin:20% 12%;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
    const cp = doc.createElementNS(NS, "path"); cp.setAttribute("d", "M5 3l14 8-6.2 1.6L10 19z"); cp.setAttribute("fill", "var(--x-pointer)"); cp.setAttribute("stroke", "var(--x-pointer-edge)"); cp.setAttribute("stroke-width", "1.6"); cp.setAttribute("stroke-linejoin", "round");
    svg.append(cp); cur.append(svg);

    // the script: enter from below on the reading side, arc near, pull to an off-centre point, hold, click, leave
    const span = ML.clamp(end - at - 0.3, 0.7, 2.6); // a long scene does not slow the pointer down: it finishes and the button rests
    const sd = rtl ? -1 : 1; // the side the pointer comes from
    const T = (u) => at + span * u;
    const tClick = T(0.55), tLeave = T(0.78);
    const stops = [
      { t: T(0), x: cx + sd * BW * 0.95, y: cy + BH * 2.6 },
      { t: T(0.22), x: cx + sd * BW * 0.55, y: cy + BH * 0.9 },
      { t: T(0.4), x: cx + sd * BW * 0.3, y: cy + BH * 0.34 },
      { t: tClick, x: cx + sd * BW * 0.25, y: cy + BH * 0.3 }, // off-centre enough for the lean to read, clear of the label
      { t: T(0.68), x: cx + sd * BW * 0.26, y: cy + BH * 0.31 },
      { t: T(1), x: cx - sd * BW * 1.1, y: cy - BH * 2.2 },
    ];
    const hold = [tClick, T(0.68)];
    const ptr = (t) => ML.pathAt(stops, t, hold);
    if (p.click) ctx.sfx(tClick, "click", 0.45);
    // quickTo, made pure: a first-order follow of the pull target, integrated from the start each draw
    const tau = 0.45 / 4.6; // power3.out over 0.45 s ≈ an exponential with this time constant
    const inside = (q) => Math.abs(q.x - cx) < hitW && Math.abs(q.y - cy) < hitH;
    const DT = 1 / 120;
    function follow(t) {
      let x = 0, y = 0, out = -1;
      const stop = Math.min(t, tLeave);
      for (let s = at; s < stop; s += DT) {
        const q = ptr(s), on = inside(q);
        const gx = on ? (q.x - cx) * strength : 0, gy = on ? (q.y - cy) * strength : 0;
        const a = 1 - Math.exp(-DT / tau);
        x += (gx - x) * a; y += (gy - y) * a;
      }
      if (t > tLeave) out = t - tLeave;
      return { x, y, out };
    }
    const elastic = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin(((x - 0.125) * 2 * Math.PI) / 0.5) + 1);
    const power3 = (x) => 1 - Math.pow(1 - ML.clamp(x), 3);
    const ret = p.return === "power3" ? power3 : elastic;
    const reach = Math.max(BW, BH) * strength;

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const inA = ML.out(t, at, at + 0.3);
        btn.style.opacity = (inA * (1 - leave)).toFixed(4);
        const fo = follow(t);
        let ox = fo.x, oy = fo.y;
        if (fo.out >= 0) { const r = 1 - ret(fo.out / 0.6); ox *= r; oy *= r; }
        const near = ML.clamp(Math.hypot(ox, oy) / (reach * 0.25));
        const press = p.click && t >= tClick - 0.02 && t < tClick + 0.2 ? 0.96 + 0.04 * ML.out(t, tClick + 0.06, tClick + 0.2) : 1;
        const lift = tilt > 0 ? 1 : 1 + 0.03 * near;
        const sc = Math.min(1.03, lift * press);
        const rx = tilt > 0 ? -ML.clamp(oy / (reach || 1), -1, 1) * tilt : 0, ry = tilt > 0 ? ML.clamp(ox / (reach || 1), -1, 1) * tilt : 0;
        btn.style.transform = `translate(${(-BW / 2 + ox).toFixed(2)}px, ${(-BH / 2 + oy).toFixed(2)}px)${tilt > 0 ? ` rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)` : ""} scale(${(tilt > 0 ? Math.min(1, sc) : sc).toFixed(4)})`;
        btn.style.borderColor = `color-mix(in srgb, var(--x-ink) ${(25 + 35 * near).toFixed(1)}%, transparent)`;
        // label: leans less than the button (parallax)
        lab.style.translate = `${(ox * (ratio - 1)).toFixed(2)}px ${(oy * (ratio - 1)).toFixed(2)}px`;
        arrow.style.translate = `${(sd * 6 * k * near).toFixed(2)}px 0`;
        const q = ptr(t);
        cur.style.translate = `${q.x.toFixed(2)}px ${q.y.toFixed(2)}px`;
        cur.style.opacity = (ML.lin(t, at, at + 0.2) * (1 - ML.lin(t, end - 0.35, end - 0.15))).toFixed(4);
        svg.style.scale = press === 1 ? "none" : (0.88 + 0.12 * ML.out(t, tClick + 0.04, tClick + 0.2)).toFixed(4);
      },
    };
  },
});
