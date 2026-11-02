// Letter knockout: an accent ball (about the letter's x-height, ~60 px on a 100 px word) flies in on an arc and lands
// in one letter's slot in 0.3 s; on impact the letter turns −30° and flies up and out under gravity (0.5 s, fading),
// the ball squashes then settles in the slot — or turns into an icon — and the neighbouring letters jolt 4 px away.
// Letters are split, so Arabic (whose letters join) is not offered this move.
// Source: prompt-motion:codestackr-i-keep-seeing-all (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.letter-knockout",
  category: "text-emphasis",
  name: "A ball knocks a letter out of the word",
  does: "An accent ball flies in and knocks one letter out, taking its place in the word.",
  says: ["playful", "change", "energy"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [0.8, 2],
  params: {
    letter: { type: "number", range: [0, 12], default: 1 },
    replacement: { type: "choice", options: ["ball", "icon"], default: "ball" },
    icon: { type: "choice", options: ["check", "star", "play"], default: "check" },
    from: { type: "choice", options: ["start", "end"], default: "start" },
    flight: { type: "number", range: [0.2, 0.5], default: 0.3, unit: "s" },
    pick: { type: "choice", options: ["longest", "first", "last"], default: "longest" },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.punchline", "text-emphasis.squash-stretch"],
  avoid: ["luxury", "calm", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:codestackr-i-keep-seeing-all", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, stage } = ctx;
    if (!el) return null;
    const VARS = ["accent", "accent-2", "accent-ink", "ink", "dim", "ground", "panel", "panel-2", "good", "bad", "line", "ring"];
    const col = (v, d) => { v = String(v || d).trim(); if (v.startsWith("var(")) return v; if (v.startsWith("--")) return `var(${v})`; v = v.replace(/^x-/, ""); return `var(--x-${VARS.includes(v) ? v : d})`; };
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")].filter((w) => w.querySelector(".ml-c"));
    if (!words.length) return null;
    const isL = (c) => /[\p{L}\p{N}]/u.test(c.textContent);
    const count = (w) => [...w.querySelectorAll(".ml-c")].filter(isL).length;
    const word = p.pick === "first" ? words[0] : p.pick === "last" ? words[words.length - 1] : words.reduce((a, b) => (count(b) > count(a) ? b : a));
    const all = [...word.querySelectorAll(".ml-c")];
    const ls = all.filter(isL);
    if (!ls.length) return null;
    const i0 = Math.max(0, Math.min(ls.length - 1, Math.round(p.letter)));
    const L = ls[i0], idx = all.indexOf(L);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const u = fs / 72;
    // where the ball sits: the letter's slot, centred on the x-height (baseline measured with a zero-height probe)
    const lb = ctx.box(L);
    const probe = document.createElement("span");
    Object.assign(probe.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" });
    L.append(probe);
    const base = ctx.box(probe).y;
    probe.remove();
    const d = Math.max(0.42 * fs, Math.min(0.62 * fs, lb.w * 1.1));
    const cx = lb.x + lb.w / 2, cy = base - d / 2;
    const H = stage.offsetHeight || 1920, SW = stage.offsetWidth || 1080;
    const side = p.from === "end" ? 1 : -1;
    const sx = Math.max(-d, Math.min(SW + d, cx + side * Math.max(4 * fs, SW * 0.32))), sy = cy - Math.max(2.4 * fs, H * 0.1);
    const c = col(p.colour, "accent");
    const layer = document.createElement("div");
    Object.assign(layer.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "6" });
    (ctx.scene || stage).append(layer);
    const ball = document.createElement("div");
    Object.assign(ball.style, { position: "absolute", left: "0", top: "0", width: d + "px", height: d + "px", borderRadius: "50%", background: c, boxShadow: `0 ${(6 * u).toFixed(1)}px ${(16 * u).toFixed(1)}px -${(4 * u).toFixed(1)}px color-mix(in srgb, ${c} 45%, transparent)`, display: "grid", placeItems: "center", transformOrigin: "50% 100%" });
    layer.append(ball);
    let icon = null;
    if (p.replacement === "icon") {
      icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      Object.assign(icon.style, { width: "62%", height: "62%", overflow: "visible" });
      icon.innerHTML = p.icon === "star" ? `<path d="M12 2.5 L14.8 8.6 L21.4 9.3 L16.4 13.7 L17.9 20.3 L12 16.9 L6.1 20.3 L7.6 13.7 L2.6 9.3 L9.2 8.6 Z" fill="var(--x-accent-ink)"/>`
        : p.icon === "play" ? `<path d="M8 5 L19 12 L8 19 Z" fill="var(--x-accent-ink)"/>`
        : `<path d="M5 12.5 L10 17.5 L19.5 7" fill="none" stroke="var(--x-accent-ink)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1"/>`;
      ball.append(icon);
    }
    L.style.transformOrigin = "50% 60%";
    const neigh = all.map((c2, j) => ({ c: c2, s: Math.sign(j - idx) / Math.max(1, Math.abs(j - idx)) })).filter((x) => x.c !== L);
    const tHit = at + p.flight;
    // the knocked letter: thrown away from the ball's path, up, under gravity
    const g = 4200 * (H / 1920), vx = -side * 520 * u, vy = -1500 * (H / 1920);
    ctx.sfx(at, "whoosh.soft", 0.25);
    ctx.sfx(tHit, "hit", 0.5);
    if (icon) ctx.sfx(tHit + 0.35, "pop.soft", 0.3);
    return {
      draw(t) {
        // the ball on its arc, then sitting
        const f = ML.lin(t, at, tHit);
        const x = sx + (cx - sx) * f, y = sy + (cy - sy) * f - Math.sin(Math.PI * f) * 1.2 * fs * (f < 1 ? 1 : 0);
        ball.style.opacity = t < at ? "0" : "1";
        ball.style.translate = `${(x - d / 2).toFixed(2)}px ${(y - d / 2).toFixed(2)}px`;
        const sq = t < tHit ? 0 : Math.exp(-(t - tHit) / 0.09) * Math.cos((t - tHit) * 30);
        ball.style.scale = t < tHit ? "1" : `${(1 + 0.22 * sq).toFixed(4)} ${(1 - 0.28 * sq).toFixed(4)}`;
        ball.style.rotate = t < tHit ? `${(f * 300 * -side).toFixed(1)}deg` : "0deg";
        if (icon) {
          const io = ML.out(t, tHit + 0.3, tHit + 0.5);
          icon.style.opacity = io.toFixed(4);
          icon.style.scale = (0.4 + 0.6 * io).toFixed(4);
          const path = icon.querySelector("path");
          if (p.icon === "check") path.style.strokeDashoffset = (1 - io).toFixed(4);
        }
        // the letter knocked out
        const k = Math.max(0, t - tHit);
        if (t < tHit) { L.style.translate = "none"; L.style.rotate = "none"; L.style.opacity = "1"; }
        else {
          L.style.translate = `${(vx * k).toFixed(2)}px ${(vy * k + 0.5 * g * k * k).toFixed(2)}px`;
          L.style.rotate = `${(-30 - 260 * k * -side).toFixed(2)}deg`;
          L.style.opacity = (1 - ML.lin(t, tHit + 0.3, tHit + 0.5)).toFixed(4);
        }
        // the neighbours jolt
        const j = t < tHit ? 0 : Math.exp(-(t - tHit) / 0.08) * Math.sin(Math.min(Math.PI, (t - tHit) * 40));
        for (const n of neigh) n.c.style.translate = j ? `${(n.s * 4 * u * j).toFixed(2)}px 0` : "none";
      },
    };
  },
});
