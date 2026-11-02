// Dip to colour: the frame dips to black (or the look's ground, or its lightest colour) and the next scene comes up
// out of it. Out: optionally soften first — blur-scale (content scale 1 -> 0.97 and blur 0 -> `blur` px over 0.8 s
// power1.in) or dim-blur (opacity 1 -> 0.4 over 0.3 s with blur 0 -> half of `blur`); text and panels go soft, pictures
// only dim (never blurred) — then the dip layer rises 0 -> 1 over `out`, starting 0.25 s after the softening so the
// content goes soft before it goes dark. Cut at the bottom of the dip: everything changes on that frame. In: the dip
// layer falls 1 -> 0 over `in` (power2.out) with an exposure lift, brightness 0.6 -> 1. Phases: out-in (a dip
// through), in-only (fade up from black to open the film), out-only (end on black). Opening a scene, out-in dips the
// scene before it and comes up on this one; anywhere else (or alone) it dips the scene's own layout out and back up.
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
  duration: [0.6, 2.3],
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
    dip.dataset.mlFx = "1";
    dip.style.cssText = `position:absolute;inset:-5%;pointer-events:none;z-index:8;background:${col};opacity:0`; // past the frame: the scene under it may shrink
    scene.append(dip);
    const sheet = document.createElement("style");
    sheet.dataset.mlFx = "1";
    scene.append(sheet);
    const out = ML.clamp(p.out, 0.2, 1), inn = ML.clamp(p.in, 0.25, 1), B = ML.clamp(p.blur, 0, 12);
    const phase = p.phase;
    // what leaves: opening a scene, the scene before it (the cut at the bottom of the dip is the real change of scene);
    // anywhere else (or alone) the scene's own layout dips out and comes back up
    let prev = null;
    if (phase === "out-in" && ctx.scene && at - ctx.from < 0.5) {
      prev = scene.previousElementSibling;
      while (prev && !prev.classList.contains("ml-scene")) prev = prev.previousElementSibling;
    }
    // every style of this move is one rule in its own stylesheet, only while it acts; the old scene's rule holds only
    // while this scene is on, so a frame of the old scene seeked to later is never touched by what was drawn here
    const tag = `c${Math.round(at * 1000)}`;
    scene.dataset.mlDcNew = tag;
    const NEW = `[data-ml-dc-new="${tag}"]`;
    if (prev) prev.dataset.mlDcOld = tag;
    const OLD = prev ? `[data-ml-dc-old="${tag}"]:has(~ ${NEW}[style*="display: block"])` : NEW;
    const CONTENT = `${NEW} > :not([data-ml-fx])`;
    // the leaving content, split so pictures are never blurred
    const walk = (n) => {
      for (const c of n.children) {
        if (c.dataset.mlFx) continue;
        if (/^(IMG|VIDEO|CANVAS|PICTURE)$/i.test(c.tagName)) { c.dataset.mlDcPic = tag; continue; }
        if (!c.querySelector("img,video,canvas,picture")) { c.dataset.mlDcSoft = tag; continue; }
        walk(c);
      }
    };
    if (p.soften !== "none") walk(prev || scene);
    const lead = p.soften === "none" || phase === "in-only" ? 0 : 0.25;
    const softLen = p.soften === "blur-scale" ? 0.8 : 0.3;
    const dipA = at + lead, bottom = dipA + out;
    const upA = phase === "in-only" ? at : bottom + 0.04; // hold one frame or so at the bottom: the cut
    const p1in = (x) => 1 - Math.cos((x * Math.PI) / 2);
    const p2out = (x) => 1 - (1 - x) * (1 - x);
    const quadIn = (x) => x * x;
    if (phase !== "in-only") ctx.sfx(dipA, "whoosh.soft", 0.14);
    if (phase !== "out-only") ctx.sfx(upA, "swell", 0.18);
    return {
      draw(t) {
        let d, css = "";
        if (phase === "in-only" || (phase === "out-in" && t >= upA)) {
          // the cut has happened: the frame comes up sharp out of the colour, with an exposure lift
          const x = p2out(ML.lin(t, upA, upA + inn));
          d = 1 - x;
          if (prev) css += `${OLD}{display:none!important}`;
          if (x < 1) css += `${CONTENT}{filter:brightness(${(0.6 + 0.4 * x).toFixed(3)})!important}`;
        } else {
          // soften, then go dark
          const s = p.soften === "none" ? 0 : p1in(ML.lin(t, at, at + softLen));
          d = phase === "out-only" ? ML.ease(t, dipA, bottom) : quadIn(ML.lin(t, dipA, bottom));
          if (prev) css += `${OLD}{display:block!important}${CONTENT}{opacity:0!important}`;
          if (s > 0.002) {
            const blur = p.soften === "blur-scale" ? B * s : (B / 2) * s;
            if (blur > 0.02) css += `${OLD} [data-ml-dc-soft="${tag}"]{filter:blur(${blur.toFixed(2)}px)!important}`;
            css += `${OLD} [data-ml-dc-pic="${tag}"]{opacity:${(1 - 0.35 * s).toFixed(4)}!important}`;
            if (p.soften === "dim-blur") css += `${prev ? OLD : CONTENT}{opacity:${(1 - 0.6 * s).toFixed(4)}!important}`;
            else if (ctx.scene) css += `${OLD}{scale:${(1 - 0.03 * s).toFixed(4)}!important}`;
          }
        }
        dip.style.opacity = d.toFixed(4);
        sheet.textContent = css;
      },
    };
  },
});
