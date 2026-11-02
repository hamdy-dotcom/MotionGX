// Magic move: one element that exists in both scenes glides and resizes from its place in the first into its place
// in the next, while everything else blur-swaps around it. Ported from product-film-skill kit/move.ts + spring.ts
// (MIT): rect = lerp(fromRect, toRect, step(t)) on x, y, w, h with a closed-form damped spring (stiffness 150,
// damping 20, mass 1 -> ~38% at 0.1 s, 79% at 0.2 s, 97% at 0.3 s, settled by 0.6 s), or a FLIP timing (0.6 s
// power3.inOut). The traveler is drawn at the larger of its two sizes (SVG / built shapes re-rendered at each frame's
// size, text scaled down only), so it never scales above 1; the source hides from the move's start and the
// destination is the traveler once it lands. The rest leaves in a blur swap (text blurs, pictures only fade) and the
// next scene's content arrives with swapIn (0.18 s after landing, 0.18 s, blur 10 -> 0). Text never flies across
// text: marks and shapes travel, words blur out and in. The pairs (engine.md / ingredients.md transitions table):
//   element-to-slot   the target (a logo by default) lands in a reserved slot centre-frame, its caption blurs in
//   avatars-to-rows   diagram avatars each fly to the leading avatar of a list row (stagger <= 1/8 s), labels after
//   title-to-result   the headline shrinks into a search result's title (pure scale), URL and snippet around it
//   logos-to-headline proof logos each land in a reserved slot in the closing tagline, on its word's beat
//   tiles-to-windows  four grey tiles become four app windows in quadrants (gap 12 px, grey -> panel, r 10 -> 6),
//                     window chrome 0.2 s after
//   icon-to-window    a 56 px app icon (r 12) opens into an 80%-wide window (r 10); the icon fades to 30% as the UI
//                     comes in after 0.3 s; the background dims 10%
//   click-to-icon     the pointer clicks a round logo: a ring pulses 1 -> 1.3, the UI blurs out, the logo grows 2.5x
//                     to the centre while circle -> rounded square and white -> brand dark (0.6 s expo.inOut)
//   logo-to-corner    a centred logo shrinks to a corner bug (scale 1 -> 0.2, inset 24 px) or crossfades there,
//                     while the next caption enters
// Source: Rieranthony/product-film-skill templates/kit/move.ts, spring.ts, reference/engine.md "Magic moves",
// ingredients.md "Transitions" (MIT); pair variants from prompt-motion amol909s-opus-5-5-on-medium,
// wozu-co-the-prompt-i-used, notdwd-another-one-1000-ai, prasad-pilla-wtf-made-entirely-with (reference only).
ML.define({
  id: "transition.magic-move",
  category: "transition",
  name: "Magic move",
  does: "One element that exists in both scenes glides and resizes from its place in the first into its place in the next (a logo into a slot, a title into a result, an icon into a window) while everything else dissolves around it.",
  says: ["transition", "connection", "flow", "change", "list", "proof", "result", "brand", "trust", "focus", "reveal"],
  energy: 3,
  targets: ["logo", "card", "image", "shape", "scene", "list", "headline", "screen", "cursor"],
  duration: [0.5, 2.2], // a single element lands in 0.6 s; the staggered pairs (avatars, logos on their words) need up to 2.2 s
  params: {
    pair: { type: "choice", options: ["element-to-slot", "avatars-to-rows", "title-to-result", "logos-to-headline", "tiles-to-windows", "icon-to-window", "click-to-icon", "logo-to-corner"], default: "element-to-slot" },
    timing: { type: "choice", options: ["spring", "flip"], default: "spring" },
    stiffness: { type: "number", range: [100, 300], default: 150 },
    damping: { type: "number", range: [12, 30], default: 20 },
    stagger: { type: "number", range: [0, 0.15], default: 0, unit: "s" },
    morph_radius: { type: "bool", default: false },
    corner: { type: "choice", options: ["travel", "crossfade"], default: "travel" },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "product-film-skill:templates/kit/move.ts", license: "MIT", note: "with kit/spring.ts, reference/engine.md and ingredients.md; pair variants rebuilt from prompt-motion (reference)" },
  setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100, S = f.safe, P = f.pic;
    const host = ctx.scene || stage;
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);
    const rtl = ctx.rtl, NS = "http://www.w3.org/2000/svg";
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden";
    layer.setAttribute("dir", rtl ? "rtl" : "ltr"); // rows, bars and lines below start from the reading side on their own
    const outs = [...host.children]; // the first scene's content, before we add anything
    host.append(layer);
    const mk = (css, parent = layer) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;box-sizing:border-box;" + css; parent.append(d); return d; };
    const svgOf = (inner, vb = "0 0 100 100") => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", vb); s.setAttribute("preserveAspectRatio", "xMidYMid meet"); s.style.cssText = "width:100%;height:100%;display:block;overflow:visible"; s.innerHTML = inner; return s; };
    const io3 = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2); // power3.inOut
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const spring = { stiffness: p.stiffness, damping: p.damping, mass: 1 };
    const prog = (t, s, flipEase = io3) => (p.timing === "flip" ? flipEase(ML.lin(t, s, s + 0.6)) : ML.step(t - s, spring));
    const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u });
    const place = (el, r) => { el.style.left = (r.x - hb.x).toFixed(2) + "px"; el.style.top = (r.y - hb.y).toFixed(2) + "px"; el.style.width = Math.max(0, r.w).toFixed(2) + "px"; el.style.height = Math.max(0, r.h).toFixed(2) + "px"; };
    const fit = (w, h, maxW, maxH) => { const k = Math.min(maxW / w, maxH / h); return { w: w * k, h: h * k }; };
    // the first scene leaves: text blurs, everything else only fades
    const leave = (t, a, d = 0.18) => { const u = ML.lin(t, a, a + d); for (const o of outs) { o.style.opacity = (1 - u).toFixed(4); o.style.filter = u > 0 && o.classList.contains("ml-head") ? `blur(${(u * 10).toFixed(2)}px)` : "none"; } };
    const swap = (el, t, from) => { const s = ML.swapIn(t, from); el.style.opacity = s.o.toFixed(4); el.style.filter = s.blur > 0.05 ? `blur(${s.blur.toFixed(2)}px)` : "none"; };
    const appear = (el, t, a, d = 0.3) => { const s = ML.lin(t, a, a + d); el.style.opacity = s.toFixed(4); el.style.filter = s < 1 ? `blur(${((1 - s) * 10).toFixed(2)}px)` : "none"; };
    const logoOf = () => host.querySelector('[data-slot="logo"], [data-slot-sample="logo"]');
    const head = host.querySelector(".ml-title"), sub = host.querySelector(".ml-sub");
    const headText = head ? head.textContent.trim() : "";
    // a clone of a scene element drawn at a size of our choosing (SVG / pictures re-rendered, never past their pixels)
    const cloneAt = (src) => {
      const c = src.cloneNode(true);
      c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample");
      c.style.cssText = "position:absolute;left:0;top:0;margin:0;max-width:none;display:block;box-sizing:border-box";
      layer.append(c);
      return c;
    };
    const builtMark = (k) => svgOf([
      '<circle cx="50" cy="50" r="46" fill="var(--x-accent)"/><circle cx="50" cy="50" r="18" fill="var(--x-accent-ink)"/>',
      '<rect x="6" y="6" width="88" height="88" rx="24" fill="var(--x-accent-2)"/><path d="M30 64 L50 32 L70 64 Z" fill="var(--x-accent-ink)"/>',
      '<rect x="6" y="6" width="88" height="88" rx="44" fill="var(--x-ink)"/><rect x="30" y="30" width="40" height="40" rx="8" fill="var(--x-ground)"/>',
      '<path d="M50 4 L96 50 L50 96 L4 50 Z" fill="color-mix(in srgb, var(--x-accent) 60%, var(--x-ink))"/>',
      '<rect x="6" y="6" width="88" height="88" rx="14" fill="var(--x-good)"/><circle cx="50" cy="50" r="22" fill="none" stroke="var(--x-accent-ink)" stroke-width="9"/>',
    ][k % 5]);
    const say = (t, cue, vol) => ctx.sfx(t, cue, vol);
    const pair = p.pair;

    // ── element-to-slot ────────────────────────────────────────────────
    if (pair === "element-to-slot") {
      const src = ctx.el && ctx.el !== stage ? ctx.el : logoOf();
      const from = src ? ctx.box(src) : { x: P.x + P.w / 2 - 6 * v, y: P.y + P.h / 2 - 6 * v, w: 12 * v, h: 12 * v };
      let dw = Math.min(S.w * 0.5, from.w * 3), dh = dw * (from.h / Math.max(1, from.w));
      ({ w: dw, h: dh } = fit(dw, dh, S.w * 0.5, S.h * 0.25));
      if (src && src.tagName === "IMG" && src.naturalWidth) { const k = Math.min(1, src.naturalWidth / dw); dw *= k; dh *= k; }
      const to = { x: W / 2 - dw / 2, y: S.y + S.h * 0.42 - dh / 2, w: dw, h: dh };
      const T = at;
      const wrap = mk("overflow:hidden");
      const node = src ? cloneAt(src) : builtMark(0);
      wrap.append(node); node.style.cssText += ";position:absolute;left:0;top:0;width:100%;height:100%";
      // the reserved slot: a dashed outline the traveler lands in
      const slot = mk(`border:${Math.max(2, 0.2 * v).toFixed(1)}px dashed var(--x-line);border-radius:${p.morph_radius ? "50%" : "var(--x-radius)"};opacity:0`);
      const pad = 1.6 * v;
      place(slot, { x: to.x - pad, y: to.y - pad, w: to.w + 2 * pad, h: to.h + 2 * pad });
      const cap = mk(`left:${S.x - hb.x}px;width:${S.w}px;top:${(to.y + to.h + 4 * v - hb.y).toFixed(1)}px;text-align:center;font:var(--x-sub-weight) var(--x-sub-size)/1.25 var(--x-body-font);color:var(--x-ink);opacity:0`);
      cap.textContent = headText;
      say(T, "whoosh.soft", 0.35);
      return {
        draw(t) {
          if (src) src.style.visibility = t >= T ? "hidden" : "";
          wrap.style.visibility = t >= T ? "visible" : "hidden";
          leave(t, T);
          const u = prog(t, T), r = lerp(from, to, u);
          place(wrap, r);
          wrap.style.borderRadius = p.morph_radius ? `${(50 * ML.clamp(u)).toFixed(2)}%` : "0";
          slot.style.opacity = (ML.lin(t, T, T + 0.15) * (1 - ML.lin(u, 0.85, 1))).toFixed(4);
          swap(cap, t, T + 0.3);
        },
      };
    }

    // ── avatars-to-rows ────────────────────────────────────────────────
    if (pair === "avatars-to-rows") {
      const listEl = host.querySelector('[data-slot="list"], [data-slot-sample="list"]');
      const labels = listEl ? [...listEl.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
      const N = ML.clamp(labels.length || 4, 3, 5);
      const a0 = 9 * v, rowH = Math.min(12 * v, (S.h * 0.62) / N), gap = rowH * 0.28, aw = rowH * 0.66;
      const rowW = Math.min(S.w, f.wide ? W * 0.5 : S.w);
      const top = S.y + S.h / 2 - (N * rowH + (N - 1) * gap) / 2, rx = W / 2 - rowW / 2;
      const cx = W / 2, cy = P.y + P.h / 2, R = Math.min(P.w, P.h) * 0.28;
      const st = Math.min(0.125, p.stagger || 0.06);
      // the diagram: a hub, spokes, avatars round it
      const diag = mk(`left:0;top:0;width:${W}px;height:${H}px;opacity:0`);
      const spokes = svgOf("", `0 0 ${W} ${H}`); diag.append(spokes);
      const srcR = [], dstR = [], avs = [], rows = [], labs = [];
      for (let i = 0; i < N; i++) {
        const ang = -Math.PI / 2 + (i / N) * Math.PI * 2;
        const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
        spokes.innerHTML += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--x-line)" stroke-width="${Math.max(2, 0.25 * v).toFixed(1)}"/>`;
        srcR.push({ x: x - a0 / 2, y: y - a0 / 2, w: a0, h: a0 });
        const ry = top + i * (rowH + gap);
        const row = mk(`border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);opacity:0`);
        place(row, { x: rx, y: ry, w: rowW, h: rowH }); rows.push(row);
        const ax = rtl ? rx + rowW - (rowH - aw) / 2 - aw : rx + (rowH - aw) / 2;
        dstR.push({ x: ax, y: ry + (rowH - aw) / 2, w: aw, h: aw });
        const lab = mk(`font:var(--x-body-weight) ${(rowH * 0.32).toFixed(1)}px/1 var(--x-body-font);color:var(--x-ink);display:flex;align-items:center;white-space:nowrap;overflow:hidden;opacity:0`);
        place(lab, { x: rtl ? rx + rowH * 0.3 : rx + rowH, y: ry, w: rowW - rowH * 1.3, h: rowH });
        if (labels[i]) lab.textContent = labels[i];
        else lab.append(Object.assign(document.createElement("i"), { style: `display:block;height:${(rowH * 0.18).toFixed(1)}px;width:${(rowW * (0.35 + 0.2 * ML.rnd(i, 4))).toFixed(1)}px;border-radius:99px;background:var(--x-panel-2)` }));
        labs.push(lab);
      }
      const hub = mk(`border-radius:50%;background:var(--x-ink)`, diag); place(hub, { x: cx - 2.4 * v, y: cy - 2.4 * v, w: 4.8 * v, h: 4.8 * v });
      for (let i = 0; i < N; i++) {
        const av = mk(`border-radius:50%;overflow:hidden;background:color-mix(in srgb, var(--x-accent) ${60 + 12 * (i % 3)}%, var(--x-ink));opacity:0`);
        av.append(svgOf('<circle cx="50" cy="40" r="17" fill="var(--x-accent-ink)"/><path d="M18 92 C22 66 40 60 50 60 C60 60 78 66 82 92 Z" fill="var(--x-accent-ink)"/>'));
        avs.push(av);
      }
      const lead = at, T = at + 0.4;
      say(T, "whoosh.soft", 0.35);
      for (let i = 0; i < N; i++) if (i % 2 === 0) say(T + i * st + 0.3, "tap", 0.2);
      return {
        draw(t) {
          leave(t, lead, 0.25);
          diag.style.opacity = (ML.lin(t, lead + 0.05, lead + 0.3) * (1 - ML.lin(t, T, T + 0.18))).toFixed(4);
          avs.forEach((av, i) => {
            const s = T + i * st, u = prog(t, s);
            appear(av, t, lead + 0.05 + i * 0.03);
            place(av, lerp(srcR[i], dstR[i], u));
            swap(rows[i], t, s);
            swap(labs[i], t, s + 0.3);
          });
        },
      };
    }

    // ── title-to-result ────────────────────────────────────────────────
    if (pair === "title-to-result") {
      const src = ctx.el && ctx.el !== stage && ctx.el.classList.contains("ml-title") ? ctx.el : head;
      if (!src) return null;
      const rg = document.createRange(); rg.selectNodeContents(src);
      const sr = stage.getBoundingClientRect(), k0 = sr.width / (stage.offsetWidth || 1) || 1, rr = rg.getBoundingClientRect();
      const from = { x: (rr.left - sr.left) / k0, y: (rr.top - sr.top) / k0, w: rr.width / k0, h: rr.height / k0 };
      const cw = f.wide ? Math.min(S.w, W * 0.56) : S.w, padC = 4 * v;
      const card = mk(`border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);opacity:0`);
      const inner = cw - 2 * padC;
      const k = Math.min(0.46, inner / from.w);
      const tw = from.w * k, th = from.h * k;
      const urlH = 3.4 * v, snipSize = 2.9 * v;
      const ch = padC * 2 + urlH + 1.6 * v + th + 1.6 * v + snipSize * 1.4 * 2;
      const cardR = { x: W / 2 - cw / 2, y: S.y + S.h * 0.5 - ch / 2, w: cw, h: ch };
      place(card, cardR);
      // URL line: a favicon dot and a dim address bar (language-free), snippet: the scene's sub line
      const urlRow = mk(`left:${padC}px;top:${padC}px;width:${inner}px;height:${urlH}px;display:flex;gap:${1.2 * v}px;align-items:center`, card);
      urlRow.innerHTML = `<i style="display:block;width:${urlH}px;height:${urlH}px;border-radius:50%;background:var(--x-accent)"></i><i style="display:block;width:${(inner * 0.4).toFixed(1)}px;height:${(urlH * 0.38).toFixed(1)}px;border-radius:99px;background:var(--x-panel-2)"></i>`;
      const snip = mk(`left:${padC}px;top:${(padC + urlH + 1.6 * v + th + 1.6 * v).toFixed(1)}px;width:${inner}px;font:400 ${snipSize.toFixed(1)}px/1.4 var(--x-body-font);color:var(--x-dim);text-align:${rtl ? "right" : "left"};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden`, card);
      snip.textContent = sub ? sub.textContent.trim() : "";
      const to = { x: rtl ? cardR.x + padC + inner - tw : cardR.x + padC, y: cardR.y + padC + urlH + 1.6 * v, w: tw, h: th };
      // the traveler: the title, set exactly as its source line(s), scaled down only
      const cs = getComputedStyle(src);
      const tr = document.createElement("div");
      tr.className = src.className; tr.textContent = src.textContent;
      tr.style.cssText = `position:absolute;left:0;top:0;width:${(from.w + 2).toFixed(1)}px;text-align:${cs.textAlign};white-space:${from.h > parseFloat(cs.lineHeight) * 1.5 ? "normal" : "nowrap"};transform-origin:0 0;color:var(--x-ink);margin:0`;
      tr.setAttribute("dir", rtl ? "rtl" : "ltr");
      layer.append(tr);
      const T = at;
      say(T, "whoosh.soft", 0.35);
      return {
        draw(t) {
          src.style.visibility = t >= T ? "hidden" : "";
          tr.style.visibility = t >= T ? "visible" : "hidden";
          leave(t, T);
          const u = prog(t, T), r = lerp(from, to, u), s = r.w / from.w;
          tr.style.transform = `translate(${(r.x - hb.x).toFixed(2)}px, ${(r.y - hb.y).toFixed(2)}px) scale(${Math.min(1, s).toFixed(4)})`;
          tr.style.color = `color-mix(in srgb, var(--x-accent) ${(ML.clamp(u) * 100).toFixed(1)}%, var(--x-ink))`;
          swap(card, t, T);
        },
      };
    }

    // ── logos-to-headline ──────────────────────────────────────────────
    if (pair === "logos-to-headline") {
      const words = headText.split(/\s+/).filter(Boolean);
      const M = Math.max(1, Math.min(3, words.length));
      // the tagline: the headline's words with M reserved slots between them
      const tag = document.createElement("div");
      tag.className = "ml-title";
      tag.setAttribute("dir", rtl ? "rtl" : "ltr");
      const hbx = head ? ctx.box(head) : { x: S.x, y: S.y, w: S.w, h: S.h * 0.2 };
      tag.style.cssText = `position:absolute;left:${(S.x - hb.x).toFixed(1)}px;width:${S.w}px;top:${(hbx.y - hb.y).toFixed(1)}px;text-align:center;opacity:1`;
      layer.append(tag);
      const after = [...Array(M)].map((_, i) => Math.max(0, Math.min(words.length - 1, Math.round(((i + 1) * words.length) / (M + 1)) - 1)));
      const wEls = [], slots = [];
      words.forEach((w, j) => {
        const s = document.createElement("span"); s.className = "ml-w"; s.style.display = "inline-block"; s.textContent = w; tag.append(s); wEls.push(s);
        const n = after.filter((x) => x === j).length;
        for (let q = 0; q < n; q++) { tag.append(" "); const sl = document.createElement("span"); sl.style.cssText = "display:inline-block;width:0.86em;height:0.86em;vertical-align:-0.1em"; tag.append(sl); slots.push({ sl, word: w, j }); }
        if (j < words.length - 1) tag.append(" ");
      });
      const mSize = Math.min(14 * v, (P.w * 0.8) / M), mGap = mSize * 0.45;
      const rowW = M * mSize + (M - 1) * mGap;
      const srcR = slots.map((_, i) => ({ x: W / 2 - rowW / 2 + (rtl ? M - 1 - i : i) * (mSize + mGap), y: P.y + P.h / 2 - mSize / 2, w: mSize, h: mSize }));
      const dstR = slots.map((s) => ctx.box(s.sl));
      const marks = slots.map((_, i) => { const d = mk("opacity:0"); d.append(builtMark(i)); return d; });
      const lead = at, T = at + 0.45;
      // each logo lands on its word's beat (else a steady stagger)
      const st = Math.max(0.12, p.stagger);
      const starts = slots.map((s, i) => { const w = ctx.word(s.word, T + i * st); return Math.max(T + i * 0.12, Math.min(w - 0.2, T + 1.2)); });
      const wordT = wEls.map((_, j) => T + 0.05 + j * 0.06);
      starts.forEach((s) => say(s + 0.25, "pop.soft", 0.25));
      say(T, "whoosh.soft", 0.3);
      return {
        draw(t) {
          leave(t, lead, 0.25);
          wEls.forEach((w, j) => swap(w, t, wordT[j] - 0.18));
          marks.forEach((m, i) => { appear(m, t, lead + 0.05 + i * 0.04); place(m, lerp(srcR[i], dstR[i], prog(t, starts[i]))); });
        },
      };
    }

    // ── tiles-to-windows ───────────────────────────────────────────────
    if (pair === "tiles-to-windows") {
      const g0 = 2 * v, s0 = 12 * v, gap = 1.1 * v;
      const area = { x: P.x, y: P.y, w: P.w, h: P.h };
      const qw = (area.w - gap) / 2, qh = Math.min((area.h - gap) / 2, qw * 0.8);
      const ay = area.y + (area.h - (2 * qh + gap)) / 2;
      const tiles = [];
      for (let i = 0; i < 4; i++) {
        const c = i % 2, r = Math.floor(i / 2), cc = rtl ? 1 - c : c;
        const from = { x: W / 2 - s0 - g0 / 2 + cc * (s0 + g0), y: P.y + P.h / 2 - s0 - g0 / 2 + r * (s0 + g0), w: s0, h: s0 };
        const to = { x: area.x + cc * (qw + gap), y: ay + r * (qh + gap), w: qw, h: qh };
        const d = mk("overflow:hidden;opacity:0");
        const bar = mk(`left:0;top:0;width:100%;height:${(3.2 * v).toFixed(1)}px;border-bottom:var(--x-edge) solid var(--x-line);display:flex;gap:${(0.7 * v).toFixed(1)}px;align-items:center;padding:0 ${(1.2 * v).toFixed(1)}px;opacity:0`, d);
        bar.innerHTML = [1, 2, 3].map((k) => `<i style="display:block;width:${(1 * v).toFixed(1)}px;height:${(1 * v).toFixed(1)}px;border-radius:50%;background:var(--x-light-${k})"></i>`).join("");
        const body = mk(`left:${(1.4 * v).toFixed(1)}px;right:${(1.4 * v).toFixed(1)}px;top:${(4.6 * v).toFixed(1)}px;display:grid;gap:${(1 * v).toFixed(1)}px;opacity:0`, d);
        body.innerHTML = [0.8, 0.55, 0.7].map((w, k) => `<i style="display:block;height:${(1.2 * v).toFixed(1)}px;width:${(w * 100 - k * 4 * ML.rnd(i, k)).toFixed(0)}%;border-radius:99px;background:${k === 0 ? "color-mix(in srgb, var(--x-accent) 40%, var(--x-panel-2))" : "var(--x-panel-2)"}"></i>`).join("");
        tiles.push({ d, from, to, bar, body });
      }
      const lead = at, T = at + 0.4, st = p.stagger;
      say(T, "whoosh.soft", 0.35);
      return {
        draw(t) {
          leave(t, lead, 0.25);
          tiles.forEach((tl, i) => {
            const s = T + i * st, u = prog(t, s), c = ML.clamp(u);
            appear(tl.d, t, lead + 0.05 + i * 0.03);
            place(tl.d, lerp(tl.from, tl.to, u));
            tl.d.style.background = `color-mix(in srgb, var(--x-panel) ${(c * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) 14%, var(--x-panel)))`;
            tl.d.style.borderRadius = `${((0.93 - 0.37 * c) * v).toFixed(2)}px`;
            tl.d.style.boxShadow = c > 0.5 ? "var(--x-shadow)" : "none";
            const landed = s + (p.timing === "flip" ? 0.6 : 0.3);
            const ch = ML.lin(t, landed + 0.2, landed + 0.4);
            tl.bar.style.opacity = ch.toFixed(4); tl.body.style.opacity = ch.toFixed(4);
          });
        },
      };
    }

    // ── icon-to-window ─────────────────────────────────────────────────
    if (pair === "icon-to-window") {
      const i0 = 5.2 * v, ww = W * 0.8, wh = Math.min(P.h * 0.92, ww * (f.wide ? 0.5 : 0.75));
      const cx = W / 2, cy = P.y + P.h / 2;
      const from = { x: cx - i0 / 2, y: cy - i0 / 2, w: i0, h: i0 }, to = { x: cx - ww / 2, y: cy - wh / 2, w: ww, h: wh };
      const dim = mk(`left:0;top:0;width:${W}px;height:${H}px;background:var(--x-device);opacity:0`);
      const win = mk("overflow:hidden;opacity:0");
      const glyph = mk(`left:50%;top:50%;width:${(i0 * 0.56).toFixed(1)}px;height:${(i0 * 0.56).toFixed(1)}px;translate:-50% -50%`, win);
      glyph.append(svgOf('<rect x="8" y="8" width="36" height="36" rx="8" fill="currentColor"/><rect x="56" y="8" width="36" height="36" rx="8" fill="currentColor" opacity=".7"/><rect x="8" y="56" width="36" height="36" rx="8" fill="currentColor" opacity=".7"/><rect x="56" y="56" width="36" height="36" rx="18" fill="currentColor"/>'));
      const ui = mk(`inset:0;opacity:0`, win);
      const bh = 4 * v;
      ui.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;height:${bh}px;border-bottom:var(--x-edge) solid var(--x-line);display:flex;gap:${0.9 * v}px;align-items:center;padding:0 ${1.6 * v}px">${[1, 2, 3].map((k) => `<i style="display:block;width:${1.2 * v}px;height:${1.2 * v}px;border-radius:50%;background:var(--x-light-${k})"></i>`).join("")}</div>` +
        `<div style="position:absolute;left:${3 * v}px;right:${3 * v}px;top:${bh + 3 * v}px;display:grid;gap:${1.6 * v}px">${[0.5, 0.9, 0.75, 0.82, 0.6].map((w, k) => `<i style="display:block;height:${(k === 0 ? 3 : 1.5) * v}px;width:${w * 100}%;border-radius:99px;background:${k === 0 ? "var(--x-ink)" : "var(--x-panel-2)"}"></i>`).join("")}</div>`;
      const lead = at, T = at + 0.35;
      say(lead, "pop.soft", 0.25); say(T, "whoosh.soft", 0.35);
      return {
        draw(t) {
          const pop = ML.back(t, lead, lead + 0.25, 1.6);
          win.style.opacity = t >= lead ? "1" : "0";
          const u = prog(t, T), c = ML.clamp(u);
          const r = t < T ? { x: cx - (i0 * pop) / 2, y: cy - (i0 * pop) / 2, w: i0 * pop, h: i0 * pop } : lerp(from, to, u);
          place(win, r);
          win.style.borderRadius = `${((1.1 - 0.17 * c) * v).toFixed(2)}px`;
          win.style.background = `color-mix(in srgb, var(--x-panel) ${(c * 100).toFixed(1)}%, var(--x-accent))`;
          win.style.boxShadow = "var(--x-shadow)";
          glyph.style.opacity = (1 - 0.7 * ML.lin(t, T + 0.3, T + 0.5)).toFixed(4);
          glyph.style.color = `color-mix(in srgb, var(--x-accent) ${(c * 100).toFixed(1)}%, var(--x-accent-ink))`;
          ui.style.opacity = ML.lin(t, T + 0.3, T + 0.5).toFixed(4);
          dim.style.opacity = (0.1 * ML.ease(t, T, T + 0.4)).toFixed(4);
        },
      };
    }

    // ── click-to-icon ──────────────────────────────────────────────────
    if (pair === "click-to-icon") {
      const lg = logoOf();
      const lb = lg ? ctx.box(lg) : { x: W / 2 - 5 * v, y: P.y + P.h / 2 - 5 * v, w: 10 * v, h: 10 * v };
      const d0 = Math.max(9 * v, lb.h * 1.3), d1 = d0 * 2.5;
      const from = { x: lb.x + lb.w / 2 - d0 / 2, y: lb.y + lb.h / 2 - d0 / 2, w: d0, h: d0 };
      const to = { x: W / 2 - d1 / 2, y: S.y + S.h / 2 - d1 / 2, w: d1, h: d1 };
      const btn = mk(`border:var(--x-edge) solid var(--x-edge-color);overflow:hidden;opacity:0`);
      const gl = mk(`left:22%;top:22%;width:56%;height:56%`, btn);
      // the button carries the logo's own mark (a lockup's wordmark stays behind): one colour follows the button's ink
      const markOf = () => {
        if (!lg) return builtMark(0);
        if (lg.tagName === "IMG") { const c = lg.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); c.style.cssText = `width:100%;height:100%;object-fit:contain;display:block;margin:auto;${lg.naturalWidth ? `max-width:${lg.naturalWidth}px;max-height:${lg.naturalHeight}px` : ""}`; return c; }
        const svg = lg.tagName.toLowerCase() === "svg" ? lg : lg.querySelector("svg");
        if (!svg) return builtMark(0);
        const skip = ["defs", "title", "style", "text"];
        const shapes = [...svg.children].filter((c) => !skip.includes(c.tagName.toLowerCase()));
        if (!shapes.length) return builtMark(0);
        const bbs = shapes.map((c) => c.getBBox()), x0 = Math.min(...bbs.map((b) => b.x)), y0 = Math.min(...bbs.map((b) => b.y)), x1 = Math.max(...bbs.map((b) => b.x + b.width)), y1 = Math.max(...bbs.map((b) => b.y + b.height));
        const fills = new Set(shapes.map((c) => getComputedStyle(c).fill).filter((x) => x !== "none"));
        const out = svg.cloneNode(true);
        out.removeAttribute("data-slot"); out.removeAttribute("data-slot-sample");
        out.querySelectorAll("text").forEach((x) => x.remove());
        out.setAttribute("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`); out.removeAttribute("width"); out.removeAttribute("height");
        out.style.cssText = "width:100%;height:100%;display:block;overflow:visible";
        if (fills.size <= 1) for (const c of out.children) { if (skip.includes(c.tagName.toLowerCase())) continue; c.style.fill = "currentColor"; }
        return out;
      };
      gl.append(markOf());
      const ring = mk(`border-radius:50%;border:${Math.max(2, 0.3 * v).toFixed(1)}px solid var(--x-accent);opacity:0`);
      place(ring, from);
      const ptr = mk(`width:${(4.4 * v).toFixed(1)}px;height:${(4.4 * v).toFixed(1)}px;opacity:0;transform-origin:10% 6%`);
      ptr.append(svgOf('<path d="M10 6 L10 84 L30 66 L44 96 L58 90 L44 60 L72 60 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="6" stroke-linejoin="round"/>'));
      const C = at + 0.45; // the click
      const pA = { x: from.x + d0 * (rtl ? -0.9 : 1.6), y: from.y + d0 * 1.8 }, pB = { x: from.x + d0 * 0.5, y: from.y + d0 * 0.5 };
      say(C, "click", 0.4); say(C + 0.05, "whoosh.soft", 0.3);
      return {
        draw(t) {
          btn.style.opacity = ML.lin(t, at, at + 0.2).toFixed(4);
          // pointer glides in on an arc, clicks (squash), leaves
          const g = ML.ease(t, at, C - 0.05), arc = Math.sin(Math.PI * g) * d0 * 0.4;
          const px = pA.x + (pB.x - pA.x) * g + (rtl ? arc : -arc), py = pA.y + (pB.y - pA.y) * g;
          ptr.style.left = (px - 0.44 * v - hb.x).toFixed(2) + "px"; ptr.style.top = (py - 0.26 * v - hb.y).toFixed(2) + "px"; // the arrow's tip on the point
          ptr.style.opacity = (ML.lin(t, at, at + 0.15) * (1 - ML.lin(t, C + 0.1, C + 0.25))).toFixed(4);
          ptr.style.scale = (1 - 0.12 * ML.pulse(t, C, 0.04, 0.08)).toFixed(4);
          ptr.style.transform = rtl ? "scaleX(-1)" : "none";
          // ring pulse 1 -> 1.3, fading over 0.4 s
          const rp = ML.lin(t, C, C + 0.4);
          ring.style.opacity = (t >= C ? 1 - rp : 0).toFixed(4);
          ring.style.scale = (1 + 0.3 * ML.out(t, C, C + 0.4)).toFixed(4);
          leave(t, C, 0.3);
          if (lg) lg.style.visibility = t >= at + 0.2 ? "hidden" : "";
          const u = p.timing === "flip" ? expoIO(ML.lin(t, C + 0.1, C + 0.7)) : prog(t, C + 0.1);
          const c = ML.clamp(u), r = lerp(from, to, u);
          place(btn, r);
          btn.style.borderRadius = `${(50 - 28 * c).toFixed(2)}%`;
          const fillU = expoIO(ML.lin(t, C + 0.1, C + 0.7));
          btn.style.background = `color-mix(in srgb, color-mix(in srgb, var(--x-accent) 55%, var(--x-device)) ${(fillU * 100).toFixed(1)}%, var(--x-panel))`;
          btn.style.boxShadow = "var(--x-shadow)";
          gl.style.color = `color-mix(in srgb, var(--x-accent-ink) ${(fillU * 100).toFixed(1)}%, var(--x-accent))`;
        },
      };
    }

    // ── logo-to-corner ─────────────────────────────────────────────────
    const lg = logoOf();
    const lb0 = lg ? ctx.box(lg) : { w: 10 * v, h: 10 * v };
    let bw = Math.min(S.w * 0.46, W * 0.4), bhh = bw * (lb0.h / Math.max(1, lb0.w));
    ({ w: bw, h: bhh } = fit(bw, bhh, S.w * 0.46, S.h * 0.18));
    const from = { x: W / 2 - bw / 2, y: S.y + S.h * 0.4 - bhh / 2, w: bw, h: bhh };
    const inset = 2.2 * v, cw = bw * 0.2, chh = bhh * 0.2;
    const to = { x: rtl ? inset : W - inset - cw, y: Math.max(inset, f.tall ? f.safe.y * 0.45 : inset), w: cw, h: chh };
    const mkLogo = () => { const d = mk("opacity:0"); if (lg) { const c = lg.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); c.style.cssText = "width:100%;height:100%;display:block;max-width:none"; d.append(c); } else d.append(builtMark(0)); return d; };
    const big = mkLogo(), bug = mkLogo();
    const capEl = mk(`left:${S.x - hb.x}px;width:${S.w}px;top:${(S.y + S.h * 0.4 - hb.y).toFixed(1)}px;translate:0 -50%;text-align:center;font:var(--x-head-weight) var(--x-head-size)/var(--x-head-line) var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);opacity:0`);
    capEl.textContent = headText;
    const lead = at, T = at + 0.5;
    say(T, "whoosh.soft", 0.3);
    return {
      draw(t) {
        leave(t, lead, 0.25);
        if (p.corner === "crossfade") {
          const o = 1 - ML.lin(t, T, T + 0.35), s = 1 - 0.4 * ML.out(t, T, T + 0.35);
          big.style.opacity = (ML.lin(t, lead + 0.05, lead + 0.3) * o).toFixed(4);
          place(big, { x: from.x + (from.w * (1 - s)) / 2, y: from.y + (from.h * (1 - s)) / 2, w: from.w * s, h: from.h * s });
          bug.style.opacity = ML.ease(t, T + 0.1, T + 0.5).toFixed(4);
          place(bug, to);
        } else {
          const u = p.timing === "flip" ? io3(ML.lin(t, T, T + 0.6)) : prog(t, T);
          big.style.opacity = ML.lin(t, lead + 0.05, lead + 0.3).toFixed(4);
          place(big, lerp(from, to, u));
          bug.style.opacity = "0";
        }
        swap(capEl, t, T + 0.1);
      },
    };
  },
});
