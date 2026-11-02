// Slider / scrubber drag with live readout. A track (thin rail, the accent fill as a share of its width) with a white
// thumb (soft shadow) and ticks every 10 % below that turn accent as the thumb passes. A pointer (optional) glides to the
// thumb (0.4 s power2.inOut); the thumb grows 1.2× while held; thumb and fill travel together over `duration`
// (power2.inOut; power1.inOut for a media scrubber), settling without overshoot. Readouts, counted per frame from the
// same value: a dark rounded bubble above the thumb whose number rolls digit-wise; a side value; a price ("n seats ×
// $x" then the total, tabular figures — the math stays obvious); media times (m:ss elapsed / −remaining, mono, with the
// play icon swapping to pause on the grab: cross-fade + scale 0.8 → 1). Snapping steps the thumb by 10 %.
// Skeuo: a recessed black well (inset 0 1 2), a grey fill, a small domed thumb and a 10 px mono readout ("500mg").
// On a number target, that number is the readout: it counts up to its own value in step with the drag.
// RTL: the track fills from the right. Sources: MengTo/Skills web-design/pricing-page (value-metric slider: keep the
// math obvious) and corner-lasers demo (skeuo dosage slider) (MIT); prompt-motion rossaxbt, twoclipping (reference).
ML.define({
  id: "ui.slider-drag",
  category: "ui",
  name: "Slider / scrubber drag with live readout",
  does: "A slider thumb (or a media scrubber knob) is dragged along its track, the fill follows and a readout — value bubble, price or elapsed time — counts in sync.",
  says: ["growth", "precision", "change", "money", "scale", "choice", "time", "tech", "step"],
  energy: 2,
  targets: ["number", "screen", "card"],
  duration: [0.8, 2.5],
  params: {
    control: { type: "choice", options: ["value-slider", "price-slider", "media-scrubber", "volume"], default: "value-slider" },
    readout: { type: "choice", options: ["bubble", "side-value", "price", "times", "none"], default: "bubble" },
    cursor: { type: "bool", default: true },
    style: { type: "choice", options: ["flat", "skeuo"], default: "flat" },
    steps: { type: "choice", options: ["continuous", "snapping"], default: "continuous" },
    duration: { type: "number", range: [0.6, 1.4], default: 1, unit: "s" },
    from: { type: "number", range: [0, 1], default: 0.2 },
    to: { type: "number", range: [0, 1], default: 0.75 },
    max: { type: "number", range: [10, 1000], default: 100 },
    unit_price: { type: "number", range: [1, 200], default: 12 },
    unit: { type: "text" },
    label: { type: "text" },
  },
  pairs: ["data.count-up", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/pricing-page", license: "MIT", note: "value-metric slider; corner-lasers demo skeuo dosage slider (MIT); prompt-motion rossaxbt-94583b, twoclipping-opus-5-5-is-f-cking rebuilt as our own code (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080;
    const px = (v) => (v * k).toFixed(2) + "px";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const C = p.control, skeuo = p.style === "skeuo";
    const lum = (() => { const q = mk("div", "display:none;color:var(--x-panel);", ctx.scene || ctx.stage), c = (getComputedStyle(q).color.match(/[\d.]+/g) || []).slice(0, 3).map(Number); q.remove(); const m = Math.max(...c, 0) > 1 ? 255 : 1; return (0.3 * (c[0] || 0) + 0.59 * (c[1] || 0) + 0.11 * (c[2] || 0)) / m; })();
    // the look's own light and shade: never its ink as a shadow (on a dark look the ink is light)
    const dk = lum < 0.4, shade = "var(--x-device)", light = dk ? "var(--x-ink)" : "var(--x-panel)";

    // a number target is the readout itself
    let numEl = null, numN = 0, numFmt = null;
    // (only a bare number: a card that merely contains digits keeps its contents)
    if (el && el.childElementCount === 0 && /^[^\d٠-٩]{0,6}[\d٠-٩][\d٠-٩,٬.]*[^\d٠-٩]{0,8}$/.test((el.textContent || "").trim())) {
      const raw = el.textContent.trim();
      const ar = /[٠-٩]/.test(raw);
      const latin = raw.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٬]/g, ",");
      const m = latin.match(/[\d,]*\.?\d+/);
      if (m) {
        numEl = el; numN = parseFloat(m[0].replace(/,/g, ""));
        const dec = (m[0].split(".")[1] || "").length, comma = m[0].includes(",");
        const pre = latin.slice(0, m.index), post = latin.slice(m.index + m[0].length);
        numFmt = (v) => { let s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); s = pre + s + post; return ar ? s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]).replace(/,/g, "٬") : s; };
        el.style.fontVariantNumeric = "tabular-nums";
      }
    }

    // where the widget sits: under a number target, inside a card / screen target, else the picture region
    let wrap, W, centred = false;
    if (numEl) {
      const b = ctx.box(numEl);
      W = Math.min(f.pic.w, Math.max(b.w, f.pic.w * 0.62));
      const x = ML.clamp(b.x + b.w / 2 - W / 2, f.safe.x, f.safe.x + f.safe.w - W);
      wrap = mk("div", `position:absolute;left:${x.toFixed(1)}px;top:${(b.y + b.h + 24 * k).toFixed(1)}px;width:${W.toFixed(1)}px;z-index:6;`, host);
    } else if (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      W = Math.min(el.clientWidth * 0.9, 900 * k) || f.pic.w * 0.8;
      wrap = mk("div", `position:absolute;left:50%;top:50%;width:${W.toFixed(1)}px;translate:-50% -50%;z-index:6;`, el);
      centred = true;
    } else {
      W = Math.min(f.pic.w * 0.9, 860 * k);
      wrap = mk("div", `position:absolute;left:${(f.pic.x + (f.pic.w - W) / 2).toFixed(1)}px;top:${(f.pic.y + f.pic.h * 0.4).toFixed(1)}px;width:${W.toFixed(1)}px;z-index:6;`, host);
    }
    wrap.style.pointerEvents = "none";
    const card = mk("div", `box-sizing:border-box;width:100%;padding:${px(36)} ${px(40)};border-radius:calc(var(--x-radius) * 0.7);${skeuo ? `background:linear-gradient(180deg, color-mix(in srgb, ${shade} 80%, var(--x-panel)), color-mix(in srgb, ${shade} 90%, var(--x-panel)));box-shadow:inset 0 ${px(1)} 0 color-mix(in srgb, ${light} 8%, transparent), var(--x-shadow);color:${light};` : "background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);color:var(--x-ink);"}display:flex;flex-direction:column;gap:${px(26)};`, wrap);
    card.dir = rtl ? "rtl" : "ltr";
    if (numEl) card.style.paddingTop = card.style.paddingBottom = px(28);

    // the metric each control reads
    const max = Math.round(p.max), price = p.unit_price;
    const labels = {
      "value-slider": p.label || (skeuo ? (rtl ? "الجرعة" : "NMN Dosage") : rtl ? "حجم الفريق" : "Team size"),
      "price-slider": p.label || (rtl ? "عدد المستخدمين" : "Seats"),
      "media-scrubber": p.label || (rtl ? "الحلقة ١٢ — البداية" : "Episode 12 — The start"),
      volume: p.label || (rtl ? "الصوت" : "Volume"),
    };
    const unit = p.unit != null && p.unit !== "" ? p.unit : skeuo && C === "value-slider" ? "mg" : C === "volume" ? "%" : "";
    const TOTAL = 204; // a 3:24 clip
    const metric = (v) => (C === "price-slider" ? Math.max(1, Math.round(v * max)) : C === "media-scrubber" ? v * TOTAL : C === "volume" ? v * 100 : skeuo && C === "value-slider" && !p.unit ? v * 1000 : v * max);
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const fmt = (v) => (C === "media-scrubber" ? mmss(metric(v)) : String(Math.round(metric(v))) + unit);
    const money = (n) => "$" + n.toLocaleString("en-US");

    // header: label + side value / price
    let side = null;
    const showSide = p.readout === "side-value" || p.readout === "price" || (C === "price-slider" && p.readout !== "none" && p.readout !== "bubble");
    // (skeuo sets the side value in its small mono; only one readout at a time: no bubble and side both saying the same)
    if (C !== "media-scrubber" || p.readout === "side-value") {
      const head = mk("div", `display:flex;align-items:baseline;justify-content:space-between;gap:${px(20)};`, card);
      mk("span", skeuo ? `font:600 ${px(22)} var(--x-mono-font);letter-spacing:${rtl ? 0 : ".14em"};text-transform:${rtl ? "none" : "uppercase"};color:color-mix(in srgb, ${light} 55%, transparent);` : `font:500 ${px(30)} var(--x-body-font);color:var(--x-dim);`, head, labels[C]);
      if (showSide) side = mk("span", `direction:ltr;font:${skeuo ? `600 ${px(24)} var(--x-mono-font)` : `700 ${px(p.readout === "price" || C === "price-slider" ? 40 : 34)} var(--x-head-font)`};font-variant-numeric:tabular-nums;white-space:nowrap;`, head);
    }

    // the track row
    const row = mk("div", `display:flex;align-items:center;gap:${px(22)};`, card);
    let playBtn = null, playIc = null, pauseIc = null;
    if (C === "media-scrubber") {
      playBtn = mk("div", `position:relative;flex:none;width:${px(64)};height:${px(64)};border-radius:50%;background:${skeuo ? light : "var(--x-ink)"};`, row);
      const ic = (d) => { const s = sv("svg", { viewBox: "0 0 24 24", width: px(30), height: px(30), style: "position:absolute;left:50%;top:50%;translate:-50% -50%;" }, playBtn); sv("path", { d, fill: skeuo ? shade : "var(--x-panel)" }, s); return s; };
      playIc = ic(rtl ? "M17 5 L17 19 L6 12 Z" : "M7 5 L7 19 L18 12 Z"); pauseIc = ic("M6 5 H10 V19 H6 Z M14 5 H18 V19 H14 Z");
    }
    if (C === "volume") {
      const s = sv("svg", { viewBox: "0 0 24 24", width: px(44), height: px(44), style: `flex:none;${rtl ? "transform:scaleX(-1);" : ""}` }, row);
      sv("path", { d: "M3 9 H7 L12 5 V19 L7 15 H3 Z", fill: "currentColor" }, s);
      sv("path", { d: "M15.5 8.5 Q18 12 15.5 15.5 M18 6 Q22 12 18 18", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" }, s);
    }
    const thumbD = (skeuo ? 26 : C === "media-scrubber" ? 26 : 40) * k;
    const railH = (skeuo ? 7 : C === "media-scrubber" ? 6 : 10) * k;
    const trackBox = mk("div", `position:relative;flex:1;height:${(thumbD * 1.3).toFixed(1)}px;`, row);
    const rail = mk("div", `position:absolute;left:0;right:0;top:50%;height:${railH.toFixed(2)}px;margin-top:${(-railH / 2).toFixed(2)}px;border-radius:99px;${skeuo ? `background:${shade};box-shadow:inset 0 ${px(1)} ${px(2)} ${shade}, 0 ${px(1)} 0 color-mix(in srgb, ${light} 8%, transparent);` : `background:color-mix(in srgb, var(--x-ink) 12%, transparent);`}overflow:hidden;`, trackBox);
    const fill = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "right" : "left"}:0;width:100%;border-radius:99px;background:${skeuo ? `color-mix(in srgb, ${light} 45%, ${shade})` : "var(--x-accent)"};transform-origin:${rtl ? "100%" : "0"} 50%;`, rail);
    const ticks = [];
    if (C !== "media-scrubber") for (let i = 0; i <= 10; i++) ticks.push(mk("span", `position:absolute;top:100%;${rtl ? "right" : "left"}:${i * 10}%;width:${Math.max(1.5, 2 * k).toFixed(1)}px;height:${px(i % 5 ? 10 : 16)};margin-${rtl ? "right" : "left"}:${(-k).toFixed(1)}px;background:color-mix(in srgb, currentColor 25%, transparent);border-radius:1px;`, trackBox));
    const thumb = mk("div", `position:absolute;top:50%;left:0;width:${thumbD.toFixed(1)}px;height:${thumbD.toFixed(1)}px;margin:${(-thumbD / 2).toFixed(1)}px 0 0 ${(-thumbD / 2).toFixed(1)}px;border-radius:50%;box-sizing:border-box;${skeuo ? `background:radial-gradient(circle at 40% 30%, ${light}, color-mix(in srgb, ${light} 70%, ${shade}));border:${Math.max(1, k).toFixed(1)}px solid ${shade};box-shadow:0 ${px(2)} ${px(4)} color-mix(in srgb, ${shade} 50%, transparent), inset 0 ${px(1)} ${px(1)} color-mix(in srgb, ${light} 80%, transparent);` : `background:${light};border:${Math.max(1, k * 1.5).toFixed(1)}px solid color-mix(in srgb, ${shade} 10%, transparent);box-shadow:0 ${px(2)} ${px(6)} color-mix(in srgb, ${shade} 25%, transparent), 0 ${px(8)} ${px(20)} color-mix(in srgb, ${shade} 12%, transparent);`}`, trackBox);

    // bubble above the thumb, digits rolling
    let bubble = null, rollA = null, rollB = null, lineH = 0;
    if (p.readout === "bubble" && !numEl && C !== "media-scrubber") { // (a scrubber reads in its times row)
      lineH = 40 * k;
      trackBox.style.marginTop = px(32); // the bubble rides above the rail: clear of the label
      bubble = mk("div", `position:absolute;left:0;bottom:calc(50% + ${(thumbD * 0.5 + 16 * k).toFixed(1)}px);translate:-50% 0;padding:0 ${px(16)};height:${lineH.toFixed(1)}px;border-radius:${px(12)};background:var(--x-ink);color:var(--x-panel);overflow:hidden;font:700 ${px(26)}/${lineH.toFixed(1)}px var(--x-body-font);font-variant-numeric:tabular-nums;white-space:nowrap;direction:ltr;`, trackBox);
      const col = mk("div", "display:flex;flex-direction:column;align-items:center;", bubble);
      rollA = mk("span", `height:${lineH.toFixed(1)}px;`, col); rollB = mk("span", `height:${lineH.toFixed(1)}px;`, col);
      bubble._col = col;
      mk("span", `position:absolute;left:50%;bottom:${px(-6)};width:${px(12)};height:${px(12)};margin-left:${px(-6)};background:var(--x-ink);rotate:45deg;`, bubble).style.display = "none";
    }
    // media times
    let tEl = null, tRem = null;
    if (C === "media-scrubber" && p.readout !== "none") {
      const tr = mk("div", `display:flex;justify-content:space-between;direction:ltr;font:500 ${px(22)} var(--x-mono-font);color:${skeuo ? `color-mix(in srgb, ${light} 60%, transparent)` : "var(--x-dim)"};font-variant-numeric:tabular-nums;margin-top:${px(-12)};`, card);
      tEl = mk("span", "", tr); tRem = mk("span", "", tr);
      if (rtl) tr.style.flexDirection = "row-reverse";
    }

    // the drag
    const v0 = ML.clamp(p.from), v1 = ML.clamp(p.to);
    const tGrab = at + (p.cursor ? 0.45 : 0.15);
    const d0 = tGrab + 0.08, dur = Math.max(0.4, Math.min(p.duration, end - d0 - 0.35));
    const easeF = C === "media-scrubber" ? (x) => (1 - Math.cos(Math.PI * x)) / 2 : (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const snap = p.steps === "snapping";
    const raw = (t) => v0 + (v1 - v0) * easeF(ML.lin(t, d0, d0 + dur));
    const val = (t) => (snap ? Math.round(raw(t) * 10) / 10 : raw(t));
    ctx.sfx(tGrab, "click", 0.45);
    if (snap) { let last = Math.round(v0 * 10), lt = -1; for (let s = d0; s <= d0 + dur; s += 1 / 60) { const n = Math.round(raw(s) * 10); if (n !== last && s - lt > 0.12) { ctx.sfx(s, "tap", 0.14); lt = s; } last = n; } }
    else ctx.sfx(d0 + dur, "tap", 0.2);

    // the pointer (mac arrow, anchored at its tip)
    let ptr = null;
    const TW = trackBox.offsetWidth;
    if (p.cursor) {
      const cs = 56 * k;
      ptr = sv("svg", { viewBox: "0 0 24 24", width: cs.toFixed(1), height: cs.toFixed(1), style: `position:absolute;left:0;top:0;margin:${(-cs * 2 / 24).toFixed(1)}px 0 0 ${(-cs * 5 / 24).toFixed(1)}px;overflow:visible;z-index:12;filter:drop-shadow(0 ${px(3)} ${px(4)} color-mix(in srgb, ${shade} 30%, transparent));` }, host);
      sv("path", { d: "M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z", fill: "var(--x-pointer)", stroke: "var(--x-pointer-edge)", "stroke-width": 1.4, "stroke-linejoin": "round" }, ptr);
    }
    const trackOrigin = () => { const b = ctx.box(trackBox); return { x: b.x, y: b.y + b.h / 2 }; };
    const O = trackOrigin();
    const xAt = (v) => (rtl ? (1 - v) * TW : v * TW);
    const start = { x: rtl ? f.W * 0.1 : f.W * 0.9, y: f.H * 0.95 };

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const e = ML.out(t, at, at + 0.35);
        wrap.style.opacity = (t < at ? 0 : e * (1 - leave)).toFixed(4);
        wrap.style.translate = centred ? `-50% calc(-50% + ${((1 - e) * 16 * k).toFixed(2)}px)` : `0 ${((1 - e) * 16 * k).toFixed(2)}px`;
        const v = val(t), held = ML.lin(t, tGrab - 0.06, tGrab + 0.06) * (1 - ML.lin(t, d0 + dur + 0.05, d0 + dur + 0.2));
        fill.style.scale = `${v.toFixed(4)} 1`;
        thumb.style.translate = `${xAt(v).toFixed(2)}px 0`;
        thumb.style.scale = (1 + 0.2 * held).toFixed(4);
        ticks.forEach((tk, i) => { tk.style.background = i / 10 <= v + 1e-6 ? (skeuo ? `color-mix(in srgb, ${light} 60%, transparent)` : "var(--x-accent)") : "color-mix(in srgb, currentColor 25%, transparent)"; });
        if (bubble) {
          bubble.style.left = xAt(v).toFixed(2) + "px";
          const m = metric(v);
          const cur = Math.floor(m), fr = snap ? 0 : m - cur;
          const a = String(cur) + unit, b = String(cur + 1) + unit;
          if (rollA.textContent !== a) rollA.textContent = a;
          if (rollB.textContent !== b) rollB.textContent = b;
          const roll = fr > 0.6 ? ML.ease(fr, 0.6, 1) : 0;
          bubble._col.style.translate = `0 ${(-roll * lineH).toFixed(2)}px`;
          bubble.style.scale = (0.9 + 0.1 * ML.lin(t, tGrab - 0.06, tGrab + 0.06)).toFixed(4);
        }
        if (side) {
          let s;
          if (C === "price-slider" || p.readout === "price") { const n = Math.max(1, Math.round(metric(v))); s = C === "price-slider" ? `${n} × ${money(price)} = ${money(n * price)}` : money(Math.round(metric(v) * price)); }
          else s = fmt(v);
          if (side.textContent !== s) side.textContent = s;
        }
        if (numEl) { const s = numFmt(Math.round(numN * (v1 > 0 ? v / v1 : v))); if (numEl.textContent !== s) numEl.textContent = s; }
        if (tEl) { const s = mmss(v * TOTAL), r = "-" + mmss(TOTAL - v * TOTAL); if (tEl.textContent !== s) tEl.textContent = s; if (tRem.textContent !== r) tRem.textContent = r; }
        if (playBtn) { const sw = ML.ease(t, tGrab, tGrab + 0.2); playIc.style.opacity = (1 - sw).toFixed(4); pauseIc.style.opacity = sw.toFixed(4); pauseIc.style.scale = (0.8 + 0.2 * sw).toFixed(4); }
        if (ptr) {
          const g = ML.ease(t, tGrab - 0.4, tGrab);
          const tx = O.x + xAt(v), ty = O.y;
          const x = start.x + (tx - start.x) * g, y = start.y + (ty - start.y) * g;
          const away = ML.lin(t, d0 + dur + 0.25, d0 + dur + 0.55);
          ptr.style.translate = `${(x + away * 30 * k * (rtl ? -1 : 1)).toFixed(2)}px ${(y + away * 50 * k).toFixed(2)}px`;
          ptr.style.scale = (1 - 0.1 * held).toFixed(4);
          ptr.style.opacity = (t < tGrab - 0.45 ? 0 : ML.lin(t, tGrab - 0.45, tGrab - 0.3) * (1 - away) * (1 - leave)).toFixed(4);
        }
      },
    };
  },
});
