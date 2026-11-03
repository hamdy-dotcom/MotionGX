// Product turntable spin: after it settles, the product turns slowly and endlessly on its vertical axis, showing every
// side. The orbit-inspect demo's idle wheel, as a closed form: left alone for IDLE_AFTER (2.2 s) the yaw velocity
// eases toward IDLE_SPIN (0.26 rad/s, one turn ~24 s) at rate 0.7·s⁻¹ — so it never starts at full speed — and the
// yaw is that velocity's integral: v·(s − (1 − e^(−ks))/k). The pitch relaxes toward its home (exp(−0.35 t)).
// The product is the target built as a real 3D slab (CSS 3D, preserve-3d): its picture on the front, a panel back,
// an extruded rounded edge of thin slices. The key light is fixed in the world (up-left of the eye): each face is lit
// by its normal against it (Lambert) and a sheen band crosses the front as it turns, so highlights travel over the
// surface. The rig is scaled so no point comes nearer than its own size (nothing above 1 under the 3D).
// Turns clockwise seen from above by default; Arabic mirrors it.
// Source: MengTo/Skills 3d/3d-orbit-inspect-demo/demo.html (MIT: PITCH0 0.72, IDLE_AFTER 2.2, IDLE_SPIN 0.26, the
// 0.7 ease and the 0.35 pitch relax); the slab and its lighting are our own code.
ML.define({
  id: "element.idle-turntable",
  category: "element",
  name: "Product turntable spin",
  does: "A product rotates slowly and continuously on its vertical axis after settling, showing every side.",
  says: ["focus", "luxury", "proof", "calm"],
  energy: 1,
  targets: ["image", "logo", "shape"],
  duration: [3, 30],
  params: {
    speed: { type: "number", range: [0.15, 0.6], default: 0.26, unit: "rad/s" },
    delay: { type: "number", range: [0, 2.5], default: 2.2, unit: "s" },
    direction: { type: "choice", options: ["cw", "ccw"], default: "cw" },
    pitch: { type: "number", range: [0, 0.72], default: 0.16, unit: "rad" },
    depth: { type: "number", range: [0.02, 0.2], default: 0.06 },
  },
  pairs: ["camera.product-orbit", "element.idle-float", "background.noise-gradient-flow"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:agent-skills/3d/3d-orbit-inspect-demo/demo.html", license: "MIT", note: "idle-spin constants and easing from updateHand(); closed form, slab and lighting are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent) => { const e = doc.createElement(tag); e.style.cssText = css; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    let b, face;
    if (el) {
      b = ctx.box(el);
      face = el.cloneNode(true);
      face.removeAttribute("data-slot"); face.removeAttribute("id");
      const cs = getComputedStyle(el);
      face.style.cssText = `${el.style.cssText};position:absolute;inset:0;width:100%;height:100%;margin:0;box-sizing:border-box;border-radius:${cs.borderRadius};object-fit:${cs.objectFit};`;
      el.style.opacity = "0"; // the slab stands in its place
    } else {
      const s = Math.min(f.pic.w, f.pic.h) * 0.55;
      b = { x: f.pic.x + (f.pic.w - s) / 2, y: f.pic.y + (f.pic.h - s) / 2, w: s, h: s };
      face = doc.createElement("div");
      face.style.cssText = "position:absolute;inset:0;border-radius:var(--x-radius);background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));";
    }
    const W = b.w, H = b.h, D = ML.clamp(Math.min(W, H) * p.depth, 6 * k, 40 * k);
    const rad = el ? getComputedStyle(el).borderRadius : "var(--x-radius)";
    // the scale that keeps every point at or under its own size: s ≤ P / (P + zmax)
    const P = Math.max(W, H) * 3.2;
    const zmax = Math.hypot(W / 2, D / 2) + (H / 2) * Math.sin(p.pitch + 0.08);
    const s0 = P / (P + zmax);
    const stage3 = mk("div", `position:absolute;left:${b.x}px;top:${b.y}px;width:${W}px;height:${H}px;perspective:${P.toFixed(0)}px;pointer-events:none;z-index:5;`, host);
    const rig = mk("div", `position:absolute;inset:0;transform-style:preserve-3d;`, stage3);
    const faceBox = (z, flip) => mk("div", `position:absolute;inset:0;border-radius:${rad};overflow:hidden;backface-visibility:hidden;transform:${flip ? "rotateY(180deg) " : ""}translateZ(${z.toFixed(2)}px);`, rig);
    // the edge: thin slices of the silhouette, shaded as the side turns to the light
    const N = Math.max(4, Math.min(24, Math.round(D / 1.6)));
    const slices = [];
    for (let i = 1; i < N; i++) slices.push(mk("div", `position:absolute;inset:0;border-radius:${rad};background:color-mix(in srgb, var(--x-ink) 70%, var(--x-panel-2));transform:translateZ(${(-D / 2 + (D * i) / N).toFixed(2)}px);`, rig));
    const front = faceBox(D / 2, false);
    front.append(face);
    const fShade = mk("div", "position:absolute;inset:0;background:var(--x-device);opacity:0;", front);
    const sheen = mk("div", "position:absolute;inset:-20% -60%;background:linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--x-panel) 55%, transparent) 50%, transparent 62%);opacity:.0;", front);
    const back = faceBox(D / 2, true);
    back.style.background = "linear-gradient(160deg, var(--x-panel), var(--x-panel-2))";
    back.style.border = "var(--x-edge) solid var(--x-edge-color)"; back.style.boxSizing = "border-box";
    mk("div", `position:absolute;left:50%;top:50%;width:${Math.min(W, H) * 0.22}px;height:${Math.min(W, H) * 0.22}px;translate:-50% -50%;border-radius:var(--x-radius);background:var(--x-accent);opacity:.85;`, back);
    const bShade = mk("div", "position:absolute;inset:0;background:var(--x-device);opacity:0;", back);
    // the key light, fixed in world space: up-left of the eye
    const L = (() => { const v = [-0.45, 0.55, 0.7], n = Math.hypot(...v); return v.map((x) => x / n); })();
    const spin = (p.direction === "ccw" ? 1 : -1) * (rtl ? -1 : 1); // CSS rotateY(+) is counter-clockwise seen from above
    const t0 = at + p.delay, kk = 0.7;
    return {
      draw(t) {
        const leave = ML.ease(t, end - 0.25, end);
        stage3.style.opacity = (Math.min(1, ML.lin(t, at - 0.15, at + 0.1)) * (1 - leave)).toFixed(4);
        const s = Math.max(0, t - t0);
        // yaw: velocity eases toward the idle spin, integrated in closed form
        const yaw = spin * p.speed * (s - (1 - Math.exp(-kk * s)) / kk);
        // pitch relaxes toward home from a little above it
        const pitch = p.pitch + 0.08 * Math.exp(-0.35 * Math.max(0, t - at));
        rig.style.transform = `scale(${s0.toFixed(4)}) rotateX(${(-pitch).toFixed(4)}rad) rotateY(${yaw.toFixed(4)}rad)`;
        // lighting: the normals of the front (0,0,1) and back (0,0,-1) turned by yaw then pitch
        const nx = Math.sin(yaw), nz0 = Math.cos(yaw);
        const ny = -nz0 * Math.sin(pitch), nz = nz0 * Math.cos(pitch); // seen from above: the front looks a little down
        const lf = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), lb = Math.max(0, -(nx * L[0] + ny * L[1] + nz * L[2]));
        const home = Math.max(0.05, L[2] * Math.cos(pitch) - L[1] * Math.sin(pitch)); // facing the eye the picture stays as it is
        fShade.style.opacity = (ML.clamp(1 - lf / home) * 0.5).toFixed(4);
        bShade.style.opacity = (ML.clamp(1 - lb / home) * 0.32).toFixed(4);
        // the highlight travels across the front as it turns past the light
        const pos = Math.sin(yaw) * 120;
        sheen.style.translate = `${(-pos).toFixed(2)}% 0`;
        sheen.style.opacity = (lf * 0.8 * Math.min(1, s * 2)).toFixed(4);
        // the edge: lit when the side faces the light
        const shade = (80 - Math.abs(nx) * 34).toFixed(1);
        slices.forEach((e) => (e.style.background = `color-mix(in srgb, var(--x-ink) ${shade}%, var(--x-panel-2))`));
      },
    };
  },
});
