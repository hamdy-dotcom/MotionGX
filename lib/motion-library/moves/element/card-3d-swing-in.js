// Paper card swings in from a 3D tilt: a large paper card (~73 % of a wide frame, 1400 × 800 of 1920; ~88 % of a tall
// one) starts steeply tilted — perspective 1400 px, rotateX(tilt) rotateZ(−8°), y +500 px, blur 10 px — and lands flat
// in 0.7 s expo.out, the blur fading as it slows and its shadow growing as it settles. "side": x +60 % → 0, rotateY
// −25° → 0, rotateX 15° → 0, rotateZ 6° → settle (power3-like expo), mirrored in Arabic. Then the contents build: the
// name types in (Latin) or blurs in (Arabic: its letters join), the rows stagger in, the code strip draws. Nothing
// scales above 1 in 3D; pictures never blur.
// Source: prompt-motion "web3wesley-this-took-opus-5-5", "aistocksavvy-wow-made-this-motion",
// "thismacapital-la-video-a-ete" (reference only — rebuilt as our own code).
ML.define({
  id: "element.card-3d-swing-in",
  category: "element",
  name: "Paper card swings in from a 3D tilt",
  does: "A large card swings in from a steep perspective tilt with motion blur and lands flat in frame, then its contents build.",
  says: ["arrival", "story", "trust"],
  energy: 3,
  targets: ["card", "screen", "image"],
  duration: [0.8, 2],
  params: {
    from: { type: "choice", options: ["bottom", "side"], default: "bottom" },
    tilt: { type: "number", range: [30, 75], default: 60, unit: "deg" },
    duration: { type: "number", range: [0.5, 1], default: 0.7, unit: "s" },
    settle_tilt: { type: "number", range: [-8, 8], default: 0, unit: "deg" },
  },
  pairs: ["element.blur-rise", "camera.slow-push", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:aistocksavvy-wow-made-this-motion", license: "reference", note: "also web3wesley-this-took-opus-5-5 and thismacapital-la-video-a-ete; rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const dir = rtl ? -1 : 1;

    // the card: the target, or a built paper card (name, rows, a code strip)
    let card, name = null, nameText = "", rows = [], bars = null, layer = null, back = null, isPic = false;
    if (own) {
      card = own;
      isPic = own.tagName === "IMG" || !!own.querySelector?.("img");
    } else {
      const cw = Math.min(f.W * (f.wide ? 0.73 : 0.88), f.pic.w * 1.0), ch = Math.min(cw * (f.wide ? 800 / 1400 : 0.72), f.pic.h * 0.96);
      const s = Math.min(cw / 1000, ch / 610); // type scale from the card itself: all of it fits, the code strip included
      const cx0 = Math.max(0, f.pic.x - 48 * k), cy0 = f.pic.y, cw0 = Math.min(f.W - cx0, f.pic.w + 96 * k), ch0 = Math.min(f.H - cy0, f.pic.h + 72 * k);
    back = mk("div", `position:absolute;left:${cx0}px;top:${cy0}px;width:${cw0}px;height:${ch0}px;background:var(--x-ground);background-image:var(--x-ground-image);background-size:${f.W}px ${f.H}px;background-position:${-cx0}px ${-cy0}px;pointer-events:none;z-index:5;opacity:0;`, host); // clears the region the built piece takes, shadows included
      layer = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - cw) / 2}px;top:${f.pic.y + (f.pic.h - ch) / 2}px;width:${cw}px;height:${ch}px;pointer-events:none;z-index:6;`, host);
      card = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${56 * s}px ${64 * s}px;display:flex;flex-direction:column;gap:${26 * s}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);overflow:hidden;`, layer);
      const T = rtl
        ? { label: "بطاقة العضوية", name: "سارة محمود", rows: [["رقم العضوية", "٠٤٨٢ ١٩٧٣"], ["الخطة", "سنوية"], ["صالحة لحد", "١٢ / ٢٨"]] }
        : { label: "Member card", name: "Sarah Mahmoud", rows: [["Member no.", "0482 1973"], ["Plan", "Yearly"], ["Valid until", "12 / 28"]] };
      const top = mk("div", `display:flex;align-items:center;gap:${18 * s}px;`, card);
      mk("div", `width:${44 * s}px;height:${44 * s}px;border-radius:30%;background:var(--x-accent);`, top);
      mk("div", `font:var(--x-label-weight) ${26 * s}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);`, top, T.label);
      nameText = T.name;
      name = mk("div", `font:var(--x-head-weight) ${88 * s}px/1.1 var(--x-head-font);letter-spacing:var(--x-head-track);color:var(--x-ink);min-height:1.1em;white-space:nowrap;`, card, T.name);
      const grid = mk("div", `display:flex;flex-direction:column;gap:${14 * s}px;margin-top:auto;`, card);
      rows = T.rows.map(([a, b]) => {
        const r = mk("div", `display:flex;justify-content:space-between;align-items:baseline;padding-top:${14 * s}px;border-top:var(--x-edge) solid var(--x-line);`, grid);
        mk("span", `font:var(--x-body-weight) ${32 * s}px var(--x-body-font);color:var(--x-dim);`, r, a);
        mk("span", `font:var(--x-label-weight) ${34 * s}px var(--x-mono-font);color:var(--x-ink);direction:ltr;unicode-bidi:isolate;`, r, b);
        return r;
      });
      bars = mk("div", `display:flex;gap:${5 * s}px;height:${54 * s}px;align-items:stretch;`, card);
      for (let i = 0; i < 46; i++) mk("span", `flex:${1 + Math.floor(ML.rnd(i, 3) * 3)};background:var(--x-ink);opacity:${ML.rnd(i, 5) < 0.3 ? 0 : 0.85};`, bars);
    }
    card.style.transformOrigin = p.from === "bottom" ? "50% 100%" : `${rtl ? 0 : 100}% 50%`;
    card.style.backfaceVisibility = "hidden";

    const D = p.duration, landAt = at + D;
    ctx.sfx(at, "whoosh.soft", 0.4);
    ctx.sfx(landAt - 0.05, "land.light", 0.35);
    const typeA = landAt + 0.05, typeB = typeA + Math.min(0.6, 0.04 * Array.from(nameText).length);
    const rowT = rows.map((_, i) => typeB - 0.1 + i * 0.09);
    const barT = (rowT[rowT.length - 1] || typeB) + 0.12;
    const goA = Math.max(barT + 0.6, end - 0.25);

    return {
      draw(t) {
        if (layer) layer.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const e = ML.expo(t, at, at + D), r = 1 - e;
        const leave = ML.clamp((t - goA) / 0.22);
        let tf;
        if (p.from === "side") {
          const W = f.W * 0.6;
          tf = `perspective(1400px) translate3d(${(dir * W * r).toFixed(2)}px, ${(40 * k * r).toFixed(2)}px, 0) rotateY(${(-dir * 25 * (p.tilt / 60) * r).toFixed(3)}deg) rotateX(${(15 * r).toFixed(3)}deg) rotateZ(${(dir * 6 * r + p.settle_tilt * e).toFixed(3)}deg)`;
        } else {
          tf = `perspective(1400px) translate3d(0, ${(500 * k * r).toFixed(2)}px, 0) rotateX(${(p.tilt * r).toFixed(3)}deg) rotateZ(${(-8 * dir * r + p.settle_tilt * e).toFixed(3)}deg)`;
        }
        // landed: a plain transform, so the type is rasterised flat and sharp
        if (r === 0) tf = p.settle_tilt ? `rotate(${p.settle_tilt}deg)` : "none";
        card.style.transform = tf;
        if (back) back.style.opacity = (ML.out(t, at - 0.15, at + 0.15) * (1 - leave)).toFixed(4);
        card.style.opacity = (ML.lin(t, at, at + D * 0.18) * (1 - leave)).toFixed(4);
        // motion blur while fast (its speed ~ the expo slope), gone by the time it lands
        const speed = Math.pow(r, 1.4);
        const bl = isPic ? 0 : 10 * k * speed;
        card.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        const sh = ML.out(t, at + D * 0.3, landAt + 0.15);
        card.style.boxShadow = `0 ${(30 * k * sh).toFixed(1)}px ${(70 * k * sh).toFixed(1)}px -${(16 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) ${(30 * sh).toFixed(1)}%, transparent), var(--x-shadow)`;
        if (name) {
          if (rtl) { const u = ML.land(t, typeA, typeA + 0.35); name.style.opacity = u.toFixed(4); name.style.filter = u < 1 ? `blur(${((1 - u) * 10 * k).toFixed(2)}px)` : "none"; }
          else { name.textContent = ML.typed(nameText, t, typeA, typeB) || "​"; }
        }
        rows.forEach((row, i) => {
          const u = ML.land(t, rowT[i], rowT[i] + 0.35);
          row.style.opacity = u.toFixed(4);
          row.style.translate = `0 ${((1 - u) * 14 * k).toFixed(2)}px`;
          row.style.filter = u < 1 ? `blur(${((1 - u) * 8 * k).toFixed(2)}px)` : "none";
        });
        if (bars) bars.style.clipPath = `inset(0 ${rtl ? 0 : (1 - ML.out(t, barT, barT + 0.4)) * 100}% 0 ${rtl ? (1 - ML.out(t, barT, barT + 0.4)) * 100 : 0}%)`;
      },
    };
  },
});
