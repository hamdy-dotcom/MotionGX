// Social post card drawn in HTML: avatar (from the source, else an initial on the look's accent), name, @handle, the post
// word for word, its reach (replies, reposts, likes, views). Rendered on its own as a full-frame piece on the scene's
// ground, or as a side card leaving the end of the frame free for a camera bubble. It credits a person: never a
// screenshot pretending to be live, no platform logo. Enters and leaves with the look's own motion (ML.show).
// Source: MengTo/Skills media/html-reel references/structures.md, "Post card" (MIT); drawn here as our own code.
ML.define({
  id: "ui.post-card",
  category: "ui",
  name: "Social post card drawn in HTML",
  does: "A social post appears as a card with avatar, name, handle, its words and its reach, crediting the person.",
  says: ["proof", "trust", "story"],
  energy: 2,
  targets: ["card"],
  duration: [1.5, 5],
  params: {
    size: { type: "choice", options: ["full-frame", "side-card"], default: "side-card" },
    avatar: { type: "text" },
    name: { type: "text" },
    handle: { type: "text" },
    text: { type: "text" },
    when: { type: "text" },
    replies: { type: "text" },
    reposts: { type: "text" },
    likes: { type: "text" },
    views: { type: "text" },
    verified: { type: "bool", default: true },
  },
  pairs: ["camera.push-in", "ui.hotspot-tooltip"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "MengTo/Skills:media/html-reel/references/structures.md", license: "MIT", note: "the post card structure; the drawing is our own code" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, host = ctx.scene || stage, k = Math.min(f.W, f.H) / 1080;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const target = el && el !== stage ? el : null;
    const own = target ? (target.children.length ? [...target.children].map((c) => c.textContent.trim()).join(" ") : target.textContent).trim() : "";
    const L = rtl
      ? { name: "منى حسن", handle: "@mona.builds", text: "جرّبت الأداة دي امبارح. عملت في ساعة اللي كان بياخد مني أسبوع، ومن غير ما أفتح برنامج مونتاج.", when: "من ساعتين" }
      : { name: "Mona Hassan", handle: "@mona.builds", text: "Tried this tool yesterday. One hour for what used to take me a week, and I never opened an editor.", when: "2h" };
    const name = p.name || L.name, full = p.size === "full-frame";

    let wrap = null, cardW, maxH;
    const card = mk("box-sizing:border-box;background:var(--x-panel);color:var(--x-ink);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);font-family:var(--x-body-font);display:flex;flex-direction:column;");
    if (target) {
      if (getComputedStyle(target).position === "static") target.style.position = "relative";
      target.replaceChildren(card);
      cardW = target.clientWidth || f.pic.w;
      maxH = target.clientHeight || f.pic.h;
      card.style.width = "100%";
    } else if (full) {
      // a full-frame piece: the card alone on the scene's ground
      wrap = mk("position:absolute;inset:0;z-index:7;background:var(--x-ground);background-image:var(--x-ground-image);display:flex;align-items:center;justify-content:center;", host);
      const S = f.safe;
      cardW = Math.min(S.w, f.wide ? 1180 * k : S.w);
      maxH = S.h;
      wrap.append(card);
      card.style.width = `${cardW}px`;
    } else {
      // a side card: at the reading start of the picture region, the other end free for the camera bubble
      const R = f.pic;
      cardW = Math.min(R.w * (f.wide ? 0.5 : 0.78), 860 * k);
      maxH = R.h;
      wrap = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:7;display:flex;align-items:center;justify-content:flex-start;`, host);
      wrap.append(card);
      card.style.width = `${cardW}px`;
    }
    const u = cardW / 560;
    const pad = 30 * u;
    card.style.padding = `${pad.toFixed(1)}px`;
    card.style.gap = `${(20 * u).toFixed(1)}px`;

    const top = mk(`display:flex;align-items:center;gap:${(16 * u).toFixed(1)}px;`, card);
    const av = 68 * u;
    if (p.avatar) {
      const img = doc.createElement("img");
      img.src = p.avatar; img.alt = "";
      img.style.cssText = `flex:none;width:${av.toFixed(1)}px;height:${av.toFixed(1)}px;border-radius:50%;object-fit:cover;background:var(--x-panel-2);`;
      top.append(img);
      if (img.decode) await img.decode().catch(() => {});
    } else {
      const a = mk(`flex:none;width:${av.toFixed(1)}px;height:${av.toFixed(1)}px;border-radius:50%;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));color:var(--x-accent-ink);display:grid;place-items:center;font:var(--x-head-weight) ${(av * 0.46).toFixed(1)}px/1 var(--x-head-font);`, top, Array.from(name.trim())[0] || "");
      a.setAttribute("aria-hidden", "true");
    }
    const who = mk(`min-width:0;flex:1;display:flex;flex-direction:column;gap:${(3 * u).toFixed(1)}px;`, top);
    const nameRow = mk(`display:flex;align-items:center;gap:${(8 * u).toFixed(1)}px;`, who);
    mk(`font:var(--x-head-weight) ${(26 * u).toFixed(1)}px/1.25 var(--x-head-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, nameRow, name);
    if (p.verified) {
      const b = mk(`flex:none;width:${(24 * u).toFixed(1)}px;height:${(24 * u).toFixed(1)}px;border-radius:50%;background:var(--x-accent);display:grid;place-items:center;`, nameRow);
      b.innerHTML = `<svg viewBox="0 0 24 24" width="${(16 * u).toFixed(1)}" height="${(16 * u).toFixed(1)}" fill="none" stroke="var(--x-accent-ink)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    }
    const meta = mk(`display:flex;gap:${(10 * u).toFixed(1)}px;font-size:${(20 * u).toFixed(1)}px;color:var(--x-dim);white-space:nowrap;`, who);
    mk("direction:ltr;unicode-bidi:isolate;", meta, p.handle || L.handle);
    mk("", meta, "·");
    mk("", meta, p.when || L.when);

    const body = mk(`font:var(--x-body-weight) ${(30 * u).toFixed(1)}px/1.42 var(--x-body-font);text-wrap:pretty;`, card, p.text || own || L.text);
    body.dir = "auto";
    if (rtl) body.style.textAlign = "right";

    const ICON = {
      replies: '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
      reposts: '<path d="M4 9l4-4 4 4M8 5v10a3 3 0 0 0 3 3h3M20 15l-4 4-4-4M16 19V9a3 3 0 0 0-3-3h-3"/>',
      likes: '<path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8 2.2C20 15.4 12 20 12 20z"/>',
      views: '<path d="M5 20v-7M12 20V5M19 20v-10"/>',
    };
    const reach = mk(`display:flex;justify-content:space-between;gap:${(12 * u).toFixed(1)}px;padding-top:${(16 * u).toFixed(1)}px;border-top:var(--x-edge) solid var(--x-edge-color);color:var(--x-dim);font:500 ${(22 * u).toFixed(1)}px var(--x-body-font);`, card);
    const SAMPLE = { replies: "148", reposts: "1.2K", likes: "9.8K", views: "412K" };
    for (const key of Object.keys(ICON)) {
      const it = mk(`display:flex;align-items:center;gap:${(7 * u).toFixed(1)}px;white-space:nowrap;`, reach);
      it.innerHTML = `<svg viewBox="0 0 24 24" width="${(26 * u).toFixed(1)}" height="${(26 * u).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[key]}</svg>`;
      mk("direction:ltr;unicode-bidi:isolate;", it, p[key] || SAMPLE[key]);
    }

    // long words: the type shrinks until the card fits its region
    let size = 30 * u;
    while (card.offsetHeight > maxH && size > 16 * u) { size -= u; body.style.fontSize = `${size.toFixed(1)}px`; }

    const leave = end - 0.25;
    ctx.sfx(at, "card", 0.4);
    return {
      draw(t) {
        ML.show(card, t, at, leave);
        if (wrap && full) wrap.style.opacity = (ML.out(t, at, at + 0.2) * (1 - ML.ease(t, leave, leave + 0.22))).toFixed(4);
      },
    };
  },
});
