// Record swap player: one large framed photo "record" replaced by the next, an editorial chapter player. One clock,
// each record a segment: the outgoing mount scales 1 → .92 and fades 1 → 0 in 0.5 s power2.in; the incoming one scales
// 1.06 → 1 and fades 0 → 1 in 0.6 s power2.out, starting `overlap` s before the outgoing has gone. The mount is a mat
// (the look's panel, ~10 px at 1080) with a mono caption under the picture; circular outlined prev / next arrows
// (52 px at 1080) sit beside it, and the pressed arrow taps .92 → 1 on each swap; a mono counter "02 / 05" below
// changes at the middle of each swap. The records are the target's picture and the scene's other pictures, each with
// its own crop so repeats still read as different records. RTL: the row mirrors (next sits on the left) and the
// chevrons turn; the counter's digits stay left to right.
// Source: MengTo/Skills web-design/editorial-portfolio-chapters ARTICLE.md (the chapter player), rebuilt (MIT).
ML.define({
  id: "photo.record-swap-player",
  category: "photo",
  name: "Record swap player",
  does: "One large framed photo record is replaced by the next — the old one scales down and fades as the new one scales in — with an 02 / 05 counter.",
  says: ["list", "choice", "story"],
  energy: 2,
  targets: ["image", "card"],
  duration: [1, 8],
  params: {
    records: { type: "number", range: [2, 8], default: 5 },
    overlap: { type: "number", range: [0, 0.4], default: 0.25, unit: "s" },
    counter: { type: "bool", default: true },
    arrows: { type: "bool", default: true },
  },
  pairs: ["photo.triptych-distribute", "text-in.punchline", "ui.cursor-glide-click"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/editorial-portfolio-chapters", license: "MIT", note: "ARTICLE.md chapter player (mat, arrows, counter, scale/fade swap) rebuilt as a function of t" },
  async setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const scene = ctx.scene || ctx.stage;
    const N = Math.round(ML.clamp(p.records, 2, 8));
    const overlap = ML.clamp(p.overlap, 0, 0.4);

    // ── where the player sits: the target's own box (a wrapper takes a picture's place in the layout) ──
    const replaced = /^(img|video|canvas|svg|picture)$/i.test(el.tagName);
    const b = ctx.box(el);
    let host = el;
    if (replaced) {
      const cs = getComputedStyle(el);
      host = document.createElement("div");
      host.style.cssText = `position:relative;display:${cs.display === "inline" ? "inline-block" : cs.display};width:${b.w}px;height:${b.h}px;flex:${cs.flex};align-self:${cs.alignSelf};margin:${cs.margin};box-sizing:border-box`;
      el.parentNode.insertBefore(host, el);
      host.append(el);
      el.style.position = "absolute"; el.style.inset = "0"; el.style.width = "100%"; el.style.height = "100%"; el.style.margin = "0";
    } else if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const hidden = replaced ? [el] : [...el.children];
    hidden.forEach((n) => (n.style.visibility = "hidden"));

    // ── the pictures: the target's own, then the scene's others, else one painted from the look ──
    const own = el.tagName === "IMG" ? el : el.querySelector("img");
    const imgs = [own, ...scene.querySelectorAll("img")].filter(Boolean);
    const pics = [];
    for (const i of imgs) {
      let s = i.currentSrc || i.src;
      if (!s || pics.some((q) => q.from === s)) continue;
      const from = s, w = i.naturalWidth || 0, h = i.naturalHeight || 0;
      // a vector picture is rasterised once at its own size, so its copies never re-rasterise between two frames
      if (w && h && /^data:image\/svg|\.svg(\?|$)/i.test(s)) { try { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(i, 0, 0, w, h); s = cv.toDataURL("image/png"); } catch (e) { /* keep the vector */ } }
      pics.push({ from, src: s, w, h });
    }
    if (!pics.length) {
      const probe = document.createElement("div"); host.append(probe);
      probe.style.cssText = "position:absolute;color:var(--x-accent);background-color:var(--x-accent-2)";
      const c1 = getComputedStyle(probe).color, c2 = getComputedStyle(probe).backgroundColor; probe.remove();
      const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 900;
      const g = cv.getContext("2d"), gr = g.createLinearGradient(0, 0, 1200, 900); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.fillRect(0, 0, 1200, 900);
      pics.push({ src: cv.toDataURL("image/png"), w: 1200, h: 900 });
    }

    // ── layout, all relative to the box ──
    const bw = Math.max(80, b.w), bh = Math.max(60, b.h);
    const cH = p.counter ? ML.clamp(bh * 0.11, 16, 46) : 0;
    const gapY = p.counter ? cH * 0.35 : 0;
    const mh = bh - cH - gapY;
    const A = p.arrows ? Math.min(52, mh * 0.3, bw * 0.09) : 0;
    const gapX = p.arrows ? Math.max(8, A * 0.45) : 0;
    const roomW = bw - 2 * A - 2 * gapX;
    const pad = ML.clamp(mh * 0.035, 4, 14);
    const capH = ML.clamp(mh * 0.1, 22, 40);
    const ratio = ML.clamp(pics[0].w && pics[0].h ? pics[0].w / pics[0].h : 4 / 3, 0.7, 1.8);
    let picH = mh - 2 * pad - capH, picW = picH * ratio;
    if (picW + 2 * pad > roomW) { picW = roomW - 2 * pad; picH = picW / ratio; }
    const mountW = picW + 2 * pad, mountH = picH + 2 * pad + capH;

    const player = document.createElement("div");
    player.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${gapY}px;pointer-events:none;will-change:transform`; // its own layer: its frames never re-raster the page under it
    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;justify-content:center;gap:${gapX}px;height:${mh}px;width:100%`;
    const arrow = (dirNext) => {
      const d = document.createElement("div");
      d.style.cssText = `flex:0 0 ${A}px;width:${A}px;height:${A}px;border-radius:999px;border:max(1.5px, ${(A * 0.035).toFixed(2)}px) solid var(--x-ink);color:var(--x-ink);display:flex;align-items:center;justify-content:center;box-sizing:border-box;opacity:.85`;
      // a chevron pointing to inline-end (next) or inline-start (prev); RTL flips the meaning of left / right
      const right = dirNext !== !!rtl;
      d.innerHTML = `<svg viewBox="0 0 24 24" width="${(A * 0.42).toFixed(1)}" height="${(A * 0.42).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="${right ? "9 5 16 12 9 19" : "15 5 8 12 15 19"}"/></svg>`;
      return d;
    };
    const prev = p.arrows ? arrow(false) : null, next = p.arrows ? arrow(true) : null;
    const mount = document.createElement("div");
    mount.style.cssText = `position:relative;flex:0 0 ${mountW}px;width:${mountW}px;height:${mountH}px`;
    if (prev) row.append(prev);
    row.append(mount);
    if (next) row.append(next);
    player.append(row);
    let counter = null;
    if (p.counter) {
      counter = document.createElement("div");
      counter.style.cssText = `font:var(--x-label-weight) ${(cH * 0.62).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-dim);letter-spacing:.08em;direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums`;
      player.append(counter);
    }
    host.append(player);

    // the records: a mat with the picture and a mono caption
    const pad2 = (n) => String(n).padStart(2, "0");
    const caption = (own && own.alt) || "";
    const recs = [];
    for (let i = 0; i < N; i++) {
      const pic = pics[i % pics.length];
      const r = document.createElement("div");
      r.style.cssText = `position:absolute;inset:0;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:min(var(--x-radius), ${(mountH * 0.05).toFixed(1)}px);box-shadow:var(--x-shadow);padding:${pad}px ${pad}px 0;box-sizing:border-box;opacity:0;visibility:hidden`;
      const im = document.createElement("img");
      im.decoding = "sync"; im.src = pic.src; im.alt = "";
      // each repeat of a picture shows its own crop (never past the picture's own pixels)
      const k = Math.floor(i / pics.length);
      let crop = "";
      if (k > 0 && pic.w) {
        const cut = Math.min(0.18, Math.max(0, (1 - (picW * 1.06) / pic.w) / 2)) * (0.6 + 0.4 * ML.rnd(i, 7));
        if (cut > 0.02) { const ox = (ML.rnd(i, 3) * 2 - 1) * cut, oy = (ML.rnd(i, 5) * 2 - 1) * cut; crop = `object-view-box:inset(${((cut + oy) * 100).toFixed(1)}% ${((cut - ox) * 100).toFixed(1)}% ${((cut - oy) * 100).toFixed(1)}% ${((cut + ox) * 100).toFixed(1)}%);`; }
      }
      const pos = ["50% 50%", "20% 40%", "80% 60%", "40% 80%", "60% 20%"][i % 5];
      im.style.cssText = `display:block;width:${picW}px;height:${picH}px;object-fit:cover;object-position:${pos};${crop}border-radius:min(var(--x-pic-radius), ${(mountH * 0.03).toFixed(1)}px);filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend)`;
      const cap = document.createElement("div");
      cap.style.cssText = `height:${capH}px;display:flex;align-items:center;justify-content:space-between;gap:8px;font:var(--x-label-weight) ${(capH * 0.55).toFixed(1)}px/1 var(--x-mono-font);color:var(--x-dim);white-space:nowrap;overflow:hidden`;
      const no = document.createElement("span"); no.textContent = "N° " + pad2(i + 1); no.style.cssText = "direction:ltr;unicode-bidi:isolate";
      const tx = document.createElement("span"); tx.textContent = caption; tx.style.cssText = "overflow:hidden;text-overflow:ellipsis";
      cap.append(no, tx);
      r.append(im, cap);
      mount.append(r);
      recs.push(r);
    }
    // every record decoded before the first frame (a picture landing between two frames breaks determinism)
    await Promise.all(recs.map((r) => r.querySelector("img").decode().catch(() => {})));

    // ── the clock: Ne records fit the span (at least ~0.55 s each); swap j starts at T[j] ──
    const span = Math.max(0.6, end - at);
    const Ne = Math.max(2, Math.min(N, Math.floor(span / 0.55)));
    const T = [at];
    for (let j = 1; j < Ne; j++) T.push(at + (j * span) / Ne);
    const inAt = (j) => (j === 0 ? -Infinity : T[j] + 0.5 - overlap);
    const midAt = (j) => (T[j] + inAt(j) + 0.6) / 2;
    for (let j = 1; j < Ne; j++) ctx.sfx(T[j] - 0.06, "click", 0.32);
    const pow2in = (x) => x * x, pow2out = (x) => 1 - (1 - x) * (1 - x);

    return {
      draw(t) {
        ML.show(player, t, at, Infinity);
        for (let j = 0; j < N; j++) {
          const r = recs[j];
          if (j >= Ne) { r.style.visibility = "hidden"; continue; }
          const tin = inAt(j), tout = j + 1 < Ne ? T[j + 1] : Infinity;
          if (t < tin || t > tout + 0.5) { r.style.visibility = "hidden"; r.style.opacity = "0"; continue; }
          let o = 1, s = 1;
          if (j > 0 && t < tin + 0.6) { const u = pow2out(ML.lin(t, tin, tin + 0.6)); o = u; s = 1.06 - 0.06 * u; }
          if (t >= tout) { const v = pow2in(ML.lin(t, tout, tout + 0.5)); o *= 1 - v; s *= 1 - 0.08 * v; }
          r.style.visibility = o > 0.001 ? "visible" : "hidden";
          r.style.opacity = o.toFixed(4);
          r.style.scale = s === 1 ? "none" : s.toFixed(4);
          r.style.zIndex = String(j);
        }
        // the counter changes at the middle of each swap
        if (counter) { let k = 0; for (let j = 1; j < Ne; j++) if (t >= midAt(j)) k = j; const s = `${pad2(k + 1)} / ${pad2(N)}`; if (counter.textContent !== s) counter.textContent = s; }
        // the pressed arrow taps .92 → 1 around each swap
        if (next) {
          let s = 1;
          for (let j = 1; j < Ne; j++) { const d = ML.lin(t, T[j] - 0.12, T[j]), u = ML.out(t, T[j], T[j] + 0.25); if (t >= T[j] - 0.12 && t <= T[j] + 0.25) s = 1 - 0.08 * (t < T[j] ? d : 1 - u); }
          next.style.scale = s === 1 ? "none" : s.toFixed(4);
        }
      },
    };
  },
});
