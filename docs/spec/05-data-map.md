# MotionGX — Data map

> The data model **as it stands** after migrations 0001–0016 (Supabase Postgres). Shapes of JSON columns are taken from
> the code that writes them.

> **Repo note:** `0007_v2_engine.sql` was applied but lives only on the `v2` branch (`git show v2:supabase/migrations/0007_v2_engine.sql`).
> It dropped the v1 engine tables (`music_tracks`, `motion_refs`, `motion_treatments`, `motion_custom_behaviors`,
> `illustrations`, `illustration_uses`, the `vector` extension) and added six v2 tables; 0008 restored the columns the
> live engine needs. The state below includes it. Bring 0007 into `main` so a fresh database can be rebuilt.

## 1. Relationships

```
auth.users ─1:1─ profiles
auth.users ─< workspace_members >─ workspaces ─< wallet_ledger (→ renders | ref_post_id)
workspaces ─< companies ─1:1─ brand_profiles
                        ├─< brand_assets
                        ├─< live_brand_captures (company nullable) ─< live_jobs.capture_id
                        ├─< videos ─< video_versions ─< renders ─< wallet_ledger (export / refund)
                        │          └─ voices (voice_id)
                        ├─< posts ─< post_versions
                        ├─< content_plans ─< plan_ideas ─→ video_id / post_id (once made)
                        └─< notice_states (per user)
live_jobs ─→ video | post | company | capture        (kind capture | video | post)
ai_usage  ─→ workspace (nullable), video, post
global: industry_trends (industry + region + day), season_updates / season_checks (country), prices, fx_rates, voices
```

## 2. Tables

### Tenancy and brands
| Table | Key columns | A row is |
|---|---|---|
| `profiles` | `id` → auth.users; `full_name`; `locale` ∈ ar, en | a user |
| `workspaces` | `name`; `country_code` (EG); `currency_code` (EGP); `wallet_balance_usd` ≥ 0 (trigger-maintained only); `monthly_cap_usd` | a tenant and its wallet |
| `workspace_members` | workspace, user, `role` ∈ owner, admin, editor, viewer; unique (workspace, user) | a membership |
| `companies` | workspace; `name`; `website_url`; `default_dialect` ∈ eg, sa, gulf, lev, msa, en; `industry`; `countries text[]`; `socials jsonb` (0014) | a brand |
| `brand_profiles` | `company_id` unique; `colors`, `fonts`, `tone`, `tagline`, `facts`, `raw` | a brand's identity |
| `brand_assets` | company; `kind` ∈ logo, image, font; `storage_path`; `meta` | a brand file (logo at `brand-assets/{ws}/{company}/logo.{ext}`) |
| `voices` | `provider` ∈ elevenlabs, azure; `provider_voice_id`; dialect; gender; active | a TTS voice (seed placeholders; unused by the live engines) |

### Videos
| Table | Key columns | A row is |
|---|---|---|
| `videos` | workspace, company, `title`, `brief`; `goal` (nullable); `format` ∈ 9:16, 1:1, 16:9, 4:5; `length_s` ∈ 15, 30, 45, 60, 90; `pace`; `dialect`; `voiceover` / `voice_id`; `status` ∈ draft, generating, ready, review, exporting, failed, needs_direction; `generation jsonb`; `music_enabled`, `music_mood`; `scheduled_on`; `content_type` (default standard); `refs jsonb` | one video |
| `video_versions` | video, `version` (unique per video); `engine` legacy / live; live: `live_job_id`, `live_script`, `live_qa`, `mp4_path`, `composition_path`; `scenes`, `script`, `plan`, `audio`, `qa`; legacy: `spec`, `custom_js`, … | one generated / edited / restored version |
| `renders` | video, `version_id`; `status` ∈ queued, rendering, done, failed; `billed_seconds`; `cost_usd`; `output_path`; `progress`; realtime | one paid export |

### Posts
| Table | Key columns | A row is |
|---|---|---|
| `posts` | workspace, company, `title`, `brief`; `type` ∈ single, carousel, text; `platforms` ⊂ facebook, instagram, tiktok, linkedin, x; `dialect`; `ai_image` ∈ auto, yes, no; `slides` 2–10; `status` ∈ generating, ready, failed; `generation jsonb`; `exported_at`; `scheduled_on`; `content_type`; `refs`; `placement` ∈ feed, story, cover | one social post |
| `post_versions` | post, `version`; `content jsonb`; `origin` ∈ generate, change, edit_text, undo; `parent_version`; `request`; `job_id`; `cost_usd` | one version |

