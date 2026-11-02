// Before → after figure (the specificity rule: "from 4 hours to 15 minutes"): the target number becomes the NEW
// figure; the old one stands before it, muted at 60% size, then gets struck through and shrinks aside while the new
// one slams in. Layout: old → arrow → new (accent, full size), an optional caption below naming the task.
// Old fades in 0.3 s; a 2–3 px strike draws across it from the reading-start side 0.3 s; it scales 1 → 0.8 and dims
// to 40% (0.3 s); the arrow draws 0.25 s; the new figure pops scale 1.15 → 1 with opacity (back.out(2), 0.35 s) or,
// in `count`, counts from the old value to the new over 0.8 s. Arabic mirrors the arrow and the strike.
// The old figure is `from` (text), else derived from the new one: ×4 for `reduce`, ÷4 for `increase`. A line with no
// number keeps its words as the new figure and needs `from` (without it, it only pops in). `count` needs the same unit
// on both sides ("4 hours" to "15 minutes" stays a strike and pop). The landing falls on the number's spoken word when
// the voice says it, and the beats tighten to fit a short run.
// Source: MengTo/Skills web-design/landing-page SKILL.md (MIT): the specificity rule, as motion.
ML.define({
  id: "data.before-after-figure",
  category: "data",
  name: "Specific before -> after figure",
  does: "A vague claim becomes a hard number: the old figure is struck through and shrinks aside while the new figure slams in next to it.",
  says: ["before-after", "proof", "result", "speed"],
  energy: 3,
  targets: ["number", "line"],
  duration: [1.5, 3],
  params: {
    direction: { type: "choice", options: ["reduce", "increase"], default: "reduce" },
    style: { type: "choice", options: ["strike-pop", "count"], default: "strike-pop" },
    from: { type: "text", default: "" },
    unit: { type: "text", default: "" },
    caption: { type: "bool", default: true },
    caption_text: { type: "text", default: "" },
  },
  pairs: ["data.count-up", "text-emphasis.accent-word"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "MengTo/Skills:web-design/landing-page/SKILL.md", license: "MIT", note: "the specificity rule, as our own motion" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const toLatin = (s) => String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
    const own = (el.textContent || "").trim();
    const arabicDigits = /[٠-٩]/.test(own);
    const parse = (s) => { const L = toLatin(s), m = L.match(/-?[\d,]*\.?\d+/); if (!m) return null; const raw = m[0], v = parseFloat(raw.replace(/,/g, "")); return { v, raw: raw.replace(/,/g, ""), dec: (raw.split(".")[1] || "").length, commas: raw.includes(","), pre: L.slice(0, m.index), post: L.slice(m.index + raw.length) }; };
    const parsed = parse(own), nw = parsed || { v: 0, raw: "", dec: 0, commas: false, pre: "", post: "" };
    const fmt = (v, like) => { let s = like.dec ? v.toFixed(like.dec) : Math.round(v).toLocaleString("en-US", { useGrouping: like.commas || Math.abs(v) >= 10000 }); if (arabicDigits) s = s.replace(/\d/g, (d) => AR[d]).replace(/,/g, "٬"); return like.pre + s + like.post; };
    // the old figure: `from`, else ×4 / ÷4 of the new one, rounded to a clean number
    let old = String(p.from || "").trim() ? parse(p.from) : null;
    if (!old && parsed && !String(p.from || "").trim()) {
      const raw = p.direction === "increase" ? nw.v / 4 : nw.v * 4, mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(raw) || 1)) - 1));
      old = { ...nw, v: Math.round(raw / mag) * mag };
    }
    const oldText = String(p.from || "").trim() || (old ? fmt(old.v, old) : "");
    const newText = parsed ? fmt(nw.v, nw) : own, noOld = !oldText;
    const counts = p.style === "count" && !!parsed && !!old && old.pre.trim() === nw.pre.trim() && (!old.post.trim() || old.post.trim() === nw.post.trim());
    const unit = String(p.unit || "").trim();
    // rebuild the slot: [old][arrow][new] in a row (the row follows the reading direction), the caption below
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    el.textContent = "";
    const box = mk("div", "display:inline-flex;flex-direction:column;align-items:flex-start;gap:0.12em;max-width:100%", null, el);
    const row = mk("div", "display:flex;align-items:center;gap:0.22em;white-space:nowrap", null, box);
    const oldW = mk("span", "position:relative;display:inline-block;font-size:0.6em;color:var(--x-dim);transform-origin:50% 50%;font-variant-numeric:tabular-nums lining-nums", null, row);
    const oldT = mk("span", "", oldText, oldW);
    if (unit) mk("span", "font-size:0.5em;margin-inline-start:0.2em", unit, oldW);
    const strike = mk("i", `position:absolute;left:-4%;right:-4%;top:52%;height:0.06em;min-height:2px;border-radius:2px;background:var(--x-accent);transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0)`, null, oldW);
    const NS = "http://www.w3.org/2000/svg";
    const arrow = document.createElementNS(NS, "svg");
    arrow.setAttribute("viewBox", "0 0 60 30");
    arrow.style.cssText = `flex:none;width:0.5em;height:0.25em;overflow:visible;${rtl ? "transform:scaleX(-1)" : ""}`;
    const ap = document.createElementNS(NS, "path");
    ap.setAttribute("d", "M2 15 L56 15 M44 4 L57 15 L44 26"); ap.setAttribute("fill", "none"); ap.setAttribute("stroke", "var(--x-dim)");
    ap.setAttribute("stroke-width", "4"); ap.setAttribute("stroke-linecap", "round"); ap.setAttribute("stroke-linejoin", "round"); ap.setAttribute("pathLength", "1");
    ap.setAttribute("stroke-dasharray", "1 2"); ap.setAttribute("stroke-dashoffset", "1");
    arrow.append(ap); row.append(arrow);
    const newW = mk("span", "display:inline-block;color:var(--x-accent);transform-origin:50% 60%;font-variant-numeric:tabular-nums lining-nums", null, row);
    const newT = mk("span", "", newText, newW);
    if (noOld) { oldW.style.display = "none"; arrow.style.display = "none"; }
    if (unit) mk("span", "font-size:0.42em;margin-inline-start:0.2em;color:var(--x-ink)", unit, newW);
    let cap = null;
    if (p.caption && String(p.caption_text || "").trim()) { cap = mk("div", "font-size:0.22em;line-height:1.3", String(p.caption_text).trim(), box); cap.className = "ml-label"; cap.style.fontSize = Math.max(24, fs * 0.26).toFixed(1) + "px"; }
    // keep the new figure's width fixed while it counts; fit the whole row to the slot's parent
    newT.style.display = "inline-block";
    if (counts) { newT.style.textAlign = "end"; /* the figure stays against its unit as its digits drop away */ const w1 = newT.offsetWidth; newT.textContent = fmt(old.v, nw); const w0 = newT.offsetWidth; newT.textContent = fmt(nw.v, nw); newT.style.minWidth = (Math.max(w0, w1) / fs).toFixed(3) + "em"; }
    const room = (el.parentElement ? el.parentElement.clientWidth : el.clientWidth) * 0.98;
    if (room > 0) { const w = row.scrollWidth; if (w > room) el.style.fontSize = ((fs * room) / w).toFixed(2) + "px"; }
    // timing
    const lead = noOld ? 0.1 : 1.1, run = counts ? 0.8 : 0.35;
    const s = ML.clamp((end - at - 0.5) / (lead + run), 0.5, 1); // a short run tightens every beat
    const base = at + lead * s, landing = base + (counts ? run * s : 0);
    const spoken = nw.raw.length >= 2 ? ctx.word(nw.raw, -1) : -1;
    const shift = spoken > landing && spoken < end - 0.6 ? spoken - landing : 0; // the old figure waits; the strike and landing go with the voice
    const T = { oldIn: at, strike: at + 0.4 * s + shift, shrink: at + 0.7 * s + shift, arrow: at + 0.85 * s + shift, pop: base + shift };
    const countEnd = T.pop + run * s;
    if (!noOld) ctx.sfx(T.strike, "snap", 0.25);
    ctx.sfx(counts ? countEnd : T.pop, "hit", 0.4);
    const backOut = (x, c = 2) => { const y = x - 1; return x <= 0 ? 0 : 1 + (c + 1) * y * y * y + c * y * y; };
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        box.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        box.style.opacity = (1 - leave).toFixed(4);
        const oi = ML.ease(t, T.oldIn, T.oldIn + 0.3), sh = ML.ease(t, T.shrink, T.shrink + 0.3);
        oldW.style.opacity = (oi * (1 - 0.6 * sh)).toFixed(4);
        oldW.style.scale = (1 - 0.2 * sh).toFixed(4);
        strike.style.transform = `scaleX(${ML.out(t, T.strike, T.strike + 0.3).toFixed(4)})`;
        ap.setAttribute("stroke-dashoffset", (1 - ML.out(t, T.arrow, T.arrow + 0.25)).toFixed(4));
        if (counts) {
          const u = ML.lin(t, T.pop, countEnd), e = 1 - Math.pow(1 - u, 3);
          newW.style.opacity = ML.lin(t, T.pop, T.pop + 0.15).toFixed(4);
          newW.style.scale = "none";
          newT.textContent = fmt(u >= 1 ? nw.v : old.v + (nw.v - old.v) * e, nw);
        } else {
          const u = ML.lin(t, T.pop, T.pop + 0.35);
          newW.style.opacity = Math.min(1, u * 2.5).toFixed(4);
          newW.style.scale = u >= 1 ? "none" : (1.15 - 0.15 * backOut(u)).toFixed(4);
        }
        if (cap) { const c = ML.out(t, T.pop + 0.2, T.pop + 0.5); cap.style.opacity = c.toFixed(4); cap.style.translate = `0 ${((1 - c) * 10).toFixed(2)}px`; }
      },
    };
  },
});
