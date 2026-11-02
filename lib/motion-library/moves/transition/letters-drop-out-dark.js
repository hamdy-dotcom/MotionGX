// Letters drop into darkness: a hard cut to a near-black ground, then giant letters (white, ~40 % of the frame's
// height, fitted to its width) fall past the camera at ~3000 px/s (scaled to the frame) — from fully above the frame
// to fully below — staggered 0.03 s, each trailing a vertical motion blur made of fading smear copies spaced by its
// travel in one frame. "up" sends them rising instead. "word" drops the target's longest word (the giant version),
// "line" the whole line. Splits letters: Latin only (an Arabic word falls whole, never split).
// Colours from the look: the ground is its darker pole (of ink and ground) lifted a touch, letters the lighter one. A
// long line tightens its stagger so the whole fall stays inside the card's duration.
// Source: prompt-motion chatgptastra-opus-5-5-15 (reference only: our own rebuild).
ML.define({
  id: "transition.letters-drop-out-dark",
  category: "transition",
  name: "Letters drop into darkness",
  does: "The scene cuts to dark and huge letters fall past the camera with motion blur.",
  says: ["transition", "energy"],
  energy: 4,
  targets: ["scene", "word"],
  duration: [0.4, 0.8],
  params: {
    direction: { type: "choice", options: ["down", "up"], default: "down" },
    text: { type: "choice", options: ["word", "line"], default: "word" },
    stagger: { type: "number", range: [0.01, 0.08], default: 0.03, unit: "s" },
    smear: { type: "number", range: [0, 16], default: 12 },
  },
  pairs: ["transition.hard-cut", "text-in.slam"],
  avoid: ["calm", "luxury"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:chatgptastra-opus-5-5-15", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H;
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const src = own || scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");
    const full = ((src && src.textContent) || "").trim().replace(/\s+/g, " ");
    if (!full) return null;
    const words = full.split(" ").map((w) => w.replace(/[.,،؛؟?!…:«»"'()]/g, "")).filter(Boolean);
    const text = p.text === "line" ? full : words.reduce((a, b) => (Array.from(b).length > Array.from(a).length ? b : a), "");
    // the two poles of the look, whichever way round it is: never accent-ink, which is dark on a bright accent
    const probe = document.createElement("span"); probe.style.display = "none"; stage.append(probe);
    const rgb = (v) => { probe.style.color = v; return (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const inkDark = lum(rgb("var(--x-ink)")) < lum(rgb("var(--x-ground)"));
    probe.remove();
    const DARK = inkDark ? "var(--x-ink)" : "var(--x-ground)", LIGHT = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const layer = document.createElement("div");
    layer.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden;visibility:hidden;background:color-mix(in srgb, ${DARK} 95%, ${LIGHT})`;
    const row = document.createElement("div");
    row.style.cssText = "position:absolute;left:0;right:0;top:50%;display:flex;justify-content:center;align-items:center;white-space:pre";
    row.dir = ML.ARABIC.test(text) ? "rtl" : "ltr";
    layer.append(row);
    stage.append(layer);
    const lk = scene.getAttribute("data-look"); if (lk) layer.setAttribute("data-look", lk); // a scene's own look reaches the layer on the stage
    // one span per letter (an Arabic word stays one piece), each with its smear copies behind
    const pieces = [];
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { const sp = document.createElement("span"); sp.textContent = " "; sp.style.display = "inline-block"; sp.style.whiteSpace = "pre"; row.append(sp); continue; }
      const units = ML.ARABIC.test(part) ? [part] : Array.from(part);
      for (const u of units) {
        const s = document.createElement("span");
        s.style.cssText = "position:relative;display:inline-block";
        const main = document.createElement("span");
        main.textContent = u;
        main.style.cssText = "position:relative;display:inline-block;color:" + LIGHT;
        const ghosts = Array.from({ length: Math.round(ML.clamp(+p.smear, 0, 16)) }, () => {
          const g = document.createElement("span");
          g.textContent = u;
          g.setAttribute("aria-hidden", "true");
          g.style.cssText = "position:absolute;left:0;top:0;color:" + LIGHT;
          s.append(g);
          return g;
        });
        s.append(main);
        row.append(s);
        pieces.push({ s, ghosts });
      }
    }
    // giant: cap height ~40 % of the frame's height, then fitted to the width
    row.style.font = `var(--x-head-weight) ${((H * 0.4) / 0.72).toFixed(1)}px/1 var(--x-head-font)`;
    row.style.letterSpacing = "0";
    const r = document.createRange(); r.selectNodeContents(row);
    const kk = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const w = r.getBoundingClientRect().width / kk;
    if (w > W * 0.92) row.style.fontSize = (((H * 0.4) / 0.72) * (W * 0.92) / w).toFixed(1) + "px";
    const lh = row.offsetHeight;
    row.style.marginTop = (-lh / 2).toFixed(1) + "px";
    // the fall: from fully above the frame to fully below, ~3000 px/s on a 1080-high frame
    const v = 3000 * (H / 1080), span = H / 2 + lh / 2 + lh * 0.2, travel = 2 * span, flight = travel / v;
    const down = p.direction !== "up" ? 1 : -1;
    const st = Math.min(ML.clamp(+p.stagger || 0.03, 0.01, 0.08), Math.max(0.01, (0.76 - flight) / Math.max(1, pieces.length - 1)));
    const step = v / 30; // travel in one frame: the smear's length
    ctx.sfx(at, "whoosh.heavy", 0.5);
    ctx.sfx(at, "hit", 0.25);
    // a piece's explicit visibility beats a hidden parent: a layer that is off is off by display, on any seek
    const showLayer = (on) => { layer.style.visibility = on ? "visible" : "hidden"; layer.style.display = on ? "" : "none"; };
    return {
      draw(t) {
        scene.style.visibility = t >= at ? "hidden" : "";
        const on = t >= at && t < ctx.end;
        showLayer(on);
        if (!on) return;
        pieces.forEach((q, i) => {
          const t0 = at + 0.04 + i * st;
          const u = ML.lin(t, t0, t0 + flight);
          const y = down * (-span + travel * u);
          const moving = u > 0 && u < 1;
          q.s.style.translate = `0 ${y.toFixed(2)}px`;
          q.s.style.visibility = moving ? "visible" : "hidden";
          q.ghosts.forEach((g, j) => {
            const kj = (j + 1) / (q.ghosts.length + 1);
            g.style.translate = `0 ${(-down * step * kj).toFixed(2)}px`;
            g.style.opacity = (0.45 * (1 - kj)).toFixed(4);
          });
        });
      },
    };
  },
});
