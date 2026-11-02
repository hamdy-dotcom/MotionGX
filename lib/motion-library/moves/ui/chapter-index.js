// Chapter index follow: a small numbered list of chapters sits in a corner — a grid of rows, a tabular number (62%)
// and the chapter name; inactive rows at 0.55, the current one at 1 (an opacity ease of 0.25 s). The index switches
// at 39% of each move between chapters (not at 50%), so the label flips just as the new title starts to appear — or
// on the chapter's spoken name. In the opposite corner a technical progress readout counts the move: "u 1.23 / 8.00
// · S2" over "dwell 0.42" / "move 0.31" in small tracked caps. Compact (good for 9:16): only the live row,
// "03 / 05 Name". A soft radial scrim of the ground keeps it legible over anything. Corners mirror in RTL.
// Source: MengTo/Skills web-design/horizontal-scroll-scenes demo.html (MIT): .index / .vol / the dwell-move clock.
ML.define({
  id: "ui.chapter-index",
  category: "ui",
  name: "Chapter index follow",
  does: "A small numbered list of chapters in the corner keeps track of the story, the current chapter fully lit and the rest dimmed, switching as the next chapter arrives.",
  says: ["step", "list", "time", "story"],
  energy: 1,
  targets: ["list", "label"],
  duration: [2, 30],
  params: {
    position: { type: "choice", options: ["br", "bl", "tr"], default: "br" },
    compact: { type: "bool", default: false },
    readout: { type: "bool", default: true },
    chapters: { type: "text", default: "" },
    switch_at: { type: "number", range: [0.2, 0.6], default: 0.39 },
  },
  pairs: ["ui.chapter-rail-tick", "text-in.punchline"],
  avoid: ["urgency", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/horizontal-scroll-scenes", license: "MIT", note: "demo.html .index, .vol readout and the dwell / move clock" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    // the chapters: the text param, the list's items, a label's text (split on , ، |), or a sample set; the target
    // steps aside, the index takes over its words
    const SEP = /\s*[,،|]\s*/;
    const target = el && el !== ctx.stage ? el : null;
    let names = p.chapters ? String(p.chapters).split(SEP).filter(Boolean) : [];
    if (!names.length && target) names = target.children.length >= 2 ? [...target.children].map((c) => c.textContent.trim()).filter(Boolean) : target.textContent.trim().split(SEP).filter(Boolean);
    if (target && names.length) target.style.visibility = "hidden";
    if (!names.length) names = rtl ? ["البداية", "الفكرة", "الخطة", "التنفيذ", "النتيجة"] : ["Opening", "Idea", "Plan", "Build", "Result"];
    const N = names.length;
    const pad = (n) => String(n).padStart(2, "0");
    // where: the chosen corner, mirrored in RTL; the readout in the opposite horizontal corner
    let pos = p.position;
    if (rtl) pos = pos.replace(/[rl]$/, (c) => (c === "r" ? "l" : "r"));
    const right = pos.endsWith("r"), top = pos.startsWith("t");
    const S = f.safe, inset = Math.max(28, 40 * k);
    const side = (r) => (r ? `right:${(f.W - S.x - S.w + inset * 0.2).toFixed(1)}px;` : `left:${(S.x - inset * 0.2).toFixed(1)}px;`);
    const vert = top ? `top:${(S.y + inset * 0.2).toFixed(1)}px;` : `bottom:${(f.H - S.y - S.h + inset * 0.2).toFixed(1)}px;`;
    const host = ctx.scene || ctx.stage;
    const numFs = 24 * k, nameFs = 30 * k, lh = 44 * k;
    const scrim = (box) => mk("div", `position:absolute;z-index:-1;inset:${(-60 * k).toFixed(1)}px;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ground) 78%, transparent), color-mix(in srgb, var(--x-ground) 45%, transparent) 60%, transparent);will-change:opacity`, box);
    const idx = mk("div", `position:absolute;${side(right)}${vert}z-index:7;display:grid;grid-template-columns:auto auto;column-gap:${(18 * k).toFixed(1)}px;align-items:baseline;text-align:${right ? "end" : "start"};color:var(--x-ink);font-family:var(--x-body-font);pointer-events:none;isolation:isolate`, host);
    idx.dir = rtl ? "rtl" : "ltr";
    scrim(idx);
    const rows = names.map((n, i) => {
      const num = mk("span", `font:500 ${numFs.toFixed(1)}px/${lh.toFixed(1)}px var(--x-mono-font);font-variant-numeric:tabular-nums;opacity:.62`, idx, p.compact ? `${pad(i + 1)} / ${pad(N)}` : pad(i + 1));
      const name = mk("span", `font:500 ${nameFs.toFixed(1)}px/${lh.toFixed(1)}px var(--x-body-font);white-space:nowrap`, idx, n);
      return { num, name };
    });
    let ro = null, roMain = null, roSub = null, roScrim = null;
    if (p.readout) {
      const roFs = 22 * k;
      ro = mk("div", `position:absolute;${side(!right)}${vert}z-index:7;font:600 ${roFs.toFixed(1)}px/1.7 var(--x-label-font);letter-spacing:${rtl ? "0" : "0.2em"};text-transform:uppercase;color:var(--x-dim);font-variant-numeric:tabular-nums;text-align:${right ? "start" : "end"};pointer-events:none;white-space:nowrap`, host);
      ro.dir = "ltr";
      roScrim = scrim(ro);
      roMain = mk("div", "", ro, "");
      roSub = mk("div", "", ro, "");
    }
    // the clock: each chapter a dwell (57.5%) then a move (42.5%) — the source's 1.15 / 0.85 — the index flipping at
    // switch_at through the move; a chapter's spoken name pulls its switch onto the word
    const span = Math.max(0.3, (end - at - 0.1) / N), DW = 0.575;
    const sw = names.map((n, i) => (i === 0 ? at : at + span * (i - 1) + span * DW + span * (1 - DW) * p.switch_at));
    for (let i = 1; i < N; i++) { const w = ctx.word(String(names[i]).split(/\s+/).find((x) => ML.plain(x).length > 2) || names[i], -1); if (w > sw[i - 1] + 0.2 && w < end - 0.1) sw[i] = w; }
    for (let i = 1; i < N; i++) sw[i] = Math.max(sw[i], sw[i - 1] + 0.15);
    sw.forEach((x, i) => i > 0 && x < end && ctx.sfx(x, "tap", 0.18));
    const total = end - at;
    return {
      draw(t) {
        const vis = ML.out(t, at, at + 0.4) * (1 - ML.clamp((t - (end - 0.3)) / 0.25));
        idx.style.opacity = vis.toFixed(4);
        // the readout's parts fade one by one; the scrims sit on their own layers, so a fade never re-rasters the scene under them
        if (ro) { roScrim.style.opacity = roMain.style.opacity = vis.toFixed(4); roSub.style.opacity = (vis * 0.72).toFixed(4); }
        let live = 0;
        for (let i = 0; i < N; i++) if (t >= sw[i]) live = i;
        rows.forEach((r, i) => {
          // on-ness eases over 0.25 s from its switch, and off over 0.25 s from the next
          const on = i === 0 ? 1 - ML.ease(t, sw[1] ?? Infinity, (sw[1] ?? Infinity) + 0.25) : ML.ease(t, sw[i], sw[i] + 0.25) * (i + 1 < N ? 1 - ML.ease(t, sw[i + 1], sw[i + 1] + 0.25) : 1);
          if (p.compact) {
            const show = i === live;
            r.num.style.display = r.name.style.display = show ? "" : "none";
            r.name.style.opacity = r.num.style.opacity = show ? Math.max(0.3, on).toFixed(4) : "0";
          } else {
            r.name.style.opacity = (0.55 + 0.45 * on).toFixed(4);
            r.num.style.opacity = (0.62 + 0.38 * on).toFixed(4);
          }
        });
        if (ro) {
          const u = ML.clamp(t - at, 0, total);
          const sc = Math.min(N - 1, Math.floor(u / span)), local = u - span * sc, dw = ML.clamp(local / (span * DW)), mv = sc >= N - 1 ? 0 : ML.clamp((local - span * DW) / (span * (1 - DW)));
          // the text is a function of t; writing it only when it differs leaves the rest of the frame's raster alone
          const main = `u ${u.toFixed(2).padStart(5, "0")} / ${total.toFixed(2)} · S${sc + 1}`, sub = mv > 0 ? `move ${mv.toFixed(2)}` : `dwell ${dw.toFixed(2)}`;
          if (roMain.textContent !== main) roMain.textContent = main;
          if (roSub.textContent !== sub) roSub.textContent = sub;
        }
      },
    };
  },
});
