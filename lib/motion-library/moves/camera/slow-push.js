// Slow push while holding: the camera creeps steadily closer for the rest of the scene so the frame is never still.
// The scene (or the subject itself, when the target is a logo / headline / picture) scales around its focal point —
// the transform origin sits on the subject's centre, so the focal point never moves on screen. Amount 1.02–1.08 for a
// hold creep (wordmark 1 → 1.04, live screen 1 → 1.03), 1.1–1.2 for a photo (1 → 1.18 over 3–4 s), up to 1.35 for a
// diorama. Ease none or sine.inOut so it never stops dead; power1.in (accelerating, with blur 0 → end_blur px at the very
// end) when it leads into a cut. Optional camera orbit (yaw, as a 2D lateral drift: nothing scaled past 1 under a 3D
// transform) and tilt (drift_y, % of the frame); the scene is overscanned just enough that its edges never show.
// Overlays that are children of the scene stay locked to the subject. A picture is never pushed past its own pixels.
// Sources: own lib/live-engine/worker/vendor/recipes.js (the 1.03 visual push, the ×0.92 region hold) and prompt-motion
// oliahmed205-just-tried-opus-5-5, spearwtf-so-i-wanted-to, anas0ra-franchement-opus-5-5-c-est,
// reflex-cloud-this-is-legit-insane (reference only).
ML.define({
  id: "camera.slow-push",
  category: "camera",
  name: "Slow push while holding",
  does: "While a scene or subject holds, the camera creeps steadily closer — a few percent to a third — so the frame is never still.",
  says: ["focus", "ambient", "calm", "story", "arrival"],
  energy: 1,
  targets: ["scene", "screen", "logo", "stage", "image", "headline"],
  duration: [1, 10],
  params: {
    amount: { type: "number", range: [1.02, 1.35], default: 1.05, unit: "x" },
    ease: { type: "choice", options: ["none", "sine.inOut", "power1.in"], default: "none" },
    yaw: { type: "number", range: [0, 3], default: 0, unit: "deg" },
    drift_y: { type: "number", range: [-3, 3], default: 0, unit: "%" },
    end_blur: { type: "number", range: [0, 2], default: 0, unit: "px" },
    origin: { type: "choice", options: ["centre", "subject"], default: "subject" },
  },
  pairs: ["camera.push-in", "text-in.punchline", "background.film-grain"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "also prompt-motion oliahmed205 / spearwtf / anas0ra / reflex-cloud (reference only)" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const W = f.W, H = f.H;
    const whole = !el || el === stage || el === host || el.matches('[data-slot="scene"]');
    const hb = host.getBoundingClientRect(), k = hb.width / (host.offsetWidth || 1) || 1;
    const rel = (n) => { const r = n.getBoundingClientRect(); return { x: (r.left - hb.left) / k, y: (r.top - hb.top) / k, w: r.width / k, h: r.height / k }; };
    let A = ML.clamp(p.amount, 1.02, 1.35);
    const pixLimit = (n) => { // how much further a picture may scale before it runs past its own pixels (a vector has no limit)
      const nw = n.naturalWidth || n.videoWidth || 0, nh = n.naturalHeight || n.videoHeight || 0;
      if (!nw || !nh || /\.svg|image\/svg/i.test(n.currentSrc || n.src || "")) return Infinity;
      const r = n.getBoundingClientRect(), K = k, fit = getComputedStyle(n).objectFit;
      return Math.max(1, 1 / (fit === "contain" ? Math.min(r.width / K / nw, r.height / K / nh) : Math.max(r.width / K / nw, r.height / K / nh)));
    };
    let node, ox, oy, VW, VH;
    if (whole) {
      // the scene's subject: its headline, else its main visual
      const subj = host.querySelector("[data-focus]") || host.querySelector(".ml-pic img, .ml-pic .ml-panel, .ml-pic") || host.querySelector(".ml-title, h1");
      node = document.createElement("div");
      node.className = "ml-cam";
      node.style.cssText = "position:absolute;inset:0";
      while (host.firstChild) node.append(host.firstChild);
      host.append(node);
      VW = W; VH = H;
      if (p.origin === "subject" && subj) { const b = rel(subj); ox = b.x + b.w / 2; oy = b.y + b.h / 2; }
      else { ox = W / 2; oy = H / 2; }
    } else {
      node = el;
      const b = { w: el.offsetWidth || rel(el).w, h: el.offsetHeight || rel(el).h };
      VW = b.w; VH = b.h;
      ox = b.w / 2; oy = b.h / 2; // the subject's own centre
    }
    ox = ML.clamp(ox, 0, VW); oy = ML.clamp(oy, 0, VH);
    // never past a picture's pixels: the target's, or those of every picture a whole-scene push carries
    const pics = [...(node.matches("img, video") ? [node] : node.querySelectorAll("img, video"))];
    const lim = pics.reduce((m, n) => Math.min(m, pixLimit(n)), Infinity);
    A = Math.min(A, lim);
    let yawShift = Math.sin((ML.clamp(p.yaw, 0, 3) * Math.PI) / 180) * VW * 0.5 * (ctx.rtl ? -1 : 1);
    let dy = (ML.clamp(p.drift_y, -3, 3) / 100) * VH;
    // overscan so a drift never shows an edge (whole scene only: a subject may move freely). s(u) and the drift both grow
    // linearly in u, so it is enough that the last frame covers: A · over ≥ 1 + drift / the room on the near side
    const coverage = () => (whole ? Math.max(1, (1 + Math.abs(yawShift) / Math.max(1, Math.min(ox, VW - ox))) / A, (1 + Math.abs(dy) / Math.max(1, Math.min(oy, VH - oy))) / A) : 1);
    let over = coverage();
    if (A * over > lim) { yawShift = 0; dy = 0; over = 1; } // no room left in the picture's pixels for a drift
    const blurMax = pics.some((n) => pixLimit(n) !== Infinity) ? 0 : ML.clamp(p.end_blur, 0, 2); // never a blur on a picture
    const sine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const eFn = p.ease === "sine.inOut" ? sine : p.ease === "power1.in" ? (x) => x * x : (x) => x;
    node.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
    const base = whole ? "" : node.style.transform;
    return {
      draw(t) {
        const u = eFn(ML.lin(t, at, end));
        const s = (1 + (A - 1) * u) * over;
        const tx = yawShift * u, ty = dy * u;
        const tr = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
        node.style.transform = (base ? base + " " : "") + tr;
        if (blurMax > 0) {
          const b = blurMax * ML.lin(t, end - (end - at) * 0.25, end);
          node.style.filter = b > 0.02 ? `blur(${b.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});
