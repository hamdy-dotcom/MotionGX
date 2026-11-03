// Menu bar push-in: a laptop (or a monitor, or a phone) shows its top menu bar — a generic glyph and menu words at the
// start, status icons (search, a toggle, battery, wifi), the date and time at the end, and the app's small icon among
// them (no real OS branding). Optional rise first: the device rises from below its frame in 0.6 s power3.out with blur
// 8 → 0. Then the camera works toward the menu bar's end corner:
//   push   — the view scales 1 → zoom over 1 s power2.inOut, travelling to the icon (log-space zoom, so it feels even);
//   settle — the scene opens already close, blurred 10 px, settling from 1.4 × zoom to zoom while sharpening (0.6 s).
// The pointer then glides to the app icon and clicks (scale 0.9 press), the icon takes a highlight and a dropdown
// opens under it (or, with dropdown off, a thin guide crosshair marks it). The device is built at its closest size
// and the camera only ever scales it down (≤ 1), so the menu bar stays sharp at full zoom. RTL mirrors the bar (status
// icons at the left, as an Arabic desktop does). In the picture region the view bleeds off the frame's sides and bottom
// (the device rises from the frame's edge, never a hard crop mid-frame); on a screen slot it stays inside that box and
// the slot's real UI sits in the desktop's window. A cursor slot is replaced by this move's own pointer.
// Source: rebuilt as our own code from prompt-motion references (notdwd "stop asking opus", notdwd "another one 1000
// ai") — reference only, nothing copied.
ML.define({
  id: "device.menubar-push-in",
  category: "device",
  name: "Push into the menu bar and click the app icon",
  does: "The camera pushes into a laptop's top menu bar where the app's small icon sits among status icons, and the cursor clicks it.",
  says: ["tech", "arrival", "step", "simplicity"],
  energy: 3,
  targets: ["screen", "cursor"],
  duration: [1.5, 4],
  params: {
    device: { type: "choice", options: ["laptop", "monitor", "phone"], default: "laptop" },
    rise_in: { type: "bool", default: true },
    zoom: { type: "number", range: [1.4, 2.5], default: 2 },
    entry: { type: "choice", options: ["push", "settle"], default: "push" },
    dropdown: { type: "bool", default: true },
  },
  pairs: ["device.window-enter", "ui.cursor-glide-click", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "prompt-motion:notdwd-stop-asking-opus-5-5", license: "reference", note: "also notdwd-another-one-1000-ai; our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => v.toFixed(2) + "px";
    const rr = (v) => `calc(var(--x-radius) * ${(v / 30).toFixed(4)})`, dr = (v) => `calc(var(--x-device-radius) * ${(v / 74).toFixed(4)})`; // radii scale with the look's
    const T = (en, ar) => (rtl ? ar : en);
    const raw = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const el = raw && raw.dataset.slot !== "cursor" ? raw : null;
    const R = el ? ctx.box(el) : { ...f.pic };
    // the slot's real UI, for the desktop's window
    const shot = el ? el.cloneNode(true) : null;
    if (shot) { shot.removeAttribute("data-slot"); shot.querySelectorAll("[data-slot]").forEach((e) => e.removeAttribute("data-slot")); }
    if (raw) raw.style.visibility = "hidden";
    const V = el ? R : { x: 0, y: R.y, w: f.W, h: f.H - R.y }; // the viewport: the slot, or down to the frame's edges
    const host = mk("div", `position:absolute;left:${px(V.x)};top:${px(V.y)};width:${px(V.w)};height:${px(V.h)};overflow:hidden;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
    // what the picture region held steps aside (no solid patch: the look's ground may be an image)
    const under = el ? [] : [...(ctx.scene || ctx.stage).querySelectorAll(".ml-pic > *")];
    const k = Math.min(f.W, f.H) / 1080;
    const zoom = ML.clamp(p.zoom, 1.4, 2.5);
    const settle = p.entry === "settle";
    const Z = settle ? zoom * 1.4 : zoom; // the world is built at its closest size; the camera scales it ≤ 1
    const dev = p.device === "monitor" || p.device === "phone" ? p.device : "laptop";

    // ── the device, in world px (Z × its framed size) ──
    let Dw, Dh, scrW, scrH, scrX, scrY;
    if (dev === "phone") { Dh = Math.min(R.h * 0.86, (R.w * 0.8) / 0.48); Dw = Dh * 0.48; }
    else if (dev === "monitor") { Dw = Math.min(R.w * 0.88, (R.h * 0.8) / 0.78); Dh = Dw * 0.78; }
    else { Dw = Math.min(R.w * 0.86, (R.h * 0.8) / 0.69); Dh = Dw * 0.69; }
    const world = mk("div", `position:absolute;left:0;top:0;width:${px(Dw * Z)};height:${px(Dh * Z)};transform-origin:0 0;`, host);
    const W = (v) => v * Z; // framed px → world px
    const bezelC = "var(--x-device)";
    let screenEl;
    if (dev === "phone") {
      const b = Dw * 0.035;
      mk("div", `position:absolute;inset:0;border-radius:${dr(W(Dw * 0.16))};background:${bezelC};box-shadow:var(--x-shadow);`, world);
      scrX = W(b); scrY = W(b); scrW = W(Dw - 2 * b); scrH = W(Dh - 2 * b);
      screenEl = mk("div", `position:absolute;left:${px(scrX)};top:${px(scrY)};width:${px(scrW)};height:${px(scrH)};border-radius:${dr(W(Dw * 0.125))};overflow:hidden;`, world);
    } else {
      const lidH = dev === "monitor" ? Dw * 0.5625 + Dw * 0.05 : Dw * 0.625;
      const lidW = Dw * (dev === "laptop" ? 0.88 : 1), lidX = (Dw - lidW) / 2, b = lidW * 0.03;
      mk("div", `position:absolute;left:${px(W(lidX))};top:0;width:${px(W(lidW))};height:${px(W(lidH * (dev === "laptop" ? 0.88 : 1)))};border-radius:${dr(W(lidW * 0.035))} ${dr(W(lidW * 0.035))} ${dr(W(dev === "monitor" ? lidW * 0.035 : lidW * 0.008))} ${dr(W(dev === "monitor" ? lidW * 0.035 : lidW * 0.008))};background:${bezelC};box-shadow:var(--x-shadow);`, world);
      scrX = W(lidX + b); scrY = W(b); scrW = W(lidW - 2 * b); scrH = W(lidH * (dev === "laptop" ? 0.88 : 1) - 2 * b - (dev === "monitor" ? Dw * 0.03 : 0));
      screenEl = mk("div", `position:absolute;left:${px(scrX)};top:${px(scrY)};width:${px(scrW)};height:${px(scrH)};border-radius:${dr(W(lidW * 0.008))};overflow:hidden;`, world);
      if (dev === "laptop") {
        const baseY = lidH * 0.88;
        mk("div", `position:absolute;left:0;top:${px(W(baseY))};width:${px(W(Dw))};height:${px(W(Dw * 0.035))};border-radius:0 0 ${dr(W(Dw * 0.04))} ${dr(W(Dw * 0.04))};background:linear-gradient(color-mix(in srgb, var(--x-device) 55%, var(--x-panel)), color-mix(in srgb, var(--x-device) 80%, var(--x-panel)));`, world);
        mk("div", `position:absolute;left:${px(W(Dw * 0.42))};top:${px(W(baseY))};width:${px(W(Dw * 0.16))};height:${px(W(Dw * 0.012))};border-radius:0 0 ${dr(W(Dw * 0.01))} ${dr(W(Dw * 0.01))};background:color-mix(in srgb, var(--x-device) 85%, var(--x-panel));`, world);
      } else {
        mk("div", `position:absolute;left:${px(W(Dw * 0.45))};top:${px(W(lidH))};width:${px(W(Dw * 0.1))};height:${px(W(Dh - lidH - Dw * 0.02))};background:linear-gradient(90deg, color-mix(in srgb, var(--x-device) 70%, var(--x-panel)), color-mix(in srgb, var(--x-device) 85%, var(--x-panel)));`, world);
        mk("div", `position:absolute;left:${px(W(Dw * 0.32))};top:${px(W(Dh - Dw * 0.025))};width:${px(W(Dw * 0.36))};height:${px(W(Dw * 0.025))};border-radius:${dr(W(Dw * 0.01))};background:color-mix(in srgb, var(--x-device) 75%, var(--x-panel));`, world);
      }
    }
    // the desktop: a wallpaper made of the look, a window resting on it
    screenEl.style.background = "linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 55%, var(--x-device)), color-mix(in srgb, var(--x-accent-2) 45%, var(--x-panel)))";
    screenEl.dir = rtl ? "rtl" : "ltr";
    const bu = scrW / (dev === "phone" ? 40 : 66); // bar unit: the bar's type stays readable at the closest view
    const barH = dev === "phone" ? bu * 3.4 : bu * 3.1;
    const ink = "var(--x-ink)";
    const mount = (parent, w, top, h) => { // the slot's UI, never enlarged
      const body = mk("div", `position:absolute;left:0;right:0;top:${px(top)};height:${px(h)};overflow:hidden;`, parent), z = Math.min(1, w / R.w);
      shot.style.cssText += `;position:absolute;left:${px((w - R.w * z) / 2)};top:0;width:${px(R.w)};height:${px(R.h)};box-sizing:border-box;margin:0;transform-origin:0 0;transform:scale(${z.toFixed(4)});`;
      body.append(shot);
    };
    if (dev !== "phone") {
      const win = mk("div", `position:absolute;top:${px(barH + scrH * 0.16)};inset-inline-start:${px(scrW * 0.14)};width:${px(scrW * 0.52)};height:${px(scrH * 0.58)};border-radius:${rr(bu * 1.2)};background:var(--x-panel);box-shadow:var(--x-shadow);overflow:hidden;`, screenEl);
      const wb = mk("div", `height:${px(bu * 3)};display:flex;align-items:center;gap:${px(bu * 0.7)};padding:0 ${px(bu * 1.2)};background:var(--x-panel-2);direction:ltr;`, win);
      for (let i = 1; i <= 3; i++) mk("i", `width:${px(bu)};height:${px(bu)};border-radius:50%;background:var(--x-light-${i});opacity:var(--x-lights);`, wb);
      if (shot) mount(win, scrW * 0.52, bu * 3, scrH * 0.58 - bu * 3);
      else for (let i = 0; i < 4; i++) mk("div", `margin:${px(bu * 1.6)} ${px(bu * 2)} 0;height:${px(bu * 1.2)};width:${(40 + ML.rnd(i, 7) * 45).toFixed(0)}%;border-radius:var(--x-radius-s);background:var(--x-line);`, win);
    } else {
      // home screen: a grid of app tiles
      if (shot) mount(screenEl, scrW, barH, scrH - barH);
      const grid = mk("div", `position:absolute;top:${px(barH * 2.2)};inset-inline:${px(bu * 3)};display:grid;grid-template-columns:repeat(4, 1fr);gap:${px(bu * 3)};`, screenEl);
      if (!shot) for (let i = 0; i < 12; i++) mk("div", `aspect-ratio:1;border-radius:${rr(bu * 2.2)};background:color-mix(in srgb, var(--x-panel) ${(55 + ML.rnd(i, 3) * 40).toFixed(0)}%, transparent);`, grid);
    }

    // the menu bar (status bar on a phone)
    const bar = mk("div", `position:absolute;top:0;inset-inline:0;height:${px(barH)};display:flex;align-items:center;gap:${px(bu * 1.1)};padding:0 ${px(bu * (dev === "phone" ? 3.2 : 1.4))};box-sizing:border-box;background:${dev === "phone" ? "transparent" : "color-mix(in srgb, var(--x-panel) 74%, transparent)"};color:${ink};font:500 ${px(bu * (dev === "phone" ? 1.5 : 1.25))}/1 var(--x-body-font);white-space:nowrap;`, screenEl);
    const icon = (svg, s) => { const e = mk("span", `flex:none;display:flex;align-items:center;justify-content:center;width:${px(bu * s)};height:${px(bu * s)};`, bar); e.innerHTML = svg; return e; };
    const STROKE = `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"`;
    if (dev === "phone") mk("b", "font-weight:600;direction:ltr;", bar, T("9:41", "٩:٤١"));
    else {
      mk("span", `flex:none;width:${px(bu * 1.3)};height:${px(bu * 1.3)};border-radius:50%;background:${ink};`, bar);
      mk("b", "font-weight:700;", bar, T("Studio", "الاستوديو"));
      for (const w of rtl ? ["ملف", "تعديل", "عرض", "نافذة"] : ["File", "Edit", "View", "Window"]) mk("span", "", bar, w);
    }
    mk("span", "flex:1;", bar);
    // the app's icon sits first among the status icons
    const app = mk("span", `position:relative;flex:none;width:${px(bu * 2.4)};height:${px(bu * 2.4)};display:flex;align-items:center;justify-content:center;`, bar);
    const hi = mk("span", `position:absolute;inset:${px(-bu * 0.35)};border-radius:${rr(bu * 0.7)};background:color-mix(in srgb, var(--x-ink) 16%, transparent);opacity:0;`, app);
    const glyph = mk("span", `position:relative;width:${px(bu * 1.7)};height:${px(bu * 1.7)};border-radius:${rr(bu * 0.5)};background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));display:flex;align-items:center;justify-content:center;`, app);
    mk("span", `width:42%;height:42%;border-radius:50%;border:${px(bu * 0.22)} solid var(--x-accent-ink);`, glyph);
    if (dev !== "phone") {
      icon(`<svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="2" y="7" width="20" height="10" rx="5" ${STROKE}/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>`, 1.7);
      icon(`<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="10.5" cy="10.5" r="6" ${STROKE}/><path d="M15 15l5.5 5.5" ${STROKE}/></svg>`, 1.5);
    }
    icon(`<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M2.5 9.5a14 14 0 0 1 19 0M5.8 13a9.5 9.5 0 0 1 12.4 0M9.2 16.5a4.8 4.8 0 0 1 5.6 0" ${STROKE}/><circle cx="12" cy="19.6" r="1.6" fill="currentColor"/></svg>`, dev === "phone" ? 2 : 1.7);
    icon(`<svg viewBox="0 0 30 14" width="100%" height="100%"><rect x="1" y="1" width="24" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3.6" y="3.6" width="15" height="6.8" rx="1.6" fill="currentColor"/><rect x="26.4" y="4.8" width="2.2" height="4.4" rx="1.1" fill="currentColor"/></svg>`, dev === "phone" ? 2.6 : 2.2);
    if (dev !== "phone") mk("span", "", bar, T("Mon 9:41", "الإثنين ٩:٤١"));
    if (dev === "phone") { // the island
      mk("i", `position:absolute;left:50%;top:${px(bu * 0.9)};width:${px(bu * 10)};height:${px(bu * 2.6)};margin-left:${px(-bu * 5)};border-radius:var(--x-radius-s);background:var(--x-device);`, screenEl);
    }

    // measure the icon in world px (the world is untransformed now)
    const wr = world.getBoundingClientRect(), sc0 = wr.width / (world.offsetWidth || 1) || 1, ar = app.getBoundingClientRect();
    const icon0 = { x: (ar.left - wr.left) / sc0 + ar.width / sc0 / 2, y: (ar.top - wr.top) / sc0 + ar.height / sc0 / 2 };
    const iconW = ar.width / sc0;

    // the dropdown under the icon, or the guide crosshair
    let menu = null, cross = null;
    if (p.dropdown) {
      const mw = dev === "phone" ? scrW * 0.62 : bu * 24;
      const left = ML.clamp(rtl ? icon0.x - scrX - iconW / 2 - bu * 0.5 : icon0.x - scrX + iconW / 2 + bu * 0.5 - mw, bu, scrW - mw - bu);
      menu = mk("div", `position:absolute;left:${px(left)};top:${px(barH + bu * 0.5)};width:${px(mw)};padding:${px(bu * 0.8)};box-sizing:border-box;border-radius:${rr(bu * 1.2)};background:var(--x-panel);color:var(--x-ink);box-shadow:var(--x-shadow);border:var(--x-edge) solid var(--x-edge-color);transform-origin:50% 0;opacity:0;font:500 ${px(bu * 1.3)}/1.2 var(--x-body-font);`, screenEl);
      const head = mk("div", `display:flex;align-items:center;gap:${px(bu)};padding:${px(bu * 0.7)};`, menu);
      const mini = mk("span", `flex:none;width:${px(bu * 2.6)};height:${px(bu * 2.6)};border-radius:${rr(bu * 0.7)};background:linear-gradient(135deg, var(--x-accent-2), var(--x-accent));`, head);
      mini.style.boxShadow = "inset 0 0 0 1px var(--x-line)";
      const hn = mk("div", "display:flex;flex-direction:column;gap:0.25em;", head);
      mk("b", "font-weight:700;", hn, T("Studio", "الاستوديو"));
      mk("span", `font-size:0.82em;color:var(--x-good);`, hn, T("Ready", "جاهز"));
      mk("div", `height:1px;margin:${px(bu * 0.4)} 0;background:var(--x-line);`, menu);
      const rows = rtl ? ["مشروع جديد", "افتح الاستوديو", "الإعدادات…"] : ["New project", "Open Studio", "Settings…"];
      rows.forEach((r, i) => mk("div", `padding:${px(bu * 0.75)} ${px(bu * 0.8)};border-radius:${rr(bu * 0.6)};${i === 0 ? "background:var(--x-accent);color:var(--x-accent-ink);" : ""}`, menu, r));
    } else {
      cross = mk("div", "position:absolute;inset:0;opacity:0;", world);
      mk("i", `position:absolute;left:0;right:0;top:${px(icon0.y)};height:${px(Math.max(1, bu * 0.12))};background:color-mix(in srgb, var(--x-accent) 70%, transparent);`, cross);
      mk("i", `position:absolute;top:0;bottom:0;left:${px(icon0.x)};width:${px(Math.max(1, bu * 0.12))};background:color-mix(in srgb, var(--x-accent) 70%, transparent);`, cross);
    }

    // the pointer (screen space, anchored at its tip)
    const cs = 56 * k;
    const cur = mk("div", `position:absolute;left:0;top:0;width:${px(cs)};height:${px(cs)};z-index:3;transform-origin:${px(cs * 5 / 24)} ${px(cs * 2 / 24)};`, host);
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow:visible;filter:drop-shadow(0 ${(2 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px color-mix(in srgb, var(--x-ink) 35%, transparent))"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

    // ── timing (compressed to fit the move's room) ──
    const rise = p.rise_in && !settle;
    const need = settle ? 1.9 : rise ? 2.6 : 1.95;
    const q = ML.clamp((end - at - 0.4) / need, 0.55, 1);
    const r1 = at + 0.6 * q;
    const c0 = settle ? at : rise ? at + 0.65 * q : at; // camera start
    const c1 = c0 + (settle ? 0.6 : 1.0) * q;
    const m0 = c0 + (settle ? 0.45 : 0.7) * q, m1 = c0 + (settle ? 1.05 : 1.3) * q; // the pointer travels
    const click = m1 + 0.06 * q;
    const open = click + 0.1;
    if (rise) ctx.sfx(at, "whoosh.soft", 0.35);
    ctx.sfx(c0 + (settle ? 0 : 0.1), "whoosh.soft", settle ? 0.3 : 0.25);
    ctx.sfx(click, "click", 0.5);
    if (menu) ctx.sfx(open + 0.05, "pop.soft", 0.25);

    // camera: the framed view (device centred, s = 1/Z) → close on the icon (s = zoom/Z), focus a little inward/down
    const C = { x: R.x + R.w / 2 - V.x, y: R.y + R.h / 2 - V.y };
    const devC = { x: (Dw * Z) / 2, y: (Dh * Z) / 2 };
    const viewW = (R.w * Z) / zoom, viewH = (R.h * Z) / zoom;
    const dir = rtl ? -1 : 1;
    const focusEnd = { x: icon0.x - dir * viewW * 0.16, y: icon0.y + viewH * (p.dropdown ? 0.22 : 0.08) };
    const camAt = (t) => {
      let z, F;
      if (settle) { const e = ML.out(t, c0, c1); z = zoom * (1.4 - 0.4 * e); F = focusEnd; }
      else { const e = ML.ease(t, c0, c1); z = Math.exp(Math.log(zoom) * e); F = { x: devC.x + (focusEnd.x - devC.x) * e, y: devC.y + (focusEnd.y - devC.y) * e }; }
      const s = z / Z;
      return { s, tx: C.x - F.x * s, ty: C.y - F.y * s };
    };
    const start = { x: C.x + R.w * (rtl ? -0.2 : 0.2), y: C.y + R.h * 0.38 };
    const drop = V.h - C.y + (Dh * 1) / 2 + 10; // the rise starts wholly below the viewport
    const backOut = (x, c = 1.4) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);

    return {
      draw(t) {
        const cam = camAt(t);
        let ty = 0, blur = 0;
        if (rise) { const e = 1 - Math.pow(1 - ML.lin(t, at, r1), 4); ty = (1 - e) * drop; blur = (1 - e) * 8; } // power3.out
        if (settle) blur = (1 - ML.out(t, c0, c1)) * 10;
        host.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
        if (under.length) { const v = (1 - ML.lin(t, at, at + 0.2)).toFixed(4); for (const e of under) e.style.opacity = v; }
        world.style.transform = `translate(${cam.tx.toFixed(2)}px, ${(cam.ty + ty).toFixed(2)}px) scale(${cam.s.toFixed(5)})`;
        world.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        // the pointer: in from below, onto the icon (which the camera is still carrying)
        const ix = cam.tx + icon0.x * cam.s, iy = cam.ty + ty + icon0.y * cam.s;
        const e = ML.ease(t, m0, m1), arc = Math.sin(Math.PI * e) * R.h * 0.06;
        const x = start.x + (ix - start.x) * e + dir * arc * 0.5, y = start.y + (iy + cs * 0.1 - start.y) * e - arc;
        cur.style.opacity = ML.lin(t, m0 - 0.15, m0 + 0.05).toFixed(4);
        cur.style.translate = `${(x - cs * 5 / 24).toFixed(2)}px ${(y - cs * 2 / 24).toFixed(2)}px`;
        const press = t >= click && t < click + 0.18 ? 1 - Math.sin((Math.PI * (t - click)) / 0.18) * 0.1 : 1;
        cur.style.scale = press === 1 ? "none" : press.toFixed(4);
        glyph.style.scale = press === 1 ? "none" : (1 - (1 - press) * 0.6).toFixed(4);
        hi.style.opacity = ML.lin(t, click, click + 0.08).toFixed(4);
        if (menu) {
          const u = backOut(ML.lin(t, open, open + 0.28), 1.2);
          menu.style.opacity = ML.lin(t, open, open + 0.12).toFixed(4);
          menu.style.transform = t < open ? "scale(0.92, 0.6)" : `scale(${(0.92 + 0.08 * u).toFixed(4)}, ${(0.6 + 0.4 * u).toFixed(4)}) translateY(${((1 - Math.min(1, u)) * -bu).toFixed(2)}px)`;
        }
        if (cross) cross.style.opacity = (0.8 * ML.ease(t, open, open + 0.3)).toFixed(4);
      },
    };
  },
});
