// Slider set: a slider handle glides along its track to a value while the fill grows behind it and the readout updates.
// Skeuo (high-contrast skeuomorphic): a 6 px recessed track (deep groove, inset 0 1px 3px shade, full radius), a fill
// from the accent's darker shade to its light one with an inset highlight, a 14 px knob (panel → panel-2 gradient,
// a ring, a drop shadow + inset bottom shade) centred on the fill end; fill and knob travel together 0 → value over 1 s
// power2.inOut; mono time labels at either end (elapsed, −remaining) update; LIVE mode: fill at 100% with a glowing
// mono LIVE. Tick-scale (company-logos): a 4 px hairline track, an 8 × 16 px ink thumb with a ground glow, 5–11 ticks
// above alternating 8 / 4 px, a readout "Threshold 84%"; the thumb runs 0 → value over .9 s power3.out with the readout
// counting in sync, then a tiny ±1% settle. Horizontal fills from the reading start (right in Arabic); vertical rises.
// On a number the slot becomes the readout (counting to its own figure) with the slider under it; on a chart / label
// or with no target the slider and its readout are built in the picture region.
// Sources: MengTo/Skills web-design/high-contrast-skeuomorphic-clean + web-design/company-logos demos (MIT).
ML.define({
  id: "data.slider-set",
  category: "data",
  name: "Slider glides to a value",
  does: "A slider handle glides along its track to a value while the fill grows behind it and the readout updates.",
  says: ["precision", "choice", "change", "time"],
  energy: 2,
  targets: ["number", "chart", "label"],
  duration: [1, 3],
  params: {
    style: { type: "choice", options: ["skeuo", "tick-scale"], default: "skeuo" },
    value: { type: "number", range: [0, 1], default: 0.84 },
    duration: { type: "number", range: [0.6, 1.5], default: 1, unit: "s" },
    ticks: { type: "number", range: [0, 11], default: 5 },
    orientation: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    live: { type: "bool", default: false },
    total: { type: "number", range: [10, 7200], default: 225, unit: "s" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.ringed-stat", "ui.cursor-glide-click"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/high-contrast-skeuomorphic-clean + web-design/company-logos", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const u = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const skeuo = p.style !== "tick-scale", vert = p.orientation === "vertical";
    const value = p.live && skeuo ? 1 : ML.clamp(+p.value, 0, 1);
    const dur = ML.clamp(+p.duration, 0.6, 1.5);
    const isAr = rtl;
    // the readout: the number slot counting to its own figure, else a built line
    const ownText = el ? (el.textContent || "").trim() : "";
    const ownNum = parseFloat(ownText.replace(/[^\d.]/g, ""));
    const isNumber = el && el.children.length === 0 && Number.isFinite(ownNum) && /^[\d.,\s%$€£]+$/.test(ownText);
    let wrap, readout = null, readFmt;
    if (el && isNumber) {
      el.textContent = "";
      Object.assign(el.style, { display: "flex", flexDirection: vert ? "row" : "column", alignItems: vert ? "center" : "flex-start", gap: `${(vert ? 40 : 22) * u}px` });
      wrap = el;
      readout = mk("div", "font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;white-space:nowrap", wrap, ownText);
      const dec = (ownText.match(/\.(\d+)/) || [, ""])[1].length;
      readFmt = (q) => ownText.replace(/[\d][\d.,]*/, (ownNum * q).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
    } else {
      const box = el && el.offsetHeight > 120 * u ? ctx.box(el) : f.pic, hb = ctx.box(ctx.scene || stage);
      wrap = mk("div", `position:absolute;left:${box.x + box.w / 2 - hb.x}px;top:${box.y + box.h / 2 - hb.y}px;translate:-50% -50%;display:flex;flex-direction:${vert ? "row" : "column"};align-items:center;gap:${22 * u}px;z-index:20`, ctx.scene || stage);
    }
    // the slider's length: most of its host's width (or a share of the stage's height when vertical)
    const L = vert ? Math.round(Math.min(f.H * 0.32, 520 * u)) : Math.round(Math.min((el && isNumber ? el.clientWidth : f.pic.w) * 0.86, 900 * u));
    const th = (skeuo ? 6 : 4) * u * 2.2; // track thickness on a 1080 stage
    const knob = skeuo ? 14 * u * 2.4 : 0;
    const slider = mk("div", `position:relative;${vert ? `width:${Math.max(knob, 40 * u)}px;height:${L}px` : `width:${L}px;height:${Math.max(knob, 30 * u) + (skeuo ? 0 : 26 * u)}px`};flex:none`, wrap);
    const track = mk("div", `position:absolute;border-radius:${skeuo ? "999px" : `${2 * u}px`}`, slider);
    if (vert) Object.assign(track.style, { left: "50%", width: th + "px", marginLeft: -th / 2 + "px", top: "0", bottom: "0" });
    else Object.assign(track.style, { left: "0", right: "0", height: th + "px", bottom: skeuo ? `calc(50% - ${th / 2}px)` : `${8 * u}px` });
    if (skeuo) {
      track.style.background = "var(--x-device)";
      track.style.boxShadow = `inset 0 ${u}px ${3 * u}px color-mix(in srgb, var(--x-device) 80%, transparent), 0 0 0 ${Math.max(1, u)}px color-mix(in srgb, var(--x-ink) 70%, var(--x-ground))`;
    } else {
      track.style.background = "color-mix(in srgb, var(--x-ink) 10%, transparent)";
      track.style.boxShadow = `0 ${u}px 0 color-mix(in srgb, var(--x-ground) 80%, transparent)`;
    }
    const fill = mk("div", `position:absolute;border-radius:inherit`, track);
    const from = vert ? "bottom" : rtl ? "right" : "left";
    if (vert) Object.assign(fill.style, { left: "0", right: "0", bottom: "0" });
    else Object.assign(fill.style, { top: "0", bottom: "0", [from]: "0" });
    if (skeuo) {
      fill.style.background = `linear-gradient(${vert ? "0deg" : rtl ? "270deg" : "90deg"}, color-mix(in srgb, var(--x-accent) 75%, var(--x-device)), var(--x-accent-2))`;
      fill.style.boxShadow = `inset 0 ${u}px 0 color-mix(in srgb, var(--x-accent-ink) 35%, transparent)`;
    } else fill.style.background = "var(--x-ink)";
    if (skeuo && p.live) fill.style.boxShadow += `, 0 0 ${10 * u}px color-mix(in srgb, var(--x-accent) 60%, transparent)`;
    // the handle
    const hw = skeuo ? knob : 8 * u * 2.2, hh = skeuo ? knob : 16 * u * 2.2;
    const handle = mk("div", `position:absolute;width:${vert ? hh : hw}px;height:${vert ? hw : hh}px;border-radius:${skeuo ? "50%" : `${2 * u * 2}px`}`, slider);
    if (skeuo) {
      handle.style.background = "linear-gradient(180deg, var(--x-panel), var(--x-panel-2))";
      handle.style.boxShadow = `0 0 0 ${Math.max(1, u * 1.5)}px color-mix(in srgb, var(--x-ink) 45%, var(--x-panel)), 0 ${2 * u}px ${6 * u}px color-mix(in srgb, var(--x-device) 45%, transparent), inset 0 -${u}px ${u}px color-mix(in srgb, var(--x-device) 20%, transparent)`;
    } else {
      handle.style.background = "var(--x-ink)";
      handle.style.boxShadow = `0 0 0 ${2 * u}px var(--x-ground), 0 0 ${10 * u}px color-mix(in srgb, var(--x-ground) 90%, transparent)`;
    }
    const trackMid = vert ? null : skeuo ? null : slider.offsetHeight - 8 * u - th / 2;
    if (vert) handle.style.left = `calc(50% - ${hh / 2}px)`;
    else handle.style.top = skeuo ? `calc(50% - ${hh / 2}px)` : `${trackMid - hh / 2}px`;
    // tick-scale: ticks above the track, alternating long / short
    const nt = Math.round(ML.clamp(p.ticks, 0, 11));
    if (!skeuo && nt > 1) for (let i = 0; i < nt; i++) {
      const tk = mk("i", `position:absolute;display:block;background:color-mix(in srgb, var(--x-ink) 35%, transparent)`, slider);
      const long = i % 2 === 0, len = (long ? 8 : 4) * u * 2;
      const at01 = i / (nt - 1);
      if (vert) Object.assign(tk.style, { width: len + "px", height: Math.max(1, u * 1.5) + "px", bottom: `calc(${(at01 * 100).toFixed(2)}% - ${u}px)`, [rtl ? "left" : "right"]: `calc(50% + ${th / 2 + 6 * u}px)` });
      else Object.assign(tk.style, { height: len + "px", width: Math.max(1, u * 1.5) + "px", [from]: `calc(${(at01 * 100).toFixed(2)}% - ${u}px)`, top: `${trackMid - th / 2 - 6 * u - len}px` });
    }
    // labels: skeuo → elapsed / −remaining (or LIVE); tick-scale → "Threshold 84%" (when not counting the slot)
    const mono = `font:var(--x-label-weight) ${Math.round(24 * u)}px var(--x-mono-font);color:var(--x-dim);font-variant-numeric:tabular-nums;white-space:nowrap;direction:ltr`;
    const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    let left = null, right = null, live = null, line = null;
    const total = Math.max(10, +p.total || 225);
    if (skeuo) {
      const row = mk("div", `display:flex;justify-content:space-between;${vert ? `flex-direction:column-reverse;height:${L}px` : `width:${L}px`};flex:none;direction:${rtl && !vert ? "rtl" : "ltr"}`, wrap);
      if (p.live) {
        live = mk("span", `${mono};color:var(--x-accent);text-shadow:0 0 ${10 * u}px color-mix(in srgb, var(--x-accent) 70%, transparent);letter-spacing:.2em`, row, isAr ? "مباشر" : "LIVE");
        if (isAr) live.style.letterSpacing = "0";
      } else {
        left = mk("span", mono, row, clock(0));
        right = mk("span", mono, row, "-" + clock(total));
      }
    } else if (!readout) {
      const name = p.label || (isAr ? "الحدّ" : "Threshold");
      line = mk("div", `font:var(--x-body-weight) ${Math.round(32 * u)}px var(--x-body-font);color:var(--x-ink);white-space:nowrap;direction:${isAr ? "rtl" : "ltr"}`, wrap);
      mk("span", "color:var(--x-dim)", line, name + " ");
      readout = mk("span", "font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate", line, "0%");
      readFmt = (q) => `${Math.round(value * q * 100)}%`;
      wrap.insertBefore(line, slider);
    }
    if (skeuo && !readout) { // a skeuo slider with no number slot still says its value, above the track
      line = mk("div", `font:var(--x-body-weight) ${Math.round(32 * u)}px var(--x-body-font);color:var(--x-ink);white-space:nowrap;direction:${isAr ? "rtl" : "ltr"}`, null);
      if (p.label) mk("span", "color:var(--x-dim)", line, p.label + " ");
      readout = mk("span", "font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate", line, "0%");
      readFmt = (q) => (p.live ? (isAr ? "بثّ مباشر" : "Live") : `${Math.round(value * q * 100)}%`);
      wrap.insertBefore(line, slider);
    }

    // motion: skeuo power2.inOut over `duration`; tick-scale power3.out over .9 × duration, then a tiny ±1% settle
    const a0 = at + 0.2;
    const pos = (t) => {
      if (skeuo) { const x = ML.lin(t, a0, a0 + dur); return value * (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); }
      const d = 0.9 * dur, x = ML.lin(t, a0, a0 + d), base = value * (1 - Math.pow(1 - x, 3));
      const tau = t - (a0 + d * 0.7);
      const settle = tau > 0 ? 0.012 * Math.sin((tau / 0.32) * Math.PI * 2) * Math.exp(-tau / 0.18) : 0;
      return ML.clamp(base + settle * ML.lin(t, a0 + d * 0.7, a0 + d * 0.8), 0, 1);
    };
    ctx.sfx(a0, "click", 0.3);
    ctx.sfx(a0 + dur * (skeuo ? 1 : 0.9), "tap", 0.22);
    const ext = vert ? L : L;
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2), inn = ML.out(t, at, at + 0.3);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        wrap.style.opacity = (inn * (1 - leave)).toFixed(4);
        const v = pos(t), q = value > 0 ? v / value : ML.lin(t, a0, a0 + dur);
        const px = v * ext;
        if (vert) { fill.style.height = px.toFixed(2) + "px"; handle.style.bottom = (px - hw / 2).toFixed(2) + "px"; }
        else { fill.style.width = px.toFixed(2) + "px"; handle.style[from] = (px - hw / 2).toFixed(2) + "px"; }
        if (readout) { const s = readFmt(Math.min(1, q)); if (readout.textContent !== s) readout.textContent = s; }
        if (left) { left.textContent = clock(total * v); right.textContent = "-" + clock(total * (1 - v)); }
        if (live) live.style.opacity = (0.75 + 0.25 * Math.cos(t * Math.PI * 2 * 0.8)).toFixed(3);
      },
    };
  },
});
