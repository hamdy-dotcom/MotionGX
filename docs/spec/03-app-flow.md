# MotionGX — App flow

> Every screen, route and end-to-end flow **as the code works today**. Paths are relative to the repo root; `(app)` =
> `app/[locale]/(app)/`. Locales: `ar` (default, RTL) and `en`.

## 0. Guard and context

- `proxy.ts`: `/` → a locale; every page except `/login` needs a session (otherwise `/{locale}/login`); a signed-in visit
  to `/login` → `/{locale}`; `/dev/*` is open in development; `/api` and `/auth` are not guarded (routes check auth
  themselves).
- `getAppContext()` (`lib/context.ts`) loads the user, role and workspace; on the very first visit it calls
  `bootstrapAccount` → RPC `bootstrap_workspace` (defaults: country EG, currency EGP). There is no separate onboarding.
- The **active company** is the `mgx_company` cookie, else the newest (`lib/data/active-company.ts`); most studio screens
  redirect to `/companies/new` without one.

## 1. Screens

| Path | What it shows | Main actions → server |
|---|---|---|
| `/login` | logo, language switch, email field | `sendMagicLink` (Supabase OTP magic link; no password / OAuth) → email → `/auth/callback` |
| `/` **Home** (`(app)/page.tsx`) | film strip of recent designs (no text-only posts), this week, 3 ideas from brand facts, brand card, month counts (videos, posts, spend) | day → `/create?day=`; "make it" → `/create?kind=&brief=` |
| `/companies/new` | URL → capture (live log, SMS-code form) → brand editor + brand files | `POST/GET /api/brand/capture` (or legacy `/api/brand/extract`) → `saveCompany` |
| `/companies/[id]` | brand editor (identity, market: industry / countries / socials, facts), brand files incl. "Everything captured" | re-read (capture with `refresh`) → `updateCompany` |
| `/brand` **Brand kit** | lookbook: palette, logo, font sample in the brand's words, voice, audience, what sets it apart, features, gallery of everything captured | re-read / edit → `/companies/[id]`; gallery `GET /api/brand/capture?all=1` |
| `/create` **Create** | kinds: video, image, carousel, story, page cover, text; options; content type; brief; references; summary + price | `createVideo` / `createPost`; uploads via `POST /api/refs/sign`; query params `kind brief day idea company platforms type` |
| `/plans` **Content plans** | setup (period, rhythm, goals, mix, platforms, notes) → ideas + days panel | `savePlan`, `suggestIdeas`, `swapIdea`, `updateIdea`, `autoAssign`; make → `makeIdea` |
| `/calendar?m=YYYY-MM` **Publishing calendar** | month grid (Sat-first): work, accepted ideas, seasons | day → `/create?day=`; drag / modal → `updateIdea`; make now → `makeIdea`; season → `draftFromNotice` |
| `/library` **My work** | grid of videos & posts (filter, search), drawer per piece | links only |
| `/wallet` | ledger (last 50), balance, posts / minutes left, top-up, price list | `mockTopUp` |
| `/videos/[id]` | **Edit Room** for live/director versions; the older Studio otherwise; `CreatingVideo` while the first version is made | see flow B |
| `/posts/[id]?v=` | `CreatingStudio` while making; then versions, platform tabs, phone/desktop preview (feed / story / page header), slides, text panel | see flow C |
| `/videos/new`, `/posts/new`, `/posts` | redirects → `/create?kind=…` / `/library` | — |
| `/dev/posts-studio`, `/dev/video-studio` | dev only: sample posts studio; replay of a local run's creating screen | — |

## 2. API routes

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `app/auth/callback` | GET | magic-link landing (PKCE / token hash), locale cookie, → `/{locale}` or `/login?error=link` | public |
| `/api/brand/capture` | POST `{url, refresh?, companyId?}` | start a live capture (~10 min), rate-limited | session, not viewers |
| | POST `{captureId, code}` | the SMS code the capture agent asked for | session |
| | GET `?id=` (+`card=1` / `files=1` / `all=1`) | progress + brand draft / hero card / brand files / everything captured | session |
| `/api/brand/extract` | POST | legacy extractor (NDJSON stream) | session; legacy engine only |
| `/api/brand/snapshot` | GET | signed URL of a saved page snapshot | session |
| `/api/brand/files/[captureId]/[...path]` | GET | an image from a capture's packs (local cache) | workspace member |
| `/api/compositions/[videoId]/[version]/[token]/[...path]` | GET | the Edit Room's live composition (+ edit agent), sandbox CSP | HMAC token in path |
| `/api/refs/sign` | POST `{companyId, type, size}` | signed upload URL for one reference | session, not viewers |
| `/api/live-engine/[jobId]` | POST / GET `?ask=1` | worker progress reports / SMS-code poll | per-attempt bearer token |
| `/api/live-engine/watchdog` | GET | relaunch stalled jobs (resume from last finished step) | `CRON_SECRET` / `LIVE_WATCHDOG_TOKEN` |

## 3. Flows

### A. Sign in and the first company
1. Email → magic link → `/auth/callback` → `/{locale}`; the first `getAppContext()` bootstraps the workspace.
2. No company → "Add company" → `/companies/new`.
3. Capture (`companies/use-extraction.ts`): POST `/api/brand/capture`, poll every 3 s; the live log shows the agent's
   steps; an SMS-code form appears if the site asks. A failed capture falls back to an empty draft to fill by hand.
4. Brand editor: name, logo, colours, Arabic/Latin fonts, default dialect, tagline, tone; **market** (industry,
   countries, socials + "use in content"); **facts** (what it does, audience, features, numbers, offers, CTA).
