// Product screen comes alive: inside the product screen things happen in layers on one shared ease (power3.out) with
// short offsets, transform / opacity only, each layer snapped to a spoken word when one falls close.
//   steps "rows+stats+images+button" (R.inside): up to 8 rows fromTo opacity 0 x 40 → 1 / 0, 0.45 s, stagger 0.12;
//     up to 4 stats count up (1.1 s, 0.1 s apart) or pop from scale 0.6 back.out(2.5) 0.4 s when they are not numbers;
//     up to 4 images scale 0.85 → 1 back.out(1.8) 0.5 s stagger 0.1; the first button gets a press-punch ~0.9 s later.
//   steps "frame+chrome+panels+numbers+highlight": the frame's edges draw (scaleX / scaleY) 0.5 s; the chrome / nav
//     fades 0.3 s; panels slide 24 px from their natural side 0.5 s stagger 0.1; numbers count up 0.8–1.2 s; a state
//     chip swaps by crossfade 0.3 s.
//   highlight (auto: both in the layered steps, none in the other): a soft accent ring fades and scales 1.04 → 1 around the key region and / or the rest dims to 60 %.
// When the target is a real screen with rows / stats / pictures / a button inside ([data-role] or li, tr, img, button,
// numbers), those are animated; otherwise a sample product screen is rebuilt inside the target or the picture region.
// Source: MotionGX live-engine recipes.js R.inside (own) + MengTo/Skills gsap-scrolltrigger-storytelling layering (MIT).
ML.define({
  id: "ui.ui-come-alive",
  category: "ui",
  name: "Product screen comes alive / builds in layers",
  does: "Inside the product screen things happen in layers: the frame draws, panels slide in, rows enter, numbers count up, pictures pop, a key region is highlighted and one button presses.",
  says: ["proof", "growth", "tech", "reveal", "step", "simplicity"],
  energy: 3,
  targets: ["screen", "list", "number", "card"],
  duration: [1.2, 4],
  params: {
    steps: { type: "choice", options: ["rows+stats+images+button", "frame+chrome+panels+numbers+highlight"], default: "rows+stats+images+button" },
    stagger: { type: "number", range: [0.06, 0.2], default: 0.12, unit: "s" },
    highlight: { type: "choice", options: ["auto", "none", "ring", "dim-others", "both"], default: "auto" },
    count: { type: "number", range: [0.8, 1.2], default: 1.1, unit: "s" },
    sync: { type: "choice", options: ["spoken", "fixed"], default: "spoken" },
  },
  pairs: ["camera.push-in", "ui.cursor-glide-click", "ui.list-rows-stagger"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.inside", license: "own", note: "layered build per MengTo/Skills gsap-scrolltrigger-storytelling (MIT); timings on one clock" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const U = (n) => `calc(var(--u) * ${n})`;
    const host = ctx.scene || ctx.stage;
    const dir = rtl ? -1 : 1;
    const layered = p.steps === "frame+chrome+panels+numbers+highlight";
    const st = ML.clamp(p.stagger, 0.06, 0.2);
    const countD = ML.clamp(p.count, 0.8, 1.2);
    const p3 = (t, a, b) => ML.out(t, a, b); // power3.out
    const p2io = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    // a step lands on a spoken word when one falls within 0.2 s of its slot
    const spoken = (ctx.words || []).filter((w) => w.t >= at - 0.05 && w.t <= end).map((w) => w.t);
    const snap = (x) => { if (p.sync !== "spoken") return x; let best = x, d = 0.2; for (const w of spoken) if (Math.abs(w - x) < d) { d = Math.abs(w - x); best = w; } return Math.max(at, best); };

    // ── numbers: keep prefix / suffix / decimals / separators / digit set ──
    const AR = "٠١٢٣٤٥٦٧٨٩";
    function parseNum(s) {
      const west = String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/٫/g, ".").replace(/٬/g, ",");
      const m = west.match(/^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/s);
      if (!m) return null;
      const raw = m[2], dec = (raw.split(".")[1] || "").length;
      return { pre: m[1], suf: m[3], v: parseFloat(raw.replace(/,/g, "")), dec, comma: raw.includes(","), arabic: /[٠-٩]/.test(s) };
    }
    function fmt(n, v) {
      let s = v.toFixed(n.dec);
      if (n.comma) { const [a, b] = s.split("."); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : ""); }
      if (n.arabic) s = s.replace(/\d/g, (d) => AR[+d]).replace(/,/g, "٬").replace(/\./g, "٫");
      return n.pre + s + n.suf;
    }

    // ── find the parts: a real screen's own, else a rebuilt sample screen ──
    const inEl = ctx.el && ctx.el !== ctx.stage;
    let rows = [], stats = [], imgs = [], btn = null, panels = [], chrome = [], frameEl = null, keyEl = null, chip = null, chipAfter = null, layer = null;
    if (inEl) {
      const el = ctx.el, q = (s) => [...el.querySelectorAll(s)];
      const role = (r) => q(`[data-role="${r}"]`);
      rows = [...role("row"), ...role("item")];
      if (!rows.length) rows = q("li, tr");
      if (!rows.length && el.children.length >= 2) rows = [...el.children].filter((c) => !c.querySelector("img") && c.tagName !== "IMG");
      stats = role("stat");
      if (!stats.length) stats = q("*").filter((e) => !e.children.length && parseNum(e.textContent.trim()) && /\d/.test(e.textContent) && e.textContent.trim().length < 14);
      // a number target is its own stat: it counts up where it stands
      if (!stats.length && !el.children.length && parseNum(el.textContent.trim())) stats = [el];
      imgs = [...role("image"), ...q("img")];
      btn = role("button")[0] || q("button, .btn")[0] || null;
      rows = rows.filter((r) => !stats.includes(r) && !imgs.includes(r)).slice(0, 8);
      stats = stats.slice(0, 4); imgs = imgs.slice(0, 4);
      panels = role("panel"); chrome = role("chrome");
      keyEl = role("key")[0] || stats[0] || imgs[0] || null;
      frameEl = stats[0] === el ? null : el; // a leaf number holds only its text: no edges inside it
    }
    const built = !inEl || (!rows.length && !stats.length && !imgs.length && !btn);
    if (built) {
      // a target too small to hold a screen (a label, an empty chip): the screen takes the picture region
      const tb = inEl ? ctx.box(ctx.el) : null, R = tb && tb.w > f.W * 0.4 && tb.h > f.H * 0.2 ? tb : f.pic;
      layer = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:grid;place-items:center;pointer-events:none;z-index:6;`, host);
      mk("div", "position:absolute;inset:0;border-radius:var(--x-radius);background:var(--x-ground);", layer); // whatever the region held clears
      const tall = R.h > R.w * 1.1;
      const L = rtl
        ? { app: "لوحة المبيعات", nav: ["الرئيسية", "الطلبات", "العملاء", "التقارير"], h: "نظرة عامة", chip: ["مسودة", "مباشر"], btn: "نشر التقرير",
            stats: [["الإيراد", "48,250"], ["الطلبات", "1,284"], ["التحويل", "6.4%"], ["العملاء", "932"]],
            rows: [["سارة أحمد", "2,400"], ["متجر النور", "1,860"], ["كريم علي", "1,320"], ["مكتبة دار", "980"], ["ليلى حسن", "740"]] }
        : { app: "Sales dashboard", nav: ["Home", "Orders", "Customers", "Reports"], h: "Overview", chip: ["Draft", "Live"], btn: "Publish report",
            stats: [["Revenue", "48,250"], ["Orders", "1,284"], ["Conversion", "6.4%"], ["Customers", "932"]],
            rows: [["Sara Ahmed", "2,400"], ["Northwind", "1,860"], ["Karim Ali", "1,320"], ["Paper & Co", "980"], ["Laila Hassan", "740"]] };
      const LABEL = `font:var(--x-label-weight) ${U(10)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? 0 : "0.12em"};text-transform:var(--x-label-case);color:var(--x-dim);`;
      const app = mk("div", `--u:1px;position:relative;width:${U(tall ? 460 : 860)};box-sizing:border-box;border-radius:${U(18)};background:var(--x-panel);box-shadow:var(--x-shadow);overflow:hidden;font-family:var(--x-body-font);color:var(--x-ink);`, layer);
      frameEl = app;
      // chrome: the window bar
      const bar = mk("div", `display:flex;align-items:center;gap:${U(8)};padding:${U(12)} ${U(16)};background:var(--x-bar);border-bottom:1px solid var(--x-line);`, app);
      const lights = mk("span", `display:flex;gap:${U(6)};opacity:var(--x-lights);`, bar);
      for (const c of ["--x-light-1", "--x-light-2", "--x-light-3"]) mk("i", `width:${U(9)};height:${U(9)};border-radius:50%;background:var(${c});`, lights);
      mk("span", `${LABEL}color:var(--x-bar-ink);margin-inline-start:${U(8)};flex:1;`, bar, L.app);
      const chipBox = mk("span", `position:relative;display:inline-grid;${LABEL}`, bar);
      chip = mk("span", `grid-area:1/1;padding:${U(4)} ${U(10)};border-radius:var(--x-radius-s);background:var(--x-panel-2);color:var(--x-dim);`, chipBox, L.chip[0]);
      chipAfter = mk("span", `grid-area:1/1;padding:${U(4)} ${U(10)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-good) 16%, var(--x-panel));color:var(--x-good);text-align:center;`, chipBox, L.chip[1]);
      chrome.push(bar);
      const body = mk("div", `display:grid;grid-template-columns:${tall ? "1fr" : `${U(170)} 1fr`};`, app);
      if (!tall) {
        const nav = mk("div", `padding:${U(16)};display:grid;gap:${U(6)};align-content:start;background:var(--x-panel-2);border-inline-end:1px solid var(--x-line);`, body);
        L.nav.forEach((n, i) => mk("div", `padding:${U(8)} ${U(10)};border-radius:${U(8)};font-size:${U(13)};${i === 0 ? "background:var(--x-panel);color:var(--x-ink);font-weight:600;" : "color:var(--x-dim);"}`, nav, n));
        chrome.push(nav);
      }
      const main = mk("div", `padding:${U(18)};display:grid;gap:${U(14)};`, body);
      const head = mk("div", `display:flex;align-items:center;justify-content:space-between;`, main);
      mk("div", `font:var(--x-head-weight) ${U(22)} var(--x-head-font);letter-spacing:-0.02em;`, head, L.h);
      btn = mk("div", `padding:${U(8)} ${U(14)};border-radius:${U(10)};background:var(--x-accent);color:var(--x-accent-ink);font-size:${U(12)};font-weight:600;`, head, L.btn);
      chrome.push(head);
      const sg = mk("div", `display:grid;grid-template-columns:repeat(${tall ? 2 : 4}, 1fr);gap:${U(10)};`, main);
      const statCards = L.stats.map(([k, v]) => { const c = mk("div", `padding:${U(12)};border-radius:${U(12)};border:1px solid var(--x-line);background:var(--x-panel);`, sg); mk("div", LABEL, c, k); stats.push(mk("div", `margin-top:${U(6)};font:var(--x-head-weight) ${U(24)} var(--x-head-font);font-variant-numeric:tabular-nums;letter-spacing:-0.02em;`, c, v)); return c; });
      panels.push(sg);
      const lower = mk("div", `display:grid;grid-template-columns:${tall ? "1fr" : "1.4fr 1fr"};gap:${U(12)};`, main);
      const list = mk("div", `border:1px solid var(--x-line);border-radius:${U(12)};padding:${U(6)} ${U(12)};`, lower);
      L.rows.slice(0, tall ? 4 : 5).forEach(([n, v], i) => {
        const r = mk("div", `display:flex;align-items:center;gap:${U(10)};padding:${U(8)} 0;${i ? "border-top:1px solid var(--x-line);" : ""}`, list);
        mk("i", `width:${U(22)};height:${U(22)};border-radius:50%;background:color-mix(in srgb, var(--x-accent) ${30 + i * 12}%, var(--x-panel-2));flex:none;`, r);
        mk("span", `flex:1;font-size:${U(13)};`, r, n);
        mk("span", `font-size:${U(13)};color:var(--x-dim);font-variant-numeric:tabular-nums;`, r, v);
        rows.push(r);
      });
      panels.push(list);
      const gal = mk("div", `display:grid;grid-template-columns:repeat(${tall ? 3 : 2}, 1fr);gap:${U(8)};align-content:start;`, lower);
      for (let i = 0; i < (tall ? 3 : 4); i++) {
        const a = 20 + i * 20;
        imgs.push(mk("div", `aspect-ratio:${tall ? "1" : "4 / 3"};border-radius:${U(10)};background:linear-gradient(${135 + i * 40}deg, color-mix(in srgb, var(--x-accent) ${100 - a}%, var(--x-panel)), color-mix(in srgb, var(--x-accent-2) ${60 + a / 2}%, var(--x-panel-2)));`, gal));
      }
      panels.push(gal);
      keyEl = statCards[0];
      const u = Math.min((R.w * 0.96) / app.offsetWidth, (R.h * 0.96) / app.offsetHeight);
      app.style.setProperty("--u", u.toFixed(4) + "px");
      stats = stats.slice(0, 4);
    }

    // count-ups: numbers only; the rest pop
    const nums = stats.map((e) => { const n = parseNum(e.textContent.trim()); return n && Number.isFinite(n.v) ? { e, n, text: e.textContent } : { e, n: null }; });
    nums.forEach((x) => { if (x.n) x.e.style.minWidth = x.e.offsetWidth + "px"; x.e.style.willChange = "opacity"; });
    // edges of the frame (drawn in layered mode)
    const edges = [];
    if (layered && frameEl) {
      const fb = frameEl === layer ? null : frameEl;
      const box = fb || frameEl;
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      const E = (css) => mk("i", `position:absolute;background:var(--x-accent);pointer-events:none;z-index:3;${css}`, box);
      edges.push({ e: E("left:0;top:0;width:100%;height:2px;"), ax: "x", o: rtl ? "100% 0" : "0 0" });
      edges.push({ e: E(`${rtl ? "left" : "right"}:0;top:0;width:2px;height:100%;`), ax: "y", o: "0 0" });
      edges.push({ e: E("left:0;bottom:0;width:100%;height:2px;"), ax: "x", o: rtl ? "0 0" : "100% 0" });
      edges.push({ e: E(`${rtl ? "right" : "left"}:0;top:0;width:2px;height:100%;`), ax: "y", o: "0 100%" });
      edges.forEach((x) => (x.e.style.transformOrigin = x.o));
    }
    // highlight ring around the key region
    let ringEl = null;
    const auto = layered && p.highlight === "auto", hlRing = auto || p.highlight === "ring" || p.highlight === "both", hlDim = auto || p.highlight === "dim-others" || p.highlight === "both";
    if (hlRing && keyEl) {
      const kb = ctx.box(keyEl), pad = Math.max(6, kb.h * 0.08);
      ringEl = mk("div", `position:absolute;left:${kb.x - pad}px;top:${kb.y - pad}px;width:${kb.w + pad * 2}px;height:${kb.h + pad * 2}px;box-sizing:border-box;border:var(--x-ring-w) solid var(--x-ring);border-radius:calc(var(--x-radius) * 0.5);box-shadow:0 0 0 ${pad}px color-mix(in srgb, var(--x-ring) 12%, transparent);pointer-events:none;z-index:8;opacity:0;`, host);
    }
    const dimSet = keyEl ? [...rows, ...nums.map((x) => x.e).filter((e) => !keyEl.contains(e)), ...imgs].filter((e) => !keyEl.contains(e)) : [];

    // ── times ──
    const T = {};
    if (layered) {
      T.frame = at; T.chrome = snap(at + 0.45); T.panels = snap(at + 0.65); T.rows = T.panels + 0.15; T.imgs = T.panels + 0.25;
      T.nums = snap(T.panels + 0.3); T.hl = snap(Math.min(end - 0.9, T.nums + countD + 0.1)); T.swap = Math.min(end - 0.5, T.hl + 0.35); T.btn = Infinity;
    } else {
      T.frame = -Infinity; T.chrome = at - 1; T.panels = at - 1;
      T.rows = snap(at); T.nums = snap(at + 0.05); T.imgs = snap(at + 0.1); T.btn = snap(Math.min(end - 0.5, at + 0.9));
      T.hl = snap(Math.min(end - 0.8, T.btn + 0.25)); T.swap = Math.min(end - 0.45, T.btn + 0.1);
    }
    const rowT = rows.map((_, i) => T.rows + i * st);
    const numT = nums.map((_, i) => T.nums + i * 0.1);
    const imgT = imgs.map((_, i) => T.imgs + i * 0.1);
    const panelT = panels.map((_, i) => T.panels + i * 0.1);
    if (layered) ctx.sfx(T.frame, "whoosh.soft", 0.25);
    if (rows.length) ctx.sfx(T.rows, "pop.soft", 0.3);
    if (nums.length) ctx.sfx(T.nums, "blip", 0.2);
    if (imgs.length) ctx.sfx(T.imgs + 0.05, "pop.soft", 0.25);
    if (btn && Number.isFinite(T.btn)) ctx.sfx(T.btn, "click", 0.45);
    if (hlRing || hlDim) ctx.sfx(T.hl, "tap", 0.25);
    // a panel's natural side: left half slides from the left, right half from the right (x by its centre)
    const midX = (inEl ? ctx.box(ctx.el) : f.pic), cx = midX.x + midX.w / 2;
    const side = panels.map((e) => { const b = ctx.box(e); const c = b.x + b.w / 2; return Math.abs(c - cx) < midX.w * 0.08 ? 0 : c < cx ? -1 : 1; });

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        if (layer) { layer.style.opacity = (ML.lin(t, at - 0.05, at + (layered ? 0.05 : 0.2)) * (1 - leave)).toFixed(4); }
        else if (inEl) ctx.el.style.opacity = (1 - leave).toFixed(4);
        // 1) frame edges draw
        edges.forEach((x, i) => {
          const a = T.frame + i * 0.08, u = p3(t, a, a + 0.5);
          x.e.style.transform = x.ax === "x" ? `scaleX(${u.toFixed(4)})` : `scaleY(${u.toFixed(4)})`;
          x.e.style.opacity = (1 - 0.65 * ML.lin(t, T.frame + 0.7, T.frame + 1.1)).toFixed(3);
        });
        if (layered && frameEl && layer) frameEl.style.background = `color-mix(in srgb, var(--x-panel) ${(100 * p3(t, T.frame + 0.2, T.frame + 0.6)).toFixed(1)}%, transparent)`;
        if (layered && frameEl && layer) frameEl.style.boxShadow = t < T.frame + 0.4 ? "none" : "var(--x-shadow)";
        // 2) chrome fades
        if (layered) chrome.forEach((e) => (e.style.opacity = p3(t, T.chrome, T.chrome + 0.3).toFixed(4)));
        // 3) panels slide 24 px from their side
        if (layered) panels.forEach((e, i) => {
          const u = p3(t, panelT[i], panelT[i] + 0.5);
          e.style.opacity = u.toFixed(4);
          e.style.translate = side[i] ? `${((1 - u) * 24 * side[i]).toFixed(2)}px 0` : `0 ${((1 - u) * 24).toFixed(2)}px`;
        });
        // rows
        rows.forEach((r, i) => { const u = p3(t, rowT[i], rowT[i] + 0.45); r.style.opacity = (ML.lin(t, rowT[i], rowT[i] + 0.45) > 0 ? u : 0).toFixed(4); r.style.translate = `${((1 - u) * 40 * dir).toFixed(2)}px 0`; });
        // numbers count, or pop
        nums.forEach((x, i) => {
          const a = numT[i];
          if (x.n) {
            const u = p3(t, a, a + countD);
            const s = fmt(x.n, x.n.v * u);
            if (x.e.textContent !== s) x.e.textContent = s;
            x.e.style.opacity = (ML.lin(t, a - 0.05, a + 0.15) * (x.e === ctx.el ? 1 - leave : 1)).toFixed(4);
          } else {
            const u = ML.back(t, a, a + 0.4, 2.5);
            x.e.style.opacity = ML.lin(t, a, a + 0.15).toFixed(4);
            x.e.style.scale = t < a ? "0.6" : u === 1 ? "none" : (0.6 + 0.4 * u).toFixed(4);
          }
        });
        // pictures pop (never above their own size)
        imgs.forEach((e, i) => {
          const a = imgT[i], u = ML.back(t, a, a + 0.5, 1.8);
          e.style.opacity = ML.lin(t, a, a + 0.2).toFixed(4);
          e.style.scale = t < a ? "0.85" : u >= 1 && t > a + 0.5 ? "none" : Math.min(1, 0.85 + 0.15 * u).toFixed(4);
        });
        // button press-punch
        if (btn && Number.isFinite(T.btn)) {
          const d = t - T.btn;
          // down in 0.08 s, back in 0.22 s
          const press = d < 0 ? 0 : d < 0.08 ? ML.out(d, 0, 0.08) : 1 - ML.ease(d, 0.08, 0.3);
          btn.style.scale = press > 0 ? (1 - 0.08 * press).toFixed(4) : "none";
          btn.style.filter = d >= 0 && d < 0.35 ? `brightness(${(1 + 0.12 * (1 - d / 0.35)).toFixed(3)})` : "none";
        }
        // highlight: ring 1.04 → 1, the rest dims to 60 %
        if (ringEl) {
          const u = p3(t, T.hl, T.hl + 0.45);
          ringEl.style.opacity = (ML.lin(t, T.hl, T.hl + 0.3) * (1 - leave)).toFixed(4);
          ringEl.style.scale = (1.04 - 0.04 * u).toFixed(4);
        }
        if (hlDim && dimSet.length) {
          const d = 1 - 0.4 * ML.ease(t, T.hl, T.hl + 0.35);
          for (const e of dimSet) { const base = parseFloat(e.style.opacity || "1"); e.style.opacity = (base * d).toFixed(4); }
        }
        // state swap (crossfade 0.3 s)
        if (chip && chipAfter) { const u = ML.ease(t, T.swap, T.swap + 0.3); chip.style.opacity = (1 - u).toFixed(4); chipAfter.style.opacity = u.toFixed(4); }
      },
    };
  },
});
