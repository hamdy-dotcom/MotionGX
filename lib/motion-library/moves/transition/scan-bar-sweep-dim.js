// Scan bar sweep: a thin glowing bar (≈6 px at 1080, with a ≈40 px soft glow) travels across the frame — top to bottom
// or bottom to top — over `duration` power2.inOut; everything it has passed is greyed out and dimmed to `dim` (a
// backdrop grayscale + brightness clipped to follow the bar, so the content itself is never re-coloured or blurred),
// then the frame fades to black (the look's device dark) to end the scene. The bar's colour is a look variable
// ("gold" = the look's amber, or accent / accent-2 / good / ink / any --x- name).
// Source: prompt-motion kyonax-on-tech-yes-i-also-did (reference only: our own rebuild).
ML.define({
  id: "transition.scan-bar-sweep-dim",
  category: "transition",
  name: "Scan bar sweep",
  does: "A glowing bar sweeps down over the screen, leaving everything greyed out behind it to end the scene.",
  says: ["transition", "tech"],
  energy: 3,
  targets: ["scene"],
  duration: [0.6, 1.2],
  params: {
    direction: { type: "choice", options: ["down", "up"], default: "down" },
    colour: { type: "text", default: "gold" },
    dim: { type: "number", range: [0.2, 0.5], default: 0.35 },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
    fade: { type: "bool", default: true },
  },
  pairs: ["transition.crt-power", "transition.defocus"],
  avoid: ["playful", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:kyonax-on-tech-yes-i-also-did", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, v = Math.min(W, H) / 1080;
    const name = String(p.colour || "gold").trim();
    const named = { gold: "--x-light-2", amber: "--x-light-2", warm: "--x-light-2", accent: "--x-accent", "accent-2": "--x-accent-2", good: "--x-good", green: "--x-good", bad: "--x-bad", red: "--x-bad", ink: "--x-ink", white: "--x-panel" };
    const col = name.startsWith("--x-") ? `var(${name})` : named[name.toLowerCase()] ? `var(${named[name.toLowerCase()]})` : "var(--x-accent)";
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden";
    scene.append(layer);
    const grey = document.createElement("div");
    grey.style.cssText = `position:absolute;inset:0;backdrop-filter:grayscale(1) brightness(${p.dim});-webkit-backdrop-filter:grayscale(1) brightness(${p.dim})`;
    layer.append(grey);
    const bh = Math.max(3, 6 * v), glow = 40 * v;
    const bar = document.createElement("div");
    bar.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${bh}px;background:${col};box-shadow:0 0 ${(glow * 0.35).toFixed(1)}px ${col}, 0 0 ${glow.toFixed(1)}px ${(glow * 0.25).toFixed(1)}px color-mix(in srgb, ${col} 55%, transparent)`;
    layer.append(bar);
    // a faint wash of the bar's colour just behind it, the scanned trail
    const trail = document.createElement("div");
    trail.style.cssText = `position:absolute;left:0;width:${W}px;height:${(glow * 3).toFixed(1)}px;background:linear-gradient(${p.direction === "up" ? "0deg" : "180deg"}, transparent, color-mix(in srgb, ${col} 22%, transparent))`;
    layer.append(trail);
    const black = document.createElement("div");
    black.style.cssText = "position:absolute;inset:0;background:var(--x-device);opacity:0";
    layer.append(black);
    const D = ML.clamp(p.duration, 0.4, 1), down = p.direction !== "up";
    const io2 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    ctx.sfx(at, "whoosh.soft", 0.35);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        const u = io2(ML.lin(t, at, at + D)), y = down ? u * H : (1 - u) * H;
        const pct = (u * 100).toFixed(3);
        grey.style.clipPath = down ? `inset(0 0 ${(100 - +pct).toFixed(3)}% 0)` : `inset(${(100 - +pct).toFixed(3)}% 0 0 0)`;
        const on = u > 0 && u < 1;
        bar.style.opacity = on ? "1" : "0";
        bar.style.transform = `translateY(${(y - bh / 2).toFixed(2)}px)`;
        trail.style.opacity = on ? "1" : "0";
        trail.style.transform = `translateY(${(down ? y - glow * 3 : y).toFixed(2)}px)`;
        black.style.opacity = p.fade ? ML.ease(t, at + D + 0.1, at + D + 0.5).toFixed(4) : "0";
      },
    };
  },
});
