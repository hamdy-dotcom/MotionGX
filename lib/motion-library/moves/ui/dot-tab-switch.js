// Dot tab switch: a row of small uppercase tabs, each led by a tiny dot. The active tab's dot and text turn bright
// (ink) while the rest stay dim; on a switch the old tab fades back to dim over 0.3 s and the new dot scales 0.6 → 1
// and brightens on power2.out (the source's transition-colors 300ms, re-timed onto one clock). Tabs gap ≈ 1.8 em,
// light uppercase label type tracked 0.2 em. The row is built from the target's own items when it has some (a list),
// else from the target's text plus the `labels` given. Reading order follows the page (RTL switches right → left).
// Source: MengTo/Skills web-design/technical-wireframe-info-layout demo (MIT).
ML.define({
  id: "ui.dot-tab-switch",
  category: "ui",
  name: "Dot tab switch",
  does: "Small uppercase tabs each with a tiny dot; the active tab's dot and text turn bright while the others stay dim, and the bright one steps along.",
  says: ["choice", "tech"],
  energy: 1,
  targets: ["label", "list"],
  duration: [0.5, 5],
  params: {
    tabs: { type: "number", range: [2, 4], default: 3 },
    dot: { type: "choice", options: ["round", "square"], default: "round" },
    labels: { type: "text" },
    cycle: { type: "bool", default: true },
    every: { type: "number", range: [0.5, 2], default: 0.9, unit: "s" },
    accent_dot: { type: "bool", default: false },
  },
  pairs: ["ui.cursor-free-path", "text-in.fade-up"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/technical-wireframe-info-layout", license: "MIT", note: "demo/index.html (base64 srcdoc): tab row with dot + transition-colors 300ms" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const doc = document;
    const want = Math.round(ML.clamp(p.tabs, 2, 4));
    const fallback = rtl ? ["نظرة عامة", "المواصفات", "الأسعار", "الدعم"] : ["Overview", "Specs", "Pricing", "Support"];
    const given = String(p.labels || "").split(/[,،|]/).map((s) => s.trim()).filter(Boolean);
    const kids = [...el.children].filter((c) => (c.textContent || "").trim());
    let names;
    if (kids.length >= 2) names = kids.slice(0, want).map((c) => c.textContent.trim());
    else { const own = (el.textContent || "").trim(); names = [own || fallback[0], ...given, ...fallback.filter((x) => x !== own)].slice(0, want); }
    const n = names.length; // a list with fewer items than `tabs` cycles through what it has

    // the row: rebuilt inside the target, sized from the target's own type
    const size = parseFloat(getComputedStyle(el).fontSize) || 22;
    el.textContent = "";
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.justifyContent = getComputedStyle(el.closest(".ml-head") || el).textAlign === "center" ? "center" : "flex-start";
    el.style.alignItems = "center";
    el.style.gap = `${(size * 0.6).toFixed(1)}px ${(size * 1.8).toFixed(1)}px`;
    const D = Math.max(4, size * 0.3);
    const tabs = names.map((name) => {
      const tab = doc.createElement("span");
      tab.style.cssText = `display:inline-flex;align-items:center;gap:${(size * 0.5).toFixed(1)}px;font-family:${ML.ARABIC.test(name) ? "var(--x-body-font)" : "var(--x-label-font)"};font-weight:400;font-size:${size.toFixed(1)}px;letter-spacing:${ML.ARABIC.test(name) ? 0 : "0.2em"};text-transform:uppercase;white-space:nowrap;`;
      const dot = doc.createElement("i");
      dot.style.cssText = `display:inline-block;flex:none;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;border-radius:${p.dot === "square" ? (D * 0.18).toFixed(1) + "px" : "50%"};`;
      const txt = doc.createElement("span");
      txt.textContent = name;
      tab.append(dot, txt);
      el.append(tab);
      return { tab, dot, txt };
    });

    // the switches: from tab 0 to the next at `at`, then (cycle) one step every `every` seconds until the end
    const first = at + 0.15, times = [first];
    if (p.cycle) for (let s = first + p.every; s < end - 0.35; s += p.every) times.push(s);
    times.forEach((s) => ctx.sfx(s, "tap", 0.22));
    const lit = p.accent_dot ? "var(--x-accent)" : "var(--x-ink)";
    const pw2 = (t, a, b) => { const x = ML.lin(t, a, b); return 1 - (1 - x) * (1 - x); }; // power2.out

    return {
      draw(t) {
        // which switch we're in: k = number of switches started
        let k = 0;
        for (const s of times) if (t >= s) k++;
        const cur = k % n, prev = (k - 1 + n) % n, s0 = k ? times[k - 1] : -1;
        const u = k ? pw2(t, s0, s0 + 0.3) : 1;
        tabs.forEach((x, i) => {
          let b = i === cur ? u : 0, sc = 1;
          if (k && i === prev && prev !== cur) b = 1 - u;
          if (k && i === cur) sc = 0.6 + 0.4 * u;
          const pct = (b * 100).toFixed(1);
          x.txt.style.color = `color-mix(in srgb, var(--x-ink) ${pct}%, var(--x-dim))`;
          x.dot.style.background = `color-mix(in srgb, ${lit} ${pct}%, color-mix(in srgb, var(--x-dim) 45%, transparent))`;
          x.dot.style.scale = sc === 1 ? "none" : sc.toFixed(4);
        });
      },
    };
  },
});
