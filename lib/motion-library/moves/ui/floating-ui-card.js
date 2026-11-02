// Floating UI card: a small app card (max 260 px at its own scale, radius 12, padding 16, the layered hairline shadow
// 0 2px 3px -1px ink/.1, 0 1px 0 ink/.02, 0 0 0 1px ink/.08) floats over the picture. Header: a 14 px title and a
// three-dot menu (3 × 3 px dots at 40 %). An inner panel (panel-2 at 80 %, radius 8): clock icon, a muted 12 px label and
// the value on the far side; under it a 6 px rounded bar. Then two rows (label muted, value opposite): dates, status or
// owners. Motion: the card rises 24 px and fades in over 0.5 s power3.out, then the bar fills scaleX 0 → value
// (origin at the reading start) over 0.9 s power2.out while the % counts up in sync; the rows stagger in 0.06 s apart.
// Over a picture the director gives (an image slot) the card centres on it; alone it floats in the picture region.
// Source: MengTo/Skills web-design/marquee-loop demo (the progress card, MIT).
ML.define({
  id: "ui.floating-ui-card",
  category: "ui",
  name: "Progress card over photo",
  does: "A small app card floats over a photo and its progress bar fills while the percentage counts up.",
  says: ["proof", "growth", "tech"],
  energy: 2,
  targets: ["card", "number", "image"],
  duration: [1, 2.5],
  params: {
    value: { type: "number", range: [0, 100], default: 92, unit: "%" },
    rows: { type: "choice", options: ["dates", "status", "owners"], default: "dates" },
    position: { type: "choice", options: ["centre", "offset"], default: "centre" },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    title: { type: "text", default: "Product & App" },
    label: { type: "text", default: "Project process" },
  },
  pairs: ["photo.slow-zoom", "data.count-up"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "MengTo/Skills:web-design/marquee-loop", license: "MIT", note: "progress card markup from the demo, motion ours on one clock" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const sv = (tag, attrs, parent) => { const e = doc.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v); parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const host = ctx.scene || ctx.stage;
    // where it floats: over a picture the director gave, else the picture region
    const over = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName === "IMG" ? ctx.box(ctx.el) : f.pic;
    const layer = mk("div", `position:absolute;left:${over.x}px;top:${over.y}px;width:${over.w}px;height:${over.h}px;display:flex;align-items:center;justify-content:${p.position === "offset" ? (rtl ? "flex-start" : "flex-end") : "center"};padding:0 ${p.position === "offset" ? (over.w * 0.06).toFixed(1) : 0}px;box-sizing:border-box;pointer-events:none;z-index:6;`, host);
    if (p.position === "offset") layer.style.alignItems = "flex-end";

    const dark = p.theme === "dark";
    const BG = dark ? "var(--x-ink)" : "var(--x-panel)", INK = dark ? "var(--x-ground)" : "var(--x-ink)";
    const MUTED = `color-mix(in srgb, ${INK} 45%, ${BG})`;
    const card = mk("div", `--u:1px;width:${U(260)};box-sizing:border-box;padding:${U(16)};border-radius:${U(12)};background:${BG};color:${INK};font-family:var(--x-body-font);box-shadow:0 ${U(2)} ${U(3)} ${U(-1)} color-mix(in srgb, var(--x-ink) 10%, transparent), 0 ${U(1)} 0 color-mix(in srgb, var(--x-ink) 2%, transparent), 0 0 0 ${U(1)} color-mix(in srgb, var(--x-ink) 8%, transparent), 0 ${U(24)} ${U(48)} ${U(-18)} color-mix(in srgb, var(--x-ink) 30%, transparent);`, layer);
    const head = mk("div", `display:flex;align-items:center;justify-content:space-between;margin-bottom:${U(12)};`, card);
    mk("span", `font-size:${U(14)};font-weight:500;letter-spacing:-0.01em;`, head, rtl && p.title === "Product & App" ? "المنتج والتطبيق" : p.title);
    const dots = mk("div", `display:flex;gap:${U(2)};opacity:.4;`, head);
    for (let i = 0; i < 3; i++) mk("span", `width:${U(3)};height:${U(3)};border-radius:50%;background:${INK};`, dots);

    const panel = mk("div", `margin-bottom:${U(16)};border-radius:${U(8)};padding:${U(12)};background:color-mix(in srgb, ${dark ? `${INK} 10%` : "var(--x-panel-2) 80%"}, ${BG});box-shadow:0 0 0 ${U(1)} color-mix(in srgb, ${INK} 5%, transparent);`, card);
    const prow = mk("div", `display:flex;align-items:center;justify-content:space-between;font-size:${U(12)};color:${MUTED};margin-bottom:${U(8)};`, panel);
    const lab = mk("div", `display:flex;align-items:center;gap:${U(6)};`, prow);
    const clock = sv("svg", { viewBox: "0 0 24 24", width: "1.15em", height: "1.15em" }, lab);
    sv("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 1.6 }, clock);
    sv("path", { d: "M12 7.5V12l3 2", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" }, clock);
    lab.append(rtl && p.label === "Project process" ? "تقدّم المشروع" : p.label);
    const num = mk("span", `font-weight:500;color:${INK};font-variant-numeric:tabular-nums;`, prow, "0%");
    const track = mk("div", `height:${U(6)};border-radius:999px;overflow:hidden;background:color-mix(in srgb, ${INK} 12%, ${BG});`, panel);
    const fill = mk("div", `height:100%;width:100%;border-radius:999px;background:color-mix(in srgb, ${INK} 28%, ${BG});transform-origin:${rtl ? "100%" : "0"} 50%;`, track);

    const ROWS = {
      dates: rtl ? ["التحديثات", [["الأخير", "٤ أكتوبر ٢٠٢٥"], ["التالي", "٩ أكتوبر ٢٠٢٥"]]] : ["Updates", [["Last", "Oct 04, 2025"], ["Next", "Oct 09, 2025"]]],
      status: rtl ? ["الحالة", [["المسار", "في الموعد"], ["المخاطر", "منخفضة"]]] : ["Status", [["Track", "On time"], ["Risk", "Low"]]],
      owners: rtl ? ["الفريق", [["المسؤول", "مايا ر."], ["المراجع", "عمر ك."]]] : ["Team", [["Lead", "Maya R."], ["Review", "Omar K."]]],
    }[p.rows] || [];
    const list = mk("div", `display:flex;flex-direction:column;gap:${U(8)};padding-top:${U(4)};font-size:${U(12)};`, card);
    const rows = [mk("div", `color:${MUTED};`, list, ROWS[0])];
    for (const [a, b] of ROWS[1]) { const r = mk("div", "display:flex;justify-content:space-between;align-items:center;", list); mk("span", `color:${MUTED};`, r, a); mk("span", "", r, b); rows.push(r); }

    // fit: the card takes about a third of the short side of the room, never more than the room
    const u = Math.min((Math.min(over.w, over.h * 1.2) * 0.62) / card.offsetWidth, (over.h * 0.88) / card.offsetHeight, (over.w * 0.9) / card.offsetWidth);
    card.style.setProperty("--u", u.toFixed(4) + "px");

    const v = ML.clamp(p.value / 100), b0 = at + 0.5, b1 = b0 + 0.9;
    ctx.sfx(at + 0.12, "land.light", 0.4);
    const p3 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 3), p2 = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const e = p3(t, at, at + 0.5);
        card.style.opacity = (ML.lin(t, at, at + 0.5) * (1 - leave)).toFixed(4);
        card.style.translate = `0 ${((1 - e) * 24 * u).toFixed(2)}px`;
        const q = p2(t, b0, b1);
        fill.style.transform = `scaleX(${(v * q).toFixed(4)})`;
        num.textContent = `${Math.round(p.value * q)}%`;
        rows.forEach((r, i) => { const a = b0 + 0.1 + i * 0.06, x = p3(t, a, a + 0.35); r.style.opacity = ML.lin(t, a, a + 0.35).toFixed(4); r.style.translate = `0 ${((1 - x) * 6 * u).toFixed(2)}px`; });
      },
    };
  },
});
