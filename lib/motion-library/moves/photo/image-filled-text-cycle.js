// Photos inside the letters: the headline grows to a big geometric word (the look's hero size, fitted to its box) and
// is cut out of the frame — background-clip:text over the whole word, so Arabic stays joined — filled with a picture.
// Every swap_rate seconds the fill changes (a hard cut, or a 0.1 s crossfade between two stacked fills) in step with
// a mono list under the word, where the matching item turns full ink and the others sit at 40%. Entry: the word rises
// out of a mask with the picture already inside. The last fill is the target picture (or the first listed one), so the
// next scene can bridge-cut to it. Pictures: the `images` param, else every picture in the scene; with only one, each
// beat shows another window on it (never drawn past its pixels). List: the `items` param ("a|b|c"), else the scene's
// list (its own items light up in place), else numbered beats in a mono row built under the word.
// Source: prompt-motion arjunsh1607-opus-5-5-on-ultracode (reference only: our own rebuild).
ML.define({
  id: "photo.image-filled-text-cycle",
  category: "photo",
  name: "Photos inside the letters",
  does: "A big word is cut out of the background and filled with photos that change in step with a highlighted name in the list below it.",
  says: ["brand", "list", "proof", "story"],
  energy: 4,
  targets: ["headline", "image", "list"],
  duration: [1.5, 5],
  params: {
    swap_rate: { type: "number", range: [0.2, 0.6], default: 0.35, unit: "s" },
    transition: { type: "choice", options: ["cut", "fade"], default: "cut" },
    list: { type: "bool", default: true },
    images: { type: "text", default: "" },
    items: { type: "text", default: "" },
  },
  pairs: ["transition.match-cut", "text-in.punchline"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "prompt-motion:arjunsh1607-opus-5-5-on-ultracode", license: "reference", note: "our own rebuild" },
  async setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    if (!el) return null;
    const scene = ctx.scene || ctx.stage;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };

    // the word: the target's text when it is text, else the scene's headline
    const isPic = /^(img|picture|video|canvas)$/i.test(el.tagName) || (!el.textContent.trim() && el.querySelector("img"));
    const word = isPic ? scene.querySelector(".ml-title, [data-slot='headline'], [data-slot-sample='headline']") : el;
    if (!word || !word.textContent.trim()) return null;
    const text = word.textContent.trim();

    // the pictures
    const own = el.tagName === "IMG" ? el : el.querySelector ? el.querySelector("img") : null;
    const listed = String(p.images || "").split(",").map((s) => s.trim()).filter(Boolean);
    const found = [...scene.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter(Boolean);
    let srcs = listed.length ? listed : [...new Set(found)];
    if (own && !listed.length) srcs = [own.currentSrc || own.src, ...srcs.filter((s) => s !== (own.currentSrc || own.src))];
    if (!srcs.length) return null;
    const pics = [];
    for (const s of srcs) { const im = new Image(); im.decoding = "sync"; im.src = s; await im.decode().catch(() => {}); pics.push({ src: s, w: im.naturalWidth || 1200, h: im.naturalHeight || 900 }); }

    // the list: given items, the scene's list, else numbered beats
    const listEl = scene.querySelector("[data-slot='list'], [data-slot-sample='list']");
    let items = String(p.items || "").split("|").map((s) => s.trim()).filter(Boolean);
    if (!items.length && listEl) items = [...listEl.children].map((c) => c.textContent.trim()).filter(Boolean);
    if (!items.length) items = pics.map((_, i) => String(i + 1).padStart(2, "0"));

    // the big word: hero size, fitted to its box; the fill lives on two stacked copies (for the crossfade)
    const wb = ctx.box(word);
    word.style.font = "var(--x-head-weight) var(--x-hero-size) / 1 var(--x-head-font)";
    word.style.letterSpacing = rtl ? "0" : "var(--x-hero-track)";
    word.style.whiteSpace = "nowrap";
    word.style.overflow = "hidden";
    word.style.paddingBlock = "0.08em";
    word.textContent = "";
    const holder = mk("span", "position:relative;display:inline-block;will-change:transform", word);
    const fillA = mk("span", "display:inline-block;color:transparent;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;background-repeat:no-repeat", holder);
    const fillB = mk("span", "position:absolute;inset:0;display:inline-block;color:transparent;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;background-repeat:no-repeat;opacity:0", holder);
    fillA.textContent = text; fillB.textContent = text;
    holder.setAttribute("dir", "auto");
    ML.fit(word, Math.max(200, wb.w));
    // ~200 px at 1080 is the floor the technique asks for; it shrinks only when the word would not fit
    const fw = fillA.offsetWidth || 1, fh = fillA.offsetHeight || 1;

    // each beat's window on its picture: cover the word box, a tighter crop only while it stays within the pixels
    const windowOf = (i) => {
      const pic = pics[i % pics.length];
      const cover = Math.max(fw / pic.w, fh / pic.h);
      const z = pics.length > 1 ? 1 : 1 + 0.6 * ML.rnd(i, 3);
      const s = cover * Math.max(1, Math.min(z, 1 / cover));
      const w = pic.w * s, h = pic.h * s;
      const fx = pics.length > 1 ? 0.5 : ML.rnd(i, 5), fy = pics.length > 1 ? 0.5 : ML.rnd(i, 7);
      return `url("${pic.src}") ${((fw - w) * fx).toFixed(1)}px ${((fh - h) * fy).toFixed(1)}px / ${w.toFixed(1)}px ${h.toFixed(1)}px no-repeat`;
    };

    // the beats: entry, then a swap every swap_rate; the last beat lands back on the first picture
    const rate = ML.clamp(p.swap_rate, 0.2, 0.6);
    const tSwap = at + 0.45, tStop = Math.max(tSwap + rate, end - 0.25);
    let N = Math.max(1, Math.floor((tStop - tSwap) / rate));
    const beats = [];
    for (let i = 0; i <= N; i++) beats.push({ t: tSwap + i * rate, k: i === N ? 0 : i + 1 });
    beats.unshift({ t: -Infinity, k: 0 });
    const windows = new Map();
    const win = (b, i) => { const key = b.k + "|" + i; if (!windows.has(key)) windows.set(key, windowOf(b.k === 0 ? 0 : i)); return windows.get(key); };
    beats.forEach((b, i) => { if (i > 0 && i % 2 === 1) ctx.sfx(b.t, "tap", 0.18); });

    // the mono list under the word
    let rows = [];
    if (p.list && listEl && !p.items && listEl.children.length) {
      // the scene already has its list: its own items light up in step (none is built twice)
      rows = [...listEl.children];
      rows.ul = null;
    } else if (p.list) {
      const hostBox = ctx.box(word);
      const fsz = Math.max(16, Math.min(28, hostBox.h * 0.16));
      const ul = mk("div", `position:absolute;left:${f.safe.x}px;width:${f.safe.w}px;top:${(hostBox.y + hostBox.h + fsz * 0.6).toFixed(1)}px;display:flex;flex-wrap:wrap;justify-content:center;gap:${(fsz * 0.5).toFixed(1)}px ${(fsz * 1.4).toFixed(1)}px;font:var(--x-label-weight) ${fsz.toFixed(1)}px var(--x-mono-font);text-transform:var(--x-label-case);letter-spacing:${rtl ? "0" : "0.12em"};color:var(--x-ink);pointer-events:none;z-index:4;visibility:hidden`, scene);
      ul.setAttribute("dir", rtl ? "rtl" : "ltr");
      rows = items.map((x) => { const r = mk("span", "", ul); r.textContent = x; return r; });
      rows.ul = ul;
    }
    const idx = (t) => { let i = 0; for (let j = 0; j < beats.length; j++) if (t >= beats[j].t) i = j; return i; };

    return {
      draw(t) {
        const on = t >= at - 1e-6;
        holder.style.visibility = on ? "visible" : "hidden";
        if (rows.ul) rows.ul.style.visibility = on ? "visible" : "hidden";
        if (!on) { if (rows.length && !rows.ul) rows.forEach((r) => (r.style.opacity = "")); return; }
        // the rise out of the mask
        const u = ML.expo(t, at, at + 0.5);
        holder.style.translate = `0 ${((1 - u) * fh * 1.05).toFixed(2)}px`;
        // the fill: this beat's window, and (fade) the last one fading out over 0.1 s on top
        const i = idx(t), b = beats[i];
        fillA.style.background = win(b, i);
        fillA.style.webkitBackgroundClip = "text"; fillA.style.backgroundClip = "text";
        if (p.transition === "fade" && i > 0) {
          const prev = beats[i - 1], q = ML.lin(t, b.t, b.t + 0.1);
          fillB.style.background = win(prev, i - 1);
          fillB.style.webkitBackgroundClip = "text"; fillB.style.backgroundClip = "text";
          fillB.style.opacity = (1 - q).toFixed(4);
        } else fillB.style.opacity = "0";
        // the list: the matching item lit
        if (rows.length) {
          const a = ML.lin(t, at + 0.2, at + 0.45);
          if (rows.ul) rows.ul.style.opacity = a.toFixed(4);
          const k = b.k % rows.length;
          rows.forEach((r, j) => (r.style.opacity = j === k ? "1" : (1 - 0.6 * a).toFixed(4)));
        }
      },
    };
  },
});
