// Results panel expands with a scanning line. Under an input a panel grows 0 → its height (power3.out, 0.5 s), its header
// row fades in, then a thin accent line with a glow sweeps the first row across its width over 0.6 s, the text revealed
// behind it (a clip following the line; right to left in Arabic). The other rows fade in 0.1 s apart. With scan
// "vertical" the line falls down the whole body instead, revealing every row behind it. A target (a list or a screen)
// is the panel itself and its children the rows; alone it builds an input and a panel with `rows` rows.
// Source: prompt-motion tstfully "this is insane with…" (reference only, our own rebuild).
ML.define({
  id: "ui.panel-expand-scan-reveal",
  category: "ui",
  name: "Results panel expands with a scanning line",
  does: "Under the input, a panel grows downward and a scan line sweeps across as the first result row appears.",
  says: ["result", "speed", "tech"],
  energy: 3,
  targets: ["screen", "list"],
  duration: [1, 2],
  params: {
    scan: { type: "choice", options: ["horizontal", "vertical"], default: "horizontal" },
    rows: { type: "number", range: [1, 6], default: 3 },
    query: { type: "text" },
    items: { type: "text" },
  },
  pairs: ["ui.input-type-submit", "ui.list-rows-stagger"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "riser",
  source: { from: "prompt-motion:tstfully-this-is-insane-with", license: "reference", note: "our own code" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, host = ctx.scene || stage;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080, vertical = p.scan === "vertical";
    const power3 = (x) => 1 - Math.pow(1 - x, 4);
    const L = rtl
      ? { query: "ازاي أقسّط من غير فوايد؟", go: "ابحث", head: "النتايج", count: "٠٫٤ ثانية", rows: ["اختار الخطة اللي تناسبك", "الدفعة الأولى من ٤,٥٠٠", "من غير ورق ولا فوايد", "الموافقة في دقيقتين", "ادفع على ١٢ شهر", "إلغاء مجاني في أي وقت"] }
      : { query: "How do I split a payment?", go: "Search", head: "Results", count: "0.4 sec", rows: ["Pick the plan that fits you", "First payment from 4,500", "No interest, no paperwork", "Approved in two minutes", "Pay over twelve months", "Cancel free at any time"] };
    const items = p.items ? String(p.items).split(/\s*[,،|]\s*/).filter(Boolean) : L.rows;
    const target = el && el !== stage ? el : null;

    let panel, c, rowsEls, headEl = null, input = null, layer = null;
    if (target) {
      panel = c = target;
      if (getComputedStyle(c).position === "static") c.style.position = "relative";
      if (!c.children.length) { const r = mk("", null, c.textContent); c.replaceChildren(r); }
      rowsEls = [...c.children];
    } else {
      const n = Math.round(ML.clamp(p.rows, 1, 6)), R = f.pic;
      const u = Math.min(R.w / 560, 2.1 * k, R.h / (56 + 12 + 34 + n * 40 + 22));
      const H = (56 + 12 + 34 + n * 40 + 22) * u;
      layer = mk(`position:absolute;left:${(R.x + (R.w - 560 * u) / 2).toFixed(1)}px;top:${(R.y + (R.h - H) / 2).toFixed(1)}px;width:${(560 * u).toFixed(1)}px;display:flex;flex-direction:column;gap:${(12 * u).toFixed(1)}px;z-index:6;pointer-events:none;color:var(--x-ink);font-family:var(--x-body-font);`, host);
      input = mk(`box-sizing:border-box;height:${(56 * u).toFixed(1)}px;display:flex;align-items:center;gap:${(10 * u).toFixed(1)}px;padding:0 ${(8 * u).toFixed(1)}px 0 ${(8 * u).toFixed(1)}px;padding-inline-start:${(18 * u).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, layer);
      mk(`flex:1;min-width:0;white-space:nowrap;overflow:hidden;font-size:${(17 * u).toFixed(1)}px;`, input, p.query || L.query);
      mk(`flex:none;padding:${(9 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.6);background:var(--x-accent);color:var(--x-accent-ink);font-size:${(15 * u).toFixed(1)}px;font-weight:600;`, input, L.go);
      panel = mk(`box-sizing:border-box;overflow:hidden;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, layer);
      headEl = mk(`display:flex;justify-content:space-between;align-items:center;height:${(34 * u).toFixed(1)}px;padding:0 ${(18 * u).toFixed(1)}px;border-bottom:var(--x-edge) solid var(--x-edge-color);`, panel);
      mk(`font:var(--x-label-weight) ${(12 * u).toFixed(1)}px var(--x-label-font);color:var(--x-dim);`, headEl, L.head);
      mk(`font:var(--x-label-weight) ${(12 * u).toFixed(1)}px var(--x-label-font);color:var(--x-dim);`, headEl, L.count);
      c = mk(`position:relative;padding:${(10 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px;`, panel);
      rowsEls = Array.from({ length: n }, (_, i) => {
        const r = mk(`display:flex;align-items:center;gap:${(14 * u).toFixed(1)}px;height:${(40 * u).toFixed(1)}px;font-size:${(17 * u).toFixed(1)}px;white-space:nowrap;`, c);
        mk(`flex:none;direction:ltr;font:500 ${(13 * u).toFixed(1)}px var(--x-mono-font);color:var(--x-accent);`, r, `00:${String(4 + i * 7).padStart(2, "0")}`);
        r.append(items[i % items.length]);
        return r;
      });
    }
    const fullH = panel.offsetHeight, bodyH = c.offsetHeight;
    const first = rowsEls[0], rowTop = first.offsetTop, rowLeft = first.offsetLeft, rowW = first.offsetWidth, rowH = first.offsetHeight;

    // the line and the faint light it drags behind it
    const th = Math.max(2, 2 * k), trailL = 70 * k;
    const line = mk(`position:absolute;z-index:3;pointer-events:none;background:var(--x-accent);box-shadow:0 0 ${(8 * k).toFixed(1)}px var(--x-accent), 0 0 ${(26 * k).toFixed(1)}px color-mix(in srgb, var(--x-accent) 60%, transparent);`, c);
    const trail = mk("position:absolute;pointer-events:none;", line);
    if (vertical) {
      line.style.cssText += `left:0;width:100%;top:0;height:${th}px;`;
      trail.style.cssText += `left:0;right:0;bottom:100%;height:${trailL}px;background:linear-gradient(to top, color-mix(in srgb, var(--x-accent) 22%, transparent), transparent);`;
    } else {
      line.style.cssText += `top:${rowTop}px;height:${rowH}px;width:${th}px;left:0;`;
      trail.style.cssText += `top:0;bottom:0;width:${trailL}px;${rtl ? "left:100%" : "right:100%"};background:linear-gradient(to ${rtl ? "right" : "left"}, color-mix(in srgb, var(--x-accent) 22%, transparent), transparent);`;
    }

    // timing: squeezed evenly when the scene gives less room than the full run
    const t0 = at + (input ? 0.14 : 0);
    const need = 0.5 + 0.6 + (vertical ? 0 : 0.1 * Math.max(0, rowsEls.length - 1)) + 0.25;
    const sq = Math.min(1, Math.max(0.4, (end - 0.3 - t0) / need));
    const grow = 0.5 * sq, scanA = t0 + grow, scanB = scanA + 0.6 * sq, rowDT = 0.1 * sq;
    ctx.sfx(t0, "riser", 0.3);
    if (!vertical && rowsEls.length > 1) ctx.sfx(scanB, "tap", 0.2);

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        if (layer) {
          const e = ML.out(t, at, at + 0.2);
          layer.style.visibility = t < at ? "hidden" : "visible";
          layer.style.opacity = (e * (1 - leave)).toFixed(4);
          input.style.translate = `0 ${((1 - e) * 10 * k).toFixed(2)}px`;
        } else {
          panel.style.visibility = t < t0 ? "hidden" : "visible";
          panel.style.opacity = (1 - leave).toFixed(4);
        }
        const g = power3(ML.lin(t, t0, t0 + grow));
        panel.style.height = `${(g * fullH).toFixed(2)}px`;
        panel.style.overflow = "hidden";
        panel.style.borderWidth = g <= 0 ? "0" : "";
        if (headEl) headEl.style.opacity = ML.out(t, t0 + grow * 0.4, t0 + grow).toFixed(4);
        const u = ML.lin(t, scanA, scanB);
        line.style.opacity = (ML.lin(t, scanA - 0.02, scanA + 0.05) * (1 - ML.lin(t, scanB - 0.02, scanB + 0.1))).toFixed(4);
        if (vertical) {
          line.style.translate = `0 ${(u * bodyH).toFixed(2)}px`;
          rowsEls.forEach((r) => {
            const a = (r.offsetTop / bodyH), b = (r.offsetTop + r.offsetHeight) / bodyH, v = ML.clamp((u - a) / (b - a));
            r.style.clipPath = v >= 1 ? "none" : `inset(0 0 ${((1 - v) * 100).toFixed(2)}% 0)`;
          });
        } else {
          line.style.translate = `${(rowLeft + (rtl ? 1 - u : u) * rowW).toFixed(2)}px 0`;
          first.style.clipPath = u >= 1 ? "none" : rtl ? `inset(0 0 0 ${((1 - u) * 100).toFixed(2)}%)` : `inset(0 ${((1 - u) * 100).toFixed(2)}% 0 0)`;
          rowsEls.slice(1).forEach((r, i) => {
            const a = scanB + i * rowDT, v = ML.out(t, a, a + 0.25 * sq);
            r.style.opacity = v.toFixed(4);
            r.style.translate = v < 1 ? `0 ${((1 - v) * 8 * k).toFixed(2)}px` : "none";
          });
        }
      },
    };
  },
});
