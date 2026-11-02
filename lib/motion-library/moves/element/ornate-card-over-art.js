// Ornate info card over artwork: inside a framed artwork (the scene's own picture, shown no larger than it is drawn,
// or a painted field of the look's colours when there is none) a deep card sits on one side, ~35 % of the frame wide
// (wider on tall frames): a deep accent-and-ink ground with torn, painted edges (a seeded jagged clip — or clean
// rounded corners), a script title in the second accent, a tracked small-caps subtitle, an italic serif blurb, a
// brush-stroke button (a painted SVG stroke) and a tiny row of meta chips. Enter: the card fades in and rises 12 px over
// 0.5 s, its lines following 0.08 s apart; exit at the end: it dissolves (opacity 1 → 0 with blur 0 → 6 px on our own
// drawn card, never on the picture, over 0.5 s). The default side is the trailing side, mirrored in Arabic.
// Source: prompt-motion "mandelduck-single-prompt-with-opus" (reference only — rebuilt as our own code).
ML.define({
  id: "element.ornate-card-over-art",
  category: "element",
  name: "Ornate info card over artwork",
  does: "A dark card with a script title, small caps subtitle, italic blurb and a painted button sits over one side of the artwork.",
  says: ["brand", "luxury", "story"],
  energy: 1,
  targets: ["card", "headline"],
  duration: [2, 6],
  params: {
    side: { type: "choice", options: ["right", "left"], default: "right" },
    style: { type: "choice", options: ["painted", "clean"], default: "painted" },
    title: { type: "text", default: "" },
    subtitle: { type: "text", default: "" },
    body: { type: "text", default: "" },
    cta: { type: "text", default: "" },
    chips: { type: "bool", default: true },
  },
  pairs: ["photo.ken-burns", "text-in.punchline", "transition.season-blend"],
  avoid: ["urgency", "speed"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:mandelduck-single-prompt-with-opus", license: "reference", note: "the painted info card over framed art rebuilt as our own code; every frame from t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const ob = own ? ctx.box(own) : null;
    const big = ob && ob.w > f.W * 0.4 && ob.h > f.H * 0.18;
    const R = big ? ob : f.pic;
    const k = Math.min(f.W, f.H) / 1080;
    // the artwork: the scene's picture in a frame, or a painted field
    const frame = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;box-sizing:border-box;padding:${14 * k}px;border-radius:calc(var(--x-radius) * 0.5);background:var(--x-panel);box-shadow:var(--x-shadow);pointer-events:none;z-index:6;`, host);
    const art = mk("div", "position:relative;width:100%;height:100%;overflow:hidden;border-radius:calc(var(--x-radius) * 0.35);background:var(--x-pic-ground);", frame);
    const pic = own && own.tagName === "IMG" ? own : host.querySelector("img");
    if (pic) {
      const im = mk("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:var(--x-pic-filter);mix-blend-mode:var(--x-pic-blend);", art);
      im.src = pic.currentSrc || pic.src; im.alt = "";
    } else {
      art.style.background = "radial-gradient(120% 90% at 20% 30%, var(--x-accent-2), transparent 60%), radial-gradient(90% 80% at 80% 80%, var(--x-accent), transparent 65%), linear-gradient(160deg, var(--x-panel-2), color-mix(in srgb, var(--x-accent) 40%, var(--x-ink)))";
    }
    // the card
    const tall = R.w / R.h < 1.3; // on a tall or square frame the card needs more of the width to read
    const end1 = (p.side === "right") !== rtl; // true: the card sits on the right
    const cw = (R.w - 28 * k) * (tall ? 0.58 : 0.36);
    const card = mk("div", `position:absolute;top:50%;${end1 ? "right" : "left"}:${R.w * 0.05}px;width:${cw}px;box-sizing:border-box;padding:${(p.style === "painted" ? 34 : 30) * k}px ${30 * k}px;display:flex;flex-direction:column;gap:${12 * k}px;align-items:flex-start;text-align:start;color:var(--x-accent-ink);background:color-mix(in srgb, var(--x-accent) 42%, var(--x-ink));${p.style === "clean" ? "border-radius:var(--x-radius);" : ""}box-shadow:0 ${20 * k}px ${50 * k}px -${10 * k}px color-mix(in srgb, var(--x-ink) 40%, transparent);`, art);
    if (p.style === "painted") {
      // torn edge: a seeded jagged outline all round
      const pts = [], N = 22;
      const j = (i, s) => (ML.rnd(i, s) * 2.2).toFixed(2);
      // each side runs between its corners' insets, so the corners stay clean (no spikes)
      for (let i = 1; i < N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${j(i, 1)}%`);
      for (let i = 1; i < N; i++) pts.push(`${(100 - j(i, 2) * 0.9).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
      for (let i = N - 1; i > 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% ${(100 - j(i, 3)).toFixed(2)}%`);
      for (let i = N - 1; i > 0; i--) pts.push(`${(+j(i, 4) * 0.9).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
      card.style.clipPath = `polygon(${pts.join(",")})`;
      card.style.backgroundImage = "radial-gradient(80% 60% at 30% 20%, color-mix(in srgb, var(--x-accent) 30%, transparent), transparent 70%), radial-gradient(70% 50% at 80% 90%, color-mix(in srgb, var(--x-ink) 40%, transparent), transparent 70%)";
    }
    const headTxt = (host.querySelector(".ml-title") || {}).textContent;
    const T = {
      title: p.title || (own && !big && own.textContent.trim()) || headTxt || (rtl ? "حكاية المكان" : "The Old Harbour"),
      sub: p.subtitle || (rtl ? "مجموعة الخريف" : "Autumn collection"),
      body: p.body || (rtl ? "لوحات مرسومة باليد، بألوان دافئة وضوء هادئ." : "Hand-painted pieces in warm light, made one at a time."),
      cta: p.cta || (rtl ? "اكتشف المزيد" : "Discover more"),
    };
    const W = cw - 60 * k;
    const title = mk("div", `font:500 ${Math.min(64 * k, W / 5)}px/1.05 var(--x-script-font);color:var(--x-accent-2);max-width:100%;`, card, T.title);
    ML.fit(title, W);
    const sub = mk("div", `font:var(--x-label-weight) ${15 * k * 1.2}px/1.3 var(--x-label-font);letter-spacing:${rtl ? 0 : "0.24em"};text-transform:${rtl ? "none" : "uppercase"};color:color-mix(in srgb, var(--x-accent-ink) 78%, transparent);`, card, T.sub);
    const body = mk("div", `font:italic 400 ${19 * k * 1.2}px/1.45 var(--x-serif-font);color:color-mix(in srgb, var(--x-accent-ink) 88%, transparent);`, card, T.body);
    // the brush-stroke button
    const btn = mk("div", `position:relative;margin-top:${6 * k}px;padding:${12 * k}px ${30 * k}px;font:600 ${17 * k * 1.2}px/1 var(--x-body-font);color:var(--x-ink);white-space:nowrap;`, card, T.cta);
    const bs = doc.createElementNS(NS, "svg"); bs.setAttribute("viewBox", "0 0 200 60"); bs.setAttribute("preserveAspectRatio", "none");
    bs.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;overflow:visible;";
    const bp = doc.createElementNS(NS, "path");
    bp.setAttribute("d", p.style === "painted"
      ? "M6 14 C30 6 70 9 110 7 C150 5 180 8 196 12 L192 20 L198 30 L193 40 L197 50 C170 55 120 52 80 54 C50 55 25 53 4 50 L9 40 L2 30 L8 21 Z"
      : "M14 4 H186 Q196 4 196 14 V46 Q196 56 186 56 H14 Q4 56 4 46 V14 Q4 4 14 4 Z");
    bp.setAttribute("fill", "var(--x-accent-2)"); bs.append(bp); btn.style.isolation = "isolate"; btn.prepend(bs);
    let chips = [];
    if (p.chips) {
      const row = mk("div", `display:flex;gap:${8 * k}px;flex-wrap:wrap;margin-top:${4 * k}px;`, card);
      chips = (rtl ? ["زيت", "٢٠٢٤", "أصلي"] : ["Oil", "2024", "Original"]).map((x) => mk("span", `font:500 ${12 * k * 1.2}px/1 var(--x-label-font);padding:${6 * k}px ${10 * k}px;border-radius:999px;border:1px solid color-mix(in srgb, var(--x-accent-ink) 35%, transparent);color:color-mix(in srgb, var(--x-accent-ink) 80%, transparent);${rtl ? "" : "letter-spacing:0.08em;"}`, row, x));
    }
    const lines = [title, sub, body, btn, ...chips];
    const cardH = card.offsetHeight;
    card.style.marginTop = `${-cardH / 2}px`;
    const inT = at + 0.25;
    const lineT = (i) => inT + 0.15 + i * 0.08;
    const outA = Math.max(lineT(lines.length) + 0.8, end - 0.6);
    ctx.sfx(inT, "whoosh.soft", 0.25);
    ctx.sfx(lineT(3), "tap", 0.2);
    return {
      draw(t) {
        const frameIn = ML.out(t, at - 0.05, at + 0.3), frameOut = ML.ease(t, outA + 0.35, outA + 0.6);
        frame.style.opacity = (frameIn * (1 - frameOut)).toFixed(4);
        frame.style.visibility = t < at - 0.06 ? "hidden" : "visible";
        const u = ML.ease(t, inT, inT + 0.5), d = ML.ease(t, outA, outA + 0.5);
        card.style.opacity = (u * (1 - d)).toFixed(4);
        card.style.transform = `translateY(${((1 - u) * 12 * k * 1.5).toFixed(2)}px)`;
        card.style.filter = d > 0.002 ? `blur(${(d * 6).toFixed(2)}px)` : "none";
        lines.forEach((l, i) => { const v = ML.out(t, lineT(i), lineT(i) + 0.4); l.style.opacity = v.toFixed(4); l.style.transform = `translateY(${((1 - v) * 8 * k).toFixed(2)}px)`; });
      },
    };
  },
});
