// Segmented control: sliding capsule. A pill-shaped track (inline-flex, 4–6 px padding, full radius) holds the options;
// an absolutely positioned capsule behind the labels travels to the next option (x / width, 0.4 s power3.inOut) while
// the labels cross colour in 0.2 s, on each spoken option or on a steady beat. Styles, rebuilt on the look's colours:
// recessed-dark (MengTo high-contrast-skeuomorphic nav: dark well with an inset shadow, a raised gradient capsule with
// a top highlight), glass (mesh-gradient dark blue: a translucent track with a gradient hairline edge), black-pill
// (product-proof / progressive-blur category tabs: ink capsule on an ink-5 % track, small semibold uppercase), accent-
// stretch (accent capsule on back.out(1.4) that stretches 1.15× while it travels; the track fades / scales in) and
// underline. With content_swap a panel below crossfades its content (y 8 px, 0.42 s) as the option changes.
// The options are the target's own items (a list) or its words; otherwise defaults. RTL lays the options right → left.
// Sources: MengTo/Skills web-design/high-contrast-skeuomorphic-clean, mesh-gradient-dark-blue-clean, progressive-blur,
// product-proof-saas (MIT); prompt-motion thilina "i also tried it" (reference).
ML.define({
  id: "ui.segmented-slide",
  category: "ui",
  name: "Segmented control: sliding capsule",
  does: "In a pill-shaped tab bar or segmented toggle, the highlighted capsule slides from one option to the next while labels swap colour (and the content below can swap).",
  says: ["choice", "precision", "simplicity", "tech", "step", "list", "change"],
  energy: 2,
  targets: ["list", "screen", "label"],
  duration: [0.4, 3],
  params: {
    tabs: { type: "number", range: [2, 6], default: 3 },
    style: { type: "choice", options: ["recessed-dark", "glass", "black-pill", "accent-stretch", "underline"], default: "black-pill" },
    content_swap: { type: "bool", default: false },
    stretch: { type: "bool", default: false },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    labels: { type: "text" },
    every: { type: "number", range: [0.5, 1.5], default: 0.8, unit: "s" },
  },
  pairs: ["ui.dot-tab-switch", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/high-contrast-skeuomorphic-clean", license: "MIT", note: "nav capsule; plus mesh-gradient-dark-blue-clean, progressive-blur category tabs, product-proof-saas; accent stretch rebuilt from prompt-motion thilina (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;

    // the options
    const n0 = Math.round(ML.clamp(p.tabs, 2, 6));
    const fallback = rtl ? ["تلقائي", "فاتح", "داكن", "شهري", "سنوي", "الكل"] : ["Auto", "Light", "Dark", "Monthly", "Yearly", "All"];
    const given = String(p.labels || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    const kids = el ? [...el.children].filter((c) => (c.textContent || "").trim()) : [];
    let names;
    if (given.length >= 2) names = given.slice(0, 6);
    else if (kids.length >= 2) names = kids.slice(0, 6).map((c) => c.textContent.trim());
    else { const own = el ? (el.textContent || "").trim().split(/\s+/).filter(Boolean) : []; names = own.length >= 2 && own.length <= 6 ? own : fallback.slice(0, n0); }

    // the host
    let host, R;
    if (el) {
      const h0 = el.offsetHeight;
      el.textContent = "";
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.display = "flex"; el.style.flexDirection = "column"; el.style.alignItems = "center"; el.style.minHeight = h0 + "px";
      host = el; R = { w: el.clientWidth || f.pic.w };
    } else {
      host = mk("div", `position:absolute;left:${f.pic.x}px;top:${(f.pic.y + f.pic.h * 0.3).toFixed(1)}px;width:${f.pic.w}px;display:flex;flex-direction:column;align-items:center;z-index:6;pointer-events:none;`, ctx.scene || ctx.stage);
      R = { w: f.pic.w };
    }

    // the look of each style, from the look's colours only
    const dark = p.theme === "dark", S = p.style;
    const ink = dark ? "var(--x-panel)" : "var(--x-ink)", paper = dark ? "var(--x-ink)" : "var(--x-panel)";
    const well = "color-mix(in srgb, var(--x-ink) 94%, black)", raise1 = "color-mix(in srgb, var(--x-ink) 78%, var(--x-panel))", raise2 = "color-mix(in srgb, var(--x-ink) 88%, var(--x-panel))";
    const look = {
      "recessed-dark": { track: `background:${well};box-shadow:0 0 0 ${Math.max(1, k).toFixed(1)}px ${raise1}, inset 0 ${(2 * k).toFixed(1)}px ${(6 * k).toFixed(1)}px rgba(0,0,0,.6);`, cap: `background:linear-gradient(180deg, ${raise1}, ${raise2});box-shadow:inset 0 ${Math.max(1, k).toFixed(1)}px 0 color-mix(in srgb, var(--x-panel) 10%, transparent), 0 ${(2 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px rgba(0,0,0,.4);`, on: "var(--x-panel)", off: "color-mix(in srgb, var(--x-panel) 55%, transparent)", weight: 300, upper: false },
      glass: { track: `border:${Math.max(1, k).toFixed(1)}px solid transparent;background:linear-gradient(color-mix(in srgb, var(--x-ink) 78%, transparent), color-mix(in srgb, var(--x-ink) 78%, transparent)) padding-box, linear-gradient(120deg, color-mix(in srgb, var(--x-panel) 28%, transparent), color-mix(in srgb, var(--x-accent) 16%, transparent), color-mix(in srgb, var(--x-panel) 4%, transparent)) border-box;`, cap: "background:color-mix(in srgb, var(--x-panel) 10%, transparent);", on: "var(--x-panel)", off: "color-mix(in srgb, var(--x-panel) 62%, var(--x-accent) 10%)", weight: 500, upper: false },
      "black-pill": { track: `background:color-mix(in srgb, ${ink} 6%, transparent);`, cap: `background:${ink};box-shadow:0 1px 2px rgba(0,0,0,.08);`, on: paper, off: ink, weight: 600, upper: true },
      "accent-stretch": { track: `background:color-mix(in srgb, ${ink} 6%, ${paper});box-shadow:var(--x-shadow);`, cap: "background:var(--x-accent);", on: "var(--x-accent-ink)", off: ink, weight: 600, upper: false },
      underline: { track: "background:transparent;", cap: "background:var(--x-accent);", on: ink, off: dark ? "color-mix(in srgb, var(--x-panel) 55%, transparent)" : "var(--x-dim)", weight: 600, upper: true },
    }[S] || null;
    const L = look || { track: "", cap: "", on: paper, off: ink, weight: 600, upper: true };

    // the track and its options
    let fs = (L.upper ? 24 : 30) * k;
    const pad = (S === "underline" ? 0 : 6 * k);
    const track = mk("div", `position:relative;display:inline-flex;align-items:center;gap:${(S === "underline" ? 24 * k : 4 * k).toFixed(1)}px;padding:${pad.toFixed(1)}px;border-radius:var(--x-radius-s);${L.track}`, host);
    track.dir = rtl ? "rtl" : "ltr";
    const cap = mk("div", `position:absolute;left:0;top:${S === "underline" ? "auto" : pad.toFixed(1) + "px"};${S === "underline" ? `bottom:0;height:${Math.max(2, 3 * k).toFixed(1)}px;` : `bottom:${pad.toFixed(1)}px;`}border-radius:var(--x-radius-s);${L.cap}z-index:0;transform-origin:50% 50%;`, track);
    const labelFont = rtl || !L.upper ? "var(--x-body-font)" : "var(--x-label-font)";
    const opts = names.map((name) => mk("div", `position:relative;z-index:1;white-space:nowrap;padding:${(S === "underline" ? 14 * k : 16 * k).toFixed(1)}px ${(S === "underline" ? 4 * k : 30 * k).toFixed(1)}px;font:${L.weight} ${fs.toFixed(1)}px ${labelFont};letter-spacing:${L.upper && !rtl ? "0.06em" : "0"};text-transform:${L.upper && !rtl ? "uppercase" : "none"};`, track, name));
    // never wider than its room
    const tw = track.offsetWidth, room = R.w * 0.98;
    if (tw > room) { const s = room / tw; fs *= s; opts.forEach((o) => { o.style.fontSize = fs.toFixed(1) + "px"; o.style.paddingLeft = o.style.paddingRight = (parseFloat(o.style.paddingLeft) * s).toFixed(1) + "px"; }); }
    // the options' boxes are read each frame (layout only, never our transforms): web fonts may land after setup
    const slotsNow = () => opts.map((o) => ({ x: o.offsetLeft, w: o.offsetWidth }));

    // content below (optional): one card per option, crossfading
    let panes = [];
    if (p.content_swap) {
      const box = mk("div", `position:relative;margin-top:${(26 * k).toFixed(1)}px;width:${Math.min(R.w, Math.max(track.offsetWidth, 560 * k)).toFixed(1)}px;height:${(170 * k).toFixed(1)}px;`, host);
      box.dir = rtl ? "rtl" : "ltr";
      panes = names.map((name, i) => {
        const c = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${(24 * k).toFixed(1)}px ${(28 * k).toFixed(1)}px;background:${paper};color:${ink};border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.6);box-shadow:var(--x-shadow);display:flex;flex-direction:column;gap:${(14 * k).toFixed(1)}px;`, box);
        mk("div", `font:var(--x-head-weight) ${(34 * k).toFixed(1)}px var(--x-head-font);`, c, name);
        for (let j = 0; j < 2; j++) mk("div", `height:${(12 * k).toFixed(1)}px;width:${(45 + ML.rnd(i, j + 3) * 45).toFixed(0)}%;border-radius:99px;background:color-mix(in srgb, ${ink} ${j ? 12 : 22}%, transparent);`, c);
        return c;
      });
    }

    // the switches: each option on its spoken word if heard, else a steady beat from `at`
    const N = names.length, steps = [];
    let tt = at + 0.35;
    const every = ML.clamp(p.every, 0.5, 1.5);
    for (let i = 1; i < N; i++) {
      const fb = tt + (i - 1) * every;
      let s = ctx.word(names[i], fb);
      if (s === fb || s < at + 0.2) s = fb;
      steps.push(Math.min(s, end - 0.6));
    }
    if (N === 2 && end - at > 2.2) steps.push(steps[0] + every); // a two-way toggle flips back
    for (let i = 1; i < steps.length; i++) steps[i] = Math.max(steps[i], steps[i - 1] + 0.45);
    const order = steps.map((_, i) => (i + 1) % N);
    steps.forEach((s) => ctx.sfx(s, "tap", 0.24));
    const dur = 0.4, stretchy = p.stretch || S === "accent-stretch";
    const curve = (t, a) => (S === "accent-stretch" ? ML.back(t, a, a + dur + 0.05, 1.4) : ML.ease(t, a, a + dur));

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const u = ML.out(t, at, at + 0.3);
        track.style.opacity = (t < at ? 0 : u * (1 - leave)).toFixed(4);
        track.style.scale = S === "accent-stretch" ? (0.94 + 0.06 * u).toFixed(4) : "none";
        // which option, and how far through the travel
        let cur = 0, prev = 0, s0 = -1;
        steps.forEach((s, i) => { if (t >= s) { prev = cur; cur = order[i]; s0 = s; } });
        const slot = slotsNow(), g = s0 < 0 ? 1 : curve(t, s0), a = slot[prev], b = slot[cur];
        const x = a.x + (b.x - a.x) * g, w = a.w + (b.w - a.w) * g;
        const travel = s0 < 0 ? 0 : Math.sin(Math.PI * ML.lin(t, s0, s0 + dur));
        cap.style.translate = `${x.toFixed(2)}px 0`;
        cap.style.width = `${w.toFixed(2)}px`;
        cap.style.scale = stretchy && travel > 0.001 ? `${(1 + 0.15 * travel).toFixed(4)} 1` : "none";
        const cx = s0 < 0 ? 1 : ML.lin(t, s0 + 0.1, s0 + 0.3);
        opts.forEach((o, i) => {
          const on = i === cur ? cx : i === prev && s0 >= 0 ? 1 - cx : 0;
          o.style.color = `color-mix(in srgb, ${L.on} ${(on * 100).toFixed(1)}%, ${L.off})`;
        });
        panes.forEach((c, i) => {
          const q = s0 < 0 ? 1 : ML.out(t, s0, s0 + 0.42);
          const v = i === cur ? q : i === prev && s0 >= 0 ? 1 - q : 0;
          c.style.opacity = (v * u * (1 - leave)).toFixed(4);
          c.style.translate = `0 ${(i === cur ? (1 - q) * 8 * k : -(1 - v) * 8 * k).toFixed(2)}px`;
        });
      },
    };
  },
});
