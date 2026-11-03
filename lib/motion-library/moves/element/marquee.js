// Edge-faded marquee: a rail of logos, words, cards or screenshots slides sideways without end and fades out at both
// edges. The track is the content twice (width max-content); its x = −((t / P) mod 1) × one copy, P 12–30 s a loop,
// linear — so any frame is seekable. Edge fade: mask linear-gradient(90deg, transparent, #000 14 %, #000 86 %,
// transparent) ("hard" cuts it square). Logos mono (ink at 60 %, grayscale) at an equal visual height (~32 px at 1080),
// gaps 56; cards are the marquee-loop tiles (min-width 220, padding 34, 1 px border, 22 px 700, tracking −.04em).
// Optional rise-in: the items rise from below the rail (y +100 %, 0.6 s expo.out, 0.04 s apart) before the creep. Optional
// "brag" word: the rail sits at .5 and comes up to full on that spoken word over 0.4 s. Two rows run opposite ways.
// RTL reverses the direction. Logos are never enlarged (they keep their own size when it is smaller).
// Content: real marks first (`logos` image URLs, the target's own <img>/<svg> or the logo itself: they repeat alone in
// "logos", and fill the tiles in "screenshots"); then text (`items` "a | b | c", else the target's children / words, set
// as plain wordmarks in "logos"); only with nothing at all, neutral placeholders. A copy always ends on a whole set.
// Source: MengTo/Skills web-design/marquee-loop + book-serif-index demos (MIT): "@keyframes marquee { to {
// transform: translateX(-50%) } }", the mask-image edge fade and the tile styling — the keyframe replaced by x from t.
ML.define({
  id: "element.marquee",
  category: "element",
  name: "Edge-faded marquee",
  does: "A row of logos, words or cards slides endlessly sideways and fades out at both edges; it can first rise in from below.",
  says: ["trust", "proof", "flow", "brand", "list", "scale"],
  energy: 2,
  targets: ["logo", "list", "label", "word", "card", "image"],
  duration: [2, 30],
  params: {
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    period: { type: "number", range: [12, 30], default: 20, unit: "s" },
    content: { type: "choice", options: ["logos", "words", "cards", "screenshots"], default: "logos" },
    rows: { type: "number", range: [1, 2], default: 1 },
    edge: { type: "choice", options: ["fade", "hard"], default: "fade" },
    rise_in: { type: "bool", default: false },
    tint: { type: "choice", options: ["mono", "brand"], default: "mono" },
    band: { type: "bool", default: true },
    brag: { type: "text", default: "" },
    items: { type: "text", default: "" },
    logos: { type: "text", default: "" },
  },
  pairs: ["element.logo-strip", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/marquee-loop", license: "MIT", note: "track duplicated twice, translateX -50% loop, mask-image edge fade, tile styling; also book-serif-index; the loop is driven by t" },
  async setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const rowsN = Math.round(ML.clamp(p.rows, 1, 2));
    const P = ML.clamp(p.period, 12, 30);
    const mono = p.tint !== "brand";
    // a photo as the target is never shrunk to logo height: it runs as tiles
    const photoTarget = own && own.tagName === "IMG" && own.naturalHeight > 240;
    const content = p.content === "logos" && photoTarget ? "screenshots" : p.content;

    // content
    const ownTag = own ? own.tagName.toLowerCase() : "";
    const ownMark = own && (ownTag === "svg" || ownTag === "img") ? own : null;
    let words = p.items ? String(p.items).split(/\s*[|\n]\s*/).filter(Boolean) : [];
    if (!words.length && own && !ownMark) words = own.children.length > 1 ? [...own.children].map((c) => c.textContent.trim()).filter(Boolean) : own.textContent.trim().split(/\s+/).filter(Boolean);
    const given = words.length > 0;
    // real marks: the logos param, the target's own marks, or the target itself
    let marks = p.logos ? String(p.logos).split(/\s*[|,\n]\s*/).filter(Boolean).map((u) => { const i = doc.createElement("img"); i.src = u; return i; }) : [];
    if (!marks.length && ownMark) marks = [ownMark];
    if (!marks.length && own) marks = [...own.querySelectorAll(":scope > img, :scope > svg, :scope > * > img, :scope > * > svg")];
    if (marks.length && p.logos) await Promise.all(marks.map((i) => (i.decode ? i.decode().catch(() => {}) : 0)));
    const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const track = (x, em) => (ML.ARABIC.test(x) ? 0 : em);
    const DEF = rtl ? ["سريع", "بسيط", "آمن", "مرن", "واضح", "ذكي"] : ["Fast", "Simple", "Secure", "Flexible", "Clear", "Smart"];
    if (words.length < 3) words = words.concat(DEF).slice(0, Math.max(6, words.length));
    const GLYPH = [
      '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="6"/>',
      '<path d="M20 4 L37 34 H3 Z" fill="currentColor"/>',
      '<rect x="8" y="8" width="24" height="24" rx="3" transform="rotate(45 20 20)" fill="currentColor"/>',
      '<path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5 Z" fill="currentColor"/>',
      '<rect x="5" y="6" width="11" height="28" rx="3" fill="currentColor"/><rect x="24" y="6" width="11" height="28" rx="3" fill="currentColor" opacity=".55"/>',
      '<path d="M15 4 H25 V15 H36 V25 H25 V36 H15 V25 H4 V15 H15 Z" fill="currentColor"/>',
    ];
    const PH = ["Northwind", "Lumen", "Atlas", "Quanta", "Orbit", "Vertex"];
    const HUE = ["var(--x-accent)", "var(--x-good)", "var(--x-bad)", "var(--x-accent-2)"];
    const logoH = 32 * k * 1.5, gap = 56 * k * 1.2;

    function item(i, row) {
      const c = content;
      if (c === "words") {
        return `<span style="font:var(--x-head-weight) ${(f.tall ? 64 : 72) * k}px/1.1 var(--x-head-font);letter-spacing:${track(words[i % words.length], "-0.03em")};color:${row % 2 ? "var(--x-dim)" : "var(--x-ink)"};white-space:nowrap;padding-inline-end:${gap}px;display:inline-flex;align-items:center;gap:${gap}px;">${esc(words[i % words.length])}<span style="width:${10 * k}px;height:${10 * k}px;border-radius:50%;background:var(--x-accent);display:inline-block"></span></span>`;
      }
      if (c === "cards") {
        return `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:${220 * k * 1.3}px;padding:${34 * k * 1.3}px;box-sizing:border-box;border:1px solid var(--x-line);background:var(--x-panel);border-radius:calc(var(--x-radius) * 0.33);font:700 ${22 * k * 1.4}px var(--x-head-font);letter-spacing:${track(words[i % words.length], "-0.04em")};color:var(--x-ink);white-space:nowrap;margin-inline-end:${16 * k}px;">${esc(words[i % words.length])}</span>`;
      }
      if (c === "screenshots") {
        const w = 200 * k * 1.6, h = 130 * k * 1.6, bars = [0.7, 0.45, 0.85, 0.55];
        if (marks.length) return "TILE";
        return `<span style="display:inline-flex;flex-direction:column;gap:${10 * k}px;width:${w}px;height:${h}px;box-sizing:border-box;padding:${16 * k}px;border-radius:calc(var(--x-radius) * 0.35);background:var(--x-panel);border:1px solid var(--x-line);box-shadow:var(--x-shadow);margin-inline-end:${20 * k}px;overflow:hidden;">` +
          `<span style="display:flex;gap:${6 * k}px">${[1, 2, 3].map(() => `<i style="width:${9 * k}px;height:${9 * k}px;border-radius:50%;background:var(--x-line);display:block"></i>`).join("")}</span>` +
          `<span style="height:${26 * k}px;width:${(40 + ML.rnd(i, 2) * 40).toFixed(0)}%;border-radius:${6 * k}px;background:${["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)"][i % 3]};opacity:.85;display:block"></span>` +
          bars.map((b, j) => `<span style="height:${10 * k}px;width:${((b * 0.6 + ML.rnd(i, j + 3) * 0.4) * 100).toFixed(0)}%;border-radius:${5 * k}px;background:var(--x-line);display:block"></span>`).join("") + `</span>`;
      }
      // logos
      if (marks.length) return "MARK";
      if (given) return `<span style="display:inline-flex;align-items:center;height:${logoH}px;padding-inline-end:${gap}px;white-space:nowrap;color:${mono ? "var(--x-ink)" : "var(--x-accent)"};font:700 ${logoH * 0.78}px var(--x-head-font);letter-spacing:${track(words[i % words.length], "-0.02em")};">${esc(words[i % words.length])}</span>`;
      const g = i % GLYPH.length;
      return `<span style="display:inline-flex;align-items:center;gap:${logoH * 0.3}px;height:${logoH}px;padding-inline-end:${gap}px;white-space:nowrap;direction:ltr;color:${mono ? "var(--x-ink)" : HUE[i % HUE.length]};"><svg viewBox="0 0 40 40" width="${logoH}" height="${logoH}" style="display:block">${GLYPH[g]}</svg><span style="font:700 ${logoH * 0.78}px var(--x-head-font);letter-spacing:-0.02em;color:${mono ? "var(--x-ink)" : "var(--x-ink)"}">${PH[(i + row * 3) % PH.length]}</span></span>`;
    }

    // the rail: across the frame at the target's height
    const ob = own ? ctx.box(own) : null;
    const rail = mk("div", `position:absolute;left:0;width:${f.W}px;z-index:6;pointer-events:none;visibility:hidden;display:flex;flex-direction:column;gap:${24 * k}px;` +
      (p.band ? `background:var(--x-ground);padding:${18 * k}px 0;` : "") + // its own band of ground, so the rail never runs over other copy
      (p.edge === "fade" ? "-webkit-mask-image:linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent);mask-image:linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent);" : ""), host);
    const rows = [];
    for (let r = 0; r < rowsN; r++) {
      const view = mk("div", "overflow:hidden;width:100%;direction:ltr;", rail);
      const track = mk("div", "display:flex;width:max-content;align-items:center;will-change:transform;", view);
      const copy = mk("div", "display:flex;align-items:center;flex:0 0 auto;", track);
      const units = [];
      const add = (i) => {
        const h = item(i, r);
        let node;
        if (h === "MARK" || h === "TILE") {
          const m = marks[i % marks.length], c = m.cloneNode(true), isImg = m.tagName === "IMG"; c.removeAttribute("data-slot");
          if (h === "TILE") {
            const w = 200 * k * 1.6, tH = 130 * k * 1.6, big = Math.max(w / (m.naturalWidth || w), tH / (m.naturalHeight || tH)); // cover, never past its pixels
            node = mk("span", `display:inline-flex;align-items:center;justify-content:center;width:${w}px;height:${tH}px;overflow:hidden;border-radius:calc(var(--x-radius) * 0.35);background:var(--x-panel);border:1px solid var(--x-line);margin-inline-end:${20 * k}px;flex:0 0 auto;`, copy);
            c.style.cssText += isImg ? `;display:block;object-fit:cover;width:${big > 1 ? (m.naturalWidth || w) + "px" : "100%"};height:${big > 1 ? (m.naturalHeight || tH) + "px" : "100%"};` : ";display:block;width:80%;height:80%;";
          } else {
            node = mk("span", `display:inline-flex;align-items:center;height:${logoH}px;padding-inline-end:${gap}px;flex:0 0 auto;`, copy);
            const mb = m.getBoundingClientRect(), vb = m.viewBox && m.viewBox.baseVal;
            const ow = isImg ? m.naturalWidth || mb.width : (vb && vb.width) || mb.width || logoH, oh = isImg ? m.naturalHeight || mb.height : (vb && vb.height) || mb.height || logoH;
            const hh = isImg ? Math.min(logoH, oh) : logoH; // a picture never enlarged; a vector may match the rail
            c.style.cssText += `;display:block;width:${((hh * ow) / (oh || 1)).toFixed(1)}px;height:${hh.toFixed(1)}px;`;
          }
          node.append(c);
        } else { const w = doc.createElement("span"); w.innerHTML = h; node = w.firstChild; copy.append(node); }
        if (mono && content === "logos") { node.style.filter = "grayscale(1)"; node.style.opacity = "0.6"; }
        units.push(node);
      };
      let i = 0;
      const setN = marks.length && (content === "logos" || content === "screenshots") ? marks.length : content === "screenshots" ? 3 : content === "logos" && !given ? GLYPH.length : words.length;
      do { add(i++); } while ((copy.scrollWidth < f.W * 1.05 || i < 4 || i % setN) && i < 60);
      const twin = copy.cloneNode(true); track.append(twin);
      const all = [...copy.children, ...twin.children];
      rows.push({ view, track, copy, all, dir: (p.direction === "right" ? 1 : -1) * (rtl ? -1 : 1) * (r % 2 ? -1 : 1), cw: copy.getBoundingClientRect().width / (ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1) || 1) });
    }
    const railH = rail.getBoundingClientRect().height / (ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1) || 1);
    const cy = ob ? ML.clamp(ob.y + ob.h / 2, f.safe.y + railH / 2, f.safe.y + f.safe.h - railH / 2) : f.pic.y + f.pic.h / 2;
    rail.style.top = `${(cy - railH / 2).toFixed(1)}px`;

    const brag = p.brag ? ctx.word(String(p.brag), NaN) : NaN;
    const hasBrag = Number.isFinite(brag);
    const leave = Math.max(at + 1, end - 0.35);
    ctx.sfx(at, "whoosh.soft", 0.18);
    if (hasBrag) ctx.sfx(brag, "swell", 0.2);
    const riseEnd = at + 0.6;

    return {
      draw(t) {
        rail.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        const fin = p.rise_in ? ML.lin(t, at, at + 0.15) : ML.ease(t, at, at + 0.4);
        const q = ML.ease(t, leave, leave + 0.3);
        if (own) own.style.visibility = t < at - 1e-6 || (q >= 1 && end < ctx.to - 0.01) ? "" : "hidden"; // back when the move ends before its scene
        const lvl = hasBrag ? 0.5 + 0.5 * ML.ease(t, brag, brag + 0.4) : 1;
        rail.style.opacity = (fin * (1 - q) * lvl).toFixed(4);
        rows.forEach((r) => {
          // the creep starts once the items have risen in (so the rise reads), then never stops
          const tt = Math.max(0, t - (p.rise_in ? riseEnd : at));
          const ph = (tt / P) % 1;
          const x = r.dir < 0 ? -ph * r.cw : -(1 - ph) * r.cw;
          r.track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
          if (p.rise_in) {
            r.all.forEach((u, i) => {
              const s = at + Math.min(i % (r.all.length / 2), 16) * 0.04;
              const e = ML.expo(t, s, s + 0.6);
              u.style.translate = `0 ${((1 - e) * 100).toFixed(2)}%`;
            });
          }
        });
      },
    };
  },
});