5. Save → `saveCompany`: `companies` + `brand_profiles`, `linkCapture`, `saveCompanyMarket`, `saveLogo` → Home.
6. The brand switcher changes brand via `setActiveCompany` (cookie).

### B. A video
1. Create → kind video: size (9:16 / 4:5 / 1:1 / 16:9), length (15 / 30 / 60 s), goal, dialect, content type, brief,
   references.
2. `createVideo`: rate limit → `videos` (status `generating`) → `placeCreated` (day / plan idea `made`) →
   `saveCreateRefs` → `after(runGeneration)` → `/videos/[id]`.
3. Job: `startLiveGeneration` → `live_jobs` row → `launch` (job file with downloads: brand packs, references) → worker →
   director agent → progress callbacks → `insertLiveVersion`.
4. `CreatingVideo` polls `getGenerationStatus` and shows the live steps; then the **Edit Room**:
   - player, scene timeline on the beat, scene / element / director / versions tabs;
   - drag / resize / hide / retext → **Apply** → `applyEdits` → a `rerender` job (no model call);
   - **Ask the director** for one scene → `askDirectorScene` (an edit job resuming the agent);
   - another direction → `anotherDirection`; restore → `restoreVersion`.
5. Export → `exportVideoAction` → RPC `export_video` (renders row + `charge_export` charges the wallet) →
   `after(runRender)` → poll `getRenderStatus` → `renderDownloadUrl`; a failed render is refunded (`refund_render`).
   Not enough balance → "Top up".

### C. A post (image / carousel / story / page cover / text)
1. Create: image, story and cover go as `type=single` with `placement` feed / story / cover; carousel and text keep
   their type (text: no image).
2. Canvases: feed IG/FB/LinkedIn 4:5, TikTok 9:16, X 16:9; story 9:16 (IG / FB / TikTok); cover FB 1640×624, LinkedIn
   1584×396, X 1500×500, with a design kind (auto / people / graphic system / place).
3. Content type General / **Product update**; up to 8 references (images ≤ 15 MB, videos ≤ 50 MB, https links) uploaded
   straight to storage with signed URLs.
4. `createPost` → `posts` → `placeCreated` / `saveCreateRefs` / placement → `after(startPostGeneration)` → `/posts/[id]`.
5. Job: brand → write → images (one GPT Image call per slide and canvas; real screens composited in a device) → check →
   sizes → version. The page re-reads progress one read at a time and shows the live creating screen (cancel possible;
   a slow step says so).
6. Ready: platform previews, text per platform (copy / edit → `savePostText`), **request a change** →
   `requestPostChange` (free, from the shown version), undo → `undoPost`.
7. Download → `downloadPost` → RPC `export_post` (charges once per post, on the first download) → signed links.

### D. Content plans
1. Setup: period (1 week / 2 weeks / 1 month / custom), posts per week (3 / 4 / 5 / daily), goals, kinds, platforms,
   notes → `savePlan` → `suggestIdeas` (Sonnet writer with brand facts, industry, countries and the live seasons).
2. Ideas: accept (`updateIdea` ok; an occasion idea lands on its day if free), swap, reject, undo, "more".
3. Schedule: pick or drag a day → `updateIdea({scheduledOn})`; **Auto** → `autoAssign`.
4. Make (plans or calendar) → `makeIdea` → `createVideo` (9:16, 30 s, goal sell) / `createPost` with `plan_idea_id` and
   `scheduled_on`; the idea becomes `made`.

### E. Notifications
1. The bell (shell, per active company) loads `getNotices` after 2.5 s and every 10 min; for editors it also starts the
   day's background work: `ensureTrends` (industry + countries) and `ensureSeasonCheck` (up to 4 countries).
2. Built in order: schedule reminders (ready work without a day in the last 21 days, else an empty next week), up to 3
   industry trends, up to 4 upcoming seasons (pay days only within 4 days).
3. A new notice pops up once under the bell (`markSeen`); the panel has **Now** and **History** (`getNoticeHistory`:
   seen / later / dismissed / acted, with the notice's content and time).
4. Answers (`answerNotice`): later = hidden 24 h, dismiss = for good, acted = done. **Draft an idea** (season / trend) →
   `draftFromNotice` (Haiku, brand facts) → `/create?kind=&brief=&day=&company=`; schedule notices link to the calendar /
   plans.

### F. Money
- Top-up: `mockTopUp` only ($5 / $10 / $25 / $50; Vodafone Cash / InstaPay / Fawry / card; disabled in production;
  owner / admin) → `topup` ledger row with the FX rate locked.
- Charges happen in exactly two places: video export (`export_video` → `charge_export`, refunded on failure) and a
  post's first download (`export_post`). Everything else is free (counts only toward AI rate limits).

## 4. Navigation

- **Rail**: logo → `/`; brand switcher (+ add a company); **اصنع جديد / Create new** → `/create`;
  1 **الرئيسية / Home** `/` · 2 **خطط المحتوى / Content plans** `/plans` · 3 **أعمالي / My work** `/library` (also active on
  `/videos`, `/posts`) · 4 **جدول النشر / Publishing calendar** `/calendar` · 5 **هوية البراند / Brand kit** `/brand` (also
  `/companies`); footer: budget ticket → `/wallet`, account (sign out), language switch.
- **Top corner**: the notifications bell.
- **Phone**: brand switcher on top; tab bar Home · Plans · ＋ · Calendar · Brand.
