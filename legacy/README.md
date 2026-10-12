# legacy/ — Phase 3B code generation (retired)

Phase 3B had the AI write a whole TSX composition per video and debug it by rewriting it (coder +
vision-QA loop + per-round still renders + render-during-generation). Phase 3C replaced it with the
MotionSpec engine (lib/motion/spec*.ts, remotion/SpecVideo.tsx, remotion/behaviors/).

Kept here, excluded from typecheck/lint/build, until 3C passes acceptance — then delete this folder.