### Planning
| Table | Key columns | A row is |
|---|---|---|
| `content_plans` | workspace, company; `starts_on`, `ends_on` (≤ 92 days); `per_week` 1–7; `goals` ⊂ sales, awareness, launch, community, season; `mix` ⊂ image, carousel, video, text; `platforms`; `notes` | a plan for a period |
| `plan_ideas` | plan, workspace, company; `position`; `kind`; `angle`, `title`, `why`, `hook`; `platforms`; `occasion`, `suggested_on`; `status` ∈ new, ok, no, made; `scheduled_on`; `video_id` / `post_id` | one idea |

### Engine
| Table | Key columns | A row is |
|---|---|---|
| `live_brand_captures` | workspace, company (nullable until saved), `version`, `domain`, `site_url`, `status` ∈ queued, running, done, failed; `app_status` (done / blocked / step_limit / error / no_app_link / skipped / captcha); `pages`, `app_screens`; `manifest` (capture.json); `profile` (brand.json); `cost_usd` | one brand capture, reused by the company's jobs |
| `live_jobs` | workspace, video / post / company / capture; `kind` ∈ capture, video, post; `mode`; `input jsonb`; `status` ∈ queued, running, waiting_code, done, failed; `stage`; `done_steps`; `ask`; `log`; `ledger`; `cost_usd`; `runner`; `attempts`; `token_hash`; `error` | one resumable worker run |
| `ai_usage` | workspace (null = system), video, post; `kind` (34 values incl. director_agent, post_write, post_image, content_plan, trends, notice_draft, season_check); `model`; token counts | one model / API call |

### Money
| Table | Key columns | A row is |
|---|---|---|
| `wallet_ledger` | workspace; `kind` ∈ topup, export, refund, adjustment; signed `amount_usd`; `amount_local`, `currency_code`, `fx_rate`; `ref_render_id`; `ref_post_id`; one export per render / per post, one refund per render | an append-only money movement |
| `prices` | `key` ∈ video_min ($1.50), voiceover_min ($1.00), post ($0.50); `active_from` | a price from a date |
| `fx_rates` | `currency_code`, `usd_rate`, `rate_date` | a daily FX rate |

### Market and notifications (0014–0016)
| Table | Key columns | A row is |
|---|---|---|
| `industry_trends` | unique (industry, region, day); `items jsonb`; `status` ∈ pending, ready, failed | a day's trends for an industry + region (shared) |
| `season_updates` | unique (season_key, country); `action` ∈ confirm, move, cancel, add; `from_day`, `to_day`; `data`; `source_url`, `source_title`; `checked_on` | a live finding about a season |
| `season_checks` | pk (country, day); `status`; `summary` | the daily check of a country ran |
| `notice_states` | pk (user, company, key); workspace; `status` ∈ seen, later, dismissed, acted; `until`; `notice jsonb`; `seen_at`; `updated_at` | a member's state + history for one notification |

### Unused v2 tables (from 0007)
`brand_briefs`, `video_jobs`, `video_concepts`, `video_scripts`, `video_assets`, `video_fingerprints` (+ bucket
`video-assets`) — present in the database, not used by the code.

## 3. Access (RLS)

Helpers (security definer): `is_member(ws)`, `has_role(ws, roles)`, `can_edit(ws)` (owner / admin / editor),
`company_workspace`, `video_workspace`, `post_workspace`, `shares_workspace`, `storage_path_workspace(name)`.

