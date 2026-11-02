// Number counts up: the target's numeric run rolls from a start value to its own value with tabular figures, the
// prefix / unit around it kept, its digit system kept (Arabic-Indic stays Arabic-Indic; `digits` can force it), the
// final value exact. A proxy v eases start → value (power2.out 1.0–1.2 s by default; power3.out for a big hero,
// expo.out for punchy, power1.out for calm, power2.inOut for years, none for a steady tick) and each frame writes
// round(v) or v.toFixed(decimals) with en-US grouping (or compact 4.5K, plain, year). Start: `from` (a founding year,
// a nearby value), else `start_fraction` of the value (~0.3 lands fast), else 0. The count lands on the number's
// spoken word when the voice says it. Accents, each a param: a pop (scale 0.4 → 1 back.out(2.2) 0.5 s, or a 0.95 → 1
// settle); a mono caps kicker above, static or typed 25 ms / char with a blinking cursor before the count; a suffix
// ('+', 'K+', '%', 'x') in the accent that pops 0 → 1 back.out(2) as the count ends; its label / sub-line siblings fading up 10 px at 70% of the count, 0.3 s apart; a ' / 100' denominator, small
// and dim; an accent glow; a muted tone (60% ink, for bad news); a final colour change to the accent with a 1.1 → 1
// pop (0.2 s); a 1 px rule drawing under the number from the reading-start side (0.6 s power2.out); a final tick (+1
// as its own beat, the small growth joke). Width never jitters: the number holds its widest width from the start.
// Sources: MotionGX scenes.js S.stat / S.appcapture, live-engine vendor recipes.js R.countUp + kit.js K.count (own);
// prompt-motion apoorvjain25, deifosv, astrodevil, 1stnoel, deebeeeff, reyzostyle (reference only: our own rebuild).
ML.define({
  id: "data.count-up",
  category: "data",
  name: "Number counts up",
  does: "A number rolls up to its value with tabular digits, keeping its unit, prefix and digit system, and its label settles around it.",
  says: ["growth", "proof", "result", "scale"],
  energy: 3,
  targets: ["number", "label"],
  duration: [0.8, 3],
  params: {
    from: { type: "text", default: "" },
    start_fraction: { type: "number", range: [0, 0.9], default: 0 },
    duration: { type: "number", range: [0.8, 2.5], default: 1.2, unit: "s" },
    ease: { type: "choice", options: ["power2.out", "power3.out", "expo.out", "power1.out", "power2.inOut", "none"], default: "power2.out" },
    decimals: { type: "number", range: [0, 2], default: 0 },
    digits: { type: "choice", options: ["auto", "latin", "arabic-indic"], default: "auto" },
    format: { type: "choice", options: ["commas", "compact", "plain", "year"], default: "commas" },
    prefix: { type: "text", default: "" },
    suffix: { type: "text", default: "" },
    suffix_pop: { type: "bool", default: false },
    denominator: { type: "text", default: "" },
    kicker: { type: "choice", options: ["none", "static", "typed"], default: "none" },
    kicker_text: { type: "text", default: "" },
    pop: { type: "choice", options: ["none", "scale-in", "settle"], default: "none" },
    glow: { type: "bool", default: false },
    tone: { type: "choice", options: ["bright", "muted"], default: "bright" },
    final_colour: { type: "bool", default: false },
    underline: { type: "bool", default: false },
    final_tick: { type: "bool", default: false },
    label_settle: { type: "bool", default: true },
  },
  pairs: ["data.bar-chart-grow", "data.before-after-figure"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.stat", license: "own", note: "+ live-engine recipes.js R.countUp, kit.js K.count; prompt-motion references rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const toLatin = (s) => String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
    const own = (el.textContent || "").trim();
    const L = toLatin(own), m = L.match(/-?[\d,]*\.?\d+/);
    if (!m) return null;
    const raw = m[0], target = parseFloat(raw.replace(/,/g, ""));
    const pre = (p.prefix || "") + own.slice(0, m.index), post = own.slice(m.index + raw.length);
    const dec = Math.round(ML.clamp(p.decimals, 0, 2)) || (raw.split(".")[1] || "").length;
    const arDigits = p.digits === "arabic-indic" || (p.digits === "auto" && /[٠-٩]/.test(own));
    const fmtNum = (v) => {
      let s;
      if (p.format === "compact") { const a = Math.abs(v); s = a >= 1e9 ? (v / 1e9).toFixed(1) + "B" : a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e4 ? (v / 1e3).toFixed(1) + "K" : Math.round(v).toLocaleString("en-US"); s = s.replace(/\.0(?=[KMB])/, ""); }
      else if (p.format === "year" || p.format === "plain") s = dec ? v.toFixed(dec) : String(Math.round(v));
      else s = dec ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : Math.round(v).toLocaleString("en-US");
      return arDigits ? s.replace(/\d/g, (d) => AR[d]).replace(/,/g, "٬") : s;
    };
    // start value: `from`, else a fraction of the target, else 0
    const fromV = parseFloat(toLatin(p.from || "").replace(/,/g, ""));
    const start = Number.isFinite(fromV) ? fromV : target * ML.clamp(p.start_fraction, 0, 0.9);
    const E = { "power2.out": (x) => 1 - Math.pow(1 - x, 3), "power3.out": (x) => 1 - Math.pow(1 - x, 4), "expo.out": (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)), "power1.out": (x) => 1 - (1 - x) * (1 - x), "power2.inOut": (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), none: (x) => x }[p.ease] || ((x) => 1 - Math.pow(1 - x, 3));
    // rebuild the slot: [kicker] / [prefix][number][suffix][denominator] / [rule]
    const fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    el.textContent = "";
    const wrap = mk("div", `display:inline-flex;flex-direction:column;align-items:${rtl ? "flex-end" : "flex-start"};gap:${(fs * 0.08).toFixed(1)}px;max-width:100%`, null, el);
    let kick = null;
    const kText = String(p.kicker_text || "").trim();
    if (p.kicker !== "none" && kText) { kick = mk("div", `font-size:${Math.max(16, fs * 0.16).toFixed(1)}px;color:var(--x-dim);white-space:pre`, "", wrap); kick.className = "ml-label"; kick.style.fontSize = Math.max(16, fs * 0.16).toFixed(1) + "px"; }
    const line = mk("div", `display:flex;align-items:baseline;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums;transform-origin:${rtl ? "100%" : "0%"} 70%;color:${p.tone === "muted" ? "color-mix(in srgb, var(--x-ink) 60%, transparent)" : "var(--x-ink)"}`, null, wrap);
    if (pre) mk("span", "", pre, line);
    const num = mk("span", "display:inline-block;text-align:end", fmtNum(target), line);
    if (post) mk("span", `font-size:${p.tone === "muted" ? 0.44 : 0.5}em`, post, line);
    let suf = null;
    if (String(p.suffix || "")) suf = mk("span", `display:inline-block;font-size:0.5em;color:var(--x-accent);margin-inline-start:0.06em;transform-origin:${rtl ? "100%" : "0%"} 80%`, p.suffix, line);
    if (String(p.denominator || "").trim()) mk("span", "font-size:0.3em;color:var(--x-dim);margin-inline-start:0.2em", String(p.denominator).trim(), line);
    let rule = null;
    if (p.underline) rule = mk("i", `display:block;align-self:stretch;height:${Math.max(1, fs * 0.012).toFixed(1)}px;background:var(--x-ink);opacity:.5;transform-origin:${rtl ? "100%" : "0%"} 50%;transform:scaleX(0)`, null, wrap);
    if (p.glow) line.style.textShadow = `0 0 ${(fs * 0.2).toFixed(1)}px color-mix(in srgb, var(--x-accent) 50%, transparent)`;
    // the widest the number gets (start, end, the final tick), held from the first frame so nothing jitters
    const widths = [start, target, target + (p.final_tick ? 1 : 0)].map((v) => { num.textContent = fmtNum(v); return num.offsetWidth; });
    num.style.minWidth = (Math.max(...widths) / fs).toFixed(3) + "em";
    num.textContent = fmtNum(start);
    // fit to the slot's parent
    const room = (el.parentElement ? el.parentElement.clientWidth : 0) * 0.98;
    if (room > 0 && wrap.scrollWidth > room) el.style.fontSize = ((fs * room) / wrap.scrollWidth).toFixed(2) + "px";
    // timing: the kicker types first; the count lands on the number's spoken word when said, else after `duration`
    const dur = ML.clamp(p.duration, 0.8, 2.5);
    const typeEnd = kick && p.kicker === "typed" ? at + Array.from(kText).length * 0.025 : at;
    let c0 = typeEnd + (kick && p.kicker === "typed" ? 0.15 : 0);
    const spoken = ctx.word(raw.replace(/,/g, "").slice(0, 3), -1);
    if (spoken > c0 + dur * 0.6 && spoken < end - 0.4) c0 = spoken - dur;
    const c1 = c0 + dur, tick = c1 + 0.5;
    ctx.sfx(c0, "riser", 0.25);
    ctx.sfx(c1, suf && p.suffix_pop ? "pop" : "tap", 0.3);
    if (p.final_tick) ctx.sfx(tick, "blip", 0.3);
    // the label settles around it: the number's own label / sub-line siblings fade up (y 10 → 0) at 70% of the count, the next 0.3 s later
    const labels = p.label_settle && el.parentElement ? [...el.parentElement.children].filter((c) => c !== el && c.matches(".ml-label, .ml-sub, [data-ml-label]")).slice(0, 2) : [];
    const labelAt = labels.map((_, i) => c0 + dur * 0.7 + i * 0.3);
    const backOut = (x, c) => { const y = x - 1; return x <= 0 ? 0 : 1 + (c + 1) * y * y * y + c * y * y; };
    const p2o = (x) => 1 - Math.pow(1 - x, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        wrap.style.opacity = (1 - leave).toFixed(4);
        // the value
        const u = ML.lin(t, c0, c1);
        let v = u >= 1 ? target : start + (target - start) * E(u);
        if (p.final_tick && t >= tick) v = target + 1;
        num.textContent = fmtNum(v);
        // pop / settle on arrival
        let sc = 1;
        if (p.pop === "scale-in") sc = 0.4 + 0.6 * backOut(ML.lin(t, at, at + 0.5), 2.2);
        else if (p.pop === "settle") sc = 0.95 + 0.05 * p2o(ML.lin(t, at, at + 0.5));
        if (p.final_colour) { const fc = ML.lin(t, c1, c1 + 0.2); if (fc > 0 && fc < 1) sc *= 1.1 - 0.1 * p2o(fc); }
        if (p.final_tick) { const tu = ML.lin(t, tick, tick + 0.2); if (tu > 0 && tu < 1) sc *= 1.04 - 0.04 * p2o(tu); }
        line.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
        line.style.opacity = (p.pop === "scale-in" ? Math.min(1, ML.lin(t, at, at + 0.2)) : ML.lin(t, at - 0.01, at + 0.15)).toFixed(4);
        if (p.final_colour) { const fc = ML.lin(t, c1, c1 + 0.2); line.style.color = fc > 0 ? `color-mix(in srgb, var(--x-accent) ${(fc * 100).toFixed(1)}%, var(--x-ink))` : ""; }
        if (suf) { if (p.suffix_pop) { const s = backOut(ML.lin(t, c1, c1 + 0.35), 2); suf.style.transform = `scale(${Math.max(0, s).toFixed(4)})`; suf.style.opacity = t >= c1 ? "1" : "0"; } }
        if (kick) {
          kick.textContent = p.kicker === "typed" ? ML.typed(kText, t, at, typeEnd) + (t < typeEnd + 0.5 && ML.blink(t, 0.5) ? "▍" : " ") : kText;
          kick.style.opacity = p.kicker === "static" ? ML.lin(t, at, at + 0.25).toFixed(4) : "1";
        }
        labels.forEach((lb, i) => { const a = 1 - Math.pow(1 - ML.lin(t, labelAt[i], labelAt[i] + 0.4), 3); lb.style.opacity = (a * (1 - leave)).toFixed(4); lb.style.translate = `0 ${((1 - a) * 10).toFixed(2)}px`; });
        if (rule) rule.style.transform = `scaleX(${(1 - Math.pow(1 - ML.lin(t, c1 - dur * 0.3, c1 - dur * 0.3 + 0.6), 3)).toFixed(4)})`;
      },
    };
  },
});
