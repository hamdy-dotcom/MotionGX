// Curtain open: heavy curtains with vertical folds (a repeating gradient of dark / light stripes with shading) under a
// scalloped valance that stays; the frame fades up from black (0.4 s), a warm light line glows at the seam first
// (0.3 s), then the panels part over `duration` (power2.inOut) with their folds bunching near the leading edge (scaleX
// 0.9, a slight skew) and a dark rim on that edge; the scene behind is lit warm as it opens. "side" draws one curtain
// toward the reading end; "paper" is a pale paper screen instead of velvet. Fabric is the look's accent deepened by
// its device dark, the light its second accent; fold widths are shares of the frame.
// Source: prompt-motion x4b47x-opus-5-5-one-shot (reference only: our own rebuild).
ML.define({
  id: "transition.curtain-open",
  category: "transition",
  name: "Curtain open",
  does: "Heavy velvet curtains with a glowing seam slowly part in the middle to reveal a lit stage scene behind.",
  says: ["reveal", "story", "arrival", "luxury"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [1.7, 3.1],
  params: {
    direction: { type: "choice", options: ["center-out", "side"], default: "center-out" },
    duration: { type: "number", range: [1, 2.4], default: 1.6, unit: "s" },
    fabric: { type: "choice", options: ["velvet", "paper"], default: "velvet" },
    valance: { type: "bool", default: true },
  },
  pairs: ["text-in.stage-plaque", "background.light-rays"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:x4b47x-opus-5-5-one-shot", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100;
    const velvet = p.fabric !== "paper";
    const deep = velvet ? "color-mix(in srgb, var(--x-accent) 42%, var(--x-device))" : "color-mix(in srgb, var(--x-panel-2) 88%, var(--x-ink))";
    const mid = velvet ? "color-mix(in srgb, var(--x-accent) 68%, var(--x-device))" : "var(--x-panel-2)";
    const lite = velvet ? "color-mix(in srgb, var(--x-accent) 86%, var(--x-accent-ink))" : "var(--x-panel)";
    const warm = "var(--x-accent-2)";
    const P = Math.max(24, 3.4 * v); // fold period
    const folds = (period) => `repeating-linear-gradient(90deg, ${deep} 0px, ${mid} ${period * 0.22}px, ${lite} ${period * 0.5}px, ${mid} ${period * 0.78}px, ${deep} ${period}px)`;
    const shade = velvet ? `linear-gradient(180deg, color-mix(in srgb, var(--x-device) 55%, transparent) 0%, transparent 28%, transparent 78%, color-mix(in srgb, var(--x-device) 45%, transparent) 100%)` : `linear-gradient(180deg, color-mix(in srgb, var(--x-device) 12%, transparent) 0%, transparent 14%, transparent 88%, color-mix(in srgb, var(--x-device) 10%, transparent) 100%)`;
    // a second, longer shading out of step with the folds, so the velvet hangs unevenly and never reads as stripes
    const hang = velvet ? `repeating-linear-gradient(90deg, transparent 0px, color-mix(in srgb, var(--x-device) 34%, transparent) ${P * 1.15}px, transparent ${P * 2.7}px, color-mix(in srgb, var(--x-accent-ink) 7%, transparent) ${P * 3.6}px, transparent ${P * 4.3}px), ` : "";
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    (ctx.scene || stage).append(layer); // inside the scene: the valance that stays goes when the scene goes
    const mk = (css, parent = layer) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; parent.append(d); return d; };
    // the warm light on the stage behind: its own layer under the curtains, so it really screens over the scene (inside
    // the curtains' stacking layer it would only blend with them, and read as a smudge on a light look)
    const lit = document.createElement("div");
    lit.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:6;background:radial-gradient(ellipse 60% 55% at 50% 58%, color-mix(in srgb, ${warm} 26%, transparent), transparent 70%);mix-blend-mode:screen;opacity:0`;
    layer.before(lit);
    const side = p.direction === "side";
    const dir = ctx.rtl ? -1 : 1;
    const pw = side ? W * 1.04 : W * 0.52;
    const rim = (edge) => `linear-gradient(${edge === "left" ? "90deg" : "270deg"}, color-mix(in srgb, var(--x-device) 70%, transparent) 0, transparent ${(2.4 * v).toFixed(1)}px)`;
    // each panel: folds, top/bottom shading, a dark rim on its leading (inner) edge
    const panels = (side ? [dir > 0 ? "R" : "L"] : ["L", "R"]).map((s) => {
      const lead = s === "L" ? "right" : "left";
      const d = mk(`top:0;height:${H}px;width:${pw}px;${s === "L" ? "left:0" : `left:${W - pw}px`};background:${rim(lead)}, ${shade}, ${hang}${folds(P)};transform-origin:${s === "L" ? "0%" : "100%"} 50%`);
      return { d, s };
    });
    // in "side" the curtain opens toward the reading end: LTR it gathers to the right… so it is the right-anchored panel
    const seam = mk(`top:0;height:${H}px;left:${W / 2 - 0.5 * v}px;width:${v}px;background:linear-gradient(180deg, transparent, ${warm} 18%, ${warm} 82%, transparent);box-shadow:0 0 ${(2.2 * v).toFixed(1)}px ${warm}, 0 0 ${(6 * v).toFixed(1)}px color-mix(in srgb, ${warm} 60%, transparent);opacity:0`);
    // valance: a band plus a row of scallops, sized to the frame's own top margin so it never covers the headline
    const vb = Math.max(4 * v, f.safe.y * 0.55), sc = Math.max(1.6 * v, f.safe.y * 0.16);
    const val = mk(`left:0;top:0;width:${W}px;height:${vb + sc}px;display:${p.valance ? "block" : "none"}`);
    mk(`left:0;top:0;width:${W}px;height:${vb}px;background:${shade}, ${folds(P * 0.6)};box-shadow:0 ${(0.3 * v).toFixed(1)}px 0 ${warm}`, val);
    mk(`left:0;top:${vb}px;width:${W}px;height:${sc}px;background:radial-gradient(circle at 50% 0, ${mid} ${sc * 0.98}px, transparent ${sc}px) 0 0 / ${sc * 2}px ${sc}px repeat-x`, val);
    const black = mk(`inset:0;background:var(--x-device)`);
    const L = ML.clamp(p.duration, 1, 2.4);
    const fadeB = at + 0.4, seamA = fadeB, seamB = seamA + 0.3, openA = seamB, openB = openA + L;
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // power2.inOut
    ctx.sfx(openA, "swell", 0.45);
    return {
      draw(t) {
        black.style.opacity = (1 - ML.ease(t, at, fadeB)).toFixed(4);
        const u = io(ML.lin(t, openA, openB));
        const bunch = Math.sin(Math.PI * Math.min(1, u * 1.2));
        seam.style.opacity = (ML.lin(t, seamA, seamB) * (1 - ML.lin(t, openA + 0.25 * L, openA + 0.6 * L))).toFixed(4);
        seam.style.display = side ? "none" : "block";
        panels.forEach(({ d, s }) => {
          const away = s === "L" ? -1 : 1;
          const x = away * (pw + 2 * v) * u;
          const sx = 1 - 0.1 * Math.min(1, u * 2);
          d.style.transform = `translateX(${x.toFixed(2)}px) skewY(${(away * -0.8 * bunch).toFixed(3)}deg) scaleX(${sx.toFixed(4)})`;
          d.style.visibility = u >= 1 ? "hidden" : "visible";
        });
        lit.style.opacity = (ML.out(t, openA, openB) * 0.9).toFixed(4);
      },
    };
  },
});
