# MotionGX — Phase 1 (paste into Claude Code in an empty repo)

You are building **MotionGX**: a SaaS where company marketing/design teams generate on-brand motion-graphics videos. Companies are added from a website URL (brand auto-extracted), users describe a video, pick goal / format / length / pace / Arabic dialect, and optionally add a paid voiceover. Billing is a prepaid **wallet** in the user's local currency, USD as the base. **There are no templates anywhere in the product** — never add a template gallery, picker, or the word "template" in UI copy.

## Phase 1 scope (this run only)
Scaffold the app, database, auth and the full UI shell. Brand extraction, AI scripts, rendering, voiceover and payments are **mocked** (Phases 2–4). Do not install Remotion, Firecrawl, Anthropic, ElevenLabs or payment SDKs yet.

## Stack
- Next.js (App Router, TypeScript, Server Components, Server Actions), Tailwind CSS
- Supabase: Auth (email magic link), Postgres with RLS, Storage (bucket `brand-assets`)
- Deploy target: Vercel. Repo on GitHub.
- `@supabase/ssr` for auth cookies; middleware protects every route except `/login`.

## Languages — Arabic + English (required from day one)
- Use **next-intl** with locale-prefixed routes: `/ar/...` (default) and `/en/...`. Middleware detects `Accept-Language`, then remembers the choice in a cookie.
- `<html lang dir>` comes from the locale: `ar` → `rtl`, `en` → `ltr`.
- **No hard-coded UI strings.** Every label goes in `messages/ar.json` and `messages/en.json`, which must have identical keys. Add a script `pnpm i18n:check` that fails on missing keys.
- Layout uses **logical properties only**: Tailwind `ms-/me-/ps-/pe-/start-/end-`, `text-start`. Never use `ml/mr/pl/pr/left/right`. Directional icons (arrows, chevrons, send) flip with `rtl:-scale-x-100`.
- Add a language switch (عربي / EN pill) in the top nav. It keeps the current page.
- Numbers and currency go through `Intl.NumberFormat(locale)`. Use Latin digits in both locales. Format EGP as `ج.م` in Arabic and `EGP` in English. Dates go through `Intl.DateTimeFormat`.
- Store the user's preferred UI language in `profiles.locale`.
- **Video language is separate from UI language.** On `/videos/new` the list is: مصرية، سعودية، خليجية، شامية، فصحى، **English**. An English UI user can still make an Egyptian-dialect video, and an Arabic UI user can make an English one.
- Readex Pro covers both scripts. Keep the same weight-contrast headings in English (e.g. "**Motion videos** in your brand").

## UI — "Option 6" design (must match)
- Arabic is RTL and English is LTR. Font: **Readex Pro** via `next/font/google`, weights 200–700.
- Tokens (put in `tailwind.config` + CSS vars):
  - outer bg teal `#86CFD3` with a centered lighter band `#A4DEE1` (hard stops at 7% / 93%)
  - app card white, radius 30px, shadow `0 24px 60px rgba(16,24,74,.16)`, max-width 1360px
  - primary periwinkle `#5558E3`, pressed/dark `#3B3EC9`, mid `#A7A9F3`, lavender `#DCDDFA`, light `#EEEFFD`, field bg `#F5F6FD`
  - navy text `#10184A`, secondary `#3A4166`, muted `#545A7A`
  - teal accent `#1BA89B`, teal text `#0B7A70`, success chip bg `#DDF4F1` / text `#0B6B62`, warning chip `#FFF1D6` / `#7A4A00`
- Buttons and chips are **pills** (fully rounded), min height 44px. Selected chip = white with 1.5px `#5558E3` inset ring (or solid primary for goal chips).
- Headings use **weight contrast**: one word 700 + next word 200 (e.g. "**فيديوهات موشن** بهوية شركتك").
- Motifs: lavender **film strip** (white sprocket holes) framing previews; **timeline slider** with a round knob and **diamond** keyframe markers; dashed `#C9CAF7` dividers.
- Top navigation (no sidebar): pill logo "MotionGX" · الرئيسية · الشركات · الفيديوهات · المحفظة · wallet balance pill · avatar.
- Flat illustrations as inline SVG components (film strip, play button, folders, pen-tool node, timeline). No emoji, no gradient washes, no stock images.
- Must work at phone width: nav wraps, tables scroll horizontally in a rounded box.

