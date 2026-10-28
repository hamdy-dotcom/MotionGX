# Prand — Build plan

> What is **built and working** in the code today, and what comes next, in order. Status as of 2026-10-25.

## 1. Built (in `main`)

| Area | What works | Main code |
|---|---|---|
| Accounts | magic-link sign-in, first-visit workspace bootstrap, roles (owner / admin / editor / viewer), ar / en | `proxy.ts`, `lib/context.ts`, `app/auth/callback` |
| Brand capture | live capture agent (pages, app sign-up + feature tour, SMS-code relay), brand profile, re-read, newer capture supersedes | `lib/live-engine`, `/api/brand/capture` |
| Brands | company editor, market (industry, countries, socials), facts, brand files, Brand kit lookbook with everything captured | `app/[locale]/(app)/companies`, `brand` |
| Videos | director engine (HTML/GSAP, real UI, beat-synced music), live creating screen, Edit Room (on-screen edits → free re-render, ask the director per scene, another direction, versions), export + refund | `lib/director-engine`, `videos/[id]/edit-room.tsx` |
| Posts | image, carousel, story, page cover, text; per-platform canvases and text; real screens composited in devices; change requests, undo, download | `lib/posts-engine`, `posts/[id]` |
| Create | one screen for every kind; content type (General / Product update); references (images, videos, links) | `create`, `components/studio/refs-picker.tsx` |
| Plans + calendar | plan setup → ideas → accept / swap / schedule / auto → make; month calendar with work, ideas and seasons | `plans`, `calendar` |
| Seasons + trends | per-country seasons calendar, daily live web check (confirm / move / cancel / add), daily industry trends | `lib/market`, `lib/trends/daily.ts` |
| Notifications | bell, one-time pop-up, panel Now / History, later / dismiss / acted, draft an idea | `components/studio/notices.tsx`, `lib/notices` |
| Money | prepaid wallet, append-only ledger, FX; usage billing: 2× real cost (capture 1×, first free), estimate → hold → charge, live costs | migrations 0001–0006, 0017, `lib/billing.ts`, `wallet` |
| Jobs | resumable `live_jobs`, per-attempt callback tokens, 12-minute watchdog, AI usage logging + limits | `lib/live-engine/server`, `instrumentation.ts` |

## 2. Next — in order

### Phase 1 — Ready to charge
1. **Real payments**: Paymob (cards, wallets) and Fawry; webhook → `topup` ledger row; remove `mockTopUp` from production.
2. **AI service unavailable** message when a provider has no credit or is down (today the job just fails).
3. **Run the job runner off this machine**: test the sandbox runner end to end; today only the local detached worker is proven.
4. **Measure every cost**: Anthropic web-search fees, Firecrawl credits and sandbox compute are not counted yet (their
   jobs are billed on tokens only); GPT Image edits without a usage block book $0.
5. **Repo hygiene**: fix the migration comments and `lib/types.ts` lengths (see the data map §7).

### Phase 2 — Clean up
6. (Kept for now: 2 older videos use it.) Remove the legacy engine and the code that still touches dropped tables (`lib/motion/*`,
   `lib/render/run.ts`, `/api/brand/extract`), the unused v2 tables and the `music` / `video-assets` buckets.
7. Drop the unused `voices` seed (or wire real voiceover) and `ELEVENLABS_API_KEY`.

### Phase 3 — Grow (decided "later" with the user)
8. **Publishing** straight to the platforms from the calendar.
9. **Ad accounts** integration, then the **reply assistant** on top of it.
10. **Learning from results** (what performed → next ideas).
11. **Reading social pages' content** into the brand (beyond the handles saved today).
12. **More formats**: profile picture, highlight icons, YouTube thumbnail, ad sizes.

## 3. How a round is done

Code → `npm run typecheck` + `npm run lint` → commit. Renders, engine QA and synthetic tests are run by the owner, not
by the agent. Nothing is pushed or deployed without the owner's go-ahead.
