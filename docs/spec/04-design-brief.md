# MotionGX — Design brief

> What the product looks and feels like **as implemented**. Sources of truth: `app/studio.css` (the studio, `s-` prefix),
> `app/globals.css` (Tailwind tokens for the older screens: company editor, post page, sheets), `app/[locale]/(app)/videos/[id]/edit-room.css`
> (the Edit Room, `er-` prefix), `lib/brand/light.ts` (brand-driven colour). The approved visual reference is
> `docs/redesign/creative-studio-light.html` ("Creative Studio Light").

## 1. Personality

A **light, editorial creative studio** — paper, ink and the brand's own light. Calm surfaces, confident type, real
product work as the hero. It should feel like a premium studio that already knows your brand, not a dashboard.

- **Light by design** in both OS themes (no dark mode in the studio).
- **The active brand tints the whole studio**: its colours light the aurora, buttons, focus rings and highlights; its
  Arabic display font is loaded for brand-facing text.
- **Arabic-first, RTL by default** (`ar` is the default locale, `en` mirrors to LTR). Layout uses logical properties
  (`inset-inline-*`, `margin-inline-*`); `scripts/check-logical.mjs` runs with lint to enforce it.

## 2. Colour

### Studio tokens (`app/studio.css :root`)
| Token | Value | Use |
|---|---|---|
| `--s-stage` | `#f6f4ee` | page background (warm paper) |
| `--s-stage-2` | `#efece4` | secondary paper |
| `--s-panel` | `#ffffff` | cards / panels |
| `--s-panel-2` | `#f2f0ea` | quiet fills, ghost buttons, chips' pressed-off |
| `--s-hair` | `rgba(20,20,30,.09)` | every hairline border |
| `--s-ink` | `#14141c` | primary text, solid buttons |
| `--s-ink-2` | `#4b4a58` | secondary text |
| `--s-muted` | `#8b8996` | captions, labels |
| `--s-brand` | `#5558e3` (default) | **set per brand** — accent, lit buttons, focus |
| `--s-brand-2` | `#8f92ff` (default) | **set per brand** — second light |
| `--s-rec` | `#ff4d3d` | live / recording / trends accent |
| `--s-gold` | `#b9842a` | seasons, schedule reminders, budget ticket |
| `--s-ok` | `#0e9f78` | success, confirmed, ready |

**Brand light** (`brandLight()`): from the company palette, primary first then accent, the first two colours with
luminance between 0.18 and 0.92 become `--s-brand` / `--s-brand-2` (fallback `#5558e3` / `#8f92ff`). The shell sets them
inline on `.s-app`.

### App tokens (`app/globals.css`, older screens)
Primary `#5558e3` (dark `#3b3ec9`, mid `#a7a9f3`, lavender `#dcddfa`, light `#eeeffd`), navy ink `#10184a`, field
`#f5f6fd`, teal frame `#86cfd3` / `#a4dee1` / accent `#1ba89b`, status pairs (success `#ddf4f1`/`#0b6b62`, warning
`#fff1d6`/`#7a4a00`, danger `#fde7e7`/`#9b1c1c`).

## 3. Type

| Role | Font | Notes |
|---|---|---|
| Display + UI | **Readex Pro** (`next/font`, Arabic + Latin, 200–700) | `--s-display`, 14px/1.6 base |
| Mono labels / numbers | **JetBrains Mono** (400–700) | `--s-mono`: slate lines, step numbers, prices, timecodes, uppercase labels with tracking (.14–.22em) |
| Brand text | the brand's Arabic display font | `--s-brandfont`, loaded from Google Fonts via `brandFontHref()` |

Headlines (`<Rise>`) animate word by word (`s-rise`), the brand name highlighted with an underline mark (`s-mark`).
Uppercase mono "slate" lines sit above page titles (e.g. `LOOKBOOK — SLLLR.COM`, `BRAND CALENDAR · NOV 2026`).

## 4. Shape, depth, light

