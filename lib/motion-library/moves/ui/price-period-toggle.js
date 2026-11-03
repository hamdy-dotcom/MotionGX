// Monthly / annual price toggle. A pricing grid (columns split by hairlines, caps plan name, big tight price; the featured
// plan on a 160° accent-tinted gradient) with a billing switch: the knob slides over 0.28 s power2.inOut, then every price
// changes — roll: per digit in a mask, old y 0 → −100%, new 100% → 0, 0.45 s power3.inOut, digits 0.03 s apart from the
// right, columns 0.06 s apart, currency static; count: a 0.6 s numeric tween; crossfade: 0.35 s; instant: a cut. The
// featured plan flashes a ring, a "Save 17%" chip pops by the switch (scale 0.6 → 1, back.out(2), 0.3 s), and the old
// price can stay as a struck ghost (opacity 0.4, the strike draws 0.25 s). Elements with data-monthly / data-annual inside
// a card target are used as they are; a number or label target is one price (its annual computed from `discount`), with
// the switch built above it. Digits stay left to right in Arabic; the switch and the layout mirror.
// Sources: MengTo/Skills web-design/pricing-page SKILL.md + demo, animation-on-scroll, landing-page, tailwindcss (MIT).
ML.define({
  id: "ui.price-period-toggle",
  category: "ui",
  name: "Monthly / annual price toggle",
  does: "A billing toggle flips from monthly to annual and every plan's big price rolls to its new value.",
  says: ["money", "choice", "change"],
  energy: 3,
  targets: ["card", "number", "label"],
  duration: [0.6, 1.5],
  params: {
    swap: { type: "choice", options: ["roll", "crossfade", "count", "instant"], default: "roll" },
    plans: { type: "number", range: [2, 4], default: 3 },
    highlight_featured: { type: "bool", default: true },
    save_chip: { type: "bool", default: true },
    direction: { type: "choice", options: ["monthly-to-annual", "annual-to-monthly"], default: "monthly-to-annual" },
    ghost: { type: "bool", default: false },
    discount: { type: "number", range: [5, 40], default: 17, unit: "%" },
    prices: { type: "text" },
    names: { type: "text" },
    currency: { type: "text" },
  },
  pairs: ["ui.cursor-glide-click", "data.odometer"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/pricing-page", license: "MIT", note: "SKILL.md toggle and per-digit roll; grid from landing-page, animation-on-scroll and tailwindcss demos (MIT)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, host = ctx.scene || stage, k = Math.min(f.W, f.H) / 1080;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const dir = rtl ? -1 : 1, toAnnual = p.direction !== "annual-to-monthly";
    const T = { m: rtl ? "شهري" : "Monthly", a: rtl ? "سنوي" : "Annual", save: rtl ? `وفّر ${p.discount}%` : `Save ${p.discount}%`, per: rtl ? "في الشهر" : "per month" };

    // ── a price as text ↔ number, keeping its numeral system, separators and what sits around it ──
    const AR = "٠١٢٣٤٥٦٧٨٩", toLatin = (s) => s.replace(/[٠-٩]/g, (d) => AR.indexOf(d)).replace(/٬/g, ",").replace(/٫/g, ".");
    const parse = (s) => {
      const m = String(s).match(/^(\D*?)([\d٠-٩][\d٠-٩,٬.٫]*)(.*)$/s);
      return m ? { pre: m[1], num: m[2], post: m[3], arabicDigits: /[٠-٩]/.test(m[2]) } : null;
    };
    const fmt = (v, like) => {
      const s = Math.round(v).toLocaleString("en-US");
      return like.arabicDigits ? s.replace(/\d/g, (d) => AR[d]).replace(/,/g, "٬") : s;
    };
    const value = (x) => parseFloat(toLatin(x.num).replace(/,/g, ""));
    const annualOf = (x) => fmt(value(x) * (1 - p.discount / 100), x);

    // ── one price's change, in place ──
    function makeSwap(holder, fromTxt, toTxt, like) {
      holder.replaceChildren();
      holder.style.display = "inline-flex"; holder.style.direction = "ltr"; holder.style.position = "relative"; holder.style.fontVariantNumeric = "tabular-nums"; holder.style.whiteSpace = "pre";
      if (p.swap === "roll") {
        const a = Array.from(fromTxt), b = Array.from(toTxt), n = Math.max(a.length, b.length);
        while (a.length < n) a.unshift(""); while (b.length < n) b.unshift("");
        const probe = mk("position:absolute;visibility:hidden;", holder);
        const widthOf = (c) => { if (!c) return 0; probe.textContent = c; return probe.getBoundingClientRect().width / (stage.getBoundingClientRect().width / (stage.offsetWidth || 1) || 1); };
        const slots = a.map((c, i) => {
          const same = c === b[i];
          const s = mk("position:relative;display:inline-block;height:1.15em;line-height:1.15em;clip-path:inset(0 -0.2em);", holder);
          const o = mk("position:absolute;inset:0 auto auto 0;", s, c), w = mk("position:absolute;inset:0 auto auto 0;", s, b[i]);
          return { s, o, w, same, wa: widthOf(c), wb: widthOf(b[i]), from: n - 1 - i };
        });
        probe.remove();
        return (t, t0) => slots.forEach((q) => {
          const a0 = t0 + q.from * 0.03, x = ML.lin(t, a0, a0 + 0.45);
          const u = x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
          q.s.style.width = `${(q.wa + (q.wb - q.wa) * u).toFixed(2)}px`;
          q.o.style.translate = `0 ${(q.same ? 0 : -u * 100).toFixed(2)}%`;
          q.w.style.translate = `0 ${(q.same ? 0 : (1 - u) * 100).toFixed(2)}%`;
          q.w.style.visibility = q.same ? "hidden" : "visible";
        });
      }
      if (p.swap === "count") {
        const fx = parse(fromTxt), tx = parse(toTxt), v0 = fx ? value(fx) : 0, v1 = tx ? value(tx) : 0;
        return (t, t0) => { const u = ML.out(t, t0, t0 + 0.6); holder.textContent = fmt(v0 + (v1 - v0) * u, like); };
      }
      const o = mk("", holder, fromTxt), w = mk("position:absolute;inset:0 auto auto 0;", holder, toTxt);
      const grow = fromTxt.length < toTxt.length;
      if (grow) { o.style.position = "absolute"; o.style.inset = "0 auto auto 0"; w.style.position = "static"; }
      return (t, t0) => {
        const u = p.swap === "instant" ? (t >= t0 ? 1 : 0) : ML.ease(t, t0, t0 + 0.35);
        o.style.opacity = (1 - u).toFixed(4); w.style.opacity = u.toFixed(4);
      };
    }

    // ── the switch ──
    function makeToggle(parent, u) {
      const row = mk(`position:relative;align-self:center;display:flex;align-items:center;justify-content:center;gap:${(12 * u).toFixed(1)}px;padding:${(7 * u).toFixed(1)}px ${(14 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);font:600 ${(16 * u).toFixed(1)}px/1.2 var(--x-body-font);white-space:nowrap;`, parent);
      const mL = mk("", row, T.m), W = 54 * u, H = 28 * u, pad = 3 * u, K = H - pad * 2;
      const track = mk(`position:relative;flex:none;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;border-radius:var(--x-radius-s);`, row);
      const knob = mk(`position:absolute;top:${pad.toFixed(1)}px;${rtl ? "right" : "left"}:${pad.toFixed(1)}px;width:${K.toFixed(1)}px;height:${K.toFixed(1)}px;border-radius:50%;background:var(--x-accent-ink);box-shadow:0 ${(1 * u).toFixed(1)}px ${(3 * u).toFixed(1)}px color-mix(in srgb, var(--x-device) 35%, transparent);`, track);
      const aL = mk("", row, T.a);
      const chip = p.save_chip ? mk(`position:absolute;inset-inline-start:100%;margin-inline-start:${(10 * u).toFixed(1)}px;padding:${(4 * u).toFixed(1)}px ${(10 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-good) 18%, var(--x-panel));color:var(--x-good);font-size:${(13 * u).toFixed(1)}px;`, row, T.save) : null;
      const travel = W - pad * 2 - K;
      return { row, chip, draw(t, t0) {
        const x = ML.lin(t, t0, t0 + 0.28), e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, on = toAnnual ? e : 1 - e;
        knob.style.translate = `${(dir * on * travel).toFixed(2)}px 0`;
        track.style.background = `color-mix(in srgb, var(--x-accent) ${(on * 100).toFixed(1)}%, color-mix(in srgb, var(--x-ink) 22%, var(--x-panel)))`;
        aL.style.color = `color-mix(in srgb, var(--x-ink) ${(on * 100).toFixed(1)}%, var(--x-dim))`;
        mL.style.color = `color-mix(in srgb, var(--x-ink) ${((1 - on) * 100).toFixed(1)}%, var(--x-dim))`;
        if (chip) {
          const c0 = t0 + 0.5;
          if (toAnnual) {
            chip.style.visibility = t < c0 ? "hidden" : "visible";
            const b = Math.max(0, ML.back(t, c0, c0 + 0.3, 2));
            chip.style.scale = t >= c0 + 0.3 ? "none" : (0.6 + 0.4 * b).toFixed(4);
            chip.style.opacity = ML.lin(t, c0, c0 + 0.12).toFixed(4);
          } else chip.style.opacity = (1 - ML.ease(t, t0, t0 + 0.2)).toFixed(4);
        }
      } };
    }

    const target = el && el !== stage ? el : null;
    const existing = target ? [...target.querySelectorAll("[data-monthly][data-annual]")] : [];
    const single = target && !existing.length && parse(target.textContent.trim()) && target.children.length === 0;
    let toggle, wrap = null, leaveEl = null, swaps = [], featured = null, ghosts = [];
    const t0 = at + (target ? 0.05 : 0.5);

    if (existing.length || single) {
      // the prices are already on the scene: the switch goes right above them
      const anchor = target;
      const fsRef = parseFloat(getComputedStyle(existing[0] || target).fontSize) || 48;
      const u = ML.clamp(fsRef / 40, 1.2, 1.6) * k;
      const tw = mk(`display:flex;justify-content:${rtl ? "flex-end" : "flex-start"};margin-bottom:${(10 * u).toFixed(1)}px;`, null);
      toggle = makeToggle(tw, u);
      if (getComputedStyle(anchor.parentElement).display.includes("flex") && getComputedStyle(anchor.parentElement).flexDirection === "row") anchor.parentElement.prepend(tw);
      else anchor.before(tw);
      leaveEl = [tw, target];
      const list = existing.length ? existing : [target];
      swaps = list.map((e, i) => {
        const raw = existing.length ? null : parse(target.textContent.trim());
        const m = existing.length ? String(e.dataset.monthly) : raw.num;
        const a = existing.length ? String(e.dataset.annual) : annualOf(raw);
        const [x, y] = toAnnual ? [m, a] : [a, m];
        const holder = existing.length ? e : mk("display:inline-flex;", null);
        if (!existing.length) { target.replaceChildren(); if (raw.pre) target.append(raw.pre); target.append(holder); if (raw.post) target.append(raw.post); }
        const like = parse(x) || { arabicDigits: false };
        return { run: makeSwap(holder, x, y, like), i };
      });
    } else {
      // ── the pricing grid ──
      const n = Math.round(ML.clamp(p.plans, 2, 4));
      const own = !target;
      const R = own ? f.pic : { x: 0, y: 0, w: target.clientWidth || f.pic.w, h: target.clientHeight || f.pic.h };
      const col = Math.min(R.w / n, 380 * k), c = col / 300; // the column's unit
      wrap = mk(`display:flex;flex-direction:column;gap:${(22 * c).toFixed(1)}px;width:${(col * n).toFixed(1)}px;color:var(--x-ink);font-family:var(--x-body-font);`, null);
      const holderBox = mk(`position:${own ? "absolute" : "relative"};left:${own ? R.x + "px" : "0"};top:${own ? R.y + "px" : "0"};width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none;`, null);
      holderBox.append(wrap);
      if (own) host.append(holderBox); else target.replaceChildren(holderBox);
      toggle = makeToggle(wrap, ML.clamp(c * 1.45, 1, 2.2));
      const grid = mk(`display:grid;grid-template-columns:repeat(${n}, minmax(0, 1fr));background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, wrap);
      const NAMES = p.names ? String(p.names).split(/\s*[,،|]\s*/) : rtl ? ["بداية", "احترافي", "فريق", "شركات"] : ["Starter", "Pro", "Team", "Business"];
      const PRICES = p.prices ? String(p.prices).split(/\s*[,،|]\s*/) : ["19", "49", "99", "249"];
      const LINES = rtl ? ["كل المميزات", "دعم على طول", "فريق كامل"] : ["Every feature", "Priority help", "Whole team"];
      const cur = p.currency ?? (rtl ? "ج" : "$");
      const feat = n >= 3 ? 1 : n - 1;
      for (let i = 0; i < n; i++) {
        const isF = i === feat;
        const card = mk(`position:relative;box-sizing:border-box;min-width:0;padding:${(52 * c).toFixed(1)}px ${(20 * c).toFixed(1)}px ${(24 * c).toFixed(1)}px;display:flex;flex-direction:column;gap:${(12 * c).toFixed(1)}px;${i ? (rtl ? "border-right" : "border-left") + ":var(--x-edge) solid var(--x-edge-color);" : ""}${isF ? "background:linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 16%, var(--x-panel)), var(--x-panel) 70%);" : ""}border-radius:${i === 0 ? (rtl ? "0 var(--x-radius) var(--x-radius) 0" : "var(--x-radius) 0 0 var(--x-radius)") : i === n - 1 ? (rtl ? "var(--x-radius) 0 0 var(--x-radius)" : "0 var(--x-radius) var(--x-radius) 0") : "0"};`, grid);
        const name = mk(`font-size:${(23 * c).toFixed(1)}px;white-space:nowrap;color:${isF ? "var(--x-accent)" : "var(--x-dim)"};`, card, NAMES[i] || NAMES[0]);
        name.className = "ml-label";
        name.style.letterSpacing = rtl ? "0" : "0.13em";
        const line = mk(`display:flex;align-items:baseline;gap:${(4 * c).toFixed(1)}px;font:var(--x-head-weight) ${(94 * c).toFixed(1)}px/1.15 var(--x-head-font);letter-spacing:-0.04em;direction:ltr;${rtl ? "justify-content:flex-end;" : ""}`, card);
        const m = PRICES[i] || PRICES[PRICES.length - 1], like = parse(m) || { num: m, arabicDigits: false };
        const a = parse(m) ? annualOf(like) : m;
        const [x, y] = toAnnual ? [m, a] : [a, m];
        if (cur && !rtl) mk(`font-size:0.5em;align-self:flex-start;margin-top:0.2em;font-weight:600;`, line, cur);
        const num = mk("", line);
        if (cur && rtl) mk(`font-size:0.42em;font-weight:600;`, line, cur);
        swaps.push({ run: makeSwap(num, x, y, like), i });
        if (p.ghost) {
          const g = mk(`position:relative;align-self:flex-start;font-size:${(24 * c).toFixed(1)}px;color:var(--x-dim);direction:ltr;`, card, (rtl ? "" : cur) + x + (rtl ? " " + cur : ""));
          const strike = mk(`position:absolute;left:-2%;top:52%;height:${Math.max(2, 2.5 * c).toFixed(1)}px;width:104%;background:var(--x-dim);transform-origin:0 50%;`, g);
          ghosts.push({ g, strike, i });
        }
        mk(`font-size:${(23 * c).toFixed(1)}px;color:var(--x-dim);white-space:nowrap;`, card, T.per);
        const list = mk(`display:grid;gap:${(8 * c).toFixed(1)}px;margin-top:${(10 * c).toFixed(1)}px;padding-top:${(14 * c).toFixed(1)}px;border-top:var(--x-edge) solid var(--x-edge-color);font-size:${(22 * c).toFixed(1)}px;`, card);
        LINES.slice(0, 1 + Math.min(i + 1, 2)).forEach((txt) => {
          const it = mk(`display:flex;align-items:center;gap:${(7 * c).toFixed(1)}px;min-width:0;`, list);
          mk(`flex:none;width:${(9 * c).toFixed(1)}px;height:${(9 * c).toFixed(1)}px;border-radius:50%;background:var(--x-accent);`, it);
          mk("white-space:nowrap;overflow:hidden;", it, txt);
        });
        if (isF) featured = card;
      }
      leaveEl = null;
    }

    const swapAt = t0 + 0.22, colGap = 0.06;
    const last = swapAt + colGap * (Math.max(1, swaps.length) - 1) + 0.45;
    ctx.sfx(t0, "click", 0.4);
    ctx.sfx(swapAt + 0.05, "whoosh.soft", 0.2);
    if (toggle.chip && toAnnual) ctx.sfx(t0 + 0.5, "pop.soft", 0.25);
    const leave = end - 0.25;

    return {
      draw(t) {
        if (wrap) ML.show(wrap, t, at, leave);
        if (leaveEl) { const o = 1 - ML.ease(t, leave, leave + 0.22); leaveEl.forEach((e) => (e.style.opacity = o.toFixed(4))); }
        toggle.draw(t, t0);
        swaps.forEach((q) => q.run(t, swapAt + q.i * colGap));
        ghosts.forEach((q) => {
          const a = swapAt + q.i * colGap;
          q.g.style.opacity = (t < a ? 0 : 0.4 * ML.lin(t, a, a + 0.2)).toFixed(4);
          q.strike.style.transformOrigin = rtl ? "100% 50%" : "0 50%";
          q.strike.style.scale = `${ML.ease(t, a + 0.1, a + 0.35).toFixed(4)} 1`;
        });
        if (featured && p.highlight_featured) ML.ring(featured, t, last - 0.1, last + 0.55, -3);
      },
    };
  },
});
