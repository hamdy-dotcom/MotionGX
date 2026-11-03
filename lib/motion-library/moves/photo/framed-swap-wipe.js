// Framed image swap by wipe: the photo in a fixed rounded frame swaps to the next with a clip wipe while the metadata
// row under it updates. Frame radius 12 px (scaled), the look's shadow. The incoming photo lies above, clip-path
// inset(100% 0 0 0) -> inset(0) (bottom -> top; or down / left / right) over 0.5 s cubic-bezier(.7, 0, .2, 1); the
// outgoing photo eases 1 -> 1.05 under it; the incoming settles 1.1 -> 1 over 0.8 s (2D only, capped so no photo is
// enlarged past its own pixels). The metadata row crossfades in 0.2 s. Photos come from the `images` param (comma
// list), the target's data-images, or the other pictures in the scene; with one picture, the next frames are other
// crops of it. Metadata from `meta` ("Cairo · Retail · 240 m² | Giza · Office · 90 m²"), the pictures' alt / data-meta,
// else an index. The row sits below the frame when that space is free, else in a pill on the frame's foot. Swaps land on
// the spoken words in `on_words` (comma list) when the voice says them, else evenly through the run; they are thinned so
// each wipe finishes before the next. The frame's corners ease from the target's to the frame's. RTL flips left/right.
// Source: prompt-motion ercankeskinx-gave-opus-5-5-a (reference only: our own rebuild).
ML.define({
  id: "photo.framed-swap-wipe",
  category: "photo",
  name: "Framed image swap by wipe",
  does: "The photo in a fixed rounded frame swaps to the next one with a clip wipe while the metadata below updates.",
  says: ["choice", "change", "luxury", "list"],
  energy: 2,
  targets: ["image"],
  duration: [0.6, 4],
  params: {
    wipe: { type: "choice", options: ["up", "down", "left", "right"], default: "up" },
    zoom_settle: { type: "bool", default: true },
    duration: { type: "number", range: [0.3, 0.8], default: 0.5, unit: "s" },
    radius: { type: "number", range: [0, 24], default: 12, unit: "px" },
    swaps: { type: "number", range: [1, 5], default: 2 },
    aspect: { type: "choice", options: ["target", "4:5"], default: "target" },
    images: { type: "text", default: "" },
    meta: { type: "text", default: "" },
    show_meta: { type: "bool", default: true },
    meta_at: { type: "choice", options: ["auto", "inside", "below"], default: "auto" },
    on_words: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "ui.skeleton-shimmer"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:ercankeskinx-gave-opus-5-5-a", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f } = ctx;
    if (!el) return null;
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!img) return null;
    const host = ctx.scene || ctx.stage, k = Math.min(f.W, f.H) / 1080;
    const eb = ctx.box(el);
    // the frame: the target's box, or a 4:5 frame centred on it
    let fb = { ...eb };
    if (p.aspect === "4:5") { const h = Math.min(eb.h * 1.0, f.safe.h * 0.7), w = h * 0.8; fb = { x: eb.x + (eb.w - w) / 2, y: eb.y + (eb.h - h) / 2, w, h }; }
    // the photos
    const list = String(p.images || el.dataset.images || "").split(",").map((s) => s.trim()).filter(Boolean);
    const others = [...(ctx.scene || ctx.stage).querySelectorAll("img")].filter((x) => x !== img).map((x) => x.src);
    const srcs = [img.src, ...(list.length ? list : others)];
    // the swaps that fit the run: each wipe ends before the next starts
    const span = Math.max(0.4, end - at - 0.4);
    const n = Math.max(1, Math.min(Math.round(ML.clamp(p.swaps, 1, 5)), Math.floor(span / (ML.clamp(p.duration, 0.3, 0.8) + 0.12) - 1e-6))) + 1;
    const wipeDur = Math.min(p.duration, (span / n) * 0.9);
    const crops = [[50, 50], [18, 30], [82, 70], [30, 85], [70, 15], [50, 20]];
    const metaIn = String(p.meta || "").split("|").map((s) => s.trim()).filter(Boolean);
    const all = [img, ...[...(ctx.scene || ctx.stage).querySelectorAll("img")].filter((x) => x !== img)];
    const mk = (tag, css, parent) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (parent) parent.append(e); return e; };
    const showMeta = p.show_meta;
    const metaH = showMeta ? Math.max(30, 42 * k) : 0;
    // a meta row below the frame if room, else inside its foot
    const fits = fb.y + fb.h + metaH + 10 * k <= f.H - (f.tall ? 120 : 24);
    const rowTop = fb.y + fb.h + 4 * k, rowEnd = fb.y + fb.h + 14 * k + metaH;
    const free = () => ![...host.querySelectorAll("*")].some((e) => {
      if (e === el || e.contains(el) || el.contains(e)) return false;
      const r = ctx.box(e);
      return r.w > 0 && r.h > 0 && r.y < rowEnd && r.y + r.h > rowTop && r.x < fb.x + fb.w && r.x + r.w > fb.x;
    });
    const below = fits && (p.meta_at === "below" || (p.meta_at === "auto" && free()));
    // the param's radius, never rounder than the look's pictures
    const frame = mk("div", `position:absolute;left:${fb.x}px;top:${fb.y}px;width:${fb.w}px;height:${fb.h}px;border-radius:min(${(p.radius * k).toFixed(1)}px, var(--x-pic-radius));overflow:hidden;box-shadow:var(--x-shadow);background:var(--x-pic-ground);pointer-events:none;visibility:hidden;z-index:3`, host);
    const r1 = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0, r0 = parseFloat(getComputedStyle(img).borderTopLeftRadius);
    const slides = [];
    const natW = img.naturalWidth || fb.w, natH = img.naturalHeight || fb.h;
    const coverS = Math.max(fb.w / natW, fb.h / natH);
    for (let i = 0; i < n; i++) {
      const src = srcs[i % srcs.length], c = srcs.length > 1 && i < srcs.length ? [50, 50] : crops[i % crops.length];
      const wrap = mk("div", "position:absolute;inset:0;overflow:hidden", frame);
      // a crop of the one picture: framed tighter (up to 1.45×) but never past its own pixels
      const zc = srcs.length > 1 && i < srcs.length ? 1 : Math.max(1, Math.min(1.45, 1 / Math.max(1e-6, coverS)));
      const im = mk("img", `position:absolute;left:${(-(zc - 1) * c[0]).toFixed(2)}%;top:${(-(zc - 1) * c[1]).toFixed(2)}%;width:${(zc * 100).toFixed(2)}%;height:${(zc * 100).toFixed(2)}%;max-width:none;object-fit:cover;object-position:${c[0]}% ${c[1]}%;filter:var(--x-pic-filter)`, wrap);
      im.src = src;
      const room = Math.max(1, 1 / Math.max(1e-6, coverS * zc));
      const alt = (all[i] && (all[i].dataset.meta || all[i].alt)) || "";
      slides.push({ wrap, im, zmax: Math.min(1.1, room), meta: metaIn[i] || alt || `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}` });
    }
    let metaBox = null, metaRows = [];
    if (showMeta) {
      const mt = below ? fb.y + fb.h + 14 * k : fb.y + fb.h - metaH - 12 * k;
      metaBox = mk("div", `position:absolute;left:${fb.x + (below ? 0 : 14 * k)}px;top:${mt}px;width:${fb.w - (below ? 0 : 28 * k)}px;height:${metaH}px;pointer-events:none;visibility:hidden;z-index:4`, host);
      metaRows = slides.map((s) => {
        const row = mk("div", `position:absolute;inset:0;display:flex;align-items:center;gap:${16 * k}px;justify-content:flex-start;direction:${ctx.rtl ? "rtl" : "ltr"};font:var(--x-label-weight) ${Math.round(24 * Math.max(0.8, k))}px var(--x-label-font);letter-spacing:var(--x-label-track);text-transform:var(--x-label-case);color:${below ? "var(--x-dim)" : "var(--x-ink)"};white-space:nowrap;overflow:hidden`, metaBox);
        if (ctx.rtl) { row.style.letterSpacing = "0"; row.style.textTransform = "none"; }
        s.meta.split("·").map((x) => x.trim()).filter(Boolean).forEach((part, j) => {
          if (j) mk("span", `width:${5 * k}px;height:${5 * k}px;border-radius:50%;background:currentColor;opacity:.6;flex:none`, row);
          const sp = mk("span", "unicode-bidi:isolate", row); sp.dir = "auto"; sp.textContent = part;
        });
        return row;
      });
      if (!below) {
        // one pill on the frame's foot, as wide as the longest row; the rows crossfade inside it
        let wMax = 0;
        for (const row of metaRows) { row.style.position = "static"; row.style.width = "max-content"; wMax = Math.max(wMax, row.offsetWidth); row.style.position = "absolute"; row.style.width = ""; }
        const pad = 14 * k, w = Math.min(fb.w - 28 * k, wMax + pad * 2);
        metaBox.style.width = w + "px";
        metaBox.style.left = (ctx.rtl ? fb.x + fb.w - 14 * k - w : fb.x + 14 * k) + "px";
        metaBox.style.borderRadius = "var(--x-radius-s)";
        metaBox.style.background = "color-mix(in srgb, var(--x-panel) 88%, transparent)";
        for (const row of metaRows) row.style.padding = `0 ${pad}px`;
      }
    }
    // swap times: on a spoken word if one fits, else evenly
    const named = String(p.on_words || "").split(",").map((s) => s.trim()).filter(Boolean);
    const times = [];
    for (let i = 1; i < n; i++) {
      const even = at + (span * i) / n, prev = times.length ? times[times.length - 1] + wipeDur : at, said = named[i - 1] ? ctx.word(named[i - 1], even) : even;
      times.push(said >= prev && said <= end - wipeDur - 0.2 ? said : Math.max(even, prev));
    }
    const curve = ML.bezier(0.7, 0, 0.2, 1);
    let dir = p.wipe;
    if (ctx.rtl && (dir === "left" || dir === "right")) dir = dir === "left" ? "right" : "left";
    const clipOf = (u) => {
      const a = ((1 - u) * 100).toFixed(3);
      return dir === "up" ? `inset(${a}% 0 0 0)` : dir === "down" ? `inset(0 0 ${a}% 0)` : dir === "left" ? `inset(0 0 0 ${a}%)` : `inset(0 ${a}% 0 0)`;
    };
    times.forEach((tt) => ctx.sfx(tt, "whoosh.soft", 0.3));
    return {
      draw(t) {
        const on = t >= at - 1e-6 && t < end;
        frame.style.visibility = on ? "visible" : "hidden";
        if (metaBox) metaBox.style.visibility = on ? "visible" : "hidden";
        el.style.visibility = t >= at - 1e-6 ? "hidden" : "";
        if (!on) return;
        const leave = ML.lin(t, end - 0.2, end);
        if (Number.isFinite(r0)) frame.style.borderRadius = (r0 + (r1 - r0) * ML.ease(t, at, at + 0.35)).toFixed(2) + "px";
        frame.style.opacity = (1 - leave).toFixed(4);
        if (metaBox) metaBox.style.opacity = (1 - leave).toFixed(4);
        // current: the last slide whose swap has begun
        let cur = 0;
        for (let i = 0; i < times.length; i++) if (t >= times[i]) cur = i + 1;
        slides.forEach((s, i) => {
          const tin = i === 0 ? -Infinity : times[i - 1];
          const visible = i === cur || (i === cur - 1 && t < times[cur - 1] + wipeDur);
          s.wrap.style.display = visible ? "block" : "none";
          if (!visible) return;
          s.wrap.style.zIndex = String(i);
          if (i === 0 && cur === 0) { s.wrap.style.clipPath = "none"; s.im.style.scale = "none"; return; }
          if (i === cur) {
            const u = curve(ML.lin(t, tin, tin + wipeDur));
            s.wrap.style.clipPath = u >= 1 ? "none" : clipOf(u);
            const z = p.zoom_settle ? 1 + (s.zmax - 1) * (1 - ML.out(t, tin, tin + 0.8)) : 1;
            s.im.style.scale = z === 1 ? "none" : z.toFixed(4);
          } else {
            // outgoing, under the wipe
            const tout = times[cur - 1], z = 1 + (Math.min(1.05, s.zmax) - 1) * ML.ease(t, tout, tout + wipeDur);
            s.wrap.style.clipPath = "none";
            s.im.style.scale = z === 1 ? "none" : z.toFixed(4);
          }
        });
        metaRows.forEach((row, i) => {
          const tin = i === 0 ? at : times[i - 1], tout = i < times.length ? times[i] : Infinity;
          const o = (i === 0 ? 1 : ML.lin(t, tin + 0.05, tin + 0.25)) * (1 - ML.lin(t, tout, tout + 0.2));
          row.style.opacity = o.toFixed(4);
          row.style.translate = `0 ${((1 - Math.min(1, o)) * 6 * k * (t >= tout ? -1 : 1)).toFixed(2)}px`;
        });
      },
    };
  },
});
