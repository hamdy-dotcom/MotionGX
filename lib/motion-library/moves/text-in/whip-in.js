// Whip in: the word streaks in from 12–60 % of the frame in 0.2–0.35 s on expo out and snaps sharp at its slot.
// Smear options: a directional blur tied to the move (an SVG feGaussianBlur with stdDeviation "X 0" falling to "0 0"
// over the first ~70 % of the move) with skewX and a scaleX stretch relaxing to 1; trailing ghost copies (3–5 tinted
// copies on the same curve, each 0.03 s late, fading as they converge); or a skewed ink wedge that crosses at speed,
// the letters resolving behind its trailing edge (blur 30 → 0, x −60 → 0, 0.2 s each). Split whole, by letters (0.03 s
// apart, so the last letters are still smeared when the first are sharp; Arabic words whole) or by lines (0.5 s
// apart). Lock: a small overshoot that settles back. Extras: a target hairline with a mono TARGET label (tracking
// 0.15em → 0 on the way in), an accent underline 0.1 s after landing, and 1–2 px streak lines crossing at 2000 px/s.
// Left / right follow the reading direction (mirrored in RTL); the slot itself never moves — only its contents.
// Source: prompt-motion references (melvynx, levabashidze, grace-sunnyy, misbahsy, heyiammallik…) — reference only,
// our own code.
ML.define({
  id: "text-in.whip-in",
  category: "text-in",
  name: "Whip in",
  does: "A word (or its letters) streaks in sideways at speed, smeared by directional blur or trailing ghost copies, and snaps sharp at its slot.",
  says: ["speed", "energy", "arrival", "precision", "urgency"],
  energy: 5,
  targets: ["word", "headline", "line", "logo"],
  duration: [0.3, 1.5],
  params: {
    direction: { type: "choice", options: ["right", "left", "up", "down"], default: "right" },
    distance: { type: "number", range: [12, 60], default: 40, unit: "%" },
    duration: { type: "number", range: [0.2, 0.6], default: 0.3, unit: "s" },
    smear: { type: "choice", options: ["blur", "ghosts", "wedge"], default: "blur" },
    blur: { type: "number", range: [8, 30], default: 20, unit: "px" },
    skew: { type: "number", range: [0, 14], default: 10, unit: "deg" },
    stretch: { type: "number", range: [1, 2.5], default: 1.3, unit: "x" },
    split: { type: "choice", options: ["whole", "letters", "lines"], default: "whole" },
    stagger: { type: "number", range: [0, 0.06], default: 0.03, unit: "s" },
    ghosts: { type: "number", range: [2, 6], default: 4 },
    overshoot: { type: "number", range: [0, 80], default: 4, unit: "px" },
    target_marker: { type: "bool", default: false },
    underline: { type: "bool", default: false },
    streaks: { type: "number", range: [0, 6], default: 0 },
  },
  pairs: ["camera.shake", "transition.whip-pan"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:heyiammallik-i-asked-opus-5-5", license: "reference", note: "our own rebuild of the whip entrance seen across 11 references" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const NS = "http://www.w3.org/2000/svg";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    // direction of travel; left / right are mirrored for RTL so "right" always means "towards the reading end"
    const horiz = p.direction === "left" || p.direction === "right";
    let sign = p.direction === "right" || p.direction === "down" ? 1 : -1;
    if (horiz && rtl) sign = -sign;
    const D = (p.distance / 100) * (horiz ? f.W : f.H);
    // what moves: the whole content (one box), each letter, or each line
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;max-width:100%";
    while (el.firstChild) inner.append(el.firstChild);
    el.append(inner);
    let movers;
    if (p.split === "letters" || p.smear === "wedge") movers = ML.split(inner, "chars");
    else if (p.split === "lines") {
      const ws = ML.split(inner, "words"), byLine = new Map();
      for (const w of ws) { const y = Math.round(ctx.box(w).y / (fs * 0.5)); if (!byLine.has(y)) byLine.set(y, []); byLine.get(y).push(w); }
      movers = [...byLine.values()];
    } else movers = [[inner]];
    movers = movers.map((m) => (Array.isArray(m) ? m : [m]));
    // landing order: the leading edge of travel lands first
    const eb = ctx.box(el);
    const items = movers.map((els, i) => ({ els, i, b: ctx.box(els[0]) }));
    if (p.split === "letters" || p.smear === "wedge") items.sort((a, b) => (horiz ? sign * (b.b.x - a.b.x) : sign * (b.b.y - a.b.y)));
    const gapOf = p.split === "lines" ? Math.max(0.25, p.stagger * 10) : p.stagger;
    items.forEach((it, k) => { it.t = at + k * gapOf; });
    // the directional blur: one SVG filter per mover
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    const uid = "whip" + Math.floor(ML.rnd(eb.x + eb.y * 3.1, items.length) * 1e9).toString(36);
    items.forEach((it, k) => {
      const fl = document.createElementNS(NS, "filter");
      fl.setAttribute("id", `${uid}-${k}`);
      for (const [a, v] of [["x", "-100%"], ["y", "-60%"], ["width", "300%"], ["height", "220%"], ["color-interpolation-filters", "sRGB"]]) fl.setAttribute(a, v);
      const g = document.createElementNS(NS, "feGaussianBlur");
      g.setAttribute("stdDeviation", "0 0"); fl.append(g); svg.append(fl);
      it.blur = g; it.fid = `url(#${uid}-${k})`;
    });
    el.append(svg);
    // ghosts: tinted copies of the whole content on the same curve, later
    const ghosts = [];
    if (p.smear === "ghosts") {
      const n = Math.round(ML.clamp(p.ghosts, 2, 6)), ib = ctx.box(inner);
      for (let g = 0; g < n; g++) {
        const c = inner.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.style.cssText = `position:absolute;left:${(ib.x - eb.x - el.clientLeft).toFixed(1)}px;top:${(ib.y - eb.y - el.clientTop).toFixed(1)}px;width:${ib.w.toFixed(1)}px;display:inline-block;pointer-events:none;color:${g % 2 ? "var(--x-dim)" : "currentColor"}`;
        el.insertBefore(c, inner);
        ghosts.push({ c, d: 0.03 * (g + 1), o: Math.max(0.08, 0.35 - g * 0.1) });
      }
    }
    // the wedge
    let wedge = null;
    const ib0 = ctx.box(inner);
    if (p.smear === "wedge") {
      wedge = document.createElement("span");
      const ww = fs * 1.1;
      wedge.style.cssText = `position:absolute;top:${(ib0.y - eb.y - el.clientTop - fs * 0.15).toFixed(1)}px;left:0;width:${ww.toFixed(1)}px;height:${(ib0.h + fs * 0.3).toFixed(1)}px;background:var(--x-ink);skew:-18deg 0;pointer-events:none;z-index:2`;
      el.append(wedge);
      // letters resolve as the wedge's trailing edge passes them
      const L = ib0.x - eb.x, R = L + ib0.w, run = 0.35;
      items.forEach((it) => {
        const cx = it.b.x - eb.x + it.b.w / 2, u = ML.clamp((cx - L) / Math.max(1, R - L));
        it.t = at + run * (sign > 0 ? u : 1 - u) * 0.8;
      });
      Object.assign(wedge, { _l: L, _r: R, _w: ww, _run: run });
    }
    // marker, underline, streaks
    let marker = null, mlabel = null, bar = null;
    const relX = ib0.x - eb.x - el.clientLeft, relY = ib0.y - eb.y - el.clientTop;
    if (p.target_marker) {
      marker = document.createElement("span");
      const mx = horiz ? (sign > 0 ? relX + ib0.w + fs * 0.08 : relX - fs * 0.08) : relX + ib0.w / 2;
      marker.style.cssText = horiz
        ? `position:absolute;left:${mx.toFixed(1)}px;top:${(relY - fs * 0.25).toFixed(1)}px;width:1px;height:${(ib0.h + fs * 0.5).toFixed(1)}px;background:var(--x-dim);pointer-events:none`
        : `position:absolute;left:${(relX - fs * 0.2).toFixed(1)}px;top:${(sign > 0 ? relY + ib0.h : relY).toFixed(1)}px;width:${(ib0.w + fs * 0.4).toFixed(1)}px;height:1px;background:var(--x-dim);pointer-events:none`;
      mlabel = document.createElement("span");
      mlabel.textContent = "TARGET";
      mlabel.style.cssText = `position:absolute;left:${(horiz ? mx + 6 : relX - fs * 0.2).toFixed(1)}px;top:${(relY - fs * 0.25 - 4).toFixed(1)}px;translate:0 -100%;font:600 ${Math.max(12, fs * 0.13).toFixed(1)}px var(--x-mono-font);letter-spacing:0.12em;color:var(--x-dim);pointer-events:none;white-space:nowrap`;
      el.append(marker, mlabel);
    }
    if (p.underline) {
      bar = document.createElement("span");
      bar.style.cssText = `position:absolute;left:${relX.toFixed(1)}px;top:${(relY + ib0.h + fs * 0.02).toFixed(1)}px;width:${ib0.w.toFixed(1)}px;height:${Math.max(4, fs * 0.06).toFixed(1)}px;background:var(--x-accent);border-radius:var(--x-radius-s);transform-origin:${rtl ? "100%" : "0%"} 50%;scale:0 1;pointer-events:none`;
      el.append(bar);
    }
    const streaks = [];
    for (let s = 0; s < Math.round(p.streaks); s++) {
      const ln = document.createElement("span"), len = 60 + ML.rnd(s, 7) * 140, th = 1 + Math.round(ML.rnd(s, 9));
      const y = relY + ib0.h * (0.2 + 0.6 * ML.rnd(s, 11));
      ln.style.cssText = horiz
        ? `position:absolute;left:${(relX + ib0.w / 2 - len / 2).toFixed(1)}px;top:${y.toFixed(1)}px;width:${len.toFixed(1)}px;height:${th}px;background:var(--x-ink);pointer-events:none;opacity:0`
        : `position:absolute;left:${(relX + ib0.w * (0.15 + 0.7 * ML.rnd(s, 11))).toFixed(1)}px;top:${(relY + ib0.h / 2 - len / 2).toFixed(1)}px;width:${th}px;height:${len.toFixed(1)}px;background:var(--x-ink);pointer-events:none;opacity:0`;
      el.append(ln); streaks.push({ ln, off: (ML.rnd(s, 13) - 0.5) * 0.1 });
    }
    const dur = p.duration, last = items.reduce((a, it) => Math.max(a, it.t), at) + dur;
    ctx.sfx(at, "whoosh.heavy", 0.45);
    if (p.underline) ctx.sfx(last + 0.1, "tap", 0.2);
    const axis = (v) => (horiz ? `${v.toFixed(2)}px 0` : `0 ${v.toFixed(2)}px`);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.22)) / 0.18);
        el.style.opacity = (1 - leave).toFixed(4);
        for (const it of items) {
          const a = it.t;
          let x, sk = 0, sc = 1, bl = 0, o;
          if (p.smear === "wedge") {
            const u = ML.out(t, a, a + 0.2);
            x = -sign * 60 * (fs / 104) * (1 - u); bl = 30 * (1 - u); o = t >= a ? Math.min(1, u * 2) : 0;
          } else {
            const e = ML.expo(t, a, a + dur), lin = ML.lin(t, a, a + dur);
            // a small overshoot past the slot, settling back over 0.3 s
            const bump = Math.sin(Math.PI * ML.lin(t, a + dur * 0.55, a + dur + 0.3));
            x = -sign * D * (1 - e) + sign * p.overshoot * bump;
            const sm = ML.clamp(1 - lin / 0.7);
            bl = p.smear === "blur" ? p.blur * sm : p.blur * 0.35 * sm;
            sk = -sign * p.skew * (1 - e); sc = 1 + (p.stretch - 1) * (1 - e);
            o = t >= a ? Math.min(1, lin * 4) : 0;
          }
          for (const m of it.els) {
            m.style.translate = Math.abs(x) > 0.01 ? axis(x) : "none";
            m.style.opacity = o.toFixed(4);
            if (horiz) { m.style.transform = sk || sc !== 1 ? `skewX(${sk.toFixed(2)}deg) scaleX(${sc.toFixed(4)})` : "none"; }
            else { m.style.transform = sc !== 1 ? `scaleY(${sc.toFixed(4)})` : "none"; }
            it.blur.setAttribute("stdDeviation", horiz ? `${bl.toFixed(2)} 0` : `0 ${bl.toFixed(2)}`);
            m.style.filter = bl > 0.05 ? it.fid : "none";
          }
        }
        for (const g of ghosts) {
          const a = at + g.d, e = ML.expo(t, a, a + dur);
          const x = -sign * D * (1 - e);
          g.c.style.translate = axis(x);
          g.c.style.transform = horiz ? `skewX(${(-sign * p.skew * (1 - e)).toFixed(2)}deg)` : "none";
          g.c.style.opacity = (t >= a ? g.o * (1 - ML.lin(t, a + dur * 0.4, a + dur + 0.2)) : 0).toFixed(4);
        }
        if (wedge) {
          const u = ML.lin(t, at - 0.05, at + wedge._run), L = wedge._l - wedge._w * 1.4, R = wedge._r + wedge._w * 0.4;
          const x = sign > 0 ? L + (R - L) * u : R - (R - L) * u;
          wedge.style.left = x.toFixed(2) + "px";
          wedge.style.opacity = u > 0 && u < 1 ? "1" : "0";
        }
        if (marker) {
          const u = ML.lin(t, at - 0.2, at);
          marker.style.opacity = (u * (1 - ML.lin(t, last + 0.3, last + 0.6))).toFixed(4);
          mlabel.style.opacity = marker.style.opacity;
          mlabel.style.letterSpacing = `${(0.15 * (1 - ML.out(t, at, last))).toFixed(3)}em`;
        }
        if (bar) bar.style.scale = `${ML.out(t, last + 0.1, last + 0.4).toFixed(4)} 1`;
        for (const s of streaks) {
          const a = at - 0.05 + s.off, u = ML.lin(t, a, a + 0.25);
          const dx = -sign * (0.125 - u * 0.25) * 2000;
          s.ln.style.translate = axis(dx);
          s.ln.style.opacity = u > 0 && u < 1 ? (0.8 * (1 - u)).toFixed(4) : "0";
        }
      },
    };
  },
});
