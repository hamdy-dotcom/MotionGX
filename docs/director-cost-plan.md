# Director engine — cutting cost without losing quality

Baseline: the first director video (job `83376509`, Mantoog, 60 s, 9:16, Opus 5.5) — **$4.68**, 45 model calls,
check passed with 0 errors / 0 warnings, rendered in 97 s. Goal: **about $2 per video** with the same agent, the same
method and the same check gate. Quality guard: every change keeps what the agent can see and do — it only stops paying
again and again for things it has already seen.

## Where the $4.68 went

| | tokens | $ |
|---|---|---|
| Output (plan, composition, tool calls) | 68k | 1.36 |
| Cache reads (the whole history re-read on every call) | 6.3M | 1.26 |
| Cache writes (each turn's new content) | 221k | 1.11 |
| Uncached input (the newest turn: images, results) | 236k | 0.95 |

Every call re-reads the whole conversation, which grew from 17k to 208k tokens. **Three quarters of the cost scales
with how big that history is.** What the history is made of (characters in the saved transcript):

| What | Share | Why it's there |
|---|---|---|
| Raw clone JSON read with read_file (9 files) | **47%** | the agent opens whole real-UI clones (HTML + inline styles) to learn what's on a screen |
| Full composition written with write_file (7 times) | 22% | every fix resends the whole ~17k-character file |
| Full composition read back with read_file (4 times) | 13% | to edit it, the agent re-reads it in full |
| Brief + inventory, the rest | 18% | |

Tool use: 36 read_file, 7 write_file, 5 snapshot, 3 list_files, 1 each of the others.

## The plan (in order — each step measured on its own run)

### 1. A compact clone view instead of raw clone JSON — expected −35 to −45%

New tool `inspect_clone(id)`: returns what the agent actually needs from a clone — its size, its blocks
(`part:N` with box and a short text), its keys (`kN`: role, box, text — fields, buttons, stats, titles, images),
whether it's a flow's before/after, and a link to its screenshot. About 2–3k characters instead of ~20k. `read_file`
on `clones/*.json` answers with that view too (the raw HTML is never useful to the agent: the renderer pastes the real
UI in by id).
**Quality guard:** the agent still sees every key and block it can zoom to, type into or tap, and the screenshot —
everything K.focus / K.type / data-clone needs. Nothing it can show changes.

### 2. Edit the composition instead of rewriting it — expected −15 to −20% (and less output)

New tool `edit_file(path, find, replace)` (exact match, must be unique, several edits per call). The method says:
write the composition once, then fix it with edits. A fix becomes a few hundred characters instead of 17k out and 17k
back into the history.
**Quality guard:** the same file, the same fixes — only smaller messages. write_file stays for the first version and
for big restructures.

### 3. Keep one copy of each file in the history — expected −10 to −15%

Before each call, older copies of a file the agent has since re-read or re-written are collapsed to one line ("[old
copy of composition/video.src.html — the current version was read/written later]"). Images already work this way
(only the latest turn keeps them). The saved transcript is collapsed the same way, so edits resume cheaply too.
**Quality guard:** the agent always has the latest version of every file and can read any file again.

### 4. Answer the common questions in the (cached) instructions — fewer calls

- A short reference for the composition helpers (K.focus, K.type / typeInto, K.tap, the camera layer) and the clip
  frame pattern, so the agent doesn't read kit.js (it did).
- The 15 safest sound effects per use case (from sfx-analysis.md), so it rarely opens the SFX guide.
- The inventory gets each screen's clone summary line (key / block counts, flow before/after) so it picks screens
  without opening them.
The instructions are cached once per run and cost ~$0.002 per call to re-read; each avoided read saves a call and
history growth.
**Quality guard:** the same information, delivered earlier.

### 5. Browse captured screenshots at 640 px — small saving

Screenshots and clip frames the agent only looks through come at 640 px wide instead of 900. Its own composition
stills (snapshot) stay as they are, so its visual check is unchanged.

### Optional, only after 1–4 are measured: a cheaper model for routine turns

Keep Opus 5.5 for the plan and for writing/fixing the composition; route pure reading turns (inspect, look at
screenshots) to Sonnet 5.5. A model switch mid-conversation loses the cache, so this only pays if reading happens in
one block before planning — measure first, and only keep it if the check results and the video hold up.

## What doesn't change

The method (method.ts), the plan format, the creative laws, the check gate, the render, the music and SFX, the
DIRECTOR_MAX_USD cap, the edit/resume flow, and the uploads.

## How we measure

Each step goes in alone, then one Mantoog 60 s 9:16 video:

- `cost.json` totals and splits;
- the number of calls;
- the history size of the last call;
- the check result (errors / warnings);
- your read of the video against the baseline.

A step that saves money but worsens the check or the video is reverted.

## Expected result

| After | ≈ $ per video |
|---|---|
| Baseline | 4.68 |
| 1 (clone view) | 3.0–3.3 |
| 1 + 2 (edits) | 2.4–2.7 |
| 1 + 2 + 3 (one copy) | 2.0–2.3 |
| 1–4 (fewer calls) | 1.7–2.1 |

These are estimates from this one run's history mix; the first measured run replaces them.

## Round 2 — lean mode (target < $0.50)

Measured after round 1 (Efham, 30 s, Opus): **$1.30**, 25 calls, history ≤ 77k tokens. By phase: browsing $0.22,
two junk reads (fonts.css 38k chars, kit.js 11k) $0.18, plan + composition $0.33, look-and-fix loop $0.53 (each
snapshot sent 8 full-size images), render + finish $0.05.

Lean mode (`DIRECTOR_LEAN`, on by default) changes how the agent looks, not what it may use or the bar it must pass:

1. **Contact sheet** — every captured screen in one labeled image in the first message; the agent opens only what it
   will use.
2. **No junk reads** — the brand's font families are in the inventory; reading fonts.css or lib/kit.js / gsap returns
   a short note (`force: true` still reads them).
3. **Tiled stills** — snapshot returns one labeled grid image (+ `full: [t]` for a full-size still when a detail
   matters) instead of one image per frame.
4. **Unused clone views leave the history** once the composition exists (inspect_clone again if needed).
5. **One review tool** — every scene and transition in one grid + the full check, in one call (the same gate).

Expected (Opus): ~$0.55–0.65 for 30 s. Under $0.50 needs `DIRECTOR_MODEL=claude-sonnet-5-5` (half the price):
~$0.30 for 30 s, ~$0.45 for 60 s — to be A/B-tested against Opus on the same brief.

### Getting back if something goes wrong

- **At runtime, no deploy:** `DIRECTOR_LEAN=0` → the agent works exactly as in round 1 (the full-size per-frame
  snapshots, no contact sheet, no review tool, files read in full). Restart the server after changing it.
- **The model:** `DIRECTOR_MODEL=claude-opus-5-5` (the default) after trying Sonnet.
- **The code:** the git tag `director-before-lean` marks the engine before lean mode:
  `git diff director-before-lean -- lib/director-engine` shows every change; `git revert <lean commit>` undoes it.

## Round 3 — fewer cache rewrites, smaller turns (lean mode)

Measured after round 2 (slllr, 60 s, Opus): **$1.22**, 19 calls — cache writes $0.53, output $0.42, uncached input
$0.16, cache reads $0.12. Two spikes (calls 8 and 14) came from trimming the history: every trim changes earlier
messages, so the whole cached prefix is written again (25× the price of reading it).

1. **Cache-aware trimming** — no trimming while the history is under ~140k characters; past that, old copies and
   unused clone views are trimmed all at once and that decision is kept as it is until the history grows another
   ~100k characters. The cached prefix stays the same between those points. The worker log prints `✂ history trimmed
   once` each time.
2. **edit_file shows what changed** — each edit's result contains the changed lines with a line of context, so the
   agent doesn't read the composition back to confirm.
3. **A tight plan** — brag-plan.md keeps every section, as terse notes, at most ~500 words.

Expected: ~$0.90–0.95 per 60 s on Opus; ~$0.45–0.50 on Sonnet. The A/B: start the `dev-director-sonnet` launch config
(`DIRECTOR_MODEL=claude-sonnet-5-5`) and make the same brief as an Opus run; compare `cost.json`, the check and the
video.

Rollback: the same switches as round 2 — `DIRECTOR_LEAN=0` turns off rounds 2 and 3 together (round-1 trimming on
every call, short edit results, the full plan), and `DIRECTOR_MODEL` returns to Opus by default.

## Watchability gate (lean mode)

Round 3's Mantoog video passed the check with 0 errors yet showed tiny, unreadable UI, 4–6 s frozen shots, an
overlay blurring half a phone, and near-empty frames: the check only measured the agent's own text. It now also measures
the rendered frames, whatever the layout (renderer.ts MEASURE / SIGNATURE, agent.ts `watchable`), as errors:

| Code | Measured at | Passes when |
|---|---|---|
| ui-small | each scene's main moment | the largest real UI on screen shows its text at ≥ 20 px on the 1080 frame (clones: CSS size × on-screen scale; screenshots/clip frames: 14 CSS px × scale) |
| ui-fill | the same | the real UI covers ≥ 25% of the frame |
| empty | the same, no UI on screen | ≥ 8% of the frame carries text or media |
| blur | the same | no blur overlay sits on the real UI (personal data: `data-pii="a|b"` on the clone placeholder blurs only those words) |
| hold | every 0.5 s, up to the last scene | the picture changes at least every 3 s |

review returns the failing frames full size (up to 3). `DIRECTOR_LEAN=0` turns the gate off with the rest of lean mode.