- Radii: panels **22px**, cards 14–20px, chips and buttons **999px** (pills), small tiles 9–12px.
- Elevation: one shadow, `--s-lift` (`0 1px 2px rgba(20,20,30,.05), 0 10px 30px -12px rgba(20,20,30,.14)`); pop-ups use a
  deeper `0 24px 60px -18px rgba(20,20,30,.35)`.
- Atmosphere: `.s-aurora` (blurred pastel blobs in the brand colours, slow drift), `.s-spot` (soft light under the
  cursor), `.s-grain` (5% paper grain). Pages enter with `s-enter` (fade + 14px rise). All motion respects
  `prefers-reduced-motion`.

## 5. Layout

- **Studio shell** (`components/studio/shell.tsx`): 250px rail (logo "MotionGX · CREATIVE STUDIO", brand switcher,
  **«اصنع جديد»** create button, nav, budget ticket, account) + main column with `max(16px, 3.2vw)` gutters.
- Nav (Arabic / English): **الرئيسية** Home · **خطط المحتوى** Content plans · **أعمالي** My work · **جدول النشر**
  Publishing calendar · **هوية البراند** Brand kit.
- **Phone (≤ 900px)**: rail hidden; top brand switcher; bottom tab bar (Home, Plans, ＋, Calendar, Brand).
- **Notifications**: a bell fixed at the top inline-end corner; one-time pop-up under it; side panel (Now / History).

## 6. Components (class families in `app/studio.css`)

| Family | What |
|---|---|
| `.s-panel`, `.s-row`, `.s-stack`, `.s-grid2` | cards and layout |
| `.s-btn` (`.lit`, `.ghost`, `.small`) | pill buttons — ink solid, brand-lit, quiet |
| `.s-chip`, `.s-chips` | toggle pills (`aria-pressed`) |
| `.s-label`, `.s-slate-line`, `.s-lead`, `.s-h2` | type roles |
| `.s-type(s)`, `.s-opt`, `.s-sum` | Create: kind cards, option rows, the brand-coloured summary card |
| `.s-reel`, `.s-frame` | Home film strip of recent work (portrait / tall for 9:16 & stories / wide for covers) |
| `.s-cal`, `.s-cell`, `.s-clip`, `.s-season` | calendar grid, work chips, season chips (◆ fixed · ~ expected · ✓ confirmed) |
| `.s-idea(s)`, `.s-pcard`, `.s-plan-grid` | plans and idea cards |
| `.s-look`, `.s-chart`, `.s-specimen`, `.s-lightbox`, `.s-gal-*` | Brand kit lookbook, palette chart, gallery of everything captured |
| `.s-bell`, `.s-notice-*` | notifications |
| `.s-refs-*` | references picker in Create |
| `.s-drawer`, `.s-modal`, `.s-toast` | overlays |
| `pst-*` | the live "making your post / video" screens (forming canvas, swatches, steps, meters) |
| `er-*` | the Edit Room (player, transport, scene timeline on the beat, inspector) |

Platform mockups for previews (Instagram, Facebook, TikTok, LinkedIn, X — feed, story and page-cover layouts) are
HTML strings in `lib/posts/mockups.ts`.

## 7. Content & voice in the UI

- Short, warm, Egyptian-leaning Arabic for UI copy ("اصنع جديد", "نجهّز الاستوديو…"); English mirrors it plainly.
- Brand content follows the brand's own dialect (eg / sa / gulf / lev / msa / en).
- Numbers in mono; money always with the workspace currency; time as live meters.

## 8. Generated-content design rules (what the engines must produce)

- **Video (director engine)**: a visual + text hook in 0–2 s, the logo from the first frame, designed backgrounds (no
  flat voids), the real captured UI shown big and whole in the right device, beat-synced cuts, text ≥ 34px with margins.
- **Posts**: brand-true, real facts only; image-model slides with exact words; real product screens are composited in
  a real phone / laptop frame (never drawn by the model).
- **Page covers**: a designed banner full of the brand's world, brand files used as style only, no words but the
  logo by default, focal point in the centre band, bottom corners clear for the profile picture.
- **Stories**: one idea, very few words, top 14% / bottom 20% clear.
