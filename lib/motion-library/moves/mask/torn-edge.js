// Torn deckle-edge mask: a photo or panel is cut by a believable torn-paper edge, pale fibres hanging past it, and can
// tear across to reveal or have a torn sheet slide away. A tear is not a wave: tearLine (straight runs with turns, ported
// unchanged from the paper-material demo, its seeded generators included) gives each edge; the fray loop gives the fibres.
// Everything is painted once in setup and only slid by t afterwards:
//   · the mask: a sheet (solid up to the tear, fibres past it) in a canvas turned to a data URL; the tear advancing is
//     its mask-position; with edge pair / all a second static mask (four independent tears; cut sides tiny) intersects it;
//   · the rim: a darker offset copy for the paper's thickness, a pale strip just inside the tear (the exposed core) and
//     the pale fibres, travelling with the tear;
//   · peel-away: a paper sheet in the look's panel colours over the target, its trailing edge torn, sliding off.
// Directions follow the reading direction (from "reading"); Arabic tears right to left.
// Source: MengTo/Skills 3d-paper-material demo.html (MIT): tearLine, buildEdge, the helpers.
ML.define({
  id: "mask.torn-edge",
  category: "mask",
  name: "Torn deckle-edge mask",
  does: "A photo or panel is cut by a believable torn-paper edge with pale fibres hanging past it, and can tear across to reveal or peel away.",
  says: ["reveal", "story", "change", "playful"],
  energy: 3,
  targets: ["image", "card", "screen", "scene"],
  duration: [0.6, 1.4],
  params: {
    edge: { type: "choice", options: ["one", "pair", "all"], default: "one" },
    motion: { type: "choice", options: ["static", "tear-across", "peel-away"], default: "tear-across" },
    from: { type: "choice", options: ["reading", "against", "top", "bottom"], default: "reading" },
    fibres: { type: "bool", default: true },
    core: { type: "bool", default: true },
    roughness: { type: "number", range: [0.5, 2], default: 1 },
    rest: { type: "number", range: [0.6, 0.97], default: 0.93 },
    duration: { type: "number", range: [0.6, 1], default: 0.8, unit: "s" },
    seed: { type: "number", range: [0, 9999], default: 1 },
  },
  pairs: ["text-in.punchline", "mask.clip-reveal"],
  avoid: ["tech", "precision"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/3d/3d-paper-material/demo.html", license: "MIT", note: "tearLine and the fray loop ported; canvas masks slid by t, paper colours from the look" },
  setup(ctx) {
    const { p, at, end, stage } = ctx;
    let el = ctx.el;
    if (!el) return null;
    if (el === stage && ctx.scene) el = ctx.scene;
    const host = el === ctx.scene || el === stage ? stage : ctx.scene || stage;
    const b = ctx.box(el), W = b.w, H = b.h;
    if (!(W > 1 && H > 1)) return null;

    // ── the paper demo's seeded helpers ──
    const lcg = (seed) => { let sd = seed | 0; return () => { sd = (sd * 1664525 + 1013904223) & 0xffffffff; return (sd >>> 8) / 16777216; }; };
    const h1 = (i, s) => { let n = (Math.imul(i, 374761393) + Math.imul(s, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const n1 = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = h1(i, s); return a + (h1(i + 1, s) - a) * u; };
    const fbmJ = (x, s, o) => { let v = 0, a = 0.5, n = 0; for (let k = 0; k < o; k++) { v += a * n1(x, s + k * 31); n += a; x *= 2.07; a *= 0.5; } return v / n; };
    // "A torn edge is not a wave": it runs straight for a while, turns, runs again; the fibres fray it at the finest scale
    function tearLine(n, A, rf, seed) {
      const y = new Float32Array(n);
      let s = 0, v = 0, m = 0, q = 0;
      for (let i = 0; i < n; i++) {
        s += -s * 0.08 + (rf() - 0.5) * 0.4;
        if (rf() < 0.006) s += (rf() - 0.5) * 4.0;
        v += s * 0.5; v -= v * 0.02;
        y[i] = v; m += v; q += v * v;
      }
      m /= n; const sd = Math.sqrt(Math.max(1e-6, q / n - m * m));
      for (let i = 0; i < n; i++) y[i] = A * ((0.14 * (y[i] - m)) / sd + 1.7 * (fbmJ(i / 320, seed, 2) - 0.5) + 0.55 * (fbmJ(i / 64, seed + 3, 2) - 0.5) + 0.16 * (fbmJ(i / 9, seed + 7, 2) - 0.5)) + (rf() - 0.5) * 0.45;
      return y;
    }
    // one torn edge as data: its outline, the fibres pulled past it, the paler strip where the sheet thins before it parts
    function buildEdge(n, A, rf, seed, kind, frayScale, featherScale) {
      const edge = tearLine(n, A, rf, seed), fib = [];
      for (let x = 0; x < n; x += 0.45 + rf() * 0.9) {
        if (rf() < 0.35) continue;
        const i = Math.min(n - 1, x | 0), long = rf() < 0.05;
        const len = (long ? 5 + rf() * 10 : 0.8 + rf() * rf() * 5.5) * frayScale;
        const ang = Math.PI / 2 + (rf() - 0.5) * (long ? 2.2 : 1.7);
        const y0 = edge[i] - rf() * 2.2, dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        const al = long ? 0.18 + rf() * 0.22 : 0.3 + rf() * 0.45, lw = long ? 0.3 + rf() * 0.25 : 0.35 + rf() * 0.4, bend = (rf() - 0.5) * len * 0.5;
        fib.push([x, y0, dx, dy, bend, al, lw]);
      }
      const feather = new Float32Array(Math.ceil(n / 2));
      for (let i = 0, k = 0; i < n; i += 2, k++) feather[k] = (0.4 + 3.2 * Math.pow(fbmJ(i / 26, kind * 13 + 4, 3), 2.2) + 0.6 * n1(i / 3.1, kind + 5)) * featherScale;
      return { n, edge, fib, feather };
    }

    // ── sizes: the demo's tear runs ~70 samples of amplitude, so one sample = A / 70 px whatever the target's size ──
    const short = Math.min(W, H), seed = Math.round(+p.seed || 0) + 11;
    const A = ML.clamp(short * 0.045 * ML.clamp(+p.roughness, 0.5, 2), 9, 96), sc = A / 70;
    const pad = Math.ceil(A * 4);
    const rtlX = ctx.rtl ? -1 : 1;
    const dirs = { reading: ["x", rtlX], against: ["x", -rtlX], top: ["y", 1], bottom: ["y", -1] };
    const [axis, adv] = dirs[p.from] || dirs.reading;
    const span = axis === "x" ? W : H, cross = axis === "x" ? H : W;
    const FRAY = 12, FEATHER = 7;
    const frontEdge = buildEdge(Math.ceil(cross / sc) + 2, 70, lcg(seed * 7919 + 1), seed, 1, FRAY, FEATHER);

    // the look's colours, resolved inside the target's own look
    const css = (v) => { const s = document.createElement("span"); s.style.cssText = `display:none;color:${v}`; host.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
    const paper = css("var(--x-panel)"), paper2 = css("var(--x-panel-2)");
    const pale = css("color-mix(in srgb, var(--x-panel) 76%, var(--x-dim))");
    const shade = css("color-mix(in srgb, var(--x-ink) 30%, var(--x-panel))"), ink = css("var(--x-ink)");

    // a canvas covering local v in [vMin, vMax] of a tear: local (u along the tear, v towards where it advances; v = 0 the tear)
    function sheet(vMin, vMax) {
      const len = Math.ceil(vMax - vMin), cv = document.createElement("canvas");
      cv.width = axis === "x" ? len : Math.ceil(W); cv.height = axis === "x" ? Math.ceil(H) : len;
      const g = cv.getContext("2d");
      const local = adv > 0 ? -vMin : vMax, s = adv > 0 ? 1 : -1;
      if (axis === "x") g.setTransform(0, 1, s, 0, local, 0); else g.setTransform(1, 0, 0, s, 0, local);
      return { cv, g, tearAt: local };
    }
    const sample = (g) => g.scale(sc, sc); // from here on, the demo's units (samples along the tear)
    const strideOf = () => Math.max(1, Math.floor(0.8 / sc));
    const fibres = (g, E, colour, sign = 1, k = 1) => {
      g.strokeStyle = colour; g.lineCap = "round";
      for (const [x, y0, dx, dy, bend, al, lw] of E.fib) {
        g.globalAlpha = Math.min(1, al * k); g.lineWidth = Math.max(lw * 1.7, 0.7 / sc);
        g.beginPath(); g.moveTo(x, sign * y0); g.quadraticCurveTo(x + dx / 2 + bend, sign * (y0 + dy / 2), x + dx, sign * (y0 + dy)); g.stroke();
      }
      g.globalAlpha = 1;
    };
    // band between two offsets from the tear line
    const band = (g, E, sign, inner, outer, colour) => {
      const st = strideOf(E.n);
      g.fillStyle = colour; g.beginPath();
      for (let i = 0; i < E.n; i += st) { const v = sign * (E.edge[i] + outer(i)); i ? g.lineTo(i, v) : g.moveTo(i, v); }
      for (let i = (E.n - 1) - ((E.n - 1) % st); i >= 0; i -= st) g.lineTo(i, sign * (E.edge[i] + inner(i)));
      g.closePath(); g.fill();
    };
    const featherAt = (E) => (i) => -E.feather[Math.min(E.feather.length - 1, i >> 1)];
    const thick = Math.max(1.5 / sc, 9);

    // the rim that rides a tear: thickness, exposed core, pale fibres
    function paintRim(g, E, sign = 1) {
      band(g, E, sign, () => -0.2, () => thick, shade);
      if (p.core) band(g, E, sign, featherAt(E), () => 0.2, paper);
      if (p.fibres) fibres(g, E, pale, sign);
    }

    const stack = []; // the masks on the target
    const setMask = () => {
      const s = el.style, m = stack;
      if (!m.length) return;
      const v = { image: m.map((x) => `url("${x.url}")`).join(", "), size: m.map((x) => `${x.w}px ${x.h}px`).join(", "), position: m.map((x) => "0px 0px").join(", ") };
      for (const pre of ["mask", "-webkit-mask"]) {
        s.setProperty(`${pre}-image`, v.image); s.setProperty(`${pre}-size`, v.size); s.setProperty(`${pre}-position`, v.position); s.setProperty(`${pre}-repeat`, "no-repeat");
      }
      if (m.length > 1) s.setProperty("mask-composite", "intersect");
    };

    // the overlay, in stage px over the target, clipped to it
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${W}px;height:${H}px;overflow:hidden;border-radius:${el === ctx.scene || el === stage ? "0px" : getComputedStyle(el).borderRadius};pointer-events:none;z-index:6`;
    host.append(wrap);
    const place = (n) => { n.style.cssText = "position:absolute;left:0;top:0;pointer-events:none"; wrap.append(n); return n; };

    // ── edge pair / all: a static deckle, four independent tears; torn sides large, cut sides tiny ──
    let deckle = null;
    if (p.edge !== "one") {
      const big = 1, tiny = 0.05, ins = A * 1.25;
      const amp = p.edge === "all" ? [big, big * 1.1, big * 0.92, big * 1.15] : axis === "x" ? [tiny, big, tiny, big * 1.1] : [big, tiny, big * 1.1, tiny];
      const I = amp.map((a) => (a > 0.5 ? ins : Math.max(2, A * 0.1))); // top, right, bottom, left insets: a cut side sits at the target's edge
      const lens = [W - I[1] - I[3], H - I[0] - I[2], W - I[1] - I[3], H - I[0] - I[2]];
      const E = amp.map((a, k) => buildEdge(Math.ceil(lens[k] / sc) + 1, 70 * a, lcg(seed * 104729 + k * 31 + 5), seed + 40 + k * 17, k + 2, a > 0.5 ? FRAY : 0, a > 0.5 ? FEATHER : 0));
      const side = [(g) => g.setTransform(sc, 0, 0, -sc, I[3], I[0]), (g) => g.setTransform(0, sc, sc, 0, W - I[1], I[0]), (g) => g.setTransform(sc, 0, 0, sc, I[3], H - I[2]), (g) => g.setTransform(0, sc, -sc, 0, I[3], I[0])];
      const poly = [];
      const st = strideOf(E[0].n);
      for (let i = 0; i < E[0].n; i += st) poly.push([I[3] + i * sc, I[0] - E[0].edge[i] * sc]);
      for (let j = 0; j < E[1].n; j += st) poly.push([W - I[1] + E[1].edge[j] * sc, I[0] + j * sc]);
      for (let i = E[2].n - 1; i >= 0; i -= st) poly.push([I[3] + i * sc, H - I[2] + E[2].edge[i] * sc]);
      for (let j = E[3].n - 1; j >= 0; j -= st) poly.push([I[3] - E[3].edge[j] * sc, I[0] + j * sc]);
      const mk = () => { const c = document.createElement("canvas"); c.width = Math.ceil(W); c.height = Math.ceil(H); return c; };
      const mc = mk(), mg = mc.getContext("2d");
      mg.fillStyle = "#000"; mg.beginPath(); poly.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath();
      mg.fill();
      const rc = place(mk()), rg = rc.getContext("2d");
      // the thickness and the core only where the deckle's polygon allows: the strip sits inside it, the shade just past it
      E.forEach((e, k) => { if (amp[k] < 0.5) return; side[k](rg); band(rg, e, 1, () => -0.2, () => thick, shade); if (p.core) band(rg, e, 1, featherAt(e), () => 0.2, paper); });
      E.forEach((e, k) => {
        if (amp[k] < 0.5) return;
        if (p.fibres) { side[k](mg); fibres(mg, e, "#000"); side[k](rg); fibres(rg, e, pale); }
      });
      mg.setTransform(1, 0, 0, 1, 0, 0); rg.setTransform(1, 0, 0, 1, 0, 0);
      deckle = { url: mc.toDataURL("image/png"), w: mc.width, h: mc.height, rim: rc };
    }

    // ── the three motions ──
    const dur = Math.min(ML.clamp(+p.duration, 0.6, 1), Math.max(0.4, end - at - 0.05));
    const motion = p.motion;
    const finish = p.edge === "one" ? Math.min(span * ML.clamp(+p.rest, 0.6, 0.97), span - A * 1.2) : span + pad;
    const frontOf = (D) => (adv > 0 ? D : span - D);
    const posOf = (o) => (axis === "x" ? `${o.toFixed(2)}px 0px` : `0px ${o.toFixed(2)}px`);
    let sweep = null, rim = null, peel = null;

    if (motion !== "peel-away" && (p.edge === "one" || motion === "tear-across")) {
      // the mask: solid up to the tear, fibres past it
      const S = sheet(-(span + pad), pad), g = S.g;
      sample(g);
      const E = frontEdge, st = strideOf(E.n), far = -(span + pad) / sc - 4;
      g.fillStyle = "#000"; g.beginPath(); g.moveTo(0, far);
      for (let i = 0; i < E.n; i += st) g.lineTo(i, E.edge[i]);
      g.lineTo(E.n, E.edge[E.n - 1]); g.lineTo(E.n, far); g.closePath(); g.fill();
      if (p.fibres) fibres(g, E, "#000");
      sweep = { url: S.cv.toDataURL("image/png"), w: S.cv.width, h: S.cv.height, tearAt: S.tearAt };
      // the rim riding it
      const R = sheet(-pad, pad);
      sample(R.g);
      paintRim(R.g, E);
      rim = place(R.cv); rim.tearAt = R.tearAt;
    }
    if (motion === "peel-away") {
      // a paper sheet over the target: its trailing edge torn, a little shadow falling behind it onto what it uncovers
      const S = sheet(-pad, span + pad), g = S.g, E = frontEdge, st = strideOf(E.n), shadowW = Math.max(14, A * 1.5);
      const grad = g.createLinearGradient(0, -shadowW, 0, A);
      grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "#000");
      g.save(); g.globalAlpha = 0.26; g.globalCompositeOperation = "source-over";
      const tint = document.createElement("canvas"); tint.width = S.cv.width; tint.height = S.cv.height; // a shadow in the look's ink
      const tg = tint.getContext("2d"); tg.setTransform(g.getTransform()); tg.fillStyle = grad; tg.fillRect(0, -shadowW, cross, shadowW + A);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = ink; tg.fillRect(0, 0, tint.width, tint.height);
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tint, 0, 0); g.restore();
      sample(g);
      band(g, E, -1, () => -0.2, () => thick, shade);
      const far = (span + pad) / sc + 4;
      g.fillStyle = paper2; g.beginPath(); g.moveTo(0, far);
      for (let i = 0; i < E.n; i += st) g.lineTo(i, -E.edge[i]);
      g.lineTo(E.n, -E.edge[E.n - 1]); g.lineTo(E.n, far); g.closePath(); g.fill();
      // the sheet's own grain: seeded hairlines and flecks
      const rf = lcg(seed * 31 + 77), count = Math.min(1400, Math.round((cross * span) / 900));
      g.strokeStyle = shade; g.lineCap = "round";
      for (let i = 0; i < count; i++) {
        const u = rf() * E.n, v = rf() * far, a = rf() * 6.283, l = (20 + rf() * 90);
        g.globalAlpha = 0.03 + rf() * 0.06; g.lineWidth = Math.max(0.5, rf() * 1.1) / sc;
        g.beginPath(); g.moveTo(u, v); g.quadraticCurveTo(u + Math.cos(a) * l * 0.5 + (rf() - 0.5) * l * 0.4, v + Math.sin(a) * l * 0.5, u + Math.cos(a) * l, v + Math.sin(a) * l); g.stroke();
      }
      g.globalAlpha = 1;
      if (p.core) band(g, E, -1, featherAt(E), () => 0.2, paper);
      if (p.fibres) fibres(g, E, pale, -1);
      peel = place(S.cv); peel.tearAt = S.tearAt;
    }
    if (deckle) { stack.push(deckle); }
    if (sweep) stack.unshift(sweep);
    setMask();
    if (deckle && deckle.rim && sweep) {
      // the deckle's own rim shows only where the tear has passed
      for (const pre of ["mask", "-webkit-mask"]) { deckle.rim.style.setProperty(`${pre}-image`, `url("${sweep.url}")`); deckle.rim.style.setProperty(`${pre}-size`, `${sweep.w}px ${sweep.h}px`); deckle.rim.style.setProperty(`${pre}-repeat`, "no-repeat"); }
    }
    // the travelling rim's box stays inside the deckle's polygon: its fibres and strip end where the deckle's mask ends
    if (deckle && rim) {
      rim.remove();
      const holder = document.createElement("div");
      holder.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
      for (const pre of ["mask", "-webkit-mask"]) { holder.style.setProperty(`${pre}-image`, `url("${deckle.url}")`); holder.style.setProperty(`${pre}-size`, `${deckle.w}px ${deckle.h}px`); holder.style.setProperty(`${pre}-repeat`, "no-repeat"); }
      holder.append(rim); wrap.append(holder);
    }
    if (motion !== "static") ctx.sfx(at, "whoosh.soft", 0.35);

    return {
      draw(t) {
        const inScene = t >= ctx.from - 1e-6 && t < ctx.to + 1e-6;
        wrap.style.visibility = inScene ? "visible" : "hidden";
        const e = ML.expo(t, at, at + dur);
        if (motion === "static") {
          const o = ML.ease(t, at, at + 0.25);
          el.style.opacity = o.toFixed(4); wrap.style.opacity = o.toFixed(4);
          if (sweep) {
            const pos = posOf(frontOf(finish) - sweep.tearAt);
            el.style.setProperty("mask-position", stack.length > 1 ? `${pos}, 0px 0px` : pos);
            el.style.setProperty("-webkit-mask-position", stack.length > 1 ? `${pos}, 0px 0px` : pos);
          }
          if (rim) rim.style.translate = axis === "x" ? `${(frontOf(finish) - rim.tearAt).toFixed(2)}px 0px` : `0px ${(frontOf(finish) - rim.tearAt).toFixed(2)}px`;
          return;
        }
        if (motion === "tear-across") {
          const D = -pad + (finish + pad) * e, front = frontOf(D), o = front - sweep.tearAt, pos = posOf(o);
          el.style.setProperty("mask-position", stack.length > 1 ? `${pos}, 0px 0px` : pos);
          el.style.setProperty("-webkit-mask-position", stack.length > 1 ? `${pos}, 0px 0px` : pos);
          if (deckle) { deckle.rim.style.setProperty("mask-position", pos); deckle.rim.style.setProperty("-webkit-mask-position", pos); }
          const r = front - rim.tearAt;
          rim.style.translate = axis === "x" ? `${r.toFixed(2)}px 0px` : `0px ${r.toFixed(2)}px`;
          return;
        }
        // peel-away: the sheet slides off, its torn edge last; nothing of it left past the far side
        const D = -pad + (span + 2 * pad + A) * e, r = frontOf(D) - peel.tearAt;
        peel.style.translate = axis === "x" ? `${r.toFixed(2)}px 0px` : `0px ${r.toFixed(2)}px`;
        peel.style.visibility = e >= 1 ? "hidden" : "visible";
      },
    };
  },
});
