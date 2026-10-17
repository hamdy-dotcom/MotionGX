# Live engine — plan to replace the MotionGX generation method

Status: **approved 2026-10-17** with the decisions below (they override anything later in this file). Implementation on branch `live-engine` (from `feat/page-snapshot`).
Source of truth for the method: `../video-sandbox` (read in full: README, pipeline, run, server, steps/*, lib/*, vendor/kit.js).
Baseline to beat: sandbox run `2026-10-17-01-00-31-pzsz-mantoog-com` — 321 s, $0.976 total = **$0.878 one-time brand** (capture agent $0.772 over 41 Sonnet calls, profile $0.106) + **$0.098 per video** (script $0.031, build $0.053, QA vision $0.001, repairs $0.013).


## Decisions (approved 2026-10-17) — these override the sections below

**Blocker.** Restore the dropped columns in `0008_live_engine.sql`, additive only (nullable columns, `if not exists`, no drops, no renames). The SQL is shown to Hamdy before it is applied (he runs it).

**UI changes approved (nothing else under `app/` or `components/`):**
1. Studio data for live versions (A1).
2. The MP4 in the existing preview box for live versions (A2).
3. SMS-code input in the progress panel (A3): existing components and styles, one action (`submitCaptureCode`), 4 i18n keys in every locale (ar, en).
4. Honest copy (A4): "first video for a company takes ~10 min, later ones ~1 min", existing text style.

**Q4 voiceover.** Live is music-only for now. With `VIDEO_ENGINE=live`, voiceover is never charged (the video is saved with `voiceover=false`) and the toggle on the new-video form shows disabled with a "soon" label (existing disabled style; one i18n key). Voiceover gets ported later.

**Q10 edits** (both create a new version, as today):
- Edit lines → write the edited lines into the saved script (headline / sub per scene), then build → music → qa → render, reusing the brand capture (no capture, no script call).
- Request a change → the request is passed as `fixIssues` to `buildVideo` (one rebuild), then qa → render (the music bed is reused: it depends only on the script).

**Q2 Vercel.** Checked: the Vercel CLI isn't installed, the repo isn't linked to a Vercel project (no `.vercel/`), and the saved CLI login on this Mac expired on 2026-08-07 (API answers `invalidToken`), so the plan can't be read. Design for the **45-minute cap** regardless:
- The capture (capture + profile) runs as its **own** sandbox job and saves its result to storage before any video job starts.
- A crashed or timed-out job **resumes from the last finished step** (capture → profile → script → build → music → qa → render): every step uploads its outputs when it finishes and is recorded on the job; a restart downloads them and skips finished steps.
- No custom image (the plan can't be confirmed): Chromium + ffmpeg are installed at boot and cached in a sandbox snapshot reused by later jobs.

**Q12 capture scope.** The agent may only act on the company's own website: the same registrable domain as `companies.website_url` plus its subdomains, plus pages that site opens itself (links clicked on it, tabs it opens, store/preview URLs, and links in the confirmation emails it sends). `goto` to anything else is refused, and actions on a page outside that scope are refused. No allow-list UI. Every capture is logged (company, domain, identity email, steps, status, cost) in `live_brand_captures`.

**Other questions — chosen as close to the sandbox as possible:**
- Q1: all dropped columns restored (additive). The legacy engine's own tables (`motion_refs`, `motion_treatments`, `illustrations`, `music_tracks`) stay dropped — see the SQL review note.
- Q3: the worker gets `ANTHROPIC_API_KEY` in its environment, as the sandbox does. No Supabase service key in the worker (signed URLs only).
- Q5: `goal→objective` as in §2; `msa` → country text `"Arab world — Modern Standard Arabic (فصحى)"` (the sandbox's script step accepts free text when the code isn't in `COUNTRIES`).
- Q6: pass the real length (15 s) as the sandbox does; its grid code rounds to bars and the render stops at 15 s.
- Q7: `auth.json` stored as-is (as in the sandbox), in the private bucket, service-role only.
- Q8: no new cost cap (the sandbox has none beyond the 130-step agent limit). Capture-agent calls are logged to `ai_usage` as `live_capture` and **not** counted by the 30-calls/hour limit (one capture is ~40–130 calls).
- Q9: branch `live-engine` from `feat/page-snapshot`; `v2` stays unmerged.
- Q11: the render step also writes a silent copy (`video-silent.mp4`, an `-an` remux); export uses it when the music toggle is off, and the studio preview mutes the `<video>`.
- Q13: live moods map onto the existing labels (driving→energetic, uplifting→warm, tense-then-release→energetic, chill→warm) — no new keys.

---

## 0. Blocking finding — read first

**The database no longer matches the UI you want to keep.** `0007_v2_engine.sql` (from the `v2` branch) has been run. Checked live today:

| What the v1 UI / server uses | In the database now |
|---|---|
| `videos.generation` (progress + stage), `videos.music_enabled` | **gone** |
| `video_versions.scenes, script, spec, plan, custom_js, energy_map, qa, audio` | **gone** (only `id, video_id, version, created_at` left) |
| `music_tracks`, `motion_*`, `illustrations*`, `music` bucket | gone |
| `renders.progress`, `brand_profiles`, `brand_assets`, wallet, prices, voices | intact |
| v2 tables `video_jobs`, `video_concepts`, `video_scripts`, `video_assets`, `video_fingerprints`, `brand_briefs`, bucket `video-assets` | present (unused by this branch) |

So on this branch (`feat/page-snapshot`, v1 UI + page snapshot) `createVideo` (inserts `generation`) and the studio page (reads `video_versions.*`) already fail. The plan therefore **restores the columns the UI contract needs** in a new migration (§4), named `0008_live_engine.sql` because `0007` is already taken by the applied v2 migration (its file lives only on the `v2` branch).

---

## 1. UI contract (must stay identical)

Everything under `app/` pages and `components/` that touches generation. Names, shapes, statuses and stages below are kept exactly; the live engine fills them.

### 1.1 Server actions / routes the UI calls (signatures unchanged)
`app/[locale]/(app)/videos/new/actions.ts`
- `createVideo(prev, formData) → { error?: "briefRequired"|"generic"; aiError?: AiErrorCode }` — inserts the `videos` row with `status:"generating"`, `generation:{stage:"queued", mode:"new", updated_at}`, `after(() => runGeneration(id, {kind:"new"}))`, redirects to `/videos/{id}`. **Unchanged.** Only `runGeneration` dispatches on the flag (§7).

`app/[locale]/(app)/videos/[id]/actions.ts` — all unchanged in signature:
- `saveLines(videoId, beats: ScriptBeat[]) → {ok:true; version} | {ok:false}`
- `anotherDirection(videoId) → ActionResult`, `requestEdit(videoId, instruction, baseRevision?) → ActionResult`
- `undoLastChange(videoId, version, revision) → UndoResult` (`{ok:true;version}|{ok:false;error:"stale"|"nothing"|"failed"}`)
- `getGenerationStatus(videoId) → {status, generation} | null` (polled every 3 s while `generating`)
- `setMusicEnabled(videoId, enabled) → boolean`
- `exportVideoAction(videoId) → {ok:true; costUsd; renderId} | {ok:false; error:"insufficient"|"generic"}`
- `renderDownloadUrl(renderId) → string|null`, `getRenderStatus(renderId) → {status, progress}|null`
- `ActionResult = {ok:true} | {ok:false; error: AiErrorCode|"generic"}`

`app/[locale]/(app)/companies/actions.ts` (`saveCompany`, `updateCompany`, `saveLogo`), `POST /api/brand/extract` (NDJSON `ExtractEvent`s, steps `logo, colors, fonts, tone, facts, snapshot`), `GET /api/brand/snapshot` — **untouched**. The live capture is a separate, later step (first video of a company), so company creation stays exactly as it is.

### 1.2 Tables / columns the UI reads
- `videos`: `id, title, format, length_s, dialect, voiceover, status, created_at, music_enabled, generation` (+ `companies(name, brand_profiles(colors))`).
- `videos.generation` (jsonb, replaced on every write): `stage, mode ("new"|"direction"|"edit"), updated_at`; on `done`: `version, cost_usd, to_preview_s` (+ legacy-only keys `slideshow_risk, illustration_reuse, flagged, issues`); on `error`: `error`; on `edit_failed`: `issues`.
- `video_versions` (latest): `version, scenes, script, qa{history, validation, taste}, audio{mix, sfx}` + legacy `spec, plan, custom_js`.
- `renders`: `id, status, progress (0..1), output_path, error, created_at, cost_usd, version_id, video_id` — Realtime `UPDATE` on `renders` + 5 s poll fallback.
- `wallet_ledger`, `prices`, `fx_rates`, `workspaces`, `voices` — unchanged.

### 1.3 Statuses and stages (kept verbatim)
- `videos.status`: `draft | generating | ready | review | exporting | failed | needs_direction`.
- Studio progress stages (studio.tsx:53): `["queued", "plan", "spec", "music", "ready", "done"]`; terminal: `edit_failed, edit_stale, needs_direction, error`. Labels `studio.stage_*`.
- Live mapping onto the same stages (no new stage strings, except the one in §6 needing approval):

| Stage written | Live steps running |
|---|---|
| `queued` | job created |
| `plan` | capture (first video of a company only) → profile (first only) → script |
| `spec` | build → QA safety net |
| `music` | music |
| `ready` | render |
| `done` | MP4 stored, version inserted |

### 1.4 Storage the UI reads
`renders/{workspace_id}/{render_id}.mp4` (signed download), `brand-assets/…` (logos, page snapshot). The `music` bucket is gone (§4).

### 1.5 UI changes I need you to approve (nothing else under `app/` or `components/` changes)
The studio is built around a MotionSpec player, and the live engine produces an HTML composition + MP4, so a few UI touches are unavoidable:

| # | File | Change | Why |
|---|---|---|---|
| A1 | `app/[locale]/(app)/videos/[id]/page.tsx` | Build `current` for a **live** version: `{engine:"live", version, revision, canUndo, beats, qa, mixUrl, previewUrl, input:{fps,durationInFrames,width,height}, plan:{concept, motion_language, music_mood, energy, shots}}` from the new columns; legacy branch unchanged. | The page currently needs `spec/plan/custom_js` + `runtimeInputWithAssets`. |
| A2 | `app/[locale]/(app)/videos/[id]/studio.tsx` | `StudioVersion` becomes a union (`legacy` as today \| `live`). For `live`, the preview box shows `<video src={previewUrl} controls playsInline>` in the same frame/size instead of `<MotionPreview>`; seek/play buttons drive the `<video>`. Everything else (panels, export, lines, request edit, undo, music toggle) stays. | The sandboxed Remotion player can only play MotionSpecs. |
| A3 | `studio.tsx` + `videos/[id]/actions.ts` + 4 i18n keys (ar/en) | SMS-code prompt (§6): when `generation.stage === "awaiting_code"`, the progress panel shows the request + one input + submit, calling a new action `submitCaptureCode(videoId, code)`. | No code-entry pattern exists in the app (§6). |
| A4 | `messages/{ar,en}.json` | Optional: a capture-specific hint while `plan` runs on a company's first video ("We're test-driving your product for the first time — about 10 minutes"), new key `studio.captureHint`. `generatingHint` ("usually under a minute") is wrong for that run. | Honest progress copy. |

---

## 2. Mapping — sandbox → MotionGX (`lib/live-engine/`, TypeScript, same logic)

| Sandbox | MotionGX file | Notes |
|---|---|---|
| `pipeline.mjs` (`runPipeline`, `DEFAULT_MODELS`, `brandSlug`, reuse rules: capture v4 + inside-app check, profile reuse) | `lib/live-engine/pipeline.ts` (runs **inside the worker**, §3) + `lib/live-engine/run.ts` (server side: `runLiveGeneration(videoId, mode)` = start worker, track job) | Same reuse rules, keyed by company instead of `brands/<slug>`. |
| `steps/capture.mjs` (`PROBE, MARK, REGIONS, OBJECTS, capture, runAgent` incl. all tools, system prompt, identity, essentials plan, finish refusal, 130-step cap, resnap) | `lib/live-engine/steps/capture.ts` | Verbatim prompts/tools. File writes go to the worker's work dir, then upload (§4). `.sandbox-settings.json` (remembered phone/email) → `live_brand_captures.settings` per workspace (§4). |
| `lib/snapshot.mjs` (`SNAPSHOT`, `saveSnapshot`, `fontFaceCss`) | `lib/live-engine/snapshot.ts` | In-page functions stay plain functions passed to `page.evaluate`. |
| `lib/inbox.mjs` (mail.tm) | `lib/live-engine/inbox.ts` | Unchanged. |
| `steps/profile.mjs` | `lib/live-engine/steps/profile.ts` | Same tool schema + library sort. |
| `steps/script.mjs` (`OBJECTIVES, COUNTRIES, LAYOUTS`, grid normalisation) | `lib/live-engine/steps/script.ts` | Brief comes from the `videos` row (mapping below). |
| `steps/build.mjs` (`buildVideo`, `embedClones`, laptop frame) | `lib/live-engine/steps/build.ts` | Same prompt; asset paths rewritten for the worker folder. |
| `steps/qa.mjs` (`inspect`, `visionLook`, `repair`, `safetyNet`) | `lib/live-engine/steps/qa.ts` | Same thresholds, ≤2 repairs, 1 rebuild. |
| `steps/music.mjs` (`makeMusic`, 120 BPM, drops) | `lib/live-engine/steps/music.ts` | Pure TS, unchanged. |
| `steps/render.mjs` (`render`, `checkComposition`; 30 fps, 3 workers, ffmpeg) | `lib/live-engine/steps/render.ts` | ffmpeg from `ffmpeg-static` in the worker image. |
| `vendor/kit.js`, `vendor/gsap.min.js` | `lib/live-engine/vendor/kit.js`, `gsap.min.js` (copied byte-for-byte) | Shipped into the worker. |
| `lib/claude.mjs` (`MODELS, PRICES, Ledger, callTool, rawCall, imageBlock`) | `lib/live-engine/claude.ts` | Same calls/effort/models; the Ledger also reports each row to MotionGX (§5). |
| `server.mjs` (SSE log, `askCode`, 10-min timeout) | `app/api/live-engine/[jobId]/route.ts` (worker → app callbacks) + `submitCaptureCode` action | Replaces the local SSE server. |
| `run.mjs` (CLI) | `scripts/live-engine/run.ts` (`pnpm live:run <videoId>`) | Local test runner. |

**Brief mapping** (MotionGX form fields → sandbox brief):
- `url` ← `companies.website_url`; `description` ← `videos.brief`; `layout` ← `videos.format` (`9:16|1:1|16:9`, all in `LAYOUTS`); `length` ← `videos.length_s` (15|30|60 — the grid needs even seconds: 15 → see open question Q6).
- `objective` ← `videos.goal`: `sell→acquire`, `launch→launch`, `offer→offer`, `about→awareness`, `hiring→recruit`, `occasion→announce` (Q5).
- `country` ← `videos.dialect`: `eg→EG`, `sa→SA`, `gulf→AE`, `lev→JO`, `en→US`, `msa→?` (Q5).
- `pace`, `voiceover`, `voice_id`: the sandbox has no use for them (Q4).

**Changes forced by serverless/TypeScript (listed as required by your rules — no behaviour change intended):**
1. Brand folders/runs become storage paths + DB rows instead of `brands/` and `runs/` on disk (§4).
2. `askCode` becomes a DB-backed request/answer through the callback route (§6) instead of an in-memory promise.
3. The Ledger posts each row to the app (for `ai_usage`) besides keeping `cost.json`.
4. `log()` lines become `live_jobs.log` entries + `videos.generation.stage` updates at step boundaries.
5. Paths like `../../vendor/gsap.min.js` in the build prompt stay valid because the worker keeps the sandbox's relative layout (`runs/<id>/video.html` next to `vendor/`).

---

## 3. Runtime — where each step runs

Playwright/Chromium and ffmpeg can't run in a Vercel function. This repo already depends on `@vercel/sandbox` (^3.6.1; never actually used — only in `legacy/lib/motion/runner.ts`, "not verified"). `@remotion/vercel` and `lib/render` are Remotion-specific and are **not** needed: the live engine renders with Playwright + ffmpeg, not Remotion.

**Plan: the whole live pipeline runs as one worker inside a Vercel Sandbox; the Next.js app only starts it, receives callbacks, and serves results.**
- **Why one worker, not step-by-step from a function:** the capture agent interleaves model calls with browser actions (41–130 turns, 5–10 min), and QA/render need the same browser plus files from the build. A function `after()` is capped at `maxDuration = 800` s and dies with the request; a sandbox lasts up to 24 h (Pro) / 45 min (Hobby).
- **Image:** Vercel Sandbox is an Ubuntu microVM with passwordless sudo, Node 24, custom OCI images via Vercel Container Registry. Proposed: a small custom image with Playwright 1.56 Chromium + system deps + `ffmpeg-static` + the worker bundle (fast boot, reproducible). Fallback: the default `universal` image + `npx playwright install --with-deps chromium` at boot (~1–2 min slower). (Q2)
- **Resources:** 4 vCPU / 8 GB (render uses 3 parallel Chromium pages, as in the sandbox).
- **Flow:** `runGeneration` (flag `live`) → `startLiveJob(videoId, mode)` creates a `live_jobs` row + a one-time job token, creates the sandbox with `timeout` 45 min, writes the worker bundle and `job.json`, starts `node worker.js` **detached**, returns. The worker calls `POST /api/live-engine/{jobId}` with the token for: stage changes, log lines, ledger rows, SMS-code requests, signed upload URLs, completion/failure. The route updates `videos.generation`, `live_jobs`, `ai_usage`, inserts `video_versions`, and sets `videos.status` — the same writes `runGeneration` does today.
- **Secrets in the sandbox:** only `ANTHROPIC_API_KEY` (Q3: a separate, limited key for the worker) + the job token. **No** Supabase service-role key: all storage writes go through signed upload URLs issued by the callback route; reads of the brand capture through signed download URLs passed in `job.json`.
- **Local dev:** `LIVE_ENGINE_RUNNER=local` runs the same `worker.js` as a child process on the Mac (Playwright installed locally), with the same callback route on `localhost:3000` — this is also how the end-to-end test runs before Vercel (Q2).
- **Export:** stays in the function. The MP4 already exists after generation, so `runRender` for a live version **copies** it into `renders/{workspace}/{render_id}.mp4` (Supabase storage copy), sets `progress`/`done`, or calls `refund_render` on failure — same states the UI watches. MP4 verification (duration/fps/size/audio) happens in the worker right after render, as the sandbox's render step does.

---

## 4. Data — storage + tables (`supabase/migrations/0008_live_engine.sql`)

### 4.1 Restore what the UI contract needs (dropped by 0007)
```sql
alter table public.videos add column if not exists generation jsonb not null default '{}'::jsonb,
                          add column if not exists music_enabled boolean not null default true;
alter table public.video_versions add column if not exists scenes jsonb not null default '[]'::jsonb,
  add column if not exists script jsonb not null default '{}'::jsonb,
  add column if not exists qa jsonb, add column if not exists audio jsonb;
```
(Legacy MotionSpec columns `spec, plan, custom_js, energy_map` are restored too while `VIDEO_ENGINE=legacy` stays the default, so the flag can actually switch back — Q1.)

### 4.2 New
- `live_brand_captures` — one row per company capture (reused for every video of that company):
  `id, workspace_id, company_id, version (=4), status ("running"|"done"|"blocked"|"step_limit"|"error"|"no_app_link"|"skipped"), app_status, manifest jsonb (capture.json), profile jsonb (brand.json), storage_prefix, cost_usd, created_at, updated_at`.
  Reuse rule = the sandbox's: latest row with `version >= 4` and (`app screens > 0` or `app_status in (no_app_link, skipped)`).
- `live_jobs` — one per generation run: `id, workspace_id, video_id, mode, capture_id, status, stage, ask jsonb ({sent_to, asked_at, answer, answered_at}), log jsonb, ledger jsonb, cost_usd, sandbox_id, token_hash, error, created_at, updated_at`.
- `video_versions` gains `engine text default 'legacy'`, `composition_path text` (video.src.html), `mp4_path text`, `live_script jsonb`, `live_qa jsonb`.
- `ai_usage.kind` check adds: `live_capture, live_profile, live_script, live_build, live_qa, live_repair` (plus `ai_usage.workspace_id` is already nullable since 0004).
- RLS: members select their workspace's rows; all writes via service role (callback route).

### 4.3 Storage — new private bucket `live-engine`
- Brand capture (one-time per company): `{workspace_id}/brands/{company_id}/{capture_id}/` — `screens/ parts/ clones/ html/ probes/ assets/ library/ agent/ capture.json brand.json` and **`auth.json`** (the saved login of the test account on the brand's site; service-role only, never signed to the browser — Q7).
- Runs: `{workspace_id}/runs/{video_id}/{job_id}/` — `brief.json assets.json script.json video.src.html music.wav qa.json qa-*.jpg cost.json summary.json video.mp4` (`video.html` is rebuilt from `video.src.html` + clones and not stored).
- Storage policy: select for members by first path segment (`storage_path_workspace`), as for `renders`.
- The studio preview (`previewUrl`) = a 1 h signed URL of `video.mp4`; `mixUrl` = signed URL of `music.wav` (the `music` bucket is gone).

### 4.4 Version shape for a live run (what A1 reads)
`scenes` = script scenes as `ScriptBeat[]` (`id "s{n}", role = purpose, start_s, end_s = start+bars*2, lines = [headline, sub?], voiceover_line: null`); `script = {title: idea, generator: "live"}`; `qa = {history, validation: qa.history rounds}`; `audio = {mix: music.wav path, sfx: null}`; `live_script` = full script.json; `live_qa` = qa.json.

---

## 5. Billing

- **Unchanged for the user.** Today AI calls are free to the user and only exports touch the wallet: `export_video()` → `charge_export()` (per billed second, `video_min` + `voiceover_min`) → `refund_render()` on failure. The live engine keeps that rule exactly; `exportVideoAction`, the prices, the ledger and the studio's price label don't change.
- **Ledger → `ai_usage`:** every ledger row (step, model, in/out/cache tokens, usd) is posted by the worker and inserted into `ai_usage` with `workspace_id`, `video_id`, `kind` (`capture-agent→live_capture`, `profile→live_profile`, `script→live_script`, `build|rebuild→live_build`, `qa-vision→live_qa`, `qa-repair-*→live_repair`). `live_jobs.cost_usd` and `generation.cost_usd` hold the run total; `live_brand_captures.cost_usd` holds the one-time brand cost.
- **Rate limit conflict:** `assertWithinRateLimit` allows **30 AI calls / workspace / hour**; one capture makes 41–130 calls. Proposal: the capture agent's calls are logged but don't count toward the hourly limit (only one capture can run per company); everything else counts as today (Q8).
- **Cost cap:** a per-run hard cap like `GENERATION_CAP_USD` (proposed $3 with capture, $0.50 without) — the worker stops and reports `error` if exceeded (Q8).

---

## 6. The SMS-code human step

**There is no existing code-entry pattern.** The only mid-process prompt is the rebrand name check in `brand-editor.tsx` (a status box with chip buttons, shown after the stream ends — not a blocking round-trip). Login is an email magic link with no code field.

Proposed smallest addition (approval item **A3**), in the studio's existing style (reuses the `role="status"` box + input + primary button used by the name check and the change-request box):
1. Worker's `askCode(sentTo)` → callback `{type:"ask", sent_to}` → route sets `live_jobs.ask` and `videos.generation = {stage:"awaiting_code", mode, ask:{sent_to}}` (status stays `generating`).
2. The studio already polls every 3 s; when `stage === "awaiting_code"` the progress panel shows "{sent_to}" + one input + "Send" → `submitCaptureCode(videoId, code)` (checks membership, writes `live_jobs.ask.answer`).
3. The worker polls `GET /api/live-engine/{jobId}/ask` every 3 s; gets the code; stage returns to `plan`.
4. Same limits as the sandbox: 10-minute wait, max 3 asks, empty answer = `blocked` (the capture continues without the app, as in the sandbox).
- New i18n keys (ar/en): `studio.codeTitle`, `studio.codeHint`, `studio.codeSend`, `studio.stage_awaiting_code`.
- Without A3 approved, the only fallback is "no human attached": the agent stops as `blocked` on SMS sites (the sandbox's `!brief.askCode` path).

---

## 7. Switch-over

- One env flag `VIDEO_ENGINE=live|legacy` (default **legacy**), read once in `lib/motion/app.ts` `runGeneration` (and `runRender`, which branches on `video_versions.engine` so old versions keep working).
- Legacy needs the 0008 restore (§4.1) to run again at all (it's broken against today's DB).
- Legacy code (`lib/motion`, `remotion/`, `packages/primitives`, `preview/`, MotionPreview, legacy columns) is deleted **only in a final separate commit after you say so**.
- Work happens on a new branch `live-engine` cut from `feat/page-snapshot` (v1 UI + the page snapshot). The `v2` branch (bespoke-composition engine) is not merged; its `0007` stays applied (Q9).

---

## 8. Test plan

1. Per commit: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm i18n:check`.
2. End: `pnpm build` (with `pnpm install` first — `node_modules` on disk is still the slimmed `v2` install).
3. Unit-level parity: run the TS ports of `makeMusic`, `embedClones`, script-grid normalisation on the sandbox's saved `mantoog-com` inputs and diff the outputs against the sandbox files (byte-identical for music/embed; same scene grid).
4. **Real end-to-end on mantoog.com through the normal UI:** `pnpm dev` with `VIDEO_ENGINE=live`, `LIVE_ENGINE_RUNNER=local` → create a video for منتوج (9:16, 30 s, the same brief text as sandbox run `pzsz`) in the UI → watch the stages in the studio → (answer an SMS code if asked) → preview plays → Export → download the MP4. Then repeat once with `LIVE_ENGINE_RUNNER=sandbox` (Vercel Sandbox) if Q2 allows.
5. Compare against sandbox run `pzsz`: cost split per step (capture/profile one-time vs script/build/QA per video), seconds, QA errors shipped, and a side-by-side contact sheet + both MP4s. Report the cost split and send the MP4.

---

## Open questions (I won't guess these)

- **Q1 — Legacy fallback.** Restore the legacy MotionSpec columns so `VIDEO_ENGINE=legacy` really works again, or only restore what the live path + UI need and treat legacy as already dead (the DB broke it)?
- **Q2 — Vercel.** Which plan (Hobby: 45 min / 4 vCPU; Pro: 24 h / 8 vCPU)? OK to push a custom sandbox image to Vercel Container Registry, or install Playwright at boot? Is the project linked (`vercel env pull` / OIDC) so the SDK can authenticate?
- **Q3 — Keys in the sandbox.** OK to pass `ANTHROPIC_API_KEY` into the sandbox, or do you want a separate restricted key for the worker?
- **Q4 — Voiceover.** The sandbox makes music-only videos. The form still offers voiceover (and prices it at +$1/min). For live: hide nothing (UI unchanged) but ignore voiceover? Or disable live for voiceover videos? Or add ElevenLabs later?
- **Q5 — Mappings.** `goal → objective` and `dialect → country` as in §2 OK? What should `msa` map to (the sandbox has no MSA country)?
- **Q6 — 15 s videos.** The grid is 2-second bars (15 s → 7.5 bars). Round to 16 s and trim the render to 15 s, or 14 s?
- **Q7 — `auth.json`.** It holds the test account's session cookies on the brand's site. Store as-is in the private bucket (service role only), or encrypt at rest?
- **Q8 — Rate limit / cap.** Exempt capture-agent calls from the 30/hour limit? Per-run cost caps ($3 first video / $0.50 after)?
- **Q9 — Branches.** Base `live-engine` on `feat/page-snapshot` (v1 UI + snapshot)? And what happens to `v2` (its tables stay in the DB unused)?
- **Q10 — Edits on live videos.** `saveLines` and `requestEdit` exist in the UI; the sandbox has no edit flow. Options: (a) `saveLines` = replace the headline text in `video.src.html` → QA → re-render (~$0, ~1 min); `requestEdit` = one Sonnet find/replace call with the client's instruction (the sandbox's `repair` mechanism) → QA → render; (b) keep the buttons but return `generic` errors for live versions. (a) is new logic, so it needs your OK.
- **Q11 — Music toggle.** Live has one music bed and no separate SFX stem. With music off, export the MP4 with silent audio (one ffmpeg pass in a short sandbox job), or keep the music?
- **Q12 — Capture consent/scope.** The agent signs up on the company's website with a throwaway identity and test values. Only for companies the workspace owns? Any domain allow/deny list or a confirmation checkbox before the first capture?
- **Q13 — Music mood labels.** The studio shows `music.mood_*` for `energetic|warm|corporate|luxury`; live moods are `driving|uplifting|tense-then-release|chill`. Map them (driving→energetic, uplifting→warm, tense-then-release→energetic, chill→warm), or add 4 i18n keys (UI change)?

## Implementation notes (2026-10-17)
- Studio: besides the approved items, `onSave` / `onExport` treat `saveLines → {started: true}` as a started generation (needed for Q10 "Edit lines" on live versions: the rebuild is async, so the panel must switch to progress instead of showing "saved").
- Watchdog: `GET /api/live-engine/watchdog` (Bearer `CRON_SECRET`) relaunches silent jobs (12 min without a report, max 3 attempts). Without a cron (local runs), the studio's status poll triggers the same check at most once a minute.
- A capture job's `video_id` is the video that triggered it; other videos of the same company queue behind it (`live_jobs.capture_id` null) and launch when it finishes.
- Worker reports are posted one at a time, in order. `lib/live-engine/worker/package.json` marks the folder ESM (the ports use top-level await / `import.meta.url`).
- Verified locally against a mock callback (sandbox mantoog brand): full video job $0.0927 / 183 s; resume after `music` skips script/build/music and re-embeds the clones.
- Sandbox runner: written to the @vercel/sandbox 3.6.1 API, untested (no valid Vercel credentials on this machine).
