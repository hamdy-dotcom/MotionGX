// Cover hold: the film's very first frames show the hook at its best moment (the whole title landed over the picture),
// then the hook plays from its start — feeds and editors show the first frame, and a hook that opens mid-animation
// opens on nothing. Ported from html-reel's reel-clock: `at(tau) = tau < coverHold ? cover : tau`, applied to the
// film's own seek, so every move in the scene is drawn at the cover moment for the first `hold` seconds (it stays a
// pure function of t). "first-frame-drawn" is the explainer variant: the hook opens already drawn (no entrance) and
// holds there until the cover moment, then plays on. Cover moment: `moment` s into the scene, or (0) the scene's
// landed point — 2.2 s in, never past its last half second.
// Source: MengTo/Skills html-reel scripts/reel-clock.js (MIT).
ML.define({
  id: "transition.cover-hold",
  category: "transition",
  name: "Cover hold",
  does: "The very first frame shows the hook at its best moment (full title landed over the best picture), then the hook plays from the start.",
  says: ["brand", "arrival"],
  energy: 1,
  targets: ["scene"],
  duration: [0, 0.3],
  params: {
    hold: { type: "number", range: [0, 0.3], default: 0.2, unit: "s" },
    cover: { type: "choice", options: ["best-moment", "first-frame-drawn"], default: "best-moment" },
    moment: { type: "number", range: [0, 6], default: 0, unit: "s" },
  },
  pairs: ["text-in.punchline", "text-in.slam"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/media/html-reel/scripts/reel-clock.js", license: "MIT" },
  setup(ctx) {
    const { p, from, to } = ctx;
    const root = window;
    const cover = p.moment > 0 ? Math.min(to - 0.05, from + p.moment) : Math.max(from, Math.min(to - 0.5, from + 2.2));
    // one cover per film: the hook's. The film's seek is wrapped once and marked, so a second cover-hold leaves it alone
    // and a new film on the same page (a fresh, unmarked seek) gets its own; the mapping is a pure function of t.
    const seek = root.__seek;
    if (typeof seek === "function" && !seek.mlCover) {
      const hold = p.cover === "first-frame-drawn" ? cover - from : p.hold;
      const wrapped = (t) => seek(t >= from && t < from + hold ? cover : t);
      wrapped.mlCover = true;
      root.__seek = wrapped;
    }
    return { draw() {} };
  },
});
