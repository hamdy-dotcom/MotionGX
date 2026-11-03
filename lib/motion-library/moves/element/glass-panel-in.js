// Glass panel frost-in (MengTo/Skills glass-dark-ui + split-layout-technical): a translucent panel with a 1 px
// gradient border (145°, light 20 % → 2 %, cut out with a content-box xor mask), a dark (or light) fill with a faint
// 8 % → 2 % sheen, a deep shadow and an inset top highlight. It enters in 0.8 s on power3.out (rise 22 px, scale .96, or
// slide from the reading side) while the backdrop behind it ramps blur 0 → 18 px and saturate 100 → 140 % over 0.6 s
// (the ramp is what reads as glass); the border lights up 0.25 s in over 0.4 s; the content rises 8 px, 0.08 s apart.
// The info card ends with its emphasis: the arrow nudges +4 / −4 in 0.3 s and its underline brightens. Soft accent orbs
// sit behind the panel so the frost has something to bend (the glass never sits on a bare photo).
// Source: MengTo/Skills agent-skills/web-design/glass-dark-ui/demo/index.html (MIT: the 145° gradient-border mask,
// sheen and inset highlight of .showcase) + split-layout-technical (the info-card arrow / underline emphasis).
ML.define({
  id: "element.glass-panel-in",
  category: "element",
  name: "Glass panel frost-in",
  does: "A translucent glass panel rises into place while the background behind it frosts and its thin gradient border lights up.",
  says: ["luxury", "tech", "calm", "trust", "focus", "arrival"],
  energy: 2,
  targets: ["card", "screen", "label"],
  duration: [1.2, 3],
  params: {
    entrance: { type: "choice", options: ["rise", "scale", "side"], default: "rise" },
    blur: { type: "number", range: [12, 24], default: 18, unit: "px" },
    content: { type: "choice", options: ["info", "price", "quote", "ui"], default: "info" },
    tone: { type: "choice", options: ["dark", "light"], default: "dark" },
    border: { type: "choice", options: ["white", "spectrum"], default: "white" },
    orbs: { type: "bool", default: true },
    title: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "element.framed-bento-assemble"],
  avoid: ["playful", "problem"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/glass-dark-ui/demo/index.html", license: "MIT", note: "also split-layout-technical (info-card emphasis); timings from the master notes" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    const dark = p.tone !== "light";
    const layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
    // the backdrop the glass frosts: the ground with two soft accent orbs (drifting slowly with t)
    const back = mk("div", `position:absolute;inset:0;border-radius:var(--x-radius);overflow:hidden;background:${dark ? "color-mix(in srgb, var(--x-device) 88%, var(--x-accent))" : "var(--x-ground)"};`, layer);
    const orbA = p.orbs ? mk("div", `position:absolute;left:${R.w * 0.08}px;top:${R.h * 0.1}px;width:${R.w * 0.5}px;height:${R.w * 0.5}px;border-radius:50%;background:radial-gradient(closest-side, var(--x-accent), transparent);opacity:.85;`, back) : null;
    const orbB = p.orbs ? mk("div", `position:absolute;left:${R.w * 0.46}px;top:${R.h * 0.42}px;width:${R.w * 0.46}px;height:${R.w * 0.46}px;border-radius:50%;background:radial-gradient(closest-side, var(--x-accent-2), transparent);opacity:.8;`, back) : null;
    // a few crisp marks behind, so the blur ramp reads
    const marks = Array.from({ length: 5 }, (_, i) => mk("div", `position:absolute;left:${R.w * (0.1 + i * 0.18)}px;top:${R.h * (0.2 + ML.rnd(i, 3) * 0.6)}px;width:${R.w * 0.1}px;height:${Math.max(4, 8 * k)}px;border-radius:9px;background:${dark ? "color-mix(in srgb, var(--x-panel) 40%, transparent)" : "color-mix(in srgb, var(--x-ink) 18%, transparent)"};`, back));

    // the panel
    const PW = Math.min(R.w * 0.86, 860 * k * (f.wide ? 1.15 : 1));
    const ink = dark ? "color-mix(in srgb, var(--x-panel) 12%, var(--x-pointer-edge))" : "var(--x-ink)";
    const dim = dark ? "color-mix(in srgb, var(--x-dim) 25%, var(--x-pointer-edge))" : "var(--x-dim)";
    const hair = dark ? "color-mix(in srgb, var(--x-pointer-edge) 14%, transparent)" : "color-mix(in srgb, var(--x-ink) 12%, transparent)";
    const rad = `min(var(--x-radius), ${Math.round(24 * k)}px)`;
    const panel = mk("div", `position:absolute;left:${(R.w - PW) / 2}px;top:0;width:${PW}px;box-sizing:border-box;padding:${36 * k}px ${38 * k}px;border-radius:${rad};overflow:hidden;direction:${rtl ? "rtl" : "ltr"};text-align:${rtl ? "right" : "left"};color:${ink};background:${dark
      ? "linear-gradient(145deg, color-mix(in srgb, var(--x-pointer-edge) 8%, transparent), color-mix(in srgb, var(--x-pointer-edge) 2%, transparent)), color-mix(in srgb, var(--x-device) 45%, transparent)"
      : "linear-gradient(145deg, color-mix(in srgb, var(--x-pointer-edge) 45%, transparent), color-mix(in srgb, var(--x-pointer-edge) 12%, transparent)), color-mix(in srgb, var(--x-panel) 35%, transparent)"};box-shadow:0 ${20 * k}px ${48 * k}px color-mix(in srgb, var(--x-device) 45%, transparent), inset 0 1px 0 color-mix(in srgb, var(--x-pointer-edge) ${dark ? 12 : 60}%, transparent);`, layer);
    // the 1 px gradient border: a padded layer masked to its own ring (content-box xor)
    const ring = mk("div", `position:absolute;inset:0;border-radius:inherit;padding:${Math.max(1, k)}px;background:${p.border === "spectrum"
      ? "linear-gradient(145deg, color-mix(in srgb, var(--x-dim) 60%, transparent), var(--x-accent), var(--x-accent-2))"
      : `linear-gradient(145deg, color-mix(in srgb, var(--x-pointer-edge) ${dark ? 20 : 80}%, transparent), color-mix(in srgb, var(--x-pointer-edge) 2%, transparent))`};-webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);pointer-events:none;`, panel);

    // the content (each row fades up on its own)
    const L = (en, ar) => (rtl ? ar : en);
    const ownText = own && !big ? (own.textContent || "").trim() : "";
    const fsL = Math.max(18, 24 * k), fsT = 58 * k, fsB = Math.max(22, 33 * k);
    const label = (txt) => mk("div", `font:var(--x-label-weight) ${fsL}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:${dim};`, panel, txt);
    const rows = [];
    let arrow = null, under = null;
    if (p.content === "price") {
      rows.push(label(ownText || L("Pro plan", "الخطة الاحترافية")));
      const pr = mk("div", `display:flex;align-items:baseline;gap:${10 * k}px;margin-top:${14 * k}px;`, panel);
      mk("div", `font:var(--x-head-weight) ${fsT * 1.9}px/1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-hero-track)"};`, pr, p.title || L("$29", "٢٩ ج.م"));
      mk("div", `font:var(--x-body-weight) ${fsB}px/1 var(--x-body-font);color:${dim};`, pr, L("/ month", "/ شهريًا"));
      rows.push(pr);
      for (const s of L(["Unlimited projects", "Priority support", "Cancel anytime"], ["مشاريع بلا حدود", "دعم أولوية", "إلغاء في أي وقت"])) {
        const r = mk("div", `display:flex;align-items:center;gap:${12 * k}px;margin-top:${14 * k}px;font:var(--x-body-weight) ${fsB}px/1.3 var(--x-body-font);`, panel);
        mk("span", `width:${10 * k}px;height:${10 * k}px;border-radius:50%;background:var(--x-accent);flex:none;`, r);
        mk("span", "", r, s);
        rows.push(r);
      }
      rows.push(mk("div", `margin-top:${24 * k}px;padding:${14 * k}px;border-radius:999px;text-align:center;background:var(--x-accent);color:var(--x-accent-ink);font:var(--x-head-weight) ${fsB}px/1 var(--x-head-font);`, panel, L("Start now", "ابدأ الآن")));
    } else if (p.content === "quote") {
      rows.push(mk("div", `font:var(--x-head-weight) ${fsT * 2}px/0.7 var(--x-serif-font);color:var(--x-accent);`, panel, rtl ? "”" : "“"));
      rows.push(mk("div", `margin-top:${10 * k}px;font:var(--x-sub-weight) ${fsT * 0.86}px/1.3 var(--x-serif-font);`, panel, p.title || ownText || L("It finally feels calm to pay for things.", "أخيرًا الدفع بقى مريح.")));
      const by = mk("div", `display:flex;align-items:center;gap:${14 * k}px;margin-top:${26 * k}px;`, panel);
      mk("span", `width:${44 * k}px;height:${44 * k}px;border-radius:50%;background:linear-gradient(140deg, var(--x-accent), var(--x-accent-2));flex:none;`, by);
      const nm = mk("div", "", by);
      mk("div", `font:var(--x-head-weight) ${fsB}px/1.2 var(--x-head-font);`, nm, L("Maya R.", "مايا ر."));
      mk("div", `font:var(--x-body-weight) ${fsL}px/1.2 var(--x-body-font);color:${dim};`, nm, L("Customer since 2023", "عميلة منذ ٢٠٢٣"));
      rows.push(by);
    } else if (p.content === "ui") {
      rows.push(label(ownText || L("Overview", "نظرة عامة")));
      for (const [a, b, on] of L([["Auto-pay", "On", 1], ["Reminders", "Weekly", 0], ["Card", "•••• 4242", 0]], [["الدفع التلقائي", "مفعّل", 1], ["التذكيرات", "أسبوعيًا", 0], ["البطاقة", "4242 ••••", 0]])) {
        const r = mk("div", `display:flex;justify-content:space-between;align-items:center;margin-top:${18 * k}px;padding-top:${18 * k}px;border-top:1px solid ${hair};font:var(--x-body-weight) ${fsB}px/1.2 var(--x-body-font);`, panel);
        mk("span", "", r, a);
        if (on) { const sw = mk("span", `position:relative;width:${56 * k}px;height:${30 * k}px;border-radius:999px;background:var(--x-accent);flex:none;`, r); mk("span", `position:absolute;top:${4 * k}px;${rtl ? "left" : "right"}:${4 * k}px;width:${22 * k}px;height:${22 * k}px;border-radius:50%;background:var(--x-accent-ink);`, sw); }
        else mk("span", `color:${dim};font-family:var(--x-mono-font);`, r, b);
        rows.push(r);
      }
    } else {
      rows.push(label(ownText || L("Technical brief", "ملخص تقني")));
      rows.push(mk("div", `margin-top:${14 * k}px;font:var(--x-head-weight) ${fsT}px/1.15 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};`, panel, p.title || L("Depth without noise.", "عمق من غير ضوضاء.")));
      rows.push(mk("div", `margin-top:${14 * k}px;font:var(--x-body-weight) ${fsB}px/1.45 var(--x-body-font);color:${dim};`, panel, L("Frosted surfaces, readable contrast and a border that catches the light.", "أسطح مثلّجة وتباين واضح وحافة بتلقط النور.")));
      const link = mk("div", `display:inline-flex;align-items:center;gap:${10 * k}px;margin-top:${26 * k}px;font:var(--x-head-weight) ${fsB}px/1 var(--x-head-font);`, panel);
      const lt = mk("span", `position:relative;padding-bottom:${6 * k}px;`, link, L("Read the brief", "اقرأ الملخص"));
      under = mk("span", `position:absolute;left:0;right:0;bottom:0;height:${Math.max(1, 1.5 * k)}px;background:${dark ? "var(--x-pointer-edge)" : "var(--x-ink)"};opacity:.25;`, lt);
      arrow = mk("span", `display:inline-block;color:var(--x-accent-2);`, link, rtl ? "↖" : "↗");
      rows.push(link);
    }
    ring.remove(); panel.append(ring); // the border sits above the content
    const PH = panel.offsetHeight;
    const py = Math.max(0, (R.h - PH) / 2);
    panel.style.top = py + "px";
    if (PH > R.h) { const s = R.h / PH; panel.style.transformOrigin = "50% 0"; panel.dataset.fit = String(s); }
    const fitS = PH > R.h ? R.h / PH : 1;

    // times
    const dur = 0.8, tB = at + 0.25, tC = at + 0.3;
    const tEmph = Math.min(at + dur + rows.length * 0.08 + 0.25, end - 0.6);
    const leaveA = Math.max(tEmph + 0.4, end - 0.3);
    const bl = ML.clamp(p.blur, 12, 24) * k;
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 4); // power3.out
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (arrow) ctx.sfx(tEmph, "tap", 0.2);
    const side = rtl ? -1 : 1;

    return {
      draw(t) {
        const leave = ML.clamp((t - leaveA) / 0.28);
        layer.style.visibility = t < at - 0.15 ? "hidden" : "visible";
        layer.style.opacity = (1 - leave).toFixed(4);
        if (own && own.style) { const o = t >= at ? "0" : ""; if (own.style.opacity !== o) own.style.opacity = o; }
        back.style.opacity = ML.out(t, at - 0.15, at + 0.2).toFixed(4);
        if (orbA) orbA.style.translate = `${(Math.sin((t - at) * 0.6) * R.w * 0.03).toFixed(2)}px ${(Math.cos((t - at) * 0.5) * R.h * 0.02).toFixed(2)}px`;
        if (orbB) orbB.style.translate = `${(-Math.sin((t - at) * 0.5) * R.w * 0.03).toFixed(2)}px ${(Math.sin((t - at) * 0.7) * R.h * 0.02).toFixed(2)}px`;
        // entrance
        const u = p3(t, at, at + dur);
        let tx = 0, ty = 0, sc = 1;
        if (p.entrance === "scale") sc = 0.96 + 0.04 * u;
        else if (p.entrance === "side") tx = (1 - u) * 48 * k * -side;
        else ty = (1 - u) * 22 * k;
        panel.style.opacity = ML.lin(t, at, at + dur * 0.6).toFixed(4);
        panel.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${(sc * fitS).toFixed(4)})`;
        // the frost ramp: blur 0 → bl, saturate 100 → 140 % over 0.6 s
        const fr = ML.ease(t, at, at + 0.6);
        const bf = fr > 0.002 ? `blur(${(bl * fr).toFixed(2)}px) saturate(${(100 + 40 * fr).toFixed(1)}%)` : "none";
        panel.style.backdropFilter = bf; panel.style.webkitBackdropFilter = bf;
        ring.style.opacity = ML.ease(t, tB, tB + 0.4).toFixed(4);
        rows.forEach((r, i) => { const c = ML.out(t, tC + i * 0.08, tC + i * 0.08 + 0.45); r.style.opacity = c.toFixed(4); r.style.translate = `0 ${((1 - c) * 8 * k).toFixed(2)}px`; });
        if (arrow) {
          const e = ML.ease(t, tEmph, tEmph + 0.3);
          arrow.style.transform = `translate(${(4 * k * e * side).toFixed(2)}px, ${(-4 * k * e).toFixed(2)}px)`;
          under.style.opacity = (0.25 + 0.35 * e).toFixed(4);
        }
      },
    };
  },
});
