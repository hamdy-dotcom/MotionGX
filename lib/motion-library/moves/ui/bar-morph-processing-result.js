// Bar morph → processing pill → result card. One shell carries the whole beat. Phase 1: the URL bar (panel, accent
// "Analyze" button) narrows 320 → 260 and darkens to the ink colour while its text crossfades to "Reading <domain>"
// (domain bold) and an accent progress line runs 0 → 100 % in 1 s; a light blur rides the resize (motion blur).
// Phase 2: the pill opens into a 320 × 170 card, radius 14, grey skeleton lines with an accent shimmer bar (0.3 s).
// Phase 3: the card turns panel-white: header (logo square + name + domain), an accent "Looks right" pill, a bold
// description, fields fading up on a 0.08 s stagger, and tags popping in. All sizes are shares of the short side.
// Source: prompt-motion en-ra "wtf, made with claude" (reference only — our own rebuild).
ML.define({
  id: "ui.bar-morph-processing-result",
  category: "ui",
  name: "Input bar morphs through a processing pill into a result card",
  does: "After click, the bar collapses into a dark pill 'Reading skinpal.app' with a progress line, then expands into a skeleton and finally a filled result card.",
  says: ["step", "result", "tech", "flow"],
  energy: 3,
  targets: ["card", "screen"],
  duration: [2, 4.5],
  params: {
    phases: { type: "choice", options: ["processing-only", "processing+skeleton", "full"], default: "full" },
    status_text: { type: "text", default: "Reading" },
    accent: { type: "choice", options: ["accent", "accent-2", "good", "bad"], default: "accent" },
    domain: { type: "text", default: "skinpal.app" },
    description: { type: "text", default: "AI skin analysis from one selfie" },
  },
  pairs: [],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "success",
  source: { from: "prompt-motion:en-ra-wtf-made-with-claude", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const say = (key, en, ar) => (rtl && p[key] === en ? ar : p[key] || (rtl ? ar : en));
    const host = ctx.scene || ctx.stage;
    const own = !ctx.el || ctx.el === ctx.stage;
    const R = own ? f.pic : ctx.box(ctx.el);
    const s = Math.min(R.w / 380, R.h / 230, (Math.min(f.W, f.H) / 1080) * 2.6); // source px → stage px
    const q = (v) => (v * s).toFixed(1) + "px";
    const A = `var(--x-${p.accent})`;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:6;", host);
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const shell = mk("div", `position:absolute;left:${cx}px;top:${cy}px;box-sizing:border-box;overflow:hidden;font-family:var(--x-body-font);box-shadow:var(--x-shadow);`, layer);
    const lay = (css) => mk("div", `position:absolute;inset:0;box-sizing:border-box;${css}`, shell);
    const domain = p.domain || "skinpal.app";
    const name = domain.split(".")[0].replace(/^./, (c) => c.toUpperCase());

    // phase 0: the bar (link icon, the typed domain, the accent button)
    const bar = lay(`display:flex;align-items:center;gap:${q(10)};padding:0 ${q(6)} 0 ${q(16)};color:var(--x-ink);font-size:${q(13)};`);
    if (rtl) bar.style.padding = `0 ${q(16)} 0 ${q(6)}`;
    mk("span", `color:var(--x-dim);display:grid;flex:none`, bar).innerHTML = `<svg viewBox="0 0 24 24" width="${(14 * s).toFixed(1)}" height="${(14 * s).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`;
    mk("span", "flex:1;font-weight:600;direction:ltr;text-align:start;unicode-bidi:isolate", bar, domain);
    mk("span", `background:${A};color:var(--x-accent-ink);border-radius:var(--x-radius-s);padding:${q(8)} ${q(14)};font-weight:600;font-size:${q(12)}`, bar, rtl ? "حلّل" : "Analyze");

    // phase 1: the processing pill
    const pill = lay(`display:flex;align-items:center;justify-content:center;gap:${q(5)};color:var(--x-panel);font-size:${q(13)};`);
    mk("span", "opacity:.75", pill, say("status_text", "Reading", "جاري قراءة"));
    mk("b", "direction:ltr;unicode-bidi:isolate", pill, domain);
    const track = mk("div", `position:absolute;left:12%;right:12%;bottom:${q(7)};height:${q(3)};border-radius:9px;background:color-mix(in srgb, var(--x-panel) 18%, transparent);overflow:hidden`, pill);
    const prog = mk("div", `position:absolute;inset:0;background:${A};transform-origin:${rtl ? "right" : "left"} center;`, track);

    // phase 2: the skeleton
    const skel = lay(`padding:${q(16)};display:flex;flex-direction:column;gap:${q(10)};`);
    const grey = (w, h, parent = skel) => mk("div", `width:${w};height:${q(h)};border-radius:${q(5)};background:var(--x-panel-2);flex:none`, parent);
    const sh = mk("div", `display:flex;align-items:center;gap:${q(10)}`, skel);
    grey(q(32), 32, sh); grey("34%", 12, sh); mk("div", "flex:1", sh);
    const shim = mk("div", `width:${q(70)};height:${q(20)};border-radius:var(--x-radius-s);background:color-mix(in srgb, ${A} 70%, var(--x-panel));flex:none`, sh);
    grey("78%", 10); grey("44%", 8); grey("62%", 10);

    // phase 3: the filled card
    const card = lay(`padding:${q(16)};display:flex;flex-direction:column;gap:${q(7)};color:var(--x-ink);font-size:${q(11)};`);
    const head = mk("div", `display:flex;align-items:center;gap:${q(10)};margin-bottom:${q(4)}`, card);
    mk("span", `width:${q(30)};height:${q(30)};border-radius:${q(8)};background:var(--x-ink);color:var(--x-panel);display:grid;place-items:center;font:700 ${q(14)} var(--x-head-font);flex:none`, head, name[0]);
    const nm = mk("div", "display:flex;flex-direction:column;flex:1", head);
    mk("b", `font-size:${q(14)}`, nm, name);
    mk("span", `color:var(--x-dim);font-size:${q(10)};direction:ltr;text-align:${rtl ? "right" : "left"}`, nm, domain);
    const ok = mk("span", `background:${A};color:var(--x-accent-ink);border-radius:var(--x-radius-s);padding:${q(6)} ${q(12)};font-weight:600;font-size:${q(10)};flex:none`, head, rtl ? "تمام كده" : "Looks right");
    const fields = [
      mk("b", `font-size:${q(12)}`, card, say("description", "AI skin analysis from one selfie", "تحليل بشرة بالذكاء من سيلفي واحدة")),
      mk("span", `color:var(--x-dim);font-size:${q(9)}`, card, rtl ? "الجمهور" : "Audience"),
      mk("span", "", card, rtl ? "ناس بتعاني من حبوب وجفاف" : "People fighting acne and dry skin"),
    ];
    const tagRow = mk("div", `display:flex;gap:${q(6)};flex-wrap:wrap;margin-top:${q(4)}`, card);
    const tags = (rtl ? ["حبوب", "بشرة جافة", "تحليل", "روتين"] : ["acne", "dry skin", "skin analysis", "skincare routine"]).map((x) => mk("span", `background:var(--x-panel-2);border-radius:var(--x-radius-s);padding:${q(4)} ${q(10)};font-size:${q(9)};transform-origin:center`, tagRow, x));

    // the beat, stretched to the time it has
    const need = p.phases === "full" ? 3.3 : p.phases === "processing+skeleton" ? 2.4 : 1.9;
    const z = ML.clamp((end - at - 0.5) / need, 0.6, 1.3);
    const T = (x) => at + x * z;
    const t1 = T(0.25), t2 = T(0.6), tp0 = T(0.55), tp1 = tp0 + 1.0 * z, tk = T(1.75), tk1 = tk + 0.3 * z, tc = T(2.2);
    const stop = p.phases === "full" ? 3 : p.phases === "processing+skeleton" ? 2 : 1;
    ctx.sfx(t1, "click", 0.4);
    if (stop >= 2) ctx.sfx(tk, "whoosh.soft", 0.25);
    if (stop >= 3) { ctx.sfx(tc, "success", 0.4); tags.forEach((_, i) => i % 2 === 0 && ctx.sfx(tc + (0.4 + i * 0.08) * z, "pop.soft", 0.15)); }
    else ctx.sfx(tp1, "blip", 0.3);
    const W = [320, 260, 320], H = [44, 40, 170], RAD = [22, 20, 14];
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        const inA = ML.out(t, at, at + 0.25);
        layer.style.visibility = t >= at - 1e-6 && leave < 1 ? "visible" : "hidden";
        layer.style.opacity = (inA * (1 - leave)).toFixed(4);
        const m1 = ML.ease(t, t1, t2); // bar → pill
        const m2 = stop >= 2 ? ML.out(t, tk, tk1) : 0; // pill → card
        const w = W[0] + (W[1] - W[0]) * m1 + (W[2] - W[1]) * m2, h = H[0] + (H[1] - H[0]) * m1 + (H[2] - H[1]) * m2;
        const r = RAD[0] + (RAD[1] - RAD[0]) * m1 + (RAD[2] - RAD[1]) * m2;
        shell.style.width = q(w); shell.style.height = q(h); shell.style.borderRadius = q(r);
        shell.style.translate = `${(-w * s) / 2}px ${(-h * s) / 2}px`;
        const dark = m1 * (1 - m2);
        shell.style.background = `color-mix(in srgb, var(--x-ink) ${(dark * 100).toFixed(1)}%, var(--x-panel))`;
        const mb = Math.sin(Math.PI * m1) * 2.5 + Math.sin(Math.PI * m2) * 2;
        shell.style.filter = mb > 0.05 ? `blur(${(mb * s * 0.4).toFixed(2)}px)` : "none";
        const press = ML.pulse(t, t1, 0.05, 0.12);
        shell.style.scale = (1 - 0.03 * press).toFixed(4);
        bar.style.opacity = (1 - ML.clamp(m1 * 2.2)).toFixed(4);
        pill.style.opacity = (ML.clamp(m1 * 2 - 0.8) * (1 - ML.clamp(m2 * 3))).toFixed(4);
        prog.style.transform = `scaleX(${ML.lin(t, tp0, tp1).toFixed(4)})`;
        const sk = ML.clamp(m2 * 2 - 0.6) * (stop >= 3 ? 1 - ML.lin(t, tc, tc + 0.2 * z) : 1);
        skel.style.opacity = sk.toFixed(4);
        shim.style.opacity = (0.55 + 0.45 * Math.sin((t - tk) * 9)).toFixed(4);
        const c = stop >= 3 ? ML.lin(t, tc, tc + 0.2 * z) : 0;
        card.style.opacity = c.toFixed(4);
        head.style.opacity = c.toFixed(4);
        ok.style.scale = (stop >= 3 ? Math.max(0, ML.back(t, tc + 0.1 * z, tc + 0.35 * z, 2)) : 0).toFixed(4);
        fields.forEach((e, i) => { const u = ML.out(t, tc + (0.12 + i * 0.08) * z, tc + (0.42 + i * 0.08) * z); e.style.opacity = u.toFixed(4); e.style.translate = `0 ${q((1 - u) * 8)}`; });
        tags.forEach((e, i) => { const u = ML.back(t, tc + (0.4 + i * 0.08) * z, tc + (0.62 + i * 0.08) * z, 2); e.style.scale = Math.max(0, u).toFixed(4); e.style.opacity = ML.clamp(u * 3).toFixed(4); });
      },
    };
  },
});
