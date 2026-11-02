// List row highlight steps down: the rows of a list light up one at a time — the active title turns accent and nudges
// in by a few px, its divider brightens, and an optional marker (a 3 x 14 bar, a dot or an arrow) slides along to the
// active row (0.35 s power3.inOut); the previous row returns. One row per spoken item (held >= 0.7 s) or a steady step.
// A list laid out in a row gets the same treatment sideways (the marker runs under the items).
// Sources: MengTo/Skills web-design/corner-lasers demo (MIT) — the "Module 01" feature list whose title goes accent and
// divider white/4% -> white/10 on its active row; prompt-motion "ercankeskinx-gave-opus-5-5-a" (reference only).
ML.define({
  id: "ui.list-row-highlight",
  category: "ui",
  name: "List row highlight steps down",
  does: "Rows of a list light up one by one — title turns accent, its divider brightens, and a small side bar slides to the active row.",
  says: ["list", "step", "focus", "choice", "precision"],
  energy: 2,
  targets: ["list"],
  duration: [1, 6],
  params: {
    trigger: { type: "choice", options: ["per-word", "stagger"], default: "per-word" },
    marker: { type: "choice", options: ["none", "side-bar", "dot", "arrow"], default: "side-bar" },
    step: { type: "number", range: [0.4, 1.5], default: 0.7, unit: "s" },
    shift: { type: "number", range: [0, 8], default: 6, unit: "px" },
    counter: { type: "bool", default: false },
    dividers: { type: "bool", default: true },
  },
  pairs: ["ui.list-rows-stagger", "text-emphasis.accent-word"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/corner-lasers/demo/index.html", license: "MIT", note: "active-row recipe; the stepping marker from prompt-motion ercankeskinx-gave-opus-5-5-a (reference)" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const rows = [...el.children].filter((c) => c.nodeType === 1 && c.textContent.trim());
    if (!rows.length) return null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    // vertical list (rows stacked) or a row of items
    const r0 = rows[0].getBoundingClientRect(), r1 = rows[rows.length - 1].getBoundingClientRect();
    const vertical = rows.length < 2 || Math.abs(r1.top - r0.top) > Math.abs(r1.left - r0.left);
    const fsz = parseFloat(getComputedStyle(rows[0]).fontSize) || 28, k = fsz / 18; // the source sizes at an 18 px title
    const dir = rtl ? -1 : 1;
    const items = rows.map((r, i) => {
      const text = r.textContent.trim(); // before the counter joins it
      r.style.color = "var(--x-dim)";
      let div = null;
      if (p.dividers && vertical) div = mk("i", `position:absolute;inset-inline:0;bottom:${(-k * 3).toFixed(1)}px;height:${Math.max(1, k).toFixed(1)}px;background:var(--x-ink);opacity:0.04;pointer-events:none`, r);
      if (div && getComputedStyle(r).position === "static") r.style.position = "relative";
      let num = null;
      if (p.counter) { num = mk("span", `font:var(--x-label-weight) ${(fsz * 0.7).toFixed(1)}px var(--x-mono-font);letter-spacing:var(--x-label-track);margin-inline-end:0.7em;opacity:0.6`, null, String(i + 1).padStart(2, "0")); r.prepend(num); }
      return { r, div, num, text };
    });
    // the marker lives in the list and slides between rows
    let mark = null;
    const markW = (p.marker === "side-bar" ? 2.5 : 6) * k, markH = (p.marker === "side-bar" ? 13 : 6) * k;
    if (p.marker !== "none") {
      const css = p.marker === "arrow"
        ? vertical
          ? `width:0;height:0;border-block:${(markH / 2 + 2 * k).toFixed(1)}px solid transparent;border-inline-start:${(markW + 2 * k).toFixed(1)}px solid var(--x-accent)`
          : `width:0;height:0;border-inline:${(markH / 2 + 2 * k).toFixed(1)}px solid transparent;border-bottom:${(markW + 2 * k).toFixed(1)}px solid var(--x-accent)`
        : p.marker === "dot"
          ? `width:${markH.toFixed(1)}px;height:${markH.toFixed(1)}px;background:var(--x-accent);border-radius:50%`
          : `width:${(vertical ? markW : markH * 1.6).toFixed(1)}px;height:${(vertical ? markH : markW * 0.5).toFixed(1)}px;background:var(--x-accent);border-radius:var(--x-radius-s)`;
      mark = mk("i", `position:absolute;left:0;top:0;pointer-events:none;opacity:0;${css}`, el);
    }
    const lb = el.getBoundingClientRect(), sc = lb.width / (el.offsetWidth || 1) || 1;
    const spots = items.map(({ r }) => {
      const b = r.getBoundingClientRect(), mw = mark ? mark.offsetWidth : 0, mh = mark ? mark.offsetHeight : 0;
      if (vertical) {
        const y = (b.top - lb.top) / sc + b.height / sc / 2 - mh / 2;
        const x = rtl ? (b.right - lb.left) / sc + 10 * k : (b.left - lb.left) / sc - mw - 10 * k;
        return { x, y };
      }
      return { x: (b.left - lb.left) / sc + b.width / sc / 2 - mw / 2, y: (b.bottom - lb.top) / sc + 8 * k };
    });
    // when each row becomes active (a spoken row holds at least 0.7 s)
    // an item of several words lands where the voice says them in a row (ctx.word only matches inside one spoken word)
    const spoken = (text, fb) => {
      const q = text.split(/\s+/).map(ML.plain).filter(Boolean), w = ctx.words || [];
      if (q.length) for (let i = 0; i + q.length <= w.length; i++) if (q.every((x, k) => ML.plain(w[i + k].w).includes(x))) return w[i].t;
      return fb;
    };
    const n = items.length;
    const on = items.map((q, i) => (p.trigger === "per-word" ? Math.max(at + 0.1, spoken(q.text, at + 0.15 + i * p.step)) : at + 0.15 + i * p.step));
    for (let i = 1; i < n; i++) on[i] = Math.max(on[i], on[i - 1] + (p.trigger === "per-word" ? 0.7 : p.step));
    on.forEach((x) => ctx.sfx(x, "tap", 0.3));
    const p3 = (t, a, b) => ML.ease(t, a, b); // power3.inOut
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.3)) / 0.25);
        let cur = -1;
        for (let i = 0; i < n; i++) if (t >= on[i]) cur = i;
        items.forEach((q, i) => {
          const a = on[i], b = i + 1 < n ? on[i + 1] : Infinity;
          const s = (t < a ? 0 : t < b ? ML.out(t, a, a + 0.25) : 1 - ML.out(t, b, b + 0.25)) * (1 - leave); // the list lets go as it ends
          q.r.style.color = s > 0.001 ? `color-mix(in srgb, var(--x-accent) ${(s * 100).toFixed(1)}%, var(--x-dim))` : "var(--x-dim)";
          q.r.style.translate = s > 0.001 ? `${(dir * p.shift * k * s * (vertical ? 1 : 0)).toFixed(2)}px ${vertical ? 0 : (-p.shift * k * 0.5 * s).toFixed(2)}px` : "none";
          if (q.div) q.div.style.opacity = (0.04 + 0.08 * s).toFixed(3);
          if (q.num) q.num.style.opacity = (0.6 + 0.4 * s).toFixed(3);
        });
        if (mark) {
          if (cur < 0) { mark.style.opacity = "0"; return; }
          // slide from the previous row to the current one
          const prev = spots[Math.max(0, cur - 1)], nxt = spots[cur], u = cur === 0 ? 1 : p3(t, on[cur], on[cur] + 0.35);
          const x = prev.x + (nxt.x - prev.x) * u, y = prev.y + (nxt.y - prev.y) * u;
          mark.style.opacity = (ML.clamp((t - on[0]) / 0.2) * (1 - leave)).toFixed(4);
          mark.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
        }
      },
    };
  },
});
