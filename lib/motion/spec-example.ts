// A complete, layered reference spec (fictional brand) shown to the spec writer as a QUALITY bar —
// structure, depth, illustrations as the continuous hero (parts change on hits), labelled plates, staged logo reveal.
// It is never reused as a layout: the prompt says so, and the brand/concept are unrelated to any client.
export const EXAMPLE_PLAN = `EXAMPLE PLAN — "Nuri" (fictional coffee subscription), 9:16, 20s, 110 BPM, English. Concept: a cup that refills itself every morning. Illustration style: line. ILLUSTRATIONS: coffee_cup (parts fill: cup fills up, steam: steam curls rise) | roast_bag (parts open: bag top opens, beans: beans pour out) | delivery_truck (parts drive: van rolls forward, door: rear door opens). Shots: s1 0–3.3 "Out of coffee again?" (the empty cup) | s2 3.3–6.5 "Fresh beans, roasted weekly" / "Delivered before you wake" (the bag pours into the cup) | s3 6.5–10.9 "Pick your roast" + three roast chips (the cup, centre, changes colour per roast) | s4 10.9–14.2 "From our roastery to your door" (the truck carries the bag along a route) | s5 14.2–17.5 logo (the full, steaming cup under the logo) | s6 17.5–20 "Start for $9" / "nuri.coffee". Hits: drop@3.27, impact@10.91, logo@14.18, cta@17.45.`;

