// One-word feature title with a live period: each chapter is one huge lowercase word (heavy, tracking −0.04em,
// centred, cap height ≈ 22 % of the frame width, fitted to the frame) ending in a coloured dot that is its own circle
// (~0.18 em), so the dot can come alive — a hotspot pulsing rings, the cursor gliding off to click, or the zoom target
// growing to swallow the frame. Word in: scale 0.96 → 1 + opacity in 0.25 s power3.out; the dot pops 0.1 s later on
// back.out(2). The ground hard-cuts per chapter (ground / near-black / accent, or cycling). Chrome: a small mono label
// top-left and a brand circle bottom-left (mirrored for RTL). chapters "words": each word of the target is a chapter,
// on its spoken word; "whole": the whole target is the one title.
// Source: prompt-motion:jhylee95-opus-5-5-max-is (reference only — our own rebuild).
ML.define({
  id: "kinetic.feature-word-period",
  category: "kinetic",
  name: "One-word feature title with a live period",
  does: "Each chapter is one huge lowercase word ending in a coloured dot, and the dot becomes the interactive element.",
  says: ["simplicity", "brand", "list", "tech"],
  energy: 3,
  targets: ["headline", "word"],
  duration: [1, 4],
  params: {
    background: { type: "choice", options: ["light", "dark", "accent", "cycle"], default: "cycle" },
    dot_role: { type: "choice", options: ["hotspot", "cursor", "zoom-target", "none"], default: "hotspot" },
    chrome: { type: "bool", default: true },
    chapters: { type: "choice", options: ["words", "whole"], default: "words" },
    label: { type: "text", default: "" },
  },
  pairs: ["ui.cursor-click", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:jhylee95-opus-5-5-max-is", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage, rtl, f } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").replace(/[.。]$/, "");
    if (!text) return null;
    const host = ctx.scene || stage;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const names = p.chapters === "whole" ? [text] : text.split(" ").filter(Boolean);
    const n = names.length;
    // chapter times: on the spoken word, else an even share of the run
    const seen = {};
    const span = Math.max(0.3, (end - 0.04 - at) / n);
    let times = names.map((w, i) => { const key = ML.plain(w); seen[key] = (seen[key] || 0) + 1; return i === 0 ? at : Math.max(at, ctx.word(w, at + i * span, seen[key])); });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.45);
    // a word spoken after the run would never show: the chapters then share the run evenly
    if (times[n - 1] > end - 0.04 - 0.3) times = names.map((_, i) => at + (i * (end - 0.04 - at)) / n);
    const grounds = { light: ["var(--x-ground)", "var(--x-ink)", "var(--x-accent)", "var(--x-dim)"], dark: ["var(--x-ink)", "var(--x-ground)", "var(--x-accent)", "color-mix(in srgb, var(--x-ground) 60%, transparent)"], accent: ["var(--x-accent)", "var(--x-accent-ink)", "var(--x-ink)", "color-mix(in srgb, var(--x-accent-ink) 70%, transparent)"] };
    const order = ["light", "dark", "accent"];
    const card = document.createElement("div");
    Object.assign(card.style, { position: "absolute", inset: "0", zIndex: "6", overflow: "hidden", pointerEvents: "none" });
    host.append(card);
    const fsMax = Math.min(f.W * 0.3, f.H * 0.32), roomW = f.W * 0.86;
    const chapters = names.map((name, i) => {
      const bgKey = p.background === "cycle" ? order[i % 3] : p.background;
      const [bg, ink, dotC, dim] = grounds[bgKey];
      const ch = document.createElement("div");
      Object.assign(ch.style, { position: "absolute", inset: "0", background: bg, color: ink, display: "flex", alignItems: "center", justifyContent: "center" });
      const line = document.createElement("div");
      const ar = ML.ARABIC.test(name);
      Object.assign(line.style, { font: `max(var(--x-head-weight), 800) ${fsMax.toFixed(1)}px / 1 var(--x-head-font)`, letterSpacing: ar ? "0" : "-0.04em", textTransform: "lowercase", whiteSpace: "nowrap", display: "inline-block", transformOrigin: "50% 60%" });
      const word = document.createElement("span");
      word.textContent = name;
      const dot = document.createElement("span");
      Object.assign(dot.style, { display: "inline-block", width: "0.18em", height: "0.18em", borderRadius: "50%", background: dotC, marginInlineStart: "0.05em", verticalAlign: "baseline", position: "relative" });
      line.append(word, dot);
      ch.append(line);
      // chrome: the mono label at the top corner, the brand circle at the bottom corner (mirrored for RTL)
      let lab = null, brand = null;
      if (p.chrome) {
        lab = document.createElement("div");
        lab.className = "ml-label";
        // the label's words come from the film (never a setting's name on screen); without any, a chapter count
        lab.textContent = p.label || (n > 1 ? `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` : "");
        if (!p.label) lab.dir = "ltr"; // a count reads 02 / 03 in an RTL film too
        Object.assign(lab.style, { position: "absolute", top: f.safe.y + "px", [rtl ? "right" : "left"]: f.m + "px", color: dim, fontFamily: "var(--x-mono-font)" });
        brand = document.createElement("div");
        const bs = Math.round(f.W * 0.045);
        Object.assign(brand.style, { position: "absolute", width: bs + "px", height: bs + "px", borderRadius: "50%", border: `${Math.max(2, Math.round(bs / 12))}px solid ${ink}`, top: f.safe.y + f.safe.h - bs + "px", [rtl ? "right" : "left"]: f.m + "px", boxSizing: "border-box", display: "grid", placeItems: "center" });
        const core = document.createElement("i");
        Object.assign(core.style, { width: "38%", height: "38%", borderRadius: "50%", background: dotC });
        brand.append(core);
        ch.append(lab, brand);
      }
      card.append(ch);
      return { ch, line, word, dot, dotC, ink, t0: times[i], t1: i + 1 < n ? times[i + 1] : end };
    });
    // sizes: fit each chapter's word + dot to the frame width (measured with every chapter laid out)
    for (const c of chapters) {
      c.ch.style.display = "flex";
      const w = c.line.getBoundingClientRect().width / k;
      if (w > roomW) c.line.style.fontSize = ((fsMax * roomW) / w).toFixed(1) + "px";
      const cb = card.getBoundingClientRect(), db = c.dot.getBoundingClientRect();
      c.dx = (db.left + db.width / 2 - cb.left) / k; c.dy = (db.top + db.height / 2 - cb.top) / k; c.dr = db.width / k;
      c.ch.style.display = "none";
    }
    // live dot extras: rings (hotspot), a pointer (cursor), a growing disc (zoom-target)
    const reach = Math.hypot(f.W, f.H);
    for (const c of chapters) {
      c.rings = [];
      if (p.dot_role === "hotspot") for (let r = 0; r < 2; r++) {
        const ring = document.createElement("i");
        Object.assign(ring.style, { position: "absolute", borderRadius: "50%", border: `${Math.max(2, c.dr * 0.08).toFixed(1)}px solid ${c.dotC}`, boxSizing: "border-box", pointerEvents: "none" });
        c.ch.append(ring); c.rings.push(ring);
      }
      if (p.dot_role === "cursor" && c.t1 - c.t0 > 1.2) { // a chapter long enough for the glide and the click
        const svgNS = "http://www.w3.org/2000/svg", s = document.createElementNS(svgNS, "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        const ps = Math.max(f.W * 0.03, c.dr * 1.4);
        Object.assign(s.style, { position: "absolute", width: ps + "px", height: ps + "px", overflow: "visible", pointerEvents: "none" });
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.3 L17.5 13.3 Z");
        path.setAttribute("fill", "var(--x-pointer)"); path.setAttribute("stroke", "var(--x-pointer-edge)"); path.setAttribute("stroke-width", "1.6"); path.setAttribute("stroke-linejoin", "round");
        s.append(path); c.ch.append(s); c.ptr = s; c.ps = ps;
      }
      if (p.dot_role === "zoom-target" && c.t1 - c.t0 > 0.9) {
        const disc = document.createElement("i");
        Object.assign(disc.style, { position: "absolute", borderRadius: "50%", background: c.dotC, pointerEvents: "none" });
        c.ch.append(disc); c.disc = disc;
      }
    }
    chapters.forEach((c) => { ctx.sfx(c.t0 + 0.1, "pop.soft", 0.35); if (c.ptr) ctx.sfx(c.t0 + 1.05, "click", 0.3); if (c.disc) ctx.sfx(c.t1 - 0.4, "whoosh.soft", 0.25); });
    return {
      draw(t) {
        el.style.visibility = t >= at - 1e-6 ? "hidden" : "visible";
        const leave = t >= end - 0.04;
        card.style.visibility = t >= at && !leave ? "visible" : "hidden";
        for (const c of chapters) {
          const on = t >= c.t0 && t < c.t1 && !leave;
          c.ch.style.display = on ? "flex" : "none";
          if (!on) continue;
          const u = ML.out(t, c.t0, c.t0 + 0.25);
          c.line.style.opacity = u.toFixed(4);
          c.line.style.scale = u < 1 ? (0.96 + 0.04 * u).toFixed(4) : "none";
          const d = t >= c.t0 + 0.1 ? Math.max(0, ML.back(t, c.t0 + 0.1, c.t0 + 0.4, 2)) : 0;
          let ds = d, dxo = 0, dyo = 0;
          if (c.ptr) {
            // the dot glides off along an arc to a click point, the pointer riding on it; a press at arrival
            const m = ML.ease(t, c.t0 + 0.45, c.t0 + 1.0), dirX = rtl ? -1 : 1;
            dxo = dirX * Math.min(c.dr * 3.2, Math.max(0, rtl ? c.dx - f.m * 0.6 : f.W - f.m * 0.6 - c.dx)) * m; dyo = c.dr * 2.2 * m - Math.sin(Math.PI * m) * c.dr * 1.4;
            const press = ML.pulse(t, c.t0 + 1.05, 0.04, 0.12);
            ds = d * (1 - 0.25 * press);
            const pa = ML.lin(t, c.t0 + 0.4, c.t0 + 0.6);
            c.ptr.style.opacity = pa.toFixed(4);
            c.ptr.style.left = (c.dx + dxo - c.ps * 0.12).toFixed(1) + "px";
            c.ptr.style.top = (c.dy + dyo - c.ps * 0.08).toFixed(1) + "px";
          }
          c.dot.style.transform = `translate(${dxo.toFixed(2)}px, ${dyo.toFixed(2)}px) scale(${ds.toFixed(4)})`;
          c.dot.style.opacity = d > 0 ? "1" : "0";
          c.rings.forEach((ring, r) => {
            const t0 = c.t0 + 0.4 + r * 0.6, ph = t >= t0 ? ((t - t0) % 1.2) / 1.2 : -1;
            const size = c.dr * (1 + 2.4 * Math.max(0, ph));
            ring.style.opacity = ph < 0 ? "0" : ((1 - ph) * 0.8).toFixed(4);
            Object.assign(ring.style, { width: size.toFixed(1) + "px", height: size.toFixed(1) + "px", left: (c.dx - size / 2).toFixed(1) + "px", top: (c.dy - size / 2).toFixed(1) + "px" });
          });
          if (c.disc) {
            const g = ML.lin(t, c.t1 - 0.4, c.t1 - 0.02), e = g * g * g;
            const size = c.dr + (reach * 2 - c.dr) * e;
            c.disc.style.visibility = g > 0 ? "visible" : "hidden";
            Object.assign(c.disc.style, { width: size.toFixed(1) + "px", height: size.toFixed(1) + "px", left: (c.dx - size / 2).toFixed(1) + "px", top: (c.dy - size / 2).toFixed(1) + "px" });
          }
        }
      },
    };
  },
});
