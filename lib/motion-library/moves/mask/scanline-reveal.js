// Scan-line develop reveal: the finished picture draws in from the top under a glowing scan line, over a dim
// "developing" preview of itself — it reads as being generated, not as a slideshow pop. Ported from MengTo's html-demo
// GENERATE step (.fd-scan, .fd-dev): over the reveal span (1.5–4 s, linear progress lin) the result is clipped
// inset(0 0 (1-lin)·100% 0) (left-right: the far side is inset — the left side in Arabic, so it develops right to
// left); the scan line is 2 px at lin·100 %, a gradient bright in its middle 30–70 % with a soft glow (warm: the
// look's second accent; accent: the accent); underneath, the developing copy fades in to 0.55 over 0.4 s
// and goes when done. Our one change from the source: the preview is dimmed and desaturated (brightness .5,
// saturate .4) but not blurred or enlarged — the library never blurs or upscales a picture. Sound: riser under, land
// when done.
// Source: MengTo/Skills agent-skills/web-design/html-demo (demo/index.html #GENERATE .fd-scan/.fd-dev + SKILL.md, MIT).
ML.define({
  id: "mask.scanline-reveal",
  category: "mask",
  name: "Scan-line develop reveal",
  does: "The finished picture draws in from the top under a glowing scan line, over a dim, desaturated preview of itself that develops into the result.",
  says: ["reveal", "result", "tech"],
  energy: 3,
  targets: ["image", "screen", "card"],
  duration: [1.5, 4.5],
  params: {
    direction: { type: "choice", options: ["top-down", "left-right"], default: "top-down" },
    duration: { type: "number", range: [1.5, 4], default: 3.2, unit: "s" },
    line_colour: { type: "choice", options: ["warm", "accent"], default: "warm" },
    preview: { type: "bool", default: true },
  },
  pairs: ["ui.skeleton-shimmer", "data.count-up"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "MengTo/Skills:agent-skills/web-design/html-demo", license: "MIT", note: "demo/index.html #GENERATE (.fd-scan, .fd-dev); preview not blurred (library rule)" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    const b = ctx.box(el), across = p.direction === "left-right", rtl = ctx.rtl;
    const span = Math.min(ML.clamp(+p.duration, 1.5, 4), Math.max(0.6, end - at - 0.2)), done = at + span;
    // the result above the developing copy, the scan line above both
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = el.style.zIndex || "1";
    // beside the target when it can be (same stacking context, moves with whatever moves its parent), else on the scene
    const beside = el instanceof HTMLElement && !!el.offsetParent;
    const place = beside ? `left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px` : `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;${place};pointer-events:none;z-index:0`;
    let dev = null;
    if (p.preview) {
      dev = el.cloneNode(true);
      dev.removeAttribute("data-slot"); dev.removeAttribute("id");
      dev.setAttribute("aria-hidden", "true");
      dev.style.cssText = (el.getAttribute("style") || "") + ";position:absolute;inset:0;width:100%;height:100%;margin:0;z-index:auto;clip-path:none;filter:brightness(.5) saturate(.4);overflow:hidden";
      layer.append(dev);
    }
    if (beside) el.before(layer); else host.append(layer);
    const lineLayer = document.createElement("div");
    lineLayer.style.cssText = `position:absolute;${place};pointer-events:none;z-index:2`;
    const line = document.createElement("span");
    const c = p.line_colour === "accent" ? "var(--x-accent)" : "var(--x-accent-2)";
    const glow = p.line_colour === "accent" ? "color-mix(in srgb, var(--x-accent) 55%, transparent)" : "color-mix(in srgb, var(--x-accent-2) 55%, transparent)";
    line.style.cssText = across
      ? `position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:linear-gradient(180deg, transparent, ${c} 30%, ${c} 70%, transparent);box-shadow:0 0 12px 2px ${glow}`
      : `position:absolute;left:0;right:0;height:2px;margin-top:-1px;background:linear-gradient(90deg, transparent, ${c} 30%, ${c} 70%, transparent);box-shadow:0 0 12px 2px ${glow}`;
    lineLayer.append(line);
    if (beside) el.after(lineLayer); else host.append(lineLayer);
    ctx.sfx(at, "riser", 0.35);
    ctx.sfx(done, "land", 0.4);
    return {
      draw(t) {
        const lin = ML.lin(t, at, done), started = t >= at - 1e-6, rest = ((1 - lin) * 100).toFixed(3) + "%";
        el.style.clipPath = !started ? "inset(0 0 100% 0)" : lin >= 1 ? "none" : across ? (rtl ? `inset(0 0 0 ${rest})` : `inset(0 ${rest} 0 0)`) : `inset(0 0 ${rest} 0)`;
        if (dev) {
          const o = started && lin < 1 ? 0.55 * Math.min(1, (t - at) / 0.4) : 0;
          layer.style.visibility = o > 0 ? "visible" : "hidden";
          dev.style.opacity = o.toFixed(4);
        }
        const show = started && lin < 1;
        lineLayer.style.visibility = show ? "visible" : "hidden";
        // the line eases out of its glow over the last 6 % so the land does not leave a seam hanging
        line.style.opacity = (1 - ML.lin(lin, 0.94, 1)).toFixed(3);
        if (across) line.style.left = ((rtl ? 1 - lin : lin) * 100).toFixed(3) + "%";
        else line.style.top = (lin * 100).toFixed(3) + "%";
      },
    };
  },
});
