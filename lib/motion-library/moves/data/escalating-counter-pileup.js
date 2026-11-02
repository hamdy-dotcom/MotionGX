// Escalating counter with a chip pile-up: a heavy number climbs in growing jumps (1, 2, 7, 23, 82 … 2,030: the target
// raised to k/N, one jump every 0.25 → 0.12 s, faster and faster) or counts continuously on a power2.in curve; each change
// gives it a small upward bump. Its caption "Another <word>." swaps the accent word with a 0.1 s crossfade per change,
// under a mono eyebrow ("API KEYS TO MANAGE"). Pain chips (dark rounded labels with a red dot: "429 · rate limited",
// "quota exceeded"…) fly in from the frame edges with a ±10° turn and a motion blur, more and more of them as the
// number grows (arrival times bunch toward the end), and pile up in bands along the frame edges, away from the number.
// On a number slot the slot itself counts (to its own figure unless `target` was set) and the eyebrow and caption sit
// on it without moving the layout; with no target the block is built in the picture region.
// Source: prompt-motion "0xfemyn-wtf-nah-opus-5-5" (reference only: rebuilt as our own code).
ML.define({
  id: "data.escalating-counter-pileup",
  category: "data",
  name: "Escalating counter with chip pile-up",
  does: "A number climbs in growing jumps while its caption word swaps and pain chips fly in and pile around it.",
  says: ["problem", "scale", "urgency"],
  energy: 4,
  targets: ["number", "label"],
  duration: [1.5, 3.5],
  params: {
    growth: { type: "choice", options: ["exponential", "linear"], default: "exponential" },
    target: { type: "number", range: [100, 100000], default: 2030 },
    chips: { type: "number", range: [4, 24], default: 12 },
    caption_swap: { type: "bool", default: true },
    eyebrow: { type: "text", default: "" },
    words: { type: "text", default: "" },
    chip_texts: { type: "text", default: "" },
  },
  pairs: ["data.odometer", "text-emphasis.accent-word"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:0xfemyn-wtf-nah-opus-5-5", license: "reference", note: "our own rebuild: seeded chip pile, closed-form jump schedule" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const host = ctx.scene || stage;
    const u = Math.min(f.W, f.H) / 1080;
    const list = (s) => String(s || "").split("|").map((x) => x.trim()).filter(Boolean);
    const fmt = (n) => Math.round(n).toLocaleString("en-US");

    // the figure: the slot's own number when it has one and `target` was left at its default
    const ownTxt = el ? String(el.textContent || "") : "";
    const own = parseFloat(ownTxt.replace(/[^\d.]/g, ""));
    const isNum = !!(el && el.childElementCount === 0 && Number.isFinite(own) && /\d/.test(ownTxt));
    const goal = Math.max(10, isNum && own > 1 && +p.target === 2030 ? own : +p.target || 2030);

    // the block: number + eyebrow + caption
    let num, block;
    if (isNum) {
      el.textContent = "";
      Object.assign(el.style, { position: "relative", fontVariantNumeric: "tabular-nums" });
      num = mk("span", "display:inline-block;direction:ltr;unicode-bidi:isolate;will-change:transform", el, ownTxt);
      if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
      block = el;
    } else {
      const bw = Math.min(f.pic.w, 1000 * u);
      block = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - bw) / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${bw}px;text-align:center;z-index:20;will-change:transform`, host);
      num = mk("div", `position:relative;font:800 ${Math.round(Math.min(220 * u, f.pic.h * 0.3))}px/1 var(--x-head-font);color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr;letter-spacing:var(--x-hero-track)`, block, fmt(goal));
      ML.fit(num, bw);
      if (el) el.style.opacity = "0";
    }
    const lab = (css) => mk("div", `position:absolute;${rtl ? "right" : "left"}:0;white-space:nowrap;direction:${rtl ? "rtl" : "ltr"};${css}`, block);
    const eyebrow = lab(`bottom:100%;margin-bottom:${4 * u}px;font:var(--x-label-weight) ${22 * u}px/1.2 var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim)`);
    eyebrow.textContent = p.eyebrow || (rtl ? "مفاتيح لازم تتابعها" : "API KEYS TO MANAGE");
    const caption = lab(`top:100%;margin-top:0;font:var(--x-sub-weight) ${Math.round((isNum ? 30 : 40) * u)}px/1.2 var(--x-body-font);color:var(--x-ink)`);
    if (!isNum) { for (const e of [eyebrow, caption]) { e.style.left = "50%"; e.style.right = "auto"; e.style.translate = "-50% 0"; } }
    const words = list(p.words).length ? list(p.words) : rtl ? ["مفتاح", "حساب", "توكن", "حدّ", "فاتورة", "لوحة", "سرّ", "خطة"] : ["key", "account", "token", "limit", "bill", "dashboard", "secret", "plan"];
    // each caption whole ("Another <word>." / "<word> كمان."), crossfaded: no gap where a shorter word sits
    caption.style.display = "grid";
    const wordEls = words.map((w) => {
      const line = mk("span", "grid-area:1/1;white-space:nowrap", caption);
      if (!rtl) line.append("Another ");
      mk("span", "color:var(--x-accent)", line, w);
      line.append(rtl ? " كمان." : ".");
      return line;
    });

    // the jumps: target^(k/N) on a quickening clock, or one continuous power2.in count
    const N = Math.max(6, Math.min(14, Math.round(Math.log10(goal) * 3)));
    const span = Math.max(0.9, end - at - 0.7);
    const gaps = Array.from({ length: N }, (_, k) => 0.25 - 0.13 * (k / (N - 1)));
    const sumG = gaps.reduce((a, b) => a + b, 0), kScale = Math.min(1, span / sumG);
    const jt = [at + 0.15]; for (let k = 1; k <= N; k++) jt.push(jt[k - 1] + gaps[k - 1] * kScale);
    const jv = Array.from({ length: N + 1 }, (_, k) => (k === 0 ? 1 : Math.max(k + 1, Math.round(Math.pow(goal, k / N)))));
    jv[N] = goal;
    const tEnd = jt[N];
    const valueAt = (t) => {
      if (p.growth === "linear") { const x = ML.lin(t, at + 0.15, tEnd); return Math.max(1, Math.round(goal * x * x)); }
      let k = 0; for (let i = 0; i <= N; i++) if (t >= jt[i]) k = i; return jv[k];
    };
    const changes = p.growth === "linear" ? Array.from({ length: 8 }, (_, i) => at + 0.15 + ((tEnd - at - 0.15) * (i + 1)) / 8) : jt.slice(1);
    changes.forEach((c, i) => { if (i % 2 === 1 || i === changes.length - 1) ctx.sfx(c, "hit", i === changes.length - 1 ? 0.5 : 0.25); });

    // the chips: flying in from the edges, piling in bands along them
    const texts = list(p.chip_texts).length ? list(p.chip_texts) : rtl
      ? ["429 · تجاوزت الحد", "الحصة خلصت", "المفتاح انتهى", "401 · غير مصرّح", "التوكن اتلغى", "تنبيه فاتورة", "انتهت المهلة", "503 · الخدمة واقفة"]
      : ["429 · rate limited", "quota exceeded", "key expired", "401 · unauthorized", "token revoked", "billing alert", "request timeout", "503 · unavailable"];
    const nc = Math.round(ML.clamp(p.chips, 4, 24));
    const fs = Math.round(24 * u), ch = fs * 2.2;
    const layer = mk("div", `position:absolute;inset:0;pointer-events:none;z-index:22;overflow:hidden;will-change:transform`, host);
    const keep = ctx.box(num); // the number stays clear
    const band = { top: f.wide ? [8 * u, 8 * u + ch] : [f.safe.y * 0.5, f.safe.y * 0.5 + ch * 1.9], bottom: [f.H - f.safe.y * 0.5 - ch * 1.9, f.H - f.safe.y * 0.5] };
    const per = { top: 0, bottom: 0, left: 0, right: 0 };
    const chips = Array.from({ length: nc }, (_, i) => {
      const e = mk("div", `position:absolute;left:0;top:0;display:flex;align-items:center;gap:${10 * u}px;padding:${10 * u}px ${18 * u}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ink) 94%, var(--x-ground));color:var(--x-ground);font:500 ${fs}px/1 var(--x-mono-font);white-space:nowrap;box-shadow:var(--x-shadow)`, layer);
      mk("i", `width:${10 * u}px;height:${10 * u}px;border-radius:50%;background:var(--x-bad);flex:none`, e);
      mk("span", "", e, texts[i % texts.length]);
      const w = e.offsetWidth, h = e.offsetHeight;
      const sides = f.wide ? ["left", "right", "bottom", "left", "right", "top"] : ["top", "bottom", "left", "right"];
      const side = sides[i % sides.length];
      const k = per[side]++;
      let x, y;
      if (side === "top" || side === "bottom") {
        x = f.m * 0.5 + ML.rnd(i, 3) * Math.max(0, f.W - f.m - w);
        const [a, b] = band[side]; y = a + ((k % 2) * (b - a - h)) + ML.rnd(i, 4) * 6 * u;
      } else {
        const sideX = side === "left" ? f.m * 0.25 : f.W - f.m * 0.25 - w;
        x = sideX + (ML.rnd(i, 5) - 0.5) * 40 * u;
        y = band.top[1] + ML.rnd(i, 6) * Math.max(0, band.bottom[0] - band.top[1] - h);
        // keep clear of the number
        if (x < keep.x + keep.w && x + w > keep.x && y < keep.y + keep.h + 60 * u && y + h > keep.y - 60 * u) y = y < keep.y ? keep.y - 70 * u - h : keep.y + keep.h + 70 * u;
      }
      x = ML.clamp(x, 4, f.W - w - 4); y = ML.clamp(y, 4, f.H - h - 4);
      const out = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
      const fly = Math.max(f.W, f.H) * 0.45;
      const rot = (ML.rnd(i, 7) - 0.5) * 20;
      const ti = at + 0.2 + (tEnd + 0.1 - at - 0.2) * Math.sqrt((i + 0.5) / nc);
      return { e, x, y, dx: out[0] * fly, dy: out[1] * fly, rot, rot0: rot + (ML.rnd(i, 8) - 0.5) * 50, ti };
    });
    chips.forEach((c, i) => i % 4 === 2 && ctx.sfx(c.ti + 0.3, "pop.soft", 0.2));

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at, at + 0.25);
        const v = t < at ? (isNum ? own : 1) : valueAt(t);
        num.textContent = t < at && isNum ? ownTxt : fmt(v);
        // the bump: on the latest change
        let last = -1; for (const c of changes) if (t >= c) last = c;
        const b = last > 0 ? ML.pulse(t, last + 0.03, 0.02, 0.09) : 0;
        num.style.translate = `0 ${(-b * 10 * u).toFixed(2)}px`;
        for (const e of [eyebrow, caption]) e.style.opacity = (enter * (1 - leave)).toFixed(4);
        if (!isNum) block.style.opacity = (enter * (1 - leave)).toFixed(4);
        else el.style.opacity = (1 - leave).toFixed(4);
        // the caption word: one per change, crossfading 0.1 s
        let wi = 0, wt = -1; changes.forEach((c, i) => { if (t >= c) { wi = i + 1; wt = c; } });
        const cur = p.caption_swap ? wi % words.length : 0, prev = p.caption_swap ? (wi - 1 + words.length) % words.length : 0;
        const x = p.caption_swap && wt > 0 ? ML.clamp((t - wt) / 0.1) : 1;
        wordEls.forEach((e, i) => { e.style.opacity = (i === cur ? x : i === prev && x < 1 ? 1 - x : 0).toFixed(3); });
        // the chips
        layer.style.opacity = (1 - leave).toFixed(4);
        for (const c of chips) {
          const q = ML.expo(t, c.ti, c.ti + 0.38);
          if (t < c.ti) { c.e.style.visibility = "hidden"; c.e.style.transform = "none"; c.e.style.filter = "none"; continue; }
          c.e.style.visibility = "visible";
          const px = c.x + c.dx * (1 - q), py = c.y + c.dy * (1 - q), r = c.rot0 + (c.rot - c.rot0) * q;
          c.e.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
          const bl = (1 - q) * 10 * u;
          c.e.style.filter = bl > 0.2 ? `blur(${bl.toFixed(2)}px)` : "none";
        }
      },
    };
  },
});
