// Hanging sign drops in on wires: a rounded sign with a dashed inner border (stitches) hangs from the top of the frame
// on two thin wires (small rings at both ends). It drops from above — y −120 % → 0 in 0.6 s on back.out(1.3) — and,
// with swing on, settles as a damped pendulum about the wire anchors (±3°, two swings, decaying over 0.8 s). Then its
// text fades in line by line, 0.4 s each, 0.4 s apart. The words come from the target (the headline's own words,
// balanced over 1–3 lines; Arabic words stay whole); the target itself hides while the sign carries them.
// Source: prompt-motion "x4b47x-opus-5-5-one-shot" (reference only — rebuilt as our own code).
ML.define({
  id: "element.hanging-sign-drop",
  category: "element",
  name: "Hanging sign drops in on wires",
  does: "A sign drops from the top on two wires and settles with a small swing, then its text fades in line by line.",
  says: ["story", "arrival", "playful"],
  energy: 2,
  targets: ["headline", "card", "label"],
  duration: [1.2, 2.5],
  params: {
    swing: { type: "bool", default: true },
    lines: { type: "number", range: [1, 3], default: 2 },
    angle: { type: "number", range: [1, 6], default: 3, unit: "deg" },
    text: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "background.paper-grain"],
  avoid: ["urgency", "tech"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:x4b47x-opus-5-5-one-shot", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const ob = own ? ctx.box(own) : null;
    const raw = (p.text || (own ? own.textContent : "") || (rtl ? "أهلًا بيك عندنا" : "Open for business")).replace(/\s+/g, " ").trim();
    const words = raw.split(" ");
    const nl = Math.max(1, Math.min(Math.round(ML.clamp(p.lines, 1, 3)), words.length));
    // balance the words over the lines by length
    const total = raw.length, lines = [];
    let cur = [], acc = 0;
    words.forEach((w, i) => {
      cur.push(w); acc += w.length + 1;
      const left = words.length - i - 1, need = nl - lines.length - 1;
      if (lines.length < nl - 1 && (acc >= ((lines.length + 1) * total) / nl || left === need) && left >= need && left > 0) { lines.push(cur.join(" ")); cur = []; }
    });
    if (cur.length) lines.push(cur.join(" "));

    // the sign: where the target sits (centred on its text), else the top of the safe area
    const isHead = own && (own.classList.contains("ml-title") || (ob && ob.h > 60 * k));
    const maxW = f.safe.w * 0.92;
    const fs0 = own ? parseFloat(getComputedStyle(own).fontSize) : 96 * k;
    const layer = mk("div", "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;", host);
    const rig = mk("div", "position:absolute;left:0;top:0;", layer);
    const sign = mk("div", `position:absolute;box-sizing:border-box;border-radius:min(var(--x-radius), ${Math.round(28 * k)}px);background:var(--x-panel);box-shadow:var(--x-shadow);direction:${rtl ? "rtl" : "ltr"};text-align:center;`, rig);
    const pad = Math.max(18, 30 * k);
    const stitch = mk("div", `position:absolute;inset:${pad * 0.45}px;border-radius:min(calc(var(--x-radius) - ${pad * 0.3}px), ${Math.round(20 * k)}px);border:${Math.max(2, 3 * k)}px dashed color-mix(in srgb, var(--x-ink) 26%, transparent);`, sign);
    const body = mk("div", `position:relative;padding:${pad * 1.25}px ${pad * 1.6}px;display:flex;flex-direction:column;gap:${pad * 0.25}px;`, sign);
    // (sizes kept here: a font shorthand holding var() leaves style.fontSize empty)
    const sizes = lines.map((_, i) => (i === 0 || isHead ? fs0 : fs0 * 0.62));
    const lineEls = lines.map((l, i) => mk("div", `white-space:nowrap;font:var(--x-head-weight) ${sizes[i]}px/1.12 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:${i === 0 ? "var(--x-ink)" : "var(--x-dim)"};`, body, l));
    // fit: shrink the type until the sign fits the safe width and a share of the height
    const fitTo = (w, h) => {
      const sw = sign.offsetWidth, sh = sign.offsetHeight, px = pad * 3.2, py = pad * 2.5;
      const s = Math.min(1, (w - px) / Math.max(1, sw - px), (h - py) / Math.max(1, sh - py));
      if (s < 1) lineEls.forEach((e, i) => { sizes[i] *= s; e.style.fontSize = sizes[i] + "px"; });
    };
    // a headline's sign covers the whole headline band (so nothing half-peeks from behind it)
    const inHead = isHead && own.closest && own.closest(".ml-head");
    const maxH = inHead ? Math.max(f.head.h * 1.2, 160 * k) : f.H * (f.tall ? 0.3 : 0.42);
    if (inHead) {
      // wide enough to cover every line of the headline band (title and sub), so none half-peeks out
      const tw = Math.max(...[...own.closest(".ml-head").children].map((c) => { const r = doc.createRange(); r.selectNodeContents(c); return ctx.box(r).w; }));
      sign.style.minWidth = Math.min(maxW, tw + pad * 1.2) + "px";
    }
    for (let i = 0; i < 4; i++) fitTo(maxW, maxH);
    const SW = sign.offsetWidth, SH = sign.offsetHeight;
    const hb = inHead ? ctx.box(own.closest(".ml-head")) : ob;
    const cx = hb ? hb.x + hb.w / 2 : f.W / 2;
    const top = hb ? ML.clamp(hb.y + hb.h / 2 - SH / 2, f.safe.y * 0.5 + 40 * k, f.H - SH - 40 * k) : f.safe.y + 40 * k;
    const sx = ML.clamp(cx - SW / 2, 16 * k, f.W - SW - 16 * k);
    sign.style.left = sx + "px"; sign.style.top = top + "px";
    // wires from the top edge to two rings on the sign's top (20 % / 80 %)
    const lw = Math.max(1.5, 2 * k), ring = Math.max(8, 12 * k);
    const ax = [sx + SW * 0.2, sx + SW * 0.8];
    const anchorY = 0;
    ax.forEach((x) => {
      mk("div", `position:absolute;left:${x - lw / 2}px;top:${anchorY - 4}px;width:${lw}px;height:${top - anchorY + 4 + ring * 0.3}px;background:color-mix(in srgb, var(--x-ink) 70%, transparent);`, rig);
      mk("div", `position:absolute;left:${x - ring / 2}px;top:${top - ring * 0.2}px;width:${ring}px;height:${ring}px;box-sizing:border-box;border-radius:50%;border:${lw}px solid var(--x-ink);background:var(--x-panel);`, rig);
    });
    rig.style.transformOrigin = `${sx + SW / 2}px ${anchorY}px`;
    rig.append(sign); // the rings sit on top of the sign's edge
    for (const e of [...rig.children]) if (e !== sign && e.style.borderRadius === "50%") rig.append(e);

    // times
    const drop = 0.6, tL = at + drop * 0.62; // back.out passes 1 at about 62 %
    const amp = ML.clamp(p.angle, 1, 6);
    const tText = at + drop + (p.swing ? 0.25 : 0.1);
    const leaveA = Math.max(tText + lines.length * 0.4 + 0.4, end - 0.3);
    const dist = (top + SH) * 1.2; // −120 % of the sign plus its wires: fully above the frame
    ctx.sfx(tL, "land.light", 0.45);
    if (p.swing) ctx.sfx(at + 0.05, "whoosh.soft", 0.15);
    lines.forEach((_, i) => { if (i) ctx.sfx(tText + i * 0.4, "tap", 0.12); });

    return {
      draw(t) {
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        const leave = ML.clamp((t - leaveA) / 0.28);
        layer.style.visibility = t < at - 0.05 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        const u = ML.back(t, at, at + drop, 1.3);
        const y = -dist * (1 - u) - leave * 30 * k;
        // damped pendulum after the landing: ±amp, two swings, 0.8 s decay
        let rot = 0;
        if (p.swing && t > tL) { const s = t - tL; rot = amp * Math.exp(-s / 0.4) * Math.sin((s / 0.5) * Math.PI * 2) * (rtl ? -1 : 1); }
        rig.style.transform = `translateY(${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
        lineEls.forEach((e, i) => { const a = tText + i * 0.4, c = ML.out(t, a, a + 0.4); e.style.opacity = c.toFixed(4); e.style.translate = `0 ${((1 - c) * 8 * k).toFixed(2)}px`; });
      },
    };
  },
});
