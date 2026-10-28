# Prand

An Arabic-first AI creative studio: it reads a brand from its website and app, then makes its social content
(motion videos on the brand's real UI, posts, stories, page covers) and plans what to post for the brand's markets and
seasons. Arabic (RTL, default) + English.

**The full spec is in [`docs/spec/`](docs/spec/README.md)** — product, tech, app flow, design, data, build plan.

## Setup

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # fill in the values (see the comments in the file)
pnpm dev                     # http://localhost:3000
```

Engine settings for development are in `.claude/launch.json` (`dev-director` is the default setup:
`VIDEO_ENGINE=director LIVE_ENGINE_RUNNER=local`).

### Supabase

1. Run `supabase/migrations/0001…0016` in order (SQL editor or `supabase db push`).
2. Auth → URL Configuration → add `http://localhost:3000/**` (and the deployed URL) to Redirect URLs. Magic links land on
   `/auth/callback`.
3. The first user to sign in claims the seeded demo workspace; later users get an empty one.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js (build also prebuilds the legacy engine's Remotion bundle and preview) |
| `pnpm lint` | ESLint + a check that bans physical-direction classes (`ml-`, `left-`, `text-right`…) |
| `pnpm i18n:check` | fails if `messages/ar.json` and `messages/en.json` keys differ |
| `pnpm live:resume <jobId>` | resume a stopped job on the local runner |
| `pnpm remotion:studio` | Remotion Studio for the legacy engine |

## Where things are

- `app/[locale]/(app)/` — the studio screens; `app/api/` — capture, references, compositions, job callbacks, watchdog
- `lib/director-engine/` — the video engine (HTML/GSAP agent, render, music); `lib/live-engine/` — jobs, runners, capture
- `lib/posts-engine/` — posts, stories, covers; `lib/market/`, `lib/trends/`, `lib/notices/` — seasons, trends, notifications
- `lib/motion/`, `remotion/`, `packages/primitives/`, `scripts/motion/`, `scripts/music/` — the legacy engine (kept for older videos)
- `supabase/migrations/` — the database; `messages/` — every UI string
