# MotionGX motion library — the map

A library of ~1,000 motion-graphics **moves** the director composes per video. Not templates: a move is one technique
(how a word enters, how the camera pushes, how a price splits). The director picks moves per moment from the goal, the
story and the brand, so no two videos are built the same way.

## 1. What a move is

One reusable, parameterised GSAP function + a card that tells the director when to use it.

```js
// moves/text/scramble-in.js
export default {
  id: "text.scramble-in",
  category: "text",              // see §2
  name: "Scramble in",
  says: ["tech", "reveal", "decode", "surprise"],     // what it communicates
  energy: 4,                     // 1 calm … 5 explosive
  targets: ["headline", "number", "label"],           // what it can be applied to
  duration: [0.6, 1.6],          // seconds it needs (min, max)
  params: { direction: ["ltr", "rtl"], charset: ["latin", "arabic", "digits"], stagger: [0.01, 0.06] },
  pairs: ["camera.push-in", "fx.glitch-flash"],       // moves it combines well with
  avoid: ["luxury", "calm"],     // tones it doesn't fit
  rtl: true,                     // works with Arabic (joined letters!)
  source: { from: "own | <repo>", license: "MIT" },
  run(tl, el, at, p) { /* adds its tweens to the scene timeline at time `at` */ },
};
```

Rules every move follows: pure function of time (seekable — the renderer seeks frame by frame), no network, no
randomness without a seed, works in both 9:16 and 16:9, Arabic-safe when `rtl: true`.

## 2. Categories (what to look for)

| # | Category | Examples | Target count |
|---|---|---|---|
| 1 | **Text — entrances** | rise + blur, mask reveal, letter cascade, word slam, typewriter, scramble, split-flap, stretch-in, 3D flip, ink draw | 120 |
| 2 | **Text — emphasis & exits** | highlight sweep, underline draw, circle draw, word swap, strike-through, shake, pulse, explode out, wipe out | 80 |
| 3 | **Kinetic typography layouts** | full-frame word stack, word-by-word on beat, giant number, split headline, text on path, text behind object | 60 |
| 4 | **Element entrances / exits** | pop, drop with bounce, slide + settle, flip card, unfold, iris, scale from point, stagger grid | 100 |
| 5 | **Scene transitions** | whip pan, zoom through, shape wipe, liquid wipe, match cut, slice, push, light leak, glitch cut, morph | 90 |
| 6 | **Camera** | push-in, pull-out, pan, tilt, orbit (3D), rack focus, handheld drift, follow cursor, dolly zoom, snap zoom on beat | 50 |
| 7 | **UI interactions** | tap ripple, type into field, scroll, swipe, drag, toggle, notification drop, loading → success, form fill, cart add | 80 |
| 8 | **Devices & screens** | phone rise, phone spin, laptop open, screen flip, multi-device fan, screen zoom into region, screen-to-full-frame | 40 |
| 9 | **Numbers & data** | count up, odometer, bar grow, ring fill, line draw, price split, before→after number, percent badge stamp | 60 |
| 10 | **Shapes & graphic accents** | line draw, burst, confetti, arrow draw, blob morph, grid sweep, dots pulse, sticker slap, badge stamp | 90 |
| 11 | **Backgrounds & atmosphere** | gradient drift, aurora, grain, noise field, particles, light rays, pattern scroll, colour-block shift, bokeh | 60 |
| 12 | **Masks & reveals** | circle reveal, shape-mask image, split reveal, venetian blinds, brush reveal, image through text | 50 |
| 13 | **Image & photo moves** | Ken Burns, parallax layers, photo stack, polaroid drop, collage build, duotone pop, cut-out pop | 50 |
| 14 | **Characters & icons** (Lottie / SVG) | icon draw, emoji burst, hand-drawn doodles, mascots, reaction pops | 40 |
| 15 | **Rhythm & beat** | hit on beat, flash on drop, stutter, beat-synced cuts, bass bounce | 30 |
|   | **Total** | | **~1,000** |

~150–200 hand-made base moves × their params (direction, speed, ease, stagger, split by letter/word/line) give the
1,000+. Quality comes from the base moves; variety from the params.

## 3. How the director uses it

1. **Brief → plan.** The director reads the goal, the story and the brand, and decides each scene's purpose and tone.
2. **Search.** A tool: `find_moves({ purpose: "reveal the price", tone: "urgent", target: "number", energy: 4 })` →
   the best-matching move cards (never the whole library — it stays cheap).
3. **Compose.** Per scene it writes a **timeline of named moves**, not raw animation code:
   ```json
   { "scene": 4, "layout": "split-left",
     "moves": [
       { "move": "camera.push-in", "at": "start", "params": { "to": 1.12 } },
       { "move": "text.scramble-in", "target": "headline", "at": "word:أربع", "params": { "charset": "arabic" } },
       { "move": "data.price-split", "target": "deal", "at": "word:تلات", "params": { "parts": 3 } },
       { "move": "accent.badge-stamp", "target": "badge", "at": "word:فوايد" } ] }
   ```
4. **Engine runs it.** Each move's `run()` adds its tweens to the scene; timing stays tied to the spoken words; the
   spacing guard keeps every move visible.
5. **No repeats.** The engine remembers each brand's recent videos (moves, layouts, structure) and the director is told
   to avoid them.

## 4. The gallery (how we keep quality)

One page that plays every move on its own (Arabic and English sample, both formats), with its card. You approve, tweak or
drop moves there. A move enters the library only when approved.

## 5. What to look for in repos

- **Collections of named effects** for HTML / JS: GSAP effects, text animations, transitions, CSS animation libraries,
  motion presets, Lottie packs.
- **Licence:** MIT, Apache-2.0, BSD, ISC or CC0 only (we sell the videos). Not GPL, not "personal use", not unlicensed.
- **Tech:** GSAP, CSS keyframes, SVG, Canvas, Three.js, or React components whose technique can be ported (React Bits,
  Magic UI, Aceternity — port the technique, keep their licence notice).
- **Not useful:** video templates (After Effects / Premiere packs), anything that needs a paid runtime, or effects that
  can't be driven frame by frame (real-time physics with no seed, CSS that can't be seeked).

For each repo you find, send: the link, what kind of moves it has (category numbers above), roughly how many, and the
licence. I'll check each and port what fits.

## 6. Build order

1. The move format (§1), the `find_moves` tool, the gallery page.
2. Port the ~40 moves we already have (the ads' scenes, the director's kit) as cards.
3. Categories 1, 5, 6, 7, 9 first (text, transitions, camera, UI, numbers): they carry most of a product video.
4. The rest from the repos you find.
5. Switch the studio engine's director to compose from the library; compare videos side by side.
