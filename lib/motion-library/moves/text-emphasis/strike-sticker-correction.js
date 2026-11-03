// Strike & sticker correction: the phrase fades to 40 % and is crossed out — a hand scribble (an SVG prolate-cycloid
// path, smooth, seeded wobble, round caps: `loops` loops per word-sized stretch, so a long line is scratched out as
// densely as a short word), a straight line or an X — drawn
// by stroke-dashoffset in 0.45 s power1.inOut from the reading edge, one pass per line of text. Then a sticker label
// pops in below with the fix: a rounded rectangle in `sticker-colour`, tilted `tilt` deg, heavy head-font text in the
// ink that reads on it at ~0.62× the phrase (fitted to the width, above the phrase when there is no room below),
// scale 0 → 1.1 → 1 (back.out 1.8, 0.35 s) with a 2-frame wiggle and a hard drop shadow in a darker shade of its own
// colour, on light and dark looks alike. The fix text is `fix`, else the phrase's last word. A copywriting gag.
// Source: prompt-motion:paulo-kombucha-i-played-with-the (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.strike-sticker-correction",
  category: "text-emphasis",
  name: "Scribble out a phrase, sticker the fix",
  does: "A phrase is crossed out with a hand-drawn scribble, then a tilted sticker label pops in below with the replacement words.",
  says: ["change", "playful", "choice"],
  energy: 4,
  targets: ["word", "label", "line"],
  duration: [1.2, 3],
  params: {
    strike: { type: "choice", options: ["scribble", "straight", "x"], default: "scribble" },
    "sticker-colour": { type: "text", default: "accent" },
    tilt: { type: "number", range: [-8, 8], default: -3, unit: "deg" },
    loops: { type: "number", range: [1, 5], default: 3 },
    fix: { type: "text", default: "" },
    "strike-colour": { type: "text", default: "alert" },
  },
  pairs: ["text-emphasis.strike-replace", "text-emphasis.sticker-slam"],
  avoid: ["luxury", "trust", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "prompt-motion:paulo-kombucha-i-played-with-the", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const COL = { accent: "var(--x-accent)", "accent-2": "var(--x-accent-2)", brand: "var(--x-accent)", alert: "var(--x-bad)", bad: "var(--x-bad)", good: "var(--x-good)", ink: "var(--x-ink)", dim: "var(--x-dim)", magenta: "var(--x-accent-2)", orange: "var(--x-bad)" };
    const col = (v, d) => { const r = String(v || "").trim(); return COL[r.toLowerCase()] || (/^var\(--x-[a-z0-9-]+\)$/.test(r) ? r : d); };
    const stickerCol = col(p["sticker-colour"], "var(--x-accent)");
    const strikeCol = col(p["strike-colour"], "var(--x-bad)");
    const text = (el.textContent || "").trim();
    const fixText = String(p.fix || "").trim() || text.split(/\s+/).pop() || text;
    // the phrase in one inline span: its line boxes are what the strike covers
    const core = document.createElement("span");
    while (el.firstChild) core.append(el.firstChild);
    el.append(core);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56;
    const sw = Math.max(3, fs * (p.strike === "scribble" ? 0.075 : 0.09));
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    const eb = el.getBoundingClientRect();
    // line boxes, merged by row
    const rows = [];
    for (const r of core.getClientRects()) {
      const x = (r.left - eb.left) / k, y = (r.top - eb.top) / k, w = r.width / k, h = r.height / k;
      if (w < 2) continue;
      const same = rows.find((q) => Math.abs(q.y - y) < h * 0.5);
      if (same) { const x2 = Math.max(same.x + same.w, x + w); same.x = Math.min(same.x, x); same.w = x2 - same.x; }
      else rows.push({ x, y, w, h });
    }
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    const W = el.offsetWidth, H = el.offsetHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none" });
    el.append(svg);
    const loops = Math.round(ML.clamp(p.loops, 1, 5));
    // one stroke's path for a row: reading edge → far edge
    const pathsFor = (r, i) => {
      const x0 = r.x - fs * 0.08, x1 = r.x + r.w + fs * 0.08, mid = r.y + r.h * 0.55, dirx = rtl ? -1 : 1;
      const from = rtl ? x1 : x0, len = x1 - x0;
      if (p.strike === "straight") return [`M${from.toFixed(1)} ${(mid + r.h * 0.06).toFixed(1)} L${(from + dirx * len).toFixed(1)} ${(mid - r.h * 0.06).toFixed(1)}`];
      if (p.strike === "x") {
        const top = r.y + r.h * 0.18, bot = r.y + r.h * 0.9;
        return [`M${from.toFixed(1)} ${top.toFixed(1)} L${(from + dirx * len).toFixed(1)} ${bot.toFixed(1)}`, `M${from.toFixed(1)} ${bot.toFixed(1)} L${(from + dirx * len).toFixed(1)} ${top.toFixed(1)}`];
      }
      // scribble: a prolate cycloid (tight loops over the words), each loop's height and drift eased between seeded values
      const R = r.h * 0.32, N = Math.max(loops, Math.round((len / (r.h * 2.4)) * loops)), steps = N * 20, pts = [];
      const a = len / (N * 2 * Math.PI);
      const noise = (v, seed) => { const j = Math.floor(v), f = v - j, e = f * f * (3 - 2 * f); return ML.rnd(i * 13 + j, seed) * (1 - e) + ML.rnd(i * 13 + j + 1, seed) * e; };
      for (let s = 0; s <= steps; s++) {
        const th = (s / steps) * N * 2 * Math.PI, loop = th / (2 * Math.PI);
        const x = from + dirx * (a * th - a * 2.2 * Math.sin(th)); // b > a: the curve loops back on itself
        const y = mid - R * Math.cos(th) * (0.8 + 0.4 * noise(loop, 5)) + (noise(loop * 0.6, 3) - 0.5) * r.h * 0.12;
        pts.push([x, y]);
      }
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`; // through the midpoints: a pen line with no corners
      for (let s = 1; s < steps; s++) d += ` Q${pts[s][0].toFixed(1)} ${pts[s][1].toFixed(1)} ${((pts[s][0] + pts[s + 1][0]) / 2).toFixed(1)} ${((pts[s][1] + pts[s + 1][1]) / 2).toFixed(1)}`;
      return [d];
    };
    const strokes = [];
    rows.forEach((r, i) => pathsFor(r, i).forEach((d) => {
      const pa = document.createElementNS(NS, "path");
      pa.setAttribute("d", d);
      pa.setAttribute("fill", "none"); pa.setAttribute("stroke-width", sw.toFixed(1));
      pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round");
      pa.style.stroke = strikeCol;
      svg.append(pa);
      const L = pa.getTotalLength() || 1;
      pa.style.strokeDasharray = `${L.toFixed(1)} ${(L + 10).toFixed(1)}`;
      strokes.push({ pa, L });
    }));
    // the sticker: below the phrase, centred on its last row
    const last = rows[rows.length - 1] || { x: 0, y: 0, w: W, h: fs };
    const sticker = document.createElement("div");
    sticker.textContent = fixText;
    const sfs = Math.max(16, fs * 0.62);
    // what reads on the sticker, and its darker shade, measured from the look: its ink may be the light one
    const lum = (v) => { const pr = document.createElement("i"); pr.style.color = v; pr.style.display = "none"; el.append(pr); const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove(); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const inkDark = lum("var(--x-ink)") < lum("var(--x-ground)");
    const dark = inkDark ? "var(--x-ink)" : "var(--x-ground)", light = inkDark ? "var(--x-ground)" : "var(--x-ink)";
    const stickerInk = stickerCol === "var(--x-accent)" ? "var(--x-accent-ink)" : lum(stickerCol) > 150 ? dark : light;
    Object.assign(sticker.style, {
      position: "absolute", top: (last.y + last.h + fs * 0.12).toFixed(1) + "px", left: (last.x + last.w / 2).toFixed(1) + "px",
      font: `800 ${sfs.toFixed(1)}px/1.15 var(--x-head-font)`, color: stickerInk, background: stickerCol, whiteSpace: "nowrap",
      padding: `${(sfs * 0.22).toFixed(1)}px ${(sfs * 0.5).toFixed(1)}px`, borderRadius: `min(var(--x-radius), ${(sfs * 0.24).toFixed(1)}px)`,
      boxShadow: `0 ${(sfs * 0.12).toFixed(1)}px 0 color-mix(in srgb, ${stickerCol} 62%, ${dark})`, translate: "-50% 0", transformOrigin: "50% 50%",
      pointerEvents: "none", zIndex: "5", opacity: "0", textAlign: "center",
    });
    el.append(sticker);
    // keep it inside its parent's width
    const pw = (el.parentElement && el.parentElement.clientWidth) || W;
    ML.fit(sticker, pw * 0.92 - sfs);
    const swd = sticker.offsetWidth, sh = sticker.offsetHeight, floor = ctx.f ? ctx.f.safe.y + ctx.f.safe.h : ctx.stage.offsetHeight;
    if (ctx.box(el).y + last.y + last.h + fs * 0.12 + sh > floor) sticker.style.top = (rows[0].y - fs * 0.12 - sh).toFixed(1) + "px"; // no room below: above the phrase
    const cx = ML.clamp(last.x + last.w / 2, swd / 2 - el.offsetLeft + 4, pw - el.offsetLeft - swd / 2 - 4);
    sticker.style.left = cx.toFixed(1) + "px";
    const D = 0.45, per = strokes.length > 1 ? D * 0.75 : D;
    const t0 = at, tStick = t0 + per * (strokes.length - 1) * 0.6 + per + 0.15;
    ctx.sfx(t0, "whoosh.soft", 0.25);
    ctx.sfx(tStick, "pop", 0.5);
    const p1 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power1.inOut
    return {
      draw(t) {
        const dim = ML.ease(t, t0, t0 + 0.3);
        core.style.opacity = (1 - 0.6 * dim).toFixed(4);
        strokes.forEach((s, i) => {
          const a = t0 + i * per * 0.6, u = p1(ML.lin(t, a, a + per));
          s.pa.style.strokeDashoffset = (s.L * (1 - u)).toFixed(2);
          s.pa.style.opacity = u > 0.002 ? "1" : "0";
        });
        if (t < tStick) { sticker.style.opacity = "0"; return; }
        const sc = ML.back(t, tStick, tStick + 0.35, 1.8);
        const f = Math.floor((t - tStick - 0.35) * 30);
        const wig = f === 0 ? 2.5 : f === 1 ? -2.5 : 0;
        sticker.style.opacity = "1";
        sticker.style.scale = Math.max(0, sc).toFixed(4);
        sticker.style.rotate = `${(p.tilt + wig).toFixed(2)}deg`;
      },
    };
  },
});
