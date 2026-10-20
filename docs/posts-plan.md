# Posts — content + visuals for social media

For a company's marketer or designer, or a one-person company run by AIs: describe the post you want, get the text and
the visuals for every platform you post on, download and copy, post it yourself.

## What the user gets

**Posts** in the nav, next to Videos.

1. **New post:** the company · the type · the platforms · what the post is about (free text) · optional: "use a photo /
   illustration" · the dialect (the company's default).
   - Types: **single image + text**, **carousel + text** (3–10 slides), **text only**.
   - Platforms: Facebook, Instagram, TikTok, LinkedIn, X (any set).
2. **The post page:** one tab per platform —
   - the text written for that platform (length, tone, line breaks, hashtags, emoji habits; X ≤ 280 characters),
     with a Copy button;
   - the visual(s) at that platform's size, with Download (one image, or the carousel as a zip + each slide);
   - **Request a change** (free text) and **Edit text** (inline), like the video studio; versions with undo.
3. **Export** = download: the wallet is charged once per post (the `prices` table, key `post`), like video export.
   Creating and changing posts is free.

Sizes: Instagram/Facebook feed 1080×1350 · Stories/TikTok 1080×1920 · LinkedIn 1200×627 (single) / 1080×1350
(carousel) · X 1600×900. A carousel keeps one size per platform.

## How a post is made

1. **Write** (Claude): from the brief + brand.json (name, voice, audience, selling points, features with evidence,
   site) — one angle, then the text per platform in the company's dialect. Facts only from the brand; no invented
   numbers, prices or claims.
2. **Design** (Claude, single image / carousel): each slide as an HTML page at the platform size, from the brand's real
   identity — exact palette and fonts, the logo, real product screens (whole phone / whole laptop, as in the video
   engine), real facts. Arabic RTL, safe margins, readable sizes, contrast.
3. **AI image** (OpenAI GPT Image, only when it helps or the user asks): a scene, photo-style background or
   illustration — **never with text in it** (generators still get Arabic letters wrong). The design places it and lays
   the exact text, logo and screens on top.
4. **Render + check:** headless Chromium renders each slide to PNG; the same check as the videos (text inside the frame
   with margins, readable size, contrast, no overlaps, personal data blurred, screens whole). Errors go back to the
   design step once; then the post is saved.

Runs as a worker job like videos (`live_jobs`, kind `post`): Chromium and fonts are already there.

## Models and cost (per post, estimates)

| Step | Model | ≈ $ |
|---|---|---|
| Write (all platforms) | `POSTS_MODEL` (default Sonnet 5.5) | 0.01–0.03 |
| Design (per slide) | `POSTS_MODEL` | 0.02–0.05 |
| AI image (when used) | `gpt-image-2`, medium quality | ≈ 0.05 each |

A single-image post for 3 platforms ≈ $0.10–0.25; a 6-slide carousel ≈ $0.30–0.60. Every call is logged in `ai_usage`
(kinds `post_write`, `post_design`, `post_image`) with a per-post cap (`POSTS_MAX_USD`, default 2).

## Data

- `posts`: workspace, company, type, platforms, brief, dialect, wants_image, status, generation.
- `post_versions`: post, version, content (per platform: text, hashtags, slides with storage paths), plan, cost,
  parent version.
- Storage bucket `posts` (private, signed URLs).
- `prices.post`, an `export_post` SQL function charging the wallet (like `export_video`), `ai_usage` kinds widened.
- New env: `OPENAI_API_KEY`, `POSTS_MODEL`, `POSTS_MAX_USD`, `POSTS_IMAGE_QUALITY` (low / medium / high).

## Build order (each step: typecheck + lint + commit; you test)

1. **Text-only posts end to end:** migration, nav + new-post form + post page (ar/en), the write step, edit text,
   request a change, versions, export charge.
2. **Single image:** the design step, render + check, per-platform sizes, download.
3. **Carousel:** slides, consistent design across slides, zip download.
4. **AI images:** OpenAI GPT Image for scenes/illustrations without text, placed by the design step.

Not in this version: posting or scheduling to the platforms (download + copy only), video posts (the video engine
already does them).

## Built (all four steps)

- **Database:** `supabase/migrations/0012_posts.sql` — apply it in Supabase before the first post.
- **App:** `app/[locale]/(app)/posts` (list), `posts/new` (form + `createPost`), `posts/[id]` (the post page:
  platform tabs, slides, copy, edit text, request a change, versions + undo, download → `export_post`).
  Nav: Posts. Strings: the `posts` namespace in `messages/ar.json` / `en.json`.
- **Jobs:** `startPostGeneration` in `lib/live-engine/server/jobs.ts` — a `live_jobs` row of kind `post` on the
  company's capture; files under `live-engine/{ws}/posts/{post}/{job}/`; `lib/posts/server/versions.ts` saves the
  version. Costs go to `ai_usage` (post_write / post_design / post_image, with post_id).
- **Worker:** `lib/posts-engine/worker` — `write.ts` (text per platform + slides), `images.ts` (OpenAI GPT Image,
  no text in images, ≤ 4 per post), `design.ts` (HTML + CSS per canvas, one repair round), `render.ts` (real screens
  via `<x-phone>` / `<x-laptop>` and the live engine's clones, personal data blurred, PNG + check), `run.ts`.
- **Settings:** `POSTS_MODEL` (default claude-sonnet-5-5), `POSTS_MAX_USD` (2), `POSTS_IMAGE_MODEL`
  (gpt-image-2.5-flare), `POSTS_IMAGE_QUALITY` (medium), `OPENAI_API_KEY`. The post price is the `prices` row
  `post` ($0.50 seeded — change it there).
- Carousel downloads save each slide as its own PNG (no zip).

## Image mode (default since this commit)

Each slide is one OpenAI GPT Image call (`/v1/images/edits`) that sees the brand: its logo (an SVG cropped to its mark
and rasterised), one or two of its own screenshots (website / product) and the slide's references (a real screen, a
captured photo), plus the exact on-image words. Haiku writes the text and each slide's scene, then reads every
generated image back: words exact, logo there, no other text — one retry with what was wrong. "Request a change"
sends the current slide as a reference so what wasn't asked to change stays. Expected ≈ $0.02–0.04 per image.
`POSTS_VISUAL=html` brings back the HTML designer (Sonnet, references, art-director review).
