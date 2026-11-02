// Logo pill slides aside as an app panel opens. A pill (icon circle + product name + a small dark badge) fades in
// from blur at the centre (0.4 s); then a light glass sidebar panel (1 px edge, soft shadow) slides in from the side
// on power3.out (0.6 s: x 60 % -> 15 % of its travel), nudging the pill 20 % aside at the same moment; the panel's
// chat-style rows (icon + title + sub) blur in on a 0.06 s stagger and a thumbnail card closes the panel at the
// bottom. On tall shapes the panel rises in under the pill and the pill steps up instead of aside. RTL mirrors the
// side. Rebuilt as our own code from prompt-motion notdwd "stop asking opus" (reference only).
ML.define({
  id: "ui.logo-pill-to-app-panel",
  category: "ui",
  name: "Logo pill slides aside as an app panel opens",
  does: "A logo + name + badge pill sits centred; a sidebar app panel then slides in from the side, nudging the pill aside and revealing chat-style rows.",
  says: ["arrival", "tech", "step"],
  energy: 2,
  targets: ["screen", "card", "logo"],
  duration: [1.2, 2.5],
  params: {
    side: { type: "choice", options: ["left", "right"], default: "right" },
    name: { type: "text" },
    badge: { type: "text" },
    rows: { type: "number", range: [2, 5], default: 4 },
    items: { type: "text" }, // "Title|sub; Title|sub": the panel's rows, over the samples
    panel_at: { type: "number", range: [0.3, 1.2], default: 0.6, unit: "s" },
  },
  pairs: ["ui.cursor-glide-click", "ui.magic-move"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:notdwd-stop-asking-opus-5-5", license: "reference", note: "our own rebuild of the technique; no pixels or assets copied" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // what the pill carries: the target's name / picture, or the param, or a sample
    const img = el && (el.tagName === "IMG" ? el : el.querySelector("img"));
    const ownWords = el ? (el.textContent || "").trim().split(/\s+/).filter(Boolean) : [];
    const own = ownWords.length <= 4 ? ownWords.join(" ") : ""; // a long text is not a name
    const name = String(p.name || "").trim() || own || (rtl ? "مساعد" : "Helper");
    const badge = String(p.badge || "").trim() || (rtl ? "ذكاء" : "AI");

    // the host: the picture region of the scene (the target only lends its name / picture)
    const R = f.pic;
    const host = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;overflow:visible;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    host.dir = rtl ? "rtl" : "ltr";
    const tall = f.tall || f.square || R.h > R.w * 0.9;
    // effective side: RTL mirrors it
    const fromRight = (p.side === "right") !== rtl;
    const dirX = fromRight ? 1 : -1;

    // the pill
    const pill = mk("div", `position:absolute;left:50%;top:50%;display:flex;align-items:center;gap:${px(18)};padding-block:${px(14)};padding-inline:${px(14)} ${px(18)};border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);white-space:nowrap;color:var(--x-ink);`, host);
    const icon = mk("div", `width:${px(68)};height:${px(68)};border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;background:color-mix(in srgb, var(--x-ink) 6%, var(--x-panel));border:var(--x-edge) solid var(--x-edge-color);font:var(--x-head-weight) ${px(32)} var(--x-head-font);color:var(--x-accent);`, pill);
    const mark = !img && el ? (el.tagName.toLowerCase() === "svg" ? el : el.querySelector("svg")) : null;
    if (img && img.src) { const i = mk("img", "width:70%;height:70%;object-fit:contain;", icon); i.src = img.src; }
    else if (mark && !mark.textContent.trim()) { const m = mark.cloneNode(true); m.removeAttribute("data-slot"); m.style.cssText = "width:70%;height:70%;"; icon.append(m); }
    else icon.textContent = Array.from(name)[0] || "•";
    if (el) el.style.visibility = "hidden"; // its name and picture now ride in the pill
    mk("div", `font:600 ${px(40)} var(--x-head-font);letter-spacing:${rtl ? "0" : "var(--x-head-track)"};`, pill, name);
    mk("div", `font:var(--x-label-weight) ${px(20)} var(--x-label-font);font-family:${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "0.06em"};padding:${px(8)} ${px(14)};border-radius:calc(var(--x-radius) * 0.3);background:var(--x-ink);color:var(--x-panel);`, pill, badge);
    const PW = pill.offsetWidth, PH = pill.offsetHeight;

    // the panel
    const panW = tall ? Math.min(R.w * 0.9, 860 * k) : Math.min(R.w * 0.46, 760 * k);
    const panMax = tall ? Math.min(R.h - PH * 1.4, 980 * k) : Math.min(R.h * 0.92, 860 * k);
    const panel = mk("div", `position:absolute;box-sizing:border-box;width:${panW.toFixed(1)}px;max-height:${panMax.toFixed(1)}px;padding:${px(30)};display:flex;flex-direction:column;gap:${px(22)};border-radius:var(--x-radius);background:color-mix(in srgb, var(--x-panel) 93%, transparent);backdrop-filter:blur(${px(18)});border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;color:var(--x-ink);`, host);
    const head = mk("div", `display:flex;align-items:center;justify-content:space-between;font:var(--x-label-weight) ${px(20)} var(--x-label-font);font-family:${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);padding-bottom:${px(14)};border-bottom:var(--x-edge) solid var(--x-line);`, panel);
    mk("span", "", head, rtl ? "المحادثات" : "Threads");
    mk("span", `width:${px(12)};height:${px(12)};border-radius:50%;background:var(--x-good);`, head);
    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => x.split("|").map((y) => y.trim()));
    const samples = rtl
      ? [["خطة الإطلاق", "جاهزة للمراجعة"], ["ملخص الاجتماع", "٣ نقاط مهمة"], ["تصميم الصفحة", "النسخة الثانية"], ["أسئلة العملاء", "١٢ سؤال جديد"], ["تقرير الأسبوع", "تم التحديث"]]
      : [["Launch plan", "Ready for review"], ["Meeting notes", "3 key points"], ["Landing page", "Second draft"], ["Customer questions", "12 new today"], ["Weekly report", "Updated"]];
    given.slice(0, 5).forEach((g, i) => { samples[i] = [g[0], g[1] || ""]; });
    const rows = samples.slice(0, Math.round(ML.clamp(p.rows, 2, 5))).map(([t1, t2], i) => {
      const r = mk("div", `display:flex;align-items:center;gap:${px(18)};padding:${px(12)};border-radius:calc(var(--x-radius) * 0.45);background:${i === 0 ? "color-mix(in srgb, var(--x-accent) 9%, transparent)" : "transparent"};`, panel);
      mk("div", `width:${px(52)};height:${px(52)};flex:none;border-radius:calc(var(--x-radius) * 0.35);background:color-mix(in srgb, ${i % 2 ? "var(--x-accent-2)" : "var(--x-accent)"} ${i === 0 ? 85 : 22}%, var(--x-panel));`, r);
      const col = mk("div", "display:flex;flex-direction:column;min-width:0;", r);
      mk("div", `font:600 ${px(28)} var(--x-body-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, col, t1);
      mk("div", `font:400 ${px(22)} var(--x-body-font);color:var(--x-dim);white-space:nowrap;`, col, t2);
      return r;
    });
    // only the rows that fit the panel stay
    while (rows.length > 2 && panel.scrollHeight > panel.clientHeight + 1) rows.pop().remove();
    const N = rows.length;
    // the thumbnail card at the bottom (drawn, never a photo), in the room the rows leave
    const room = panMax - panel.scrollHeight - 22 * k;
    let thumb = null;
    if (room >= 72 * k) {
      thumb = mk("div", `margin-top:auto;flex:none;height:${Math.min(room, panMax * 0.24, 200 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.5);background:linear-gradient(150deg, var(--x-accent), var(--x-accent-2));position:relative;overflow:hidden;`, panel);
      mk("div", `position:absolute;inset-inline-start:${px(18)};bottom:${px(14)};padding:${px(8)} ${px(16)};border-radius:calc(var(--x-radius) * 0.3);background:var(--x-panel);font:600 ${px(20)} var(--x-body-font);color:var(--x-ink);`, thumb, rtl ? "اعرض الفيديو" : "Watch the film");
    }

    // rest place of the panel inside the host (measured now its rows are in)
    const panH = panel.offsetHeight;
    const restX = tall ? (R.w - panW) / 2 : fromRight ? R.w - panW : 0;
    const restY = tall ? Math.min(R.h - panH, (R.h - panH + PH * 1.3) / 2) : (R.h - panH) / 2;
    panel.style.left = restX.toFixed(1) + "px"; panel.style.top = restY.toFixed(1) + "px";
    // timing
    const tPill = at, tPanel = Math.max(at + 0.2, Math.min(at + p.panel_at, end - 0.9));
    ctx.sfx(tPill, "pop.soft", 0.25);
    ctx.sfx(tPanel, "whoosh.soft", 0.4);
    const p3 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 3); // power3.out
    // pill rest: centred; aside: shifted 20 % of the free side (wide) or up above the panel (tall)
    const asideX = tall ? 0 : -dirX * Math.max(R.w * 0.2, panW / 2);
    const asideY = tall ? restY - PH * 0.75 - R.h / 2 : 0;
    const travel = tall ? panH : panW; // panel slides 60% -> 15% of its own size, landing on its rest

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const a = ML.out(t, tPill, tPill + 0.4);
        const g = p3(t, tPanel, 0.6);
        pill.style.opacity = (t < tPill ? 0 : a * (1 - leave)).toFixed(4);
        pill.style.filter = a < 1 ? `blur(${((1 - a) * 12).toFixed(2)}px)` : "none";
        pill.style.transform = `translate(${(-PW / 2 + asideX * g).toFixed(2)}px, ${(-PH / 2 + asideY * g).toFixed(2)}px)`;
        // the panel: 60% of its size off its rest, home on power3.out
        const off = 0.6 * (1 - g) * travel;
        panel.style.visibility = t < tPanel ? "hidden" : "visible";
        panel.style.opacity = (ML.lin(t, tPanel, tPanel + 0.25) * (1 - leave)).toFixed(4);
        panel.style.transform = tall ? `translateY(${off.toFixed(2)}px)` : `translateX(${(dirX * off).toFixed(2)}px)`;
        rows.forEach((r, i) => {
          const u = ML.out(t, tPanel + 0.25 + i * 0.06, tPanel + 0.6 + i * 0.06);
          r.style.opacity = u.toFixed(4);
          r.style.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(2)}px)` : "none";
          r.style.translate = `0 ${((1 - u) * 10 * k).toFixed(2)}px`;
        });
        if (thumb) {
          const v = ML.out(t, tPanel + 0.35 + N * 0.06, tPanel + 0.8 + N * 0.06);
          thumb.style.opacity = v.toFixed(4);
          thumb.style.translate = `0 ${((1 - v) * 16 * k).toFixed(2)}px`;
        }
      },
    };
  },
});
