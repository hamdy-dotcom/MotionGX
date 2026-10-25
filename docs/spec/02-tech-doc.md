# MotionGX — Tech doc

> How MotionGX is built and runs **as implemented**. Product: `01-product-doc.md` · flows: `03-app-flow.md` ·
> data: `05-data-map.md`. Env var **names** only — never commit values.

## 1. Stack

| Layer | What (version) |
|---|---|
| Web app | **Next.js 16.4.3** (App Router, Turbopack, `proxy.ts` as middleware, `instrumentation.ts`), **React 19.3**, TypeScript 5, zod 4 |
| i18n | **next-intl 4** — `ar` (default, RTL) and `en`, `localePrefix: "always"` (`i18n/routing.ts`, `messages/{ar,en}.json`) |
| Styling | Tailwind 4 (older screens) + plain global CSS for the studio (`app/studio.css`, `s-`), Edit Room (`edit-room.css`, `er-`) |
| Data / auth / storage | **Supabase** (`@supabase/supabase-js` 2, `@supabase/ssr`) — Postgres with RLS, magic-link auth, private storage buckets |
| AI | **Anthropic** (`@anthropic-ai/sdk` 0.133) — Claude Haiku 5.5 / Sonnet 5.5 / Opus 5.5; **OpenAI GPT Image** via raw `fetch` to `/v1/images/edits` (post images) |
| Workers / rendering | **Playwright** 1.56 (headless Chromium: capture agent, frame rendering, checks), **ffmpeg-static**, `@vercel/sandbox` (cloud runner), esbuild (worker bundle) |
| Legacy | Remotion 4 (old MotionSpec engine + its exports), Firecrawl (old brand extractor) |
| Tooling | pnpm 12, ESLint (+ `scripts/check-logical.mjs` for logical CSS properties), `i18n:check` |

## 2. Repository map

```
app/
  [locale]/(app)/          studio pages: page (Home), create, plans, calendar, library, brand, wallet,
                           companies/{new,[id]}, videos/{new,[id]: edit-room, studio, creating-video},
                           posts/{new,[id]: post-studio, creating-studio, platform-preview}
  [locale]/login, [locale]/dev/{posts-studio,video-studio}
  api/                     brand/{capture,extract,snapshot,files}, compositions, live-engine/{[jobId],watchdog}, refs/sign
  auth/callback            magic-link landing
  studio.css, globals.css
components/                studio/ (shell, nav, notices, refs-picker, capture-gallery, brand-switch, plan-bits, …), shared UI
lib/
  ai/                      claude.ts (callTool, models), usage.ts (ai_usage, rate limits, prices), web.ts (web research)
  actions/                 server actions: account, notices, plans, studio
  data/                    read models: companies, works, schedule, market, refs, active-company
  brand/                   brand helpers (+ legacy Firecrawl extractor), light.ts (brand colour → studio)
  live-engine/             config, protocol (app↔worker contract), mapping,
                           server/ (jobs, runners, versions, composition, capture-cache, capture-gallery, brand files/draft, video-progress),
                           worker/ (worker, pipeline, sync, claude Ledger, steps: capture, profile, script, build, music, qa, render…)
  director-engine/         worker/ (agent, method, renderer, music, run), edits.ts, edit-agent.ts, assets/sfx (CC0)
  posts-engine/worker/     run, write, images, visual, design, render, platforms
  posts/                   config, price, mockups (platform previews), server/versions
  market/                  countries, industries, seasons (researched calendar), live (daily web check)
  trends/, notices/, plans/, refs.ts, pricing.ts, wallet.ts, context.ts, supabase/{admin,browser,server}
  motion/, render/, video/ legacy MotionSpec / Remotion engine (kept for older videos)
supabase/migrations/       0001–0016 (0007 = the v2 cleanup that dropped the v1 tables)
scripts/                   live-engine (resume-local), motion + music (legacy engine render/music), check-logical, i18n-check
docs/                      spec/ (this pack), licenses.md (third-party motion sources)
```

## 3. Engines

### 3.1 Switch — `VIDEO_ENGINE` (`lib/live-engine/config.ts`)
`live` (default) · `director` (the current video engine used in dev) · `legacy`. An edit always stays on the engine
of the version it edits (`live_jobs.input.engine`). Entry: `lib/motion/app.ts runGeneration` → `startLiveGeneration`.

### 3.2 Jobs (`lib/live-engine/server/jobs.ts`)
- `live_jobs` rows: kind `capture | video | post`, mode `new | direction | lines | edit | rerender`.
- **`launch(jobId)`** writes `job.json`: brief; signed (4 h) download URLs for the brand packs (`_pack/*.tgz[.partNN]`),
  the previous run (edits), finished-step outputs (resume), client references; market + social handles; post history;
  the last 5 video fingerprints; a random per-attempt token (only its sha256 is stored).
