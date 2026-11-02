// Drag & drop upload: the pointer glides to a file, presses (the cursor squashes to 0.9 for 0.1 s), and drags it along
// a bent path (0.8 s power2.inOut) into a drop zone. While it travels the file tilts 6° and lifts on a deeper shadow;
// when it hovers the zone, the zone tints with the accent, gains a 1.5 px accent edge and grows to 1.02 (0.2 s). On the
// drop the file rotates back to 0 and settles on back.out, and the hint turns into the file's name with a tick.
// Variants: the thing dragged (file / image / card) and where it lands (drop zone / folder / app window).
// Source: prompt-motion manuelogomigo-i-gave-claude-opus (reference only — our own rebuild); the cursor glide and
// press are product-film-skill's kit/cursor.tsx (MIT).
ML.define({
  id: "ui.drag-drop-upload",
  category: "ui",
  name: "Cursor drags a file into a drop zone",
  does: "A cursor grabs a file, tilts it slightly and drags it into a drop zone that tints and outlines with the accent while the file hovers, then the file settles in.",
  says: ["simplicity", "step", "speed"],
  energy: 2,
  targets: ["cursor", "card", "screen"],
  duration: [1.2, 2.5],
  params: {
    object: { type: "choice", options: ["file", "image", "card"], default: "file" },
    target: { type: "choice", options: ["dropzone", "folder", "app-window"], default: "dropzone" },
    accent: { type: "choice", options: ["accent", "accent-2", "good", "bad"], default: "accent" },
    name: { type: "text" },
    hint: { type: "text" },
    drag: { type: "number", range: [0.5, 1.2], default: 0.8, unit: "s" },
  },
  pairs: ["ui.cursor-free-path", "ui.button-loading-keep-width"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:manuelogomigo-i-gave-claude-opus", license: "reference", note: "our own rebuild; cursor glide + squash ported from product-film-skill templates/kit/cursor.tsx (MIT)" },
  setup(ctx) {
    const { p, at, end, f, rtl, el } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const k = Math.min(f.W, f.H) / 1080, px = (v) => (v * k).toFixed(1) + "px";
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const A = `var(--x-${p.accent})`;
    const host = ctx.scene || ctx.stage;
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const dir = rtl ? -1 : 1;

    // where things sit: the drop target on the given card / screen when there is one, else in the picture region
    const R = f.pic;
    const given = el && el !== ctx.stage ? ctx.box(el) : null;
    const zw = given ? given.w : Math.min(R.w * (f.wide ? 0.46 : 0.82), 680 * k), zh = given ? given.h : zw * (p.target === "folder" ? 0.72 : 0.58);
    let zc, fc;
    if (given) { zc = { x: given.x + given.w / 2, y: given.y + given.h / 2 }; fc = { x: zc.x - dir * Math.min(zw * 0.5 + 200 * k, f.W * 0.3), y: Math.max(f.safe.y + 120 * k, zc.y - zh * 0.5 - 160 * k) }; }
    else if (f.wide) { zc = { x: R.x + R.w * (rtl ? 0.36 : 0.64), y: R.y + R.h * 0.55 }; fc = { x: R.x + R.w * (rtl ? 0.84 : 0.16), y: R.y + R.h * 0.3 }; }
    else { zc = { x: R.x + R.w * 0.5, y: R.y + R.h * 0.66 }; fc = { x: R.x + R.w * (rtl ? 0.74 : 0.26), y: R.y + R.h * 0.18 }; }

    // the drop target
    const zone = mk("div", `position:absolute;left:${(zc.x - zw / 2).toFixed(1)}px;top:${(zc.y - zh / 2).toFixed(1)}px;width:${zw.toFixed(1)}px;height:${zh.toFixed(1)}px;box-sizing:border-box;`, layer);
    const tint = mk("div", "position:absolute;inset:0;border-radius:inherit;opacity:0;", zone);
    const hintTxt = p.hint || (rtl ? "اسحب الملفات هنا للرفع" : "Drop files to upload");
    const fileName = p.name || (p.object === "image" ? (rtl ? "صورة-المنتج.png" : "product-shot.png") : p.object === "card" ? (rtl ? "بطاقة العميل" : "Client card") : (rtl ? "تقرير-الربع.pdf" : "q3-report.pdf"));
    const icon = (d, s) => `<svg viewBox="0 0 24 24" width="${(s * k).toFixed(1)}" height="${(s * k).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const CLOUD = '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5"/><path d="M12 12v8M9 15l3-3 3 3"/>';
    const TICK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
    let body = zone, edge;
    if (p.target === "folder") {
      zone.style.borderRadius = px(22);
      const tab = mk("div", `position:absolute;left:${rtl ? "auto" : "0"};right:${rtl ? "0" : "auto"};top:${px(-26)};width:38%;height:${px(40)};border-radius:${px(18)} ${px(18)} 0 0;background:color-mix(in srgb, ${A} 70%, var(--x-panel));`, zone);
      body = mk("div", `position:absolute;inset:0;border-radius:${px(22)};background:color-mix(in srgb, ${A} 55%, var(--x-panel));box-shadow:var(--x-shadow);overflow:hidden;`, zone);
      tint.remove(); body.append(tint);
      edge = body; void tab;
    } else if (p.target === "app-window") {
      zone.style.cssText += `border-radius:${px(20)};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);overflow:hidden;`;
      const bar = mk("div", `position:relative;display:flex;align-items:center;gap:${px(10)};padding:${px(16)} ${px(20)};border-bottom:var(--x-edge) solid var(--x-line);background:var(--x-bar);`, zone);
      bar.dir = "ltr";
      ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("i", `width:${px(14)};height:${px(14)};border-radius:50%;background:var(${v});opacity:var(--x-lights);`, bar));
      edge = zone;
    } else {
      zone.style.cssText += `border-radius:var(--x-radius);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`;
      edge = zone;
    }
    const dash = mk("div", `position:absolute;inset:${px(p.target === "app-window" ? 70 : 18)} ${px(18)} ${px(18)};border:${px(2.5)} dashed color-mix(in srgb, var(--x-dim) 45%, transparent);border-radius:calc(var(--x-radius) * 0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${px(14)};color:${p.target === "folder" ? "var(--x-accent-ink)" : "var(--x-dim)"};font:500 ${px(30)} var(--x-body-font);text-align:center;`, body);
    if (p.target === "folder") dash.style.borderColor = "color-mix(in srgb, var(--x-accent-ink) 50%, transparent)";
    const hint = mk("div", "display:flex;flex-direction:column;align-items:center;gap:inherit;", dash, `${icon(CLOUD, 64)}<span>${hintTxt}</span>`);
    const done = mk("div", `position:absolute;left:0;right:0;bottom:12%;display:flex;align-items:center;justify-content:center;gap:${px(12)};opacity:0;color:${p.target === "folder" ? "var(--x-accent-ink)" : "var(--x-ink)"};font:600 ${px(30)} var(--x-body-font);`, dash, `<span style="display:grid;place-items:center;width:${px(40)};height:${px(40)};border-radius:50%;background:var(--x-good);color:var(--x-accent-ink)">${icon(TICK, 26)}</span><span>${fileName}</span>`);

    // the thing dragged, centred on its own origin so it can tilt about its middle
    const ow = (p.object === "card" ? 300 : p.object === "image" ? 230 : 170) * k, oh = (p.object === "card" ? 180 : p.object === "image" ? 170 : 210) * k;
    const obj = mk("div", `position:absolute;left:0;top:0;width:${ow.toFixed(1)}px;height:${oh.toFixed(1)}px;margin:${(-oh / 2).toFixed(1)}px 0 0 ${(-ow / 2).toFixed(1)}px;`, layer);
    if (p.object === "image") {
      mk("div", `position:absolute;inset:0;border-radius:${px(16)};overflow:hidden;background:linear-gradient(150deg, var(--x-accent-2), var(--x-accent));border:${px(6)} solid var(--x-panel);box-sizing:border-box;`, obj,
        `<svg viewBox="0 0 100 70" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="72" cy="22" r="9" fill="var(--x-panel)" opacity=".85"/><path d="M0 70 L30 34 L52 56 L66 44 L100 70 Z" fill="var(--x-panel)" opacity=".7"/></svg>`);
    } else if (p.object === "card") {
      mk("div", `position:absolute;inset:0;border-radius:${px(18)};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);padding:${px(22)};box-sizing:border-box;display:flex;flex-direction:column;gap:${px(14)};`, obj,
        `<div style="display:flex;gap:${px(12)};align-items:center"><i style="width:${px(42)};height:${px(42)};border-radius:50%;background:var(--x-accent)"></i><i style="flex:1;height:${px(14)};border-radius:${px(7)};background:var(--x-ink);opacity:.8"></i></div><i style="height:${px(12)};border-radius:${px(6)};background:var(--x-dim);opacity:.45"></i><i style="width:70%;height:${px(12)};border-radius:${px(6)};background:var(--x-dim);opacity:.45"></i>`);
    } else {
      const fold = 46 * k;
      mk("div", `position:absolute;inset:0;border-radius:${px(14)};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);clip-path:polygon(0 0, calc(100% - ${fold.toFixed(1)}px) 0, 100% ${fold.toFixed(1)}px, 100% 100%, 0 100%);`, obj);
      mk("div", `position:absolute;right:0;top:0;width:${fold.toFixed(1)}px;height:${fold.toFixed(1)}px;background:color-mix(in srgb, var(--x-dim) 25%, var(--x-panel));border-bottom-left-radius:${px(10)};`, obj);
      mk("div", `position:absolute;left:${px(22)};top:${px(30)};padding:${px(6)} ${px(10)};border-radius:${px(6)};background:${A};color:var(--x-accent-ink);font:700 ${px(20)} var(--x-label-font);letter-spacing:.06em;`, obj, "PDF");
      [0.52, 0.64, 0.76].forEach((y, i) => mk("i", `position:absolute;left:${px(22)};top:${(y * 100).toFixed(0)}%;width:${i === 2 ? 50 : 76}%;height:${px(9)};border-radius:${px(5)};background:var(--x-dim);opacity:.35;`, obj));
    }
    const lift = obj.firstElementChild;

    // the pointer (product-film's macOS arrow, anchored at its tip)
    const cs = 56 * k;
    const cur = mk("div", "position:absolute;left:0;top:0;z-index:2;", layer);
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", cs.toFixed(1)); svg.setAttribute("height", cs.toFixed(1));
    svg.style.cssText = `position:absolute;left:${(-5 / 24 * cs).toFixed(1)}px;top:${(-2 / 24 * cs).toFixed(1)}px;overflow:visible;transform-origin:${(5 / 24 * cs).toFixed(1)}px ${(2 / 24 * cs).toFixed(1)}px;filter:drop-shadow(0 ${px(4)} ${px(6)} color-mix(in srgb, var(--x-ink) 30%, transparent));`;
    svg.innerHTML = '<path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/>';
    cur.append(svg);

    // timing: glide in → press → drag → drop → settle
    const tIn = at + 0.1, tPress = at + 0.55, tDrag = tPress + 0.12, tDrop = tDrag + p.drag;
    const grab = { x: fc.x + ow * 0.08 * dir, y: fc.y + oh * 0.12 };
    const start = { x: rtl ? f.safe.x + f.safe.w * 0.12 : f.safe.x + f.safe.w * 0.88, y: f.safe.y + f.safe.h * 0.92 };
    const glide = ML.bezier(0.42, 0, 0.12, 1), drag = ML.bezier(0.455, 0.03, 0.515, 0.955); // power2.inOut
    const arc = (a, b, u, bend) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, s = Math.sin(Math.PI * u) * bend; return { x: a.x + dx * u - (dy / L) * s, y: a.y + dy * u + (dx / L) * s }; };
    const dropAt = { x: zc.x + (grab.x - fc.x), y: zc.y - zh * 0.1 + (grab.y - fc.y) + (p.target === "app-window" ? 24 * k : 0) };
    const bend = -dir * Math.min(110 * k, Math.hypot(dropAt.x - grab.x, dropAt.y - grab.y) * 0.18);
    const hoverAt = (() => { for (let s = 0; s <= 1; s += 0.02) { const q = arc(grab, dropAt, drag(s), bend); if (Math.abs(q.x - zc.x) < zw / 2 && Math.abs(q.y - zc.y) < zh / 2) return tDrag + s * p.drag; } return tDrop - 0.2; })();
    ctx.sfx(tPress, "click", 0.4);
    ctx.sfx(tDrag + 0.05, "whoosh.soft", 0.18);
    ctx.sfx(tDrop, "land", 0.45);

    return {
      draw(t) {
        const on = ML.clamp((t - at) / 0.25), leave = ML.clamp((t - (end - 0.3)) / 0.25);
        layer.style.opacity = (on * (1 - leave)).toFixed(4);
        // pointer
        let c;
        if (t < tPress) c = arc(start, grab, glide(ML.lin(t, tIn, tPress - 0.02)), -dir * 60 * k);
        else if (t < tDrag) c = grab;
        else c = arc(grab, dropAt, drag(ML.lin(t, tDrag, tDrop)), bend);
        if (t > tDrop + 0.2) { const u = ML.out(t, tDrop + 0.2, tDrop + 0.8); c = { x: c.x + dir * 90 * k * u, y: c.y + 70 * k * u }; }
        cur.style.transform = `translate(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px)`;
        const held = t >= tPress && t < tDrop;
        const sq = held ? 1 - 0.1 * ML.lin(t, tPress, tPress + 0.1) : t >= tDrop && t < tDrop + 0.12 ? 0.9 + 0.1 * ML.lin(t, tDrop, tDrop + 0.12) : 1;
        svg.style.transform = sq === 1 ? "none" : `scale(${sq.toFixed(4)})`;
        // the object follows the pointer while held, tilted and lifted; settles into the zone after the drop
        const moving = ML.clamp(ML.lin(t, tDrag, tDrag + 0.15) - ML.lin(t, tDrop - 0.05, tDrop));
        let o = { x: fc.x, y: fc.y };
        if (t >= tDrag) o = { x: c.x - (grab.x - fc.x), y: c.y - (grab.y - fc.y) };
        if (t >= tDrop) o = { x: dropAt.x - (grab.x - fc.x), y: dropAt.y - (grab.y - fc.y) };
        const settle = t >= tDrop ? ML.back(t, tDrop, tDrop + 0.45, 1.8) : 0;
        const rot = t < tDrop ? 6 * dir * moving : 6 * dir * (1 - settle);
        const sink = t >= tDrop ? 1 - 0.28 * ML.out(t, tDrop + 0.2, tDrop + 0.55) : 1;
        obj.style.transform = `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${sink.toFixed(4)})`;
        const L = held ? moving : 0;
        lift.style.boxShadow = `0 ${px(4 + 26 * L)} ${px(10 + 40 * L)} color-mix(in srgb, var(--x-ink) ${(14 + 18 * L).toFixed(1)}%, transparent)`;
        // the zone: tints + edges + grows while the file hovers it, eases back after the drop
        const hov = t < hoverAt ? 0 : t < tDrop + 0.25 ? ML.ease(t, hoverAt, hoverAt + 0.2) : 1 - ML.ease(t, tDrop + 0.25, tDrop + 0.55);
        tint.style.background = `color-mix(in srgb, ${A} 14%, transparent)`;
        tint.style.opacity = hov.toFixed(4);
        edge.style.outline = hov > 0.01 ? `${px(1.5 * 1.6)} solid color-mix(in srgb, ${A} ${(hov * 100).toFixed(1)}%, transparent)` : "none";
        edge.style.outlineOffset = `${px(-1)}`;
        zone.style.scale = hov > 0 ? (1 + 0.02 * hov).toFixed(4) : "none";
        // the hint becomes the file's name with a tick
        const ok = ML.out(t, tDrop + 0.35, tDrop + 0.65);
        hint.style.opacity = (1 - Math.max(ok, ML.ease(t, hoverAt, hoverAt + 0.2))).toFixed(4);
        done.style.opacity = ok.toFixed(4);
        done.style.translate = `0 ${px(14 * (1 - ok))}`;
      },
    };
  },
});
