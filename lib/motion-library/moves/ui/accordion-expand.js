// Accordion expand: rows of a list (FAQ / solutions / spec) sit closed; one opens downward — its panel's height grows
// from 0 to its measured height (nothing pops), the detail lines fade up 8 px on a 0.05 s stagger starting ~0.2 s in,
// and the row's icon changes on the same beat (chevron turns over, + becomes −, or a + chip rotates into ×). In
// "sequence" each row opens in turn (on its spoken word when the voice says it) and the one before closes.
// Sources: MengTo/Skills web-design/operational-enterprise-ai (the 48px | 1fr | auto solution rows with a 1px rule),
// clean-minimal-beige-light-mode + webgl-3d-object (FAQ rows, panel 3px top border, off-white ground, chevron / plus
// icons) (MIT), and MotionGX scenes.js S.notice (the result line: height 0 → auto, marginTop / paddingTop in, +0.2 s).
ML.define({
  id: "ui.accordion-expand",
  category: "ui",
  name: "Accordion / disclosure row expands",
  does: "A row opens downward to reveal its details while its icon flips (chevron turns over, + becomes − or turns into ×).",
  says: ["simplicity", "relief", "trust", "list", "step", "result", "change"],
  energy: 2,
  targets: ["list", "card", "line", "shape"],
  duration: [0.4, 4],
  params: {
    icon: { type: "choice", options: ["chevron-flip", "plus-to-minus", "plus-to-cross", "none"], default: "chevron-flip" },
    content: { type: "choice", options: ["faq-answer", "solution-details", "spec", "confirmation-line"], default: "faq-answer" },
    open: { type: "choice", options: ["one", "sequence"], default: "one" },
    duration: { type: "number", range: [0.3, 0.6], default: 0.42, unit: "s" },
    line_stagger: { type: "number", range: [0, 0.1], default: 0.05, unit: "s" },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    numbered: { type: "bool", default: false },
    detail: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-glide-click", "ui.checklist-tick"],
  avoid: ["energy", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/operational-enterprise-ai", license: "MIT", note: "rows + icons from clean-minimal-beige-light-mode / webgl-3d-object demos; result line from MotionGX scenes.js S.notice" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, html, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.append(e); return e; };
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    let host = ctx.el;
    if (!host) {
      host = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);display:flex;align-items:center;justify-content:center;z-index:4;background:var(--x-ground);font-size:calc(var(--W) * 0.03)", null, ctx.scene || ctx.stage);
    }
    // the rows: the target's items (a list), or its own text (a line), or a sample set
    const kids = ctx.el ? [...ctx.el.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const own = ctx.el && !kids.length ? ctx.el.textContent.trim() : "";
    const titles = kids.length ? kids : own ? [own] : rtl ? ["إزاي بتشتغل؟", "فيه فوايد؟", "أقدر ألغي؟"] : ["How does it work?", "Is there interest?", "Can I cancel?"];
    const details = String(p.detail || "").split("|").map((s) => s.trim()).filter(Boolean);
    const dark = p.theme === "dark";
    const ink = dark ? "var(--x-panel)" : "var(--x-ink)";
    const rule = `color-mix(in srgb, ${ink} 26%, transparent)`;
    const wrap = mk("div", `width:100%;box-sizing:border-box;font-size:max(1em, calc(min(var(--W), var(--H)) * 0.026));color:${ink};${dark ? "background:var(--x-ink);padding:0.4em 1em;border-radius:calc(var(--x-radius) * 0.6);" : ""}`);
    if (ctx.el) ctx.el.replaceChildren(wrap); else { wrap.style.width = "86%"; host.append(wrap); }
    const iconHTML = () => {
      const s = "width:1.15em;height:1.15em;display:block";
      if (p.icon === "chevron-flip") return `<svg viewBox="0 0 24 24" style="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
      if (p.icon === "plus-to-minus") return `<svg viewBox="0 0 24 24" style="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line class="v" x1="12" y1="5" x2="12" y2="19" style="transform-origin:12px 12px"/></svg>`;
      if (p.icon === "plus-to-cross") return `<span style="display:flex;align-items:center;justify-content:center;width:1.6em;height:1.6em;border-radius:50%;border:var(--x-edge) solid ${rule}"><svg viewBox="0 0 24 24" style="width:0.9em;height:0.9em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg></span>`;
      return "";
    };
    const bar = (w) => `<span style="display:block;height:0.5em;width:${w}%;border-radius:0.25em;background:color-mix(in srgb, ${ink} 14%, transparent)"></span>`;
    const linesFor = (i) => {
      const own = details.length ? details : null;
      if (p.content === "confirmation-line") {
        const txt = own ? own[0] : rtl ? "خلاص، اتأكّد" : "Done, confirmed";
        return [`<span style="display:flex;align-items:center;gap:0.5em;color:var(--x-good);font-weight:500"><svg viewBox="0 0 24 24" style="width:1.1em;height:1.1em;flex:none" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${esc(txt)}</span>`];
      }
      if (p.content === "spec") {
        const rows = own ? own.map((x) => x.split(":")) : [[null, 40], [null, 55], [null, 32]].map((r, k) => [null, 30 + ML.rnd(i, k) * 30]);
        return rows.map(([k, v]) => k != null && v != null
          ? `<span style="display:flex;justify-content:space-between;gap:1em;font-family:var(--x-mono-font);font-size:0.78em"><span style="opacity:.6">${esc(k)}</span><span>${esc(v)}</span></span>`
          : `<span style="display:flex;justify-content:space-between;gap:1em;align-items:center">${bar(22)}${bar(+v || 40)}</span>`);
      }
      const dot = p.content === "solution-details";
      const src = own || [92, 78, 54].map((w, k) => w - ML.rnd(i, k + 2) * 18);
      return src.map((x) => {
        const body = typeof x === "string" ? `<span style="font-size:0.82em;line-height:1.45;opacity:.8">${esc(x)}</span>` : bar(x);
        return dot ? `<span style="display:flex;align-items:center;gap:0.6em"><i style="flex:none;width:0.4em;height:0.4em;border-radius:50%;background:var(--x-accent)"></i>${body}</span>` : body;
      });
    };
    const rows = titles.map((title, i) => {
      const row = mk("div", `border-top:var(--x-edge) solid ${rule};${i === titles.length - 1 ? `border-bottom:var(--x-edge) solid ${rule};` : ""}`, null, wrap);
      const head = mk("div", `display:grid;grid-template-columns:${p.numbered ? "2.2em " : ""}1fr auto;align-items:center;gap:0.6em;padding:0.55em 0`, null, row);
      if (p.numbered) mk("span", "font-family:var(--x-mono-font);font-size:0.7em;opacity:.55", String(i + 1).padStart(2, "0"), head);
      mk("span", `font-family:var(--x-head-font);font-weight:var(--x-head-weight);text-transform:var(--x-head-case);letter-spacing:${rtl ? 0 : "-0.01em"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, esc(title), head);
      const ic = mk("span", "display:flex;align-items:center;justify-content:center", iconHTML(), head);
      const panel = mk("div", "overflow:hidden;height:0", null, row);
      const inner = mk("div", `border-top:3px solid ${ink};background:${dark ? "color-mix(in srgb, var(--x-panel) 8%, transparent)" : "var(--x-panel-2)"};padding:0.75em 0.8em;margin-bottom:0.55em;display:grid;gap:0.5em`, null, panel);
      const lines = linesFor(i).map((h) => mk("div", null, h, inner));
      panel.style.height = "auto";
      const H = panel.offsetHeight;
      panel.style.height = "0px";
      const turn = ic.querySelector("svg");
      return { row, panel, H, ic, turn, v: ic.querySelector(".v"), lines, title };
    });
    // when each row opens (and closes again in a sequence)
    const n = rows.length, D = p.duration;
    const gap = ML.clamp((end - at - 1.1) / Math.max(1, n), 0.7, 1.6);
    const opens = rows.map((r, i) => {
      if (p.open === "one" && i > 0) return Infinity;
      const fb = at + 0.45 + i * gap;
      const first = r.title.split(/\s+/)[0];
      return Math.min(end - 0.5, Math.max(fb, ctx.word(first, fb)));
    });
    for (let i = 1; i < n; i++) if (opens[i] !== Infinity) opens[i] = Math.max(opens[i], opens[i - 1] + D + 0.25);
    const closes = rows.map((_, i) => (p.open === "sequence" && i + 1 < n && opens[i + 1] < end ? opens[i + 1] : Infinity));
    opens.forEach((o) => o < end && ctx.sfx(o, "click", 0.4));
    const pow3io = ML.bezier(0.65, 0, 0.35, 1);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (1 - leave).toFixed(4);
        rows.forEach((r, i) => {
          const inU = ML.out(t, at + i * 0.06, at + i * 0.06 + 0.32);
          r.row.style.opacity = inU.toFixed(4);
          r.row.style.translate = `0 ${((1 - inU) * 0.5).toFixed(3)}em`;
          const o = opens[i], c = closes[i];
          const u = pow3io(ML.lin(t, o, o + D)) * (1 - pow3io(ML.lin(t, c, c + D * 0.8)));
          r.panel.style.height = (u * r.H).toFixed(2) + "px";
          const iu = ML.out(t, o, o + 0.3) * (1 - ML.out(t, c, c + 0.3));
          if (p.icon === "chevron-flip" && r.turn) r.turn.style.transform = `rotate(${(-180 * iu).toFixed(2)}deg)`;
          if (p.icon === "plus-to-minus" && r.v) r.v.style.transform = `rotate(${(90 * ML.out(t, o, o + 0.2) * (1 - ML.out(t, c, c + 0.2))).toFixed(2)}deg)`;
          if (p.icon === "plus-to-cross" && r.turn) r.turn.style.transform = `rotate(${(45 * ML.out(t, o, o + 0.35) * (1 - ML.out(t, c, c + 0.35))).toFixed(2)}deg)`;
          r.lines.forEach((ln, k) => {
            const s = o + 0.2 + k * p.line_stagger;
            const lu = ML.out(t, s, s + 0.3) * (1 - ML.lin(t, c, c + 0.15));
            ln.style.opacity = lu.toFixed(4);
            ln.style.translate = `0 ${((1 - lu) * 8).toFixed(2)}px`;
          });
        });
      },
    };
  },
});
