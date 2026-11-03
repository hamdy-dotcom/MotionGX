// Elements break out of the frame (MengTo/Skills illustration-framed-panel, panel-kit.mjs): the panel and its outline
// are drawn FIRST, the breakout parts AFTER so they sit on top of the border (the kit's draw order: panel fill, floor
// band, panel outline, then `front` — bubbles and cards that break out). Each part crosses the frame by 40–65 px
// (10–20 px reads as a mistake), placed on a loose diagonal: the first high on the leading side, the second mid-height
// on the far side, the rest low on the corners. Raised UI parts carry a darker copy 3 px below (the kit's `raised`),
// bubbles carry the kit's tail and inner corner tick, UI cards its round-capped text lines. Each part springs from just
// inside the frame out across the edge on back.out in 0.45 s, 0.12 s apart. Leading side follows the reading direction.
// Source: MengTo/Skills agent-skills/illustration/illustration-framed-panel/scripts/panel-kit.mjs (MIT): draw order,
// bubble geometry, raised(), textLine(), the floor band and dashes — ported to look variables and stage px.
ML.define({
  id: "element.frame-breakout",
  category: "element",
  name: "Elements break out of the frame",
  does: "Bubbles, UI cards or badges pop out across the edge of a framed panel, overlapping its border on purpose.",
  says: ["connection", "playful", "arrival", "proof"],
  energy: 3,
  targets: ["card", "label", "screen", "image"],
  duration: [1.2, 3],
  params: {
    count: { type: "number", range: [2, 4], default: 3 },
    overlap: { type: "number", range: [40, 65], default: 50, unit: "px" },
    element: { type: "choice", options: ["bubble", "ui-card", "badge"], default: "ui-card" },
    stagger: { type: "number", range: [0.1, 0.15], default: 0.12, unit: "s" },
    texts: { type: "text", default: "" },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "element.card-pile-drop"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "MengTo/Skills:agent-skills/illustration/illustration-framed-panel/scripts/panel-kit.mjs", license: "MIT", note: "draw order, bubble / raised / textLine parts ported to look variables" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const svg = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const k = Math.min(f.W, f.H) / 1080;
    // the target's own box only when a frame with parts around it fits there; a thin strip uses the picture region
    const big = ob && ob.w > f.W * 0.4 && ob.h > Math.max(f.H * 0.18, 420 * k);
    const R = big ? ob : f.pic;
    const ov = ML.clamp(p.overlap, 40, 65) * k;
    const n = Math.round(ML.clamp(p.count, 2, 4));
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);

    const back = p.backdrop ? mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer) : null;
    // the panel: inset so the breakouts keep inside the stage; a 4:3-ish frame centred in the region
    const padX = ov + 14 * k, padY = ov + 14 * k;
    const maxW = R.w - padX * 2, maxH = R.h - padY * 2;
    const isPic = own && own.tagName === "IMG";
    let PW = Math.min(maxW, maxH * 1.25), PH = Math.min(maxH, PW * 1.05);
    if (isPic && own.naturalWidth) { const c = Math.min(1, own.naturalWidth / PW, own.naturalHeight / PH); PW *= c; PH *= c; } // never past the picture's pixels
    const PX = (R.w - PW) / 2, PY = (R.h - PH) / 2;
    const lw = Math.max(1.5, 2.4 * k);
    const panel = mk("div", `position:absolute;left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px;overflow:hidden;background:color-mix(in srgb, var(--x-accent-2) 70%, var(--x-panel));`, layer);
    if (isPic) { const im = own.cloneNode(true); im.removeAttribute("data-slot"); im.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;"; panel.append(im); }
    else {
      // the kit's floor band, its line and short dashes; a soft sun on the back wall
      const floorY = PH * 0.78;
      mk("div", `position:absolute;left:${PW * 0.62}px;top:${PH * 0.14}px;width:${PW * 0.16}px;height:${PW * 0.16}px;border-radius:50%;background:color-mix(in srgb, var(--x-panel) 55%, transparent);`, panel);
      mk("div", `position:absolute;left:0;right:0;top:${floorY}px;bottom:0;background:color-mix(in srgb, var(--x-accent-2) 30%, var(--x-panel));border-top:${lw}px solid var(--x-ink);`, panel);
      for (let i = 0; i < 6; i++) mk("div", `position:absolute;left:${PW * (0.06 + i * 0.16 + ML.rnd(i, 4) * 0.04)}px;top:${floorY + PH * (0.07 + ML.rnd(i, 2) * 0.09)}px;width:${PW * (0.05 + ML.rnd(i, 5) * 0.04)}px;height:${lw}px;border-radius:${lw}px;background:color-mix(in srgb, var(--x-accent) 45%, transparent);`, panel);
      const txt = own ? (own.textContent || "").trim() : "";
      if (txt && !big) mk("div", `position:absolute;left:8%;right:8%;top:${PH * 0.36}px;text-align:center;font:var(--x-head-weight) ${Math.min(PW * 0.09, 64 * k)}px/1.15 var(--x-head-font);color:var(--x-ink);direction:${rtl ? "rtl" : "ltr"};`, panel, txt);
    }
    // the outline drawn on top of the panel fill, before the breakouts (stroke draws on)
    const ol = doc.createElementNS(NS, "svg");
    ol.setAttribute("viewBox", `0 0 ${PW} ${PH}`);
    ol.style.cssText = `position:absolute;left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px;overflow:visible;`;
    layer.append(ol);
    const rect = svg("rect", { x: 0, y: 0, width: PW, height: PH, fill: "none", stroke: "var(--x-ink)", "stroke-width": lw, pathLength: 1, "stroke-dasharray": "1 1" }, ol);

    // the breakouts: placement on a loose diagonal (leading side high, far side mid, low corners)
    const DEF = p.element === "badge"
      ? (rtl ? ["+٤٨٪", "جديد", "١٠٠٠+", "مضمون"] : ["+48%", "New", "1k+", "Verified"])
      : p.element === "bubble"
        ? (rtl ? ["حلو جدًا!", "خلصت ✓", "شغّال؟", "يلا بينا"] : ["Love it!", "Done ✓", "Ship it?", "On my way"])
        : (rtl ? ["تم الدفع", "رسالة جديدة", "تمت الموافقة", "مزامنة"] : ["Payment sent", "New message", "Approved", "Synced"]);
    const mine = String(p.texts || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    const label = (i) => mine[i] || DEF[i % DEF.length];
    const lead = rtl ? "right" : "left", far = rtl ? "left" : "right";
    const slots = [
      { side: lead, v: 0.2 },
      { side: far, v: 0.5 },
      { side: "bottom", u: rtl ? 0.78 : 0.22 },
      { side: "top", u: rtl ? 0.2 : 0.8 },
    ].slice(0, n);
    const fs = Math.min(Math.max(22 * k, PW * 0.048), 44 * k);
    const parts = slots.map((s, i) => {
      const g = mk("div", "position:absolute;left:0;top:0;", layer);
      let w, h;
      if (p.element === "badge") {
        // a raised round badge: darker copy 3 px below, then the face
        const d = Math.max(ov * 2.2, Math.min(PW * 0.24, 210 * k));
        w = h = d;
        mk("div", `position:absolute;left:0;top:${3 * k}px;width:${d}px;height:${d}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent) 70%, var(--x-device));`, g);
        const face = mk("div", `position:absolute;left:0;top:0;width:${d}px;height:${d}px;box-sizing:border-box;border-radius:50%;border:${lw}px solid var(--x-ink);background:var(--x-accent);display:flex;align-items:center;justify-content:center;font:var(--x-head-weight) ${d * 0.24}px/1 var(--x-head-font);color:var(--x-accent-ink);white-space:nowrap;`, g, label(i));
        face.style.letterSpacing = rtl ? "0" : "-0.01em";
        ML.fit(face, d * 0.8);
      } else if (p.element === "bubble") {
        // the kit's bubble: a rounded box with a tail and a short inner corner tick
        const t = mk("div", `position:absolute;white-space:nowrap;font:var(--x-head-weight) ${fs * 1.1}px/1 var(--x-head-font);visibility:hidden;`, g, label(i));
        const tw = t.offsetWidth; t.remove();
        w = Math.max(ov * 2.3, tw + fs * 1.6); h = fs * 2.6;
        const r = fs * 0.5, X2 = w, Y2 = h, tailRight = s.side === far ? !rtl : rtl;
        const a = tailRight ? w - fs * 1.1 : fs * 1.6;
        const d = `M${r} 0 H${X2 - r} Q${X2} 0 ${X2} ${r} V${Y2 - r} Q${X2} ${Y2} ${X2 - r} ${Y2} H${a} L${a + (tailRight ? 4 : -4) * k} ${Y2 + fs * 0.7} L${a + (tailRight ? -fs * 0.6 : fs * 0.6)} ${Y2} H${r} Q0 ${Y2} 0 ${Y2 - r} V${r} Q0 0 ${r} 0 Z`;
        const sv = doc.createElementNS(NS, "svg");
        sv.setAttribute("viewBox", `${-lw} ${-lw} ${w + lw * 2} ${h + fs * 0.7 + lw * 2}`);
        sv.style.cssText = `position:absolute;left:${-lw}px;top:${-lw}px;width:${w + lw * 2}px;height:${h + fs * 0.7 + lw * 2}px;overflow:visible;`;
        g.append(sv);
        svg("path", { d, fill: "var(--x-panel)", stroke: "var(--x-ink)", "stroke-width": lw, "stroke-linejoin": "round" }, sv);
        svg("path", { d: `M${fs * 0.42} ${fs * 0.36} Q${fs * 0.3} ${fs * 0.42} ${fs * 0.3} ${fs * 0.6}`, fill: "none", stroke: "var(--x-ink)", "stroke-width": lw * 0.75, "stroke-linecap": "round" }, sv);
        mk("div", `position:absolute;left:0;top:0;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;white-space:nowrap;font:var(--x-head-weight) ${fs * 1.1}px/1 var(--x-head-font);color:var(--x-ink);`, g, label(i));
      } else {
        // a UI card: avatar, two round-capped text lines, a raised pill (darker copy 3 px below)
        w = Math.max(ov * 3.2, Math.min(PW * (n > 3 ? 0.52 : 0.6), 480 * k)); h = w * 0.46;
        const card = mk("div", `position:absolute;left:0;top:0;width:${w}px;height:${h}px;box-sizing:border-box;border-radius:${Math.max(10, 18 * k)}px;background:var(--x-panel);border:${lw}px solid var(--x-ink);direction:${rtl ? "rtl" : "ltr"};`, g);
        const av = h * 0.34;
        mk("div", `position:absolute;${rtl ? "right" : "left"}:${h * 0.16}px;top:${h * 0.16}px;width:${av}px;height:${av}px;border-radius:50%;background:${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"};`, card);
        ML.fit(mk("div", `position:absolute;${rtl ? "right" : "left"}:${h * 0.16 + av + h * 0.12}px;top:${h * 0.16}px;white-space:nowrap;font:var(--x-head-weight) ${h * 0.19}px/1.1 var(--x-head-font);color:var(--x-ink);`, card, label(i)), w - h * 0.44 - av);
        mk("div", `position:absolute;${rtl ? "right" : "left"}:${h * 0.16 + av + h * 0.12}px;top:${h * 0.42}px;width:${w * 0.34}px;height:${Math.max(3, h * 0.05)}px;border-radius:9px;background:var(--x-line);`, card);
        const bw = w * 0.32, bh = h * 0.22;
        mk("div", `position:absolute;${rtl ? "left" : "right"}:${h * 0.16}px;bottom:${h * 0.14 - 3 * k}px;width:${bw}px;height:${bh}px;border-radius:999px;background:color-mix(in srgb, var(--x-accent) 65%, var(--x-device));`, card);
        mk("div", `position:absolute;${rtl ? "left" : "right"}:${h * 0.16}px;bottom:${h * 0.14}px;width:${bw}px;height:${bh}px;border-radius:999px;background:var(--x-accent);`, card);
        mk("div", `position:absolute;${rtl ? "right" : "left"}:${h * 0.16}px;bottom:${h * 0.2}px;width:${w * 0.36}px;height:${Math.max(3, h * 0.05)}px;border-radius:9px;background:var(--x-line);`, card);
        card.style.boxShadow = `0 ${3 * k}px 0 color-mix(in srgb, var(--x-ink) 85%, transparent)`;
      }
      // rest position: crosses its edge by `ov`; start: just inside the frame
      let x, y, dx = 0, dy = 0;
      if (s.side === "left") { x = PX - ov; y = PY + PH * s.v - h / 2; dx = ov + w * 0.25; }
      else if (s.side === "right") { x = PX + PW + ov - w; y = PY + PH * s.v - h / 2; dx = -(ov + w * 0.25); }
      else if (s.side === "bottom") { x = PX + PW * s.u - w / 2; y = PY + PH + ov - h; dy = -(ov + h * 0.25); }
      else { x = PX + PW * s.u - w / 2; y = PY - ov; dy = ov + h * 0.25; }
      x = ML.clamp(x, -R.x + 8 * k, f.W - R.x - w - 8 * k);
      g.style.left = x + "px"; g.style.top = y + "px"; g.style.width = w + "px"; g.style.height = h + "px";
      g.style.transformOrigin = s.side === "left" ? "100% 50%" : s.side === "right" ? "0% 50%" : s.side === "bottom" ? "50% 0%" : "50% 100%";
      return { g, dx, dy };
    });

    // times: outline first, then the breakouts
    const dur = Math.max(0.6, end - at);
    const tOut = at + Math.min(0.45, dur * 0.3);
    const st = ML.clamp(p.stagger, 0.1, 0.15);
    const t0 = parts.map((_, i) => tOut - 0.05 + i * st);
    const leaveA = Math.max(t0[t0.length - 1] + 0.6, end - 0.3);
    ctx.sfx(t0[0] + 0.12, "pop", 0.45);
    if (n > 2) ctx.sfx(t0[n - 1] + 0.12, "pop.soft", 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.28);
        layer.style.visibility = t < at - 0.1 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        const pa = ML.out(t, at, at + 0.25);
        panel.style.opacity = pa.toFixed(4);
        panel.style.translate = `0 ${((1 - pa) * 14 * k).toFixed(2)}px`;
        ol.style.translate = panel.style.translate;
        rect.setAttribute("stroke-dashoffset", (1 - ML.ease(t, at, tOut)).toFixed(4));
        parts.forEach(({ g, dx, dy }, i) => {
          const u = ML.back(t, t0[i], t0[i] + 0.45, 1.7);
          const o = ML.lin(t, t0[i], t0[i] + 0.12);
          g.style.opacity = o.toFixed(4);
          g.style.transform = `translate(${(dx * (1 - u)).toFixed(2)}px, ${(dy * (1 - u)).toFixed(2)}px) scale(${Math.min(1.04, 0.6 + 0.4 * u).toFixed(4)})`;
        });
      },
    };
  },
});
