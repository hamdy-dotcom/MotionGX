// Peek window: a small framed still floats over the scene — a 16:10 frame (150–262 px wide at a web viewport; scaled
// to the stage) holding the target's picture (or a look-coloured gradient) under a gradient that darkens to .48 at the
// bottom from 24% down, a 1 px inner outline at 16% of the panel colour, a long soft drop shadow
// (0 34px 70px -30px at .9), a play glyph centred with its own drop shadow, and an optional caption below (a small
// title + a muted tracked label). It arrives the way the look moves; then it is "focused": it lifts 5 px over 0.8 s
// on an ease-out, the outline brightens to 42% and the glyph grows to 1.14× over 0.55 s. It sits at the trailing top
// corner of the picture region (the leading side in Arabic), and leaves at the end.
// Source: MengTo/Skills web-design/build-threejs-scroll-worlds/demo/index.html (MIT: .peek / .peek-fr / .peek-play /
// .peek-cap and its hover state, replayed as a timed focus).
ML.define({
  id: "element.peek-window",
  category: "element",
  name: "Peek window",
  does: "A small framed still with a play glyph floats over the scene and lifts slightly when focused.",
  says: ["focus", "story", "reveal"],
  energy: 2,
  targets: ["image", "card"],
  duration: [1, 4],
  params: {
    play_glyph: { type: "bool", default: true },
    caption: { type: "bool", default: true },
    width: { type: "number", range: [150, 262], default: 200, unit: "px" },
    title: { type: "text", default: "" },
    note: { type: "text", default: "" },
    place: { type: "choice", options: ["corner", "on-target", "center"], default: "corner" },
    focus_at: { type: "number", range: [0.3, 2], default: 0.7, unit: "s" },
  },
  pairs: ["element.pip-window", "camera.push-in", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/build-threejs-scroll-worlds", license: "MIT", note: "demo/index.html .peek floating window + hover focus, as a timed focus" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    // the web demo's 150–262 px at a ~1440 px viewport → our 1080 px short side reads ~1.6× larger
    const w = ML.clamp(p.width, 150, 262) * 1.6 * k, h = (w * 10) / 16;
    const own = el && el !== stage ? el : null;
    const pic = own && own.tagName === "IMG" ? own.currentSrc || own.src : own && own.querySelector && own.querySelector("img") ? own.querySelector("img").currentSrc || own.querySelector("img").src : "";
    const capH = p.caption ? 42 * k : 0;
    // where it floats
    let x, y;
    if (p.place === "on-target" && own) { const b = ctx.box(own); x = b.x + b.w / 2 - w / 2; y = b.y + b.h / 2 - (h + capH) / 2; }
    else if (p.place === "center") { x = f.W / 2 - w / 2; y = f.pic.y + f.pic.h / 2 - (h + capH) / 2; }
    else { const R = f.pic; x = rtl ? R.x + R.w * 0.04 : R.x + R.w * 0.96 - w; y = R.y + R.h * 0.06; }
    x = ML.clamp(x, f.m * 0.5, f.W - f.m * 0.5 - w); y = ML.clamp(y, 0, f.H - h - capH);
    const box = mk("div", `position:absolute;left:${x}px;top:${y}px;width:${w}px;pointer-events:none;z-index:12;visibility:hidden;`, host);
    const fr = mk("div", `position:relative;width:${w}px;height:${h}px;overflow:hidden;border-radius:calc(min(var(--x-radius), ${(h * 0.08).toFixed(1)}px));box-shadow:0 ${34 * k}px ${70 * k}px ${-30 * k}px color-mix(in srgb, var(--x-ink) 90%, transparent);`, box);
    // the still: the target's own picture (cover, never past its pixels at this small size), else a look gradient
    const still = mk("div", `position:absolute;inset:0;background:${pic ? `center / cover no-repeat url("${pic.replace(/"/g, '\\"')}")` : "linear-gradient(135deg, var(--x-accent), var(--x-accent-2))"};filter:var(--x-pic-filter);`, fr);
    if (!pic) mk("div", "position:absolute;inset:0;background:radial-gradient(60% 70% at 70% 30%, color-mix(in srgb, var(--x-panel) 45%, transparent), transparent 70%);", still);
    mk("div", "position:absolute;inset:0;background:linear-gradient(180deg, color-mix(in srgb, var(--x-ink) 4%, transparent) 24%, color-mix(in srgb, var(--x-ink) 48%, transparent) 100%);", fr);
    const line = mk("div", `position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 ${Math.max(1, k)}px color-mix(in srgb, var(--x-panel) 16%, transparent);`, fr);
    let glyph = null;
    if (p.play_glyph) {
      const gw = ML.clamp(w * 0.16, 30 * k, 46 * k * 1.6);
      const wrap = mk("div", "position:absolute;inset:0;display:grid;place-items:center;", fr);
      glyph = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      glyph.setAttribute("viewBox", "0 0 22 22");
      glyph.style.cssText = `width:${gw}px;height:${gw}px;filter:drop-shadow(0 ${2 * k}px ${12 * k}px color-mix(in srgb, var(--x-ink) 70%, transparent));`;
      const pa = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      // the play triangle points with the reading direction
      pa.setAttribute("d", rtl ? "M14 5.6 5.6 11 14 16.4z" : "M8 5.6 16.4 11 8 16.4z");
      pa.setAttribute("fill", "var(--x-panel)");
      glyph.append(pa); wrap.append(glyph);
    }
    if (p.caption) {
      const cap = mk("div", `display:flex;align-items:baseline;gap:${9 * k}px;margin-top:${12 * k}px;white-space:nowrap;overflow:hidden;`, box);
      mk("b", `font:400 ${Math.round(11 * 1.9 * k)}px var(--x-body-font);letter-spacing:${rtl ? 0 : "0.24em"};color:var(--x-ink);`, cap, p.title || (rtl ? "مشاهدة سريعة" : "PREVIEW"));
      mk("i", `font:var(--x-label-weight) ${Math.round(9 * 1.9 * k)}px var(--x-label-font);font-style:normal;letter-spacing:${rtl ? 0 : "0.2em"};text-transform:${rtl ? "none" : "uppercase"};color:var(--x-dim);overflow:hidden;text-overflow:ellipsis;`, cap, p.note || (rtl ? "دقيقة واحدة" : "1 min watch"));
    }
    const fA = at + ML.clamp(p.focus_at, 0.3, 2);
    const leave = Math.max(fA + 0.6, end - 0.35);
    ctx.sfx(at, "pop.soft", 0.25);
    ctx.sfx(fA, "tap", 0.2);
    return {
      draw(t) {
        ML.show(box, t, at, leave);
        const u = ML.bezier(0.16, 1, 0.3, 1)(ML.lin(t, fA, fA + 0.8)); // the source's --ease-out
        const ug = ML.bezier(0.16, 1, 0.3, 1)(ML.lin(t, fA, fA + 0.55));
        fr.style.transform = `translateY(${(-5 * 1.6 * k * u).toFixed(2)}px)`;
        line.style.boxShadow = `inset 0 0 0 ${Math.max(1, k)}px color-mix(in srgb, var(--x-panel) ${(16 + 26 * ML.ease(t, fA, fA + 0.5)).toFixed(1)}%, transparent)`;
        if (glyph) glyph.style.transform = `scale(${(1 + 0.14 * ug).toFixed(4)})`;
      },
    };
  },
});