## Routes (all under `/[locale]`)
| Route | Screen |
|---|---|
| `/login` | magic-link login |
| `/` | Dashboard: hero + illustration, month spend bar (spent / monthly cap, diamonds = scheduled campaigns), videos this month, companies count, companies list (logo + 3 brand color dots), recent videos table with status chips (جاهز / بانتظار المراجعة / مسودة) |
| `/companies/new` | URL input pill → mocked extraction steps (الشعار، الألوان، الخطوط، النبرة) → editable brand preview inside a film strip: logo, colors, Arabic + Latin font, default dialect, tagline → "تأكيد وحفظ الشركة" |
| `/videos/new` | brief textarea, goal chips (بيع منتج، إطلاق، عرض وخصم، تعريف بالشركة، توظيف، مناسبة), format 9:16 / 1:1 / 16:9, length 15/30/60s, pace هادئ/متوسط/سريع, dialect مصرية/سعودية/خليجية/شامية/فصحى, voiceover switch + 2 voices per dialect. Sticky-free summary card (periwinkle) with live price in local currency + USD. CTA "اكتب السكريبت" creates the video row and redirects to studio. |
| `/videos/[id]` | Studio: scene list (pill rows), preview inside film strip, scene properties (on-screen text, voiceover line, "اسمع", "أعد كتابة المشهد"), "اطلب تعديلًا" prompt box, timeline (scene thumbs + slider + diamonds + voice waveform), "تصدير MP4 · {price}" button (mock: writes a `renders` row with status `queued`) |
| `/wallet` | big balance (local + USD), minutes left with / without voice, top-up amounts, payment methods (فودافون كاش، إنستاباي، فوري، بطاقة بنكية — mocked), price list, transactions table |

## Pricing logic (`lib/pricing.ts`, single source of truth)
- Video **$1.50 / min**, voiceover **+$1.00 / min**, billed per second **rounded up to 5 s**. Drafts/previews free; charged only on export; failed export auto-refunds.
- Local price = USD × today's rate from `fx_rates` (seed EGP = 52.00). Rate is locked in USD at top-up time.
- Read prices from the `prices` table, never hard-code in components.

## Database (write as `supabase/migrations/0001_init.sql`, then print the full SQL in chat so I can paste it into the Supabase SQL editor)
Tables (uuid PKs, `created_at timestamptz default now()`):
- `profiles` (id → auth.users, full_name, locale: ar|en default 'ar')
- `workspaces` (name, country_code, currency_code, wallet_balance_usd numeric(12,4) default 0, monthly_cap_usd)
- `workspace_members` (workspace_id, user_id → auth.users, role: owner|admin|editor|viewer)
- `companies` (workspace_id, name, website_url, default_dialect)
- `brand_profiles` (company_id unique, colors jsonb, fonts jsonb, tone text, tagline text, raw jsonb)
- `brand_assets` (company_id, kind: logo|image|font, storage_path, meta jsonb)
- `voices` (provider: elevenlabs|azure, provider_voice_id, display_name, dialect, gender, is_active)
- `videos` (workspace_id, company_id, title, brief, goal, format, length_s, pace, dialect: eg|sa|gulf|lev|msa|en, voiceover bool, voice_id, status: draft|ready|review|exporting|failed)
- `video_versions` (video_id, version int, scenes jsonb, script jsonb)
- `renders` (video_id, version_id, status: queued|rendering|done|failed, billed_seconds, cost_usd, output_path, error)
- `wallet_ledger` (workspace_id, kind: topup|export|refund|adjustment, amount_usd numeric(12,4) signed, amount_local, currency_code, fx_rate, ref_render_id, note) — **append-only**
- `prices` (key: video_min|voiceover_min, usd numeric, active_from)
- `fx_rates` (currency_code, usd_rate numeric, rate_date, unique(currency_code, rate_date))

Rules:
- `wallet_balance_usd` is updated **only** by an `after insert` trigger on `wallet_ledger`; no UPDATE/DELETE policies on the ledger for anyone.
- RLS on every table: access via `workspace_members` membership. `voices`, `prices`, `fx_rates` readable by any authenticated user, writable by service role only.
- Helper `is_member(workspace_id)` SQL function (security definer, stable).
- On first login create a workspace + owner membership (server action, not a trigger on auth.users).
- Seed: prices, EGP/SAR/AED/KWD/JOD rates (mark non-EGP as `-- TODO real rate`), 12 voices, 2 per dialect: سلمى/شاكر مصري، زارية/حامد سعودي، فاطمة/حمدان إماراتي، ليلى/رامي لبناني، زارية/حامد فصحى، plus 2 English voices with `provider_voice_id = 'TODO'`, one demo company "منتوج" (mantoog.com) with brand colors `#3B82F6`, `#0B0D12`, `#7C5CFF`, fonts Noto Kufi Arabic + Geist, and a demo top-up ledger row of $24.04.

## Mocks (clearly marked `// PHASE 2` etc.)
- `lib/brand/extract.ts` → returns the Mantoog brand after a 1.5 s delay.
- `lib/script/generate.ts` → returns 7 fixed scenes (الخطّاف، من لينك لمتجر، الشعار، صفحات بالذكاء الاصطناعي، إعلانات تيك توك، العرض، سجّل دلوقتي).
- Export inserts a `renders` row + a negative `wallet_ledger` row in one transaction (Postgres function `charge_export(render_id)`), refusing if balance is insufficient.

## Done when
1. `pnpm dev` runs and login works. All 6 routes render with Option 6 styling in **both** `/ar` (RTL) and `/en` (LTR) at 1440px and 390px, with no layout mirrored wrong. `pnpm i18n:check` passes.
2. Creating a company and a video persists to Supabase; the price summary updates live.
3. Mock export deducts from the wallet and shows in transactions; balance pill updates.
4. `pnpm lint` and `pnpm build` pass. Add a short README with env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

Work in small commits. Stop after Phase 1 and list what's mocked.
