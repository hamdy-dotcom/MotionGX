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
