// Phase 3D library: builds motion_refs rows for
//   • genmotion (MIT) — 25 motion recipes + 8 scene blueprints, and its 16 CC0-1.0 taste reference studies
//     (vendored in data/vendor/genmotion with the upstream LICENSE; source_url pins the commit)
//   • motion.dev examples (Motion is MIT) — technique cards in our own words, creator "motion.dev"
//   • Codrops articles — technique cards in our own words + links, creator "codrops-study" (no demo code)
// Every card names the MotionGX behaviors that implement it, so the director/spec writer can act on it.
//   npx tsx --tsconfig tsconfig.scripts.json scripts/refs/library-3d.ts → scripts/refs/library-3d.json
//   pnpm refs:import scripts/refs/library-3d.json
import { writeFileSync } from "node:fs";
import { sceneBlueprints } from "../../data/vendor/genmotion/blueprints";
import { motionRecipes } from "../../data/vendor/genmotion/motions";
import { tasteReferences } from "../../data/vendor/genmotion/references";

const GM_SHA = "ccf2361604ceb3918bba7c5bcb188b9d8e80852a";
const gmUrl = (file: string) => `https://github.com/Afnanksalal/genmotion/blob/${GM_SHA}/src/catalog/${file}`;
const GM_MIT = "genmotion catalogue, MIT License © 2026 Afnan K Salal (vendored with LICENSE in data/vendor/genmotion).";

/** genmotion recipe → the MotionGX behaviors / spec features that realise it */
const RECIPE_BEHAVIORS: Record<string, string[]> = {
  "masked-rise": ["masked-rise", "per-word"],
  "confident-slide": ["confident-slide"],
  "scale-lock": ["scale-lock"],
  "editorial-wipe": ["editorial-wipe", "mask-wipe"],
  "word-cascade": ["word-cascade", "gsap-split"],
  "character-decode": ["scramble"],
  "metric-count": ["count-up"],
  "line-route": ["route + stroke-draw", "gsap-draw"],
  "focus-rack": ["focus-rack"],
  "camera-push": ["camera.keys zoom ↑"],
  "camera-pull": ["camera.keys zoom ↓"],
  "parallax-drift": ["depth (parallax)", "noise-drift"],
  "ambient-breathe": ["breathe"],
  "kinetic-slam": ["slam-words", "stamp"],
  "split-reveal": ["split-reveal"],
  "orbit-settle": ["orbit-settle"],
  "list-stagger": ["group stagger + order"],
  "glitch-lock": ["glitch-in", "rgb-split"],
  "slow-dissolve": ["blur-in", "fade"],
  "hard-register-cut": ["cuts: hard"],
  "path-follow": ["gsap-path", "route-follow"],
  "panel-stack": ["panel-stack"],
  "cursor-confirm": ["cursor shape + cursor-move + press"],
  "scan-reveal": ["scan-reveal"],
  "depth-assemble": ["depth-assemble"],
};

type Row = { id: string; title: string; source_url: string | null; creator: string; category: string; tags: string[]; prompt_text: string; code_snippet: null; license_note: string; card: Record<string, unknown> };
const rows: Row[] = [];

