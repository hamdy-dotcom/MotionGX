# MotionGX

On-brand motion-graphics videos for company marketing teams. Arabic (RTL, default) + English (LTR).

**Phase 1:** app shell, database, auth and all screens. Brand extraction, AI scripts, rendering, voiceover and payments are mocked (marked `// PHASE 2/3/4` in code).

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

### Supabase

1. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
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
- `lib/brand/extract.ts`, `lib/script/generate.ts` — Phase 2 mocks
- `messages/{ar,en}.json` — every UI string

## Money rules

- Wallet balance is in USD and changes **only** via the `wallet_ledger` insert trigger. The ledger is append-only.
- Exports call `export_video(video_id)`, which inserts the render and runs `charge_export(render_id)` in one transaction. It refuses if the balance is too low.
- Video $1.50/min, voiceover +$1.00/min, billed per second rounded up to 5 s. Drafts are free. Failed exports are refunded via `refund_render()`.
