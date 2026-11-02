// Icons float around the headline: 2–8 app icons (rounded squares, radius 22 %, a line glyph on a look colour), logo
// badges (circles holding the target's own mark) or chips (pill labels from the voice's words; every other one a dark
// pill with a mini sparkline) pop in at points around the centred title — on an ellipse ~1.4× its bounds with seeded
// offsets, near its corners, or at seeded free spots — so the title reads as a hub. Entry: scale 0 → 1 and blur 6 → 0
// on back.out(1.8) in 0.35 s, 0.1 s apart (optionally starting as tiny dots that travel out from the centre).
// Idle: each bobs y ±4 px on a sine of its own period (2.4–4 s, seeded phase) and rocks ±3.5°, and drifts with a slow
// camera sway at its own depth (0.6–1.4×). Optional: each spoken word adds a chip at the moment it is said; a tiny
// accent dot now and then travels from an icon to the title (a connection hint). Items avoid the title's box and stay
// on the frame. Arabic: the first items land on the right.
// Source: prompt-motion "twoclipping-d89be5", "rammanq-wow-just-tried-this", "elliot-garreffa-alright-opus-5-5-is"
// (reference only — rebuilt as our own code).
ML.define({
  id: "element.icon-constellation",
  category: "element",
  name: "Icons float around the headline",
  does: "App icons or logo badges pop in at points around the centred title and hover there, bobbing gently and drifting with the camera, framing it as a hub.",
  says: ["connection", "choice", "tech", "brand", "scale", "proof", "ambient"],
  energy: 2,
  targets: ["logo", "image", "label", "card", "shape"],
  duration: [1.5, 8],
  params: {
    layout: { type: "choice", options: ["ellipse", "corners", "random"], default: "ellipse" },
    count: { type: "number", range: [2, 8], default: 6 },
    item: { type: "choice", options: ["app-icons", "logo-badges", "chips"], default: "app-icons" },
    bob: { type: "bool", default: true },
    parallax: { type: "bool", default: true },
    chips_per_word: { type: "bool", default: false },
    from_center: { type: "bool", default: false },
    connect: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in", "element.idle-float"],
  avoid: ["problem", "urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:twoclipping-d89be5", license: "reference", note: "with rammanq-wow-just-tried-this and elliot-garreffa-alright-opus-5-5-is (reference only); placement, items and motion are our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const scene = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // ── the hub: the scene's title, else the target, else the middle of the frame ──
    const hubEl = scene.querySelector('[data-slot="headline"], .ml-title, .ml-hero') || own;
    const hub = hubEl ? ctx.box(hubEl) : { x: f.W * 0.3, y: f.H * 0.4, w: f.W * 0.4, h: f.H * 0.2 };
    // the text's own extent, not its full-width box (a centred title is narrower than its band)
    const textBox = (e) => {
      const r = doc.createRange(); r.selectNodeContents(e);
      const s = ctx.stage.getBoundingClientRect(), kk = s.width / (ctx.stage.offsetWidth || 1) || 1, rb = r.getBoundingClientRect();
      return rb.width > 0 ? { x: (rb.left - s.left) / kk, y: (rb.top - s.top) / kk, w: rb.width / kk, h: rb.height / kk } : null;
    };
    if (hubEl && hubEl.textContent.trim()) Object.assign(hub, textBox(hubEl) || {});
    // what the items keep clear of: the title and the copy set with it
    const keep = { ...hub };
    const band = hubEl && hubEl.closest(".ml-head");
    if (band) for (const c of band.children) { const b = c.textContent.trim() ? textBox(c) : null; if (!b) continue; const x2 = Math.max(keep.x + keep.w, b.x + b.w), y2 = Math.max(keep.y + keep.h, b.y + b.h); keep.x = Math.min(keep.x, b.x); keep.y = Math.min(keep.y, b.y); keep.w = x2 - keep.x; keep.h = y2 - keep.y; }
    const hc = { x: hub.x + hub.w / 2, y: hub.y + hub.h / 2 };
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:7;", scene);

    // ── the items ──
    const spoken = (ctx.words || []).filter((w) => ML.plain(w.w).length > 2 && w.t >= at - 0.05 && w.t < end - 0.3);
    const n = p.chips_per_word && spoken.length ? Math.min(8, spoken.length) : Math.round(ML.clamp(p.count, 2, 8));
    const size = ML.clamp(hub.h * 0.62, 64 * k, 120 * k);
    const GLYPHS = [
      '<path d="M4 7h16v11H4zM4 11h16"/>', '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v4l3 2"/>', '<path d="M5 18V9M10 18V5M15 18v-6M20 18V8"/>',
      '<path d="M4 6.5h16v10H9l-5 4z"/>', '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>', '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
      '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>', '<path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/><circle cx="12" cy="12" r="8.5"/>',
    ];
    const FILLS = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-ink)", "color-mix(in srgb, var(--x-accent) 55%, var(--x-good))", "var(--x-good)", "color-mix(in srgb, var(--x-accent-2) 50%, var(--x-bad))", "color-mix(in srgb, var(--x-accent) 60%, var(--x-ink))", "var(--x-bad)"];
    const svg = (inner, s, color) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="display:block;color:${color}"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
    const mark = own && /^(svg|img)$/i.test(own.tagName) ? own : own && own.querySelector ? own.querySelector("svg, img") : null;
    const items = [];
    for (let i = 0; i < n; i++) {
      const wrap = mk("div", "position:absolute;left:0;top:0;will-change:transform;", layer);
      let face, w, h;
      if (p.item === "chips" || p.chips_per_word) {
        const word = spoken.length ? spoken[i % spoken.length].w.replace(/[.,،؛؟?!…:«»"'()]/g, "") : ["Fast", "Secure", "Simple", "Smart", "Live", "Pro", "Daily", "Team"][i % 8];
        const dark = i % 2 === 1, fs = Math.max(16, size * 0.3);
        face = mk("div", `display:inline-flex;align-items:center;gap:${fs * 0.45}px;padding:${fs * 0.5}px ${fs * 0.9}px;border-radius:var(--x-radius-s);white-space:nowrap;font:600 ${fs.toFixed(1)}px/1 var(--x-body-font);background:${dark ? "var(--x-ink)" : "var(--x-panel)"};color:${dark ? "var(--x-panel)" : "var(--x-ink)"};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`, wrap);
        mk("span", "", face, word);
        if (dark) face.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 40 16" width="${(fs * 2.2).toFixed(0)}" height="${(fs * 0.9).toFixed(0)}" style="display:block;${rtl ? "transform:scaleX(-1)" : ""}"><path d="M1 13 L9 9 L16 11 L24 5 L31 7 L39 2" fill="none" stroke="var(--x-accent-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
        w = face.offsetWidth; h = face.offsetHeight;
      } else if (p.item === "logo-badges") {
        const s = size * 1.05;
        face = mk("div", `width:${s}px;height:${s}px;border-radius:50%;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;`, wrap);
        if (mark && i % 3 === 0) {
          const c = mark.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("id");
          c.style.cssText = `display:block;max-width:${(s * 0.62).toFixed(1)}px;max-height:${(s * 0.5).toFixed(1)}px;width:auto;height:auto;`;
          if (c.tagName.toLowerCase() === "svg") { c.setAttribute("width", (s * 0.62).toFixed(1)); c.removeAttribute("height"); }
          face.append(c);
        } else face.innerHTML = svg(GLYPHS[i % GLYPHS.length], (s * 0.48).toFixed(1), i % 2 ? "var(--x-ink)" : "var(--x-accent)");
        w = h = s;
      } else {
        const s = size * (0.85 + 0.3 * ML.rnd(i, 29));
        face = mk("div", `width:${s}px;height:${s}px;border-radius:22%;background:linear-gradient(150deg, color-mix(in srgb, ${FILLS[i % FILLS.length]} 78%, var(--x-panel)), ${FILLS[i % FILLS.length]});box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;`, wrap);
        face.innerHTML = svg(GLYPHS[(i * 3) % GLYPHS.length], (s * 0.5).toFixed(1), "var(--x-accent-ink)");
        w = h = s;
      }
      items.push({ wrap, face, w, h });
    }

    // ── where they sit: around the hub, never on it, always on the frame ──
    const pad = Math.max(f.m * 0.5, 24 * k);
    const clampPos = (x, y, w, h) => [ML.clamp(x, pad + w / 2, f.W - pad - w / 2), ML.clamp(y, pad + h / 2, f.H - pad - h / 2)];
    const g0 = 14 * k;
    const hits = (x, y, w, h) => x + w / 2 > keep.x - g0 && x - w / 2 < keep.x + keep.w + g0 && y + h / 2 > keep.y - g0 && y - h / 2 < keep.y + keep.h + g0;
    const crowd = (x, y, w, h, upto) => items.slice(0, upto).some((o) => o.x != null && Math.abs(o.x - x) < (o.w + w) / 2 + g0 && Math.abs(o.y - y) < (o.h + h) / 2 + g0);
    // from the wanted point, outward along its ray from the hub until clear of the copy and the other items
    const place = (x, y, w, h, i) => {
      const dx = x - hc.x, dy = y - hc.y;
      let best = null;
      for (let s = 1; s <= 3.2; s += 0.1) {
        const [cx, cy] = clampPos(hc.x + dx * s, hc.y + dy * s, w, h);
        if (!hits(cx, cy, w, h) && !crowd(cx, cy, w, h, i)) return [cx, cy];
        if (!best && !hits(cx, cy, w, h)) best = [cx, cy];
      }
      if (best) return best;
      // no room on that ray: beside the copy, then under it
      for (const [cx, cy] of [[keep.x - w / 2 - g0 * 2, y], [keep.x + keep.w + w / 2 + g0 * 2, y], [x, keep.y + keep.h + h / 2 + g0 * 2]]) { const q = clampPos(cx, cy, w, h); if (!hits(q[0], q[1], w, h)) return q; }
      return clampPos(x, y, w, h);
    };
    const rx = Math.max(hub.w / 2 * 1.4, size * 2), ry = Math.max(hub.h / 2 * 1.4 + size * 0.9, size * 1.6);
    const dir = rtl ? -1 : 1;
    items.forEach((it, i) => {
      let x, y;
      if (p.layout === "corners") {
        const C = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]][i % 8];
        x = hc.x + C[0] * dir * (hub.w / 2 + it.w * 0.2) + (ML.rnd(i, 31) - 0.5) * size * 0.4; y = hc.y + C[1] * (hub.h / 2 + it.h * 0.75) + (ML.rnd(i, 37) - 0.5) * size * 0.3;
      } else if (p.layout === "random") {
        x = hc.x; y = hc.y;
        for (let tr = 0; tr < 24; tr++) {
          const cx = pad + ML.rnd(i * 31 + tr, 41) * (f.W - 2 * pad), cy = hub.y - hub.h * 1.6 + ML.rnd(i * 31 + tr, 43) * hub.h * 4.2;
          if (!hits(cx, cy, it.w, it.h) && !crowd(cx, cy, it.w, it.h, i)) { x = cx; y = cy; break; }
        }
      } else {
        const a = -Math.PI / 2 + dir * ((i + 0.5) / n) * Math.PI * 2 + (ML.rnd(i, 47) - 0.5) * 0.5;
        x = hc.x + Math.cos(a) * rx; y = hc.y + Math.sin(a) * ry;
      }
      [it.x, it.y] = place(x, y, it.w, it.h, i);
      it.ph = ML.rnd(i, 53) * Math.PI * 2; it.per = 2.4 + ML.rnd(i, 59) * 1.6; it.depth = 0.6 + ML.rnd(i, 61) * 0.8; it.rk = (ML.rnd(i, 67) - 0.5) * 7;
      it.t = p.chips_per_word && spoken.length ? Math.max(at, spoken[i % spoken.length].t) : at + i * 0.1;
    });
    items.forEach((it, i) => i % 2 === 0 && ctx.sfx(it.t, "pop.soft", 0.2));
    // the connection hint: a tiny accent dot from an icon to the title
    const dot = mk("div", `position:absolute;left:0;top:0;width:${Math.max(6, 10 * k)}px;height:${Math.max(6, 10 * k)}px;margin:${-Math.max(3, 5 * k)}px 0 0 ${-Math.max(3, 5 * k)}px;border-radius:50%;background:var(--x-accent);opacity:0;`, layer);
    const lastIn = items.reduce((m, it) => Math.max(m, it.t), at) + 0.5;
    return {
      draw(t) {
        const tau = t - at, leave = ML.ease(t, end - 0.3, end);
        const sway = p.parallax ? [Math.sin(0.21 * tau) * 14 * k, Math.cos(0.17 * tau) * 10 * k] : [0, 0];
        for (const it of items) {
          if (t < it.t - (p.from_center ? 0.3 : 0)) { it.wrap.style.opacity = "0"; continue; }
          const u = ML.back(t, it.t, it.t + 0.35, 1.8);
          // optional travel out from the centre as a tiny dot first
          const tr = p.from_center ? ML.out(t, it.t - 0.3, it.t) : 1;
          let x = hc.x + (it.x - hc.x) * tr, y = hc.y + (it.y - hc.y) * tr;
          const idle = ML.ease(t, it.t + 0.3, it.t + 0.9);
          if (p.bob) y += Math.sin((2 * Math.PI * (t - it.t)) / it.per + it.ph) * 4 * Math.max(1, k * 1.4) * idle;
          x += sway[0] * it.depth; y += sway[1] * it.depth;
          const sc = p.from_center && t < it.t ? 0.12 : Math.max(0, u);
          const rot = p.bob ? it.rk * Math.sin((2 * Math.PI * (t - it.t)) / (it.per * 1.3) + it.ph) * idle : 0;
          it.wrap.style.opacity = ((p.from_center && t < it.t ? 1 : Math.min(1, ML.lin(t, it.t, it.t + 0.12))) * (1 - leave)).toFixed(4);
          it.wrap.style.transform = `translate(${(x - it.w / 2).toFixed(2)}px, ${(y - it.h / 2).toFixed(2)}px) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
          const bl = 6 * (1 - ML.out(t, it.t, it.t + 0.35));
          it.face.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
          it.cx = x; it.cy = y;
        }
        // a dot every 1.6 s after they have all landed, icon → title, 0.7 s
        if (p.connect && t > lastIn && items.length) {
          const k2 = Math.floor((t - lastIn) / 1.6), ph = ((t - lastIn) % 1.6) / 0.7, it = items[(k2 * 3) % items.length];
          if (ph <= 1 && it.cx != null) {
            const e = ML.ease(ph, 0, 1), tx = ML.clamp(it.cx, hub.x, hub.x + hub.w), ty = ML.clamp(it.cy, hub.y, hub.y + hub.h);
            dot.style.transform = `translate(${(it.cx + (tx - it.cx) * e).toFixed(2)}px, ${(it.cy + (ty - it.cy) * e).toFixed(2)}px)`;
            dot.style.opacity = (Math.sin(Math.PI * ph) * 0.9 * (1 - leave)).toFixed(4);
          } else dot.style.opacity = "0";
        } else dot.style.opacity = "0";
      },
    };
  },
});
