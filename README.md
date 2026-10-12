# MotionGX

On-brand motion-graphics videos for company marketing teams. Arabic (RTL, default) + English (LTR).

**Phase 1:** app shell, database, auth and all screens.
**Phase 2:** real brand extraction (Firecrawl + Claude Haiku).
**Phase 3:** Remotion motion engine (`remotion/`), generated music library, brand facts, Sonnet scripts, live preview, server-side MP4 render. Voiceover and payments are still mocked (`// PHASE 4`).

## Setup

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000
```

### Environment variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (server only, never expose) |
| `FIRECRAWL_API_KEY` | firecrawl.dev → API keys (brand extraction) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys (tone, scripts, rewrites — `claude-haiku-5-5`) |

### Supabase

1. Run the migrations in order in the SQL editor (or `supabase db push`): `0001_init.sql`, `0002_ai_usage.sql`, `0003_motion.sql`.
2. Music library: `pnpm music:generate` (needs `python3 -m venv .venv && .venv/bin/pip install numpy scipy`), encode to MP3, then `pnpm music:upload`.
2. Auth → URL Configuration → add `http://localhost:3000/**` (and your Vercel URL) to Redirect URLs.
3. Magic-link emails land on `/auth/callback`, which handles both the PKCE `code` and `token_hash` flows.

The first user to sign in becomes owner of the seeded demo workspace (منتوج company + $24.04 demo top-up). Every later user gets a fresh, empty workspace.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint + a check that bans physical-direction classes (`ml-`, `pr-`, `left-`, `text-right`…) |
| `pnpm i18n:check` | Fails if `messages/ar.json` and `messages/en.json` keys differ |

## Structure

- `proxy.ts` — locale routing (next-intl) + Supabase session refresh + auth guard (everything except `/login`). Next 16 renamed `middleware.ts` to `proxy.ts`.
- `app/[locale]/(app)/…` — dashboard, companies/new, videos/new, videos/[id] (studio), wallet
- `lib/pricing.ts` — the single pricing source for the UI; rates come from the `prices` table. `charge_export()` applies the same rule in SQL.
- `lib/brand/*` — Firecrawl scrape, brand mapping, logo download, tone (Haiku); `lib/script/*` — script generation and edits (Haiku)
- `messages/{ar,en}.json` — every UI string

## AI

- `lib/ai/claude.ts` — one forced, strict tool call to `claude-haiku-5-5`, validated with zod, retried once with the problem fed back.
- Every Claude or Firecrawl call is logged to `ai_usage` (tokens per call) and counts toward **30 calls per workspace per hour**.
- AI calls are free to the user; only exports touch the wallet.
- Brand extraction streams NDJSON from `POST /api/brand/extract` (one line per step). The raw Firecrawl payload is cached in `brand_profiles.raw`; adding the same website again reuses it, and only "أعد القراءة" re-scrapes.

## Motion engine

- `remotion/BrandVideo.tsx` — one composition rendered entirely from props (`lib/video/kit.ts`): brand, scenes, format, fps, music, voiceover.
- Brand tokens (`lib/video/tokens.ts`) come from the company's colors; text color by WCAG contrast; gradient = primary → accent.
- Beat grid (`lib/video/timeline.ts`): pace sets BPM (90/110/128), scenes snap to whole beats, the last scene absorbs the remainder so the video is exactly `length_s`.
- `pnpm remotion:studio` opens Remotion Studio with every scene type (`remotion/preview-props.ts`).
- Export: `export_video()` charges the wallet → render runs in `after()` → MP4 uploaded to `renders/{workspace_id}/{render_id}.mp4` → `done`. On Vercel it renders in a Vercel Sandbox (`@remotion/vercel`, bundle prebuilt in `pnpm build`); locally with `@remotion/renderer`. Any failure calls `refund_render()`.
- Test scripts: `scripts/video/render-slllr.ts` (end-to-end sample render), `scripts/video/test-refund.ts` (forced failure → refund), `scripts/video/qa-stills.ts` (one still per scene).

## Money rules

- Wallet balance is in USD and changes **only** via the `wallet_ledger` insert trigger. The ledger is append-only.
- Exports call `export_video(video_id)`, which inserts the render and runs `charge_export(render_id)` in one transaction. It refuses if the balance is too low.
- Video $1.50/min, voiceover +$1.00/min, billed per second rounded up to 5 s. Drafts are free. Failed exports are refunded via `refund_render()`.
