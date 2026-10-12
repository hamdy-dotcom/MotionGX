# Third-party motion sources (Phase 3D)

| Source | Used how | License |
|---|---|---|
| Motion (motion.dev) `motion@12.23.12` | spring / inertia / easings / stagger sampled as pure functions of time | MIT |
| genmotion (github.com/Afnanksalal/genmotion @ccf2361) | recipes + blueprints vendored in data/vendor/genmotion; `documentDiff` ported to lib/motion/revision.ts | MIT |
| genmotion reference studies | imported to motion_refs | CC0-1.0 |
| awesome-animations `motion-vocabulary.md` | 16 pattern names in the director prompt | MIT |
| Codrops articles | technique cards in our own words + links; no demo code | — (ideas only) |
| Animista | preset ideas re-implemented in our own code | — (ideas only) |
| OpenMontage | the idea of a slideshow-risk score only; no code | AGPL (not used) |
| GSAP `gsap@3.13.0` (MorphSVG, MotionPath paths, timelines) | path morph/draw/follow + frame-seeked timelines | GSAP Standard "No Charge" License (Webflow) |

## GSAP license — needs a legal decision before public launch
The Standard "No Charge" GSAP License (effective 30 Apr 2025, © Webflow) allows commercial use, but its
Prohibited Uses include using GSAP "in tools that allow users to build visual animations without code"
that compete with Webflow's visual animation builder. MotionGX lets users create animations through a
UI, so this clause may apply. The FAQ says AI-generated code is not a "Prohibited Use", but MotionGX
ships GSAP inside the product's renderer. Removal is contained: GSAP is only used in
remotion/behaviors/gsap-lib.ts (4 behaviors + svgPath morph/draw and path-follow).
