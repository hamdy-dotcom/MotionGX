// Evidence cards float around a headline. 4–10 faint UI scraps (an email thread, a pricing table, a voice note, a
// sticky note, a chat bubble, a calendar slot, a receipt, a mini chart, an invoice line, a search box) are placed on a
// ring that leaves the centre clear for the headline, at 40–80 % opacity, scale 0.6–0.9, rotated ±4°; they enter one
// after another with a 0.3 s fade-and-rise and then each drifts ±6 px on its own seeded sine. All built from the look
// (panels, ink, accent), drawn behind the scene's type. The copy on the scraps follows the language.
// Source: prompt-motion "theviableedge-getting-in-on-the" (reference only — rebuilt as our own code).
ML.define({
  id: "element.evidence-collage",
  category: "element",
  name: "Evidence cards float around a headline",
  does: "Faint UI scraps (email thread, pricing table, voice note, sticky note) float at low contrast in a ring around the centred headline.",
  says: ["problem", "proof", "story"],
  energy: 2,
  targets: ["card", "stage"],
  duration: [2, 6],
  params: {
    density: { type: "number", range: [4, 10], default: 7 },
    opacity: { type: "number", range: [0.4, 0.8], default: 0.6 },
  },
  pairs: ["text-in.punchline", "element.fade-rise", "camera.push-in"],
  avoid: ["celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:theviableedge-getting-in-on-the", license: "reference", note: "rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 1080;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    // the clear centre: the target card's box, else the headline's, else the safe area's middle
    const head = own || host.querySelector(".ml-title, [data-slot='headline']");
    const hb = head ? ctx.box(head) : { x: f.W * 0.25, y: f.H * 0.42, w: f.W * 0.5, h: f.H * 0.16 };
    const cx = f.W / 2, cy = ML.clamp(hb.y + hb.h / 2, f.H * 0.3, f.H * 0.7);
    const layer = doc.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:0;";
    host.prepend(layer);
    layer.dir = rtl ? "rtl" : "ltr";
    const T = rtl
      ? { from: "من: سارة", re: "رد: الفاتورة المتأخرة", body: "لسه مستنيين الرد…", plan: ["أساسي", "احترافي", "شركات"], voice: "رسالة صوتية · ٠:٤٢", sticky: "اتصل بالبنك تاني!", chat: "هو التحويل وصل؟", cal: "اجتماع متابعة", time: "١٠:٣٠", total: "الإجمالي", inv: "فاتورة ٢٠٤٨", due: "متأخرة", q: "إزاي أقسط…" }
      : { from: "From: Sarah", re: "Re: overdue invoice", body: "Still waiting to hear back…", plan: ["Basic", "Pro", "Team"], voice: "Voice note · 0:42", sticky: "Call the bank again!", chat: "Did the transfer go through?", cal: "Follow-up call", time: "10:30", total: "Total", inv: "Invoice #2048", due: "Overdue", q: "how to split a payment…" };
    const panel = (w, h) => `position:absolute;left:0;top:0;width:${w}px;min-height:${h}px;box-sizing:border-box;padding:${18 * k}px ${22 * k}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${22 * k}px));box-shadow:var(--x-shadow);color:var(--x-ink);font:var(--x-body-weight) ${22 * k}px/1.35 var(--x-body-font);display:grid;gap:${10 * k}px;align-content:start;`;
    const bar = (parent, w, c = "var(--x-dim)", h = 12) => mk("div", `height:${h * k}px;width:${w};border-radius:999px;background:${c};opacity:.55;`, parent);
    const small = `font:var(--x-label-weight) ${16 * k}px var(--x-label-font);color:var(--x-dim);letter-spacing:${rtl ? 0 : "0.08em"};`;
    const builders = [
      () => { // an email thread
        const c = mk("div", panel(360 * k, 0), layer);
        mk("div", small, c, T.from); mk("div", `font-weight:600;`, c, T.re); mk("div", `color:var(--x-dim);`, c, T.body); bar(c, "90%"); bar(c, "70%");
        return c;
      },
      () => { // a pricing table
        const c = mk("div", panel(380 * k, 0) + `grid-template-columns:repeat(3,1fr);gap:${10 * k}px;`, layer);
        T.plan.forEach((n, i) => { const col = mk("div", `display:grid;gap:${8 * k}px;padding:${10 * k}px;border-radius:${12 * k}px;background:${i === 1 ? "color-mix(in srgb, var(--x-accent) 14%, transparent)" : "var(--x-panel-2)"};`, c); mk("div", small, col, n); mk("div", `font:var(--x-head-weight) ${28 * k}px var(--x-head-font);`, col, ["$9", "$29", "$99"][i]).dir = "ltr"; bar(col, "80%"); bar(col, "60%"); });
        return c;
      },
      () => { // a voice note
        const c = mk("div", panel(340 * k, 0) + `grid-template-columns:auto 1fr;align-items:center;border-radius:999px;`, layer);
        mk("div", `width:${44 * k}px;height:${44 * k}px;border-radius:50%;background:var(--x-accent);`, c);
        const wave = mk("div", `display:flex;align-items:center;gap:${4 * k}px;height:${40 * k}px;`, c);
        for (let i = 0; i < 18; i++) mk("i", `display:block;width:${4 * k}px;height:${(8 + 28 * ML.rnd(i, 7)) * k}px;border-radius:2px;background:var(--x-dim);opacity:.7;`, wave);
        mk("div", small + "grid-column:1 / -1;", c, T.voice);
        return c;
      },
      () => { // a sticky note
        const c = mk("div", `position:absolute;left:0;top:0;width:${230 * k}px;min-height:${210 * k}px;box-sizing:border-box;padding:${22 * k}px;background:color-mix(in srgb, var(--x-accent-2) 32%, var(--x-panel));box-shadow:var(--x-shadow);color:var(--x-ink);font:500 ${30 * k}px/1.2 var(--x-hand-font);`, layer, T.sticky);
        return c;
      },
      () => { // a chat bubble
        const c = mk("div", panel(320 * k, 0) + `border-end-start-radius:${4 * k}px;`, layer);
        mk("div", "", c, T.chat); mk("div", small, c, T.time);
        return c;
      },
      () => { // a calendar slot
        const c = mk("div", panel(300 * k, 0), layer);
        const row = mk("div", `display:flex;gap:${12 * k}px;align-items:center;`, c);
        mk("div", `width:${6 * k}px;height:${48 * k}px;border-radius:3px;background:var(--x-accent);`, row);
        const col = mk("div", `display:grid;gap:${4 * k}px;`, row); mk("div", "font-weight:600;", col, T.cal); mk("div", small, col, T.time);
        return c;
      },
      () => { // a receipt
        const c = mk("div", panel(260 * k, 0) + `border-radius:${6 * k}px;`, layer);
        for (let i = 0; i < 3; i++) { const r = mk("div", `display:flex;justify-content:space-between;gap:${8 * k}px;`, c); bar(r, "55%"); mk("span", small, r, ["12.00", "4.50", "8.25"][i]).dir = "ltr"; }
        const tot = mk("div", `display:flex;justify-content:space-between;border-top:1px dashed var(--x-line);padding-top:${8 * k}px;font-weight:600;`, c); mk("span", "", tot, T.total); mk("span", "", tot, "24.75").dir = "ltr";
        return c;
      },
      () => { // a mini chart
        const c = mk("div", panel(280 * k, 0), layer);
        const bars = mk("div", `display:flex;align-items:flex-end;gap:${8 * k}px;height:${90 * k}px;`, c);
        for (let i = 0; i < 7; i++) mk("i", `display:block;flex:1;height:${(20 + 70 * ML.rnd(i, 3)) * k}px;border-radius:${4 * k}px;background:${i === 5 ? "var(--x-bad)" : "var(--x-dim)"};opacity:${i === 5 ? 0.8 : 0.45};`, bars);
        bar(c, "60%");
        return c;
      },
      () => { // an overdue invoice line
        const c = mk("div", panel(330 * k, 0) + `grid-template-columns:1fr auto;align-items:center;`, layer);
        mk("div", "font-weight:600;", c, T.inv);
        mk("div", `padding:${4 * k}px ${12 * k}px;border-radius:999px;background:color-mix(in srgb, var(--x-bad) 16%, transparent);color:var(--x-bad);font-size:${18 * k}px;`, c, T.due);
        return c;
      },
      () => { // a search box
        const c = mk("div", panel(340 * k, 0) + `grid-template-columns:auto 1fr;align-items:center;border-radius:999px;`, layer);
        mk("div", `width:${22 * k}px;height:${22 * k}px;border-radius:50%;border:${3 * k}px solid var(--x-dim);box-sizing:border-box;`, c);
        mk("div", "color:var(--x-dim);", c, T.q);
        return c;
      },
    ];
    const n = Math.round(ML.clamp(p.density, 4, 10));
    const op = ML.clamp(p.opacity, 0.4, 0.8);
    // the ring: an ellipse around the clear centre, inside the frame
    const rx = f.W * (f.wide ? 0.36 : 0.33), ry = f.H * (f.tall ? 0.31 : f.wide ? 0.34 : 0.33);
    const cards = [];
    for (let i = 0; i < n; i++) {
      const el = builders[i % builders.length]();
      const w = el.offsetWidth, h = el.offsetHeight;
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (ML.rnd(i, 11) - 0.5) * 0.35;
      const sc = 0.6 + 0.3 * ML.rnd(i, 2);
      let x = cx + Math.cos(a) * rx - w / 2, y = cy + Math.sin(a) * ry - h / 2;
      // keep each scrap mostly on the frame
      x = ML.clamp(x, -w * 0.15, f.W - w * 0.85); y = ML.clamp(y, -h * 0.1, f.H - h * 0.9);
      el.style.left = `${x.toFixed(1)}px`; el.style.top = `${y.toFixed(1)}px`;
      el.style.opacity = "0";
      cards.push({ el, sc, rot: (ML.rnd(i, 5) * 2 - 1) * 4, t0: at + i * 0.09, ph: ML.rnd(i, 9) * Math.PI * 2, w1: 0.5 + ML.rnd(i, 4) * 0.5 });
    }
    // order of entry: seeded, so neighbours do not arrive together
    const order = cards.map((_, i) => i).sort((a, b) => ML.rnd(a, 21) - ML.rnd(b, 21));
    order.forEach((ci, j) => { cards[ci].t0 = at + j * 0.09; });
    ctx.sfx(at, "whoosh.soft", 0.2);
    return {
      draw(t) {
        for (const c of cards) {
          const u = ML.out(t, c.t0, c.t0 + 0.3);
          const dx = 6 * k * Math.sin(t * c.w1 * 1.3 + c.ph), dy = 6 * k * Math.cos(t * c.w1 + c.ph * 1.7);
          c.el.style.opacity = (u * op).toFixed(4);
          c.el.style.translate = `${dx.toFixed(2)}px ${(dy + (1 - u) * 24 * k).toFixed(2)}px`;
          c.el.style.scale = c.sc.toFixed(4);
          c.el.style.rotate = `${c.rot.toFixed(3)}deg`;
        }
      },
    };
  },
});
