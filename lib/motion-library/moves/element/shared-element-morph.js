// Picture flies from thumbnail to full view (a shared-element morph): the picture lifts out of its card and flies to
// the middle of a full view — left / top / width / height go FROM its measured rect TO a centred rect with cubic
// in-out over 0.75 s (layout, never a scale, so it stays sharp), its corner radius 6 → 4 (here: its own radius → two
// thirds of it), while the view behind darkens (opacity eased over 0.5 s) and a top bar fades in from T + 0.45 to
// T + 0.95. Optional: an expand button appears on the card and a pointer clicks it 0.1 s before T. The full rect keeps
// the picture's own aspect and never grows past its own pixels.
// Source: MengTo/Skills web-design/html-demo demo, the FULL step (MIT): FROM / TO rects, OPEN timing, overlay and bar
// eases, the expand button and the radius are ported from it.
ML.define({
  id: "element.shared-element-morph",
  category: "element",
  name: "Picture flies from thumbnail to full view",
  does: "A picture lifts out of its small card and flies to centre at full size while the view behind darkens and a toolbar fades on top.",
  says: ["focus", "result", "reveal"],
  energy: 3,
  targets: ["image", "card", "screen"],
  duration: [1, 2],
  params: {
    duration: { type: "number", range: [0.5, 1], default: 0.75, unit: "s" },
    backdrop: { type: "choice", options: ["darken", "none"], default: "darken" },
    toolbar: { type: "bool", default: true },
    click: { type: "bool", default: true },
    title: { type: "text", default: "" },
  },
  pairs: ["ui.type-into-field", "camera.push-in"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/html-demo", license: "MIT", note: "the FULL step of the demo (FROM → TO rects, overlay, top bar, expand button), adapted to look variables" },
  async setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : host.querySelector("img");
    if (!el) return null;
    const A = ctx.box(el);
    if (A.w < 8 || A.h < 8) return null;
    const isImg = el.tagName === "IMG";
    const cs = getComputedStyle(el);
    const r0 = parseFloat(cs.borderTopLeftRadius) || 6, r1 = Math.max(4, r0 * 0.66);
    const L = (en, ar) => (rtl ? ar : en);
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    // light on the darkened view: the look's ink on a dark look, its panel on a light one
    const bg = getComputedStyle(ctx.stage).backgroundColor.match(/[\d.]+/g) || ["255", "255", "255"];
    const lt = (0.2126 * +bg[0] + 0.7152 * +bg[1] + 0.0722 * +bg[2]) / 255 < 0.42 ? "var(--x-ink)" : "var(--x-panel)";

    // ── the full view: overlay, top bar, the flying picture ──
    const layer = mk("div", "position:absolute;inset:0;pointer-events:none;z-index:8;", host);
    const dark = p.backdrop === "darken";
    const overlay = dark ? mk("div", "position:absolute;inset:0;background:color-mix(in srgb, var(--x-device) 94%, transparent);opacity:0;", layer) : null;
    const barH = Math.round(96 * k), barY = f.safe.y - Math.round(f.tall ? 40 * k : 0);
    const bar = p.toolbar ? mk("div", `position:absolute;left:${f.m}px;right:${f.m}px;top:${barY}px;height:${barH}px;display:flex;align-items:center;gap:${Math.round(14 * k)}px;opacity:0;color:${dark ? lt : "var(--x-ink)"};font:500 ${Math.round(24 * k)}px var(--x-body-font);`, layer) : null;
    const icon = (d, size) => { const s = doc.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size); s.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`; return s; };
    const IC = { star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4", down: "M12 4v12M6 11l6 6 6-6M5 20h14", x: "M6 6l12 12M18 6L6 18", expand: "M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" };
    if (bar) {
      const who = mk("div", "display:grid;gap:2px;margin-inline-end:auto;min-width:0;", bar);
      const title = p.title || (host.querySelector(".ml-label") ? host.querySelector(".ml-label").textContent.trim() : "") || L("Image", "صورة");
      mk("b", `font:600 ${Math.round(26 * k)}px var(--x-head-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, who, title);
      const nw = isImg ? el.naturalWidth : Math.round(A.w), nh = isImg ? el.naturalHeight : Math.round(A.h);
      const meta = mk("small", `font:500 ${Math.round(22 * k)}px var(--x-mono-font);opacity:.6;white-space:nowrap;`, who, `${nw} × ${nh}`);
      meta.dir = "ltr";
      const star = mk("span", "display:grid;place-items:center;opacity:.6;", bar); star.append(icon(IC.star, Math.round(28 * k)));
      const pill = (ic, txt) => {
        const b = mk("span", `display:inline-flex;align-items:center;gap:${Math.round(8 * k)}px;padding:${Math.round(10 * k)}px ${Math.round(16 * k)}px;border-radius:var(--x-radius-s);white-space:nowrap;background:${dark ? `color-mix(in srgb, ${lt} 14%, transparent)` : "var(--x-panel)"};border:1px solid ${dark ? `color-mix(in srgb, ${lt} 22%, transparent)` : "var(--x-line)"};`, bar);
        b.append(icon(ic, Math.round(22 * k))); if (txt) mk("span", "", b, txt); return b;
      };
      pill(IC.edit, f.tall ? "" : L("Edit", "تعديل"));
      pill(IC.down, L("Download", "تحميل"));
      pill(IC.x, "");
    }
    // the TO rect: the picture's own aspect, centred in the room under the bar, never past its own pixels
    const top = (bar ? barY + barH : f.safe.y) + 24 * k, bottom = f.H - (f.tall ? 200 : 60) * k;
    const roomW = f.W - f.m * 2, roomH = bottom - top;
    const aspect = isImg && el.naturalWidth ? el.naturalWidth / el.naturalHeight : A.w / A.h;
    let bw = Math.min(roomW, roomH * aspect), bh = bw / aspect;
    if (isImg && el.naturalWidth) { const cap = Math.min(1, el.naturalWidth / bw); bw *= cap; bh *= cap; }
    // a card or screen grows as one piece (its text keeps its wrap); its pictures still never pass their own pixels
    else for (const i of el.querySelectorAll("img")) { const w = ctx.box(i).w, cap = i.naturalWidth && w ? Math.min(1, (i.naturalWidth / w) * (A.w / bw)) : 1; bw *= cap; bh *= cap; }
    const B = { x: (f.W - bw) / 2, y: top + (roomH - bh) / 2, w: bw, h: bh };

    let fly;
    if (isImg) {
      fly = mk("img", `position:absolute;display:block;object-fit:cover;object-position:${cs.objectPosition};`, layer);
      fly.src = el.currentSrc || el.src; fly.alt = "";
      await fly.decode().catch(() => {}); // decoded before the first frame, so no frame depends on when it lands
    } else {
      fly = el.cloneNode(true);
      fly.removeAttribute("data-slot"); fly.querySelectorAll("[data-slot]").forEach((e) => e.removeAttribute("data-slot"));
      fly.style.position = "absolute"; fly.style.margin = "0"; fly.style.boxSizing = "border-box"; fly.style.overflow = "hidden";
      fly.style.left = "0"; fly.style.top = "0"; fly.style.width = `${A.w}px`; fly.style.height = `${A.h}px`; fly.style.transformOrigin = "0 0";
      fly.style.opacity = "1"; fly.style.transform = "none"; fly.style.font = cs.font; fly.style.color = cs.color;
      layer.append(fly);
    }
    fly.style.boxShadow = "var(--x-shadow)";

    // the expand button on the card, and the pointer that clicks it
    // squeezed into the window: the click lead-in first, then the flight
    const span = Math.max(0.8, end - at), q = ML.clamp(span / 1.9, 0.5, 1);
    const T = at + (p.click ? 0.85 : 0.1) * q, D = Math.min(p.duration, Math.max(0.35, at + span - T - 0.05));
    const bs = Math.max(26, Math.min(A.w, A.h) * 0.14, 34 * k);
    const btn = p.click ? mk("span", `position:absolute;left:${rtl ? A.x + bs * 0.3 : A.x + A.w - bs * 1.3}px;top:${A.y + bs * 0.3}px;width:${bs}px;height:${bs}px;display:grid;place-items:center;border-radius:${Math.round(bs * 0.27)}px;color:${lt};background:color-mix(in srgb, var(--x-device) 78%, transparent);opacity:0;`, layer) : null;
    if (btn) btn.append(icon(IC.expand, Math.round(bs * 0.55)));
    let ptr = null, stops = null;
    if (btn) {
      const ps = Math.round(44 * k);
      ptr = doc.createElementNS(NS, "svg"); ptr.setAttribute("viewBox", "0 0 24 24"); ptr.setAttribute("width", ps); ptr.setAttribute("height", ps);
      ptr.style.cssText = "position:absolute;left:0;top:0;overflow:visible;opacity:0;z-index:2;";
      ptr.innerHTML = '<path d="M3 2l7.5 19 2.6-7.9L21 10.5z" style="fill:var(--x-pointer);stroke:var(--x-pointer-edge);stroke-width:1.5;stroke-linejoin:round"/>';
      layer.append(ptr);
      const bx = parseFloat(btn.style.left) + bs * 0.45, by = A.y + bs * 0.75;
      stops = [{ t: at, x: bx + (rtl ? -1 : 1) * A.w * 0.5 + (rtl ? -60 : 60) * k, y: by + A.h * 0.6 }, { t: T - 0.25 * q, x: bx, y: by }, { t: T + 1, x: bx, y: by }];
    }
    if (p.click) ctx.sfx(T - 0.1, "click", 0.3);
    ctx.sfx(T, "whoosh.soft", 0.35);

    return {
      draw(t) {
        const o = ML.ease(t, T, T + D);
        const flying = t >= T;
        fly.style.display = flying ? "block" : "none";
        el.style.visibility = flying ? "hidden" : "";
        if (flying) {
          const x = A.x + (B.x - A.x) * o, y = A.y + (B.y - A.y) * o, w = A.w + (B.w - A.w) * o, h = A.h + (B.h - A.h) * o, rr = r0 + (r1 - r0) * o;
          if (isImg) { // layout, never a scale: the picture stays sharp
            fly.style.left = `${x.toFixed(2)}px`; fly.style.top = `${y.toFixed(2)}px`;
            fly.style.width = `${w.toFixed(2)}px`; fly.style.height = `${h.toFixed(2)}px`;
            fly.style.borderRadius = `${rr.toFixed(2)}px`;
          } else {
            const s = w / A.w;
            fly.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; fly.style.scale = s.toFixed(4);
            fly.style.borderRadius = `${(rr / s).toFixed(2)}px`;
          }
        }
        if (overlay) overlay.style.opacity = ML.ease(t, T, T + 0.5).toFixed(4);
        if (bar) bar.style.opacity = ML.ease(t, T + 0.45 * q, T + 0.95 * q).toFixed(4);
        if (btn) btn.style.opacity = (ML.ease(t, T - 0.75 * q, T - 0.55 * q) * (1 - ML.ease(t, T, T + 0.12))).toFixed(4);
        if (ptr) {
          const g = ML.pathAt(stops, t, [T - 0.25 * q]);
          const press = t >= T - 0.14 && t < T + 0.02 ? 0.86 : 1;
          ptr.style.translate = `${g.x.toFixed(2)}px ${g.y.toFixed(2)}px`;
          ptr.style.scale = String(press);
          ptr.style.opacity = (ML.ease(t, at, at + 0.2 * q) * (1 - ML.ease(t, T + 0.1, T + 0.35))).toFixed(4);
        }
      },
    };
  },
});
