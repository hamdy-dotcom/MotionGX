// Slice glitch: for a few frames (0.1-0.35 s, stepped at 30 fps, every frame's tear seeded by its frame index so it
// is a pure function of t) the picture tears: 4-16 horizontal slices of seeded height (5-80 px at 1080) shove sideways
// ±10-160 px, growing frame by frame (power2.in); some slices smear (scaleX 1.3 with a half-strength duplicate);
// white blocks (60 x 20 px) flicker at slice edges; 1 px bright lines cross the frame. Chroma split: the frame is
// rebuilt from its red copy and its green-blue copy screened together, offset ±chroma px, so the fringes are the
// picture's own red / cyan (no blur anywhere). Flash: the ground lifts toward a 30 % grey (or white) radial. Underlay:
// a checker shows in the holes the slices leave (else the ground). Endings: "cut" — the last 2 frames throw the slices
// further and the new scene shows behind them, then a hard cut; "out" — the last 2 frames black; "snap" — the slices
// switch to the new scene and their offsets fall to 0 over 0.12 s; "swap" — midway the tear hard-swaps to the new
// scene and ground, then settles. Word scope: 3 copies (red x -6, blue x +6) and 2 slices ±10 px for 2-4 frames, then
// the word stands clean ("swap": in the accent; "out": gone). The old scene is the one before this when the film has
// it; alone, a copy of this layout in the look's inverse.
// Source: prompt-motion teslachartz-claude-opus-5-5-leaves, kloss-xyz-had-to-test-this, math-files-i-made-this-using,
// spearwtf-so-i-wanted-to, zheke-prompt-hello-opus-5-5, tequilafunks-opus-5-5-remotion-make,
// safarkhanshuvo-this-is-insane-claude (reference only: our own rebuild).
ML.define({
  id: "transition.slice-glitch",
  category: "transition",
  name: "Slice glitch",
  does: "For a few frames the picture (or a word) tears into horizontal bands that shove sideways with red/cyan fringes, then snaps clean into the next scene or word.",
  says: ["transition", "energy", "tech", "change", "playful"],
  energy: 5,
  targets: ["scene", "headline", "word"],
  duration: [0.1, 0.4],
  params: {
    scope: { type: "choice", options: ["scene", "word"], default: "scene" },
    slices: { type: "number", range: [2, 16], default: 8 },
    offset: { type: "number", range: [10, 160], default: 60, unit: "px" },
    chroma: { type: "number", range: [0, 14], default: 6, unit: "px" },
    flash: { type: "choice", options: ["none", "grey", "white"], default: "none" },
    underlay: { type: "choice", options: ["none", "checker"], default: "none" },
    end: { type: "choice", options: ["cut", "out", "snap", "swap"], default: "cut" },
    duration: { type: "number", range: [0.1, 0.35], default: 0.25, unit: "s" },
  },
  pairs: ["transition.glitch-bar-wipe", "transition.glitch-noise-burst", "text-in.scramble"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "prompt-motion:teslachartz-claude-opus-5-5-leaves", license: "reference", note: "with kloss-xyz-had-to-test-this, math-files-i-made-this-using, spearwtf-so-i-wanted-to, zheke-prompt-hello-opus-5-5, tequilafunks-opus-5-5-remotion-make, safarkhanshuvo-this-is-insane-claude; our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const FPS = 30;
    const D = ML.clamp(+p.duration || 0.25, 0.1, 0.35);
    const chroma = ML.clamp(+p.chroma, 0, 14) * k;
    const off = ML.clamp(+p.offset || 60, 10, 160) * k;
    const end = p.end || "cut";
    const frameOfT = (t) => Math.floor((t - at) * FPS + 1e-6);
    const NS = "http://www.w3.org/2000/svg";
    // channel filters (colour matrices, never a blur): the red copy and the green-blue copy
    const fid = "ml-sg-" + Math.floor(ML.rnd(at * 71 + W, 9) * 1e9).toString(36);
    const defs = document.createElementNS(NS, "svg");
    defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.style.position = "absolute";
    defs.innerHTML = `<filter id="${fid}-r" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>` +
      `<filter id="${fid}-c" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>`;
    scene.append(defs);
    ctx.sfx(at, "snap", 0.5);

    // ── word scope: fringed copies and two slices on the word for 2-4 frames ──
    const wordEl = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : scene.querySelector(".ml-title");
    if (p.scope === "word" && wordEl) {
      const host = wordEl.offsetParent || wordEl.parentElement;
      const layer = document.createElement("div");
      layer.dataset.mlFx = "1";
      layer.style.cssText = `position:absolute;left:${wordEl.offsetLeft}px;top:${wordEl.offsetTop}px;width:${wordEl.offsetWidth}px;height:${wordEl.offsetHeight}px;pointer-events:none;z-index:5`;
      const cp = (col, extra = "") => {
        const c = wordEl.cloneNode(true);
        c.removeAttribute("data-slot"); c.removeAttribute("id");
        c.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
        Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: wordEl.offsetWidth + "px", margin: "0" });
        if (col) c.style.color = col;
        c.style.cssText += extra;
        layer.append(c);
        return c;
      };
      const red = chroma > 0 ? cp("var(--x-bad)", ";opacity:0.85") : null;
      const blue = chroma > 0 ? cp("var(--x-accent-2)", ";opacity:0.85;mix-blend-mode:multiply") : null;
      const s1 = cp(""), s2 = cp("");
      host.append(layer);
      const nW = D <= 0.15 ? 2 : D <= 0.25 ? 3 : 4;
      const wc = Math.max(6 * k, chroma);
      return {
        draw(t) {
          const fi = frameOfT(t), on = t >= at && fi < nW;
          layer.style.visibility = on ? "visible" : "hidden";
          wordEl.style.visibility = on || (end === "out" && fi >= nW) ? "hidden" : "";
          wordEl.style.color = end === "swap" && t >= at && fi >= Math.floor(nW / 2) ? "var(--x-accent)" : "";
          if (!on) return;
          const cut = 25 + 50 * ML.rnd(fi, 51), sh = 10 * k * (ML.rnd(fi, 52) < 0.5 ? -1 : 1);
          if (red) red.style.translate = `${(-wc).toFixed(1)}px ${((ML.rnd(fi, 53) - 0.5) * 6 * k).toFixed(1)}px`;
          if (blue) blue.style.translate = `${wc.toFixed(1)}px ${((ML.rnd(fi, 54) - 0.5) * 6 * k).toFixed(1)}px`;
          s1.style.clipPath = `inset(0 -20% ${(100 - cut).toFixed(2)}% -20%)`; s1.style.translate = `${sh.toFixed(1)}px 0`;
          s2.style.clipPath = `inset(${cut.toFixed(2)}% -20% 0 -20%)`; s2.style.translate = `${(-sh).toFixed(1)}px 0`;
          const swapNow = end === "swap" && fi >= Math.floor(nW / 2);
          s1.style.color = s2.style.color = swapNow ? "var(--x-accent)" : "";
        },
      };
    }

    // ── scene scope ──
    /** the old frame: the scene before this one when the film has it, else a copy of this layout in the look's inverse */
    const oldFrame = (scene) => {
      let prev = scene.previousElementSibling;
      while (prev && !(prev.classList && prev.classList.contains("ml-scene"))) prev = prev.previousElementSibling;
      const g = document.createElement("div");
      g.dataset.mlFx = "1";
      g.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image);color:var(--x-ink)";
      for (const c of (prev || scene).children) if (!(c.dataset && c.dataset.mlFx) && c.tagName !== "svg") g.append(c.cloneNode(true));
      g.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      if (!prev) {
        const cs = getComputedStyle(scene), v = (n) => cs.getPropertyValue(n).trim();
        const ground = v("--x-ink"), ink = v("--x-ground");
        const set = { "--x-ground": ground, "--x-ink": ink, "--x-dim": `color-mix(in srgb, ${ink} 66%, transparent)`, "--x-panel": `color-mix(in srgb, ${ink} 9%, ${ground})`, "--x-panel-2": `color-mix(in srgb, ${ink} 14%, ${ground})`, "--x-line": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-edge-color": `color-mix(in srgb, ${ink} 14%, transparent)`, "--x-ground-image": "none" };
        for (const [n, x] of Object.entries(set)) g.style.setProperty(n, x);
        g.style.background = ground; g.style.color = ink;
      }
      return g;
    };
    /** the new frame as a still copy: this scene's own blocks on its ground */
    const newFrame = () => {
      const g = document.createElement("div");
      g.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;background:var(--x-ground);background-image:var(--x-ground-image);color:var(--x-ink)";
      for (const c of scene.children) if (!(c.dataset && c.dataset.mlFx) && c.tagName !== "svg") g.append(c.cloneNode(true));
      g.querySelectorAll("[data-slot],[id]").forEach((e) => { e.removeAttribute("data-slot"); e.removeAttribute("id"); });
      return g;
    };
    const n = Math.round(ML.clamp(+p.slices || 8, 2, 16));
    const holeBg = p.underlay === "checker"
      ? `repeating-conic-gradient(var(--x-ink) 0 25%, var(--x-panel) 0 50%) 0 0 / ${(18 * k).toFixed(1)}px ${(18 * k).toFixed(1)}px`
      : "var(--x-ground)";
    // a frame rebuilt from its channels (red below, green-blue screened over it), so it can split
    const channels = (make) => {
      const box = document.createElement("div");
      box.style.cssText = "position:absolute;inset:0;isolation:isolate";
      if (chroma > 0) {
        const r = make(), c = make();
        r.style.filter = `url(#${fid}-r)`;
        c.style.filter = `url(#${fid}-c)`; c.style.mixBlendMode = "screen";
        box.append(r, c);
        return { box, r, c };
      }
      box.append(make());
      return { box, r: null, c: null };
    };
    // one stack per frame (old / new): the whole frame, then n slices over it, each with its hole
    const stack = (make, groundSrc) => {
      const root = document.createElement("div");
      root.style.cssText = "position:absolute;inset:0";
      const base = channels(make);
      root.append(base.box);
      const slices = [];
      for (let i = 0; i < n; i++) {
        const wrap = document.createElement("div");
        wrap.style.cssText = "position:absolute;inset:0";
        const hole = document.createElement("div");
        hole.style.cssText = `position:absolute;inset:0;background:${holeBg}`;
        if (p.underlay !== "checker" && groundSrc) for (const v of ["--x-ground"]) { const x = groundSrc.style.getPropertyValue(v); if (x) hole.style.background = x; }
        const ch = channels(make);
        const ghost = channels(make); // the smear's half-strength duplicate
        ghost.box.style.opacity = "0.5";
        wrap.append(hole, ghost.box, ch.box);
        root.append(wrap);
        slices.push({ wrap, ch, ghost });
      }
      return { root, base, slices };
    };
    const A0 = oldFrame(scene);
    const SA = stack(() => oldFrame(scene), A0);
    const SB = stack(newFrame, null);
    const layer = document.createElement("div");
    layer.dataset.mlFx = "1";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden";
    const flash = document.createElement("div");
    const fc = p.flash === "white" ? "var(--x-panel)" : "color-mix(in srgb, var(--x-dim) 60%, var(--x-panel))";
    flash.style.cssText = `position:absolute;inset:0;background:radial-gradient(circle at 50% 50%, color-mix(in srgb, ${fc} 30%, transparent), transparent 75%);mix-blend-mode:screen`;
    const blocks = Array.from({ length: 6 }, () => { const b = document.createElement("div"); b.style.cssText = `position:absolute;left:0;top:0;width:${(60 * k).toFixed(1)}px;height:${(20 * k).toFixed(1)}px;background:var(--x-panel)`; return b; });
    const lines = Array.from({ length: 4 }, () => { const b = document.createElement("div"); b.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${Math.max(1, Math.round(k))}px;background:var(--x-panel)`; return b; });
    const black = document.createElement("div");
    black.style.cssText = "position:absolute;inset:0;background:var(--x-device)";
    layer.append(SA.root, SB.root, flash, ...blocks, ...lines, black);
    scene.append(layer);

    const nF = Math.max(3, Math.round(D * FPS));
    const settle = end === "snap" ? Math.round(0.12 * FPS) : 0;
    const total = nF + settle;
    const swapAt = end === "swap" ? Math.floor(nF / 2) : end === "snap" ? nF : Infinity;
    const placeStack = (S, fi, g, seedK, throwMore) => {
      for (let i = 0; i < n; i++) {
        const s = S.slices[i];
        const sd = fi * 97 + i * 13 + seedK;
        const hgt = (5 + 75 * Math.pow(ML.rnd(sd, 61), 1.6)) * k;
        const y = ML.rnd(sd, 62) * (H - hgt);
        const sign = ML.rnd(sd, 63) < 0.5 ? -1 : 1;
        const dx = sign * off * (0.17 + 0.83 * ML.rnd(sd, 64)) * g * throwMore;
        const smear = ML.rnd(sd, 65) < 0.25;
        s.wrap.style.clipPath = `inset(${y.toFixed(1)}px 0 ${(H - y - hgt).toFixed(1)}px 0)`;
        s.wrap.style.visibility = g > 0.001 ? "visible" : "hidden";
        const tr = `translateX(${dx.toFixed(1)}px)${smear ? " scaleX(1.3)" : ""}`;
        s.ch.box.style.transform = tr;
        s.ch.box.style.transformOrigin = sign > 0 ? "0 50%" : "100% 50%";
        s.ghost.box.style.display = smear ? "block" : "none";
        s.ghost.box.style.transform = `translateX(${(dx * 0.5).toFixed(1)}px)`;
        // chroma: the red copy one way, the green-blue the other, growing with the tear
        const c = chroma * (0.5 + 0.5 * g);
        if (s.ch.r) { s.ch.r.style.translate = `${(-c).toFixed(1)}px 0`; s.ch.c.style.translate = `${c.toFixed(1)}px 0`; }
        if (s.ghost.r) { s.ghost.r.style.translate = `${(-c).toFixed(1)}px 0`; s.ghost.c.style.translate = `${c.toFixed(1)}px 0`; }
      }
      const c = chroma * g;
      if (S.base.r) { S.base.r.style.translate = `${(-c).toFixed(1)}px 0`; S.base.c.style.translate = `${c.toFixed(1)}px 0`; }
    };
    return {
      draw(t) {
        const fi = frameOfT(t);
        const on = t >= at && fi < total;
        // before the tear: the old frame whole; after it: the real scene, clean
        layer.style.display = t < at || on ? "block" : "none";
        if (t < at) {
          SA.root.style.visibility = "visible"; SB.root.style.visibility = "hidden";
          placeStack(SA, 0, 0, 0, 1);
          flash.style.opacity = "0"; black.style.opacity = "0";
          for (const b of [...blocks, ...lines]) b.style.visibility = "hidden";
          return;
        }
        if (!on) return;
        // growth (power2.in) through the tear; a settle falls back to 0
        let g = Math.pow((Math.min(fi, nF - 1) + 1) / nF, 2);
        if (end === "swap" && fi >= swapAt) g = Math.max(0, 1 - (fi - swapAt + 1) / Math.max(1, nF - swapAt));
        if (end === "snap" && fi >= nF) g = Math.max(0, 1 - (fi - nF + 1) / Math.max(1, settle));
        const last2 = fi >= nF - 2;
        const showB = fi >= swapAt;
        SA.root.style.visibility = showB ? "hidden" : "visible";
        SB.root.style.visibility = showB ? "visible" : "hidden";
        // cut: the last two frames throw the slices further and the new scene shows behind (the old base drops out)
        const cutTail = end === "cut" && last2;
        SA.base.box.style.visibility = cutTail ? "hidden" : "visible";
        placeStack(showB ? SB : SA, fi, g, showB ? 500 : 0, cutTail ? 1.8 : 1);
        black.style.opacity = end === "out" && last2 ? "1" : "0";
        flash.style.opacity = p.flash === "none" ? "0" : (g * (fi % 2 ? 0.6 : 1)).toFixed(3);
        blocks.forEach((b, i) => {
          const sd = fi * 31 + i * 7, show = ML.rnd(sd, 71) < 0.55 * g + 0.1;
          b.style.visibility = show ? "visible" : "hidden";
          b.style.translate = `${(ML.rnd(sd, 72) * (W - 60 * k)).toFixed(1)}px ${(ML.rnd(sd, 73) * (H - 20 * k)).toFixed(1)}px`;
        });
        lines.forEach((b, i) => {
          const sd = fi * 17 + i * 5;
          b.style.visibility = ML.rnd(sd, 81) < 0.6 * g + 0.1 ? "visible" : "hidden";
          b.style.translate = `0 ${(ML.rnd(sd, 82) * H).toFixed(1)}px`;
        });
      },
    };
  },
});
