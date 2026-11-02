// Thinking orb, "solving": a 3x3 block of dots shuffles one row or one column a step at a time on a steady beat, like a
// puzzle cube being turned; each turn eases (power2.inOut), holds, and the twelve-turn sequence undoes itself so the
// block comes back solved and loops. The dot that wraps round the edge swings behind on a short arc (smaller, fainter).
// Common to every thinking orb: monochrome dots painted as canvas arcs on a transparent 2D canvas (no WebGL, no
// filters); two tuned presets, 20 (inline beside status text) and 64 (avatar / empty-state scale), each with its own
// dot count, dot size and speed — never one scaled into the other; theme "light" = ink dots for a light surface, "dark"
// = light dots for a dark one (colours from the look); one shared clock (scene time) so several orbs stay in phase;
// speed 0.75–1.25; "paused" freezes the frame; it fades away at the end, where the result takes over. On a label it
// sits inline before the text; on a shape it fills it; with no target it builds a status chip (orb + status text) on
// the stage. Every frame is painted from t alone.
// Source: MengTo/Skills web-design/thinking-orbs (MIT; the ThinkingOrb contract — states, presets, theme, speed,
// pause), painters rebuilt as our own code.
ML.define({
  id: "ui.thinking-orb-cube",
  category: "ui",
  name: "Thinking orb: solving cube",
  does: "A 3x3 block of dots shuffles row by row and column by column like a puzzle being solved.",
  says: ["tech", "precision", "time"],
  energy: 2,
  targets: ["shape", "label"],
  duration: [1, 6],
  params: {
    size: {type: "choice", options: ["20", "64"], default: "64"},
    theme: {type: "choice", options: ["light", "dark"], default: "light"},
    speed: {type: "number", range: [0.75, 1.25], default: 1},
    paused: {type: "bool", default: false},
    status: {type: "text", default: ""},
  },
  pairs: ["ui.live-pill-dot", "ui.skeleton-shimmer"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "MengTo/Skills:web-design/thinking-orbs", license: "MIT", note: "state, presets and canvas contract from the skill; the painter is our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage, f } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const rtlDir = rtl ? -1 : 1;
    const PRESETS = { "20": { gap: 5.6, r: 1.55, beat: 0.62, move: 0.36 }, "64": { gap: 17, r: 4.4, beat: 0.5, move: 0.3 } };
    const P = PRESETS[String(p.size)] || PRESETS["64"], S = Number(p.size) === 20 ? 20 : 64;
    // the turns: [axis, line, dir]; the second half undoes the first in reverse, so the block returns solved and loops
    // (every dot looks alike, so only the line that turns and its direction matter)
    const half = [["r", 0, 1], ["c", 1, 1], ["r", 2, -1], ["c", 2, -1], ["r", 1, 1], ["c", 0, 1]];
    const turns = half.concat(half.slice().reverse().map(([a, l, d]) => [a, l, -d]));
    const paint = (g, T, P, S) => {
      const n = turns.length, k = Math.floor(T / P.beat), i = ((k % n) + n) % n, u = (T - k * P.beat) / P.move;
      const e = u >= 1 ? 1 : u <= 0 ? 0 : u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // power2.inOut
      const [a, l, d] = turns[i], c = S / 2, G = P.gap;
      const dots = [];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const moving = (a === "r" && y === l) || (a === "c" && x === l);
        let px = x, py = y, z = 0;
        if (moving) {
          const along = a === "r" ? x : y, to = along + d, wraps = to < 0 || to > 2;
          if (!wraps) { if (a === "r") px = x + d * e; else py = y + d * e; }
          else {
            // swings round the back: travels the long way across, lifted off the line and pushed back
            const dest = (to + 3) % 3, pos = along + (dest - along) * e, lift = Math.sin(Math.PI * e) * 0.55;
            if (a === "r") { px = pos; py = y - lift; } else { py = pos; px = x + lift; }
            z = -Math.sin(Math.PI * e);
          }
        }
        dots.push({ x: c + (px - 1) * G, y: c + (py - 1) * G, z, hot: moving && e > 0 && e < 1 });
      }
      dots.sort((p, q) => p.z - q.z);
      for (const p of dots) {
        g.globalAlpha = (p.hot ? 1 : 0.78) * (1 + p.z * 0.6);
        g.beginPath(); g.arc(p.x, p.y, P.r * (1 + p.z * 0.35), 0, Math.PI * 2); g.fill();
      }
    };
    // where it sits and how big it shows (the preset's design is kept; only the canvas is sized to its place)
    let wrap, D;
    const isLabel = el && !/^(IMG|CANVAS|SVG|VIDEO)$/.test(el.tagName) && el.childElementCount === 0 && (el.textContent || "").trim().length > 0;
    if (el && isLabel) {
      const fs = parseFloat(getComputedStyle(el).fontSize) || 24;
      D = S === 20 ? fs * 1.25 : fs * 2.6;
      wrap = mk("span", `display:inline-block;vertical-align:middle;width:${D}px;height:${D}px;margin-inline-end:${(fs * 0.5).toFixed(1)}px`);
      el.prepend(wrap);
    } else if (el) {
      const r = ctx.box(el), side = Math.max(8, Math.min(r.w, r.h));
      D = S === 20 ? Math.min(side, Math.min(f.W, f.H) * 0.05) : side * 0.9;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      wrap = mk("span", `position:absolute;left:50%;top:50%;width:${D}px;height:${D}px;margin:${-D / 2}px 0 0 ${-D / 2}px;pointer-events:none`, el);
    } else {
      // no target: a status chip on the stage, centred on the picture region
      const u = Math.min(f.W, f.H) / 1080, big = S === 64, fs = 34 * u;
      D = big ? 150 * u : fs * 1.3;
      const chip = mk("div", `position:absolute;left:${f.pic.x + f.pic.w / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:-50% -50%;display:flex;flex-direction:${big ? "column" : "row"};align-items:center;gap:${(big ? 26 : 16) * u}px;padding:${(big ? 44 : 20) * u}px ${(big ? 56 : 30) * u}px;border-radius:${big ? "var(--x-radius)" : "var(--x-radius-s)"};background:${p.theme === "dark" ? "var(--x-ink)" : "var(--x-panel)"};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);z-index:20;white-space:nowrap`, stage);
      wrap = mk("span", `display:block;width:${D}px;height:${D}px;flex:none`, chip);
      mk("span", `font:500 ${fs}px var(--x-body-font);color:${p.theme === "dark" ? "var(--x-ground)" : "var(--x-dim)"}`, chip, p.status || (rtl ? "بيحلّها…" : "Solving…"));
      wrap = Object.assign(wrap, { chip });
    }
    const host = wrap.chip || wrap;
    host.style.opacity = "0";
    const cv = mk("canvas", "display:block;width:100%;height:100%", wrap);
    const px = Math.max(16, Math.ceil(D * 2));
    cv.width = px; cv.height = px;
    const g = cv.getContext("2d");
    // the dot colour from the look: ink dots on a light surface, light dots on a dark one
    const probe = mk("span", `color:${p.theme === "dark" ? "var(--x-accent-ink)" : "var(--x-ink)"}`, wrap);
    const ink = getComputedStyle(probe).color; probe.remove();
    ctx.sfx(at, "blip", 0.15);
    const speed = ML.clamp(+p.speed || 1, 0.5, 1.5);
    return {
      draw(t) {
        const o = ML.ease(t, at, at + 0.25) * (1 - ML.ease(t, end - 0.35, end - 0.05));
        host.style.opacity = o.toFixed(4);
        host.style.visibility = o > 0.001 ? "visible" : "hidden";
        // one clock for every orb: scene time (paused holds the frame it starts on)
        const T = (p.paused ? Math.max(0, at - ctx.from) : Math.max(0, t - ctx.from)) * speed;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, px, px);
        if (o <= 0.001) return;
        g.setTransform(px / S, 0, 0, px / S, 0, 0);
        g.fillStyle = ink;
        paint(g, T, P, S);
        g.globalAlpha = 1;
      },
    };
  },
});