for (const r of motionRecipes) {
  const behaviors = RECIPE_BEHAVIORS[r.id] ?? [];
  rows.push({
    id: `gm-recipe-${r.id}`,
    title: r.title,
    source_url: gmUrl("motions.ts"),
    creator: "genmotion",
    category: "Motion recipe",
    tags: [...r.roles, ...r.energy],
    prompt_text: `${r.signature} Duration ${r.duration[0]}–${r.duration[1]}s; animates ${r.properties.join(", ")}. Avoid pairing with: ${r.incompatibleWith.join(", ") || "—"}. ${r.accessibility.join(" ")}`,
    code_snippet: null,
    license_note: GM_MIT,
    card: { summary: r.signature, motion_language: r.title.toLowerCase(), techniques: [r.title.toLowerCase(), ...r.properties.map((p) => `${p} animation`)], behaviors, pacing: r.energy.join(" / "), best_for_roles: r.roles, difficulty: r.cost > 1 ? "medium" : "easy" },
  });
}
for (const b of sceneBlueprints) {
  rows.push({
    id: `gm-blueprint-${b.id}`,
    title: `${b.title} (scene blueprint)`,
    source_url: gmUrl("blueprints.ts"),
    creator: "genmotion",
    category: "Scene blueprint",
    tags: [...b.roles, b.energy],
    prompt_text: `${b.duration[0]}–${b.duration[1]}s scene in phases: ${b.phases.map((p) => `${p.name} (${Math.round(p.range[0] * 100)}–${Math.round(p.range[1] * 100)}%): ${p.purpose} [${p.recipes.join(", ")}]`).join(" → ")}. Signature move: ${b.signatureMove} ${b.constraints.join(" ")}`,
    code_snippet: null,
    license_note: GM_MIT,
    card: { summary: `${b.title}: ${b.phases.map((p) => p.name).join(" → ")}. ${b.signatureMove}`, motion_language: b.title.toLowerCase(), techniques: [...new Set(b.phases.flatMap((p) => p.recipes))], behaviors: [...new Set(b.phases.flatMap((p) => p.recipes.flatMap((x) => RECIPE_BEHAVIORS[x] ?? [])))], pacing: b.energy, best_for_roles: b.roles },
  });
}
for (const s of tasteReferences) {
  rows.push({
    id: `gm-study-${s.id}`,
    title: `${s.title} (reference study)`,
    source_url: gmUrl("references.ts"),
    creator: "genmotion",
    category: "Reference study",
    tags: [...s.roles, s.energy, s.family, ...(s.keywords ?? [])],
    prompt_text: `Composition: ${s.composition.join("; ")}. Hierarchy: ${s.hierarchy.join("; ")}. Motion: ${s.motion.join(", ")}. Pacing: ${s.pacing.join("; ")}. Typography: ${s.typography.join("; ")}. Surface: ${s.surface.join("; ")}. Borrow: ${s.borrow.join(", ")}. Avoid: ${(s.avoid ?? []).join(", ")}.`,
    code_snippet: null,
    license_note: `CC0-1.0 (genmotion reference study: ${s.provenance})`,
    card: { summary: `${s.title}: ${s.composition[0]}; ${s.motion.join(", ")}.`, motion_language: s.family, techniques: s.motion.map((m) => m.toLowerCase()), behaviors: [...new Set(s.motion.flatMap((m) => RECIPE_BEHAVIORS[m.toLowerCase().replace(/\s+/g, "-")] ?? []))], pacing: s.pacing.join("; "), avoid: s.avoid ?? [] },
  });
}

