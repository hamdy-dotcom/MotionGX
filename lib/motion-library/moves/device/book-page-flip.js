// Pull back to a floating open book, page flips: the camera starts on a page of text (or the picture) filling the
// frame and pulls back (1 s expo.out) to reveal an open book floating at an angle — two paper pages on a thin cover,
// rotateX 45° rotateZ −10°, a soft shadow below. Then a page lifts and turns about the spine (0.8 s power2.inOut):
// built from 3 vertical segments, each hinged on the last with a small extra rotateY so the page bends as it travels,
// shading darkest at 90°. A label word fades in beside the book. Arabic books turn the other way (the spine on the
// right page's side, pages turning left → right). The pull-back is a book laid out at its closest size and scaled
// down to rest (never scaled above 1 under 3D).
// Source: prompt-motion "itisrazak-wtf-made-with-single" (reference only: rebuilt as our own code).
ML.define({
  id: "device.book-page-flip",
  category: "device",
  name: "Pull back to a floating open book, page flips",
  does: "The camera pulls out from text to reveal an open book floating at an angle; a page lifts and turns.",
  says: ["story", "reveal", "simplicity"],
  energy: 3,
  targets: ["image", "screen"],
  duration: [2.2, 5],
  params: {
    pages: { type: "number", range: [1, 5], default: 1 },
    tilt_x: { type: "number", range: [20, 60], default: 45, unit: "deg" },
    tilt_z: { type: "number", range: [-20, 20], default: -10, unit: "deg" },
    pull_back: { type: "bool", default: true },
    cover_color: { type: "text", default: "" }, // empty: the look's accent
    label: { type: "text", default: "" }, // the word beside the book; empty: "Pages." / "صفحات."
  },
  pairs: ["text-in.punchline", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "card",
  source: { from: "prompt-motion:itisrazak-wtf-made-with-single", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const pic = ctx.el ? (ctx.el.tagName === "IMG" ? ctx.el : ctx.el.querySelector("img")) : null;
    const HW = ctx.f.pic.w, HH = ctx.f.pic.h;
    // the camera pulls out of the page across the whole frame; the book comes to rest in the picture region
    const PX = ctx.f.pic.x, PY = ctx.f.pic.y;
    const clear = mk("div", "position:absolute;left:var(--pic-x);top:var(--pic-y);width:var(--pic-w);height:var(--pic-h);z-index:4;background:var(--x-ground)", null, ctx.scene || ctx.stage);
    const host = mk("div", `position:absolute;inset:0;z-index:4;overflow:hidden;perspective:${Math.round(Math.max(HW, HH) * 2.2)}px;perspective-origin:${(PX + HW / 2).toFixed(0)}px ${(PY + HH / 2).toFixed(0)}px`, null, ctx.scene || ctx.stage);
    const dir = rtl ? -1 : 1;
    const sR = 0.45; // rest scale: the pull-back covers 1 → 0.45
    const tall = HH > HW * 1.05; // tall room: the label sits above the book, not beside it
    const Wp = Math.round(Math.min((tall ? 0.4 : 0.36) * HW, ((tall ? 0.66 : 0.78) * HH) / 1.3) / sR), Hp = Math.round(Wp * 1.3);
    const fs = Wp / 21;
    const cover = p.cover_color || "var(--x-accent)";
    const paper = "color-mix(in srgb, var(--x-panel) 90%, var(--x-accent-2) 10%)", paper2 = "color-mix(in srgb, var(--x-panel) 82%, var(--x-accent-2) 18%)";
    const T = rtl
      ? { label: "صفحات.", heads: ["البداية", "الفصل الثاني", "الفكرة", "التفاصيل", "الخطوة", "النهاية"], body: "كل قصة كويسة بتبدأ بسطر واحد بسيط، وبعدين الصفحة تقلب والحكاية تكمل. الكلام هنا مكتوب على مهل، وكل فقرة بتفتح الباب للي بعدها." }
      : { label: "Pages.", heads: ["The start", "Chapter two", "The idea", "The detail", "The step", "The end"], body: "Every good story starts with one simple line, then the page turns and it carries on. The words here are set slowly, and each paragraph opens the door to the next one." };
    const label = p.label || T.label;
    // one page's content: a heading, real lines of text, a page number (or the picture with a caption)
    const content = (k, parent, withPic) => {
      const c = mk("div", `position:absolute;left:0;top:0;width:${Wp}px;height:${Hp}px;box-sizing:border-box;padding:${(Wp * 0.1).toFixed(1)}px ${(Wp * 0.1).toFixed(1)}px;display:flex;flex-direction:column;gap:${(fs * 0.8).toFixed(1)}px;background:${k % 2 ? paper2 : paper};color:var(--x-ink);font-size:${fs.toFixed(2)}px;direction:${rtl ? "rtl" : "ltr"}`, null, parent);
      mk("div", "font:var(--x-head-weight) 1.7em/1.15 var(--x-head-font);letter-spacing:" + (rtl ? 0 : "var(--x-head-track)"), T.heads[k % T.heads.length], c);
      if (withPic) {
        const im = mk("img", `display:block;width:100%;height:${(Hp * 0.42).toFixed(0)}px;object-fit:cover;border-radius:calc(var(--x-pic-radius) * 0.3);filter:var(--x-pic-filter)`, null, c);
        im.src = withPic.currentSrc || withPic.src;
        mk("div", "font:italic 400 0.95em/1.5 var(--x-serif-font);color:var(--x-dim)", T.body.split(/[،,]/)[0] + ".", c);
      } else {
        mk("div", "font:400 1em/1.62 var(--x-serif-font);color:var(--x-ink);text-align:justify;hyphens:auto", T.body, c);
        mk("div", "font:400 1em/1.62 var(--x-serif-font);color:var(--x-ink);text-align:justify;opacity:.85", T.body.slice(0, Math.round(T.body.length * (0.55 + 0.3 * ML.rnd(k, 5)))), c);
      }
      mk("div", "margin-top:auto;text-align:center;font:400 0.8em var(--x-serif-font);color:var(--x-dim)", String(k + 1), c);
      return c;
    };
    const book = mk("div", `position:absolute;left:${(PX + (HW - 2 * Wp) / 2).toFixed(1)}px;top:${(PY + (HH - Hp) / 2).toFixed(1)}px;width:${2 * Wp}px;height:${Hp}px;transform-style:preserve-3d`, null, host);
    const shadow = mk("div", `position:absolute;left:${(PX + HW * 0.14).toFixed(0)}px;width:${(HW * 0.72).toFixed(0)}px;top:${(PY + HH * 0.72).toFixed(0)}px;height:${(HH * 0.16).toFixed(0)}px;border-radius:50%;background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 30%, transparent), transparent);opacity:0`, null, host);
    host.insertBefore(shadow, book);
    // cover: a thin plate behind both pages, a few px proud of them, with a spine
    const lip = Math.round(Wp * 0.03);
    mk("div", `position:absolute;left:${-lip}px;top:${-lip}px;width:${2 * Wp + 2 * lip}px;height:${Hp + 2 * lip}px;background:${cover};border-radius:${Math.round(lip * 0.8)}px;transform:translateZ(-${Math.round(lip * 0.7)}px);box-shadow:0 0 0 ${Math.max(1, Math.round(lip * 0.15))}px color-mix(in srgb, ${cover} 70%, var(--x-ink))`, null, book);
    const n = Math.round(ML.clamp(p.pages, 1, 5));
    // the static spread: the page under the turning ones shows the last revealed content; the other the first
    const turnSide = rtl ? 0 : Wp, stillSide = rtl ? Wp : 0;
    const still = mk("div", `position:absolute;left:${stillSide}px;top:0;width:${Wp}px;height:${Hp}px;overflow:hidden`, null, book);
    content(0, still, null);
    const under = mk("div", `position:absolute;left:${turnSide}px;top:0;width:${Wp}px;height:${Hp}px;overflow:hidden`, null, book);
    content(2 * n + 1, under, null);
    // spine shading on both static pages
    for (const [x, g] of [[stillSide, rtl ? "to right" : "to left"], [turnSide, rtl ? "to left" : "to right"]]) mk("div", `position:absolute;left:${x}px;top:0;width:${Wp}px;height:${Hp}px;pointer-events:none;background:linear-gradient(${g}, color-mix(in srgb, var(--x-ink) 16%, transparent), transparent 14%)`, null, book);
    // the turning pages: 3 segments chained at the spine, each with a front slice and a back slice
    const segW = Wp / 3;
    const turners = [];
    for (let i = 0; i < n; i++) {
      const segs = [];
      let parent = book;
      for (let k = 0; k < 3; k++) {
        // LTR: the chain grows right from the spine; RTL: left from it
        const seg = mk("div", `position:absolute;top:0;width:${segW.toFixed(2)}px;height:${Hp}px;transform-style:preserve-3d;transform-origin:${rtl ? "right" : "left"} center`, null, parent);
        if (k === 0) seg.style.left = (rtl ? Wp - segW : Wp).toFixed(2) + "px";
        else seg.style.left = (rtl ? -segW : segW).toFixed(2) + "px";
        const order = rtl ? 2 - k : k; // which third of the page (from its left edge) this segment shows
        const front = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "left:-1.5px;right:0" : "left:0;right:-1.5px"};overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden`, null, seg);
        const fc = content(2 * i + 1, front, i === 0 ? pic : null);
        fc.style.left = (-order * segW + (rtl ? 1.5 : 0)).toFixed(2) + "px";
        const back = mk("div", `position:absolute;top:0;bottom:0;${rtl ? "left:-1.5px;right:0" : "left:0;right:-1.5px"};overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg)`, null, seg);
        const bc = content(2 * i + 2, back, null);
        bc.style.left = (-(2 - order) * segW + (rtl ? 1.5 : 0)).toFixed(2) + "px";
        const shadeF = mk("div", "position:absolute;inset:0;background:var(--x-ink);opacity:0;pointer-events:none", null, front);
        const shadeB = mk("div", "position:absolute;inset:0;background:var(--x-ink);opacity:0;pointer-events:none", null, back);
        segs.push({ seg, shadeF, shadeB, k });
        parent = seg;
      }
      turners.push(segs);
    }
    if (pic) pic.style.visibility = "hidden"; // the picture now lives on the first turning page
    const lab = mk("div", `position:absolute;${tall ? `top:${(PY + HH * 0.06).toFixed(0)}px;left:${PX}px;width:${HW}px;text-align:center` : `top:${(PY + HH / 2).toFixed(0)}px;${rtl ? "right" : "left"}:${(PX + HW * 0.04).toFixed(0)}px`};font:var(--x-head-weight) ${Math.round(Math.min(HW * 0.075, HH * 0.11))}px/1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:var(--x-ink);opacity:0;z-index:2`, label, host);
    const labW = lab.offsetWidth;
    // where the book rests: centred in the room the label leaves
    const restShift = tall ? 0 : dir * Math.min(HW * 0.12, labW * 0.55);
    const restDrop = tall ? HH * 0.07 : 0;
    const labY = tall ? "0px" : "-50%";
    const pb = p.pull_back;
    const f0 = at + (pb ? 0.95 : 0.4);
    const flips = turners.map((_, i) => f0 + i * 0.45);
    if (pb) ctx.sfx(at, "whoosh.soft", 0.35);
    flips.forEach((a) => ctx.sfx(a + 0.12, "card", 0.45));
    const leave = Math.max(f0 + 0.9 + (n - 1) * 0.45, end - 0.3);
    return {
      draw(t) {
        const e = pb ? ML.expo(t, at, at + 1) : 1;
        const s = 1 + (sR - 1) * e;
        // at the start the turning page is centred (text fills the frame); at rest the book sits beside the label
        const tx = -dir * (Wp / 2) * (1 - e) + restShift * e, ty = restDrop * e;
        const rx = p.tilt_x * e, rz = p.tilt_z * dir * e;
        book.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)}) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`;
        const gone = ML.ease(t, leave, leave + 0.25);
        const inA = pb ? ML.clamp((t - at) / 0.1) : ML.ease(t, at, at + 0.4);
        host.style.opacity = (inA * (1 - gone)).toFixed(4);
        clear.style.opacity = host.style.opacity;
        shadow.style.opacity = (e * 0.9).toFixed(4);
        shadow.style.translate = `${restShift.toFixed(1)}px ${restDrop.toFixed(1)}px`;
        lab.style.opacity = ML.ease(t, at + 0.75, at + 1.15).toFixed(4);
        lab.style.translate = `${(dir * -12 * (1 - ML.out(t, at + 0.75, at + 1.25))).toFixed(2)}px ${labY}`;
        turners.forEach((segs, i) => {
          const u = ML.ease(t, flips[i], flips[i] + 0.8), bend = Math.sin(Math.PI * u);
          const base = -180 * u * dir, curl = 12 * bend * dir; // the free edge lags behind the spine
          const z = u < 0.5 ? (n - i) * 0.8 : (i + 1) * 0.8; // on top of the stack it is leaving, then of the one it joins
          const shade = Math.min(0.42, bend * 0.42);
          segs.forEach(({ seg, shadeF, shadeB, k }) => {
            seg.style.transform = k === 0 ? `translateZ(${z.toFixed(2)}px) rotateY(${base.toFixed(3)}deg)` : `rotateY(${curl.toFixed(3)}deg)`;
            shadeF.style.opacity = (shade * (0.7 + 0.15 * k)).toFixed(4);
            shadeB.style.opacity = (shade * (0.7 + 0.15 * k)).toFixed(4);
          });
        });
      },
    };
  },
});
