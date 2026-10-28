# MotionGX — Product doc

> What MotionGX is and does **today**, as implemented in this repository. For how it is built see `02-tech-doc.md`;
> screens and flows `03-app-flow.md`; look and feel `04-design-brief.md`; data `05-data-map.md`; what's next
> `06-build-plan.md`.

## 1. One line

**MotionGX is an Arabic-first AI creative studio that reads a brand from its website and app, then makes its social
content — motion videos built on the brand's real product UI, designed posts, stories and page covers — and plans what
to post and when, for the brand's own markets and seasons.**

## 2. Who it is for

| Who | Need |
|---|---|
| Small and medium companies in Egypt and the Gulf (e-commerce, SaaS, services) | consistent, on-brand social content without a design team |
| Solo founders of apps ("vibe-coded" products) | launch, feature and update videos and posts that show the real product |
| Marketers / agencies handling several brands | one studio per brand, brand-true output, a plan and a calendar |

Markets in the product today: the Gulf (Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman), Egypt and the wider Arab
world; content in Egyptian, Saudi, Gulf, Levantine Arabic, MSA or English.

## 3. The problem it solves

Coming up with ideas, keeping a brand consistent, and producing enough content for several platforms is the hard part
for small teams. MotionGX removes the blank page: it already knows the brand (logo, colours, fonts, voice, features,
real screens), proposes what to post for the brand's industry and countries, and produces finished pieces that look
like the brand made them.

## 4. What it does (implemented)

### 4.1 Brand capture — "know the brand"
- Paste a website: a capture agent reads public pages, signs up to the app when it can, tours features, and records
  real screens, UI blocks, images, fonts and the logo; a profile step writes the brand profile (summary, audience,
  voice, palette, fonts, features with evidence, selling points).
- The company editor shows and edits it; **Brand kit** (هوية البراند) is the lookbook: palette, logo, font specimen,
  voice, audience, what sets it apart, features, and **everything captured** (all screens with full pages, every UI part,
  every image).
- Brand market: **industry**, **countries it operates in** (searchable multi-select), and **social pages** (optionally
  used in content as handles).
- Re-read refreshes the capture; a newer, richer capture supersedes the saved one automatically.

### 4.2 Create — "make the piece"
One screen (**اصنع جديد**) for every kind:
| Kind | Output |
|---|---|
| **Video** | a 15 / 30 / 60 s motion video in 9:16, 4:5, 1:1 or 16:9 — built by the director engine on the brand's real UI, with beat-synced music |
| **Image + text** | one designed image per platform canvas + platform-specific text |
| **Carousel** | several slides telling one idea + text |
| **Story** | one 9:16 frame for Instagram / Facebook / TikTok Stories and WhatsApp Status |
| **Page cover** | the brand's banner for Facebook (1640×624), LinkedIn (1584×396), X (1500×500); design kind selectable |
| **Text only** | platform texts (X, LinkedIn, …) |

Options: platforms, dialect, goal (video), day (scheduling), content type (**General** / **Product update** — "what
changed?"), and **references** (images, short videos, links with notes) that the engines use.

### 4.3 Video page — the Edit Room
After a video is made: a full player (play, scrub with scene segments and music drops, ±5 s, frame step, previous/next
scene, loop scene, speed, volume, fullscreen, keyboard shortcuts), a scene timeline on the beat, **on-screen editing**
(drag / resize / hide / retext any element with snapping; applied as a re-render with no AI cost), **ask the director**
per scene (steps, time and cost shown), versions with restore, and export.

### 4.4 Post page
Platform previews as they will appear (feed, story or page header, on phone or desktop), per-platform text (copy / edit),
**request a change**, versions with undo, and download.

### 4.5 Plans and the calendar
- **Content plans** (خطط المحتوى): a period, rhythm, goals, mix and platforms → ideas written for the brand's industry,
  facts and countries, including dated occasions; accept / swap / schedule.
- **Publishing calendar** (جدول النشر): work and planned ideas on their days (drag to move), plus the **seasons** of the
  brand's countries (national days, Ramadan / Eids, shopping seasons, festivals, school, pay days, industry awareness
  days) marked fixed / expected / confirmed, each with "draft an idea".

### 4.6 Notifications — "stay relevant"
A bell with a panel (Now / History): seasons coming up in the brand's countries, **today's trends in its industry**
(daily web search), and reminders to schedule ready work or plan an empty week. Each offers **draft an idea**, which
writes a brand-true brief and opens Create. A daily web check keeps the seasons calendar live (dates confirmed, moved,
or new seasons added, with sources).

### 4.7 Wallet and pricing
- **No fixed prices: the workspace pays what its work costs.** Every AI job the user starts is billed at **2× its real
  AI cost** (`prices.cost_multiplier`; the extra 100% is the margin), from a prepaid wallet shown in its currency:
  videos, director edits, another direction, posts, change requests, plan ideas, "draft an idea".
  - **Minimum**: a **new piece** (video, image post, carousel, story, page cover, text) is charged **at least 20 EGP**
    (converted at the day's rate); edits, change requests, another direction, plan ideas, idea drafts and captures
    have no minimum.
  - **Brand capture**: the workspace's **first brand is free**; later captures (new brands, re-reads) are billed at
    **1× the real cost** (`prices.capture_multiplier`).
  - **Free**: exports, downloads, on-screen edits (a re-render without a model call), text edits, undo / restore, and
    the shared background work (daily trends, season checks).
- **Estimate → hold → charge**: before a job starts the user sees its expected cost (the median real cost of the last
  jobs like it × 2) and the wallet holds a margin above it; the job can't start on a short wallet. While it runs the
  cost ticks live; when it ends the real cost × 2 is charged (never more than the hold) and the rest is released. A job
  that fails on our side costs nothing; one the user cancels pays what it used.
- **Currency**: every amount (balance, estimates, live costs, ledger) is shown in the workspace's currency — set on
  first sign-in from the visitor's country (EG → EGP, SA → SAR, AE → AED, KW → KWD, JO → JOD, else USD) and changed on
  the wallet page by an owner / admin. The wallet itself stays in USD; `fx_rates` converts.
- The rail shows the balance; the wallet page shows the ledger, what is held, typical costs, the currency and top-up.
- **Top-up is a mock today** (`mockTopUp`: $5 / $10 / $25 / $50 via Vodafone Cash, InstaPay, Fawry, card — disabled in
  production, owner/admin only). A real payment provider (Paymob / Fawry) is a planned phase.

## 5. Principles

1. **Brand-true** — only the brand's real facts, colours, fonts and screens; no invented features, prices or numbers.
2. **Real product as the hero** — captured UI, shown whole, in the right device.
3. **Arabic first** — dialect-correct copy and RTL layout by default.
4. **Pay for what it costs** — no fixed prices; every job shows its expected cost before and its real cost while it runs.
5. **Show the work** — live progress screens with steps, time and AI cost while things are made.

## 6. Out of scope today (see the build plan)
Direct publishing to platforms, ad-account integration and the reply assistant, learning from post results, reading
social pages' content, extra formats (profile picture, highlight icons, YouTube thumbnail, ad sizes).
