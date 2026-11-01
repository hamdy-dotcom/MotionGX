# MotionGX motion library — the build plan

The complete library, built in one go from every source we have: nothing sampled, no test batches. Every usable
technique in every source becomes code. The only stop is the end: you review the whole library in the gallery.

## 1. What gets built

| Layer | What it is | From |
|---|---|---|
| **Moves** | One technique as a seekable function + its card (MAP.md §1): a text entrance, a camera push, a price split, a magic move | Every source below |
| **Looks** | One block of style variables that changes colour, type, edges, *composition* (where headlines and pictures sit) and *motion* (how things arrive, how fast) — never a colour swap | MengTo's ~30 design systems + explainer looks, our brand reader |
| **Scene patterns** | Layout skeletons that host moves (cards landing, a typing window, panels, a real page read, lanes, a switch, an end card, a chat, a deal…) | Explainer, reel structures, product-film, ours |
| **Structures** | Story shapes chosen by the goal (launch, offer, awareness, product update, explainer, before/after, showcase, "found this") | Explainer format, html-reel, product-film story, ours |
| **Kit** | The runtime every move uses: one clock, words as times, `show / ring / pointer / typed / blink / pulse`, springs, camera on a world canvas, magic-move travel, punchline slots, regions per shape | Explainer engine, product-film kit, our scenes.js / kit.js |
| **Sound kit** | Named cues (click, tap, pop, whoosh, sub, riser, typing…) with measured sync points | Director SFX + explainer's 24 (MIT) |

## 2. Full inventory — everything that goes in

**A. MengTo/Skills (MIT)**
- `html-explainer-video`: the engine helpers (~12), all 10 scene patterns, 4 looks, the read-look method, the checker rules, the 24 sound effects, the format.
- `html-reel`: 5 structures, the voice tightener, word-anchor retiming, the judging method.
- `html-demo`: the step-by-step app window.
- Web-design motion techniques (~50): word reveals (staggered, masked, scrubbed), marquee, progressive blur, alpha fades, gradient / liquid-metal borders, beam-glow states, gooey blobs, paper-burn transition, corner lasers, laser beams, atmosphere, dither, mesh gradient, WebGL grid, ambient / globe particles, pointer & particle trails, wireframe scan reveal, falling leaves, number markers, thinking orbs, glass / skeuomorphic surfaces, layered shadows, mouse-orbit parallax → camera drift, horizontal scenes, progress timeline, partner logos (Simple Icons), and the principles in `animation-systems` and `cinematic-gsap-lenis-motion-system`.
- Design systems (~30) → **looks**: editorial tech, brutalist agency, editorial chapters, glass dark, blue cloudy clean, bright-green tech, dark-blue contrasting, framed grid, framed tech border-gradient, funky purple, glass clock, high-contrast skeuomorphic, light paper technical, mesh-gradient dark blue, nested containers, orange paper SaaS, beige minimal, split technical, tech-green dark, wireframe info, book serif, documentary brutalist, dither laser, image-first grid, agency minimal grid, service booking, operational enterprise, product proof…
- 3D and VFX (~16): orbit inspect, sky, sun rays, underwater rays, falling leaves 3D, four seasons, wireframe scan, procedural towers assembling, quiet landscape, weather, globe, 3D object, fire / ice / lightning / water bursts (as accents and transitions).
- Skipped: game logic, X / writing tools, illustration prompts, page copywriting, third-party photos.

**B. product-film-skill (MIT)**
- Kit (7): spring, camera world canvas, cursor path on an arc, cursor, punchlines with kept slots, dither, move.
- Ingredients → moves: punchline words, magic moves (the full from→to table), camera push-ins on a heavy spring with log zoom, cuts on the bar, logo self-draw + fill, partner logos inline, proof scenes, brand texture painted per frame, app surfaces (desktop / mobile / browser), loop fold-back, one brand element across the film.
- The interview step and BRAND.md → the director's brief.

**C. prompt-motion.com (reference only, 240 videos)**
- Every video watched: frames sampled through each piece, every distinct move written as a spec (what moves, how, timing, easing, what it communicates), then deduplicated against A, B and D. Each surviving spec is built as our own code. The videos are never shipped.
- Expected: 300–500 distinct moves after dedupe.

**D. Ours**
- The ads' 25 scenes, the studio's 8 story scenes, the director's kit, the screen rebuild (screenshot-to-code), the voice pipeline.

**Expected size:** ~700–900 moves, ~35 looks, ~25 scene patterns, ~10 structures; with their parameters, several thousand distinct variations.

## 3. The build, in order (one continuous build — no pauses for test batches)

1. **Foundation.** The move format and card schema, the kit (merged from explainer + product-film + ours), regions for all shapes (9:16, 16:9, 1:1, 4:5), the look variable set (explainer's `--x-*`, extended for Arabic / RTL), the sound kit. Everything after builds on this, so it's done first and frozen.
2. **Harvest.** Every source in §2 turned into specs: one card per move / look / pattern / structure, with its source and licence. prompt-motion's 240 videos watched and specced here. Deduplicated into one master list.
3. **Build.** Every spec written as code, by category (all 15 categories in parallel). Each item must pass:
   - **seekable**: the same frame at the same time, twice (determinism check);
   - **both directions**: Arabic RTL and English LTR, joined letters intact;
   - **all shapes**: 9:16 and 16:9 at least;
   - **the checker**: no picture enlarged past its pixels, no soft 3D, nothing off the frame, no overlapping headlines, contrast;
   - **brand-driven**: no fixed colour or font — only look variables.
4. **Looks.** All ~35 built, each with its own composition and motion; the brand reader (from our capture's palette, fonts and screens) maps a brand to the closest looks and adapts them.
5. **Director integration.** `find_moves` / `find_looks` / `find_patterns` tools; the director writes a timeline of named moves per scene (not raw code); the engine validates and renders it; the spacing guard keeps every move visible; the per-brand memory stops repeats.
6. **Gallery.** One page that plays every move, look and pattern on its own (Arabic and English, 9:16 and 16:9), with search, filters by category / energy / tone, and approve / adjust / drop per item.
7. **Your review.** You go through the gallery; dropped items come out, adjusted ones are fixed. Then the studio engine switches to the library.

## 4. How it's built

- **Parallel.** The harvest and the build run as one orchestrated job with many agents in parallel (one per source in the harvest, one per category in the build), each checked by an independent reviewer before its work is accepted. This needs your OK when we start: it's a large token spend.
- **Where:** `lib/motion-library/` (kit, moves by category, looks, patterns, structures, catalogue), the gallery as an admin page in the app. The studio engine is switched to it at step 7; until then the current engine stays as it is.
- **Licences:** every card carries its source and licence; MIT notices kept in `lib/motion-library/LICENSES.md`.

## 5. What it costs

- **Build:** mostly model work (harvest + ~800 items written and reviewed). Expect a large one-time spend in agent tokens — I'll give an estimate before starting.
- **Per video afterwards:** cheaper than today's director — the director picks named moves instead of writing animation code.

## 6. New sources later

Anything you find later goes through the same pipeline (harvest → build → checks → gallery). The library has no fixed size.