// ── motion.dev examples → our own technique cards ────────────────────────────
const MD = "Motion (motion.dev) is MIT-licensed; this card describes the technique in our own words and links the example. No example code copied.";
const md: [slug: string, title: string, summary: string, techniques: string[], behaviors: string[], cat: string][] = [
  ["react-shared-layout-animation", "Shared layout animation", "One element visibly travels and resizes from its old slot to its new one, so the eye follows a single object across two layouts.", ["shared-element transition", "layout interpolation", "spring settle"], ["shared-morph"], "Layout"],
  ["react-modal-shared-layout", "Card expands into a modal", "A small card grows continuously into a full panel (and back), keeping its corner radius and content anchored.", ["shared-element morph", "box interpolation", "content crossfade"], ["shared-morph", "blur-in", "blur-out"], "Layout"],
  ["react-layout-animation", "Layout animation (FLIP)", "When size/position changes, the element animates between the two boxes instead of jumping.", ["FLIP", "layout interpolation"], ["shared-morph", "spring-move"], "Layout"],
  ["react-layout-anchor", "Layout anchor", "During a resize the element grows from a chosen anchor point (corner/edge) rather than its centre.", ["transform origin", "anchored scale"], ["scale-in", "scale-out"], "Layout"],
  ["react-reorder-items", "Reorder list", "List items slide past each other to new positions with springs when the order changes.", ["reorder transition", "spring layout"], ["spring-move", "group stagger + order"], "Layout"],
  ["react-split-text", "Split text", "A line is split into words or letters that animate in with a stagger.", ["split text", "per-unit stagger"], ["gsap-split", "per-word", "per-letter"], "Text"],
  ["react-split-text-scatter", "Split text scatter", "Letters fly out to random positions and back, assembling the word.", ["letter scatter", "random offsets"], ["scatter-in", "scatter-out"], "Text"],
  ["react-split-text-wavy", "Wavy text", "A sine wave travels through the letters/words continuously.", ["phase-offset sine per unit"], ["wave"], "Text"],
  ["react-scramble-text", "Scramble text", "Characters cycle through random glyphs and resolve left to right into the final copy.", ["text decode", "glyph cycling"], ["scramble"], "Text"],
  ["react-scramble-text-stagger-center", "Scramble from the centre", "The decode resolves outward from the middle character.", ["text decode", "centre stagger"], ["scramble", "gsap-split (from center)"], "Text"],
  ["react-text-reveal", "Text reveal", "Text rises out of a mask line-by-line.", ["masked reveal", "baseline mask"], ["masked-rise", "per-word"], "Text"],
  ["react-text-scroll-word-reveal", "Scroll word reveal", "Words brighten one by one as progress advances — a read-along highlight.", ["word highlight", "progress-linked opacity"], ["karaoke", "blur-words"], "Text"],
  ["react-rolling-text-button", "Rolling text", "Letters roll vertically like an odometer to swap one label for another.", ["slot-machine roll", "per-letter stagger"], ["roll-text"], "Text"],
  ["react-typewriter", "Typewriter", "Characters appear one at a time with a blinking caret.", ["typewriter", "caret blink"], ["typewriter (caret)"], "Text"],
  ["react-typewriter-natural-typing", "Natural typing", "Typing with human irregular timing.", ["variable-rate typing"], ["typewriter"], "Text"],
  ["js-stagger", "Stagger", "Many children start in sequence; the order can start at the first, last or centre child.", ["stagger", "stagger from centre/edges"], ["group stagger + order"], "Stagger"],
  ["react-staggered-grid", "Staggered grid", "A grid of tiles animates in a wave radiating from one cell.", ["grid stagger", "distance-based delay"], ["group stagger + order", "depth-assemble"], "Stagger"],
  ["react-hero-stagger", "Hero stagger", "Headline, subline and button arrive in a tight cascade.", ["cascade entrance"], ["masked-rise", "confident-slide", "spring-pop"], "Stagger"],
  ["js-spring", "Springs", "Motion driven by a damped spring defined by visual duration and bounce instead of easing curves.", ["closed-form spring", "visualDuration/bounce"], ["spring-pop", "spring-move", "liquid-move"], "Physics"],
  ["js-bounce-easing", "Bounce easing", "An easing that hits the end and bounces back like a dropped ball.", ["bounce easing"], ["drop-in", "gravity", "bounce-top"], "Physics"],
  ["react-follow-pointer-with-spring", "Follow pointer with spring", "An object chases a moving target through a spring, lagging and overshooting naturally.", ["spring follow", "lag"], ["cursor-move", "spring-move"], "Physics"],
  ["react-path-drawing", "Path drawing", "An SVG stroke draws itself along its length.", ["SVG path draw"], ["stroke-draw", "gsap-draw"], "SVG"],
  ["react-path-morphing", "Path morphing", "One SVG outline morphs smoothly into a different outline.", ["SVG path morph"], ["gsap-morph", "morph"], "SVG"],
  ["react-motion-path", "Motion path", "An object travels along a curved path, optionally rotating with it.", ["motion path", "tangent alignment"], ["gsap-path", "route-follow"], "SVG"],
  ["react-dots-morph-button", "Dots morph", "A row of dots squeezes and merges into a new shape (e.g. a check).", ["shape morph", "merge"], ["morph", "liquid-move"], "SVG"],
  ["react-tilt-card", "Tilt card", "A card tilts in 3D toward an imaginary pointer with perspective.", ["3D tilt", "perspective"], ["tilt-3d", "flip-3d"], "3D"],
  ["react-carousel-coverflow", "Coverflow carousel", "Items sit on a 3D ring; the front one is large and lit, others recede.", ["3D carousel", "depth scaling"], ["carousel"], "3D"],
  ["react-cursor-trail", "Cursor trail", "A pointer leaves a fading trail of copies behind it.", ["echo trail"], ["echo-trail"], "Cursor"],
  ["react-material-design-ripple", "Tap ripple", "A circular ripple expands from the tap point.", ["tap ripple", "press feedback"], ["press", "ripple"], "Cursor"],
  ["js-press", "Press", "On press the element squashes down and springs back.", ["press scale"], ["press"], "Cursor"],
  ["react-number-counter", "Number counter", "A number rolls/ticks to its new value.", ["count-up", "digit roll"], ["count-up", "roll-text"], "Data"],
  ["react-line-graph", "Line graph", "A line chart draws on and its values settle.", ["chart draw-on"], ["route + stroke-draw", "gsap-draw"], "Data"],
  ["react-curtains-blinds", "Curtains: blinds", "A page transition made of slats closing then opening.", ["blinds transition"], ["cuts: blinds"], "Transitions"],
  ["react-curtains-pixels", "Curtains: pixels", "A transition where squares fill the screen in random order and clear.", ["pixel transition"], ["cuts: pixels"], "Transitions"],
  ["react-curtains-iris", "Curtains: iris", "A circle closes to a point and opens on the next scene.", ["iris transition"], ["cuts: iris", "iris-in"], "Transitions"],
  ["react-curtains-stagger-wipe", "Curtains: stagger wipe", "Several coloured panels wipe across in a stagger.", ["layered wipe"], ["cuts: layers"], "Transitions"],
  ["react-curtains-doors", "Curtains: doors", "Two halves part like doors.", ["split doors"], ["split-reveal"], "Transitions"],
  ["react-parallax", "Parallax", "Layers move at different speeds to suggest depth.", ["parallax depth"], ["depth (parallax)", "camera keys"], "Camera"],
  ["react-scroll-zoom-hero", "Zoom hero", "The hero image scales up as progress advances, filling the frame.", ["zoom push"], ["ken-burns", "camera keys"], "Camera"],
  ["react-scroll-image-reveal", "Image reveal", "An image is unveiled by an expanding clip window.", ["clip reveal"], ["clip-morph", "mask-wipe"], "Masks"],
];
for (const [slug, title, summary, techniques, behaviors, cat] of md) {
  rows.push({ id: `md-${slug}`, title, source_url: `https://motion.dev/examples/${slug}`, creator: "motion.dev", category: cat, tags: [cat, ...techniques], prompt_text: `${summary} Techniques: ${techniques.join(", ")}.`, code_snippet: null, license_note: MD, card: { summary, motion_language: techniques[0], techniques, behaviors, difficulty: "easy" } });
}

