// Logo firms up while shards fly past: the brand mark appears pale and grey at scale 0.9 and firms up to full colour
// at scale 1 over 0.5 s power2.out; the wordmark starts grey and darkens 0.3 s later; meanwhile leftover triangle
// shards (from the scene before) fly across the top end corner and exit in 0.4 s, and blurred streaks smear under the
// logo and exit toward the reading end. Then a tagline in small, widely tracked caps (0.4 em; no tracking in Arabic)
// fades in below at 60 % opacity (the source's 40 % does not read at this size) and a short accent underline draws from its centre (scaleX 0 → 1, 0.4 s).
// Source: prompt-motion "prasad-pilla-wtf-made-entirely-with" (reference only — rebuilt as our own code).
ML.define({
  id: "element.logo-from-shards",
  category: "element",
  name: "Logo firms up while shards fly past",
  does: "The brand mark firms up from pale grey to full colour while leftover triangle shards and blurred streaks fly through and clear, then the wordmark firms up and an accent underline draws under it.",
  says: ["brand", "arrival"],
  energy: 3,
  targets: ["logo"],
  duration: [1.3, 2.5],
  params: {
    debris: { type: "choice", options: ["shards", "streaks", "none"], default: "shards" },
    underline: { type: "bool", default: true },
    tagline: { type: "text", default: "" },
    shards: { type: "number", range: [1, 5], default: 3 },
  },
  pairs: ["transition.glitch-bar-wipe", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:prasad-pilla-wtf-made-entirely-with", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const S = ctx.box(el);
    const isSvg = el.tagName.toLowerCase() === "svg";
    // the mark and the wordmark
    let marks, words;
    if (isSvg) { words = [...el.querySelectorAll("text")]; marks = [...el.children].filter((c) => !["text", "defs", "title", "desc"].includes(c.tagName.toLowerCase())); }
    else if (el.tagName === "IMG") { marks = [el]; words = []; }
    else { marks = [...el.querySelectorAll("img, svg")]; words = marks.length ? [...el.childNodes].filter((n) => n.nodeType === 1 && !marks.includes(n)) : [el]; if (!words.length && !marks.length) words = [el]; }
    if (!marks.length) marks = [];
    marks.forEach((m) => { if (m instanceof SVGElement && m !== el) { m.style.transformBox = "fill-box"; m.style.transformOrigin = "50% 50%"; } });
    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden;";
    host.append(layer);
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const dir = rtl ? -1 : 1, U = Math.max(S.h, 40);

    // debris: triangle shards across the top end corner, streaks under the logo
    const shards = p.debris === "shards" ? Array.from({ length: Math.round(ML.clamp(p.shards, 1, 5)) }, (_, i) => {
      const s = doc.createElementNS(NS, "svg"), k = U * (0.5 + ML.rnd(i, 4) * 0.7);
      s.setAttribute("viewBox", "0 0 100 100");
      s.style.cssText = `position:absolute;left:0;top:0;width:${k}px;height:${k}px;overflow:visible;`;
      const pg = doc.createElementNS(NS, "polygon");
      const j = (a) => (ML.rnd(i, a) * 30).toFixed(1);
      pg.setAttribute("points", `${j(1)},${j(2)} ${70 + +j(3)},${10 + +j(5) / 2} ${20 + +j(6)},${70 + +j(7)}`);
      pg.setAttribute("style", `fill:var(--x-${i % 2 ? "accent-2" : "ink"});fill-opacity:${i % 2 ? 0.55 : 0.85};`);
      s.append(pg); layer.append(s);
      const y0 = S.y - U * (0.4 + ML.rnd(i, 8) * 1.4), xA = S.x + S.w / 2 - dir * U * (1.5 + i * 0.6), xB = rtl ? -k * 2 : f.W + k * 2;
      return { s, k, y0, xA, xB, d0: at + i * 0.07, rot: (ML.rnd(i, 11) - 0.5) * 240 };
    }) : [];
    const streaks = p.debris !== "none" ? Array.from({ length: 3 }, (_, i) => {
      const w = S.w * (0.6 + ML.rnd(i, 21) * 0.6), h = Math.max(3, U * (0.05 + ML.rnd(i, 22) * 0.06));
      const e = mk("div", `position:absolute;left:0;top:0;width:${w}px;height:${h}px;border-radius:999px;background:linear-gradient(${rtl ? 270 : 90}deg, transparent, var(--x-${i === 1 ? "accent" : "ink"}));filter:blur(${(h * 0.8).toFixed(1)}px);`, layer);
      return { e, w, y: S.y + S.h * (0.75 + i * 0.12), x0: S.x + S.w / 2 - w / 2 - dir * S.w * 0.3, d0: at + 0.05 + i * 0.06 };
    }) : [];

    // tagline and underline under the logo
    const tagText = p.tagline || "";
    const tsz = Math.max(22, U * 0.2); // small, but it has to read on a phone
    const tag = tagText ? mk("div", `position:absolute;white-space:nowrap;font:var(--x-label-weight) ${tsz}px var(--x-label-font);letter-spacing:${rtl || ML.ARABIC.test(tagText) ? 0 : "0.4em"};text-transform:${rtl ? "none" : "uppercase"};color:var(--x-ink);`, layer, tagText) : null;
    let ty = S.y + S.h + U * 0.25;
    if (tag) { const w = tag.offsetWidth; tag.style.left = `${ML.clamp(S.x + S.w / 2 - w / 2 + (rtl ? 0 : tsz * 0.2), 16, Math.max(16, f.W - w - 16))}px`; tag.style.top = `${ty}px`; ty += tag.offsetHeight + U * 0.15; }
    const ulW = Math.max(40, U * 0.7);
    const ul = p.underline ? mk("div", `position:absolute;left:${S.x + S.w / 2 - ulW / 2}px;top:${ty}px;width:${ulW}px;height:${Math.max(2, U * 0.05)}px;background:var(--x-accent);transform-origin:50% 50%;border-radius:999px;`, layer) : null;

    const p2out = (t, a, b) => 1 - Math.pow(1 - ML.lin(t, a, b), 2);
    const mark0 = at + 0.05, word0 = mark0 + 0.3, tag0 = word0 + 0.35, ul0 = tag0 + 0.1;
    ctx.sfx(at, "whoosh.soft", 0.3);
    if (tag || ul) ctx.sfx(ul0 + 0.2, "tap", 0.2);
    const leave0 = Math.max(ul0 + 0.5, end - 0.3);
    return {
      draw(t) {
        const lv = ML.clamp((t - leave0) / 0.25);
        layer.style.opacity = (1 - lv).toFixed(4);
        // the mark: pale grey, 0.9 → full colour, 1
        const m = p2out(t, mark0, mark0 + 0.5), mo = t < mark0 ? 0 : 0.4 + 0.6 * m;
        marks.forEach((e) => { e.style.opacity = (mo * (1 - lv)).toFixed(4); e.style.scale = (0.9 + 0.1 * m).toFixed(4); e.style.filter = m < 1 ? `grayscale(${(1 - m).toFixed(3)})` : "none"; });
        const w = p2out(t, word0, word0 + 0.5), wo = t < mark0 ? 0 : 0.35 + 0.65 * w;
        words.forEach((e) => { e.style.opacity = (wo * (1 - lv)).toFixed(4); e.style.filter = w < 1 ? `grayscale(${(1 - w).toFixed(3)}) contrast(${(0.4 + 0.6 * w).toFixed(3)})` : "none"; });
        if (!marks.length && !words.length) el.style.opacity = (mo * (1 - lv)).toFixed(4);
        // shards fly through and out
        shards.forEach((s) => { const k = ML.lin(t, s.d0, s.d0 + 0.4), on = t >= s.d0 && k < 1; s.s.style.visibility = on ? "visible" : "hidden"; if (!on) return; const e = k * k * (3 - 2 * k) * 0.3 + k * 0.7; const x = s.xA + (s.xB - s.xA) * e, y = s.y0 - U * 0.6 * e; s.s.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(s.rot * k).toFixed(1)}deg)`; s.s.style.opacity = (1 - k * 0.3).toFixed(3); });
        streaks.forEach((s) => { const k = ML.lin(t, s.d0, s.d0 + 0.45), on = t >= s.d0 && k < 1; s.e.style.visibility = on ? "visible" : "hidden"; if (!on) return; const x = s.x0 + dir * f.W * 0.6 * k * k; s.e.style.transform = `translate(${x.toFixed(2)}px, ${s.y.toFixed(2)}px) scaleX(${(1 - 0.5 * k).toFixed(3)})`; s.e.style.opacity = (0.7 * (1 - k)).toFixed(3); });
        if (tag) tag.style.opacity = (0.6 * ML.out(t, tag0, tag0 + 0.4)).toFixed(4);
        if (ul) ul.style.transform = `scaleX(${ML.out(t, ul0, ul0 + 0.4).toFixed(4)})`;
      },
    };
  },
});
