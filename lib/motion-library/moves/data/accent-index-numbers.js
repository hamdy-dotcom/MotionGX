// Accent index numbers: stacked rows, each anchored by a big zero-padded accent number (01 / 02 / 03) with an
// uppercase label at the far side. Rows: flex, align-end, justify-between, a 1 px divider under each. Enter: rows
// stagger 0.12 s, x 24 px → 0 (mirrored in Arabic) with a fade, 0.6 s power3.out; each number either rolls from 00 up
// to its value inside a 1 em mask (0.4 s, stepped) or rises y 100% → 0 in that mask. Hold; leave by fading the rows in
// reverse, 0.06 s apart. On a list the rows are its items (the list is rebuilt as rows in place); on anything else
// the rows replace the slot in place and take `labels` ("a | b | c") or, with none, stand as numbers only; with no slot
// (or the stage) they stand in the picture region. Sizes follow the target's width and the height left around it.
// Source: MengTo/Skills web-design/tailwindcss demo (MIT): the numbered pillar rows.
ML.define({
  id: "data.accent-index-numbers",
  category: "data",
  name: "Accent index numbers",
  does: "Big accent-coloured 01 / 02 / 03 numbers anchor stacked rows, each with an uppercase label at the far side.",
  says: ["list", "step"],
  energy: 2,
  targets: ["list", "number"],
  duration: [1, 2.5],
  params: {
    count: { type: "number", range: [3, 5], default: 3 },
    number_enter: { type: "choice", options: ["roll", "rise"], default: "roll" },
    stagger: { type: "number", range: [0.08, 0.2], default: 0.12, unit: "s" },
    distance: { type: "number", range: [12, 40], default: 24, unit: "px" },
    labels: { type: "text", default: "" },
  },
  pairs: ["data.segment-bars-grow", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/tailwindcss/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    const mk = (tag, css, text, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the labels: the list's own items, else the `labels` param, else none (numbers only)
    let labels = [];
    const slot = el && el !== ctx.stage && el !== ctx.scene ? el : null; // a stage target: its scenes are never rows
    const kids = slot ? [...slot.children].filter((c) => (c.textContent || "").trim()) : [];
    if (kids.length >= 2) labels = kids.map((c) => c.textContent.trim());
    else if (String(p.labels || "").trim()) labels = String(p.labels).split("|").map((s) => s.trim()).filter(Boolean);
    const n = labels.length >= 2 ? Math.min(labels.length, 5) : Math.round(ML.clamp(p.count, 3, 5));
    // the host: the slot itself (rebuilt in place), or a block in the picture region
    let host, width, room = f.pic.h;
    if (slot) {
      // the height the rows may take: the slot's own, plus what its region still has free (measured before rebuilding)
      const region = slot.closest(".ml-pic, .ml-safe"), inner = region && [...region.children].find((c) => c.contains(slot));
      if (region && inner) room = slot.offsetHeight + region.clientHeight - inner.offsetHeight;
      host = slot;
      slot.style.display = "block";
      if (kids.length >= 2) for (const c of kids) c.style.display = "none";
      else slot.textContent = "";
      width = Math.max(slot.clientWidth, Math.min(f.W - 2 * f.m, 520));
    } else {
      const scene = ctx.scene || ctx.stage, hb = ctx.box(scene);
      width = Math.min(f.pic.w, f.wide ? f.pic.w * 0.55 : f.pic.w * 0.9);
      host = mk("div", `position:absolute;left:${(f.pic.x + (f.pic.w - width) / 2 - hb.x).toFixed(1)}px;top:${(f.pic.y - hb.y).toFixed(1)}px;width:${width.toFixed(1)}px;height:${f.pic.h.toFixed(1)}px;display:flex;flex-direction:column;justify-content:center;z-index:12;pointer-events:none`, null, scene);
    }
    // the source's 34 px number / 10 px label / 26 px padding on a ~640 px column, scaled to this column (and capped by the frame height)
    const k = Math.min(width / 640, room / (n * 121), (f.H * 0.62) / (n * 121));
    const numFs = Math.max(30, 68 * k), pad = Math.max(6, 26 * k), labFs = Math.max(16, 26 * k);
    const block = mk("div", `width:${width.toFixed(1)}px;max-width:100%;display:flex;flex-direction:column`, null, host);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const row = mk("div", `display:flex;align-items:flex-end;justify-content:space-between;gap:${(pad * 0.8).toFixed(1)}px;padding:${pad.toFixed(1)}px 0;border-bottom:1px solid var(--x-line)`, null, block);
      const mask = mk("span", `display:inline-block;height:1em;overflow:hidden;font:var(--x-head-weight) ${numFs.toFixed(1)}px/1 var(--x-head-font);color:var(--x-accent);font-variant-numeric:tabular-nums lining-nums;letter-spacing:0;direction:ltr`, null, row);
      const strip = mk("span", "display:block;will-change:transform", null, mask);
      const val = i + 1, pad2 = (v) => String(v).padStart(2, "0");
      // roll: 00, 01 … the value stacked in the mask; rise: only the value
      const steps = p.number_enter === "roll" ? Array.from({ length: val + 1 }, (_, v) => pad2(v)) : [pad2(val)];
      for (const s of steps) mk("span", "display:block;height:1em;line-height:1", s, strip);
      const lab = mk("span", `font-size:${labFs.toFixed(1)}px;line-height:1.2;padding-bottom:${(numFs * 0.06).toFixed(1)}px;color:var(--x-ink);text-align:end`, labels[i] || "", row);
      lab.className = "ml-label";
      lab.style.color = "var(--x-ink)";
      lab.style.fontSize = labFs.toFixed(1) + "px";
      rows.push({ row, strip, steps: steps.length });
    }
    const st = ML.clamp(p.stagger, 0.08, 0.2), dist = ML.clamp(p.distance, 12, 40) * Math.max(1, k * 1.4), dir = rtl ? -1 : 1;
    const p3 = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    const starts = rows.map((_, i) => at + i * st);
    const leaveAt = Math.max(starts[n - 1] + 0.8, end - 0.3 - (n - 1) * 0.06);
    starts.forEach((t, i) => i % 2 === 0 && ctx.sfx(t + 0.1, "tap", 0.22));
    return {
      draw(t) {
        rows.forEach((r, i) => {
          const u = p3(ML.lin(t, starts[i], starts[i] + 0.6));
          const lt = leaveAt + (n - 1 - i) * 0.06, q = ML.lin(t, lt, lt + 0.25);
          r.row.style.opacity = (u * (1 - q)).toFixed(4);
          r.row.style.translate = `${((1 - u) * dist * dir).toFixed(2)}px 0`;
          r.row.style.visibility = t >= starts[i] - 1e-6 ? "visible" : "hidden";
          const nt = starts[i] + 0.1, x = ML.lin(t, nt, nt + 0.4);
          if (r.steps > 1) r.strip.style.transform = `translateY(${-Math.min(r.steps - 1, Math.floor(x * (r.steps - 1) + 1e-6))}em)`; // stepped roll
          else r.strip.style.transform = `translateY(${((1 - p3(x)) * 100).toFixed(2)}%)`; // mask rise
        });
      },
    };
  },
});
