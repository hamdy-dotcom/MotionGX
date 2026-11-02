// Staggered dissolve exit: the pieces of an interface leave one after another. Over the exit window (`duration` s from
// `at`) progress u runs 0 → 1 and every piece has its own slot [at, at + span]: the floating window (the largest
// non-picture block) at .00 for .26, dissolving — opacity 1 → 0 and blur 0 → 10 px; then the rest in reading order
// from .10 to .70, each over .30, fading and sinking `shift` px (0 → 15 by default). a = 1 − smoothstep(at, at+span, u).
// Pictures never blur (they only fade and sink). The pieces are the target's leaf blocks (its text runs, chips, pictures,
// marks), found once in setup; a whole scene works the same way.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds demo/index.html wireHeroExit() (MIT) — the scroll-driven
// sequence, driven here by t.
ML.define({
  id: "element.staggered-dissolve-exit",
  category: "element",
  name: "Staggered dissolve exit",
  does: "Interface pieces leave one after another, each fading and sinking a little, the floating window blurring away first.",
  says: ["transition", "calm", "change"],
  energy: 2,
  targets: ["card", "label", "list", "scene"],
  duration: [0.5, 1.5],
  params: {
    blur: { type: "bool", default: true },
    shift: { type: "number", range: [10, 20], default: 15, unit: "px" },
    duration: { type: "number", range: [0.5, 1.5], default: 0.9, unit: "s" },
  },
  pairs: ["transition.crossfade", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT", note: "wireHeroExit(): window .00/.26 blur 10, cue .10, chips .20 + i·.10, row .60, side .70, span .30, shift 15 px" },
  setup(ctx) {
    const { p, at, f } = ctx;
    const root = ctx.el || ctx.scene || ctx.stage;
    if (!root) return null;
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/;
    const isPic = (n) => PIC.test(n.tagName) || (getComputedStyle(n).backgroundImage || "none").includes("url(");
    // the leaf blocks: descend through single-child wrappers, stop at pictures, svgs and text runs
    const blocks = (n, depth = 0) => {
      if (n.nodeType !== 1) return [];
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return [];
      const kids = [...n.children].filter((c) => getComputedStyle(c).display !== "none");
      if (!kids.length || isPic(n) || n.tagName === "svg" || depth > 6) return [n];
      const ownText = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (ownText || kids.every((c) => /^(SPAN|B|I|EM|STRONG|BR)$/.test(c.tagName) && !c.children.length && getComputedStyle(c).display.startsWith("inline"))) return [n];
      return kids.flatMap((c) => blocks(c, depth + 1));
    };
    let pieces = blocks(root);
    if (!pieces.length) pieces = [root];
    const area = (n) => { const b = ctx.box(n); return b.w * b.h; };
    // the floating window: the largest block that is not a picture (pictures are never blurred); else the largest
    let win = pieces.filter((n) => !isPic(n)).sort((a, b) => area(b) - area(a))[0] || pieces.slice().sort((a, b) => area(b) - area(a))[0];
    const rest = pieces.filter((n) => n !== win);
    const k = f.H / f.W > 1 ? f.W / 1080 : f.H / 1080; // shift is in 1080-short-side px
    const seq = [{ el: win, at: 0, span: 0.26, blur: p.blur && !isPic(win) ? 10 : 0, shift: false }];
    const n = rest.length;
    const step = n > 1 ? Math.min(0.1, 0.6 / (n - 1)) : 0;
    rest.forEach((el, i) => seq.push({ el, at: 0.1 + i * step, span: 0.3, blur: 0, shift: true }));
    // the last two go without sinking (the source's row and side title, whose transforms carry layout)
    if (n > 2) { seq[seq.length - 1].shift = false; seq[seq.length - 2].shift = false; seq[seq.length - 1].at = Math.max(seq[seq.length - 1].at, 0.7); seq[seq.length - 2].at = Math.max(seq[seq.length - 2].at, 0.6); }
    // the frames the pieces sat in (panels, chip rows with a fill, an edge or a shadow) leave last, with the side title
    const chrome = (n) => { const c = getComputedStyle(n); return !/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor) || parseFloat(c.borderTopWidth) > 0 || (c.boxShadow && c.boxShadow !== "none"); };
    const frames = new Set();
    for (const o of seq) for (let n = o.el.parentElement; n && n !== ctx.stage && n !== ctx.scene; n = n.parentElement) { if (chrome(n) && !pieces.includes(n)) frames.add(n); if (n === root) break; }
    if (root !== ctx.scene && root !== ctx.stage && chrome(root)) frames.add(root);
    for (const el of frames) seq.push({ el, at: 0.7, span: 0.3, blur: 0, shift: false });
    const dur = ML.clamp(p.duration, 0.5, 1.5);
    const smooth = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    ctx.sfx(at, "whoosh.soft", 0.3);
    return {
      draw(t) {
        const u = ML.clamp((t - at) / dur);
        for (const o of seq) {
          const a = 1 - smooth(o.at, o.at + o.span, u);
          o.el.style.opacity = a.toFixed(4);
          o.el.style.translate = o.shift && a < 1 ? `0 ${((1 - a) * p.shift * k).toFixed(2)}px` : "none";
          o.el.style.filter = o.blur && a < 0.999 ? `blur(${((1 - a) * o.blur).toFixed(2)}px)` : "none";
        }
      },
    };
  },
});
