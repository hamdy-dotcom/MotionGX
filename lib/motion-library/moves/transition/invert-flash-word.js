// Invert flash word: a hard cut to an off-white plate with a soft dark vignette, one enormous word in a heavy slab
// serif (cap height ~60 % of the frame, fitted to its width), black, centred, and a small mono caption in the lower
// start corner. It holds (0.8 s by default) drifting in scale 1 -> 1.03. Out: the plate cuts to black, the word turns
// white and smears to the end side +80 px under a horizontal-only blur (SVG feGaussianBlur stdDeviation "12 0") over
// 0.2 s, then collapses (scaleY -> 0), still smeared so the glyphs run together, into a hairline that dies. "white-on-black" starts inverted and flips to light on
// the out. Exits: smear then collapse, smear only (the word streaks away), collapse only. The word is the longest word
// of the target (Arabic words stay whole), or the `word` param.
// Colours from the look: "black" and "white" are its ink and ground (darker one black), off-white the white with a touch
// of black. The face is the look's serif (slab weight) or its headline face.
// Source: prompt-motion reflex-cloud-this-is-legit-insane (reference only: our own rebuild).
ML.define({
  id: "transition.invert-flash-word",
  category: "transition",
  name: "Invert flash word",
  does: "The frame inverts to white with one enormous black word filling it, then inverts back as the word smears sideways and collapses to a line.",
  says: ["energy", "result", "urgency"],
  energy: 4,
  targets: ["word", "scene"],
  duration: [0.6, 1.75],
  params: {
    polarity: { type: "choice", options: ["black-on-white", "white-on-black"], default: "black-on-white" },
    exit: { type: "choice", options: ["smear-collapse", "smear", "collapse"], default: "smear-collapse" },
    hold: { type: "number", range: [0.4, 1.2], default: 0.8, unit: "s" },
    face: { type: "choice", options: ["serif", "head"], default: "serif" },
    word: { type: "text", default: "" },
    caption: { type: "bool", default: true },
  },
  pairs: ["transition.hard-cut", "transition.collapse-to-line", "transition.flash-cut"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:reflex-cloud-this-is-legit-insane", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = f.W, H = f.H, k = Math.min(W, H) / 1080, rtl = !!ctx.rtl;
    const own = ctx.el && ctx.el !== stage && ctx.el !== scene ? ctx.el : null;
    const src = own || scene.querySelector(".ml-title, .ml-hero, [data-slot-sample='headline']");
    const full = ((src && src.textContent) || "").trim().replace(/\s+/g, " ");
    const words = full.split(" ").map((w) => w.replace(/[.,،؛؟?!…:«»"'()]/g, "")).filter(Boolean);
    const word = String(p.word || "").trim() || words.reduce((a, b) => (Array.from(b).length > Array.from(a).length ? b : a), "");
    if (!word) return null;
    const arabic = ML.ARABIC.test(word);
    // the two poles of the look, whichever way round it is: never accent-ink, which is dark on a bright accent
    const probe = document.createElement("span"); probe.style.display = "none"; stage.append(probe);
    const rgb = (v) => { probe.style.color = v; return (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const inkDark = lum(rgb("var(--x-ink)")) < lum(rgb("var(--x-ground)"));
    probe.remove();
    const DARK = inkDark ? "var(--x-ink)" : "var(--x-ground)", LIGHT = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const BLACK = DARK, WHITE = LIGHT, OFF = `color-mix(in srgb, ${LIGHT} 93%, ${DARK})`;
    const light = p.polarity !== "white-on-black";

    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9;overflow:hidden;visibility:hidden";
    const ground = document.createElement("div");
    ground.style.cssText = "position:absolute;inset:0";
    const vig = document.createElement("div");
    vig.style.cssText = `position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, transparent 52%, color-mix(in srgb, ${BLACK} 26%, transparent) 100%)`;
    // the horizontal-only blur
    const fid = "ml-ifw-" + Math.round(ML.rnd(at * 97 + full.length, 3) * 1e9);
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    const filt = document.createElementNS(svgNS, "filter");
    filt.setAttribute("id", fid);
    filt.setAttribute("x", "-30%"); filt.setAttribute("width", "160%"); filt.setAttribute("y", "-10%"); filt.setAttribute("height", "120%");
    const gb = document.createElementNS(svgNS, "feGaussianBlur");
    gb.setAttribute("stdDeviation", "0 0");
    filt.append(gb); svg.append(filt);
    const box = document.createElement("div");
    box.style.cssText = "position:absolute;inset:0;display:grid;place-items:center";
    const wd = document.createElement("div");
    wd.textContent = word;
    const font = p.face === "head" ? "900 100px/1 var(--x-head-font)" : "700 100px/1 var(--x-serif-font)";
    wd.style.cssText = `font:${font};white-space:nowrap;letter-spacing:${arabic ? "0" : "-0.02em"};transform-origin:50% 50%`;
    box.append(wd);
    const cap = document.createElement("div");
    cap.textContent = full;
    cap.style.cssText = `position:absolute;bottom:${(f.H - f.safe.y - f.safe.h + 8).toFixed(0)}px;${rtl ? "right" : "left"}:${f.m}px;max-width:${(W * 0.6).toFixed(0)}px;font:500 ${(22 * k).toFixed(1)}px/1.3 var(--x-mono-font);letter-spacing:${arabic || rtl ? "0" : "0.08em"};text-transform:${arabic || rtl ? "none" : "uppercase"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    layer.append(svg, ground, vig, box);
    if (p.caption) layer.append(cap);
    stage.append(layer);
    const lk = scene.getAttribute("data-look"); if (lk) layer.setAttribute("data-look", lk); // a scene's own look reaches the layer on the stage
    // cap height ~60 % of the frame (cap ≈ 0.7 em), then fitted to the width
    wd.style.fontSize = ((Math.min(H, W * 1.2) * 0.6) / 0.7).toFixed(1) + "px";
    ML.fit(wd, W * 0.9);

    const hold = ML.clamp(+p.hold || 0.8, 0.4, 1.2);
    const tOut = at + hold, smear = p.exit !== "collapse", collapse = p.exit !== "smear";
    const tS = smear ? tOut + 0.2 : tOut, tC = collapse ? tS + 0.18 : tS, tGone = collapse ? tC + 0.14 : tS;
    const dir = rtl ? -1 : 1;
    ctx.sfx(at, "hit", 0.55);
    ctx.sfx(tOut, smear ? "whoosh.soft" : "snap", 0.4);
    const p2in = (x) => x * x;

    // a piece's explicit visibility beats a hidden parent: a layer that is off is off by display, on any seek
    const showLayer = (on) => { layer.style.visibility = on ? "visible" : "hidden"; layer.style.display = on ? "" : "none"; };
    return {
      draw(t) {
        scene.style.visibility = t >= at ? "hidden" : "";
        if (t >= ctx.end) { showLayer(false); return; }
        if (t < at || t >= tGone) {
          // after the line dies the plate stays inverted (the next scene cuts in over it)
          showLayer(!(t < at));
          if (t >= tGone) { ground.style.background = light ? BLACK : OFF; box.style.visibility = "hidden"; cap.style.visibility = "hidden"; vig.style.opacity = "0.6"; }
          return;
        }
        showLayer(true);
        box.style.visibility = "visible";
        const out = t >= tOut;
        // polarity: flips on the out
        const lit = out ? !light : light;
        ground.style.background = lit ? OFF : BLACK;
        wd.style.color = lit ? BLACK : WHITE;
        cap.style.color = lit ? `color-mix(in srgb, ${BLACK} 70%, transparent)` : `color-mix(in srgb, ${WHITE} 70%, transparent)`;
        cap.style.visibility = out ? "hidden" : "visible";
        vig.style.opacity = lit ? "1" : "0.6";
        // hold: a slow scale drift 1 -> 1.03
        const drift = 1 + 0.03 * ML.lin(t, at, tOut);
        let tx = 0, blur = 0, sy = 1;
        if (out && smear) { const u = p2in(ML.lin(t, tOut, tS)); tx = 80 * k * dir * u; blur = 12 * ML.out(t, tOut, tS); }
        if (out && smear && !collapse) { const u = ML.lin(t, tOut, tS); wd.style.opacity = (1 - u * u).toFixed(4); } else wd.style.opacity = "1";
        if (out && collapse && t >= tS) {
          const u = ML.expo(t, tS, tC);
          const hPx = wd.offsetHeight || 1, line = Math.max(2, 3 * k) / hPx;
          sy = 1 - (1 - line) * u;
          if (t >= tC) wd.style.opacity = (1 - ML.lin(t, tC, tGone)).toFixed(4);
          if (smear) { tx = 80 * k * dir; blur = 12; }
        }
        gb.setAttribute("stdDeviation", `${blur.toFixed(2)} 0`);
        wd.style.filter = blur > 0.05 ? `url(#${fid})` : "none";
        wd.style.translate = tx ? `${tx.toFixed(2)}px 0` : "";
        wd.style.scale = `${drift.toFixed(4)} ${(drift * sy).toFixed(4)}`;
      },
    };
  },
});
