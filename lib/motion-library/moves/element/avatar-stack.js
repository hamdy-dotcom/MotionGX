// Avatar stack social proof: round faces (the brand's own pictures — the target images, or crops of one) overlap into a
// row, each tucking under the one before (−25 % of a face), with a 2 px ring in the panel colour, in a frosted pill.
// Optional: a row of five stars pops first (scale 0 → 1, back.out(2), 0.25 s, 0.055 s apart); the faces pop
// (0.6 → 1 + fade, back.out(1.6), 0.35 s — grown as a circular clip, so a picture is never resampled mid-pop) or slide (x −16 → 0 + fade, power3.out, mirrored in Arabic) on a
// 0.07 s stagger; a '+N' chip the same size lands last and counts 0 → N over 0.5 s; the label fades up 8 px.
// Faces are only ever shown smaller than their pixels (object-fit cover in small circles); no blur on them.
// Source: MengTo/Skills web-design marquee-loop + solar-duotone-bold + light-mode-paper-technical demos (MIT):
// the "flex -space-x-2 … rounded-full p-1 bg-white/5 backdrop-blur-sm" stack with "ring-2 grayscale object-cover".
ML.define({
  id: "element.avatar-stack",
  category: "element",
  name: "Avatar stack social proof",
  does: "Round faces overlap into a row one after another, optionally after a row of stars and before a '+N' count chip, as a compact social-proof stamp.",
  says: ["proof", "trust", "connection"],
  energy: 2,
  targets: ["image", "number", "list", "label"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [3, 6], default: 4 },
    stars: { type: "bool", default: true },
    chip: { type: "choice", options: ["+N", "N+", "none"], default: "+N" },
    entry: { type: "choice", options: ["pop", "slide"], default: "pop" },
    count_up: { type: "bool", default: true },
    tint: { type: "choice", options: ["grayscale", "colour"], default: "colour" },
    stagger: { type: "number", range: [0.05, 0.1], default: 0.07, unit: "s" },
    n: { type: "number", range: [10, 99], default: 40 },
    label: { type: "text", default: "" },
    size: { type: "number", range: [0.06, 0.12], default: 0.085 },
    pill: { type: "bool", default: true },
  },
  pairs: ["data.odometer", "text-in.punchline", "element.app-icon-reveal"],
  avoid: ["problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/marquee-loop", license: "MIT", note: "avatar stack markup from marquee-loop, solar-duotone-bold and light-mode-paper-technical demos; motion is ours, every frame from t" },
  async setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = el && el !== ctx.stage ? el : null;
    // faces: the target images when there are several, else crops of the one picture we have, else lettered discs
    const pics = (ctx.els || []).filter((e) => e.tagName === "IMG");
    const scenePic = !pics.length ? (host.querySelector("img") || null) : null;
    const src = pics.length ? pics : scenePic ? [scenePic] : [];
    const n = Math.round(ML.clamp(p.count, 3, 6));
    const D = Math.min(f.W, f.H) * ML.clamp(p.size, 0.06, 0.12);
    const overlap = D * 0.26, ringW = Math.max(2, D / 20);
    // where the stamp sits: centred on the target (it replaces a picture; under a number / label / list)
    const B = own ? ctx.box(own) : { x: f.pic.x, y: f.pic.y, w: f.pic.w, h: f.pic.h };
    const replace = own && own.tagName === "IMG";
    const col = mk("div", `position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:${D * 0.22}px;pointer-events:none;z-index:6;`, host);
    const starRow = p.stars ? mk("div", `display:flex;gap:${D * 0.1}px;direction:ltr;`, col) : null;
    const stars = starRow ? Array.from({ length: 5 }, () => {
      const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.style.cssText = `width:${D * 0.38}px;height:${D * 0.38}px;display:block;will-change:transform;`;
      const pa = doc.createElementNS(NS, "path"); pa.setAttribute("d", "M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8-5.2-4.6 6.9-.7z"); pa.setAttribute("fill", "var(--x-accent)");
      s.append(pa); starRow.append(s); return s;
    }) : [];
    const row = mk("div", `display:flex;align-items:center;flex-direction:row;padding:${p.pill ? D * 0.09 : 0}px;border-radius:999px;${p.pill ? "background:color-mix(in srgb, var(--x-panel) 70%, var(--x-panel-2));box-shadow:0 0 0 1px var(--x-line);" : ""}`, col);
    const AR = "٠١٢٣٤٥٦٧٨٩";
    const digits = (s) => (rtl ? String(s).replace(/\d/g, (d) => AR[+d]) : String(s));
    const decodes = [];
    const faces = Array.from({ length: n }, (_, i) => {
      const w = mk("div", `position:relative;flex:none;width:${D}px;height:${D}px;margin-${rtl ? "right" : "left"}:${i ? -overlap : 0}px;border-radius:50%;box-sizing:border-box;border:${ringW}px solid var(--x-panel);overflow:hidden;z-index:${n - i};will-change:transform;background:color-mix(in srgb, var(--x-accent) ${30 + ((i * 23) % 50)}%, var(--x-panel-2));display:flex;align-items:center;justify-content:center;`, row);
      if (src.length) {
        const s = src[i % src.length], im = mk("img", `width:100%;height:100%;object-fit:cover;display:block;${p.tint === "grayscale" ? "filter:grayscale(1);" : ""}`, w);
        im.src = s.currentSrc || s.src; im.alt = ""; im.decoding = "sync"; decodes.push(im.decode ? im.decode().catch(() => {}) : 0);
        // one picture: each face a different crop of it
        if (src.length === 1) im.style.objectPosition = `${(10 + ((i * 37) % 80)).toFixed(0)}% ${(15 + ((i * 53) % 70)).toFixed(0)}%`;
      } else mk("span", `font:var(--x-head-weight) ${D * 0.38}px/1 var(--x-head-font);color:var(--x-accent-ink);`, w, (rtl ? "أبجدهوزح" : "ABCDEFGH")[i]);
      return w;
    });
    const N = Math.round(ML.clamp(p.n, 10, 99));
    const chipTxt = (v) => (p.chip === "N+" ? digits(v) + "+" : "+" + digits(v));
    const chip = p.chip === "none" ? null : mk("div", `position:relative;flex:none;width:${D}px;height:${D}px;margin-${rtl ? "right" : "left"}:${-overlap}px;border-radius:50%;box-sizing:border-box;border:${ringW}px solid var(--x-panel);background:var(--x-panel-2);color:var(--x-ink);display:flex;align-items:center;justify-content:center;font:600 ${D * 0.3}px/1 var(--x-body-font);font-variant-numeric:tabular-nums;z-index:0;will-change:transform;direction:ltr;`, row, chipTxt(N));
    const labelTxt = p.label || (rtl ? "أكثر من ٣ آلاف صانع محتوى" : "3k+ creators");
    const label = mk("div", `font:600 ${D * 0.32}px/1.2 var(--x-body-font);color:var(--x-ink);white-space:nowrap;will-change:transform;`, col, labelTxt);
    await Promise.all(decodes);
    const cw = col.offsetWidth, ch = col.offsetHeight;
    const cx = B.x + B.w / 2, cy = replace ? B.y + B.h / 2 : B.y + B.h + D * 0.3 + ch / 2;
    col.style.left = ML.clamp(cx - cw / 2, f.m * 0.5, f.W - f.m * 0.5 - cw) + "px";
    col.style.top = ML.clamp(cy - ch / 2, 0, f.H - ch) + "px";

    // times
    const st = ML.clamp(p.stagger, 0.05, 0.1);
    const starT = (i) => at + i * 0.055;
    const f0 = at + (stars.length ? 0.25 : 0);
    const faceT = (i) => f0 + i * st;
    const chipT = faceT(n) + 0.05, labT = chipT + 0.12;
    if (stars.length) ctx.sfx(at, "blip", 0.18);
    ctx.sfx(f0, "pop.soft", 0.35);
    if (chip) ctx.sfx(chipT, "pop", 0.3);
    const leaveA = Math.max(labT + 0.6, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.25);
        col.style.opacity = (1 - leave).toFixed(4);
        col.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (replace) { const o = t >= at ? (1 - ML.out(t, at, at + 0.25)).toFixed(4) : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        stars.forEach((s, i) => { const u = ML.back(t, starT(i), starT(i) + 0.25, 2), v = t < starT(i) ? 0 : u; s.style.transform = `scale(${Math.max(0, v).toFixed(4)})`; });
        faces.forEach((w, i) => {
          const a = faceT(i);
          if (p.entry === "slide") { const u = 1 - Math.pow(1 - ML.lin(t, a, a + 0.35), 3); w.style.opacity = u.toFixed(4); w.style.transform = `translateX(${((1 - u) * D * 0.4 * (rtl ? 1 : -1)).toFixed(2)}px)`; }
          else { const u = t < a ? 0 : ML.back(t, a, a + 0.35, 1.6); w.style.opacity = ML.lin(t, a, a + 0.18).toFixed(4); w.style.clipPath = u >= 1 || t >= a + 0.2 ? "none" : `circle(${(50 * (0.6 + 0.4 * u)).toFixed(3)}% at 50% 50%)`; }
        });
        if (chip) {
          const u = t < chipT ? 0 : ML.back(t, chipT, chipT + 0.35, 1.6);
          chip.style.opacity = ML.lin(t, chipT, chipT + 0.18).toFixed(4);
          chip.style.clipPath = u >= 1 || t >= chipT + 0.2 ? "none" : `circle(${(50 * (0.6 + 0.4 * u)).toFixed(3)}% at 50% 50%)`;
          const v = p.count_up ? Math.round(N * ML.out(t, chipT, chipT + 0.5)) : N, s = chipTxt(v);
          if (chip.textContent !== s) chip.textContent = s;
        }
        const l = ML.out(t, labT, labT + 0.35);
        label.style.opacity = l.toFixed(4);
        label.style.transform = `translateY(${((1 - l) * D * 0.15).toFixed(2)}px)`;
      },
    };
  },
});
