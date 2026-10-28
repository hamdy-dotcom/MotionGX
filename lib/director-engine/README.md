# Director engine (`VIDEO_ENGINE=director`)

A port of the open-source **/brag** method (MIT — see `LICENSE-brag.md`): one agent makes the whole video from our
capture and the video brief — Inspect (the 9-question rubric) → Plan (`brag-plan.md`, a timed storyboard) → Build (one
HTML composition, every frame a pure function of time, real captured UI only) → Check (stills of every scene and
mid-transition + an automatic gate: off-frame text, margins, small text, WCAG contrast, overlaps, unblurred personal
data, blank frames) → Render (Playwright frames + ffmpeg, MotionGX's own music bed + CC0 SFX, poster baked as frame 0)
→ Deliver (share copy).

- `worker/method.ts` — the method, as the agent's system prompt (ported from brag-slim + /brag's references).
- `worker/agent.ts` — the tool loop (Anthropic API): sandboxed read (capture, never auth.json) / write (work dir),
  clip frames, storyboard + music, snapshot, check, render, finish. Every call is booked on the job's ledger;
  the run stops past `DIRECTOR_MAX_USD`.
- `worker/renderer.ts` — the composition contract, the check and the renderer (no network).
- `worker/run.ts` — one video job: inventory → agent → uploads as a normal version (the studio works unchanged).
  Edits ("Edit lines" / "Request a change") resume the same agent from the previous version's `director.tgz`.
- `assets/sfx/` — /brag's CC0 sound effects (Kenney, unicae_games). /brag's music is not used (licence not cleared).

Settings (app env): `VIDEO_ENGINE=director`, `DIRECTOR_MODEL` (default `claude-opus-5-5`), `DIRECTOR_MAX_USD`
(default `6`). The live engine, capture, UI and billing are unchanged; the job plumbing (worker, storage, versions) is
the live engine's.
