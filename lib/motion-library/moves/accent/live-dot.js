// Live status dot: a small glowing dot (or square) beside a status label that breathes, blinks or pings to say
// something is live. Ported from the MengTo/Skills web-design demos: a 6 px accent circle with box-shadow
// 0 0 8px accent/.6–.8; Tailwind animate-pulse = opacity 1 → .5 → 1 over 2 s cubic-bezier(.4,0,.6,1) (breathe);
// animate-ping = a copy behind scaling 1 → 2 while opacity .75 → 0 on cubic-bezier(0,0,.2,1) (ping); the studio
// engine's alert blink = opacity → 0.2, hard (blink); the editorial-tech diagnostics strip where the label pulses too
// (text-pulse); and the static brand dot with a wide glow. With `label` the status text takes the source's treatment:
// accent colour with a soft accent drop-shadow. Sizes are in px at a 12 px label and scale with the target's type.
// Source: MengTo/Skills web-design/corner-lasers + blue-cloudy-clean-modern + high-contrast-skeuomorphic-clean +
// company-logos (MIT), MotionGX lib/studio-engine/assets/scenes.js (S.notice, S.livecheck).
ML.define({
  id: "accent.live-dot",
  category: "accent",
  name: "Live status dot",
  does: "A tiny glowing dot beside a status label breathes, blinks or pings to say something is live.",
  says: ["time", "tech", "trust", "ambient", "urgency"],
  energy: 1,
  targets: ["label", "shape", "number"],
  duration: [1, 30],
  params: {
    style: { type: "choice", options: ["breathe", "blink", "ping", "text-pulse", "static"], default: "breathe" },
    shape: { type: "choice", options: ["dot", "square"], default: "dot" },
    size: { type: "number", range: [4, 10], default: 6, unit: "px" },
    period: { type: "number", range: [0.3, 3], default: 1.5, unit: "s" },
    colour: { type: "choice", options: ["accent", "success", "red"], default: "accent" },
    label: { type: "bool", default: true },
  },
  pairs: ["data.ticker-count", "ui.status-pill"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/corner-lasers", license: "MIT", note: "with blue-cloudy-clean-modern, high-contrast-skeuomorphic-clean, company-logos and MotionGX studio-engine S.notice" },
  setup(ctx) {
    const { p, at, end, f, stage, el } = ctx;
    const host = ctx.scene || stage;
    const col = p.colour === "success" ? "var(--x-good)" : p.colour === "red" ? "var(--x-bad)" : "var(--x-accent)";
    const glow = (pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
    // where the dot sits: at the start of the target's text (inline, so it follows the line), else alone in the frame
    let anchor = el && el !== stage ? el : null;
    let fs = 22 * (Math.min(f.W, f.H) / 1080);
    const wrap = document.createElement("span");
    if (anchor && !(anchor instanceof SVGElement)) {
      fs = parseFloat(getComputedStyle(anchor).fontSize) || fs;
      wrap.style.cssText = "display:inline-block;position:relative;vertical-align:middle;margin-inline-end:0.6em;";
      anchor.prepend(wrap);
    } else {
      const b = anchor ? ctx.box(anchor) : { x: f.pic.x + f.pic.w / 2, y: f.pic.y + f.pic.h / 2, w: 0, h: 0 };
      wrap.style.cssText = `position:absolute;left:${b.x + (anchor ? -fs : b.w / 2)}px;top:${b.y + b.h / 2}px;translate:-50% -50%;z-index:6;`;
      host.append(wrap);
      anchor = null;
    }
    const px = Math.max(4, (p.size * fs) / 12);
    wrap.style.width = wrap.style.height = `${px}px`;
    wrap.style.pointerEvents = "none";
    const radius = p.shape === "square" ? `${Math.max(1, px * 0.15)}px` : "50%";
    const dot = document.createElement("span");
    dot.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:${col};`;
    const ring = document.createElement("span");
    ring.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:${col};opacity:0;`;
    wrap.append(ring, dot);
    const glowStatic = p.style === "static" ? `0 0 ${px * 2.6}px ${glow(70)}` : `0 0 ${px * 1.35}px ${glow(70)}`;
    dot.style.boxShadow = glowStatic;
    // the status text's treatment
    const labelEl = anchor && p.label ? anchor : null;
    if (labelEl) { labelEl.style.color = col; labelEl.style.textShadow = `0 0 ${fs * 0.6}px ${glow(40)}`; }

    const pulseCurve = ML.bezier(0.4, 0, 0.6, 1), pingCurve = ML.bezier(0, 0, 0.2, 1);
    const P = p.period;
    // blink keeps the alert's beat: a sound on the first few blinks
    if (p.style === "blink") for (let i = 0; i < 3; i++) ctx.sfx(at + 0.25 + i * P, "blip", 0.15);
    else ctx.sfx(at + 0.1, "blip", 0.15);
    return {
      draw(t) {
        const r = t - at;
        const leave = ML.lin(t, end - 0.25, end);
        const on = r >= 0 && leave < 1;
        wrap.style.visibility = on ? "visible" : "hidden";
        if (labelEl) labelEl.style.opacity = "";
        if (!on) return;
        const enter = ML.back(r, 0, 0.3, 2);
        wrap.style.scale = String(Math.max(0, enter * (1 - leave)).toFixed(4));
        const ph = Math.max(0, r - 0.3) / P, u = ph - Math.floor(ph);
        let o = 1, s = 1, ringO = 0, ringS = 1;
        if (p.style === "breathe" || p.style === "text-pulse") {
          // 1 → .5 → 1 on the tailwind pulse curve; the dot also swells a touch
          const half = u < 0.5 ? pulseCurve(u * 2) : 1 - pulseCurve((u - 0.5) * 2);
          o = 1 - 0.5 * half; s = 1 - 0.12 * half;
        } else if (p.style === "blink") {
          o = u < 0.5 ? 1 : 0.2;
        } else if (p.style === "ping") {
          const v = pingCurve(u);
          ringS = 1 + v; ringO = 0.75 * (1 - v);
        }
        if (r < 0.3) { o = 1; s = 1; ringO = 0; }
        dot.style.opacity = o.toFixed(3);
        dot.style.scale = s.toFixed(4);
        ring.style.opacity = ringO.toFixed(3);
        ring.style.scale = ringS.toFixed(4);
        if (labelEl && p.style === "text-pulse") {
          // the label breathes on a slower, softer cycle (the diagnostics strip's 3 s ease-in-out)
          const v = Math.max(0, r - 0.3) / (P * 2), w = 0.5 - 0.5 * Math.cos((v - Math.floor(v)) * Math.PI * 2);
          labelEl.style.opacity = (1 - 0.4 * w).toFixed(3);
        }
      },
    };
  },
});
