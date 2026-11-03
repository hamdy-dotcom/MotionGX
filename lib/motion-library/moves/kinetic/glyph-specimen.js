// Glyph specimen ramp: a type-specimen layout. 2–5 giant light serif glyphs stand side by side, bottom-aligned, the
// first italic, each a step stronger (ink from alpha_start up to 100 %, doubling-style steps: 20 / 45 / 100), rising 40 px and fading in on a 0.15 s stagger
// (0.9 s power3.out); then the accent beat — the chosen glyph turns the accent colour and grows 1 → 1.05 in 0.5 s.
// Beside them, the big title word and a full character set in small tracked caps, fading in line by line. Glyphs come
// from the target's first word; Arabic shows its letters in their isolated forms (each stands alone, nothing torn
// from a joined word) and an Arabic character set without letter-spacing.
// Source: MengTo/Skills web-design/gsap-scrolltrigger-storytelling/demo/index.html — the typography specimen (MIT).
ML.define({
  id: "kinetic.glyph-specimen",
  category: "kinetic",
  name: "Glyph specimen ramp",
  does: "Giant letters stand side by side, each a step stronger, beside the title and a character set; then one turns the accent colour and grows slightly.",
  says: ["brand", "luxury", "story"],
  energy: 2,
  targets: ["headline", "word"],
  duration: [2, 5],
  params: {
    glyphs: { type: "number", range: [2, 5], default: 3 },
    accent_index: { type: "number", range: [0, 4], default: 2 },
    alpha_start: { type: "number", range: [0.1, 0.5], default: 0.2 },
    charset_panel: { type: "bool", default: true },
  },
  pairs: ["background.grain", "text-in.soft-rise"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "pop.soft",
  source: { from: "MengTo/Skills:web-design/gsap-scrolltrigger-storytelling/demo/index.html", license: "MIT" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    const k = stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1;
    const arabic = ML.ARABIC.test(text);
    const N = Math.round(ML.clamp(p.glyphs, 2, 5));
    // the glyphs: letters of the first word (Arabic letters stripped of marks, each shown isolated)
    const first = text.split(" ")[0];
    let pool = Array.from(first.replace(/[ً-ْٰـ]/g, "")).filter((c) => /[\p{L}\p{N}]/u.test(c));
    if (!pool.length) pool = ["A", "a"];
    const glyphs = Array.from({ length: N }, (_, i) => pool[i % pool.length]);
    if (!arabic) { glyphs[0] = glyphs[0].toUpperCase(); for (let i = 1; i < N; i++) glyphs[i] = glyphs[i].toLowerCase(); }
    const room = el.parentElement || el;
    const RW = room.clientWidth || ctx.f.W * 0.8, RH = Math.max(room.clientHeight || 0, ctx.f.H * 0.14);
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const wrap = document.createElement("div");
    Object.assign(wrap.style, { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4%", width: "100%", textAlign: "start" });
    // the side panel: title word + character set (left of the glyphs in LTR, right in RTL — DOM order follows dir)
    const panel = document.createElement("div");
    Object.assign(panel.style, { display: p.charset_panel ? "flex" : "none", flexDirection: "column", gap: "0.6em", flex: "0 0 34%", minWidth: "0", alignSelf: "flex-end" });
    const title = document.createElement("div");
    title.textContent = text;
    Object.assign(title.style, { font: "300 1em / 1 var(--x-serif-font)", letterSpacing: arabic ? "0" : "-0.02em", color: "var(--x-ink)", textWrap: "balance" });
    const sets = arabic ? ["ا ب ت ث ج ح خ", "د ذ ر ز س ش ص", "ض ط ظ ع غ ف ق", "ك ل م ن ه و ي", "٠١٢٣٤٥٦٧٨٩ ؟ ! ٪"] : ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "abcdefghijklm", "nopqrstuvwxyz", "0123456789!@#$%&"];
    const lines = sets.map((s) => {
      const d = document.createElement("div");
      d.textContent = s;
      Object.assign(d.style, { font: "300 0.34em / 1.35 var(--x-serif-font)", letterSpacing: arabic ? "0" : "0.22em", color: "color-mix(in srgb, var(--x-ink) 50%, transparent)", whiteSpace: "nowrap" });
      return d;
    });
    const charset = document.createElement("div");
    charset.append(...lines);
    panel.append(title, charset);
    const row = document.createElement("div");
    Object.assign(row.style, { display: "flex", alignItems: "flex-end", gap: "0.08em", flex: "0 0 auto" });
    const gEls = glyphs.map((g, i) => {
      const s = document.createElement("span");
      s.textContent = g;
      const a = Math.pow(p.alpha_start, 1 - i / (N - 1));
      Object.assign(s.style, { display: "inline-block", font: `${i === 0 && !arabic ? "italic " : ""}300 1em / 0.9 var(--x-serif-font)`, color: `color-mix(in srgb, var(--x-ink) ${(a * 100).toFixed(1)}%, transparent)`, transformOrigin: "50% 100%" });
      row.append(s);
      return { s, a };
    });
    wrap.append(panel, row);
    el.append(wrap);
    // sizes: the glyph row as tall as the band allows, everything within its width
    let G = Math.min(RH / 0.95, ctx.f.W * 0.3);
    const layout = () => { row.style.fontSize = G.toFixed(1) + "px"; panel.style.fontSize = (G * 0.3).toFixed(1) + "px"; };
    layout();
    // the glyphs keep to their column, so the panel never runs under them
    const rowRoom = RW * (p.charset_panel ? 0.62 : 1);
    for (let i = 0; i < 16 && row.getBoundingClientRect().width / k > rowRoom; i++) { G *= 0.92; layout(); }
    // the panel within its column and no taller than the glyphs
    for (let i = 0; i < 16 && p.charset_panel && (title.scrollWidth > panel.clientWidth + 1 || charset.scrollWidth > panel.clientWidth + 1 || panel.offsetHeight > G * 1.02); i++) panel.style.fontSize = (parseFloat(panel.style.fontSize) * 0.92).toFixed(1) + "px";
    const rise = G * 0.21; // 40 px at a 12 rem glyph
    const ai = Math.round(ML.clamp(p.accent_index, 0, N - 1));
    const beat = at + 0.15 * (N - 1) + 0.9;
    ctx.sfx(beat, "pop.soft", 0.3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.35)) / 0.3);
        el.style.opacity = (1 - leave).toFixed(4);
        gEls.forEach(({ s, a }, i) => {
          const u = ML.out(t, at + i * 0.15, at + i * 0.15 + 0.9);
          s.style.opacity = u.toFixed(4);
          s.style.translate = u < 1 ? `0 ${((1 - u) * rise).toFixed(2)}px` : "none";
          if (i === ai) {
            const b = ML.ease(t, beat, beat + 0.5);
            s.style.color = b > 0 ? `color-mix(in srgb, var(--x-accent) ${(b * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) ${(a * 100).toFixed(1)}%, transparent))` : `color-mix(in srgb, var(--x-ink) ${(a * 100).toFixed(1)}%, transparent)`;
            s.style.scale = b > 0 ? (1 + 0.05 * b).toFixed(4) : "none";
          }
        });
        const tu = ML.out(t, at + 0.2, at + 0.9);
        title.style.opacity = tu.toFixed(4);
        title.style.translate = `0 ${((1 - tu) * rise * 0.4).toFixed(2)}px`;
        lines.forEach((d, i) => { d.style.opacity = ML.ease(t, at + 0.45 + i * 0.12, at + 0.85 + i * 0.12).toFixed(4); });
      },
    };
  },
});
