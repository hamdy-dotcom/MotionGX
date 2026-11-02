// Diagonal hatch split bands — the payoff layout of a risograph sequence. A hard cut to two stacked bands: the top
// (`split` of the height) a paper ground with fine diagonal hatching in the second accent (2 px lines on a 10 px pitch
// at 1080, at `angle`), a paper label box inset in it holding the earlier words as line 1 and line 2; the bottom a
// tinted accent fill with a deeper hatch, the final word printed huge in the accent with riso grain. After the cut the
// hatching drifts (10 px/s) so the still frame keeps living. Words come from the target headline (or the scene's
// headline when the target is the stage); the label box sits at the reading start (right for RTL).
// Source: prompt-motion:rneayan-opus-5-5-risograph-style (reference only — our own rebuild).
ML.define({
  id: "kinetic.hatch-split-bands",
  category: "kinetic",
  name: "Diagonal hatch split bands",
  does: "The frame cuts to two stacked hatched bands: a paper label box on top holding the first lines, the final word printed huge in the accent below.",
  says: ["result", "energy", "playful"],
  energy: 3,
  targets: ["stage", "headline"],
  duration: [1, 3],
  params: {
    angle: { type: "number", range: [30, 60], default: 45, unit: "deg" },
    split: { type: "number", range: [0.35, 0.6], default: 0.45 },
    text: { type: "text", default: "" },
  },
  pairs: ["background.grain", "transition.hard-cut"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:rneayan-opus-5-5-risograph-style", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    const host = ctx.scene || stage;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    let src = (p.text || "").trim();
    const from = el && el !== stage ? el : host.querySelector('[data-slot="headline"], [data-slot-sample="headline"], .ml-title');
    if (!src) src = ((from && from.textContent) || "").trim();
    if (!src) return null;
    const ws = src.split(/\s+/).filter(Boolean);
    const last = ws.length > 1 ? ws.pop() : ws[0];
    const rest = ws.length && ws[0] !== last ? ws : [];
    const half = Math.ceil(rest.length / 2);
    const lineTexts = rest.length > 1 ? [rest.slice(0, half).join(" "), rest.slice(half).join(" ")] : rest;
    const S = f.W / 1080, lw = Math.max(1.5, 2 * S), pitch = 10 * S, ang = ML.clamp(p.angle, 30, 60);
    const hatch = (col) => `repeating-linear-gradient(${ang}deg, ${col} 0 ${lw.toFixed(2)}px, transparent ${lw.toFixed(2)}px ${pitch.toFixed(2)}px)`;
    const split = ML.clamp(p.split, 0.35, 0.6);
    const root = document.createElement("div");
    root.setAttribute("aria-label", src);
    Object.assign(root.style, { position: "absolute", inset: "0", zIndex: "7", pointerEvents: "none", overflow: "hidden" });
    const top = document.createElement("div");
    Object.assign(top.style, { position: "absolute", left: "0", right: "0", top: "0", height: (split * 100).toFixed(2) + "%", backgroundColor: "var(--x-ground)", backgroundImage: hatch("color-mix(in srgb, var(--x-accent-2) 70%, transparent)") });
    const bot = document.createElement("div");
    Object.assign(bot.style, { position: "absolute", left: "0", right: "0", bottom: "0", top: (split * 100).toFixed(2) + "%", backgroundColor: "color-mix(in srgb, var(--x-accent) 22%, var(--x-ground))", backgroundImage: hatch("color-mix(in srgb, var(--x-accent) 34%, var(--x-ground))"), display: "flex", alignItems: "center", justifyContent: "center" });
    // the paper label box, inset in the top band at the reading start
    const label = document.createElement("div");
    const topH = split * f.H, pad = Math.round(28 * S);
    Object.assign(label.style, { position: "absolute", [rtl ? "right" : "left"]: f.m + "px", bottom: Math.round(topH * 0.12) + "px", maxWidth: (f.W - f.m * 2).toFixed(0) + "px", background: "var(--x-panel)", color: "var(--x-ink)", border: `${Math.max(2, Math.round(3 * S))}px solid var(--x-ink)`, padding: `${pad}px ${Math.round(pad * 1.3)}px`, display: lineTexts.length ? "flex" : "none", flexDirection: "column", gap: Math.round(6 * S) + "px", boxShadow: `${Math.round(8 * S) * (rtl ? -1 : 1)}px ${Math.round(8 * S)}px 0 color-mix(in srgb, var(--x-ink) 85%, transparent)` });
    const labelSize = Math.min(f.W * 0.085, topH * 0.2);
    const lines = lineTexts.map((s) => { const d = document.createElement("div"); d.textContent = s; const ar = ML.ARABIC.test(s); Object.assign(d.style, { font: `var(--x-head-weight) ${labelSize.toFixed(1)}px / 1.05 var(--x-head-font)`, letterSpacing: ar ? "0" : "var(--x-head-track)", textTransform: "var(--x-head-case)", whiteSpace: "nowrap" }); label.append(d); return d; });
    top.append(label);
    // the final word, huge, in the accent, with grain printed through it
    const big = document.createElement("div");
    big.textContent = last;
    const arB = ML.ARABIC.test(last);
    const botH = (1 - split) * f.H;
    let bs = Math.min(botH * 0.62, f.W * 0.4);
    Object.assign(big.style, { font: `max(var(--x-head-weight), 800) ${bs.toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: arB ? "0" : "-0.03em", textTransform: arB ? "none" : "uppercase", whiteSpace: "nowrap", color: "var(--x-accent)", position: "relative", padding: arB ? "0.08em 0" : "0" });
    bot.append(big);
    const grain = document.createElement("div");
    const seed = Math.floor(ML.rnd(src.length, 7) * 97);
    const noise = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 -0.55'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
    Object.assign(grain.style, { position: "absolute", inset: "0", backgroundImage: noise, backgroundSize: `${Math.round(220 * S)}px`, opacity: "calc(var(--x-grain) * 4)", mixBlendMode: "multiply", pointerEvents: "none" });
    root.append(top, bot, grain);
    host.append(root);
    // fit: the big word within 88 % of the width, the label lines within the frame
    for (let i = 0; i < 3; i++) { const w = big.getBoundingClientRect().width / k; if (w > f.W * 0.88) { bs *= (f.W * 0.88) / w; big.style.fontSize = bs.toFixed(1) + "px"; } }
    for (const d of lines) { const w = d.getBoundingClientRect().width / k, room = f.W - f.m * 2 - pad * 2.6 - 8; if (w > room) d.style.fontSize = ((labelSize * room) / w).toFixed(1) + "px"; }
    ctx.sfx(at, "hit", 0.5);
    return {
      draw(t) {
        const on = t >= at && t < end;
        root.style.visibility = on ? "visible" : "hidden";
        if (el && el !== stage) el.style.visibility = on ? "hidden" : "visible";
        // the hatching drifts 10 px/s (at 1080) after the cut
        const off = Math.max(0, t - at) * 10 * S;
        top.style.backgroundPosition = `${off.toFixed(2)}px 0`;
        bot.style.backgroundPosition = `${(-off).toFixed(2)}px 0`;
      },
    };
  },
});
