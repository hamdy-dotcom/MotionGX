// A complete, layered reference spec (fictional brand) shown to the spec writer as a QUALITY bar —
// structure, depth, literal metaphor, varied composition, labelled plates, staged logo reveal.
// It is never reused as a layout: the prompt says so, and the brand/concept are unrelated to any client.
export const EXAMPLE_PLAN = `EXAMPLE PLAN — "Nuri" (fictional coffee subscription), 9:16, 20s, 110 BPM, English. Concept: a cup that refills itself every morning. Shots: s1 0–3.3 "Out of coffee again?" | s2 3.3–6.5 "Fresh beans, roasted weekly" / "Delivered before you wake" | s3 6.5–10.9 "Pick your roast" + three roast cards | s4 10.9–14.2 "From our roastery to your door" (route) | s5 14.2–17.5 logo | s6 17.5–20 "Start for $9" / "nuri.coffee". Hits: drop@3.27, impact@10.91, logo@14.18, cta@17.45.`;

export const EXAMPLE_SPEC = JSON.stringify({
  version: 1,
  canvas: { bg: [{ kind: "gradient", colors: ["bg", "bg2"], angle: 160 }, { kind: "radial", colors: ["glowA"], alpha: 0.45, drift: 1 }, { kind: "dots", colors: ["border"], alpha: 0.25, drift: 0.3 }] },
  camera: { shake: 0.4, drift: 0.4, keys: [{ t: 0, zoom: 1.08 }, { t: "s2", zoom: 1 }, { t: "s4", zoom: 1.05, y: -2 }, { t: "s5", zoom: 1, y: 0, ease: "expoOut" }] },
  cuts: [{ t: "s2", kind: "flash" }, { t: "s4", kind: "wipe", dir: "left", color: "primary" }, { t: "s5", kind: "zoom" }],
  elements: [
    { id: "steamL", type: "svgPath", d: "M50 100 C30 80 70 60 50 40 C30 20 60 10 50 0", x: 44, y: 30, w: 8, h: 16, stroke: "textMuted", strokeW: 0.8, in: 0.2, out: "s2e", fx: [{ fx: "stroke-draw", dur: 1.2 }, { fx: "sway", amp: 0.4 }, { fx: "fade-out" }] },
    { id: "steamR", type: "svgPath", d: "M50 100 C70 80 30 60 50 40 C70 20 40 10 50 0", x: 56, y: 29, w: 8, h: 18, stroke: "textMuted", strokeW: 0.8, in: 0.5, out: "s2e", fx: [{ fx: "stroke-draw", dur: 1.2 }, { fx: "sway", amp: 0.4, period: 2.9 }, { fx: "fade-out" }] },
    { id: "cup", type: "shape", shape: "rect", radius: 22, fill: "surface", stroke: "primary", strokeW: 0.4, x: 50, y: 44, w: 34, h: 28, z: 2, in: 0, out: "s2e", fx: [{ fx: "pop" }, { fx: "breathe" }, { fx: "scale-to", at: "s2", to: 0.7, dur: 0.6 }, { fx: "fade-out" }] },
    { id: "handle", type: "shape", shape: "ring", fill: "primary", x: 70, y: 44, w: 12, z: 1, in: 0.15, out: "s2e", fx: [{ fx: "pop" }, { fx: "fade-out" }] },
    { id: "fill", type: "shape", shape: "rect", radius: 18, fill: "primary", x: 50, y: 51, w: 30, h: 8, z: 3, in: "s2", out: "s2e", fx: [{ fx: "bar-grow", dur: 1.2, ease: "backOut" }, { fx: "fade-out" }] },
    { id: "q1", type: "text", line: "s1:0", x: 50, y: 70, size: 8.5, weight: 800, color: "text", font: "head", z: 5, in: 0.4, out: "s1e", fx: [{ fx: "per-word" }, { fx: "shake-hit" }, { fx: "rise-out" }] },
    { id: "s2a", type: "text", line: "s2:0", x: 50, y: 68, size: 7.6, weight: 800, color: "text", font: "head", z: 5, in: "s2", out: "s2e", fx: [{ fx: "mask-wipe", dir: "right" }, { fx: "fade-out" }] },
    { id: "s2b", type: "text", line: "s2:1", x: 50, y: 74.5, size: 5.4, weight: 500, color: "textMuted", font: "body", z: 5, in: 4.2, out: "s2e", fx: [{ fx: "rise" }, { fx: "fade-out" }] },
    { id: "beans", type: "particles", kind: "dots", count: 26, colors: ["accent", "primary"], x: 50, y: 50, w: 100, h: 178, z: -1, in: "s2", out: "s2e", dir: 90, speed: 0.6 },
    { id: "s3h", type: "text", line: "s3:0", x: 50, y: 18, size: 8.4, weight: 800, color: "text", font: "head", z: 5, in: "s3", out: "s3e", fx: [{ fx: "slide", from: "left" }, { fx: "slide-out", to: "right" }] },
    { id: "cards", type: "group", x: 50, y: 50, w: 90, h: 70, in: "s3", out: "s3e", fx: [{ fx: "spring-in", from: "down", stagger: 0.15 }, { fx: "fade-out", stagger: 0.05 }] },
    { id: "c1", type: "shape", parent: "cards", shape: "rect", radius: 18, fill: "surface", stroke: "border", strokeW: 0.3, x: 50, y: 34, w: 74, h: 17, fx: [{ fx: "float", amp: 0.5 }] },
    { id: "c1t", type: "text", parent: "cards", text: "Light", x: 50, y: 34, size: 6.4, weight: 700, color: "text", font: "head", z: 2 },
    { id: "c2", type: "shape", parent: "cards", shape: "rect", radius: 18, fill: "primary", x: 50, y: 50, w: 74, h: 17, z: 1, fx: [{ fx: "float", amp: 0.5, period: 3.4 }, { fx: "hit-pulse" }] },
    { id: "c2t", type: "text", parent: "cards", text: "Medium", x: 50, y: 50, size: 6.4, weight: 800, color: "onPrimary", font: "head", z: 3 },
    { id: "c3", type: "shape", parent: "cards", shape: "rect", radius: 18, fill: "surface", stroke: "border", strokeW: 0.3, x: 50, y: 66, w: 74, h: 17, fx: [{ fx: "float", amp: 0.5, period: 3.8 }] },
    { id: "c3t", type: "text", parent: "cards", text: "Dark", x: 50, y: 66, size: 6.4, weight: 700, color: "text", font: "head", z: 2 },
    { id: "road", type: "route", points: [[14, 70], [30, 58], [50, 66], [68, 50], [86, 42]], stroke: "primary", strokeW: 0.9, nodes: "accent", in: "s4", out: "s4e", fx: [{ fx: "stroke-draw", dur: 2.4 }, { fx: "fade-out" }] },
    { id: "box", type: "shape", shape: "rect", radius: 16, fill: "accent", x: 14, y: 70, w: 7, z: 4, in: "s4", out: "s4e", fx: [{ fx: "route-follow", route: "road", dur: 2.4 }, { fx: "jelly", at: 13.4 }, { fx: "fade-out" }] },
    { id: "s4h", type: "text", line: "s4:0", x: 50, y: 24, size: 6.8, weight: 800, color: "text", font: "head", z: 5, in: "s4", out: "s4e", fx: [{ fx: "per-word" }, { fx: "fade-out" }] },
    { id: "ring", type: "shape", shape: "ring", fill: "primary", glow: "glowA", x: 50, y: 42, w: 52, z: 1, in: "s5", fx: [{ fx: "stroke-draw", dur: 0.8 }, { fx: "ripple", at: 14.2 }, { fx: "breathe" }] },
    { id: "logo", type: "image", src: "logo", x: 50, y: 42, w: 34, z: 4, in: "s5", fx: [{ fx: "pop" }, { fx: "spark-burst", at: 14.25 }, { fx: "float", amp: 0.5 }, { fx: "shimmer" }] },
    { id: "cta", type: "shape", shape: "pill", fill: "primary", glow: "glowA", x: 50, y: 72, w: 62, h: 12, z: 5, in: "s6", fx: [{ fx: "spring-in", from: "down" }, { fx: "pulse", amount: 0.04 }] },
    { id: "ctaT", type: "text", line: "s6:0", x: 50, y: 72, size: 6.8, weight: 800, color: "onPrimary", font: "head", z: 6, in: "s6", fx: [{ fx: "spring-in", from: "down" }, { fx: "pulse", amount: 0.04 }] },
    { id: "url", type: "text", line: "s6:1", x: 50, y: 83, size: 5, weight: 700, color: "textMuted", font: "latin", z: 6, in: 18.1, fx: [{ fx: "typewriter", dur: 0.6 }] },
    { id: "confetti", type: "particles", kind: "confetti", count: 40, colors: ["primary", "accent", "text"], x: 50, y: 50, w: 100, h: 178, z: 0, in: "s6", dir: 90, speed: 1.4 },
  ],
});
