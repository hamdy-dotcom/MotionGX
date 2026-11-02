// Container morph (Dynamic Island): ONE ink container changes shape — dot / pill / circle → wide pill (thumb +
// equaliser) → full card (art, title, sub, progress, controls) → slim progress pill → wide again — its width, height
// and corner radius each on a closed-form spring (slight overshoot), with a faint vertical squash and 0–4 px motion blur
// while it moves fast (none at rest). The contents of each state blur out just before the resize and blur in (8 → 0 px,
// y 6 → 0, 0.04 s stagger) once the shape has settled. Halfway through the card the play icon swaps to pause (0.8 → 1).
// Sources: prompt-motion twoclipping / demonugc "opus 5.5 is f-cking" (reference only — our own rebuild).
ML.define({
  id: "ui.container-morph",
  category: "ui",
  name: "Container morphs pill -> card (Dynamic Island)",
  does: "One black container stretches from a tiny pill or circle into a wide pill and then a full card (e.g. a music player), its contents fading in after each change.",
  says: ["change", "tech", "flow", "simplicity", "arrival"],
  energy: 3,
  targets: ["card", "screen"],
  duration: [0.8, 4],
  params: {
    states: { type: "number", range: [2, 5], default: 3 },
    from: { type: "choice", options: ["dot", "pill", "circle"], default: "pill" },
    content: { type: "choice", options: ["player", "notification", "any"], default: "player" },
    content_in: { type: "choice", options: ["blur", "fade", "slide"], default: "blur" },
    spring_stiffness: { type: "number", range: [150, 400], default: 260 },
    title: { type: "text" },
    sub: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "device.phone-rise"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "swell",
  source: { from: "prompt-motion:twoclipping-opus-5-5-is-f-cking", license: "reference", note: "also demonugc-opus-5-5-is-f-cking; our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080, u = 3 * k; // reference px → stage px
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const icon = (d, size, parent, fill = "var(--x-panel)") => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size.toFixed(1)); s.setAttribute("height", size.toFixed(1)); s.style.flex = "none"; const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", d); pa.setAttribute("fill", fill); s.append(pa); parent.append(s); return s; };
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    const fit = Math.min(1, (R.w * 0.92) / (280 * u)); // the card always fits its region
    const U = u * fit;

    // the states, in reference px: w, h, radius
    const FROM = { dot: [14, 14, 7], pill: [40, 11, 5.5], circle: [62, 62, 31] }[p.from] || [40, 11, 5.5];
    const SHAPE = { wide: [240, 60, 30], card: [280, 170, 22], slim: [220, 26, 13] };
    const kinds = ["from", "wide", "card", "slim", "wide"].slice(0, Math.round(ML.clamp(p.states, 2, 5)));
    const geo = kinds.map((kd) => (kd === "from" ? FROM : SHAPE[kd]).map((v) => v * U));
    const cx = R.x + R.w / 2, top = R.y + Math.max(0, (R.h - SHAPE.card[1] * U) / 2);
    const box = mk("div", `position:absolute;left:0;top:${top.toFixed(1)}px;background:var(--x-ink);overflow:hidden;z-index:6;pointer-events:none;transform-origin:50% 0;box-shadow:var(--x-shadow);`, host);

    // contents
    const title = p.title || (p.content === "notification" ? (rtl ? "رسالة جديدة" : "New message") : rtl ? "يعمل الآن" : "Now playing");
    const sub = p.sub || (p.content === "notification" ? (rtl ? "وصلك تأكيد الدفع" : "Your payment is confirmed") : rtl ? "قائمة اليوم" : "Today's mix");
    const pad = 14 * U, gap = 10 * U;
    const ink2 = "color-mix(in srgb, var(--x-panel) 55%, transparent)", trackC = "color-mix(in srgb, var(--x-panel) 22%, transparent)";
    const art = (s, parent) => mk("div", `width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;border-radius:${(s * 0.22).toFixed(1)}px;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));flex:none;`, parent);
    const appIcon = (s, parent) => { const a = mk("div", `width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;border-radius:50%;background:var(--x-good);flex:none;display:grid;place-items:center;`, parent); icon("M4 6h16v10H8l-4 4z", s * 0.55, a, "var(--x-accent-ink)"); return a; };
    const text = (s, w, c, parent, str) => mk("div", `font:${w} ${s.toFixed(1)}px/1.2 var(--x-body-font);color:${c};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, parent, str);
    const bar = (w, h, c, parent) => mk("div", `width:${w};height:${h.toFixed(1)}px;border-radius:999px;background:${c};flex:none;`, parent);
    const eqBars = [];
    const groups = kinds.map((kd, i) => {
      const [w, h] = geo[i];
      const g = mk("div", `position:absolute;left:0;top:0;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;box-sizing:border-box;`, box);
      const items = [];
      const row = (css = "") => mk("div", `display:flex;align-items:center;gap:${gap.toFixed(1)}px;${css}`, g);
      if (kd === "from") { if (p.from === "circle") { const r = row(`height:100%;justify-content:center;`); items.push(appIcon(h * 0.42, r)); } }
      else if (kd === "wide") {
        const r = row(`height:100%;padding:0 ${(pad * 1.2).toFixed(1)}px;box-sizing:border-box;`);
        if (p.content === "notification") { items.push(appIcon(h * 0.6, r)); items.push(text(16 * U, 600, "var(--x-panel)", r, title)); }
        else if (p.content === "any") { items.push(art(h * 0.6, r)); items.push(bar("40%", 9 * U, trackC, r)); }
        else {
          items.push(art(h * 0.62, r));
          const t = text(14 * U, 600, "var(--x-panel)", r, title); t.style.flex = "1"; items.push(t);
          const eq = mk("div", `display:flex;align-items:center;gap:${(3 * U).toFixed(1)}px;height:${(h * 0.45).toFixed(1)}px;flex:none;`, r);
          for (let b = 0; b < 4; b++) eqBars.push({ e: mk("div", `width:${(3.5 * U).toFixed(1)}px;height:100%;border-radius:999px;background:var(--x-good);transform-origin:50% 50%;`, eq), b, g: i });
          items.push(eq);
        }
      } else if (kd === "card") {
        g.style.padding = `${pad.toFixed(1)}px`; g.style.display = "flex"; g.style.flexDirection = "column"; g.style.gap = `${gap.toFixed(1)}px`;
        const r = row();
        const meta = mk("div", `display:flex;flex-direction:column;gap:${(4 * U).toFixed(1)}px;min-width:0;flex:1;`, r);
        if (p.content === "notification") {
          items.push(appIcon(44 * U, r)); r.append(meta);
          items.push(text(13 * U, 700, "var(--x-panel)", meta, title)); items.push(text(10 * U, 400, ink2, meta, sub));
          items.push(bar("86%", 6 * U, trackC, g)); items.push(bar("62%", 6 * U, trackC, g));
          const acts = row(`margin-top:auto;`);
          for (let a = 0; a < 2; a++) { const b = mk("div", `flex:1;height:${(26 * U).toFixed(1)}px;border-radius:${(13 * U).toFixed(1)}px;background:${a ? "var(--x-accent)" : trackC};`, acts); items.push(b); }
        } else {
          items.push(art(62 * U, r)); r.append(meta);
          items.push(text(13 * U, 700, "var(--x-panel)", meta, title)); items.push(text(10 * U, 400, ink2, meta, sub));
          if (p.content === "any") { items.push(bar("90%", 6 * U, trackC, g)); items.push(bar("70%", 6 * U, trackC, g)); }
          const prog = mk("div", `position:relative;height:${(4 * U).toFixed(1)}px;border-radius:999px;background:${trackC};margin-top:auto;overflow:hidden;`, g);
          const fill = mk("div", `position:absolute;inset:0;background:var(--x-good);transform-origin:${rtl ? "100%" : "0"} 50%;`, prog);
          items.push(prog);
          const ctr = row(`justify-content:center;gap:${(30 * U).toFixed(1)}px;`);
          const prevD = "M6 6h2v12H6zM9.5 12l8.5 6V6z", nextD = "M16 6h2v12h-2zM6 18l8.5-6L6 6z";
          items.push(icon(rtl ? nextD : prevD, 18 * U, ctr));
          const pp = mk("div", `position:relative;width:${(26 * U).toFixed(1)}px;height:${(26 * U).toFixed(1)}px;flex:none;`, ctr);
          const play = icon(rtl ? "M16 5v14L5 12z" : "M8 5v14l11-7z", 26 * U, pp), pause = icon("M6 5h4v14H6zM14 5h4v14h-4z", 26 * U, pp);
          play.style.position = pause.style.position = "absolute"; play.style.inset = pause.style.inset = "0";
          items.push(pp);
          items.push(icon(rtl ? prevD : nextD, 18 * U, ctr));
          g._player = { fill, play, pause };
        }
      } else if (kd === "slim") {
        const r = row(`height:100%;padding:0 ${(pad * 0.9).toFixed(1)}px;box-sizing:border-box;`);
        items.push(p.content === "notification" ? appIcon(h * 0.62, r) : art(h * 0.62, r));
        const prog = mk("div", `position:relative;flex:1;height:${(3 * U).toFixed(1)}px;border-radius:999px;background:${trackC};overflow:hidden;`, r);
        const fill = mk("div", `position:absolute;inset:0;background:var(--x-good);transform-origin:${rtl ? "100%" : "0"} 50%;`, prog);
        items.push(prog); g._slim = { fill };
      }
      return { g, items, w, h };
    });

    // timing: the first state pops in at `at`, each next state follows on a steady beat
    const n = kinds.length, T0 = at + 0.3;
    const seg = n > 1 ? ML.clamp((end - T0 - 0.7) / (n - 1), 0.55, 1.6) : 1;
    const T = kinds.map((_, i) => (i === 0 ? at : T0 + (i - 1) * seg));
    const z = 0.62, cfg = { stiffness: p.spring_stiffness, damping: 2 * z * Math.sqrt(p.spring_stiffness) };
    const keys = (j) => geo.map((g, i) => [T[i], g[j]]);
    const KW = keys(0), KH = keys(1), KR = keys(2);
    const W = (t) => ML.track(t, KW, cfg), H = (t) => ML.track(t, KH, cfg);
    T.forEach((tt, i) => i > 0 && ctx.sfx(tt, kinds[i] === "card" ? "swell" : "tap", kinds[i] === "card" ? 0.4 : 0.3));
    const showWin = groups.map((_, i) => [i === 0 ? at + 0.12 : T[i] + 0.3, i < n - 1 ? T[i + 1] - 0.1 : Infinity]);
    const cardIdx = kinds.indexOf("card"), swapAt = cardIdx >= 0 ? T[cardIdx] + Math.min(0.9, (T[cardIdx + 1] ?? end) - T[cardIdx]) * 0.6 : Infinity;
    const dir = rtl ? -1 : 1;

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const w = W(t), h = H(t), r = Math.max(0, Math.min(ML.track(t, KR, cfg), w / 2, h / 2));
        const vel = Math.hypot(W(t + 0.008) - W(t - 0.008), H(t + 0.008) - H(t - 0.008)) / 0.016;
        const vn = ML.clamp(vel / (3200 * k));
        const pop = ML.back(t, at, at + 0.3, 2);
        box.style.opacity = (t < at ? 0 : Math.min(1, ML.lin(t, at, at + 0.12)) * (1 - leave)).toFixed(4);
        box.style.width = Math.max(1, w).toFixed(2) + "px";
        box.style.height = Math.max(1, h).toFixed(2) + "px";
        box.style.borderRadius = r.toFixed(2) + "px";
        box.style.left = (cx - w / 2).toFixed(2) + "px";
        box.style.transform = `scale(${(0.6 + 0.4 * pop).toFixed(4)}, ${((0.6 + 0.4 * pop) * (1 - 0.05 * vn)).toFixed(4)})`;
        box.style.filter = vn > 0.02 || leave > 0 ? `blur(${(vn * 4 * k + leave * 8).toFixed(2)}px)` : "none";
        groups.forEach((G, i) => {
          G.g.style.left = ((w - G.w) / 2).toFixed(2) + "px";
          const [a, b] = showWin[i], gone = b === Infinity ? 0 : ML.lin(t, b, b + 0.1);
          G.g.style.visibility = t >= a && gone < 1 ? "visible" : "hidden";
          G.items.forEach((e, j) => {
            const q = ML.out(t, a + j * 0.04, a + j * 0.04 + 0.25) * (1 - gone);
            e.style.opacity = q.toFixed(4);
            const bl = p.content_in === "fade" ? 0 : (1 - q) * 8 * k;
            e.style.filter = p.content_in === "blur" && bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
            e.style.translate = p.content_in === "slide" ? `${((1 - q) * 20 * k * dir).toFixed(2)}px 0` : p.content_in === "blur" ? `0 ${((1 - q) * 6 * U).toFixed(2)}px` : "none";
          });
          if (G.g._player) {
            const { fill, play, pause } = G.g._player;
            fill.style.transform = `scaleX(${(0.18 + 0.5 * ML.lin(t, a, a + 4)).toFixed(4)})`;
            const s = t >= swapAt, q = ML.back(t, swapAt, swapAt + 0.2);
            play.style.opacity = s ? "0" : "1"; pause.style.opacity = s ? "1" : "0";
            const sc = s ? 0.8 + 0.2 * q : 1;
            (s ? pause : play).style.transform = `scale(${sc.toFixed(4)})`;
          }
          if (G.g._slim) G.g._slim.fill.style.transform = `scaleX(${(0.45 + 0.4 * ML.lin(t, a, a + 4)).toFixed(4)})`;
        });
        // the equaliser: seeded phases, a pure function of t
        for (const { e, b } of eqBars) {
          const v = 0.35 + 0.65 * Math.abs(Math.sin(t * (5.2 + 2.3 * ML.rnd(b, 4)) + ML.rnd(b, 9) * 6.28) * (0.6 + 0.4 * Math.sin(t * 2.1 + b)));
          e.style.transform = `scaleY(${v.toFixed(4)})`;
        }
      },
    };
  },
});
