# Motion library — sources checked

## MengTo/Skills — MIT (© 2026 Meng To) · github.com/MengTo/Skills · ~190 agent skills, checked 2026-11-01

**Take (high value)**
- `media/html-explainer-video` — a voice-led film engine like ours: every frame from one clock, every time a spoken word
  (`T.clock`); **looks** as one block of CSS variables that change type, colour, edges, *composition* (headline top /
  side / bottom) and *motion* (`--x-motion`: rise, fade, snap, wipe); `read-look.mjs` measures a brand's site into a look;
  `check-film.mjs` (pictures enlarged past their pixels, soft 3D, two headlines at once, edges); 10 scene patterns (layers
  apart, cards landing, panels, typing window, real page read with rings, karaoke ruler, lanes filling, switch, end card);
  helpers `show / ring / view / pointer / typed / blink / pulse`; 24 sound effects with measured sync points (MIT, © Leon
  Lin). Its rules match what we learned (eleven_v4, check the voice by ear, first frame is the cover, real words in UI).
- `media/html-reel` — 9:16 reels from a source: structures (promo, showcase, "found this", explainer, before/after), a
  voice tightener (cuts the middle of long pauses), word-anchor retiming `t = W(τ)`, judging with blind judges.
- `web-design/html-demo` — an app window played step by step from one clock (our screen scenes).

**Take as moves (port to time-driven GSAP)** — staggered / masked / scroll-scrubbed word reveals, marquee loop,
progressive blur, alpha-mask edge fades, gradient borders, gooey blob merge, paper-burn transition, corner lasers / beams,
dither / mesh-gradient / atmosphere / grid backgrounds, ambient particles, globe particles, particle & pointer trails,
wireframe scan reveal, falling leaves, number markers (01 02 03), liquid-metal border, beam-glow states, thinking orbs,
skeuomorphic & glass surfaces, beautiful layered shadows, mouse-orbit parallax (→ camera drift), 3D object / orbit
inspect, horizontal scenes, scroll progress timeline (→ time progress), Iconify Simple Icons for partner logos.
Principles: `animation-systems` (Stripe / Linear / Apple motion), `cinematic-gsap-lenis-motion-system`, `ui/no-ai-design-slop`.

**Skip** — game development and combat, heavy 3D materials (water, wood, metal, cloth), X / writing tools, illustration
prompt styles, landing / pricing page copy. Demo photos inside the skills are third-party (Unsplash etc.): never copy them.

**Watch** — scroll-driven skills must be re-driven from time; WebGL / WebGPU effects must be seeded or painted per frame
to render the same every run.

## Rieranthony/product-film-skill — MIT (© 2026 Rieranthony) · Remotion

**Take** — the *ingredients* rules: punchlines (each word blurs in from ~16 px, rises ~36 px, lands in 0.3 s on
`cubic-bezier(0.22,1,0.36,1)`, every word keeps its slot), **magic moves** (one element travels between scenes: avatars →
rows, a clicked row → detail header, logos → closing headline; spring ~150/20; text never flies across text), camera on
one world canvas (heavy spring, log-space zoom), cursor on a slight arc arriving on the cue, logo that draws itself then
fills, loop that folds back to frame 0; the kit (`spring`, `camera`, `cursor-path`, `punchlines`, `dither`, `move`) —
port to GSAP; the interview step and `BRAND.md` (the product's own surfaces only, no invented tints).

## prompt-motion.com — reference only

~240 Opus 5.5 motion videos with their prompts; videos and prompts belong to their creators (no licence). Use as the
reference board for moves to rebuild; never copy the videos.
