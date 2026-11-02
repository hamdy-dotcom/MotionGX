// Shards fly in and lock: the target is split into 4–12 pieces that spin and fly inward to lock into one finished
// object (reversible as an explode).
//   · a logo / picture / card target is cut into wedge polygons (clip-path copies of itself, seeded around a jittered
//     centre); once locked the copies give way to the original, so the rest frame is the crisp element itself.
//   · on the stage (or a shape slot) it builds MengTo's optical object: kite shards with light / dark facets around a
//     core, optional dashed orbits, an aperture ring, axis lines and crosshairs, and a mono "Normalized state" readout.
// Two drives. Stagger: each shard from an offset (below / scatter / radial, 80–220 px at 1080) with rotation ±90–200°,
// scale 0.6 and opacity 0, landing in 0.45 s power3.out with a back(1.2) overshoot, 0.12–0.3 s apart. Progress: one p in
// [0, 1] eased power2.inOut over the window drives everything at once — shards rotate(a_k(1−p)) translate(d_k(1−p)),
// orbits rotate(−40 + 155p) scale(.78 + .22p), aperture rotate(28 − 118p) scale(.48 + .52p), core scale(.18 + .82p),
// axes rotate(−18 + 36p) (the demo's exact formulas). Explode runs p from 1 to 0.
// Source: MengTo/Skills web-design/scroll-scrubbed-visual-sequence demo (MIT: the progress formulas and the aperture
// object); prompt-motion "tdinh-me-use-this-prompt-and" (reference) for the flying shards.
ML.define({
  id: "element.shard-assemble",
  category: "element",
  name: "Shards fly in and lock",
  does: "Scattered fragments spin and fly inward to lock into one finished object (rings tightening, core swelling) - reversible as an explode.",
  says: ["change", "result", "precision", "tech", "arrival"],
  energy: 3,
  targets: ["shape", "logo", "stage"],
  duration: [1, 3],
  params: {
    direction: { type: "choice", options: ["assemble", "explode"], default: "assemble" },
    parts: { type: "number", range: [4, 12], default: 6 },
    origin: { type: "choice", options: ["below", "scatter", "radial"], default: "scatter" },
    drive: { type: "choice", options: ["stagger", "progress"], default: "stagger" },
    rings: { type: "bool", default: false },
    readout: { type: "bool", default: false },
    backdrop: { type: "bool", default: true },
  },
  pairs: ["camera.push-in", "element.ring-stroke-logo-reveal"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "snap",
  source: { from: "MengTo/Skills:agent-skills/web-design/scroll-scrubbed-visual-sequence", license: "MIT", note: "progress formulas + aperture object ported from the demo; flying shards after prompt-motion tdinh-me-use-this-prompt-and (reference), our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const n = Math.round(ML.clamp(p.parts, 4, 12)), dir = rtl ? -1 : 1, U = Math.min(f.W, f.H) / 1080;
    const explode = p.direction === "explode", progress = p.drive === "progress";
    const p3o = (x) => 1 - Math.pow(1 - x, 4), p2io = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

    // ── timing: the assembly (or its reverse) inside [at, end] ──
    const span = Math.max(0.9, end - at - 0.3);
    const hold = explode ? Math.min(0.35, span * 0.2) : 0; // an explode shows the whole first
    const run = Math.min(progress ? 2.4 : 99, span - hold);
    const stag = ML.clamp((run - 0.45) / Math.max(1, n - 1), 0.04, 0.3) * (progress ? 0 : 1);
    const t0 = at + hold, lockT = progress ? t0 + run : t0 + stag * (n - 1) + 0.45;
    // u_k(t): 0 scattered → 1 in place (assemble); explode plays it backwards
    const uOf = (t, k) => {
      if (progress) { const x = p2io(ML.lin(t, t0, t0 + run)); return explode ? 1 - x : x; }
      const a = t0 + (explode ? (n - 1 - k) : k) * stag;
      if (explode) { const x = ML.lin(t, a, a + 0.45); return 1 - x * x * x; }
      return ML.back(t, a, a + 0.45, 1.2);
    };
    const pAll = (t) => { const x = p2io(ML.lin(t, t0, lockT)); return explode ? 1 - x : x; };
    ctx.sfx(t0, "whoosh.soft", 0.3);
    if (!explode) ctx.sfx(lockT, "snap", 0.4); else ctx.sfx(t0 + 0.05, "hit", 0.3);

    // offsets per shard, from the chosen origin (in a given unit)
    const offset = (k, mid, unit) => {
      const d = (80 + ML.rnd(k, 3) * 140) * unit;
      if (p.origin === "below") return [(ML.rnd(k, 4) - 0.5) * d * 0.8 * dir, d * 1.1];
      if (p.origin === "radial") return [Math.cos(mid) * d * 1.2, Math.sin(mid) * d * 1.2];
      const a = ML.rnd(k, 5) * Math.PI * 2; return [Math.cos(a) * d * 1.2, Math.sin(a) * d * 1.2];
    };
    const spinOf = (k) => (ML.rnd(k, 6) < 0.5 ? -1 : 1) * (90 + ML.rnd(k, 7) * 110);

    // ── A: an element cut into wedges ──
    if (own && ob && ob.w > 24 && ob.h > 16) {
      const wrap = doc.createElement("div");
      wrap.style.cssText = `position:absolute;left:${ob.x}px;top:${ob.y}px;width:${ob.w}px;height:${ob.h}px;pointer-events:none;z-index:7;overflow:visible;`;
      host.append(wrap);
      const cs = getComputedStyle(own);
      const c0 = [50 + (ML.rnd(1, 9) - 0.5) * 16, 50 + (ML.rnd(2, 9) - 0.5) * 16];
      const cuts = Array.from({ length: n }, (_, k) => ((k + (ML.rnd(k, 11) - 0.5) * 0.5) / n) * Math.PI * 2 - Math.PI / 2);
      const unit = U * Math.max(1, Math.min(1.6, Math.max(ob.w, ob.h) / 400));
      const pieces = cuts.map((a0, k) => {
        const a1 = k === n - 1 ? cuts[0] + Math.PI * 2 : cuts[k + 1], mid = (a0 + a1) / 2;
        const pts = [c0];
        for (let j = 0; j <= 4; j++) { const a = a0 + ((a1 - a0) * j) / 4; pts.push([c0[0] + Math.cos(a) * 160, c0[1] + Math.sin(a) * 160]); }
        const piece = doc.createElement("div");
        piece.style.cssText = `position:absolute;inset:0;clip-path:polygon(${pts.map((q) => `${q[0].toFixed(2)}% ${q[1].toFixed(2)}%`).join(",")});transform-origin:${(c0[0] + Math.cos(mid) * 25).toFixed(1)}% ${(c0[1] + Math.sin(mid) * 25).toFixed(1)}%;`;
        const copy = own.cloneNode(true);
        copy.removeAttribute("data-slot");
        copy.querySelectorAll("[data-slot]").forEach((e) => e.removeAttribute("data-slot"));
        copy.style.position = "absolute"; copy.style.left = "0"; copy.style.top = "0"; copy.style.margin = "0";
        copy.style.width = `${ob.w}px`; copy.style.height = `${ob.h}px`; copy.style.boxSizing = "border-box";
        copy.style.font = cs.font; copy.style.color = cs.color; copy.style.letterSpacing = cs.letterSpacing; copy.style.textAlign = cs.textAlign;
        copy.style.opacity = "1"; copy.style.translate = "none"; copy.style.transform = "none"; copy.style.visibility = "visible";
        piece.append(copy); wrap.append(piece);
        const [dx, dy] = offset(k, mid, unit);
        return { piece, dx, dy, spin: spinOf(k) };
      });
      return {
        draw(t) {
          // the original is the rest frame; the copies only exist while pieces are apart
          const apart = explode ? t >= t0 : t < lockT;
          own.style.visibility = apart ? "hidden" : "visible";
          wrap.style.display = apart ? "block" : "none";
          if (!apart) return;
          pieces.forEach((s, k) => {
            const u = uOf(t, k), v = Math.min(1, Math.max(0, u));
            const o = progress ? 0.45 + 0.55 * v : explode ? v : ML.lin(t, t0 + k * stag, t0 + k * stag + 0.2);
            s.piece.style.opacity = o.toFixed(4);
            s.piece.style.transform = `translate(${(s.dx * (1 - u)).toFixed(2)}px, ${(s.dy * (1 - u)).toFixed(2)}px) rotate(${(s.spin * (1 - u)).toFixed(2)}deg) scale(${(0.6 + 0.4 * v).toFixed(4)})`;
          });
        },
      };
    }

    // ── B: the optical object, built on the stage ──
    const R = ob && ob.w > f.W * 0.3 && ob.h > f.H * 0.15 ? ob : f.pic;
    const layer = doc.createElement("div");
    layer.style.cssText = `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`;
    host.append(layer);
    if (p.backdrop) { const b = doc.createElement("div"); b.style.cssText = "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);"; layer.append(b); }
    const showRead = p.readout || progress;
    const side = Math.min(R.w, R.h * (showRead ? 0.84 : 0.94)) * 0.92;
    const svg = doc.createElementNS(NS, "svg");
    const vb = p.rings ? [0, 800] : [180, 440]; // without rings the object alone fills the frame
    svg.setAttribute("viewBox", `${vb[0]} ${vb[0]} ${vb[1]} ${vb[1]}`);
    svg.style.cssText = `position:absolute;left:${(R.w - side) / 2}px;top:${(R.h - side) / 2 - (showRead ? R.h * 0.04 : 0)}px;width:${side}px;height:${side}px;overflow:visible;`;
    layer.append(svg);
    const mk = (tag, attrs, parent = svg) => { const e = doc.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
    const vk = vb[1] / side; // stage px → svg units
    const orbits = p.rings ? [324, 266].map((r) => mk("circle", { cx: 400, cy: 400, r, fill: "none", "stroke-dasharray": "2 8", style: "stroke:var(--x-ink);stroke-opacity:.32;stroke-width:1.2;" })) : [];
    const aperture = p.rings ? mk("path", { d: "M400 135C546 135 665 254 665 400S546 665 400 665 135 546 135 400 254 135 400 135Zm0 118c-81 0-147 66-147 147s66 147 147 147 147-66 147-147-66-147-147-147Z", "fill-rule": "evenodd", style: "fill:var(--x-panel-2);stroke:var(--x-ink);stroke-width:1.2;" }) : null;
    const hw = Math.min(64, 150 * Math.tan(Math.PI / n));
    const shards = Array.from({ length: n }, (_, k) => {
      const g = mk("g", {});
      // a kite from the centre out to r 168, split in two facets so its edge reads
      const mixA = 62 + ML.rnd(k, 12) * 30, mixB = Math.max(30, mixA - 28);
      mk("path", { d: `M400 232L${400 + hw} 342L400 400Z`, style: `fill:color-mix(in srgb, var(--x-accent) ${mixA.toFixed(0)}%, var(--x-panel));` }, g);
      mk("path", { d: `M400 232L400 400L${400 - hw} 342Z`, style: `fill:color-mix(in srgb, var(--x-accent) ${mixB.toFixed(0)}%, var(--x-ink));` }, g);
      const th = (k * 360) / n, mid = ((th - 90) * Math.PI) / 180;
      const [dx, dy] = offset(k, mid, vk * U);
      return { g, th, dx, dy, spin: spinOf(k) };
    });
    const axes = p.rings ? [[118, 400, 682, 400], [400, 118, 400, 682]].map(([x1, y1, x2, y2]) => mk("line", { x1, y1, x2, y2, "vector-effect": "non-scaling-stroke", style: "stroke:var(--x-accent-2);stroke-opacity:.7;stroke-width:1;" })) : [];
    const cross = p.rings ? [[400, 40], [400, 760], [40, 400], [760, 400]].map(([x, y]) => mk("path", { d: `M${x - 14} ${y}H${x + 14}M${x} ${y - 14}V${y + 14}`, style: "stroke:var(--x-dim);stroke-width:1.2;fill:none;" })) : [];
    const core = mk("circle", { cx: 400, cy: 400, r: 66, style: "fill:var(--x-accent-2);" });
    const read = showRead ? doc.createElement("div") : null;
    if (read) {
      read.dir = "ltr";
      read.style.cssText = `position:absolute;left:0;right:0;bottom:${(R.h * 0.03).toFixed(1)}px;text-align:center;font:var(--x-label-weight) ${Math.max(14, side * 0.03).toFixed(1)}px var(--x-mono-font);letter-spacing:0.08em;color:var(--x-dim);`;
      layer.append(read);
    }
    const tf = (e, s) => e.setAttribute("transform", s);
    return {
      draw(t) {
        layer.style.visibility = t < at ? "hidden" : "visible";
        const P = pAll(t);
        orbits.forEach((o, i) => tf(o, `rotate(${(-40 + 155 * P + i * 12).toFixed(2)} 400 400) translate(400 400) scale(${(0.78 + 0.22 * P).toFixed(4)}) translate(-400 -400)`));
        if (aperture) tf(aperture, `rotate(${(28 - 118 * P).toFixed(2)} 400 400) translate(400 400) scale(${(0.48 + 0.52 * P).toFixed(4)}) translate(-400 -400)`);
        axes.forEach((a) => tf(a, `rotate(${(-18 + 36 * P).toFixed(2)} 400 400)`));
        cross.forEach((c) => { c.style.opacity = P.toFixed(4); });
        tf(core, `translate(400 400) scale(${(0.18 + 0.82 * P).toFixed(4)}) translate(-400 -400)`);
        shards.forEach((s, k) => {
          const u = uOf(t, k), v = Math.min(1, Math.max(0, u));
          const o = progress ? 0.45 + 0.55 * v : explode ? v : ML.lin(t, t0 + k * stag, t0 + k * stag + 0.2);
          s.g.style.opacity = o.toFixed(4);
          tf(s.g, `translate(${(s.dx * (1 - u)).toFixed(2)} ${(s.dy * (1 - u)).toFixed(2)}) rotate(${(s.th + s.spin * (1 - u)).toFixed(2)} 400 400) translate(400 300) scale(${(0.6 + 0.4 * v).toFixed(4)}) translate(-400 -300)`);
        });
        if (read) read.textContent = `NORMALIZED STATE ${P.toFixed(3)}`;
      },
    };
  },
});