- **Runners** (`LIVE_ENGINE_RUNNER`): `local` — a detached `tsx lib/live-engine/worker/worker.ts` child, work folder
  `.work/live/<jobId>/a<n>/` with `worker.log`; `sandbox` — Vercel Sandbox (node 24, 4 vCPU, 45 min; worker bundled
  with esbuild, Chromium snapshot cached) — **untested end-to-end**.
- **Callbacks** `POST /api/live-engine/[jobId]` (Bearer token): `log`, `stage`, `ledger`, `upload` (signed upload URLs),
  `step_done`, `ask` (SMS code), `done`, `failed`; `GET ?ask=1` polls for the code.
- Steps — capture: `capture → profile`; video: `script → build → music → qa → render`; post: brand, write, format,
  image, check, sizes (image mode). A relaunched job skips `done_steps`.
- **Watchdog** `reviveStalledJobs()`: silent > 12 min → relaunch (max 3 attempts) or fail. Vercel cron every 5 min
  (`vercel.json`, `CRON_SECRET`); locally `instrumentation.ts` every 60 s (per-process `LIVE_WATCHDOG_TOKEN`).
  Manual: `pnpm live:resume <jobId>`.
- On finish: `insertLiveVersion` / `insertPostVersion`; `videos.generation` / `posts.generation` + status updated.

### 3.3 Brand capture (`worker/steps/capture.ts`, `profile.ts`)
Public crawl (screenshots, HTML, CSS, fonts, images, logo; legal pages skipped) → app agent (Claude drives Playwright
to sign up with `TEST_EMAIL` / `TEST_PHONE`, can ask the user for an SMS code; session saved as `auth.json`) → profile
(`brand.json`, Sonnet). Packed per folder (`.tgz`, split > 45 MB) into `live-engine/{ws}/captures/{capture}/_pack/`.
The app unpacks packs on demand into an OS-temp cache (`lib/live-engine/server/capture-cache.ts`) for the brand gallery.

### 3.4 Director engine — videos (`lib/director-engine`)
- An agent (model `DIRECTOR_MODEL`, default `claude-opus-5-5`; dev configs use Sonnet / Haiku) following the
  "/brag method" (`worker/method.ts`) writes `composition/video.src.html` — one HTML/GSAP page whose
  `window.__seek(t)` is a pure function of time.
- Tools: `list_files`, `read_file` (capture read-only; never `auth.json`), `write_file` (work dir), `clip_frames`,
  `set_storyboard` (script + music bed), `snapshot`, `check`, `render_video`, `finish`. Prompt caching; transcript saved
  every turn (edits resume the same agent from `director.tgz`). Cost cap `DIRECTOR_MAX_USD` (default $6).
- **check** (`renderer.ts`): contract, off-frame / small / low-contrast / overlapping text, unblurred PII, blank frames,
  logo visible at 0.3 s and 1 s.
- **render**: Playwright frames at 30 fps → libx264 (crf 18) segments → music bed + SFX (AAC 192k) → poster as frame 0,
  `+faststart`. The page blocks every non-`file://` request.
- **music** (`worker/music.ts`): pure-JS synthesis cut to the storyboard (mood → BPM range, seeded key / progression /
  drums).
- **Edit Room**: the composition is served same-origin from `/api/compositions/…/[token]/…` into a sandboxed iframe;
  `edit-agent.ts` (injected) seeks, scans scene elements and applies edits via postMessage; `edits.ts bakeEdits` writes
  the same CSS/text block into the source for the `rerender` job (no model call).
- Client references: images go in as files under `capture/refs/`; reference videos become image sequences
  (`videoFrames`).

### 3.5 Posts engine (`lib/posts-engine/worker`, settings `lib/posts/config.ts`)
- Writer `POSTS_MODEL` (default Sonnet 5.5), cap `POSTS_MAX_USD` (default $2).
- `POSTS_VISUAL=image` (default): one **GPT Image** call per slide and canvas (`POSTS_IMAGE_MODEL`, default
  `gpt-image-2.5-flare`; `POSTS_IMAGE_QUALITY`) from the logo + references, then a Haiku check (exact words, logo, no
  stray text / UI, physically plausible), one retry; real product screens are **composited** afterwards in a real
  phone / laptop frame (`placeDevice`). `html` mode designs slides in HTML instead.
- Placements: feed (per platform), story (9:16), cover (FB / LinkedIn / X sizes) with their own writing and image rules.
- Without `OPENAI_API_KEY` slides fall back to text only.

### 3.6 Seasons, trends, notices
- `lib/market/seasons.ts` — researched calendar (Oct 2026 → Dec 2027) per country / industry; pay days computed.
- `lib/market/live.ts ensureSeasonCheck` — once per country per day, Claude web search verifies the next 75 days
  (confirm / move / cancel with source) and adds missing seasons (`season_updates`, `season_checks`).
