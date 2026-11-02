// Stickers pop in at scattered spots: chips, paper tags, checklist stickers or tilted picture cards appear one after
// another around the subject, each at a slight angle, and hold with a tiny float; the set can shake at the end.
// Spots: the source's six zig-zag spots (portrait / landscape sets, as shares of the picture region), a seeded LCG
// (seed 7, ×16807 mod 2³¹−1), a ring around the subject that avoids it, or a loose column with a few below. Each
// sticker enters on its time t_k = at + 0.1 + k × stagger (squeezed to fit the window): "pop" from scale 0.5 and a
// start rotation ±15° to a resting ±tilt on back.out(1.8) over 0.45 s; "slap" from 1.15 → 1 in 0.25 s; "stop-motion"
// in two held frames at 12 fps. Holds with y ±2 px on a 2 s sine. Every third chip is inverted, one is in the alert
// colour. The words come from the target (a list's items, a label) and then from the voice. Spots mirror in RTL.
// Source: MotionGX lib/studio-engine/assets/scenes.js S.chaos (own): spots, pop with rot/toRot, every third inverted,
// the alert chip, d·0.8/n spread, drop sounds cycling three samples, the closing shake; prompt-motion sticker
// references (rebuilt as our own code).
ML.define({
  id: "element.sticker-scatter",
  category: "element",
  name: "Stickers pop in at scattered spots",
  does: "Chips, tags, checklist stickers or tilted thumbnail cards pop in one after another at scattered spots around the subject, each at a slight angle, and hold.",
  says: ["playful", "list", "problem", "celebration", "result", "choice", "energy", "step", "story"],
  energy: 3,
  targets: ["label", "list", "image", "card"],
  duration: [1, 4],
  params: {
    item: { type: "choice", options: ["chips", "tags", "checklist", "image-cards"], default: "chips" },
    count: { type: "number", range: [3, 12], default: 6 },
    tilt: { type: "number", range: [4, 15], default: 7, unit: "deg" },
    layout: { type: "choice", options: ["preset", "seeded", "around-subject", "column"], default: "preset" },
    entry: { type: "choice", options: ["pop", "slap", "stop-motion"], default: "pop" },
    stagger: { type: "number", range: [0.12, 0.6], default: 0.25, unit: "s" },
    shake: { type: "bool", default: false },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.chaos", license: "own", note: "with prompt-motion sticker references (sab8a, nikolajankovic, devius-maximus) rebuilt as our own code" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const host = ctx.scene || ctx.stage;
    const doc = document;
    const U = Math.min(f.W, f.H) / 1080;
    const n = Math.round(ML.clamp(p.count, 3, 12));
    // ── the words on the stickers: the target's items, then the voice ──
    const texts = [];
    if (el && el !== ctx.stage) {
      const kids = [...el.children].map((c) => c.textContent.trim()).filter(Boolean);
      if (kids.length > 1) texts.push(...kids);
      else if (el.textContent.trim()) texts.push(el.textContent.trim());
    }
    const spoken = (ctx.words || []).map((w) => String(w.w).replace(/[.,،؛؟?!…:«»"']/g, "")).filter((w) => w.length > 1);
    for (let i = 0; texts.length < n && i < spoken.length; i++) if (!texts.some((x) => x.includes(spoken[i]))) texts.push(spoken[i]);
    while (texts.length < n) texts.push(texts[texts.length % Math.max(1, texts.length)] || "•");
    // a picture to put on the cards: the target's own (never enlarged past its pixels)
    const pic = el && (el.tagName === "IMG" ? el : el.querySelector && el.querySelector("img"));
    // ── the region and the subject ──
    const R = f.pic;
    const sub = el && el !== ctx.stage ? ctx.box(el) : { x: R.x + R.w * 0.3, y: R.y + R.h * 0.3, w: R.w * 0.4, h: R.h * 0.4 };
    // ── build the stickers ──
    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:8;";
    host.append(layer);
    const items = [];
    for (let k = 0; k < n; k++) {
      const s = doc.createElement("div");
      s.setAttribute("dir", rtl ? "rtl" : "ltr");
      s.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;transform-origin:50% 50%;box-sizing:border-box;";
      const txt = texts[k];
      if (p.item === "tags") {
        s.style.cssText += `background:var(--x-panel);color:var(--x-ink);border:${Math.max(1, U).toFixed(2)}px solid var(--x-line);border-radius:calc(var(--x-radius) * .14);padding:${14 * U}px ${26 * U}px ${14 * U}px ${44 * U}px;font:var(--x-label-weight) ${30 * U}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};box-shadow:var(--x-shadow);`;
        if (rtl) s.style.padding = `${14 * U}px ${44 * U}px ${14 * U}px ${26 * U}px`;
        const hole = doc.createElement("i");
        hole.style.cssText = `position:absolute;top:50%;${rtl ? "right" : "left"}:${16 * U}px;width:${12 * U}px;height:${12 * U}px;margin-top:${-6 * U}px;border-radius:50%;background:var(--x-ground);border:${Math.max(1, U)}px solid var(--x-line);`;
        s.append(hole, doc.createTextNode(txt));
      } else if (p.item === "checklist") {
        s.style.cssText += `display:flex;align-items:center;gap:${16 * U}px;background:var(--x-panel);color:var(--x-ink);border-radius:calc(var(--x-radius) * .4);padding:${16 * U}px ${30 * U}px;font:500 ${52 * U}px/1 var(--x-script-font);box-shadow:var(--x-shadow);`;
        const tick = doc.createElement("span");
        tick.style.cssText = `flex:none;width:${44 * U}px;height:${44 * U}px;border-radius:50%;background:var(--x-good);display:grid;place-items:center;`;
        tick.innerHTML = `<svg viewBox="0 0 24 24" width="${26 * U}" height="${26 * U}"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="var(--x-accent-ink)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const tx = doc.createElement("span"); tx.textContent = txt;
        s.append(tick, tx);
      } else if (p.item === "image-cards") {
        const w = (150 + 40 * ML.rnd(k, 3)) * U * 1.35;
        s.style.cssText += `width:${w}px;height:${w * 1.18}px;border:${3 * U * 1.35}px solid var(--x-panel);border-radius:calc(var(--x-radius) * .27);box-shadow:var(--x-shadow);overflow:hidden;`;
        if (pic && pic.src) {
          const im = doc.createElement("img");
          im.src = pic.currentSrc || pic.src;
          // a different crop of the same picture per card, never larger than its own pixels
          const nat = Math.max(pic.naturalWidth || 0, 1);
          im.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${(ML.rnd(k, 4) * 100).toFixed(0)}% ${(ML.rnd(k, 5) * 100).toFixed(0)}%;display:block;filter:var(--x-pic-filter);${nat < w ? `max-width:${nat}px;margin:auto;` : ""}`;
          s.append(im);
        } else {
          s.style.background = `linear-gradient(${(135 + 90 * ML.rnd(k, 6)).toFixed(0)}deg, var(--x-accent), var(--x-accent-2))`;
          s.style.display = "flex"; s.style.alignItems = "flex-end"; s.style.padding = `${14 * U}px`;
          s.style.color = "var(--x-accent-ink)"; s.style.font = `var(--x-label-weight) ${24 * U}px var(--x-body-font)`; s.style.whiteSpace = "normal";
          s.textContent = txt;
        }
      } else {
        // chips: pill, 44 px type; every third inverted, the fourth in the alert colour (S.chaos)
        const inv = k % 3 === 2, alert = k === 3;
        s.style.cssText += `background:${alert ? "var(--x-bad)" : inv ? "var(--x-ink)" : "var(--x-panel)"};color:${alert ? "var(--x-accent-ink)" : inv ? "var(--x-ground)" : "var(--x-ink)"};border:${Math.max(1, 2 * U).toFixed(2)}px solid ${alert ? "var(--x-bad)" : inv ? "var(--x-ink)" : "var(--x-edge-color)"};border-radius:var(--x-radius-s);padding:${22 * U}px ${40 * U}px;font:var(--x-head-weight) ${44 * U}px/1.1 var(--x-body-font);box-shadow:var(--x-shadow);`;
        s.textContent = txt;
      }
      layer.append(s);
      items.push(s);
    }
    // keep every sticker narrower than the region
    for (const s of items) if (s.offsetWidth > R.w * 0.62) { s.style.whiteSpace = "normal"; s.style.width = R.w * 0.6 + "px"; }
    // ── the spots ──
    const P = f.H > f.W;
    const PRESET = P ? [[110, 90], [560, 200], [80, 470], [520, 560], [140, 840], [600, 900]].map(([x, y]) => [x / 960, y / 1150]) : [[60, 90], [520, 170], [80, 420], [560, 470], [140, 700], [600, 740]].map(([x, y]) => [x / 960, y / 900]);
    let seed = 7;
    const lcg = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const spots = [];
    for (let k = 0; k < n; k++) {
      let u, v;
      if (p.layout === "seeded") { u = 0.06 + lcg() * 0.62; v = 0.04 + lcg() * 0.82; }
      else if (p.layout === "column") {
        const col = Math.min(n, Math.max(3, n - 2));
        if (k < col) { u = 0.08 + (k % 2) * 0.12 + ML.rnd(k, 8) * 0.05; v = 0.04 + (k / Math.max(1, col - 1)) * 0.62; }
        else { const j = k - col, m = n - col; u = 0.3 + (j / Math.max(1, m)) * 0.45; v = 0.82 + ML.rnd(k, 9) * 0.06; }
      } else if (p.layout === "around-subject") {
        const a = -Math.PI / 2 + (k / n) * Math.PI * 2 + (ML.rnd(k, 10) - 0.5) * 0.4;
        spots.push({ ring: a });
        continue;
      } else if (k < 6) { [u, v] = PRESET[k]; }
      else { u = 0.06 + ML.rnd(k, 11) * 0.6; v = 0.05 + ML.rnd(k, 12) * 0.8; }
      spots.push({ u, v });
    }
    const cx = sub.x + sub.w / 2, cy = sub.y + sub.h / 2;
    items.forEach((s, k) => {
      const w = s.offsetWidth, h = s.offsetHeight, sp = spots[k];
      let x, y;
      if (sp.ring != null) {
        const rx = sub.w / 2 + w * 0.6 + 24 * U, ry = sub.h / 2 + h * 0.6 + 24 * U;
        x = cx + Math.cos(sp.ring) * rx - w / 2; y = cy + Math.sin(sp.ring) * ry - h / 2;
      } else { x = R.x + sp.u * R.w; y = R.y + sp.v * R.h; }
      if (rtl) x = f.W - x - w; // mirrored spots
      x = ML.clamp(x, f.m * 0.5, f.W - f.m * 0.5 - w);
      y = ML.clamp(y, R.y - h * 0.2, R.y + R.h - h * 0.8);
      s.style.left = x.toFixed(1) + "px"; s.style.top = y.toFixed(1) + "px";
    });
    // ── timing ──
    const span = Math.max(0.3, end - at - 0.8);
    const stagger = Math.min(ML.clamp(p.stagger, 0.12, 0.6), (span * 0.8) / n);
    const tilt = ML.clamp(p.tilt, 4, 15);
    const cues = ["drop", "pop.soft", "pop"];
    const plan = items.map((s, k) => {
      const t0 = at + 0.1 + k * stagger;
      const rest = (ML.rnd(k, 13) < 0.5 ? -1 : 1) * tilt * (0.6 + 0.4 * ML.rnd(k, 14));
      const from = rest + (ML.rnd(k, 15) < 0.5 ? -1 : 1) * 15;
      ctx.sfx(t0, cues[k % 3], 0.35);
      return { s, t0, rest, from, ph: ML.rnd(k, 16) * Math.PI * 2 };
    });
    const shakeAt = p.shake ? Math.max(at + 0.1 + n * stagger + 0.4, end - 0.75) : Infinity;
    return {
      draw(t) {
        const shake = t >= shakeAt && t < shakeAt + 0.4 ? 12 * U * Math.sin(((t - shakeAt) / 0.05) * Math.PI) : 0;
        for (const o of plan) {
          let sc = 1, rot = o.rest, op = 1;
          if (t < o.t0) { o.s.style.visibility = "hidden"; continue; }
          o.s.style.visibility = "visible";
          if (p.entry === "slap") {
            const u = ML.out(t, o.t0, o.t0 + 0.25);
            sc = 1.15 - 0.15 * u; op = ML.lin(t, o.t0, o.t0 + 0.06); rot = o.rest + (1 - u) * (o.from - o.rest) * 0.3;
          } else if (p.entry === "stop-motion") {
            const fr = Math.floor((t - o.t0) * 12); // two held frames at 12 fps
            if (fr === 0) { sc = 0.82; rot = o.from * 0.5 + o.rest * 0.5; }
          } else {
            const u = ML.back(t, o.t0, o.t0 + 0.45, 1.8);
            sc = 0.5 + 0.5 * u; op = ML.lin(t, o.t0, o.t0 + 0.08); rot = o.from + (o.rest - o.from) * u;
          }
          const fy = 2 * U * Math.sin(((t - o.t0) / 2) * Math.PI * 2 + o.ph) * ML.lin(t, o.t0 + 0.3, o.t0 + 0.8);
          o.s.style.opacity = op.toFixed(4);
          o.s.style.transform = `translate(${shake.toFixed(2)}px, ${fy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${Math.min(sc, 1.15).toFixed(4)})`;
        }
      },
    };
  },
});
