// Before dims, after pops: the old way's card fades up (y 40 px, 0.4 s power2.out) and its crossed-out points fade in
// 0.25 s apart (y 14, 0.3 s); on the "after" word the before card dims (opacity 1 → `dim`, scale 1 → 0.97, 0.4 s)
// while the new way's card (3 px accent border) pops from scale 0.9 and y 40 on back.out(1.6) in 0.55 s, its ticked
// points popping `point_stagger` apart, each with a drop sound. A row on wide frames, a column on tall ones.
// The after card is laid out at its full size and only grows back to 1 (never above).
// Source: MotionGX's own studio engine, lib/studio-engine/assets/scenes.js S.compare (ported to a pure function of t).
ML.define({
  id: "element.before-after-dim-pop",
  category: "element",
  name: "Before dims, after pops",
  does: "The old way's card dims and steps back while the new way's card pops forward with its ticks.",
  says: ["before-after", "change", "relief"],
  energy: 3,
  targets: ["card", "list"],
  duration: [2, 5],
  params: {
    layout: { type: "choice", options: ["auto", "row", "column"], default: "auto" },
    dim: { type: "number", range: [0.4, 0.8], default: 0.6 },
    point_stagger: { type: "number", range: [0.15, 0.35], default: 0.22, unit: "s" },
    before_title: { type: "text", default: "" },
    after_title: { type: "text", default: "" },
    before_points: { type: "text", default: "" },
    after_points: { type: "text", default: "" },
    after_word: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word", "camera.push-in"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.compare", license: "own" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.textContent = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const ob = own ? ctx.box(own) : null;
    const R = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18 ? ob : f.pic;
    // the after points: from a list target's items when it has them, else the param, else a sample
    // (real items only: leaf children in a short list. A card's children are its logo, its number, its picture…)
    const kids = own ? [...own.children] : [];
    const items = kids.length >= 2 && kids.length <= 6 && kids.every((c) => !c.children.length && c.textContent.trim() && c.textContent.trim().length <= 60) ? kids.map((c) => c.textContent.trim()) : [];
    const listOf = (s) => String(s).split("|").map((x) => x.trim()).filter(Boolean);
    const bPts = p.before_points ? listOf(p.before_points) : rtl ? ["ورق كتير", "فوايد عالية", "أسابيع انتظار"] : ["Piles of paperwork", "High interest", "Weeks of waiting"];
    const aPts = p.after_points ? listOf(p.after_points) : items.length ? items : rtl ? ["من غير ورق", "صفر فوايد", "موافقة في دقيقة"] : ["No paperwork", "Zero interest", "Approved in a minute"];
    const titles = [p.before_title || (rtl ? "قبل" : "Before"), p.after_title || (rtl ? "بعد" : "After")];

    const column = p.layout === "column" || (p.layout === "auto" && R.h > R.w * 0.95);
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;display:flex;align-items:center;justify-content:center;`, host);
    // the backdrop sits beside the content (not inside what fades), so what it covers never ghosts through during the exit
    const back = mk("div", `position:absolute;left:${R.x - (R === f.pic ? 40 : 0)}px;top:${R.y}px;width:${R.w + (R === f.pic ? 80 : 0)}px;height:${R.h + (R === f.pic ? 70 : 0)}px;border-radius:var(--x-radius);background:var(--x-ground);pointer-events:none;z-index:6;`, host);
    host.insertBefore(back, layer);
    // the studio scene's sizes, a size larger side by side on a wide frame or when a tall frame has the room
    const u = (Math.min(f.W, f.H) / 1080) * (column ? (R.h > R.w ? 1.3 : 1) : 1.4);
    const gapC = 26 * u;
    const row = mk("div", `position:relative;display:flex;flex-direction:${column ? "column" : "row"};gap:${gapC}px;width:${column ? Math.min(R.w, 900 * u) : Math.min(R.w * 0.96, 1060 * u)}px;`, layer);
    const icon = (ok, s) => {
      const sv = doc.createElementNS(NS, "svg"); sv.setAttribute("viewBox", "0 0 24 24"); sv.style.cssText = `width:${s}px;height:${s}px;flex:none;display:block;`;
      if (ok) { const c = doc.createElementNS(NS, "circle"); c.setAttribute("cx", 12); c.setAttribute("cy", 12); c.setAttribute("r", 11); c.setAttribute("fill", "var(--x-good)"); sv.append(c); }
      const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", ok ? "M7 12.5l3.2 3.2L17 9" : "M6.5 6.5l11 11M17.5 6.5l-11 11"); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", ok ? "var(--x-panel)" : "var(--x-bad)"); pa.setAttribute("stroke-width", ok ? 2.6 : 2.8); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
      sv.append(pa); return sv;
    };
    const fsT = (column ? 46 : 40) * u, fsP = (column ? 36 : 32) * u;
    const cards = [bPts, aPts].map((pts, k) => {
      const c = mk("div", `flex:1;box-sizing:border-box;padding:${(column ? 34 : 30) * u}px ${(column ? 40 : 34) * u}px;border-radius:var(--x-radius);box-shadow:var(--x-shadow);background:${k ? "var(--x-panel)" : "var(--x-panel-2)"};border:${k ? `${3 * u}px solid var(--x-accent)` : "var(--x-edge) solid var(--x-edge-color)"};will-change:transform;`, row);
      mk("div", `font:var(--x-head-weight) ${fsT}px/1.15 var(--x-head-font);margin-bottom:${16 * u}px;color:${k ? "var(--x-accent)" : "var(--x-dim)"};`, c, titles[k]);
      const pe = pts.map((x) => {
        const r = mk("div", `display:flex;align-items:center;gap:${16 * u}px;padding:${9 * u}px 0;font:var(--x-body-weight) ${fsP}px/1.25 var(--x-body-font);will-change:transform;`, c);
        r.append(icon(k === 1, fsP * 1.15));
        mk("span", k ? "color:var(--x-ink);" : "color:var(--x-dim);text-decoration:line-through;text-decoration-color:var(--x-bad);text-decoration-thickness:0.06em;", r, x);
        return r;
      });
      return { c, pe };
    });
    // fit inside the region (laid out once; shrink the whole row, never enlarge)
    const k0 = Math.min(1, (R.h * 0.96) / row.offsetHeight, (R.w * 0.98) / row.offsetWidth);
    if (k0 < 1) row.style.scale = k0.toFixed(4);

    // times
    const st = ML.clamp(p.point_stagger, 0.15, 0.35);
    // the before points tighten when the after word comes early, so the pop lands on the voice
    const bA = at + 0.05, wordT = p.after_word ? ctx.word(p.after_word, 0) : 0;
    const bSt = wordT ? ML.clamp((wordT - at - 0.65) / Math.max(1, bPts.length - 1), 0.06, 0.25) : 0.25, bPt = (i) => at + 0.3 + i * bSt;
    const lastB = bPt(bPts.length - 1) + 0.35;
    const tA = Math.max(lastB, wordT);
    const aPt = (i) => tA + 0.3 + i * st;
    bPts.forEach((_, i) => ctx.sfx(bPt(i), "tap", 0.2));
    ctx.sfx(tA, "whoosh.soft", 0.3);
    aPts.forEach((_, i) => ctx.sfx(aPt(i), "pop", 0.32));
    const leaveA = Math.max(aPt(aPts.length - 1) + 0.6, end - 0.3);
    const p2out = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); };

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        back.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end, end + 0.2))).toFixed(4);
        if (own) own.style.opacity = t >= at ? "0" : "";
        // before
        const b = p2out(t, bA, bA + 0.4), dm = ML.ease(t, tA, tA + 0.4);
        cards[0].c.style.opacity = (b * (1 - (1 - p.dim) * dm)).toFixed(4);
        cards[0].c.style.transform = `translateY(${((1 - b) * 40 * u).toFixed(2)}px) scale(${(1 - 0.03 * dm).toFixed(4)})`;
        cards[0].pe.forEach((e, i) => { const v = p2out(t, bPt(i), bPt(i) + 0.3); e.style.opacity = v.toFixed(4); e.style.transform = `translateY(${((1 - v) * 14 * u).toFixed(2)}px)`; });
        // after
        const a = t < tA ? 0 : ML.back(t, tA, tA + 0.55, 1.6);
        cards[1].c.style.opacity = ML.lin(t, tA, tA + 0.2).toFixed(4);
        cards[1].c.style.transform = `translateY(${((1 - a) * 40 * u).toFixed(2)}px) scale(${Math.min(1, 0.9 + 0.1 * a).toFixed(4)})`;
        cards[1].pe.forEach((e, i) => { const s = aPt(i), v = t < s ? 0 : ML.back(t, s, s + 0.35, 1.8); e.style.opacity = ML.lin(t, s, s + 0.15).toFixed(4); e.style.transform = `translateY(${((1 - v) * 12 * u).toFixed(2)}px) scale(${Math.min(1, Math.max(0, 0.6 + 0.4 * v)).toFixed(4)})`; e.style.transformOrigin = rtl ? "100% 50%" : "0 50%"; });
      },
    };
  },
});
