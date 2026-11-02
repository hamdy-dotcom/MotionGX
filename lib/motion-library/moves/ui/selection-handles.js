// Design-tool selection box: a selection frame snaps around an element as if it were being edited — the element's own
// bounds (the inked text, for words) plus a few px of clear space, a thin accent stroke with a small radius; square
// handles (white, accent edge) at 2 diagonal corners (our studio edit room), 4 corners, or 8 corners + mid-edges.
// Appear: the frame fades in over ~0.12 s at the click, handles pop 0 → 1 (0.15 s, 0.025 s apart), then the tag fades in:
// a name above the reading-side corner in small grey type ("Logo — 32 × 32"), or the size in mono on an accent pill
// below the centre ("1280 × 300"). With resize the element grows a little while the frame follows and the number
// counts. Hides with a 0.15 s fade just before the end.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.editroom (own); prompt-motion kikelopezdesign "lol i asked
// opus", shneural "after opus 5.5 it" (reference).
ML.define({
  id: "ui.selection-handles",
  category: "ui",
  name: "Design-tool selection box",
  does: "A design-tool selection frame with square handles and a size / name tag snaps around an element, as if it were being edited.",
  says: ["precision", "tech", "step", "brand"],
  energy: 2,
  targets: ["headline", "card", "image", "logo", "shape", "word"],
  duration: [0.4, 2],
  params: {
    handles: { type: "choice", options: ["2", "4", "8"], default: "4" },
    label: { type: "choice", options: ["none", "name", "size", "name+size"], default: "size" },
    colour: { type: "text", default: "var(--x-accent)" },
    resize: { type: "bool", default: false },
    name: { type: "text" },
    pad: { type: "number", range: [2, 16], default: 8, unit: "px" },
  },
  pairs: ["ui.selection-box-grow", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "own:lib/studio-engine/assets/scenes.js#S.editroom", license: "own", note: "styles from prompt-motion kikelopezdesign / shneural (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const C = p.colour || "var(--x-accent)";
    const layer = mk("div", "position:absolute;inset:0;z-index:7;pointer-events:none;", ctx.scene || ctx.stage);

    // what is selected: the element's inked box (text hugs its letters), or a shape we place
    let target = el, B;
    if (!target) {
      const s = Math.min(f.pic.w, f.pic.h) * 0.42;
      target = mk("div", `position:absolute;left:${(f.pic.x + (f.pic.w - s) / 2).toFixed(1)}px;top:${(f.pic.y + (f.pic.h - s) / 2).toFixed(1)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;border-radius:var(--x-radius);background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));box-shadow:var(--x-shadow);`, layer);
    }
    // measured every frame (from the element's own layout, its scale undone first): web fonts may land after setup
    const textual = target.children.length === 0 && (target.textContent || "").trim() && target.tagName !== "IMG";
    const measure = () => {
      const st = ctx.stage.getBoundingClientRect(), sk = st.width / (ctx.stage.offsetWidth || 1) || 1;
      if (!textual) return ctx.box(target);
      const r = doc.createRange(); r.selectNodeContents(target); const b = r.getBoundingClientRect();
      return { x: (b.left - st.left) / sk, y: (b.top - st.top) / sk, w: b.width / sk, h: b.height / sk };
    };
    B = measure();
    const pad = ML.clamp(p.pad, 2, 16) * Math.max(1, k * 1.4);

    // resize: the element grows a little around its centre (never past the frame)
    const growOf = (b) => (p.resize ? Math.max(1, Math.min(1.08, (f.W - 16) / (b.w + 2 * pad), (f.H - 16) / (b.h + 2 * pad))) : 1);
    const big = Math.min(B.w, B.h) > 160 * k;
    const hs = big ? Math.max(12, 20 * k) : Math.max(8, 12 * k), hb = big ? Math.max(2, 3 * k) : Math.max(1, 1.5 * k);
    const sw = Math.max(1, (big ? 3 : 2) * k);
    const frame = mk("div", `position:absolute;left:0;top:0;box-sizing:border-box;border:${sw.toFixed(1)}px solid ${C};border-radius:${(4 * k).toFixed(1)}px;opacity:0;`, layer);
    const spots = { "2": [[0, 0], [1, 1]], "4": [[0, 0], [1, 0], [1, 1], [0, 1]], "8": [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]] }[p.handles] || [[0, 0], [1, 0], [1, 1], [0, 1]];
    const hds = spots.map(([hx, hy]) => mk("i", `position:absolute;left:${hx * 100}%;top:${hy * 100}%;width:${hs.toFixed(1)}px;height:${hs.toFixed(1)}px;margin:${(-hs / 2).toFixed(1)}px 0 0 ${(-hs / 2).toFixed(1)}px;box-sizing:border-box;background:var(--x-accent-ink);border:${hb.toFixed(1)}px solid ${C};scale:0;`, frame));

    // the tag
    const slot = el && (el.dataset.slot || "");
    const NAMES = { headline: ["Headline", "العنوان"], line: ["Text", "النص"], word: ["Text", "النص"], card: ["Card", "البطاقة"], image: ["Image", "الصورة"], logo: ["Logo", "الشعار"], shape: ["Shape", "الشكل"], number: ["Number", "الرقم"], label: ["Label", "الوسم"] };
    const name = p.name || (NAMES[slot] || NAMES.shape)[rtl ? 1 : 0];
    const size = (g) => `${Math.round(target.offsetWidth * g)} × ${Math.round(target.offsetHeight * g)}`;
    let nameTag = null, sizeTag = null;
    const lab = Math.max(14, 22 * k);
    if (p.label === "name" || p.label === "name+size") nameTag = mk("div", `position:absolute;bottom:100%;${rtl ? "right" : "left"}:0;margin-bottom:${(10 * k).toFixed(1)}px;white-space:nowrap;font:500 ${lab.toFixed(1)}px var(--x-body-font);color:var(--x-dim);opacity:0;`, frame, name);
    if (p.label === "size") sizeTag = mk("div", `position:absolute;top:100%;left:50%;translate:-50% ${(10 * k).toFixed(1)}px;white-space:nowrap;padding:${(4 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px;border-radius:${(5 * k).toFixed(1)}px;background:${C};color:var(--x-accent-ink);font:600 ${lab.toFixed(1)}px var(--x-mono-font);direction:ltr;opacity:0;`, frame, size(1));
    const nameText = (g) => (p.label === "name+size" ? `${name} — ${size(g)}` : name);
    const base = { sc: target.style.scale, or: target.style.transformOrigin };

    const t0 = at, tEdit = at + 0.35, tEdit1 = tEdit + 0.8, tHide = end - 0.3;
    ctx.sfx(t0, "click", 0.35);
    return {
      draw(t) {
        if (p.resize) target.style.scale = base.sc || "";
        const B = measure(), grow = growOf(B);
        const g = p.resize ? 1 + (grow - 1) * ML.ease(t, tEdit, tEdit1) : 1;
        if (p.resize && el) { target.style.transformOrigin = "50% 50%"; target.style.scale = g === 1 ? base.sc || "none" : g.toFixed(4); }
        else if (p.resize) target.style.scale = g === 1 ? "none" : g.toFixed(4);
        const cx = B.x + B.w / 2, cy = B.y + B.h / 2, w = B.w * g + 2 * pad, h = B.h * g + 2 * pad;
        const o = ML.lin(t, t0, t0 + 0.12) * (1 - ML.lin(t, tHide, tHide + 0.15));
        frame.style.opacity = (t < t0 ? 0 : o).toFixed(4);
        frame.style.translate = `${(cx - w / 2).toFixed(2)}px ${(cy - h / 2).toFixed(2)}px`;
        frame.style.width = `${w.toFixed(2)}px`;
        frame.style.height = `${h.toFixed(2)}px`;
        hds.forEach((hd, i) => { const s = t0 + 0.04 + i * 0.025; hd.style.scale = ML.back(t, s, s + 0.15, 1.8).toFixed(4); });
        const tagO = ML.lin(t, t0 + 0.12, t0 + 0.27).toFixed(4);
        if (nameTag) { nameTag.style.opacity = tagO; nameTag.textContent = nameText(g); }
        if (sizeTag) { sizeTag.style.opacity = tagO; sizeTag.textContent = size(g); }
      },
    };
  },
});
