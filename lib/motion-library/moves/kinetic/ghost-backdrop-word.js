// Ghost backdrop word drift: behind the content, a giant pale serif word naming the chapter slides slowly sideways
// and swaps to the next chapter's word at each beat. Ported from MengTo/Skills scroll-world-storytelling's .words /
// .word band: absolute at the bottom 24 % of the stage, overflow hidden, nowrap, opacity .055 (.10 on brutal looks),
// serif 17vw (key number up to 30vw), line-height .75, letter-spacing −.08em, x = 13% − p·18% of its own width where p
// is the run's progress (linear); only the active chapter's word shows, swapping by a 0.3 s crossfade (the demo
// toggled it on scroll). RTL anchors right and drifts right. Texture echoing the eyebrow, never information.
// Source: MengTo/Skills web-design/scroll-world-storytelling/demo/html-data/index.html (MIT).
ML.define({
  id: "kinetic.ghost-backdrop-word",
  category: "kinetic",
  name: "Ghost backdrop word drift",
  does: "Behind the content a giant pale word naming the chapter slides slowly sideways and swaps to the next chapter's word at each beat.",
  says: ["story", "ambient", "brand"],
  energy: 1,
  targets: ["word", "stage"],
  duration: [3, 60],
  params: {
    drift: { type: "choice", options: ["left", "right", "none"], default: "left" },
    opacity: { type: "number", range: [0.05, 0.1], default: 0.055 },
    content: { type: "choice", options: ["chapter-name", "key-number"], default: "chapter-name" },
    size: { type: "number", range: [12, 30], default: 17, unit: "vw" },
    words: { type: "text", default: "" },
  },
  pairs: ["background.grain", "camera.slow-push"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/scroll-world-storytelling/demo/html-data/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, stage, f, rtl } = ctx;
    const host = ctx.scene || stage;
    // the chapter words: given, else the target's words, else the scene's headline
    let src = (p.words || "").trim();
    if (!src) {
      const from = el && el !== stage ? el : host.querySelector('[data-slot="headline"], [data-slot-sample="headline"], .ml-title, [data-slot]');
      src = ((from && from.textContent) || "").trim();
    }
    if (!src) return null;
    // given words are a comma list; a sentence gives its words, without the punctuation stuck to them
    const given = (p.words || "").trim() !== "";
    const bare = (s) => s.trim().replace(/^[.,،؛؟?!…:«»"'()]+|[.,،؛؟?!…:«»"'()]+$/g, "");
    let names = (given && /[,،]/.test(src) ? src.split(/[,،]/) : src.split(/\s+/)).map(bare).filter(Boolean);
    if (p.content === "key-number") {
      const nums = src.match(/[\d٠-٩][\d٠-٩.,٫٬%]*/g);
      names = nums && nums.length ? nums.map(bare) : names.slice(0, 1);
    }
    const n = names.length;
    if (!n) return null;
    const seen = {};
    const span = Math.max(0.3, (end - at) / n);
    const times = names.map((w, i) => { const key = ML.plain(w); seen[key] = (seen[key] || 0) + 1; return i === 0 ? at : Math.max(at, ctx.word(w, at + i * span, seen[key])); });
    for (let i = 1; i < n; i++) times[i] = Math.max(times[i], times[i - 1] + 0.4);
    const band = document.createElement("div");
    band.setAttribute("aria-hidden", "true");
    Object.assign(band.style, { position: "absolute", left: "0", right: "0", bottom: "24%", overflow: "hidden", whiteSpace: "nowrap", pointerEvents: "none", color: "var(--x-ink)", direction: rtl ? "rtl" : "ltr" });
    host.insertBefore(band, host.firstChild); // behind every slot
    const vw = Math.min(30, Math.max(12, p.content === "key-number" ? p.size * 1.5 : p.size));
    const size = Math.max(100, Math.min(260 * (f.W / 1080) * (p.content === "key-number" ? 1.6 : 1), (vw / 100) * f.W));
    const els = names.map((w) => {
      const s = document.createElement("span");
      s.textContent = w;
      const ar = ML.ARABIC.test(w);
      Object.assign(s.style, { display: "block", font: `400 ${size.toFixed(1)}px / .75 var(--x-serif-font)`, letterSpacing: ar ? "0" : "-.08em", paddingBlock: ar ? "0.12em" : "0.04em" });
      band.append(s);
      return s;
    });
    // all words stacked in one grid cell so a crossfade never reflows the band
    Object.assign(band.style, { display: "grid" });
    els.forEach((s) => { s.style.gridArea = "1 / 1"; });
    const dir = p.drift === "none" ? 0 : (p.drift === "left" ? -1 : 1) * (rtl ? -1 : 1);
    const anchor = rtl ? -1 : 1;
    return {
      draw(t) {
        const life = ML.ease(t, at, at + 0.6) * (1 - ML.ease(t, end - 0.5, end));
        band.style.opacity = (life * ML.clamp(p.opacity, 0.03, 0.12)).toFixed(4);
        band.style.visibility = life > 0 ? "visible" : "hidden";
        const prog = ML.lin(t, at, end);
        const x = p.drift === "none" ? anchor * 4 : anchor * 13 + dir * prog * 18;
        els.forEach((s, i) => {
          const fadeIn = i === 0 ? 1 : ML.lin(t, times[i] - 0.15, times[i] + 0.15);
          const fadeOut = i + 1 < n ? 1 - ML.lin(t, times[i + 1] - 0.15, times[i + 1] + 0.15) : 1;
          const a = fadeIn * fadeOut;
          s.style.opacity = a.toFixed(4);
          s.style.transform = `translateX(${x.toFixed(3)}%)`;
        });
      },
    };
  },
});
