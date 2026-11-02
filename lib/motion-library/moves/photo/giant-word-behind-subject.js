// Giant word behind the subject: a huge translucent word fills the background behind the person, who stays in front.
// Needs a cut-out: the target picture's data-matte (a transparent PNG of the subject), or a [data-layer="subject"]
// in the scene. Then the order is background plate -> word -> subject. With no cut-out the word goes behind the whole
// scene (everything on it is the "subject"), which is the honest fallback. The word: the look's headline face at its
// heaviest, condensed, about 40 % of the frame height (shrunk to fit the width, up to two lines), the accent tint at
// 70 % with multiply (or normal / screen). Enter on its spoken word: opacity 0 -> 1 + scale 1.1 -> 1 in 0.3 s
// power3.out (type only — a picture is never scaled); the foreground dims a touch (brightness .92). Holds for the beat.
// Arabic: the word is never split; it sits on the reading side when it cannot fill the width.
// Source: prompt-motion sab8a-opus-5-5-openedit-prompt (reference only: our own rebuild).
ML.define({
  id: "photo.giant-word-behind-subject",
  category: "photo",
  name: "Giant word behind the speaker",
  does: "A huge translucent word fills the background behind the person, who stays in front of it.",
  says: ["focus", "energy"],
  energy: 4,
  targets: ["word", "image"],
  duration: [0.8, 3],
  params: {
    colour: { type: "choice", options: ["accent", "accent-2", "ink", "good", "bad"], default: "accent" },
    blend: { type: "choice", options: ["multiply", "normal", "screen"], default: "multiply" },
    text: { type: "text", default: "" },
    strength: { type: "number", range: [0.3, 1], default: 0.7 },
    size: { type: "number", range: [0.25, 0.5], default: 0.4 },
    dim: { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:sab8a-opus-5-5-openedit-prompt", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    const host = ctx.scene || ctx.stage;
    const isPic = el && (el.tagName === "IMG" || !!el.querySelector?.("img"));
    const raw = String(p.text || (!isPic && el ? el.textContent : "") || (el && el.getAttribute("alt")) || "").trim();
    if (!raw) return null;
    // one word or a short phrase: a long line keeps its two strongest words (the longest), in order
    let words = raw.split(/\s+/);
    if (words.length > 3) { const keep = [...words].map((w, i) => [w, i]).sort((a, b) => ML.plain(b[0]).length - ML.plain(a[0]).length).slice(0, 2).sort((a, b) => a[1] - b[1]); words = keep.map((x) => x[0]); }
    const text = words.join(" ").replace(/[.,،؛؟?!…:]+$/g, "");
    const W = f.W, H = f.H;
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    // the subject: a cut-out over the picture, a marked layer, else the whole scene in front of the word
    const pic = el && (el.tagName === "IMG" ? el : el.querySelector?.("img"));
    const matteUrl = (pic && pic.dataset.matte) || (el && el.dataset.matte) || "";
    const subjectLayer = host.querySelector('[data-layer="subject"]');
    const layer = mk("div", `position:absolute;inset:0;pointer-events:none;visibility:hidden;display:flex;align-items:center;justify-content:center;overflow:hidden`);
    let matte = null, front = [];
    if (matteUrl && pic) {
      // plate (the picture) -> word (clipped to the picture) -> subject (the cut-out)
      const b = ctx.box(pic);
      layer.style.cssText += `;inset:auto;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-radius:${getComputedStyle(pic).borderRadius}`;
      host.append(layer);
      matte = mk("img", `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;object-fit:${getComputedStyle(pic).objectFit || "cover"};pointer-events:none;visibility:hidden;max-width:none`, host);
      matte.src = matteUrl;
      front = [matte];
    } else if (subjectLayer) {
      subjectLayer.parentElement.insertBefore(layer, subjectLayer);
      front = [subjectLayer];
    } else {
      host.insertBefore(layer, host.firstChild); // behind every slot of the scene
      front = [...host.children].filter((c) => c !== layer && !c.contains(layer));
    }
    const area = layer.getBoundingClientRect(), k = (ctx.stage.getBoundingClientRect().width / (ctx.stage.offsetWidth || 1)) || 1;
    const aw = area.width / k, ah = area.height / k;
    const word = mk("div", `position:relative;font-family:var(--x-head-font);font-weight:900;font-stretch:condensed;line-height:0.86;letter-spacing:${ctx.rtl ? 0 : "-0.04em"};text-transform:var(--x-head-case);white-space:nowrap;text-align:center;color:var(--x-${p.colour});mix-blend-mode:${p.blend};direction:${ctx.rtl ? "rtl" : "ltr"}`, layer);
    word.textContent = text;
    // size: ~size × frame height, shrunk to the width; two lines when one line would be too small
    const target = (matte ? ah : H) * p.size;
    word.style.fontSize = (target / 0.86).toFixed(1) + "px";
    const maxW = aw * 0.94;
    let wpx = word.scrollWidth;
    if (wpx > maxW && words.length > 1 && (target / 0.86) * (maxW / wpx) < target * 0.6) { word.style.whiteSpace = "normal"; word.style.width = maxW + "px"; word.style.textWrap = "balance"; word.innerHTML = ""; words.forEach((w, i) => { if (i) word.append(" "); const s = mk("span", "display:inline-block", word); s.textContent = w; }); }
    for (let i = 0; i < 6; i++) {
      const r = document.createRange(); r.selectNodeContents(word);
      const ww = r.getBoundingClientRect().width / k, hh = word.getBoundingClientRect().height / k;
      const s = Math.min(1, maxW / Math.max(1, ww), (ah * 0.92) / Math.max(1, hh));
      if (s >= 0.995) break;
      word.style.fontSize = (parseFloat(word.style.fontSize) * s).toFixed(1) + "px";
    }
    const tLand = Math.max(at, ctx.word(words[0], at));
    ctx.sfx(tLand, "hit", 0.45);
    const p3 = (x) => 1 - Math.pow(1 - x, 4); // power3.out
    return {
      draw(t) {
        const on = t >= tLand - 1e-6 && t < end;
        layer.style.visibility = on ? "visible" : "hidden";
        if (matte) matte.style.visibility = on ? "visible" : "hidden";
        if (!on) { for (const e of front) e.style.filter = ""; return; }
        const u = p3(ML.lin(t, tLand, tLand + 0.3)), leave = ML.lin(t, end - 0.25, end);
        word.style.opacity = (p.strength * u * (1 - leave)).toFixed(4);
        word.style.scale = (1.1 - 0.1 * u).toFixed(4);
        const d = p.dim ? 1 - 0.08 * u * (1 - leave) : 1;
        for (const e of front) e.style.filter = d < 0.9995 ? `brightness(${d.toFixed(4)})` : "";
      },
    };
  },
});
