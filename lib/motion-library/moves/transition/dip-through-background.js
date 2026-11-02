// Dip through background: the director's rule against a muddy crossfade of two busy layouts. The old content exits
// first (`out` 0.25-0.35 s: it recedes — scale 1 -> 0.97, a small lift, opacity 1 -> 0 — or blurs out, text and panels
// going soft while pictures only fade), the background alone holds for `gap` (0-0.2 s), then the new content enters:
// the titles rise from +0.08 s into the empty stage and the rest follows 0.08 s apart. The background never changes,
// so the cut feels like a breath. Opening a scene, the old content is the scene before it; anywhere else (or alone) the
// move lets the scene's own layout breathe out and back in.
// Source: MotionGX's own director method (lib/director-engine/worker/method.ts, "Transitions").
ML.define({
  id: "transition.dip-through-background",
  category: "transition",
  name: "Dip through background",
  does: "The old content leaves before the new arrives, so for a beat only the background is on screen instead of a muddy crossfade.",
  says: ["calm", "transition", "flow"],
  energy: 2,
  targets: ["scene"],
  duration: [0.7, 1.3],
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
    // the old content: the scene before this one when the move opens this scene, else a still copy of this layout (it
    // breathes out, then back in)
    let prev = null;
    if (ctx.scene && at - ctx.from < 0.5) {
      prev = scene.previousElementSibling;
      while (prev && !prev.classList.contains("ml-scene")) prev = prev.previousElementSibling;
    }
    const tag = `d${Math.round(at * 1000)}`;
    let old = prev;
    if (!prev) {
      old = document.createElement("div");
      old.dataset.mlFx = "1";
      old.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5";
      for (const b of blocks) old.append(b.cloneNode(true));
      old.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      scene.append(old);
    }
    old.dataset.mlDipOld = tag;
    scene.dataset.mlDipNew = tag;
    // every style of this move is one rule, in a stylesheet of its own, and only while it acts. The old scene's rule holds
    // only while this scene is on, so a frame of the old scene seeked to later is never touched by what was drawn here.
    const OLD = prev ? `[data-ml-dip-old="${tag}"]:has(~ [data-ml-dip-new="${tag}"][style*="display: block"])` : `[data-ml-dip-old="${tag}"]`;
    const sheet = document.createElement("style");
    sheet.dataset.mlFx = "1";
    scene.append(sheet);
    // blur-out splits the old layout: pictures only fade (never blurred), text and panels go soft
    const walk = (n) => {
      for (const c of n.children) {
        if (c.dataset.mlFx || /^(IMG|VIDEO|CANVAS|PICTURE|STYLE)$/i.test(c.tagName)) continue;
        if (!c.querySelector("img,video,canvas,picture")) { c.dataset.mlDipSoft = tag; continue; }
        walk(c);
      }
    };
    if (p.exit === "blur") walk(old);
    const tIn = at + out + gap + 0.08;
    const look = ctx.look || {};
    const items2 = items.map((e, i) => { e.dataset.mlDipItem = `${tag}-${i}`; return { sel: `[data-ml-dip-item="${tag}-${i}"]`, from: tIn + i * 0.08 }; });
    const rise = (look.dist || 28) * (v / 10.8), riseD = look.dur || 0.55;
    const recede = ML.bezier(0.4, 0, 0.7, 0.2); // leaving: gathers speed
    ctx.sfx(tIn, "whoosh.soft", 0.18);
    return {
      draw(t) {
        let css = "";
        // old content out
        if (t < at + out) {
          const u = recede(ML.lin(t, at, at + out));
          const move = p.exit === "blur" || u <= 0 ? "" : `transform:translateY(${(-1.2 * v * u).toFixed(2)}px) scale(${(1 - 0.03 * u).toFixed(4)})!important;transform-origin:50% 45%;`;
          css += `${OLD}{display:block!important;opacity:${(1 - u).toFixed(4)}!important;${move}}`;
          if (p.exit === "blur" && u > 0.002) css += `${OLD} [data-ml-dip-soft="${tag}"]{filter:blur(${(10 * u).toFixed(2)}px)!important}`;
        } else css += `${OLD}{display:none!important}`;
        // the background alone, then the new content rises in (nothing written once it has landed)
        for (const it of items2) {
          if (t < it.from) { css += `${it.sel}{opacity:0!important}`; continue; }
          const k = ML.expo(t, it.from, it.from + riseD);
          if (k < 1) css += `${it.sel}{opacity:${Math.min(1, k * 1.4).toFixed(4)}!important;translate:0 ${((1 - k) * rise).toFixed(2)}px!important}`;
        }
        sheet.textContent = css;
      },
    };
  },
});
