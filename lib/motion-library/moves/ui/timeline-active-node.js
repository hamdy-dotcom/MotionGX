// Timeline active event lift: a vertical day timeline — rows of mono time | node on a 1 px rail | content. Past rows
// sit at 50 % with a line-through; an inactive node is a dark well with a faint ring and an inset shadow. The active
// node lights in the accent with a soft glow and an inset highlight, its time turns full ink, and its content becomes a
// moulded card (a top-lit gradient, a ring, an inset top highlight, 0 6px 12px shadow, lifted 10 px into the row
// above) carrying a mono chip ("SYNC"). Transfer: the node glows in 0.3 s, the card scales 0.96 → 1 while its shadow
// grows in 0.4 s (power2.out), and the previous active row de-lifts and becomes past.
// Source: MengTo/Skills web-design/high-contrast-skeuomorphic-clean demo (MIT) — the timeline column, rebuilt on the
// look variables (dark well / lit card in the look's ink and panel, the accent for the live node).
ML.define({
  id: "ui.timeline-active-node",
  category: "ui",
  name: "Timeline active event lift",
  does: "On a vertical day timeline, the current event's node lights up and its card lifts out of the list.",
  says: ["time", "step", "focus", "list"],
  energy: 2,
  targets: ["list", "card"],
  duration: [0.5, 4],
  params: {
    events: { type: "number", range: [3, 6], default: 4 },
    chip: { type: "text", default: "SYNC" },
    past_strike: { type: "bool", default: true },
    theme: { type: "choice", options: ["dark", "light"], default: "dark" },
    advance: { type: "choice", options: ["step", "single"], default: "step" },
    step_gap: { type: "number", range: [0.6, 2], default: 1, unit: "s" },
  },
  pairs: ["ui.list-row-highlight", "ui.live-pill-dot", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/high-contrast-skeuomorphic-clean", license: "MIT", note: "timeline column of the demo, rebuilt on look variables" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // the events: the target's own items when it is a list, else a day of defaults
    const own = el ? [...el.children].map((c) => (c.textContent || "").trim()).filter(Boolean) : [];
    const DEF = rtl
      ? [["رحلة الصباح", "أحمد • مترو ٤"], ["اجتماع المنتج", "عن بعد • سارة"], ["مراجعة التصميم", "الاستوديو • منى"], ["مكالمة العميل", "زووم • كريم"], ["إطلاق الحملة", "الفريق • الكل"], ["ملخص اليوم", "بريد • أنت"]]
      : [["Commute route", "Jordan • Transit 4"], ["Product sync", "Remote • Alex"], ["Design review", "Studio • Maya"], ["Client call", "Zoom • Sam"], ["Campaign launch", "Team • All"], ["Day wrap-up", "Email • You"]];
    // a real list stands alone: its own rows only, nothing invented beside them; the defaults are all-or-nothing
    const useOwn = own.length >= 2;
    const n = useOwn ? Math.min(own.length, 6) : Math.round(ML.clamp(p.events, 3, 6));
    const items = Array.from({ length: n }, (_, i) => (useOwn ? [own[i], ""] : DEF[i]));
    const TIMES = ["08:30", "11:00", "13:15", "15:30", "17:45", "19:00"];

    // where it sits: inside a big target, else over the picture region
    let host, R;
    if (el && el.clientWidth > 420 && el.clientHeight > 300) { if (getComputedStyle(el).position === "static") el.style.position = "relative"; host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }; }
    else { host = ctx.scene || ctx.stage; R = f.pic; if (el && useOwn) el.style.visibility = "hidden"; } // its rows moved into the timeline

    const dark = p.theme === "dark";
    const surf = dark ? "color-mix(in srgb, var(--x-ink) 90%, var(--x-panel))" : "var(--x-panel)";
    const well = dark ? "color-mix(in srgb, var(--x-ink) 96%, var(--x-ground))" : "var(--x-panel-2)";
    const ink = dark ? "var(--x-panel)" : "var(--x-ink)";
    const dim = dark ? "color-mix(in srgb, var(--x-panel) 52%, transparent)" : "var(--x-dim)";
    const rail = dark ? "color-mix(in srgb, var(--x-panel) 16%, transparent)" : "var(--x-line)";
    const cardTop = dark ? "color-mix(in srgb, var(--x-ink) 84%, var(--x-panel))" : "var(--x-panel)";
    const cardBot = dark ? "color-mix(in srgb, var(--x-ink) 92%, var(--x-panel))" : "var(--x-panel-2)";

    const rowH = Math.min(150 * k, (R.h * 0.86) / (n + 0.6));
    const W = Math.min(R.w * 0.94, 860 * k * (f.wide ? 1.05 : 1));
    const fsT = Math.max(14, rowH * 0.19), fsTitle = Math.max(16, rowH * 0.25), fsSub = Math.max(12, rowH * 0.17);
    const pad = rowH * 0.32;
    const H = n * rowH + pad * 2;
    const wrap = mk("div", `position:absolute;left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${(R.y + Math.max(0, (R.h - H) / 2)).toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;z-index:6;pointer-events:none;box-sizing:border-box;padding:${pad.toFixed(1)}px ${(pad * 1.1).toFixed(1)}px;border-radius:var(--x-radius);background:linear-gradient(to bottom, ${cardTop}, ${surf});box-shadow:inset 0 1px 0 color-mix(in srgb, var(--x-panel) ${dark ? 6 : 60}%, transparent), 0 0 0 var(--x-edge) ${rail}, 0 ${(14 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) ${dark ? 45 : 12}%, transparent);display:flex;flex-direction:column;`, host);
    wrap.dir = rtl ? "rtl" : "ltr";

    const nodeD = Math.max(8, rowH * 0.13);
    // the chip speaks the film's language; Arabic letters join, so it is never letter-spaced
    const chipText = (!p.chip || p.chip === "SYNC") && rtl ? "مزامنة" : p.chip || "SYNC";
    const chipType = ML.ARABIC.test(chipText) ? "letter-spacing:0;" : "letter-spacing:0.16em;text-transform:uppercase;";
    const rows = items.map(([title, sub], i) => {
      const row = mk("div", `position:relative;display:flex;gap:${(rowH * 0.2).toFixed(1)}px;height:${rowH.toFixed(1)}px;`, wrap);
      const time = mk("div", `flex:none;width:${(fsT * 3.4).toFixed(1)}px;font:500 ${fsT.toFixed(1)}px var(--x-mono-font);color:${dim};padding-top:${(rowH * 0.06).toFixed(1)}px;direction:ltr;text-align:${rtl ? "right" : "left"};`, row, TIMES[i]);
      const col = mk("div", `position:relative;flex:none;width:${nodeD.toFixed(1)}px;`, row);
      if (i < n - 1) mk("div", `position:absolute;top:${(rowH * 0.06 + nodeD).toFixed(1)}px;left:50%;width:${Math.max(1, 2 * k).toFixed(1)}px;margin-left:${(-Math.max(1, 2 * k) / 2).toFixed(1)}px;height:${rowH.toFixed(1)}px;background:${rail};`, col);
      const node = mk("div", `position:absolute;top:${(rowH * 0.1).toFixed(1)}px;left:0;width:${nodeD.toFixed(1)}px;height:${nodeD.toFixed(1)}px;border-radius:50%;box-sizing:border-box;`, col);
      const content = mk("div", `position:relative;flex:1;min-width:0;align-self:flex-start;border-radius:calc(var(--x-radius) * 0.45);padding:${(rowH * 0.04).toFixed(1)}px 0;`, row);
      const lift = mk("div", `position:absolute;inset:${(-rowH * 0.1).toFixed(1)}px ${(-rowH * 0.12).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.45);background:linear-gradient(to bottom, ${cardTop}, ${cardBot});opacity:0;`, content);
      const head = mk("div", `position:relative;display:flex;justify-content:space-between;align-items:center;gap:0.6em;`, content);
      const tEl = mk("div", `font:400 ${fsTitle.toFixed(1)}px var(--x-body-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration-thickness:${Math.max(1, 2 * k).toFixed(1)}px;`, head, title);
      const chip = mk("span", `flex:none;font:600 ${(fsSub * 0.9).toFixed(1)}px var(--x-mono-font);${chipType}color:${dark ? "var(--x-accent-2)" : "var(--x-accent)"};background:${well};padding:0.2em 0.6em;border-radius:min(var(--x-radius), 0.35em);box-shadow:inset 0 1px 2px color-mix(in srgb, var(--x-device) 50%, transparent), 0 0 0 var(--x-edge) ${rail};opacity:0;`, head, chipText);
      const sEl = !sub ? null : mk("div", `position:relative;font:300 ${fsSub.toFixed(1)}px var(--x-body-font);color:${dim};margin-top:${(rowH * 0.06).toFixed(1)}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, content, sub);
      return { row, time, node, content, lift, tEl, chip, sEl };
    });

    // which row is live when: the first lights at `at`, then (step) the live row moves on every step_gap seconds
    const first = Math.min(1, n - 1);
    const keys = [[at + 0.12, first]];
    if (p.advance === "step") {
      const gap = ML.clamp(p.step_gap, 0.6, 2);
      for (let i = first + 1, tk = at + 0.12 + gap; i < n && tk < end - 0.5; i++, tk += gap) keys.push([tk, i]);
    }
    keys.forEach(([tk]) => ctx.sfx(tk, "tap", 0.22));
    ctx.sfx(at, "whoosh.soft", 0.12);
    const p2 = (x) => 1 - (1 - x) * (1 - x);

    return {
      draw(t) {
        const inn = ML.out(t, at - 0.1, at + 0.35), leave = ML.lin(t, end - 0.25, end);
        wrap.style.opacity = (inn * (1 - leave)).toFixed(4);
        wrap.style.translate = `0 ${((1 - inn) * 24 * k - leave * 16 * k).toFixed(2)}px`;
        // the live row now and since when; the row before it, and since when it let go
        let ki = -1; for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) ki = i;
        const act = ki >= 0 ? keys[ki][1] : -1, since = ki >= 0 ? keys[ki][0] : 0;
        const prev = ki > 0 ? keys[ki - 1][1] : -1;
        rows.forEach((r, i) => {
          const g = i === act ? ML.lin(t, since, since + 0.3) : i === prev ? 1 - ML.lin(t, since, since + 0.3) : 0;
          const c = i === act ? p2(ML.lin(t, since, since + 0.4)) : i === prev ? 1 - p2(ML.lin(t, since, since + 0.4)) : 0;
          const past = (act >= 0 ? i < act : i < first) && p.past_strike;
          // node: dark well → lit accent with glow
          r.node.style.background = g > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(g * 100).toFixed(1)}%, ${well})` : well;
          r.node.style.boxShadow = `0 0 0 ${Math.max(1, 1.5 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent-2) ${(g * 100).toFixed(1)}%, ${rail}), 0 0 ${(nodeD * 1.1).toFixed(1)}px color-mix(in srgb, var(--x-accent) ${(g * 60).toFixed(1)}%, transparent), inset 0 1px ${g > 0.5 ? "1px color-mix(in srgb, var(--x-accent-ink) 80%, transparent)" : "2px color-mix(in srgb, var(--x-device) 80%, transparent)"}`;
          // time
          r.time.style.color = g > 0.5 ? ink : dim;
          // content: plain row → moulded card, lifted into the row above
          r.lift.style.opacity = c.toFixed(4);
          r.lift.style.scale = (0.96 + 0.04 * c).toFixed(4);
          r.lift.style.boxShadow = `0 0 0 var(--x-edge) ${rail}, inset 0 1px 0 color-mix(in srgb, var(--x-panel) ${dark ? 5 : 70}%, transparent), 0 ${(6 * k * c).toFixed(1)}px ${(12 * k * c).toFixed(1)}px color-mix(in srgb, var(--x-device) ${(40 * c).toFixed(1)}%, transparent)`;
          r.content.style.translate = `0 ${(-10 * k * c).toFixed(2)}px`;
          r.content.style.zIndex = c > 0.01 ? "2" : "0";
          r.chip.style.opacity = ML.clamp(c * 1.4 - 0.4).toFixed(4);
          r.tEl.style.color = c > 0.5 ? ink : past ? dim : ink;
          r.tEl.style.textDecoration = past && c < 0.5 ? "line-through" : "none";
          r.content.style.opacity = past && c < 0.5 ? "0.5" : "1";
        });
      },
    };
  },
});