// The hero (coffee_cup) is ONE element that lives across shots: keys move/scale it from layout to layout
// (a continuous thread, never swapped for a new card), and on every hit one of its parts changes state.
export const EXAMPLE_SPEC = JSON.stringify({
  version: 1,
  canvas: { bg: [{ kind: "gradient", colors: ["bg", "bg2"], angle: 160 }, { kind: "radial", colors: ["glowA"], alpha: 0.4, drift: 1 }, { kind: "dots", colors: ["border"], alpha: 0.2, drift: 0.3 }] },
  camera: { shake: 0.35, drift: 0.4, keys: [{ t: 0, zoom: 1.12 }, { t: "s2", zoom: 1, ease: "expoOut" }, { t: "s4", zoom: 1.04, y: -2 }, { t: "s5", zoom: 1, y: 0, ease: "expoOut" }] },
  cuts: [{ t: "s4", kind: "wipe", dir: "left", color: "primary" }],
  elements: [
    { id: "cup", type: "illustration", name: "coffee_cup", x: 50, y: 40, w: 72, z: 3, out: "s4", keys: [{ t: 0, x: 50, y: 40, scale: 1 }, { t: "s2", x: 32, y: 42, scale: 0.72, ease: "expoOut" }, { t: "s3", x: 50, y: 40, scale: 0.9, ease: "expoOut" }], anim: [{ part: "fill", at: 3.27, dur: 0.5, to: 0.35 }, { part: "fill", at: 5.2, dur: 1.2, to: 1, ease: "backOut" }, { part: "steam", at: 6.0, dur: 0.8, to: 1 }], fx: [{ fx: "pop" }, { fx: "breathe" }, { fx: "shake-hit", at: 3.27 }, { fx: "fade-out" }] },
    { id: "q1", type: "text", line: "s1:0", x: 50, y: 74, size: 8.5, weight: 800, color: "text", font: "head", z: 5, in: 0.4, out: "s1e", fx: [{ fx: "per-word" }, { fx: "rise-out" }] },
    { id: "bag", type: "illustration", name: "roast_bag", x: 70, y: 34, w: 46, z: 4, rot: -18, in: "s2", out: "s2e", anim: [{ part: "open", at: 3.6, dur: 0.5, to: 1 }, { part: "beans", at: 4.3, dur: 1.4, to: 1 }], fx: [{ fx: "spring-in", from: "right" }, { fx: "sway", amp: 0.5 }, { fx: "slide-out", to: "right" }] },
    { id: "s2a", type: "text", line: "s2:0", x: 50, y: 70, size: 7.6, weight: 800, color: "text", font: "head", z: 5, in: "s2", out: "s2e", fx: [{ fx: "mask-wipe", dir: "right" }, { fx: "fade-out" }] },
    { id: "s2b", type: "text", line: "s2:1", x: 50, y: 76.5, size: 5.4, weight: 500, color: "textMuted", font: "body", z: 5, in: 4.2, out: "s2e", fx: [{ fx: "rise" }, { fx: "fade-out" }] },
    { id: "s3h", type: "text", line: "s3:0", x: 50, y: 16, size: 8.4, weight: 800, color: "text", font: "head", z: 5, in: "s3", out: "s3e", fx: [{ fx: "slide", from: "left" }, { fx: "slide-out", to: "right" }] },
    { id: "chips", type: "group", x: 50, y: 74, w: 90, h: 14, in: "s3", out: "s3e", fx: [{ fx: "spring-in", from: "down", stagger: 0.12 }, { fx: "fade-out", stagger: 0.05 }] },
    { id: "k1", type: "shape", parent: "chips", shape: "pill", fill: "surface", stroke: "border", strokeW: 0.3, x: 22, y: 74, w: 26, h: 9 },
    { id: "k1t", type: "text", parent: "chips", text: "Light", x: 22, y: 74, size: 5, weight: 700, color: "text", font: "head", z: 2 },
    { id: "k2", type: "shape", parent: "chips", shape: "pill", fill: "primary", x: 50, y: 74, w: 26, h: 9, z: 1, fx: [{ fx: "hit-pulse" }] },
    { id: "k2t", type: "text", parent: "chips", text: "Medium", x: 50, y: 74, size: 5, weight: 800, color: "onPrimary", font: "head", z: 3 },
    { id: "k3", type: "shape", parent: "chips", shape: "pill", fill: "surface", stroke: "border", strokeW: 0.3, x: 78, y: 74, w: 26, h: 9 },
    { id: "k3t", type: "text", parent: "chips", text: "Dark", x: 78, y: 74, size: 5, weight: 700, color: "text", font: "head", z: 2 },
    { id: "road", type: "route", points: [[8, 66], [30, 60], [52, 64], [74, 56], [94, 52]], stroke: "primary", strokeW: 0.9, nodes: "accent", dashed: true, in: "s4", out: "s4e", fx: [{ fx: "stroke-draw", dur: 2.2 }, { fx: "fade-out" }] },
    { id: "truck", type: "illustration", name: "delivery_truck", x: 8, y: 58, w: 40, z: 4, in: "s4", out: "s4e", anim: [{ part: "drive", at: "s4", dur: 2.2, to: 1, ease: "linear" }, { part: "door", at: 13.4, dur: 0.5, to: 1, ease: "backOut" }], fx: [{ fx: "route-follow", route: "road", dur: 2.2 }, { fx: "jelly", at: 13.4 }, { fx: "fade-out" }] },
    { id: "s4h", type: "text", line: "s4:0", x: 50, y: 26, size: 6.8, weight: 800, color: "text", font: "head", z: 5, in: "s4", out: "s4e", fx: [{ fx: "per-word" }, { fx: "fade-out" }] },
    { id: "cupEnd", type: "illustration", name: "coffee_cup", x: 50, y: 62, w: 40, z: 3, in: "s5", init: { fill: 1, steam: 0 }, anim: [{ part: "steam", at: 14.18, dur: 0.9, to: 1 }], fx: [{ fx: "spring-in", from: "down" }, { fx: "float", amp: 0.5 }] },
    { id: "ring", type: "shape", shape: "ring", fill: "primary", glow: "glowA", x: 50, y: 30, w: 44, z: 1, in: "s5", fx: [{ fx: "stroke-draw", dur: 0.8 }, { fx: "ripple", at: 14.2 }, { fx: "breathe" }] },
    { id: "logo", type: "image", src: "logo", x: 50, y: 30, w: 30, z: 4, in: "s5", fx: [{ fx: "pop" }, { fx: "spark-burst", at: 14.25 }, { fx: "float", amp: 0.5 }] },
    { id: "cta", type: "shape", shape: "pill", fill: "primary", glow: "glowA", x: 50, y: 82, w: 62, h: 11, z: 5, in: "s6", fx: [{ fx: "spring-in", from: "down" }, { fx: "pulse", amount: 0.04 }] },
    { id: "ctaT", type: "text", line: "s6:0", x: 50, y: 82, size: 6.6, weight: 800, color: "onPrimary", font: "head", z: 6, in: "s6", fx: [{ fx: "spring-in", from: "down" }, { fx: "pulse", amount: 0.04 }] },
    { id: "url", type: "text", line: "s6:1", x: 50, y: 91, size: 4.8, weight: 700, color: "textMuted", font: "latin", z: 6, in: 18.1, fx: [{ fx: "typewriter", dur: 0.6 }] },
  ],
});