- `lib/trends/daily.ts ensureTrends` — once per industry + region per day (`industry_trends`).
- Both via `lib/ai/web.ts webResearch` (Sonnet + `web_search_20260209`, effort low, ≤ 6–8 searches, located by country).
- `lib/notices/build.ts` builds the pop-ups; answers and history in `notice_states`.

## 4. AI usage, cost and limits

| Where | Model |
|---|---|
| tone, facts, rewrites, notice drafts, image checks | Haiku 5.5 (forced strict tool call) |
| plan ideas, scripts, edits, web research, post writing | Sonnet 5.5 (`tool_choice: auto` + server-side refusal fallback) |
| director agent | `DIRECTOR_MODEL` (Opus 5.5 default) |
| post images | OpenAI GPT Image |

- Worker calls book a `Ledger` row (`cost.json`) and report it; the app writes `live_jobs.ledger` / `cost_usd` and
  `ai_usage`. App-side calls log via `logUsage`.
- Rate limits (`lib/ai/usage.ts`): 30 AI calls / hour / workspace, 30 post jobs / hour; capture, director agent and web
  research are logged but not limited.
- Money: `wallet_ledger` (append-only, triggers), balance only via `apply_ledger_entry`; charges via `export_video` /
  `charge_export` and `export_post`. Top-up is mocked (`mockTopUp`).

## 5. External services and env vars (names)

| Service | Vars |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (also the HMAC secret for composition links) |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI (post images) | `OPENAI_API_KEY` |
| Firecrawl (legacy) | `FIRECRAWL_API_KEY` |
| Vercel | `VERCEL`, `VERCEL_URL`, `CRON_SECRET` (Sandbox uses Vercel credentials) |
| Engine switches | `VIDEO_ENGINE`, `LIVE_ENGINE_RUNNER`, `LIVE_ENGINE_CALLBACK_URL`, `LIVE_WATCHDOG_TOKEN`, `LIVE_FLOW_CLIPS`, `DIRECTOR_MODEL`, `DIRECTOR_MAX_USD` |
| Posts | `POSTS_VISUAL`, `POSTS_MODEL`, `POSTS_MAX_USD`, `POSTS_IMAGE_MODEL`, `POSTS_IMAGE_QUALITY` |
| Capture identity | `TEST_PHONE`, `TEST_EMAIL` |
| Other | `HEADFUL`, `FFMPEG_PATH`, `PORT` |
| Legacy engine | `MOTIONGX_SPEC_MODEL`, `MOTIONGX_CAP_USD`, `MOTIONGX_STEMS_DIR`, `MOTIONGX_WS_TAG`, `MOTIONGX_DEBUG_PATCH`, `MOTIONGX_FORCE_RENDER_FAILURE` |

`ELEVENLABS_API_KEY` is set locally but unused by the code. `.env.example` lists the variables with comments — keep it
in sync with this table.

## 6. Security

- **RLS everywhere**, scoped by `is_member(workspace_id)`; storage by `storage_path_workspace(name)`. Server writes use
  the service-role client (`lib/supabase/admin.ts`).
- **Auth guard** in `proxy.ts`; `/dev` only in development.
- **Worker callbacks**: random per-attempt token, sha256 stored.
- **Compositions** (agent-written code): HMAC-signed, 12 h links (`timingSafeEqual`), sandboxed iframe
  (`allow-scripts` only), CSP `connect-src 'none'`, postMessage only.
- **Capture files** route: session + UUID + caller's workspace; CSP `default-src 'none'`.
- **Reference uploads**: viewers rejected; MIME allow-list and size limits; random paths under `{ws}/refs/{company}/`;
  `cleanRefs` accepts only the workspace's own paths or https links.
- **PII**: the director renderer blurs phone numbers, emails and the test identity in pasted UI; `check` fails
  unblurred PII. The agent can never read `auth.json` / `_private/`.

## 7. Run locally

1. `pnpm install`; fill `.env.local` (table above); apply `supabase/migrations` 0001–0016 in order; Supabase auth
   redirect for `http://localhost:3000/**`.
2. Start a dev server from `.claude/launch.json`: `dev-live`, `dev-director`, `dev-director-sonnet`,
   `dev-director-haiku` (all `LIVE_ENGINE_RUNNER=local`, port 3000). The watchdog starts with the server.
3. Studio CSS changes need a dev-server restart and `rm -rf .next/dev .next/cache`.

## 8. Known caveats

- The sandbox runner is untested; local runner only.
- Payments are mocked; no real payment provider yet.
- The legacy engine is kept so 2 older videos still open; parts of it (music library, illustrations, motion refs) use
  tables dropped in 0007 and no longer work.
- Post jobs restart from scratch when relaunched; composition and capture caches live in the OS temp folder.
