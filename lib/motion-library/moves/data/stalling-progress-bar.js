// Stalling progress bar: a labelled pill (2 px ink outline, full radius, accent fill) fades in at 0 % over 0.3 s, fills
// to its peak (10–12 %) on power2.out in 0.8 s with a huge accent percentage counting with it, then — the joke — the
// number creeps backwards (12 → 11 → 9 → 8, 0.3 s a step, the fill shrinking in sync), or stalls and twitches in place,
// or crawls forward a point at a time. A handwritten "still loading..." types in under it, followed by a small arc
// spinner turning 360° every 0.8 s, linear. In Arabic the fill runs from the right and the caption types word by word.
// Source: prompt-motion "devius-maximus-this-is-nuts-made" (reference only: rebuilt as our own code).
ML.define({
  id: "data.stalling-progress-bar",
  category: "data",
  name: "Progress bar stalls and slips back",
  does: "A labelled progress bar fills a little, then its percentage creeps backwards while a 'still loading...' note and spinner appear.",
  says: ["problem", "time", "playful"],
  energy: 2,
  targets: ["chart", "number"],
  duration: [2, 4],
  params: {
    direction: { type: "choice", options: ["regress", "stall", "forward"], default: "regress" },
    caption: { type: "bool", default: true },
    peak: { type: "number", range: [5, 40], default: 12, unit: "%" },
    label: { type: "text", default: "" },
    note: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "data.stat-flash-card"],
  avoid: ["luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:devius-maximus-this-is-nuts-made", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
    // the host: over the target's box (a number slot hides under it), else centred in the picture region
    let bx;
    if (el) { const b = ctx.box(el); const w = Math.max(b.w, Math.min(f.pic.w * 0.8, f.W * 0.7)); bx = { x: Math.max(f.m, Math.min(f.W - f.m - w, b.x + b.w / 2 - w / 2)), y: b.y + b.h / 2, w }; }
    else { const w = Math.min(f.pic.w * 0.82, f.wide ? f.W * 0.42 : f.W * 0.78); bx = { x: f.pic.x + (f.pic.w - w) / 2, y: f.pic.y + f.pic.h / 2, w }; }
    const pad = Math.min(f.W, f.H) * 0.05, k = (bx.w - pad * 2) / 380; // the reference pill is 380 × 22, inside a panel
    const wrap = mk("div", `position:absolute;left:${(bx.x - hb.x).toFixed(1)}px;top:${(bx.y - hb.y).toFixed(1)}px;width:${bx.w.toFixed(1)}px;translate:0 -50%;z-index:14;pointer-events:none;display:grid;gap:${(10 * k).toFixed(1)}px;justify-items:start;direction:${rtl ? "rtl" : "ltr"};box-sizing:border-box;padding:${pad.toFixed(1)}px`, scene);
    wrap.className = "ml-panel";
    const latin = (s) => !ML.ARABIC.test(s);
    const labelText = p.label || (rtl ? "تقدّمك" : "YOUR PROGRESS");
    mk("div", `font:var(--x-label-weight) ${(8 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${latin(labelText) ? "var(--x-label-track)" : "0"};text-transform:${latin(labelText) ? "uppercase" : "none"};color:var(--x-ink)`, wrap, labelText);
    const pct = mk("div", `font:var(--x-head-weight) ${(60 * k).toFixed(1)}px/0.9 var(--x-head-font);letter-spacing:-0.04em;color:var(--x-accent);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate`, wrap, "0%");
    const pill = mk("div", `position:relative;width:100%;height:${(22 * k).toFixed(1)}px;border:${Math.max(2, 2 * k * 0.6).toFixed(1)}px solid var(--x-ink);border-radius:999px;box-sizing:border-box;overflow:hidden`, wrap);
    const fill = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:0;background:var(--x-accent);border-radius:999px`, pill);
    const capRow = mk("div", `display:flex;align-items:center;gap:${(8 * k).toFixed(1)}px;min-height:${(30 * k).toFixed(1)}px;margin-top:${(4 * k).toFixed(1)}px`, wrap);
    const noteText = p.note || (rtl ? "لسه بيحمّل..." : "still loading...");
    const cap = mk("span", `font:500 ${(22 * k).toFixed(1)}px/1 var(--x-hand-font);color:var(--x-dim);white-space:pre`, capRow, "");
    const NS = "http://www.w3.org/2000/svg", sp = Math.max(10, 12 * k);
    const spin = document.createElementNS(NS, "svg");
    spin.setAttribute("viewBox", "0 0 20 20"); spin.setAttribute("width", sp.toFixed(1)); spin.setAttribute("height", sp.toFixed(1));
    spin.innerHTML = `<circle cx="10" cy="10" r="7.5" fill="none" stroke="var(--x-line)" stroke-width="2.5"/><path d="M10 2.5 A7.5 7.5 0 0 1 17.5 10" fill="none" stroke="var(--x-dim)" stroke-width="2.5" stroke-linecap="round"/>`;
    capRow.append(spin);

    // the value as a function of t: fade in at 0, fill to the peak, then the chosen misbehaviour in 0.3 s steps
    const pk = Math.round(p.peak), t0 = at + 0.3, t1 = t0 + 0.8;
    const steps = p.direction === "regress" ? [pk - 1, pk - 3, pk - 4].map((v) => Math.max(0, v)) : p.direction === "forward" ? [pk + 1, pk + 2, pk + 3] : [pk, pk, pk];
    const stepGap = p.direction === "forward" ? 0.6 : 0.3, sAt = steps.map((_, i) => t1 + 0.35 + i * stepGap);
    const p2 = (x) => 1 - Math.pow(1 - x, 3); // power2.out
    const value = (t) => {
      if (t < t0) return 0;
      if (t < t1) return pk * p2(ML.lin(t, t0, t1));
      let v = pk;
      sAt.forEach((s, i) => { const prev = i ? steps[i - 1] : pk; if (t >= s) v = prev + (steps[i] - prev) * p2(ML.lin(t, s, s + 0.22)); });
      return v;
    };
    const capAt = t1 + 0.2;
    const capEnd = capAt + Math.min(0.9, Math.max(0.4, Array.from(noteText).length * 0.06));
    const units = ML.ARABIC.test(noteText) ? noteText.split(/(\s+)/).filter(Boolean) : Array.from(noteText);
    if (p.direction !== "stall") sAt.forEach((s) => ctx.sfx(s, "tap", 0.25)); else ctx.sfx(sAt[1], "tap", 0.2);
    ctx.sfx(t1, "tap", 0.2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (ML.lin(t, at, t0) * (1 - leave)).toFixed(4);
        if (el) el.style.opacity = (1 - ML.lin(t, at, t0) * (1 - leave)).toFixed(4);
        let v = value(t);
        // a stall twitches: the fill trembles by a fraction of a point and the number holds
        if (p.direction === "stall" && t > sAt[0]) v += (ML.rnd(Math.floor(t * 12), 3) - 0.5) * 0.6;
        fill.style.width = `${ML.clamp(v / 100, 0, 1) * 100}%`;
        pct.textContent = `${Math.max(0, Math.round(p.direction === "stall" ? Math.min(v, pk) : v))}%`;
        const on = p.caption && t >= capAt;
        capRow.style.opacity = on ? "1" : "0";
        if (on) cap.textContent = units.slice(0, Math.round(units.length * ML.lin(t, capAt, capEnd))).join("");
        spin.style.opacity = on && t >= capEnd ? "1" : "0";
        spin.style.rotate = `${(((t - capEnd) / 0.8) * 360 % 360).toFixed(2)}deg`;
      },
    };
  },
});
