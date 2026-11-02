// App icon reveal with an accent: the brand's mark sits on a rounded tile (radius 22 %) that arrives small and tilted
// — scale from_scale → 1, rotate −tilt → 0 (through about −6° mid-way), y +10 % → 0, opacity 0 → 1, blur 8 → 0 —
// on back.out(1.3) (or expo.out for the aura), framed by one accent: radar rings (1 px accent at 40 %, radius
// 0.55 → 2.4 tiles, opacity .5 → 0, 1.2 s sine.out, 0.25 s apart), a two-colour aura (2.5× the tile, blurred
// 40 px, opacity 0 → .8 and scale .6 → 1 over 0.8 s starting 0.15 s before the icon) or four-point sparkles that
// scale 0 → 1 → 0 in 0.5 s after it lands (optionally on a slow sunburst). The wordmark rises 0.5 s after the icon
// (below or beside it — beside on the left in Arabic). Exit: dims to 50 %, then fades.
// The tile is laid out at its full size and only ever scaled down (sharp); pictures are never blurred.
// Source: prompt-motion "deebeeeff-gave-this-image-to", "ezshine-opus-5-5-16-9-mp4", "gautam-mer1-i-asked-claude-opus"
// (reference only — rebuilt as our own code).
ML.define({
  id: "element.app-icon-reveal",
  category: "element",
  name: "App icon reveal with an accent",
  does: "The brand's app icon or logo tile scales up from small and tilted to upright, framed by an accent: radar rings, a soft colour aura or twinkling sparkles.",
  says: ["brand", "arrival", "celebration", "luxury"],
  energy: 3,
  targets: ["logo", "card", "image"],
  duration: [1, 2.5],
  params: {
    accent: { type: "choice", options: ["rings", "aura", "sparkles", "none"], default: "rings" },
    from_scale: { type: "number", range: [0.25, 0.8], default: 0.6 },
    tilt: { type: "number", range: [0, 25], default: 12, unit: "deg" },
    duration: { type: "number", range: [0.4, 0.9], default: 0.6, unit: "s" },
    rings: { type: "number", range: [0, 3], default: 2 },
    wordmark: { type: "choice", options: ["below", "right", "none"], default: "below" },
    name: { type: "text", default: "" },
    fill: { type: "choice", options: ["panel", "gradient"], default: "panel" },
    sunburst: { type: "bool", default: false },
    size: { type: "number", range: [0.12, 0.3], default: 0.2 },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "background.mesh-gradient", "transition.logo-through-dissolve"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:deebeeeff-gave-this-image-to", license: "reference", note: "also ezshine-opus-5-5-16-9-mp4, gautam-mer1-i-asked-claude-opus; technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    const big = own && ctx.box(own).w > f.W * 0.4 && ctx.box(own).h > f.H * 0.18;
    const R = big ? ctx.box(own) : f.pic;
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    const back = p.backdrop ? mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer) : null;

    // the tile and its mark
    const S = Math.min(Math.min(f.W, f.H) * ML.clamp(p.size, 0.12, 0.3), R.w * 0.5, R.h * 0.42);
    const name = p.name || (own && (own.getAttribute("aria-label") || own.textContent || "").trim()) || (rtl ? "علامتك" : "brand");
    const isPic = own && own.tagName === "IMG";
    const word = p.wordmark === "none" ? null : mk("div", `position:absolute;white-space:nowrap;font:var(--x-head-weight) ${S * 0.3}px/1.1 var(--x-head-font);letter-spacing:${rtl ? 0 : "-0.01em"};color:var(--x-ink);`, layer, name);
    const ww = word ? word.offsetWidth : 0, wh = word ? word.offsetHeight : 0;
    const gap = S * 0.22, side = p.wordmark === "right";
    const groupW = side ? S + gap + ww : Math.max(S, ww), groupH = side ? S : S + (word ? gap + wh : 0);
    const gx = (R.w - groupW) / 2, gy = (R.h - groupH) / 2;
    const tx = side ? (rtl ? gx + ww + gap : gx) : (R.w - S) / 2, ty = gy;
    const cx = tx + S / 2, cy = ty + S / 2;
    if (word) {
      if (side) { word.style.left = (rtl ? gx : gx + S + gap) + "px"; word.style.top = cy - wh / 2 + "px"; }
      else { word.style.left = (R.w - ww) / 2 + "px"; word.style.top = ty + S + gap + "px"; }
    }

    // accents behind the tile
    const acc = mk("div", `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0;`, layer);
    const aura = p.accent === "aura" ? mk("div", `position:absolute;left:${-S * 1.25}px;top:${-S * 1.25}px;width:${S * 2.5}px;height:${S * 2.5}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-accent) 80%, transparent), color-mix(in srgb, var(--x-accent-2) 55%, transparent) 55%, transparent);filter:blur(40px);`, acc) : null;
    const nR = p.accent === "rings" ? Math.round(ML.clamp(p.rings, 0, 3)) : 0;
    const rings = Array.from({ length: nR }, () => mk("div", `position:absolute;left:${-S * 2.4}px;top:${-S * 2.4}px;width:${S * 4.8}px;height:${S * 4.8}px;box-sizing:border-box;border-radius:50%;border:${Math.max(2, S / 70)}px solid color-mix(in srgb, var(--x-accent) 55%, transparent);`, acc));
    let burst = null;
    if (p.accent === "sparkles" && p.sunburst) {
      burst = doc.createElementNS(NS, "svg");
      burst.setAttribute("viewBox", "-100 -100 200 200");
      burst.style.cssText = `position:absolute;left:${-S * 1.6}px;top:${-S * 1.6}px;width:${S * 3.2}px;height:${S * 3.2}px;overflow:visible;`;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, b = a + Math.PI / 32; const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", `M0 0 L${Math.cos(a) * 100} ${Math.sin(a) * 100} L${Math.cos(b) * 100} ${Math.sin(b) * 100}Z`); pa.setAttribute("fill", "var(--x-accent)"); pa.setAttribute("opacity", "0.09"); burst.append(pa); }
      acc.append(burst);
    }
    const stars = p.accent === "sparkles" ? Array.from({ length: 6 }, (_, i) => {
      const s = doc.createElementNS(NS, "svg"), k = S * (0.16 + ML.rnd(i, 3) * 0.12);
      s.setAttribute("viewBox", "-10 -10 20 20");
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + (ML.rnd(i, 7) - 0.5) * 0.6, d = S * (0.82 + ML.rnd(i, 9) * 0.35);
      s.style.cssText = `position:absolute;left:${Math.cos(a) * d - k / 2}px;top:${Math.sin(a) * d - k / 2}px;width:${k}px;height:${k}px;overflow:visible;`;
      const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", "M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10Z"); pa.setAttribute("fill", i % 2 ? "var(--x-accent-2)" : "var(--x-accent)");
      s.append(pa); acc.append(s); return s;
    }) : [];

    const tile = mk("div", `position:absolute;left:${tx}px;top:${ty}px;width:${S}px;height:${S}px;box-sizing:border-box;border-radius:22%;overflow:hidden;display:flex;align-items:center;justify-content:center;${p.fill === "gradient" ? "background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));" : `background:var(--x-panel);border:${Math.max(2, S / 36)}px solid var(--x-accent);`}box-shadow:0 0 ${S * 0.3}px color-mix(in srgb, var(--x-accent) 35%, transparent), var(--x-shadow);`, layer);
    if (isPic) { const im = own.cloneNode(true); im.removeAttribute("data-slot"); im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;"; tile.append(im); }
    else if (own && own.tagName && own.tagName.toLowerCase() === "svg") { const sv = own.cloneNode(true); sv.removeAttribute("data-slot"); sv.removeAttribute("width"); sv.removeAttribute("height"); sv.style.cssText = "width:62%;height:62%;display:block;overflow:visible;"; tile.append(sv);
      // the mark only: the logo's own lettering becomes the wordmark, the viewBox shrinks to what is left
      sv.querySelectorAll("text").forEach((x) => x.remove());
      try { const b = sv.getBBox(); if (b.width > 0 && b.height > 0) { const m = Math.max(b.width, b.height), pad = m * 0.04; sv.setAttribute("viewBox", `${b.x + b.width / 2 - m / 2 - pad} ${b.y + b.height / 2 - m / 2 - pad} ${m + pad * 2} ${m + pad * 2}`); } } catch (e) { /* not laid out: keep its viewBox */ } }
    else mk("div", `font:var(--x-head-weight) ${S * 0.5}px/1 var(--x-head-font);color:${p.fill === "gradient" ? "var(--x-accent-ink)" : "var(--x-accent)"};`, tile, Array.from(name)[0] || "•");

    // times
    const aura0 = at, t0 = aura ? at + 0.15 : at, dur = ML.clamp(p.duration, 0.4, 0.9), landT = t0 + dur * 0.72;
    const w0 = t0 + 0.5, dimA = Math.max(landT + 0.4, end - 0.6), goA = Math.max(dimA + 0.2, end - 0.3);
    const sign = rtl ? 1 : -1; // the tilt leans against the reading direction
    ctx.sfx(landT, "pop", 0.45);
    if (nR) ctx.sfx(landT + 0.05, "whoosh.soft", 0.18);
    if (stars.length) ctx.sfx(landT + 0.1, "blip", 0.22);
    if (word) ctx.sfx(w0 + 0.1, "tap", 0.2);
    const sineOut = (t, a, b) => Math.sin((ML.lin(t, a, b) * Math.PI) / 2);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28), dim = 1 - 0.5 * ML.ease(t, dimA, dimA + 0.2);
        layer.style.opacity = (dim * (1 - leave)).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        if (own && !big && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        // the tile
        const u = aura ? ML.expo(t, t0, t0 + dur) : ML.back(t, t0, t0 + dur, 1.3);
        const o = ML.lin(t, t0, t0 + dur * 0.45);
        const sc = p.from_scale + (1 - p.from_scale) * u;
        const rot = sign * p.tilt * (1 - ML.out(t, t0, t0 + dur * 1.05));
        tile.style.opacity = o.toFixed(4);
        tile.style.transform = `translateY(${((1 - ML.out(t, t0, t0 + dur)) * S * 0.1).toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${Math.min(sc, 1.06).toFixed(4)})`;
        const bl = isPic ? 0 : (1 - ML.out(t, t0, t0 + dur * 0.8)) * 8;
        tile.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        // accents
        if (aura) { const a = ML.ease(t, aura0, aura0 + 0.8); aura.style.opacity = (a * 0.8).toFixed(4); aura.style.transform = `scale(${(0.6 + 0.4 * a).toFixed(4)})`; }
        rings.forEach((r, i) => { const a = landT + i * 0.25, k = sineOut(t, a, a + 1.2), on = t >= a && t < a + 1.2; const rad = 0.55 + (2.4 - 0.55) * k; r.style.transform = `scale(${(rad / 2.4).toFixed(4)})`; r.style.opacity = on ? (0.8 * (1 - k)).toFixed(4) : "0"; });
        if (burst) { burst.style.opacity = ML.ease(t, landT - 0.2, landT + 0.4).toFixed(4); burst.style.transform = `rotate(${((t - at) * 8).toFixed(2)}deg)`; }
        stars.forEach((s, i) => { const a = landT + i * 0.08, k = ML.lin(t, a, a + 0.5); const sc2 = Math.sin(k * Math.PI); s.style.transform = `scale(${sc2.toFixed(4)}) rotate(${(k * 45).toFixed(1)}deg)`; s.style.opacity = k > 0 && k < 1 ? "1" : "0"; });
        // wordmark
        if (word) { const w = ML.out(t, w0, w0 + 0.4); word.style.opacity = w.toFixed(4); word.style.translate = `0 ${((1 - w) * S * 0.12).toFixed(2)}px`; }
      },
    };
  },
});
