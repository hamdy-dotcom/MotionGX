// Dip through background: the director's rule against a muddy crossfade of two busy layouts. The old content exits
// first (`out` 0.25-0.35 s: it recedes — scale 1 -> 0.97, a small lift, opacity 1 -> 0 — or blurs out, text and panels
// going soft while pictures only fade), the background alone holds for `gap` (0-0.2 s), then the new content enters:
// the titles rise from +0.08 s into the empty stage and the rest follows 0.08 s apart. The background never changes,
// so the cut feels like a breath. The old content is the scene before this one when the film has it; alone, the move
// lets the scene's own layout breathe out and back in.
// Source: MotionGX's own director method (lib/director-engine/worker/method.ts, "Transitions").
ML.define({
  id: "transition.dip-through-background",
  category: "transition",
  name: "Dip through background",
  does: "The old content leaves before the new arrives, so for a beat only the background is on screen instead of a muddy crossfade.",
  says: ["calm", "transition", "flow"],
  energy: 2,
  targets: ["scene"],
  duration: [0.4, 0.9],
  params: {
    out: { type: "number", range: [0.25, 0.35], default: 0.3, unit: "s" },
    gap: { type: "number", range: [0, 0.2], default: 0.1, unit: "s" },
    exit: { type: "choice", options: ["recede", "blur"], default: "recede" },
  },
  pairs: ["text-in.punchline", "transition.recede-fade"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/director-engine/worker/method.ts", license: "own" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const v = Math.min(f.W, f.H) / 100;
    const out = ML.clamp(p.out, 0.25, 0.35), gap = ML.clamp(p.gap, 0, 0.2);
    // the new content: the scene's own blocks, titles first
    const blocks = [...scene.children].filter((e) => !e.dataset.mlFx);
    const head = blocks.filter((e) => e.classList.contains("ml-head"));
    const items = [];
    for (const h of head) for (const c of h.children) items.push(c);
    for (const b of blocks) if (!head.includes(b)) items.push(b);
    // the old content: the scene before this one, else a still copy of this layout (it breathes out, then back in)
    let prev = scene.previousElementSibling;
    while (prev && !prev.classList.contains("ml-scene")) prev = prev.previousElementSibling;
    let ghost = null;
    if (!prev) {
      ghost = document.createElement("div");
      ghost.dataset.mlFx = "1";
      ghost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5";
      for (const b of blocks) ghost.append(b.cloneNode(true));
      ghost.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      scene.append(ghost);
    }
    const old = ghost || prev;
    // blur-out splits the old layout: pictures only fade (never blurred), text and panels go soft
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const soft = [], pics = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (PIC.test(c.tagName)) { pics.push(c); continue; }
        if (!c.querySelector("img,video,canvas,picture")) { soft.push(c); continue; }
        walk(c);
      }
    };
    if (p.exit === "blur") walk(old);
    const tIn = at + out + gap + 0.08;
    const times = items.map((e, i) => tIn + i * 0.08);
    const rise = (ctx.look && ctx.look.dist ? ctx.look.dist : 28) * (v / 10.8);
    const recede = ML.bezier(0.4, 0, 0.7, 0.2); // leaving: gathers speed
    ctx.sfx(tIn, "whoosh.soft", 0.18);
    return {
      draw(t) {
        // old content out
        const u = recede(ML.lin(t, at, at + out));
        const oldOn = t < at + out;
        if (prev) {
          if (t >= at - 0.5 && oldOn) { prev.style.display = "block"; }
          else if (t >= at + out && t < at + out + 0.5) prev.style.display = "none";
        } else ghost.style.visibility = oldOn ? "visible" : "hidden";
        if (oldOn) {
          old.style.opacity = (1 - u).toFixed(4);
          if (p.exit === "blur") {
            old.style.transform = "none";
            soft.forEach((e) => (e.style.filter = u > 0.002 ? `blur(${(10 * u).toFixed(2)}px)` : ""));
          } else {
            old.style.transformOrigin = "50% 45%";
            old.style.transform = u > 0 ? `translateY(${(-1.2 * v * u).toFixed(2)}px) scale(${(1 - 0.03 * u).toFixed(4)})` : "none";
          }
        }
        // the background alone, then the new content rises in
        items.forEach((e, i) => {
          const k = ML.expo(t, times[i], times[i] + 0.55);
          const shown = t >= times[i];
          e.style.opacity = shown ? Math.min(1, k * 1.4).toFixed(4) : "0";
          e.style.translate = shown && k < 1 ? `0 ${((1 - k) * rise).toFixed(2)}px` : "none";
        });
      },
    };
  },
});
