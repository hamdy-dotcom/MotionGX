// Blur-retire handoff: the outgoing layer retires — opacity 1 -> 0 over .68 s while it sinks 0 -> 8vh, shrinks
// 1 -> .98 and blurs 0 -> 18 px over .78 s, all on cubic-bezier(.16,1,.3,1), kept on top ~820 ms then removed — and the
// next scene's pieces overlap from 0: each rises from its anchored edge (translateY 13% from the foot, or x +-11% from
// its side) with opacity over 1.2 s and transform over 1.5 s on the same ease, 90 ms apart. The world keeps moving
// through the cut (a slow drift of the ground's light), so continuity comes from the world, not the content.
// Source: MengTo/Skills build-threejs-scroll-worlds demo (MIT: .fg-retiring / .fg-active and retire()).
ML.define({
  id: "transition.blur-retire-handoff",
  category: "transition",
  name: "Blur-retire handoff",
  does: "The outgoing layer sinks, shrinks a hair and dissolves into blur while the next scene's pieces rise into place.",
  says: ["transition", "calm", "story"],
  energy: 2,
  targets: ["scene", "stage"],
  duration: [0.8, 1.6],
  params: {
    blur: { type: "number", range: [8, 24], default: 18, unit: "px" },
    sink: { type: "number", range: [4, 10], default: 8, unit: "vh" },
    stagger: { type: "number", range: [0.05, 0.15], default: 0.09, unit: "s" },
    anchor: { type: "choice", options: ["bottom", "side"], default: "bottom" },
    world: { type: "bool", default: true },
    next: { type: "text", default: "" },
    next_label: { type: "text", default: "" },
    next_sub: { type: "text", default: "" },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT", note: "fg-retiring / fg-active timings" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const scene = ctx.scene || stage;
    const W = scene.offsetWidth || f.W, H = scene.offsetHeight || f.H, k = Math.min(W, H) / 1080;
    const eo = ML.bezier(0.16, 1, 0.3, 1);
    const z = ML.clamp((ctx.end - at) / 1.7, 0.4, 1); // the whole handoff squeezes to fit before ctx.end
    const blur = ML.clamp(p.blur, 8, 24), sink = (ML.clamp(p.sink, 4, 10) * H) / 100, stag = ML.clamp(p.stagger, 0.05, 0.15);
    // the world: the ground's light drifting slowly the whole time, under both scenes
    const world = document.createElement("div");
    world.style.cssText = "position:absolute;inset:-20%;pointer-events:none;z-index:0;" +
      "background:radial-gradient(40% 32% at 30% 30%, color-mix(in srgb, var(--x-glow-1) calc(var(--x-glow-o) * 40%), transparent), transparent 70%)," +
      "radial-gradient(36% 30% at 72% 68%, color-mix(in srgb, var(--x-glow-2) calc(var(--x-glow-o) * 36%), transparent), transparent 70%)";
    if (p.world) scene.prepend(world);
    // the outgoing layer: the scene's own content
    const out = document.createElement("div");
    out.style.cssText = "position:absolute;inset:0;z-index:2;transform-origin:50% 100%";
    [...scene.children].filter((c) => c !== world).forEach((c) => out.append(c));
    scene.append(out);
    // the next scene: label, title, a line — anchored from the foot (or from the reading side)
    const inc = document.createElement("div");
    inc.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
    inc.style.cssText = `position:absolute;left:${f.safe.x}px;width:${f.safe.w}px;bottom:${(H - f.safe.y - f.safe.h).toFixed(0)}px;z-index:1;display:flex;flex-direction:column;gap:${(22 * k).toFixed(0)}px;align-items:flex-start;text-align:start;pointer-events:none`;
    scene.append(inc);
    const head = out.querySelector(".ml-title"), sub = out.querySelector(".ml-sub"), lab = out.querySelector(".ml-label");
    const fs = Math.min(parseFloat(getComputedStyle(scene).getPropertyValue("--x-head-size")) || 104, W * 0.085);
    const mk = (cls, text, css) => { if (!text) return null; const d = document.createElement("div"); d.className = cls; d.textContent = text; d.style.cssText = css; inc.append(d); return d; };
    const pieces = [
      mk("ml-label", (p.next_label || "").trim() || (lab ? lab.textContent.trim() : ""), ""),
      mk("", (p.next || "").trim() || (sub ? sub.textContent.trim() : head ? head.textContent.trim() : ""), `font:var(--x-head-weight) ${fs.toFixed(1)}px/var(--x-head-line) var(--x-head-font);letter-spacing:${ctx.rtl ? "0" : "var(--x-head-track)"};text-transform:var(--x-head-case);color:var(--x-ink);text-wrap:balance`),
      mk("ml-sub", (p.next_sub || "").trim() || (head ? head.textContent.trim() : ""), ""),
    ].filter(Boolean);
    const side = p.anchor === "side", sgn = ctx.rtl ? 1 : -1; // pieces come in from the reading side
    ctx.sfx(at + 0.1, "whoosh.soft", 0.18);
    return {
      draw(t) {
        // outgoing: retires over .78 s, kept on top until ~820 ms, then gone
        const o = eo(ML.lin(t, at, at + 0.68 * z)), m = eo(ML.lin(t, at, at + 0.78 * z));
        out.style.visibility = t >= at + 0.82 * z ? "hidden" : "visible";
        out.style.opacity = (1 - o).toFixed(4);
        out.style.transform = m > 0 ? `translateY(${(m * sink).toFixed(2)}px) scale(${(1 - 0.02 * m).toFixed(4)})` : "none";
        out.style.filter = m > 0.002 ? `blur(${(m * blur).toFixed(2)}px)` : "none";
        // incoming: overlapping from the start, staggered
        inc.style.visibility = t < at ? "hidden" : "visible";
        pieces.forEach((el, i) => {
          const t0 = at + i * stag * z, a = eo(ML.lin(t, t0, t0 + 1.2 * z)), b = eo(ML.lin(t, t0, t0 + 1.5 * z));
          el.style.opacity = a.toFixed(4);
          el.style.transform = side ? `translateX(${(sgn * 11 * (1 - b)).toFixed(3)}%)` : `translateY(${(13 * (1 - b)).toFixed(3)}%)`;
        });
        // the world keeps moving through the cut
        if (p.world) world.style.transform = `translate(${(Math.sin(t * 0.35) * 30 * k).toFixed(2)}px, ${(Math.sin(t * 0.23 + 1) * 60 * k).toFixed(2)}px)`;
      },
    };
  },
});
