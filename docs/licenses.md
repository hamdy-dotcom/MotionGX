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
| flubber `0.4.2` | path-morph (any shape → any shape), sampled per frame | MIT |
| svg-path-properties `2.1.0` | path-draw window + path-follow (point + tangent at length) | MIT (LICENSE file; package.json says ISC) |

## GSAP — removed (Phase 3E)
GSAP's Standard "No Charge" License prohibits use in no-code tools that let users build visual
animations, which MotionGX is. The `gsap` dependency and `remotion/behaviors/gsap-lib.ts` are gone.
Replacements (all MIT): `path-morph` (flubber), `path-draw` (sampled polyline of the visible stretch),
`path-follow` (svg-path-properties), `split-stagger` (our word-safe splitter + Motion stagger/easings).
The old names gsap-split / gsap-morph / gsap-draw / gsap-path stay as hidden aliases so saved specs
still render. Determinism: the same frame renders to byte-identical PNGs (scripts/motion/behaviors-smoke.ts).
