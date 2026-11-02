// Panel track: every panel sits side by side on one long strip (N x the frame; panel k at k / N) and the camera glides
// from one to the next. Stepped (horizontal-scroll-scenes' travel()): the run splits into N dwells and N - 1 moves of
// `move` s; during a move the camera is translate3d(-(i + fe) / N * 100%, 0, 0) with fe = smoothstep(0, 1, f), and
// while it dwells it drifts 0.02 x (dw - 0.5) of a panel so a resting frame still breathes. Linear: a continuous track
// from the first panel to the last (gsap's xPercent -100 x (N - 1), ease none). Vertical: a stack, panels yPercent
// 0 -> -100 (N - 1). The dwell's drift never jumps (the source's drops 0.01 of a panel on the frame a move starts, a
// pop on a seeked render). On built panels it moves the content inside its panel, so no sliver of the next ground shows
// at a resting frame's edge; supplied panels and pictures, whose content fills them, drift with the camera. Parallax: each panel's content lags its panel by `parallax` % of the travel (the depth layer of
// the cinematic system's story stack, yPercent -16). The reading direction follows the language: Arabic tracks the
// other way. The panels are the target's [data-panel] children when the film supplies them; alone, the move builds
// them from the scene: the scene itself first, then copies of it on the look's other grounds, each numbered.
// Source: MengTo/Skills horizontal-scroll-scenes demo.html (MIT: travel(), the pan camera, the dwell drift),
// cinematic-gsap-lenis-motion-system SKILL.md and gsap SKILL.md (MIT: horizontal galleries, the vertical story stack
// with its depth layer).
ML.define({
  id: "transition.panel-track",
  category: "transition",
  name: "Panel track",
  does: "All scenes sit side by side on one long strip (or stack) and the camera glides from one to the next, resting with a slight drift.",
  says: ["flow", "story", "step", "list", "transition"],
  energy: 3,
  targets: ["scene", "stage", "card", "image"],
  duration: [0.8, 6],
  params: {
    direction: { type: "choice", options: ["reading", "ltr", "rtl", "vertical"], default: "reading" },
    panels: { type: "number", range: [2, 6], default: 3 },
    ease: { type: "choice", options: ["stepped", "linear"], default: "stepped" },
    move: { type: "number", range: [0.8, 1.4], default: 1, unit: "s" },
    drift: { type: "bool", default: true },
    parallax: { type: "number", range: [0, 24], default: 0, unit: "%" },
  },
  pairs: ["transition.whip-pan", "text-in.mask-rise"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/horizontal-scroll-scenes/demo.html", license: "MIT", note: "with cinematic-gsap-lenis-motion-system/SKILL.md and gsap/SKILL.md (MIT)" },
  setup(ctx) {
    const { p, at, end, stage, el } = ctx;
    const sceneScope = !el || el === stage || ctx.el === ctx.scene;
    let view = sceneScope ? ctx.scene || stage : el;
    // a picture (no children) gets a viewport of its own box, in its place
    if (!sceneScope && !view.children.length) {
      const v = document.createElement("div");
      const cs = getComputedStyle(view);
      v.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${view.offsetWidth}px;height:${view.offsetHeight}px;border-radius:${cs.borderRadius};overflow:hidden`;
      view.replaceWith(v); v.append(view);
      view.style.borderRadius = "0";
      view = v;
    }
    const whole = view === stage || view === ctx.scene;
    const W = whole ? ctx.f.W : view.clientWidth, H = whole ? ctx.f.H : view.clientHeight;
    // a card keeps its box once its content moves onto the (absolute) strip; its inner layout goes onto each panel
    let innerCss = "";
    if (!whole) {
      const vc = getComputedStyle(view);
      if (view.children.length) innerCss = `box-sizing:border-box;padding:${vc.padding};display:${vc.display};flex-direction:${vc.flexDirection};align-items:${vc.alignItems};justify-content:${vc.justifyContent};gap:${vc.gap};grid-template-columns:${vc.gridTemplateColumns};text-align:${vc.textAlign}`;
      const ow = view.offsetWidth, oh = view.offsetHeight;
      if (vc.position === "static") view.style.position = "relative";
      view.style.boxSizing = "border-box"; view.style.width = ow + "px"; view.style.height = oh + "px"; view.style.padding = "0"; view.style.overflow = "hidden";
    } else if (view === ctx.scene) view.style.overflow = "hidden";

    const vertical = p.direction === "vertical";
    const back = p.direction === "rtl" || (p.direction === "reading" && ctx.rtl); // tracks right to left
    const authored = [...view.children].filter((c) => c.hasAttribute("data-panel"));
    const N = authored.length >= 2 ? authored.length : Math.round(ML.clamp(+p.panels || 3, 2, 6));

    const strip = document.createElement("div");
    strip.setAttribute("data-ml-track", "");
    strip.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;will-change:transform`;
    const cs = getComputedStyle(view);
    const v = (name) => cs.getPropertyValue(name).trim();
    const panelBox = (k) => {
      const d = document.createElement("div");
      const x = vertical ? 0 : (back ? -k : k) * W, y = vertical ? k * H : 0;
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${W}px;height:${H}px;overflow:hidden`;
      const inner = document.createElement("div");
      inner.style.cssText = `position:absolute;inset:0;${innerCss}`;
      d.append(inner);
      strip.append(d);
      return { box: d, inner };
    };
    const panels = [];
    if (authored.length >= 2) {
      authored.forEach((c, k) => { const pb = panelBox(k); pb.inner.append(c); panels.push(pb); });
    } else {
      // panel 0 is the target as it is; the rest are copies of it on the look's other grounds, numbered
      const first = panelBox(0);
      first.box.style.background = view === stage || view === ctx.scene ? "var(--x-ground)" : "";
      const kids = [...view.childNodes];
      const proto = document.createElement("div");
      for (const c of kids) proto.append(c.cloneNode(true));
      for (const c of kids) first.inner.append(c);
      panels.push(first);
      const grounds = [
        // the strongest change first: the ground and the panel-2 next to it are close to the same colour in most looks
        { g: v("--x-ink"), ink: v("--x-ground"), dim: `color-mix(in srgb, ${v("--x-ground")} 68%, transparent)`, panel: `color-mix(in srgb, ${v("--x-ground")} 8%, ${v("--x-ink")})` },
        { g: v("--x-accent"), ink: v("--x-accent-ink"), dim: `color-mix(in srgb, ${v("--x-accent-ink")} 72%, transparent)`, panel: `color-mix(in srgb, ${v("--x-accent-ink")} 14%, ${v("--x-accent")})`, accent: v("--x-accent-ink") },
        { g: v("--x-panel-2"), ink: v("--x-ink"), dim: v("--x-dim") },
      ];
      for (let k = 1; k < N; k++) {
        const pb = panelBox(k), gr = grounds[(k - 1) % grounds.length];
        pb.box.style.background = gr.g;
        pb.box.style.setProperty("--x-ink", gr.ink);
        pb.box.style.setProperty("--x-dim", gr.dim);
        if (gr.panel) { pb.box.style.setProperty("--x-panel", gr.panel); pb.box.style.setProperty("--x-edge-color", "transparent"); }
        if (gr.accent) pb.box.style.setProperty("--x-accent", gr.accent); // an accent mark stays visible on the accent ground
        pb.box.style.color = gr.ink;
        const copy = proto.cloneNode(true);
        for (const e of copy.querySelectorAll("[data-slot],[id]")) { e.removeAttribute("data-slot"); e.removeAttribute("id"); }
        for (const c of [...copy.childNodes]) pb.inner.append(c);
        panels.push(pb);
      }
      // each panel numbered in its corner: 01 / 03 …
      panels.forEach((pb, k) => {
        const lab = document.createElement("div");
        lab.className = "ml-label";
        lab.setAttribute("dir", "ltr");
        lab.textContent = `${String(k + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
        const m = Math.round(Math.min(W, H) * 0.045);
        // a whole-frame panel keeps its number below a phone's own buttons on 9:16
        const top = whole && ctx.f.tall ? Math.max(m, ctx.f.safe.y - m) : m;
        lab.style.cssText = `position:absolute;top:${top}px;${ctx.rtl ? "left" : "right"}:${m}px;font-size:${Math.max(12, Math.round(Math.min(W, H) * 0.02))}px;color:var(--x-dim);z-index:2`;
        pb.box.append(lab);
      });
    }
    view.append(strip);

    // the run: N dwells and N - 1 moves (travel() of the source, on seconds instead of scroll)
    const span = Math.max(0.4, end - at);
    const move = Math.min(ML.clamp(+p.move || 1, 0.8, 1.4), (span * 0.8) / (N - 1));
    const dwell = (span - (N - 1) * move) / N, cyc = dwell + move;
    const sstep = (x) => { x = ML.clamp(x); return x * x * (3 - 2 * x); };
    const par = ML.clamp(+p.parallax || 0, 0, 24) / 100;
    if (p.ease === "linear") ctx.sfx(at, "whoosh.soft", 0.35);
    else for (let i = 0; i < N - 1; i++) ctx.sfx(at + i * cyc + dwell, "whoosh.soft", 0.35);
    // the drift around panel k: 0.02 of a panel over its dwell, never past the first or the last panel's rest
    const d0 = (k) => (!p.drift || k === 0 ? 0 : k === N - 1 ? -0.02 : -0.01), d1 = (k) => (!p.drift || k === N - 1 ? 0 : k === 0 ? 0.02 : 0.01);
    const inPanel = !!p.drift && p.ease !== "linear" && whole && authored.length < 2; // the content drifts, not the camera
    const cam0 = (k) => (inPanel ? 0 : d0(k)), cam1 = (k) => (inPanel ? 0 : d1(k));
    return {
      draw(t) {
        let c;
        if (p.ease === "linear") c = (N - 1) * ML.lin(t, at, end);
        else {
          const u = ML.clamp(t - at, 0, span - 1e-5);
          const i = Math.min(N - 1, Math.floor(u / cyc)), local = u - i * cyc;
          const dw = Math.min(1, local / Math.max(1e-3, dwell));
          const f = i >= N - 1 ? 0 : ML.clamp((local - dwell) / move);
          // dwelling: from d0 to d1 of its panel; moving: from there to the next panel's d0, with no jump at either end
          const e = sstep(f);
          c = f > 0 ? i + cam1(i) + e * (1 + cam0(i + 1) - cam1(i)) : i + cam0(i) + (cam1(i) - cam0(i)) * dw;
          c = ML.clamp(c, 0, N - 1);
        }
        const sign = back ? -1 : 1;
        strip.style.transform = vertical ? `translate3d(0, ${(-c * H).toFixed(2)}px, 0)` : `translate3d(${(-sign * c * W).toFixed(2)}px, 0, 0)`;
        if (par > 0 || inPanel) panels.forEach((pb, k) => {
          const dk = inPanel ? d0(k) + (d1(k) - d0(k)) * ML.clamp((ML.clamp(t - at, 0, span) - k * cyc) / Math.max(1e-3, dwell)) : 0;
          const lag = (c - k) * par - dk;
          pb.inner.style.transform = vertical ? `translate3d(0, ${(lag * H).toFixed(2)}px, 0)` : `translate3d(${(sign * lag * W).toFixed(2)}px, 0, 0)`;
        });
      },
    };
  },
});
