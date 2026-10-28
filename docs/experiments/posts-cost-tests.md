# Posts — cost tests (2026-10-28)

Image mode (GPT Image `gpt-image-2.5-flare`, medium; $5 / $8 / $30 per 1M text-in / image-in / out — matches
OpenAI's price list). Brand: ظاهر (zaher.ai). Charged = 2× real cost, at least 20 EGP for a new piece (52 EGP/USD).

## Single post — Instagram, feed, dialect eg, AI image auto

Brief: «بوست يوضح قد ايه ظاهر بيساعد في انك يكون ليك وجود علي ترافيك ادوات الذكاء الاصطناعي وازاي ده بيساعدك تكسب اكتر وتقلل تكاليف جذب العملاء»

| Run | Mode | Image calls | Real cost | Time | Charged | Notes |
|---|---|---|---|---|---|---|
| 291781c1 | normal + `POSTS_REDO=serious` (before its fixes) | 2 | $0.0776 | 81 s | 20 EGP (min) | redone for "stray text"; laptop drawn although forbidden |
| 2f80e05a | `POSTS_REDO=serious` (fixed, 18a4a5f) | 1 | $0.0520 | 58 s | 20 EGP (min) | no device; kept "stray text" = the +1,515% the scene asked for; stray space before «.» |
| 0fe033e0 | normal (no switch) | 1 | $0.0524 | 61 s | 20 EGP (min) | passed the check first time; no device, no stray text |

Breakdown of 2f80e05a: Sonnet write $0.0239 · GPT Image ×1 $0.0270 · Haiku style + check $0.0010.
Breakdown of 0fe033e0: Sonnet write $0.0248 · GPT Image ×1 $0.0267 · Haiku style + check $0.0010.

Reading: when the first image passes, both modes cost the same (~$0.052, one image). `POSTS_REDO=serious` only saves
on the runs whose first image fails a minor check (291781c1 → one redo, +$0.027, +23 s). It needs more runs to say how
often that happens.

## Hard single post — a person, a phone, objects, night (Instagram, feed, eg, AI image auto)

Brief: «بوست لصاحبة متجر أونلاين مصرية قاعدة في مكتبها الصغير بالليل، ماسكة موبايلها وبتسأل ChatGPT «أحسن متجر هدايا في مصر؟» ومستغربة إن منافسها هو اللي طلع في الإجابة مش هي. حواليها كوباية شاي، كراتين شحن عليها لوجو متجرها، ونوت مكتوب عليها أرقام المبيعات. الرسالة: ظاهر بيوريكي ليه منافسك ظاهر وإنتي لأ، وبيقولك تعملي إيه بالظبط عشان تظهري إنتي»

| Run | Mode | Image calls | Real cost | Time | Charged | Notes |
|---|---|---|---|---|---|---|
| d21737f4 | normal | 2 | $0.0824 | 86 s | 20 EGP (min) | 1st image had the phone in her hand; the check failed it (any device banned, a wrong "impossible", the notebook's figures as stray text) → the redo removed the phone, blanked the notebook, lost the night: worse than the 1st |
| 55551204 | `POSTS_REDO=serious` (5edb6ca: a phone may be a prop) | 1 | $0.0541 | 61 s | 20 EGP (min) | phone in her hand, screen toward her (back to the viewer, correct); notebook keeps its figures; the device finding was kept, not redone. Neither run got the night lighting |

## Carousel — 5 slides, Instagram + Facebook («3 أسباب تختار ظاهر»)

| Run | Mode | Real cost | Time | Charged | Notes |
|---|---|---|---|---|---|
| 5d21cad8 | image (normal) | $0.2733 (GPT Image ×9 $0.238, 4 redos) | 290 s | 28.42 EGP | richer; laptop on slide 5 |
| 0fd630a6 | HTML (`POSTS_VISUAL=html`) | $0.4754 (design $0.109 + repair $0.198 + review $0.131) | 257 s | 46.80 EGP | exact text, real screens but cropped; hold capped the charge at 0.90 USD (2× was 0.95) |
