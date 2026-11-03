// Live value ticker (MengTo gsap-scrolltrigger-storytelling's live card, ported to a pure function of t): a big
// money figure ("$14,285,192", light, tracking tight, tabular) in a dashboard card changes every `interval` seconds by a
// seeded delta in [delta_min, delta_max] (the source: Math.random() · 4000 − 1500 every 3 s; here ML.rnd, so the
// same t gives the same value). Each change animates as a quick count (0.6 s power2.out) or a per-digit roll of only
// the digits that changed, with a colour flash (good colour up, bad colour down, fading back over 0.4 s). Card context:
// a header with a pinging live dot, the value row with its caption, a 2 px progress bar pulsing on a 4 s cycle and two
// small stats: by default read off the ticker itself (change since the start, the last move), so the card never states
// a figure nobody gave it; `stats` ("Label: value | Label: value") replaces them. On a number the card builds in its
// place and ticks from that number, with moves capped to its size (under 1%); on a card it fills it; with no target it
// sits in the picture region. A currency sits on the figure's left in both directions: "$14,285" and, read from the
// right, "14,285 ج.م"; only digits ever roll, so an Arabic currency's letters stay joined.
// Source: MengTo/Skills web-design/gsap-scrolltrigger-storytelling demo (MIT).
ML.define({
  id: "data.live-value-tick",
  category: "data",
  name: "Live value ticker",
  does: "A big money figure in a dashboard card ticks up and down by small amounts every few seconds, like live market data.",
  says: ["money", "proof", "time", "tech"],
  energy: 2,
  targets: ["number", "card"],
  duration: [3, 12],
  params: {
    interval: { type: "number", range: [1, 4], default: 3, unit: "s" },
    delta_min: { type: "number", range: [-5000, 0], default: -1500 },
    delta_max: { type: "number", range: [0, 5000], default: 2500 },
    style: { type: "choice", options: ["count", "digit-roll"], default: "count" },
    flash: { type: "bool", default: true },
    start: { type: "number", range: [0, 1000000000], default: 14285192 },
    currency: { type: "text", default: "$" },
    title: { type: "text", default: "" },
    caption: { type: "text", default: "" },
    stats: { type: "text", default: "" },
    progress: { type: "number", range: [0, 100], default: 74, unit: "%" },
  },
  pairs: ["data.live-readout", "data.signal-level-bars"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/gsap-scrolltrigger-storytelling/demo/index.html", license: "MIT", note: "the live analytics overlay and its setInterval ticker, made seekable" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const slot = el ? el.getAttribute("data-slot") : "";
    const num = (x) => parseFloat(String(x || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٫/g, ".").replace(/[^\d.]/g, ""));
    // a number slot's own figure (and its currency, if it has one) is what ticks
    const slotText = el && slot === "number" ? el.textContent || "" : "", slotV = num(slotText);
    const fromSlot = slotV > 0;
    const currency = fromSlot && p.currency === "$" ? slotText.replace(/[\d٠-٩۰-۹.,٬٫\s]/g, "") : p.currency || "";
    // the host: a card fills itself; a number builds the card in its place; else a card in the picture region
    let host, inPlace = false;
    if (el && slot === "card") { el.textContent = ""; host = el; inPlace = true; }
    else if (el && slot === "number") {
      el.textContent = ""; inPlace = true;
      host = mk("div", `display:block;width:${Math.min(el.clientWidth || 9999, 820 * u).toFixed(1)}px;max-width:100%`, el);
    } else {
      const scene = ctx.scene || stage, hb = ctx.box(scene), w = Math.min(f.pic.w * 0.86, 820 * u);
      host = mk("div", `position:absolute;left:${(f.pic.x + (f.pic.w - w) / 2 - hb.x).toFixed(1)}px;top:${(f.pic.y + f.pic.h / 2 - hb.y).toFixed(1)}px;translate:0 -50%;width:${w.toFixed(1)}px;z-index:20`, scene);
    }
    const card = mk("div", `box-sizing:border-box;width:100%;padding:${(30 * u).toFixed(1)}px ${(34 * u).toFixed(1)}px;display:flex;flex-direction:column;gap:${(20 * u).toFixed(1)}px;direction:${rtl ? "rtl" : "ltr"};visibility:hidden;will-change:opacity;font-weight:400`, host);
    card.className = "ml-panel";
    // Arabic letters join: never letter-spaced
    const lab = (txt, parent, css = "") => { const ar = ML.ARABIC.test(txt); return mk("span", `font:var(--x-label-weight) ${(20 * u).toFixed(1)}px var(--x-label-font);letter-spacing:${ar ? "0" : "var(--x-label-track)"};text-transform:${ar ? "none" : "var(--x-label-case)"};color:var(--x-dim);${css}`, parent, txt); };
    // header: title + ping dot
    const hd = mk("div", `display:flex;justify-content:space-between;align-items:center;padding-bottom:${(14 * u).toFixed(1)}px;border-bottom:1px solid var(--x-line)`, card);
    lab(p.title || (rtl ? "مباشر" : "Live"), hd, "color:var(--x-accent)");
    const dotS = 14 * u;
    const dotW = mk("span", `position:relative;display:inline-block;width:${dotS.toFixed(1)}px;height:${dotS.toFixed(1)}px`, hd);
    const ping = mk("i", "position:absolute;inset:0;border-radius:50%;background:var(--x-good)", dotW);
    mk("i", "position:absolute;inset:0;border-radius:50%;background:var(--x-good)", dotW);
    // the value row
    const vr = mk("div", `display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:${(8 * u).toFixed(1)}px ${(16 * u).toFixed(1)}px`, card);
    lab(p.caption || (rtl ? "القيمة الإجمالية" : "Total value"), vr, "text-transform:none;letter-spacing:0;font-family:var(--x-body-font);font-weight:300");
    const fsV = 64 * u;
    const valBox = mk("span", `display:inline-flex;direction:ltr;unicode-bidi:isolate;font:300 ${fsV.toFixed(1)}px/1.1 var(--x-head-font);letter-spacing:-0.025em;font-variant-numeric:tabular-nums lining-nums;color:var(--x-ink);white-space:pre`, vr);
    // bar + stats
    const bar = mk("div", "position:relative;width:100%;height:2px;border-radius:2px;overflow:hidden;background:color-mix(in srgb, var(--x-accent) 20%, transparent)", card);
    const barFill = mk("i", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:${ML.clamp(p.progress, 0, 100)}%;background:var(--x-accent)`, bar);
    const stats = mk("div", "display:grid;grid-template-columns:1fr 1fr;gap:16px", card);
    const given = String(p.stats || "").split("|").map((x) => x.trim()).filter(Boolean).slice(0, 2).map((x) => { const i = x.lastIndexOf(":"); return i > 0 ? [x.slice(0, i).trim(), x.slice(i + 1).trim()] : ["", x]; });
    const liveStats = given.length === 0;
    const statEls = (liveStats ? [[rtl ? "من البداية" : "Since start", "+0.00%"], [rtl ? "آخر حركة" : "Last move", "+0"]] : given).map(([k, v], i) => {
      const s = mk("div", "display:flex;flex-direction:column;gap:4px", stats);
      if (k) lab(k, s, "text-transform:none;letter-spacing:0;font-family:var(--x-body-font);font-weight:300");
      return mk("span", `font:300 ${(34 * u).toFixed(1)}px var(--x-head-font);font-variant-numeric:tabular-nums lining-nums;color:${i ? "var(--x-good)" : "var(--x-accent)"};direction:${ML.ARABIC.test(v) ? "rtl" : "ltr"};unicode-bidi:isolate;text-align:${rtl ? "right" : "left"}`, s, v);
    });
    // the values: one per change, seeded
    const start = fromSlot ? slotV : p.start;
    // moves stay small against the figure (0.4% down, 0.7% up at most); a short run still shows at least two
    const lo = Math.min(-1, Math.max(Math.min(p.delta_min, p.delta_max), -start * 0.004)), hi = Math.max(1, Math.min(Math.max(p.delta_min, p.delta_max), start * 0.007));
    const t0 = at + 0.6, roomT = end - 0.4 - t0;
    const iv = Math.max(1, Math.min(ML.clamp(p.interval, 1, 4), roomT / 1.5));
    const nCh = roomT < 0 ? 0 : Math.floor(roomT / iv) + 1;
    const changeT = Array.from({ length: nCh }, (_, i) => t0 + i * iv);
    const vals = [Math.round(start)];
    for (let i = 0; i < nCh; i++) vals.push(Math.max(0, vals[i] + Math.round(lo + (hi - lo) * ML.rnd(i + 1, 41))));
    const fmt = (v) => Math.round(v).toLocaleString("en-US");
    const maxLen = Math.max(...vals.map((v) => fmt(v).length)) + 1;
    if (currency) mk("span", `margin-inline-end:${ML.ARABIC.test(currency) ? ".28em" : ".04em"}`, valBox, currency);
    // digit-roll: fixed character slots, right-aligned, each a mask with an outgoing and an incoming glyph
    const slots = [];
    if (p.style === "digit-roll") {
      for (let i = 0; i < maxLen; i++) {
        const m = mk("span", "position:relative;display:inline-block;overflow:hidden;height:1.1em", valBox);
        const sz = mk("span", "visibility:hidden", m, "0");
        const a = mk("span", "position:absolute;left:0;top:0", m), b = mk("span", "position:absolute;left:0;top:0", m);
        slots.push({ m, sz, a, b });
      }
    }
    const txt = p.style === "digit-roll" ? null : mk("span", "", valBox, fmt(vals[0]));
    changeT.forEach((t) => ctx.sfx(t, "blip", 0.15));
    const p2o = (x) => 1 - (1 - x) * (1 - x);
    const pad = (s) => s.padStart(maxLen, " ");
    return {
      draw(t) {
        if (t < at - 1e-6) { card.style.visibility = "hidden"; return; }
        card.style.visibility = "visible";
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), e = ML.out(t, at, at + 0.4);
        card.style.opacity = (e * (1 - leave)).toFixed(4);
        if (!inPlace) card.style.translate = `0 ${Math.round((1 - e) * 24 * u)}px`;
        let k = 0; for (let i = 0; i < changeT.length; i++) if (t >= changeT[i]) k = i + 1;
        const from = vals[Math.max(0, k - 1)], to = vals[k], since = k ? t - changeT[k - 1] : 99;
        let shownV = to;
        // the colour flash
        const flash = p.flash && k ? 1 - ML.lin(since, 0.15, 0.55) : 0;
        const tone = to >= from ? "var(--x-good)" : "var(--x-bad)";
        valBox.style.color = flash > 0.002 ? `color-mix(in srgb, ${tone} ${(flash * 100).toFixed(1)}%, var(--x-ink))` : "var(--x-ink)";
        if (txt) {
          const v = k ? from + (to - from) * p2o(ML.lin(since, 0, 0.6)) : to;
          shownV = v;
          const s = fmt(v);
          if (txt.textContent !== s) txt.textContent = s;
        } else {
          const A = pad(fmt(from)), B = pad(fmt(to)), q = k ? p2o(ML.lin(since, 0, 0.4)) : 1;
          slots.forEach((sl, i) => {
            const a = A[i], b = B[i];
            if (sl.b.textContent !== b) sl.b.textContent = b;
            if (sl.a.textContent !== a) sl.a.textContent = a;
            const wide = b !== " " || a !== " ";
            sl.m.style.display = wide ? "inline-block" : "none";
            if (sl.sz.textContent !== (b === " " ? a : b)) sl.sz.textContent = b === " " ? a : b;
            if (a === b || q >= 1) { sl.a.style.display = "none"; sl.b.style.translate = "none"; }
            else { sl.a.style.display = "block"; sl.a.style.translate = `0 ${(-100 * q).toFixed(2)}%`; sl.b.style.translate = `0 ${(100 * (1 - q)).toFixed(2)}%`; }
          });
        }
        // the stats read off the ticker
        if (liveStats) {
          const pct = start ? ((shownV - start) / start) * 100 : 0, moved = k ? to - from : 0;
          const a = (pct < 0 ? "−" : "+") + Math.abs(pct).toFixed(2) + "%", b = (moved < 0 ? "−" : "+") + Math.abs(moved).toLocaleString("en-US");
          if (statEls[0].textContent !== a) statEls[0].textContent = a;
          if (statEls[1].textContent !== b) statEls[1].textContent = b;
          statEls[1].style.color = moved < 0 ? "var(--x-bad)" : "var(--x-good)";
        }
        // live dot ping (1 s) and the bar's 4 s pulse
        const ph = ((t - at) % 1 + 1) % 1;
        ping.style.transform = `scale(${(1 + ph * 1.4).toFixed(4)})`;
        ping.style.opacity = (0.75 * (1 - ph)).toFixed(4);
        barFill.style.opacity = (0.75 + 0.25 * Math.cos(((t - at) / 4) * Math.PI * 2)).toFixed(4);
      },
    };
  },
});
