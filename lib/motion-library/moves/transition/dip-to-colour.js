// Dip to colour: the frame dips to black (or the look's ground, or its lightest colour) and the next scene comes up
// out of it. Out: optionally soften first — blur-scale (content scale 1 -> 0.97 and blur 0 -> `blur` px over 0.8 s
// power1.in) or dim-blur (opacity 1 -> 0.4 over 0.3 s with blur 0 -> half of `blur`); text and panels go soft, pictures
// only dim (never blurred) — then the dip layer rises 0 -> 1 over `out`, starting 0.25 s after the softening so the
// content goes soft before it goes dark. Cut at the bottom of the dip: everything changes on that frame. In: the dip
// layer falls 1 -> 0 over `in` (power2.out) with an exposure lift, brightness 0.6 -> 1. Phases: out-in (a dip
// through), in-only (fade up from black to open the film), out-only (end on black). Alone, the move dips the scene's
// own layout out and brings it back up.
// Source: MengTo/Skills 3d-virtual-tour (MIT: the fade-to-black cut between camera poses) and editorial-portfolio-
// chapters ARTICLE.md (MIT), with prompt-motion axtonliu-opus-5-5-html-svg, majorbaguette-opus-5-5-is-pretty (reference).
ML.define({
  id: "transition.dip-to-colour",
  category: "transition",
  name: "Dip to colour",
  does: "The frame softens and dips to black (or the ground or white), then the next scene comes up out of it.",
  says: ["calm", "transition", "story", "step"],
  energy: 1,
  targets: ["scene"],
  duration: [0.4, 2],
  params: {
    phase: { type: "choice", options: ["out-in", "in-only", "out-only"], default: "out-in" },
    colour: { type: "choice", options: ["black", "ground", "white"], default: "black" },
    soften: { type: "choice", options: ["none", "blur-scale", "dim-blur"], default: "none" },
    blur: { type: "number", range: [0, 12], default: 8, unit: "px" },
    out: { type: "number", range: [0.2, 1], default: 0.35, unit: "s" },
    in: { type: "number", range: [0.25, 1], default: 0.4, unit: "s" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/3d/3d-virtual-tour", license: "MIT", note: "also editorial-portfolio-chapters/ARTICLE.md; prompt-motion axtonliu-opus-5-5-html-svg, majorbaguette-opus-5-5-is-pretty (reference)" },
  setup(ctx) {
    const { p, at, stage } = ctx;
    const scene = ctx.scene || stage;
    // the dip colour: black is the look's darkest (its device colour), white its lightest of ink / ground / panel
    const lum = (c) => { const m = String(c).match(/[\d.]+/g); if (!m || m.length < 3) return 0.5; const [r, g, b] = m.slice(0, 3).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
    const probe = document.createElement("div");
    scene.append(probe);
    const resolved = (name) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
    const lightest = ["--x-panel", "--x-ground", "--x-ink", "--x-accent-ink"].map((n) => [n, lum(resolved(n))]).sort((a, b) => b[1] - a[1])[0][0];
    probe.remove();
    const col = p.colour === "ground" ? "var(--x-ground)" : p.colour === "white" ? `var(${lightest})` : "var(--x-device)";
    const dip = document.createElement("div");
    dip.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:8;background:${col};opacity:0`;
    scene.append(dip);
    // the content (everything of the scene but the dip layer), split so pictures are never blurred
    const blocks = [...scene.children].filter((e) => e !== dip);
    const PIC = /^(IMG|VIDEO|CANVAS|PICTURE)$/i;
    const soft = [], pics = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c === dip) continue;
        if (PIC.test(c.tagName)) { pics.push(c); continue; }
        if (!c.querySelector("img,video,canvas,picture")) { soft.push(c); continue; }
        walk(c);
      }
    };
    walk(scene);
    const out = ML.clamp(p.out, 0.2, 1), inn = ML.clamp(p.in, 0.25, 1), B = ML.clamp(p.blur, 0, 12);
    const phase = p.phase;
    const lead = p.soften === "none" || phase === "in-only" ? 0 : 0.25;
    const softLen = p.soften === "blur-scale" ? 0.8 : 0.3;
    const dipA = at + lead, bottom = dipA + out;
    const upA = phase === "in-only" ? at : bottom + 0.04; // hold one frame or so at the bottom: the cut
    const p1in = (x) => 1 - Math.cos((x * Math.PI) / 2);
    const p2out = (x) => 1 - (1 - x) * (1 - x);
    const quadIn = (x) => x * x;
    if (phase !== "in-only") ctx.sfx(dipA, "whoosh.soft", 0.14);
    if (phase !== "out-only") ctx.sfx(upA, "swell", 0.18);
    const setSoft = (s, k) => {
      const blur = p.soften === "blur-scale" ? B * s : p.soften === "dim-blur" ? (B / 2) * s : 0;
      soft.forEach((e) => (e.style.filter = blur > 0.02 ? `blur(${blur.toFixed(2)}px)` : ""));
      pics.forEach((e) => (e.style.opacity = s > 0.002 ? (1 - 0.35 * s).toFixed(4) : ""));
      blocks.forEach((e) => {
        e.style.opacity = p.soften === "dim-blur" && s > 0.002 ? (1 - 0.6 * s).toFixed(4) : "";
        e.style.scale = p.soften === "blur-scale" && s > 0.002 ? (1 - 0.03 * k).toFixed(4) : "";
      });
    };
    const lift = (x) => { const b = 0.6 + 0.4 * x; blocks.forEach((e) => (e.style.filter = x < 1 ? `brightness(${b.toFixed(3)})` : "")); };
    return {
      draw(t) {
        let d = 0;
        if (phase === "in-only") {
          // fade up from the colour: before `at` the frame is all colour
          const x = p2out(ML.lin(t, upA, upA + inn));
          d = 1 - x;
          setSoft(0, 0);
          lift(x);
        } else if (t < bottom + 0.04 || phase === "out-only") {
          // soften, then go dark
          const s = p.soften === "none" ? 0 : p1in(ML.lin(t, at, at + softLen));
          lift(1);
          setSoft(s, s);
          d = phase === "out-only" ? ML.ease(t, dipA, bottom) : quadIn(ML.lin(t, dipA, bottom));
        } else {
          // the cut has happened: the next frame comes up sharp out of the colour
          const x = p2out(ML.lin(t, upA, upA + inn));
          d = 1 - x;
          setSoft(0, 0);
          lift(x);
        }
        dip.style.opacity = d.toFixed(4);
      },
    };
  },
});
