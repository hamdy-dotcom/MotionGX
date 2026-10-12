# @motiongx/primitives — API (tools, not templates)

A composition is ONE .tsx file:

```tsx
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing, spring, Img } from "remotion";
import { ... } from "@motiongx/primitives";
export default function Composition(props: MotionInput) { ... }
```

Allowed imports: `react`, `remotion`, `@motiongx/primitives`, `@remotion/shapes`, `@remotion/paths`, `@remotion/noise`,
`@remotion/transitions` (+ `/fade` `/slide` `/wipe` `/flip` `/clock-wipe` `/iris` `/dissolve` `/push-cut` `/zoom-blur` `/blur-slide` `/swap` `/zoom-in-out`),
`@remotion/three`, `@remotion/lottie`, `@remotion/layout-utils`, `@remotion/motion-blur`, `@remotion/media-utils`. Nothing else.
Forbidden: `fetch`, `window`, `document`, `localStorage`, `eval`, `Function`, `require`, `import()`, network, timers (`setTimeout`), randomness other than `random(seed)`.
Everything must be a pure function of `useCurrentFrame()` (same frame → same pixels).

## Input (props and `useMotion()`)

```ts
type MotionInput = {
  brand: { name; url; logoUrl: string | null; logoPlate: boolean; imageUrls: string[]; colors: { hex; role? }[] };
  palette: Palette;           // the ONLY colors you may use (see below)
  fonts: { head; body; latin; arabic };  // CSS font stacks, already loaded
  lang: "ar" | "en"; dir: "rtl" | "ltr";
  width; height; fps; durationInFrames;
  energy: EnergyMap;          // { bpm, length_s, sections[{name, kind: intro|build|drop|breakdown|outro, start_s, end_s, energy 0..1}], hits[{t, kind: drop|impact|reveal|logo|cta, label?}] }
  script: { title; beats: ScriptBeat[] };   // ScriptBeat { id, role, start_s, end_s, lines: string[], voiceover_line }
};
type Palette = { bg; bg2; surface; surface2; border; text; textMuted; textDim; primary; onPrimary; accent; gradA; gradB; gradient; glowA; glowB; dark: boolean };
```

- All on-screen copy comes from `script.beats[i].lines` (one `<Text>` per line). Never hard-code copy; the brand name and `brand.url` may be shown.
- Time from seconds: `Math.round(s * fps)`. Place each beat with `<Sequence from={…} durationInFrames={…}>` using its `start_s`/`end_s`.
- 1 design unit: `const u = useUnit()` (1px at a 1080 short side). Size everything in `u`.

## Brand / palette
- `useMotion()`, `useUnit()`
- `mix(a, b, t)`, `rgba(hex, alpha)`, `shade(hex, ±amount)`, `rotateHue(hex, deg)`, `contrast(a, b)`, `luminance(hex)`, `ensureContrast(color, bg, min)`, `pickTextColor(bg, candidates?)`
- `gradient(palette, angle?, stops?)` → CSS gradient; `gradientText(palette, angle?)` → style for gradient-filled text
- `allowedColors(palette)`. Colors outside the palette (and mixes/rgba of palette colors) are off-brand.

## Text (Arabic-safe)
- `<Text text size width? font?="head"|"body"|"latin"|"arabic" weight? color? gradient? align?="start"|"center"|"end" reveal?={{ start, mode?: "word"|"line"|"fade"|"scale"|"none", stagger?, duration?, from?: "below"|"above"|"start"|"end" }} lineHeight? letterSpacing? style? wordStyle?(i, word) />`
  - one line, never wraps, auto-fits to `width` (default 86% of the canvas), direction from the text itself. Arabic words are never split.
- `<CountUp value start duration from? decimals? prefix? suffix? style? />` — Latin digits
- `splitWords(text)`, `isArabic(text)`, `dirOf(text)`, `fitFontSize(text, max, width, family, weight)`, `formatNumber(n, lang)`

## Timing (energy-map aware)
- `useBeat()` → `{ beat, beatIndex, bar, phase, pulse, framesPerBeat, frameOf(k) }` — `pulse` is 1 on each beat and decays
- `useEnergy()` → `{ t, section, kind, level, progressInSection }`
- `useHit(kind?, decaySeconds?)` (alias `onHit`) → `{ last, next, pulse, secondsSince, framesUntilNext, hitFrames }` — `pulse` is 1 on each hit
- `progress(frame, start, duration, easing?)` 0→1; `springAt(frame, fps, delay, springs.snap|punch|soft|bouncy)`; `ease.expoOut|expoIn|inOut|backOut|linear`
- `lerp(t, a, b)`, `clamp(v, a?, b?)`, `remap(v, a, b, c, d)`, `stagger(i, step, start?)`, `useSeconds()` → (s) => frame

## Generative
- `noise2D(seed, x, y)`, `noise3D(seed, x, y, z)`, `noise01(seed, x, y, t)`, `random(seed)`
- `particle(i, frame, { seed?, width, height, speed?, drift? })` → `{ x, y, size, alpha }`; `<Particles count colors seed? speed? drift? style? />`
- `morphPath(fromD, toD, t)`; `<StrokeDraw d progress stroke strokeWidth viewBox width height linecap? style? />`; `pathLength(d)`
- `clip.circle(p, cx?, cy?)`, `clip.wipe(p, "left"|"right"|"top"|"bottom")`, `clip.diagonal(p)`, `clip.polygon([[x%,y%],…])` → CSS clip-path
- `blurIn(t, max?)` → CSS filter; `CameraMotionBlur`, `Trail` (from @remotion/motion-blur)
- `<Camera zoom? x? y? rotate? shakeOnHits?>…</Camera>` — whole-frame camera; shake kicks on energy-map hits
- `<ParallaxScene cameraX cameraY>` + `<ParallaxLayer depth>` — 2.5D layers
- `<ThreeStage cameraZ? fov?>…three.js JSX (mesh, boxGeometry, meshStandardMaterial…)…</ThreeStage>`
- `useCanvas()` → `{ width, height, fps, durationInFrames, cx, cy, dir }`
- From `@remotion/shapes`: `Circle`, `Rect`, `Triangle`, `Star`, `Polygon`, `Pie`, `Ellipse`, `Heart` (+ `makeX` path builders). From `@remotion/paths`: `interpolatePath`, `evolvePath`, `getLength`, `getPointAtLength`, `scalePath`, `translatePath`. From `@remotion/transitions`: `TransitionSeries`, `linearTiming`, `springTiming` + presentations.

## Media
- `<BrandLogo width plate?="auto"|"light"|"dark"|"none" style? />` — never stretch or recolor the logo
- `<BrandImage index? fit? style? />` — a real image from the brand's site, or `null` if none (design without it)
- `<DeviceFrame kind="phone"|"tablet"|"laptop"|"browser" width screenColor? style?>…invented UI…</DeviceFrame>`
