// Lineup tier cascade: a festival-style list builds top-down over the scene, which sinks behind it under the look's ground (`veil`; 0.7 is the source's 30 %). A banner —
// a panel bar with three look-coloured stripes above it and a bold caps label — drops in (y −10 → 0, 0.3 s); then the
// headliner in extended black caps, the second name, then tiers of smaller names joined by " · " (or " / ", " ★ "),
// sizes stepping down in the source's ratios (48 / 22 / 13 / 11 / 9 / 8, scaled to the frame) with more names per row
// as they shrink. Each row: opacity 0 → 1, blur 4 → 0, colour dim → ink over 0.3 s, `row_stagger` apart. Names come
// from `names` (split on | or new lines), else the list's items; the banner reads `banner_text`, else the scene's
// headline. Centred or start-aligned; RTL reads right to left and keeps Arabic names whole (no letter-spacing).
// Source: prompt-motion:gonzalomacagno-que-locura-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "kinetic.lineup-tier-cascade",
  category: "kinetic",
  name: "Lineup tier cascade",
  does: "A festival-style list builds top-down: banner, huge headliner, second name, then rows of smaller names, each row fading in and getting smaller.",
  says: ["list", "celebration", "scale"],
  energy: 3,
  targets: ["list", "headline"],
  duration: [2, 5],
  params: {
    tiers: { type: "number", range: [3, 8], default: 6 },
    separator: { type: "choice", options: ["dot", "slash", "star"], default: "dot" },
    align: { type: "choice", options: ["center", "start"], default: "center" },
    banner: { type: "bool", default: true },
    row_stagger: { type: "number", range: [0.1, 0.4], default: 0.2, unit: "s" },
    names: { type: "text", default: "" },
    banner_text: { type: "text", default: "" },
    veil: { type: "number", range: [0.5, 0.95], default: 0.82 },
  },
  pairs: ["background.gradient-drift", "accent.ribbon-squiggle"],
  avoid: ["problem", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:gonzalomacagno-que-locura-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl, f } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    // names: the param, else the list's items (its children), else its words
    let names = (p.names || "").split(/\s*(?:\||\n)\s*/).filter(Boolean);
    if (!names.length) names = [...el.children].map((c) => c.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!names.length) names = (el.textContent || "").split(/[,،\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return null;
    const title = host.querySelector(".ml-title, [data-slot='headline']");
    const bannerText = (p.banner_text || (title && title !== el ? title.textContent : "") || "").replace(/\s+/g, " ").trim();
    // rows: headliner, second, then tiers with more names per row as they shrink
    const ratios = [48, 22, 13, 11, 9, 8, 8, 8];
    const maxRows = Math.max(1, Math.min(8, Math.round(p.tiers)));
    const rows = [[names[0]]];
    if (names.length > 1 && maxRows > 1) rows.push([names[1]]);
    let i = 2, per = 3;
    while (i < names.length && rows.length < maxRows) {
      const last = rows.length === maxRows - 1;
      rows.push(names.slice(i, last ? names.length : i + per));
      i += per; per += 1;
    }
    const sep = { dot: " · ", slash: " / ", star: " ★ " }[p.separator] || " · ";
    // the layer: dims the scene to 30 % and holds the poster
    const layer = doc.createElement("div");
    Object.assign(layer.style, { position: "absolute", inset: "0", zIndex: "6", pointerEvents: "none", visibility: "hidden" });
    const veil = doc.createElement("div");
    Object.assign(veil.style, { position: "absolute", inset: "0", background: "var(--x-ground)" });
    layer.append(veil);
    const col = doc.createElement("div");
    const start = p.align === "start";
    Object.assign(col.style, { position: "absolute", left: f.m + "px", width: f.W - f.m * 2 + "px", top: "0", display: "flex", flexDirection: "column", alignItems: start ? "flex-start" : "center", textAlign: start ? "start" : "center", direction: rtl ? "rtl" : "ltr" });
    layer.append(col);
    const unit = Math.min(f.W * 0.11, f.H * 0.085) / 48; // the headliner ≈ 11 % of the width
    let bannerEl = null;
    if (p.banner && bannerText) {
      bannerEl = doc.createElement("div");
      Object.assign(bannerEl.style, { width: start ? "auto" : "min(100%, 34em)", alignSelf: start ? "flex-start" : "center", marginBottom: (unit * 10).toFixed(1) + "px", fontSize: (unit * 12).toFixed(1) + "px" });
      const stripes = doc.createElement("div");
      Object.assign(stripes.style, { height: "0.75em", background: "linear-gradient(var(--x-accent-2) 0 33.3%, var(--x-accent) 0 66.6%, var(--x-good) 0)" });
      const bar = doc.createElement("div");
      bar.textContent = bannerText;
      Object.assign(bar.style, { background: "var(--x-panel)", color: "var(--x-ink)", font: `800 1em / 1 var(--x-head-font)`, letterSpacing: rtl ? "0" : "0.06em", textTransform: rtl ? "none" : "uppercase", padding: "0.55em 1.2em", textAlign: "center", whiteSpace: "nowrap", border: "var(--x-edge) solid var(--x-edge-color)" });
      bannerEl.append(stripes, bar);
      col.append(bannerEl);
    }
    const rowEls = rows.map((r, k) => {
      const d = doc.createElement("div");
      d.textContent = r.join(sep);
      const size = unit * ratios[k];
      const ar = ML.ARABIC.test(d.textContent);
      Object.assign(d.style, {
        font: `${k === 0 ? 900 : k === 1 ? 800 : 700} ${size.toFixed(1)}px / ${k < 2 ? 1.05 : 1.35} var(--x-head-font)`,
        fontStretch: k === 0 ? "125%" : "100%",
        letterSpacing: ar ? "0" : k === 0 ? "0.01em" : "0",
        textTransform: ar || k > 0 ? "none" : "uppercase",
        color: "var(--x-ink)", maxWidth: "100%", textWrap: "balance",
        marginBottom: (k === 0 ? unit * 4 : k === 1 ? unit * 6 : unit * 2).toFixed(1) + "px",
      });
      col.append(d);
      return d;
    });
    host.append(layer);
    // fit: the headliner on one line inside the width, the column inside the safe height
    layer.style.visibility = "visible";
    const room = f.W - f.m * 2;
    rowEls[0].style.whiteSpace = "nowrap";
    const w0 = rowEls[0].offsetWidth;
    if (w0 > room) rowEls[0].style.fontSize = ((unit * 48 * room) / w0).toFixed(1) + "px";
    const ch = col.offsetHeight;
    if (ch > f.safe.h) col.style.zoom = String((f.safe.h / ch).toFixed(4));
    const h = col.offsetHeight * (parseFloat(col.style.zoom) || 1);
    col.style.top = (f.safe.y + (f.safe.h - h) / 2).toFixed(1) + "px";
    layer.style.visibility = "hidden";
    // times: banner, then each row
    const tb = at + 0.05, t0 = at + (bannerEl ? 0.3 : 0.05);
    const times = rowEls.map((_, k) => t0 + k * p.row_stagger);
    if (bannerEl) ctx.sfx(tb, "card", 0.3);
    ctx.sfx(times[0], "land", 0.35);
    times.slice(1).forEach((x, k) => k % 2 === 0 && ctx.sfx(x, "tap", 0.12));
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        el.style.opacity = on ? "0" : "";
        if (!on) return;
        const gone = ML.ease(t, end - 0.3, end - 0.05);
        // the scene behind sinks under the ground (0.7 = the source's 30 %; a busy scene wants more)
        veil.style.opacity = (p.veil * ML.ease(t, at, at + 0.3) * (1 - gone)).toFixed(4);
        col.style.opacity = (1 - gone).toFixed(4);
        if (bannerEl) {
          const u = ML.out(t, tb, tb + 0.3);
          bannerEl.style.opacity = u.toFixed(4);
          bannerEl.style.translate = `0 ${(-(1 - u) * 10 * unit * 2).toFixed(2)}px`;
        }
        rowEls.forEach((d, k) => {
          const u = ML.out(t, times[k], times[k] + 0.3);
          d.style.opacity = u.toFixed(4);
          d.style.filter = u < 1 ? `blur(${((1 - u) * 4).toFixed(2)}px)` : "none";
          d.style.color = u < 1 ? `color-mix(in srgb, var(--x-ink) ${(u * 100).toFixed(1)}%, var(--x-dim))` : "var(--x-ink)";
        });
      },
    };
  },
});
