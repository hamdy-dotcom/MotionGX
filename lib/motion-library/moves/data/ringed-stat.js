// Ringed stat: a number sits in a round dial while thin dashed tick rings turn slowly around it. Light: a panel disc,
// 1 px edge, soft shadow, a dashed ring inset 8% turning 360°/20 s; serif value + small mono unit. Dark: an inverted
// disc (linear-gradient 135° from a lifted ink to ink), inset shade + faint ground highlight + an accent outer glow; SVG
// rings on a 100 viewBox — r 46 ground/10 dasharray "2 4" turning +360°/20 s, r 42 accent/30 dasharray "1 8" turning
// −360°/30 s; light value + muted unit + a tiny mono uppercase accent label. In video the value counts 0 → target over
// ~1 s power2.out while the rings spin up (360°/3 s) and ease back to their slow rate; the spin is integrated in closed
// form, so the angle at t is always the same. An optional progress arc draws to the value's share.
// Sources: MengTo/Skills web-design/company-logos (the light dial) and web-design/corner-lasers (the dark disc) (MIT).
ML.define({
  id: "data.ringed-stat",
  category: "data",
  name: "Stat inside turning rings",
  does: "A number sits in a round dial while thin dashed tick rings turn slowly around it, counting up as it appears.",
  says: ["growth", "money", "precision", "result", "tech", "proof"],
  energy: 2,
  targets: ["number", "chart", "card"],
  duration: [1.2, 6],
  params: {
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    rings: { type: "number", range: [1, 3], default: 1 },
    ring_style: { type: "choice", options: ["dashed", "ticks"], default: "dashed" },
    count_up: { type: "bool", default: true },
    progress_arc: { type: "bool", default: false },
    value_type: { type: "choice", options: ["percent", "rate", "count"], default: "percent" },
    value: { type: "number", range: [0, 100000000], default: 0 },
    unit: { type: "text", default: "" },
    label: { type: "text", default: "" },
  },
  pairs: ["data.spec-rows", "data.slider-set"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/company-logos + web-design/corner-lasers", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const dark = p.theme === "dark";

    // the figure: the param, else the slot's own number, else the technique's sample
    const ownText = el ? (el.textContent || "").trim() : "";
    const ownNum = parseFloat(ownText.replace(/[^\d.]/g, ""));
    const goal = +p.value > 0 ? +p.value : Number.isFinite(ownNum) ? ownNum : p.value_type === "count" ? 1280 : p.value_type === "rate" ? 4.2 : 98.4;
    const srcDec = (ownText.match(/\.(\d+)/) || [, ""])[1].length;
    const dec = +p.value > 0 ? (String(p.value).split(".")[1] || "").length : Number.isFinite(ownNum) ? srcDec : 1;
    const fmt = (v) => (p.value_type === "count" ? Math.round(v).toLocaleString("en-US") : v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
    const pct = p.value_type === "percent" && goal <= 100;
    const unit = p.unit || (pct ? "%" : p.value_type === "rate" ? (rtl ? "سنويًا" : "APY") : "");

    // the dial's size: a share of the stage, at least twice the slot's line
    const D = Math.round(Math.max(dark ? 300 * u : 260 * u, el ? Math.min(el.offsetHeight * 1.9, 340 * u) : 0));
    let host, dial;
    if (el) {
      el.textContent = "";
      el.style.display = "flex";
      el.style.justifyContent = el.closest(".ml-head") ? "center" : "flex-start";
      el.style.alignItems = "center";
      host = el;
      dial = mk("div", `position:relative;width:${D}px;height:${D}px;flex:none`, host);
    } else {
      host = ctx.scene || stage;
      dial = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2 - D / 2}px;top:${f.pic.y + f.pic.h / 2 - D / 2}px;width:${D}px;height:${D}px;z-index:20`, host);
    }
    dial.style.willChange = "opacity, translate"; // always its own layer: the same pixels whatever frame came before
    const disc = mk("div", `position:absolute;inset:0;border-radius:50%;overflow:hidden`, dial);
    if (dark) {
      disc.style.background = "linear-gradient(135deg, color-mix(in srgb, var(--x-ink) 55%, var(--x-ground)) 2%, var(--x-ink) 40%)";
      disc.style.boxShadow = `inset 0 ${2 * u}px ${4 * u}px color-mix(in srgb, var(--x-device) 50%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--x-ground) 6%, transparent), 0 0 ${40 * u}px color-mix(in srgb, var(--x-accent) 22%, transparent)`;
      mk("div", `position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 ${40 * u}px color-mix(in srgb, var(--x-accent) 14%, transparent)`, disc);
    } else {
      disc.style.background = "var(--x-panel)";
      disc.style.border = "var(--x-edge) solid var(--x-edge-color)";
      disc.style.boxShadow = "var(--x-shadow)";
    }
    // rings on a 100 viewBox; each one turns around the centre
    const svg = sv("svg", { viewBox: "0 0 100 100", width: D, height: D });
    svg.style.cssText = "position:absolute;inset:0;overflow:visible;pointer-events:none";
    dial.append(svg);
    const ticks = p.ring_style === "ticks";
    const n = Math.round(ML.clamp(p.rings, 1, 3));
    const specs = [
      { r: dark ? 46 : 42, dir: 1, period: 20, col: dark ? "color-mix(in srgb, var(--x-ground) 22%, transparent)" : "color-mix(in srgb, var(--x-ink) 30%, transparent)", w: 0.5, dash: ticks ? "0.5 2.6" : "2 4", tw: 2.4 },
      { r: dark ? 42 : 38, dir: -1, period: 30, col: dark ? "color-mix(in srgb, var(--x-accent) 55%, transparent)" : "color-mix(in srgb, var(--x-accent) 55%, transparent)", w: 0.4, dash: ticks ? "0.4 3.6" : "1 8", tw: 1.8 },
      { r: dark ? 38 : 34, dir: 1, period: 40, col: dark ? "color-mix(in srgb, var(--x-ground) 14%, transparent)" : "color-mix(in srgb, var(--x-ink) 18%, transparent)", w: 0.35, dash: ticks ? "0.3 1.6" : "0.6 3", tw: 1.4 },
    ].slice(0, n);
    const rings = specs.map((s) => {
      const c = sv("circle", { cx: 50, cy: 50, r: s.r, fill: "none" }, svg);
      c.setAttribute("style", `stroke:${s.col};stroke-width:${ticks ? s.tw : s.w};stroke-dasharray:${s.dash}`);
      return { c, s };
    });
    let arc = null;
    const arcR = dark ? 49 : 47, arcLen = 2 * Math.PI * arcR;
    const share = pct ? ML.clamp(goal / 100) : 1;
    if (p.progress_arc) {
      sv("circle", { cx: 50, cy: 50, r: arcR, fill: "none", style: `stroke:color-mix(in srgb, ${dark ? "var(--x-ground)" : "var(--x-ink)"} 8%, transparent);stroke-width:1.2` }, svg);
      arc = sv("circle", { cx: 50, cy: 50, r: arcR, fill: "none", transform: rtl ? "translate(100 0) scale(-1 1) rotate(-90 50 50)" : "rotate(-90 50 50)" }, svg);
      arc.setAttribute("style", `stroke:var(--x-accent);stroke-width:1.2;stroke-linecap:round;stroke-dasharray:${arcLen.toFixed(2)} ${arcLen.toFixed(2)}`);
    }
    // the centre: value + unit, and the small accent label under them (dark) or a dim unit line (light)
    const mid = mk("div", `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${4 * u}px;color:${dark ? "var(--x-ground)" : "var(--x-ink)"};text-align:center`, dial);
    const row = mk("div", `display:flex;align-items:baseline;gap:${8 * u}px;direction:ltr;unicode-bidi:isolate;white-space:nowrap`, mid);
    const val = mk("span", dark ? `font:300 ${(D * 0.2).toFixed(1)}px/1 var(--x-body-font);font-variant-numeric:tabular-nums;letter-spacing:-0.02em` : `font:400 ${(D * 0.22).toFixed(1)}px/1 var(--x-serif-font);font-variant-numeric:tabular-nums`, row, fmt(goal));
    let unitEl = null;
    if (unit) unitEl = mk("span", `font:var(--x-label-weight) ${(D * 0.07).toFixed(1)}px var(--x-mono-font);color:${dark ? "color-mix(in srgb, var(--x-ground) 55%, transparent)" : "var(--x-dim)"};${ML.ARABIC.test(unit) ? "direction:rtl" : "text-transform:uppercase;letter-spacing:.08em"}`, row, unit);
    if (p.label) {
      const lab = mk("div", `font:var(--x-label-weight) ${(D * 0.045).toFixed(1)}px var(--x-label-font);color:var(--x-accent);white-space:nowrap`, mid, p.label);
      if (!ML.ARABIC.test(p.label)) { lab.style.textTransform = "uppercase"; lab.style.letterSpacing = "var(--x-label-track)"; }
    }
    ML.fit(row, D * 0.74);

    // timings: the dial arrives, the count runs ~1 s power2.out, the rings spin up and settle back
    const cA = at + 0.15, cD = ML.clamp((end - at) * 0.35, 0.8, 1.2);
    const pow2 = (t) => { const x = ML.lin(t, cA, cA + cD); return 1 - (1 - x) * (1 - x); };
    const fast = 360 / 3, settle = 0.9;
    // angle = slow rate × time + the extra spin, integrated: (fast − slow)·τd·(1 − e^(−τ/τd)) once the count starts
    const angle = (t, s) => { const slow = 360 / s.period, tau = Math.max(0, t - cA); return s.dir * (slow * (t - at) + (fast - slow) * settle * (1 - Math.exp(-tau / settle))); };
    ctx.sfx(at, "pop.soft", 0.3);
    if (p.count_up) ctx.sfx(cA + cD, "tap", 0.25);

    return {
      draw(t) {
        const inn = ML.out(t, at, at + 0.45), leave = ML.clamp((t - (end - 0.25)) / 0.2), o = inn * (1 - leave);
        dial.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        dial.style.opacity = o.toFixed(4);
        dial.style.translate = `0 ${((1 - inn) * 16 * u).toFixed(2)}px`;
        rings.forEach(({ c, s }) => c.setAttribute("transform", `rotate(${(angle(t, s) % 360).toFixed(3)} 50 50)`));
        const q = p.count_up ? pow2(t) : 1;
        const txt = fmt(goal * q);
        if (val.textContent !== txt) val.textContent = txt;
        if (arc) arc.style.strokeDashoffset = (arcLen * (1 - share * q)).toFixed(3);
        if (unitEl) unitEl.style.opacity = ML.out(t, cA + 0.1, cA + 0.5).toFixed(4);
      },
    };
  },
});
