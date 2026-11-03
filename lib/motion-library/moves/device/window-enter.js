// Window enter: an app window arrives in the frame and resolves into the real window. A ~66 %-wide 16:10 window with
// a small radius and a mac title bar (three tiny lights, a file label):
//   bottom     — rises from y +120 % to its place (bottom-anchored) in 0.6 s on cubic-bezier(0.16, 1, 0.3, 1); with
//                placeholder on, its fill turns from a grey slab into the real window over 0.4 s while a large soft
//                shadow grows; the title bar resolves last and the content draws in on the next beat.
//   scale-up   — scale start_scale → 1 with blur → 0 in 0.4 s power3.out at the centre, the whole window resolving as one;
//                a video's play button pulses.
//   scale-down — from scale 1.25 (or start_scale when above 1), opacity 0, blur → 1, 1, 0 over 0.6 s
//                cubic-bezier(0.22, 1, 0.36, 1), centre-anchored. Optional lead-in: a rounded dark panel holds the app
//                icon, which pops 0.6 → 1.3 → 1 (0.5 s back.out) and cross-fades to a tagline; then the UI settles inside
//                that panel, clipped by it. On a target the icon and tagline sit in the target's place instead.
//   fade       — opacity only, 0.4 s.
// A span shorter than the choreography compresses it, so the window always lands inside ctx.end.
// Works on the target (a screen, card or logo enters this way; pictures never blur, nor a target holding one) or on a
// window built in the picture region from the look (dark = the device ink, light = the panel; content an app, a video or
// a picture made of the look's colours). RTL mirrors the window's layout.
// Source: rebuilt as our own code from prompt-motion references (iammxfschr "a little spoiler", emollick "how do you
// explain", brainextends "opus … is") — reference only, nothing copied.
ML.define({
  id: "device.window-enter",
  category: "device",
  name: "App window enters",
  does: "An app window arrives in the frame — rising from below, growing from small, or settling down from large — and resolves from blur or a placeholder into the real window.",
  says: ["reveal", "tech", "arrival", "proof"],
  energy: 3,
  targets: ["screen", "card", "logo"],
  duration: [0.6, 3],
  params: {
    from: { type: "choice", options: ["bottom", "scale-up", "scale-down", "fade"], default: "bottom" },
    placeholder: { type: "bool", default: false },
    blur: { type: "number", range: [0, 12], default: 8, unit: "px" },
    start_scale: { type: "number", range: [0.6, 1.3], default: 0.6 },
    icon_lead: { type: "bool", default: false },
    theme: { type: "choice", options: ["dark", "light"], default: "dark" },
    content: { type: "choice", options: ["app", "video", "image"], default: "app" },
    title: { type: "text" },
    tagline: { type: "text" },
  },
  pairs: ["device.screen-untilt", "ui.cursor-glide-click", "camera.push-in"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:iammxfschr-a-little-spoiler-because", license: "reference", note: "also emollick-how-do-you-explain, brainextends-opus-5-5-is-f-cking; our own rebuild" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(1) + "px";
    const T = (en, ar) => (rtl ? ar : en);
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const dark = p.theme !== "light";

    // on the device fill the ink is whichever of the look's two inks reads against it (panel on a light look, ink on a dark one)
    const lum = (v) => {
      const e = mk("i", `display:none;color:${v};`, host), c = getComputedStyle(e).color; e.remove();
      const n = (c.match(/[\d.]+/g) || []).map(Number), a = c.startsWith("color(") ? n : n.map((x) => x / 255);
      return 0.2126 * (a[0] || 0) + 0.7152 * (a[1] || 0) + 0.0722 * (a[2] || 0);
    };
    const onDevice = () => { const d = lum("var(--x-device)"); return Math.abs(lum("var(--x-panel)") - d) >= Math.abs(lum("var(--x-ink)") - d) ? "var(--x-panel)" : "var(--x-ink)"; };
    const fill = dark ? "var(--x-device)" : "var(--x-panel)";
    const ink = dark ? onDevice() : "var(--x-ink)";
    const soft = dark ? `color-mix(in srgb, ${ink} 10%, var(--x-device))` : "var(--x-panel-2)";
    const lineC = dark ? `color-mix(in srgb, ${ink} 14%, transparent)` : "var(--x-line)";
    const lead = p.from === "scale-down" && p.icon_lead;
    const drawIn = p.from === "bottom"; // only the rise draws its content on the next beat: the others resolve as one

    // ── the window: the target, or one we build ──
    let win, ui = null, shade = null, bar = null, parts = [], play = null, holder = null, isPic = false, box, noBlur = false;
    if (el) {
      win = el;
      isPic = el.tagName === "IMG" || el.tagName.toLowerCase() === "svg";
      noBlur = isPic || !!el.querySelector("img,picture,video");
      box = ctx.box(el);
      if (!isPic) {
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        if (p.placeholder) holder = mk("div", `position:absolute;inset:0;border-radius:inherit;background:color-mix(in srgb, var(--x-dim) 60%, var(--x-panel));z-index:30;pointer-events:none;`, el);
        if (drawIn) parts = [...el.children].filter((c) => c !== holder);
      }
    } else {
      const R = f.pic;
      const W = Math.min(f.W * 0.66, R.w, R.h * 1.6), H = W / 1.6, u = W / 520;
      box = { x: R.x + (R.w - W) / 2, y: R.y + (R.h - H) / 2, w: W, h: H };
      const radius = "calc(var(--x-radius) * 0.2)";
      // the large soft shadow is the look's, on its own layer so it can grow (a window's own shadow could only snap)
      shade = mk("div", `position:absolute;left:${px(box.x)};top:${px(box.y)};width:${px(W)};height:${px(H)};border-radius:${radius};box-shadow:var(--x-shadow);z-index:5;pointer-events:none;`, host);
      win = mk("div", `position:absolute;left:${px(box.x)};top:${px(box.y)};width:${px(W)};height:${px(H)};box-sizing:border-box;overflow:hidden;border-radius:${radius};background:${fill};color:${ink};font-family:var(--x-body-font);border:var(--x-edge) solid ${lineC};z-index:5;pointer-events:none;`, host);
      win.dir = rtl ? "rtl" : "ltr";
      ui = mk("div", `position:absolute;inset:0;display:flex;flex-direction:column;`, win);
      // title bar: three tiny lights, a file label — the look's own window chrome
      bar = mk("div", `position:relative;flex:none;height:${px(32 * u)};display:flex;align-items:center;padding:0 ${px(12 * u)};background:${dark ? soft : "var(--x-bar)"};border-bottom:var(--x-edge) solid ${lineC};`, ui);
      const lights = mk("span", `display:flex;gap:${px(6 * u)};opacity:var(--x-lights);order:var(--x-bar-order);`, bar);
      for (const c of ["var(--x-light-1)", "var(--x-light-2)", "var(--x-light-3)"]) mk("span", `width:${px(9 * u)};height:${px(9 * u)};border-radius:50%;background:${c};`, lights);
      mk("span", `position:absolute;left:50%;translate:-50% 0;white-space:nowrap;font:var(--x-label-weight) ${px(13 * u)} var(--x-mono-font);color:${dark ? `color-mix(in srgb, ${ink} 60%, transparent)` : "var(--x-bar-ink)"};`, bar, p.title || T("app.tsx", "التطبيق"));
      const body = mk("div", `position:relative;flex:1;min-height:0;display:flex;overflow:hidden;`, ui);
      if (p.content === "app") {
        const side = mk("div", `flex:none;width:22%;box-sizing:border-box;display:flex;flex-direction:column;gap:${px(10 * u)};padding:${px(16 * u)} ${px(12 * u)};border-inline-end:var(--x-edge) solid ${lineC};`, body);
        const brand = mk("div", `display:flex;align-items:center;gap:${px(6 * u)};white-space:nowrap;font:700 ${px(13 * u)} var(--x-head-font);`, side);
        mk("span", `flex:none;width:${px(13 * u)};height:${px(13 * u)};border-radius:50%;background:var(--x-accent);`, brand);
        mk("span", "", brand, T("Studio", "الاستوديو"));
        parts.push(brand);
        for (let i = 0; i < 4; i++) parts.push(mk("div", `flex:none;height:${px(8 * u)};width:${(55 + ML.rnd(i, 3) * 35).toFixed(0)}%;border-radius:99px;background:${lineC};`, side));
        const main = mk("div", `flex:1;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;gap:${px(12 * u)};padding:${px(16 * u)} ${px(18 * u)};`, body);
        parts.push(mk("div", `flex:none;font:700 ${px(20 * u)} var(--x-head-font);`, main, T("Made for you", "مختار ليك")));
        const row = mk("div", `flex:none;display:grid;grid-template-columns:repeat(3, 1fr);gap:${px(12 * u)};`, main);
        const tones = ["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)"];
        tones.forEach((c, i) => {
          const card = mk("div", `display:flex;flex-direction:column;gap:${px(6 * u)};`, row);
          mk("div", `aspect-ratio:1;border-radius:calc(var(--x-radius) * 0.2);background:linear-gradient(${135 + i * 40}deg, ${c}, color-mix(in srgb, ${c} 40%, ${fill}));`, card);
          mk("div", `height:${px(7 * u)};width:70%;border-radius:99px;background:${lineC};`, card);
          parts.push(card);
        });
        // the rows take what's left, so the window never ends in an empty band
        const list = mk("div", `flex:1;min-height:0;display:flex;flex-direction:column;gap:${px(8 * u)};`, main);
        for (let i = 0; i < 2; i++) parts.push(mk("div", `flex:1;border-radius:calc(var(--x-radius) * 0.15);background:${soft};`, list));
      } else {
        const pic = mk("div", `position:relative;flex:1;margin:${px(10 * u)};border-radius:calc(var(--x-radius) * 0.15);overflow:hidden;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));`, body);
        mk("div", `position:absolute;width:44%;aspect-ratio:1;${rtl ? "left" : "right"}:12%;top:14%;border-radius:50%;background:color-mix(in srgb, var(--x-accent-ink) 35%, transparent);`, pic);
        mk("div", `position:absolute;left:-10%;right:-10%;bottom:-30%;height:65%;border-radius:50%;background:color-mix(in srgb, var(--x-device) 30%, var(--x-accent));`, pic);
        parts.push(pic);
        if (p.content === "video") {
          play = mk("div", `position:absolute;left:50%;top:50%;width:${px(70 * u)};height:${px(70 * u)};translate:-50% -50%;border-radius:50%;background:color-mix(in srgb, var(--x-device) 55%, transparent);display:flex;align-items:center;justify-content:center;`, pic);
          mk("div", `width:0;height:0;margin-left:${px(6 * u)};border-style:solid;border-width:${px(14 * u)} 0 ${px(14 * u)} ${px(24 * u)};border-color:transparent transparent transparent var(--x-accent-ink);`, play);
          const scrub = mk("div", `position:absolute;left:5%;right:5%;bottom:${px(14 * u)};height:${px(4 * u)};border-radius:99px;background:color-mix(in srgb, var(--x-accent-ink) 35%, transparent);`, pic);
          mk("div", `width:30%;height:100%;border-radius:99px;background:var(--x-accent-ink);`, scrub);
        }
      }
      if (!drawIn) parts = [];
      if (p.placeholder) holder = mk("div", `position:absolute;inset:0;background:color-mix(in srgb, var(--x-dim) 60%, var(--x-panel));z-index:30;`, win);
    }
    const blurMax = noBlur ? 0 : ML.clamp(p.blur, 0, 12);

    // ── icon lead (scale-down): the app icon pops, cross-fades to a tagline, then the UI settles in ──
    const inPanel = lead && !el; // on a built window they live inside its panel; on a target, in its place on the stage
    const mover = inPanel ? ui : win; // what scales and blurs: the UI inside the panel, or the whole window
    let icon = null, tag = null;
    if (lead) {
      const S = Math.min(box.w, box.h) * 0.3, ox = inPanel ? 0 : box.x, oy = inPanel ? 0 : box.y;
      const parent = inPanel ? win : host;
      const cx = ox + box.w / 2, cy = oy + box.h / 2;
      icon = mk("div", `position:absolute;left:${px(cx - S / 2)};top:${px(cy - S / 2)};width:${px(S)};height:${px(S)};border-radius:${px(S * 0.24)};background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));box-shadow:var(--x-shadow);display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;`, parent);
      mk("div", `width:38%;height:38%;border-radius:50%;border:${px(S * 0.07)} solid var(--x-accent-ink);`, icon);
      tag = mk("div", `position:absolute;left:${px(ox + box.w * 0.05)};width:${px(box.w * 0.9)};top:${px(cy)};translate:0 -50%;text-align:center;font:var(--x-head-weight) ${px(Math.min(64 * k, box.w * 0.09))}/1.1 var(--x-head-font);letter-spacing:${rtl ? 0 : "var(--x-head-track)"};color:${inPanel ? ink : "var(--x-ink)"};z-index:6;pointer-events:none;`, parent, p.tagline || T("Meet the new app", "قابل التطبيق الجديد"));
    }

    // ── timing: the choreography at its own pace, compressed when the span is shorter ──
    const rise = ML.bezier(0.16, 1, 0.3, 1);
    const p3out = (x) => 1 - Math.pow(1 - x, 3);
    const backOut = (x, c = 1.7) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
    const inDur0 = { bottom: 0.6, "scale-up": 0.4, "scale-down": 0.6, fade: 0.4 }[p.from] || 0.6;
    const need = (lead ? 1.5 : 0) + inDur0 + (parts.length ? 0.5 + parts.length * 0.06 : 0);
    const q = Math.min(1, Math.max(0.2, end - at) / need);
    const a0 = lead ? at + 1.5 * q : at; // the window's own start
    const inDur = inDur0 * q;
    const doneAt = a0 + inDur;
    const barAt = a0 + 0.55 * q; // the title bar resolves last (the rise only)
    const contentAt = doneAt + 0.15 * q; // content draws in on the next beat (the rise only)
    const holdAt = a0 + Math.min(0.35, inDur0 * 0.6) * q;
    if (lead) ctx.sfx(at, "pop", 0.35);
    ctx.sfx(a0, "whoosh.soft", 0.4);
    if (parts.length && !el) ctx.sfx(contentAt, "tap", 0.2);
    const s0up = Math.min(1, ML.clamp(p.start_scale, 0.6, 1.3));
    let s0down = p.start_scale > 1 ? ML.clamp(p.start_scale, 1, 1.3) : 1.25;
    if (el && el.tagName === "IMG") s0down = Math.max(1, Math.min(s0down, (el.naturalWidth || 0) / (box.w || 1))); // a picture never past its pixels
    win.style.transformOrigin = p.from === "bottom" ? "50% 100%" : "50% 50%";
    mover.style.transformOrigin = win.style.transformOrigin;
    const first = lead && inPanel ? at : a0;

    return {
      draw(t) {
        let o = 1, ty = 0, sc = 1, bl = 0;
        const x = ML.lin(t, a0, doneAt);
        if (p.from === "bottom") { const e = rise(x); ty = (1 - e) * 1.2 * box.h; o = ML.lin(t, a0, a0 + 0.12 * q); }
        else if (p.from === "scale-up") { const e = p3out(x); sc = s0up + (1 - s0up) * e; bl = (1 - e) * blurMax; o = Math.min(1, x * 2); }
        else if (p.from === "scale-down") { const e = ML.land(t, a0, doneAt); sc = s0down + (1 - s0down) * e; bl = (1 - e) * blurMax; o = e; }
        else { o = x; }
        win.style.visibility = t < first ? "hidden" : "visible";
        mover.style.opacity = o.toFixed(4);
        mover.style.translate = ty ? `0 ${ty.toFixed(2)}px` : "none";
        mover.style.scale = sc === 1 ? "none" : sc.toFixed(4);
        mover.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none";
        // the panel that holds the lead-in fades up first and stays
        const panelO = inPanel ? ML.lin(t, at, at + 0.2 * q) : o;
        if (inPanel) win.style.opacity = panelO.toFixed(4);
        if (shade) {
          // the large soft shadow grows as it lands
          const g = inPanel ? panelO : ML.out(t, a0, a0 + (p.from === "bottom" ? 0.75 : inDur0) * q);
          shade.style.visibility = t < first ? "hidden" : "visible";
          shade.style.opacity = (g * panelO).toFixed(4);
          shade.style.translate = inPanel || !ty ? "none" : `0 ${ty.toFixed(2)}px`;
          shade.style.scale = inPanel || sc === 1 ? "none" : sc.toFixed(4);
        }
        if (holder) holder.style.opacity = (t < a0 ? 0 : 1 - ML.ease(t, holdAt, holdAt + 0.4 * q)).toFixed(4);
        if (bar && drawIn) bar.style.opacity = ML.lin(t, barAt, barAt + 0.25 * q).toFixed(4);
        parts.forEach((c, i) => {
          const s = contentAt + i * 0.06 * q, u = ML.land(t, s, s + 0.35 * q);
          c.style.opacity = u.toFixed(4);
          c.style.translate = u < 1 ? `0 ${((1 - u) * 14 * k).toFixed(2)}px` : "none";
        });
        if (play) { const ph = Math.max(0, t - doneAt); play.style.scale = (1 + 0.08 * Math.max(0, Math.sin(ph * Math.PI * 1.5))).toFixed(4); }
        if (lead) {
          const pop = ML.lin(t, at, at + 0.5 * q);
          const isc = pop < 0.5 ? 0.6 + 0.7 * backOut(pop / 0.5, 1.2) : 1.3 - 0.3 * ML.ease(pop, 0.5, 1); // 0.6 → 1.3 → 1
          const swap = ML.ease(t, at + 0.7 * q, at + 1.0 * q), gone = ML.ease(t, a0 - 0.2 * q, a0 + 0.1 * q);
          icon.style.visibility = t < at || swap >= 1 ? "hidden" : "visible";
          icon.style.opacity = (Math.min(1, pop * 4) * (1 - swap)).toFixed(4);
          icon.style.scale = isc.toFixed(4);
          tag.style.visibility = swap <= 0 || gone >= 1 ? "hidden" : "visible";
          tag.style.opacity = (swap * (1 - gone)).toFixed(4);
          tag.style.translate = `0 calc(-50% + ${((1 - swap) * 16 * k).toFixed(2)}px)`;
        }
      },
    };
  },
});