// ── Codrops → our own technique studies (links only; no demo code) ───────────
const CD = "Codrops article — studied for the idea only; described in our own words and re-implemented in MotionGX. No demo code copied.";
const cd: [url: string, title: string, summary: string, techniques: string[], behaviors: string[], cat: string][] = [
  ["2024/04/23/blurry-text-reveal-on-scroll", "Blurry text reveal", "Words come into focus one after another out of a heavy blur — a soft, premium reveal.", ["per-word blur reveal"], ["blur-words"], "Text"],
  ["2024/06/19/hover-animations-for-terminal-like-typography", "Terminal-like typography", "Monospace copy flickers through random characters before settling, like a terminal decoding output.", ["text scramble", "glyph cycling"], ["scramble", "typewriter (caret)"], "Text"],
  ["2024/04/17/some-on-scroll-text-highlight-animations", "Text highlight animations", "A highlight sweeps behind or across words as the reader progresses — marker, underline or colour fill.", ["word highlight", "marker sweep"], ["karaoke", "highlight-sweep", "underline-draw"], "Text"],
  ["2024/08/22/scroll-based-svg-filter-animations-on-text", "SVG filter text animation", "Text runs through an animated turbulence/displacement filter so it wobbles like liquid and then resolves.", ["SVG turbulence displacement"], ["wave-distort"], "Text"],
  ["2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap", "3D text animation", "Lines of type rotate in 3D (X/Y) with perspective as they arrive, like pages turning.", ["3D text rotation", "perspective"], ["flip-3d", "roll-text", "gsap-split"], "Text"],
  ["2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins", "SplitText to MorphSVG", "Split-text staggers, shape morphs, path drawing and motion paths driven by GSAP timelines.", ["split text", "SVG morph", "path draw", "motion path"], ["gsap-split", "gsap-morph", "gsap-draw", "gsap-path"], "Text"],
  ["2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl", "Text dissolving into dust", "Copy erodes into drifting particles from one side, like ash or petals blowing away.", ["particle dissolve"], ["dissolve", "assemble"], "Text"],
  ["2025/07/22/interactive-text-destruction-with-three-js-webgpu-and-tsl", "Text destruction", "Letters shatter apart under impact and fall away.", ["letter scatter", "gravity"], ["scatter-out", "drop-out"], "Text"],
  ["2024/11/06/how-to-create-an-organic-text-distortion-effect-with-infinite-scrolling", "Organic text distortion", "Large type bends and stretches organically as it moves.", ["distortion", "stretch"], ["wave-distort", "liquid-move"], "Text"],
  ["2025/02/03/building-an-on-scroll-3d-circle-text-animation-with-three-js-and-shaders", "Circular 3D text", "Words ride a rotating 3D ring around a centre.", ["3D ring", "orbit"], ["carousel", "orbit"], "3D"],
  ["2024/10/16/staggered-3d-grid-animations-with-scroll-triggered-effects", "Staggered 3D grid", "Grid tiles flip and lift in 3D in a staggered wave.", ["3D flip", "grid stagger"], ["flip-3d", "group stagger + order"], "3D"],
  ["2025/05/07/on-scroll-3d-carousel", "3D carousel", "Cards arranged on a cylinder rotate past the viewer; the front card is biggest and brightest.", ["3D carousel"], ["carousel"], "3D"],
  ["2026/10/08/building-parallel-page-transitions-with-gsap-and-react-router", "Parallel page transitions", "Outgoing and incoming scenes animate at the same time (one slides out while the next slides in) instead of in sequence.", ["overlapping transitions"], ["slide-out", "slide", "cuts: whip"], "Transitions"],
  ["2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions", "Flip transition gallery", "A thumbnail expands into the full view via a Flip (first-last-invert-play) transition.", ["FLIP", "shared element"], ["shared-morph"], "Transitions"],
  ["2025/04/28/animating-in-frames-repeating-image-transition", "Repeating image frames", "Copies of an image repeat along a path, creating a trailing, frame-by-frame motion.", ["echo copies", "path repetition"], ["echo-trail", "gsap-path"], "Transitions"],
  ["2023/10/31/image-layer-animations-with-clip-path", "Clip-path image layers", "Several coloured layers wipe across in a stagger, each clipping the next, before the new image appears.", ["layered clip wipe"], ["cuts: layers", "editorial-wipe"], "Transitions"],
  ["2023/09/27/some-ideas-for-fullscreen-image-slideshow-animations", "Fullscreen slideshow ideas", "Slides change with scale, clip and parallax moves rather than plain fades.", ["clip transitions", "scale transitions"], ["clip-morph", "cuts: zoom", "ken-burns"], "Transitions"],
  ["2023/05/04/ideas-for-grid-to-slideshow-switch-animations", "Grid to slideshow", "A grid of thumbnails reorganises into a single large slide with the chosen tile growing into place.", ["layout morph", "grid stagger"], ["shared-morph", "group stagger + order"], "Transitions"],
  ["2023/04/26/image-tiles-menu-animation", "Image tiles", "An image is cut into tiles that flip or slide into place one by one.", ["tile stagger"], ["depth-assemble", "flip-3d"], "Transitions"],
  ["2023/04/05/ideas-for-pixel-page-transitions", "Pixel transitions", "The screen is covered by squares appearing in random order, then they disappear revealing the next scene.", ["pixel transition"], ["cuts: pixels"], "Transitions"],
  ["2023/03/14/fullscreen-clip-animation", "Fullscreen clip morph", "A small rounded window expands into a full-bleed frame.", ["clip morph"], ["clip-morph"], "Transitions"],
  ["2024/08/27/grid-displacement-texture-with-rgb-shift-using-three-js-gpgpu-and-shaders", "Grid displacement with RGB shift", "Content is displaced in blocks with red/cyan channel separation for a digital jolt.", ["RGB shift", "block displacement"], ["rgb-split", "slice-shift"], "Distortion"],
  ["2026/08/25/building-a-mouse-following-square-lens-effect-with-three-js-and-glsl", "Square lens", "A lens region magnifies with RGB fringing where it passes.", ["lens magnify", "chromatic aberration"], ["rgb-split", "scale-to"], "Distortion"],
  ["2026/08/20/run-rob-run-building-a-music-reactive-goo-with-three-js-and-webgpu", "Music-reactive goo", "A blob swells and wobbles on the beat of the music.", ["beat-reactive blob"], ["shape: blob", "hit-pulse", "jelly"], "Distortion"],
  ["2023/06/28/creating-a-bulge-distortion-effect-with-webgl", "Bulge distortion", "The image bulges outward around a point and relaxes.", ["bulge"], ["wave-distort", "punch"], "Distortion"],
  ["2022/01/12/pixel-distortion-effect-with-three-js", "Pixel distortion", "Content breaks into displaced pixel blocks that re-align.", ["pixel displacement"], ["slice-shift", "glitch-in"], "Distortion"],
  ["2020/03/17/create-a-wave-motion-effect-on-an-image-with-three-js", "Wave motion on an image", "A gentle wave ripples across a picture.", ["wave displacement"], ["wave-distort"], "Distortion"],
  ["2020/03/04/distorted-link-effects-with-svg-filters", "Distorted links (SVG filters)", "Short turbulence bursts distort text on interaction.", ["SVG turbulence"], ["wave-distort"], "Distortion"],
  ["2026/09/02/breaking-the-frame-building-a-real-time-datamosh-effect-with-three-js", "Datamosh transition", "Motion from one shot smears into the next as if compression broke — pixels drag along the movement.", ["datamosh", "motion smear"], ["cuts: glitch", "echo-trail", "slice-shift"], "Transitions"],
  ["2026/09/05/building-an-infinite-loom-unravelling-images-into-threads-with-three-js", "Image to threads", "An image unravels into flowing lines.", ["line unravel"], ["route + stroke-draw", "dissolve"], "Generative"],
  ["2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js", "ASCII renderer", "Imagery is rebuilt from characters that change with brightness.", ["ASCII glyph rendering"], ["scramble"], "Generative"],
  ["2026/08/31/volatile-nexus-tinkering-with-glass-caustics-cubes-and-sound-in-three-js", "Glass and caustics", "Translucent shapes catch moving light streaks.", ["light sweep", "glass sheen"], ["shimmer", "glow-pulse"], "Generative"],
  ["2026/08/11/exploring-procedural-geometry-with-three-js-and-webgpu", "Procedural geometry", "Shapes grow procedurally from rules — branching, extruding, repeating.", ["procedural growth"], ["stroke-draw", "extrude", "depth-assemble"], "Generative"],
  ["2020/03/24/animated-custom-cursor-effects", "Custom cursor effects", "A styled cursor with trailing elements and press feedback guides attention.", ["cursor trail", "press ripple"], ["cursor shape + cursor-move + press", "echo-trail"], "Cursor"],
];
for (const [slug, title, summary, techniques, behaviors, cat] of cd) {
  rows.push({ id: `cd-${slug.split("/").pop()}`, title, source_url: `https://tympanus.net/codrops/${slug}/`, creator: "codrops-study", category: cat, tags: [cat, ...techniques], prompt_text: `${summary} Techniques: ${techniques.join(", ")}.`, code_snippet: null, license_note: CD, card: { summary, motion_language: techniques[0], techniques, behaviors } });
}

writeFileSync("scripts/refs/library-3d.json", JSON.stringify(rows, null, 1));
const by = rows.reduce<Record<string, number>>((a, r) => ((a[r.creator] = (a[r.creator] ?? 0) + 1), a), {});
console.log(`${rows.length} rows →`, by);