| Pattern | Tables |
|---|---|
| member read, editor write (writes also check `company_workspace(company_id) = workspace_id`) | companies, brand_profiles, brand_assets, videos, video_versions, posts, post_versions, content_plans, plan_ideas |
| member read, server write only | renders, wallet_ledger, ai_usage, live_brand_captures, live_jobs (+ most v2 tables) |
| any signed-in user reads, server writes | voices, prices, fx_rates, industry_trends, season_updates, season_checks |
| own rows only | notice_states (`user_id = auth.uid()` + member) |
| special | profiles (own + co-members' read), workspaces (members read; owner/admin update name/country/currency/cap only — never the balance), workspace_members (owners manage) |

## 4. Functions

| Function | Who | What |
|---|---|---|
| `bootstrap_workspace(name, country, currency)` | signed-in | idempotent first-workspace setup (the first user claims the demo workspace) |
| `export_video(video_id)` | signed-in | latest version → `renders` row → `charge_export` → video `exporting` |
| `export_post(post_id)` | signed-in | charges the post price once (first download), sets `exported_at`; raises `insufficient_balance` |
| `charge_export(render_id)` | service | bills 5-second blocks × (video_min [+ voiceover_min]) per minute; locks the workspace; ledger row with FX |
| `refund_render(render_id, error)` | service | marks failed, refund ledger row |
| `current_price(key)`, `latest_fx_rate(currency)` | read helpers | |
| triggers on `wallet_ledger` | — | `apply_ledger_entry` updates the balance; update / delete / truncate raise (append-only) |

## 5. Storage

| Bucket | Public | Paths | Read / write |
|---|---|---|---|
| `brand-assets` | private | `{ws}/{company}/…` (logos) | members / editors |
| `live-engine` | private | `{ws}/captures/{capture}/…` (+ `_pack/*.tgz`) · `{ws}/runs/{video}/{job}/…` (video.mp4, video.src.html, script.json, qa.json, music.wav, director.tgz, poster.jpg) · `{ws}/posts/{post}/{job}/…` · `{ws}/refs/{company}/…` (client references) · `_private/{ws}/captures/{capture}/auth.json` (service only) | members read / server writes (references via signed upload URLs) |
| `renders` | private | `{ws}/{render}.mp4` | members / server |
| `music` | public | legacy tracks | legacy only |
| `video-assets` | private | v2, unused | — |

## 6. JSON shapes (from code)

- **`videos.generation`**: `{stage, mode, engine:"live", first?, ask?:{sent_to}, error?, version?, cost_usd?, updated_at}` —
  replaced on every write. Stages: queued, plan, spec, music, awaiting_code, done, error, edit_failed.
- **`posts.generation`**: `{stage, mode, job_id?, started_at?, progress?, at_<stage>?, version?, cost_usd?, seconds?, error?, updated_at}` — progress merges in.
- **`video_versions` (live)**: `live_script` `{idea, language?, music?:{mood, drops[]}, scenes:[{start, bars, purpose, headline, sub?, visual?, motion?}], length, bpm?}`;
  `scenes` `[{id, role, start_s, end_s, lines[], voiceover_line}]`; `plan` `{concept, summary_en, motion_language, music_mood, energy:{bpm, length_s, sections[], hits[]}, shots[]}`;
  `audio` `{mix, sfx}`; `qa` `{history:{origin, parent_version, restored?}, validation, summary (cost, angle, share copy), fingerprint}`.
- **`post_versions.content`**: `{angle, alt_text, type, platforms:{<p>:{text, hashtags[], canvas}}, slides:[{headline, sub?, points?, cta?, visual:{kind}, format?}], renders:{<canvas>:[paths]}, check?, folder}` — canvases `4:5 9:16 16:9 1:1 fb-cover li-cover x-cover`.
- **`videos.refs` / `posts.refs`**: ≤ 8 × `{kind:"image"|"video", path, name, note?}` or `{kind:"link", url, name, note?}`.
- **`companies.socials`**: `{instagram, facebook, tiktok, linkedin, x, youtube, snapchat: url, use?: boolean}` (handles reach jobs only when `use`).
- **`brand_profiles`**: `colors [{hex, role?}]` (≤ 6) · `fonts {arabic, latin}` · `facts {what_it_does, audience, key_features[], numbers[{value, label, prefix, suffix}], offers[], cta_url}` · `raw {source:"live", capture_id} | {source:"firecrawl", …} | {source:"manual"}`.
- **`live_jobs`**: `input {edit?, prevJobId?, first?, settings?, engine?, request?, prevVersion?, coverStyle?}` · `ask {sent_to, asked_at, answer?, answered_at?}` · `log string[]` · `ledger [{step, model, in, out, cacheRead, usd, ms}]`.
- **`notice_states.notice`**: a season `{season:{id, name, angle, from, to, daysAway, ongoing, approx, countries, status, source}}`, trend `{trend:{id, title, why, angle, sources}}` or schedule `{reason, count}` notice.
- **`industry_trends.items`**: `[{id, title:{ar,en}, why:{ar,en}, angle:{ar,en}, sources:[{title, url}]}]`.
- **`season_updates.data`**: add → `{name:{ar,en}, kind, industries[], angle:{ar,en}}`; confirm / move / cancel → `{note}`.

## 7. Drift to fix

- 0007 missing from `main` (see top).
- Migration comments that don't match the code: 0008 says captures live under `{ws}/brands/…` (code: `{ws}/captures/…`);
  0014 says references go to `brand-assets` (code: `live-engine/{ws}/refs/…`); the 0012 comment on `post_versions.content`
  is out of date.
- `lib/types.ts` lists lengths 15/30/60 while the database allows 15/30/45/60/90.
- Legacy code still references dropped objects (`lib/video/music.ts`, `lib/motion/store.ts`, `lib/motion/illustrations.ts`,
  `lib/render/run.ts` → `music` bucket).
