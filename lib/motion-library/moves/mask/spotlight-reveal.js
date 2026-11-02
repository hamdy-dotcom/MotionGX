// Spotlight reveal (and bloom): a soft circle of light travels over a picture; inside it the same picture shows in
// its other state, and on the finish the circle collapses, holds, or blooms open until the whole picture has changed.
// Ported from MengTo's reveal-hover-effect (demo/index.html): two pixel-aligned copies — the base below (here a twin
// of the target with the base look: dark, frosted, mono, plaster-like material or sketch), the target itself above
// under mask-image radial-gradient(circle r at x y, #000 0%, #000 40%, rgba(0,0,0,.75) 60%, .4 75%, .12 88%,
// transparent 100%) — and its follow: pos += (target − pos)·0.1, r += (targetR − r)·0.14 each 1/60 s. For film the
// target runs a scripted path (sweep, S, circle, park) and the eased state is the recurrence iterated from the move's
// start at fixed 1/60 steps (deterministic; precomputed once, interpolated per frame). The spot starts at the
// path's first point; r 260 px (compact: min(r, max(140, w·.22)) on the picture). Bloom: target r ≥ the picture's
// diagonal at the end of the path, eased 0.11 a step, and once r passes the far corner the mask is dropped.
// Our changes from the source: the "blur" base is a frosted haze (no blur on pictures); softness moves the solid core.
// Source: MengTo/Skills agent-skills/web-design/reveal-hover-effect (demo/index.html) + shaders-cursor-ripples (MIT).
ML.define({
  id: "mask.spotlight-reveal",
  category: "mask",
  name: "Spotlight reveal (and bloom)",
  does: "A soft circle of light travels over a picture and, inside it, the same picture appears in another state, and can bloom open until the whole picture has changed.",
  says: ["reveal", "before-after", "focus", "luxury", "change", "result", "story"],
  energy: 2,
  targets: ["image", "scene", "cursor"],
  duration: [1.5, 4],
  params: {
    radius: { type: "number", range: [120, 320], default: 260, unit: "px" },
    softness: { type: "number", range: [0.2, 0.8], default: 0.6 },
    path: { type: "choice", options: ["sweep", "s-curve", "circle", "park"], default: "s-curve" },
    base: { type: "choice", options: ["dark", "blur", "mono", "material", "sketch"], default: "dark" },
    finish: { type: "choice", options: ["collapse", "hold", "bloom"], default: "hold" },
    bloom_centre: { type: "choice", options: ["last-point", "subject"], default: "last-point" },
    cursor: { type: "bool", default: false },
    follow: { type: "number", range: [0.06, 0.2], default: 0.1 },
  },
  pairs: ["photo.ken-burns", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/reveal-hover-effect", license: "MIT", note: "demo/index.html mask stops + 0.1 / 0.14 follow, iterated at 1/60 from the move start; blur base → frosted haze (library rule)" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    let el = ctx.el;
    if (!el) return null;
    if (el === stage) el = ctx.scene || stage;
    const host = ctx.scene || stage;
    const b = ctx.box(el), w = b.w, h = b.h;
    const k = Math.min(ctx.f.W, ctx.f.H) / 1080;
    const rtl = ctx.rtl;
    // the radius on our frame, compact on a small picture
    const R = Math.min(ML.clamp(+p.radius, 120, 320) * k * 1.4, Math.max(140 * k, Math.max(w, h) * 0.22), Math.max(w, h) * 0.6);
    const follow = ML.clamp(+p.follow, 0.06, 0.2), rFollow = 0.14;
    const soft = ML.clamp(+p.softness, 0.2, 0.8);

    // the base: a pixel-aligned twin under the target
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const base = el.cloneNode(true);
    ["data-slot", "id"].forEach((a) => base.removeAttribute(a));
    base.querySelectorAll("[data-slot]").forEach((n) => n.removeAttribute("data-slot"));
    base.setAttribute("aria-hidden", "true");
    const FILTERS = {
      dark: "brightness(.36) saturate(.7)",
      blur: "saturate(.45) brightness(1.14) contrast(.66)",
      mono: "grayscale(1) contrast(.92)",
      material: "grayscale(1) sepia(.16) brightness(1.24) contrast(.6)",
      sketch: "grayscale(1) contrast(2.3) brightness(1.4)",
    };
    const isHost = el === host;
    if (isHost) {
      // a whole scene: the twin sits under it inside the stage
      base.style.cssText = (el.getAttribute("style") || "") + `;position:absolute;inset:0;display:block;z-index:0;filter:${FILTERS[p.base] || FILTERS.dark};pointer-events:none`;
      el.parentElement.insertBefore(base, el);
      el.style.zIndex = el.style.zIndex || "1";
    } else {
      base.style.cssText = (el.getAttribute("style") || "") + `;position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;margin:0;filter:${FILTERS[p.base] || FILTERS.dark};pointer-events:none;mask-image:none`;
      el.parentElement.insertBefore(base, el);
    }
    let haze = null;
    if (p.base === "blur" && !isHost) {
      haze = document.createElement("div");
      haze.style.cssText = `position:absolute;left:${el.offsetLeft}px;top:${el.offsetTop}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;background:color-mix(in srgb, var(--x-ground) 38%, transparent);border-radius:${getComputedStyle(el).borderRadius};pointer-events:none`;
      el.parentElement.insertBefore(haze, el);
    }

    // the scripted path (local px), mirrored in Arabic
    const span = ML.clamp(end - at - (p.finish === "hold" ? 0.2 : 1.0), 1.0, 3);
    const P = {
      sweep: (u) => [0.1 + 0.8 * u, 0.5 + 0.08 * Math.sin(u * Math.PI)],
      "s-curve": (u) => [0.14 + 0.72 * u, 0.5 - 0.26 * Math.sin(u * Math.PI * 2)],
      circle: (u) => { const a = -Math.PI / 2 + u * Math.PI * 2, rr = 0.26 * Math.min(w, h); return [0.5 + (Math.cos(a) * rr) / w, 0.5 + (Math.sin(a) * rr) / h]; },
      park: (u) => { const e = ML.ease(u, 0, 0.62); return [0.22 + 0.46 * e, 0.68 - 0.3 * e]; },
    }[p.path] || ((u) => [0.5, 0.5]);
    const at2 = (u) => { const [x, y] = P(u); return [(rtl ? 1 - x : x) * w, y * h]; };
    const diag = Math.hypot(w, h);
    const last = at2(1), centre = [w / 2, h / 2];
    const bloomAt = p.bloom_centre === "subject" ? centre : last;
    const farCorner = (c) => Math.max(Math.hypot(c[0], c[1]), Math.hypot(w - c[0], c[1]), Math.hypot(c[0], h - c[1]), Math.hypot(w - c[0], h - c[1]));
    // the eased state, the source's recurrence at 1/60 from the move's start
    const N = Math.ceil((end + 0.6 - at) * 60) + 2;
    const X = new Float32Array(N), Y = new Float32Array(N), Rr = new Float32Array(N);
    const tgt = (tk) => {
      const u = ML.ease(tk, at, at + span), pos = at2(u);
      if (tk < at + span) return [pos[0], pos[1], R];
      if (p.finish === "collapse") return [pos[0], pos[1], 0];
      if (p.finish === "bloom") return [bloomAt[0], bloomAt[1], diag * 1.25];
      return [pos[0], pos[1], R];
    };
    let x = at2(0)[0], y = at2(0)[1], r = 0;
    for (let i = 0; i < N; i++) {
      const tk = at + i / 60, [tx, ty, tr] = tgt(tk), bloom = p.finish === "bloom" && tk >= at + span;
      x += (tx - x) * follow; y += (ty - y) * follow; r += (tr - r) * (bloom ? 0.11 : rFollow);
      X[i] = x; Y[i] = y; Rr[i] = r;
    }
    const sample = (A, t) => { const f = ML.clamp((t - at) * 60, 0, N - 1), i = Math.floor(f), j = Math.min(N - 1, i + 1); return A[i] + (A[j] - A[i]) * (f - i); };
    const sMid = 1 - soft;
    const stops = [[0, 1], [sMid, 1], [sMid + soft * (20 / 60), 0.75], [sMid + soft * (35 / 60), 0.4], [sMid + soft * (48 / 60), 0.12], [1, 0]];
    const grad = (cx, cy, rad) => `radial-gradient(circle ${rad.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px, ${stops.map(([s, a]) => `rgba(0,0,0,${a}) ${(s * 100).toFixed(1)}%`).join(", ")})`;
    const setMask = (m) => { el.style.maskImage = m; el.style.webkitMaskImage = m; el.style.maskRepeat = "no-repeat"; el.style.webkitMaskRepeat = "no-repeat"; };

    // an optional pointer at the target point
    let cur = null;
    if (p.cursor) {
      const s = 34 * k;
      cur = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      cur.setAttribute("viewBox", "0 0 24 24");
      cur.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;pointer-events:none;z-index:6;overflow:visible`;
      cur.innerHTML = '<path d="M3 2 L3 19 L7.6 15 L10.6 21.6 L13.6 20.3 L10.7 13.8 L17 13.8 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.6" stroke-linejoin="round"/>';
      host.append(cur);
    }
    ctx.sfx(at, "whoosh.soft", 0.2);
    if (p.finish === "bloom") ctx.sfx(at + span, "swell", 0.3);
    return {
      draw(t) {
        if (t < at - 1e-6) { setMask(grad(at2(0)[0], at2(0)[1], 0)); if (cur) cur.style.visibility = "hidden"; return; }
        const cx = sample(X, t), cy = sample(Y, t), rad = sample(Rr, t);
        const open = p.finish === "bloom" && t >= at + span && rad >= farCorner([cx, cy]);
        setMask(open ? "none" : grad(cx, cy, Math.max(0, rad)));
        base.style.visibility = open ? "hidden" : "visible";
        if (haze) haze.style.visibility = open ? "hidden" : "visible";
        if (cur) {
          const u = ML.ease(t, at, at + span), [px, py] = at2(u), gone = t > at + span + 0.3;
          cur.style.visibility = gone ? "hidden" : "visible";
          cur.style.translate = `${(b.x + px).toFixed(2)}px ${(b.y + py).toFixed(2)}px`;
        }
      },
    };
  },
});
