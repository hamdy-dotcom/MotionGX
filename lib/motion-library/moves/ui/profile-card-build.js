// Profile card builds piece by piece: a card on the look's panel (340 × 200 reference proportions, radius 14 / 340 of its width, soft
// 0 20px 40px shadow from the look) rises 20 → 0 while fading in over 0.35 s; then its pieces arrive on a `stagger`:
// the avatar scales 0.6 → 1, the name fades in, the verified badge pops 0 → 1.2 → 1, the stats line, the two-line bio,
// and the buttons slide up. Everything is sized from the card's width, so it reads the same on every shape.
// Source: prompt-motion ratheejaisal "bro i just one…" (reference only — our own rebuild).
ML.define({
  id: "ui.profile-card-build",
  category: "ui",
  name: "Profile card builds piece by piece",
  does: "A card appears and fills in: avatar, name with verified badge, stats, bio and buttons, each popping in.",
  says: ["result", "arrival", "trust"],
  energy: 3,
  targets: ["card", "screen"],
  duration: [1.4, 2.5],
  params: {
    stagger: { type: "number", range: [0.06, 0.15], default: 0.1, unit: "s" },
    badge: { type: "bool", default: true },
    name: { type: "text" },
    handle: { type: "text" },
    bio: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "element.pop-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "prompt-motion:ratheejaisal-bro-i-just-one", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = own ? ctx.scene || ctx.stage : ctx.el;
    if (!own && getComputedStyle(host).position === "static") host.style.position = "relative";
    const R = own ? f.pic : { x: 0, y: 0, w: host.clientWidth, h: host.clientHeight };
    const L = rtl
      ? { name: "سارة منصور", handle: "@sara.designs", bio: "مصمّمة منتجات، بحب الحاجات البسيطة اللي بتشتغل. القاهرة ← العالم.", stats: [["١٢٨", "منشور"], ["١٤٫٢ ألف", "متابع"], ["٣١٠", "بتتابع"]], follow: "متابعة", msg: "رسالة" }
      : { name: "Sara Mansour", handle: "@sara.designs", bio: "Product designer. I like simple things that work. Cairo → everywhere.", stats: [["128", "posts"], ["14.2k", "followers"], ["310", "following"]], follow: "Follow", msg: "Message" };

    // the card: 340 × 200 reference, every size a share of its width
    const w = Math.min(R.w * 0.92, R.h * 1.35, f.wide ? 820 : 900); // tall enough for its pieces in a short slot too
    const u = w / 340;
    const card = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:0;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${(18 * u).toFixed(1)}px;display:flex;flex-direction:column;gap:${(10 * u).toFixed(1)}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:${(14 * u).toFixed(1)}px;box-shadow:0 ${(20 * u / 2).toFixed(1)}px ${(40 * u / 2).toFixed(1)}px color-mix(in srgb, var(--x-ink) 8%, transparent), var(--x-shadow);color:var(--x-ink);font-family:var(--x-body-font);z-index:6;pointer-events:none;`, host);
    const top = mk("div", `display:flex;align-items:center;gap:${(12 * u).toFixed(1)}px;`, card);
    const name = p.name || L.name;
    const avatar = mk("div", `flex:none;width:${(54 * u).toFixed(1)}px;height:${(54 * u).toFixed(1)}px;border-radius:50%;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));color:var(--x-accent-ink);display:grid;place-items:center;font:var(--x-head-weight) ${(20 * u).toFixed(1)}px var(--x-head-font);`, top, Array.from(name.trim())[0] || "");
    const who = mk("div", `display:flex;flex-direction:column;gap:${(2 * u).toFixed(1)}px;min-width:0;`, top);
    const nameRow = mk("div", `display:flex;align-items:center;gap:${(6 * u).toFixed(1)}px;`, who);
    const nameEl = mk("div", `font:var(--x-head-weight) ${(17 * u).toFixed(1)}px/1.2 var(--x-head-font);white-space:nowrap;`, nameRow, name);
    let badge = null;
    if (p.badge) {
      badge = mk("div", `flex:none;width:${(16 * u).toFixed(1)}px;height:${(16 * u).toFixed(1)}px;border-radius:50%;background:var(--x-accent);display:grid;place-items:center;`, nameRow);
      badge.innerHTML = `<svg viewBox="0 0 24 24" width="${(11 * u).toFixed(1)}" height="${(11 * u).toFixed(1)}" fill="none" stroke="var(--x-accent-ink)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    }
    const handle = mk("div", `font:var(--x-body-weight) ${(11 * u).toFixed(1)}px var(--x-body-font);color:var(--x-dim);direction:ltr;text-align:${rtl ? "right" : "left"};`, who, p.handle || L.handle);
    const stats = mk("div", `display:flex;gap:${(16 * u).toFixed(1)}px;font-size:${(11 * u).toFixed(1)}px;color:var(--x-dim);`, card);
    L.stats.forEach(([n, l]) => { const s = mk("span", "white-space:nowrap;", stats); mk("b", "color:var(--x-ink);font-weight:700;", s, n); s.append(" " + l); });
    const bio = mk("div", `font:var(--x-body-weight) ${(11.5 * u).toFixed(1)}px/1.45 var(--x-body-font);color:var(--x-ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`, card, p.bio || L.bio);
    const btns = mk("div", `display:flex;gap:${(8 * u).toFixed(1)}px;`, card);
    const b1 = mk("div", `flex:1;text-align:center;padding:${(7 * u).toFixed(1)}px 0;border-radius:${(8 * u).toFixed(1)}px;background:var(--x-accent);color:var(--x-accent-ink);font-weight:600;font-size:${(12 * u).toFixed(1)}px;`, btns, L.follow);
    const b2 = mk("div", `flex:1;text-align:center;padding:${(7 * u).toFixed(1)}px 0;border-radius:${(8 * u).toFixed(1)}px;background:var(--x-panel-2);color:var(--x-ink);font-weight:600;font-size:${(12 * u).toFixed(1)}px;border:var(--x-edge) solid var(--x-line);`, btns, L.msg);
    card.style.top = (R.y + Math.max(0, (R.h - card.offsetHeight) / 2)).toFixed(1) + "px";

    // timing: card 0.35 s, then the pieces on the stagger (squeezed to fit the scene)
    const under = own ? [] : [...host.children].filter((c) => c !== card); // a slot's old content gives way to the card
    const t0 = at + 0.05, c0 = t0 + 0.3;
    const st = Math.max(0.04, Math.min(p.stagger, (end - 0.7 - c0) / 6));
    const T = { avatar: c0, name: c0 + st, badge: c0 + st * 2, stats: c0 + st * 3, bio: c0 + st * 4, btn1: c0 + st * 5, btn2: c0 + st * 5.6 };
    ctx.sfx(t0, "card", 0.25); ctx.sfx(T.avatar, "pop.soft", 0.35);
    if (badge) ctx.sfx(T.badge, "pop", 0.3);
    ctx.sfx(T.btn1, "pop.soft", 0.3);
    const pop3 = (x) => (x <= 0 ? 0 : x < 0.6 ? 1.2 * ML.out(x, 0, 0.6) : 1.2 - 0.2 * ML.ease(x, 0.6, 1));
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        const c = ML.out(t, t0, t0 + 0.35);
        under.forEach((e) => { e.style.opacity = t < t0 ? "" : (1 - c).toFixed(4); });
        card.style.opacity = (t < t0 ? 0 : c * (1 - leave)).toFixed(4);
        card.style.translate = `0 ${((1 - c) * 20 * u / 2 - leave * 10 * u / 2).toFixed(2)}px`;
        const a = ML.back(t, T.avatar, T.avatar + 0.35, 1.6);
        avatar.style.opacity = ML.lin(t, T.avatar, T.avatar + 0.15).toFixed(4);
        avatar.style.scale = (t < T.avatar ? 0.6 : 0.6 + 0.4 * a).toFixed(4);
        const n = ML.out(t, T.name, T.name + 0.3);
        nameEl.style.opacity = n.toFixed(4); handle.style.opacity = n.toFixed(4);
        nameEl.style.translate = `${((1 - n) * 8 * u * (rtl ? 1 : -1) / 2).toFixed(2)}px 0`;
        if (badge) { const q = pop3(ML.lin(t, T.badge, T.badge + 0.35)); badge.style.scale = q.toFixed(4); badge.style.opacity = ML.clamp(q * 3).toFixed(4); }
        const s = ML.out(t, T.stats, T.stats + 0.3); stats.style.opacity = s.toFixed(4); stats.style.translate = `0 ${((1 - s) * 6 * u).toFixed(2)}px`;
        const b = ML.out(t, T.bio, T.bio + 0.35); bio.style.opacity = b.toFixed(4); bio.style.translate = `0 ${((1 - b) * 6 * u).toFixed(2)}px`;
        [[b1, T.btn1], [b2, T.btn2]].forEach(([el, tt]) => { const q = ML.expo(t, tt, tt + 0.4); el.style.opacity = ML.clamp(q * 1.5).toFixed(4); el.style.translate = `0 ${((1 - q) * 12 * u).toFixed(2)}px`; });
      },
    };
  },
});
