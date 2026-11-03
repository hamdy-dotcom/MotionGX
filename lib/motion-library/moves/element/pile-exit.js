// Pile thrown off the frame: the cards of a pile are swept away, leaving a clean page.
//  · sides — to x ±(stage width × 0.85) alternating by index, fading on the same curve, 0.5 s power3.in, staggered 0.06 s, starting
//    0.85 s before the end (or at `at` if later) — MotionGX's own R.stack wipe; one-side throws them all one way
//    (towards the leading edge: right, or left in Arabic); up / scatter send them up or out on seeded directions.
//  · down — each card drops 200 px (scaled) turning a seeded ±30°, 0.5 s power2.in, on a seeded 0–0.25 s stagger.
// An optional ✕ stamp snaps in after the sweep (scale 2.4 → 1, 0.3 s power4.out). The pile is the target's children
// (a list), the target itself (a card / picture), or — when there is no target — a pile it builds: a few stacked cards,
// or for "down" 25–40 small rotated cards in a band (clutter that disappears); `labels` names them. A heavy whoosh lands
// on the sweep, and the sweep always finishes inside the run (stagger and flight tighten on a short one). A target is
// moved on `transform`, so a move that brought it in (on translate / scale / opacity) keeps working until the sweep.
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.stack (own) + prompt-motion "lester-tyy-opus-5-5-is-crazy"
// (reference only).
ML.define({
  id: "element.pile-exit",
  category: "element",
  name: "Pile thrown off the frame",
  does: "A pile of cards is swept away - flying out to alternate sides or dropping down out of frame - leaving a clean page.",
  says: ["relief", "change", "energy", "simplicity"],
  energy: 4,
  targets: ["card", "list", "image"],
  duration: [0.6, 1.5],
  params: {
    direction: { type: "choice", options: ["sides", "one-side", "down", "up", "scatter"], default: "sides" },
    stagger: { type: "number", range: [0.03, 0.25], default: 0.06, unit: "s" },
    stamp: { type: "bool", default: false },
    count: { type: "number", range: [3, 40], default: 7 },
    lead: { type: "number", range: [0.4, 1.5], default: 0.85, unit: "s" },
    labels: { type: "text", default: "" },
  },
  pairs: ["element.card-pile-drop", "element.chip-pile-up", "text-in.punchline"],
  avoid: ["calm", "luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js#R.stack", license: "own", note: "drop / clutter variants rebuilt from prompt-motion lester-tyy-opus-5-5-is-crazy (reference only)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document;
    const host = ctx.scene || stage;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    const own = el && el !== stage ? el : null;
    const dir = p.direction;
    let cards, built = null;
    if (own && own.children.length > 1 && !/^(IMG|svg)$/i.test(own.tagName)) cards = [...own.children];
    else if (own) cards = [own];
    else {
      // our own pile, in the picture region
      const R = f.pic;
      built = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;pointer-events:none;z-index:6;`, host);
      const given = String(p.labels || "").split(/[,،|]/).map((x) => x.trim()).filter(Boolean);
      const words = given.length ? given : rtl ? ["فواتير", "متابعات", "تقارير", "إيميلات", "تذكيرات", "اجتماعات", "موافقات", "جداول", "إيصالات", "تجديدات"] : ["Invoices", "Follow-ups", "Reports", "Emails", "Reminders", "Meetings", "Approvals", "Spreadsheets", "Receipts", "Renewals"];
      if (dir === "down") {
        // clutter: 25–40 small rotated cards in a band
        const n = Math.round(ML.clamp(Math.max(p.count, 25), 25, 40)), cw = Math.min(R.w * 0.3, 280 * k), ch = cw * 0.42;
        cards = Array.from({ length: n }, (_, i) => {
          const c = mk("div", `position:absolute;left:${(R.w - cw) * ML.rnd(i, 1)}px;top:${R.h * 0.3 + (R.h * 0.4 - ch) * ML.rnd(i, 2)}px;width:${cw}px;height:${ch}px;box-sizing:border-box;display:flex;align-items:center;gap:${ch * 0.18}px;padding:0 ${ch * 0.25}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${(ch * 0.2).toFixed(1)}px));box-shadow:var(--x-shadow);transform:rotate(${((ML.rnd(i, 3) - 0.5) * 30).toFixed(2)}deg);`, built);
          mk("span", `flex:none;width:${ch * 0.28}px;height:${ch * 0.28}px;border-radius:50%;background:${i % 3 ? "var(--x-accent)" : "var(--x-bad)"};`, c);
          mk("span", `font:var(--x-head-weight) ${ch * 0.3}px/1 var(--x-head-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;`, c, words[i % words.length]);
          return c;
        });
      } else {
        // a straight stack of wide cards (the R.stack pains)
        const n = Math.round(ML.clamp(p.count, 3, 9)), gap = 16 * k, h = Math.min(120 * k, (R.h * 0.9 - gap * (n - 1)) / n), w = Math.min(R.w * 0.9, 860 * k), y0 = (R.h - (n * h + (n - 1) * gap)) / 2;
        cards = Array.from({ length: n }, (_, i) => {
          const c = mk("div", `position:absolute;left:${(R.w - w) / 2}px;top:${y0 + i * (h + gap)}px;width:${w}px;height:${h}px;box-sizing:border-box;display:flex;align-items:center;gap:${h * 0.22}px;padding:0 ${h * 0.32}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(min(var(--x-radius), ${(h * 0.3).toFixed(1)}px));box-shadow:var(--x-shadow);`, built);
          mk("span", `flex:none;width:${h * 0.3}px;height:${h * 0.3}px;border-radius:50%;background:var(--x-bad);`, c);
          mk("span", `flex:1;font:var(--x-head-weight) ${h * 0.36}px/1.1 var(--x-head-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;`, c, words[i % words.length]);
          return c;
        });
      }
    }
    const n = cards.length;
    const st0 = ML.clamp(p.stagger, 0.03, 0.25);
    const spread0 = dir === "down" ? 0.25 : st0 * (n - 1);
    // the sweep: lead seconds before the end, never before `at`; a built pile shows from `at` first
    const go = Math.max(at + (built ? Math.min(0.45, (end - at) * 0.3) : 0), end - ML.clamp(p.lead, 0.4, 1.5) - (dir === "down" ? 0 : Math.max(0, spread0 - 0.35)));
    // the last card is gone by the end of the run, however short
    const room = Math.max(0.2, end - go), D = Math.min(0.5, room * 0.7), spread = Math.min(spread0, room - D), st = n > 1 ? spread / (n - 1) : 0;
    const lead = rtl ? -1 : 1;
    const plan = cards.map((c, i) => {
      const t0 = go + (dir === "down" ? ML.rnd(i, 7) * spread : i * st);
      const r = (ML.rnd(i, 8) - 0.5) * 2;
      let dx = 0, dy = 0, rot = 0, ease = "p3";
      if (dir === "sides") { const sd = (i % 2 ? 1 : -1) * lead; dx = sd * 0.85 * f.W; rot = sd * 8; }
      else if (dir === "one-side") { dx = lead * 0.95 * f.W; rot = lead * 6; }
      else if (dir === "down") { dy = Math.max(200 * k, f.H * 0.35); rot = r * 30; ease = "p2"; }
      else if (dir === "up") { dy = -Math.max(200 * k, f.H * 0.45); rot = r * 12; }
      else { const a = ML.rnd(i, 9) * Math.PI * 2; dx = Math.cos(a) * f.W * 0.8; dy = Math.sin(a) * f.H * 0.5; rot = r * 40; }
      return { c, t0, dx, dy, rot, ease, base: c.style.transform || "", wrote: "" };
    });
    // the ✕ stamp
    let stamp = null;
    const sT = Math.min(go + spread + D * 0.7, end - 0.4);
    if (p.stamp) {
      const s = Math.min(f.pic.w, f.pic.h) * 0.36;
      stamp = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      stamp.setAttribute("viewBox", "0 0 100 100");
      stamp.style.cssText = `position:absolute;left:${f.W / 2 - s / 2}px;top:${f.pic.y + f.pic.h / 2 - s / 2}px;width:${s}px;height:${s}px;pointer-events:none;z-index:9;opacity:0;overflow:visible;`;
      stamp.innerHTML = '<path d="M18 18 82 82M82 18 18 82" stroke="var(--x-bad)" stroke-width="13" stroke-linecap="round" fill="none"/>';
      host.append(stamp);
      ctx.sfx(sT, "hit", 0.4);
    }
    ctx.sfx(go, "whoosh.heavy", 0.45);
    const p3in = (x) => x * x * x, p2in = (x) => x * x, p4out = (x) => 1 - Math.pow(1 - x, 4);
    return {
      draw(t) {
        if (built) {
          built.style.visibility = t < at - 1e-6 ? "hidden" : "visible";
          built.style.opacity = ML.lin(t, at, at + 0.25).toFixed(4);
        }
        for (const q of plan) {
          const x = ML.lin(t, q.t0, q.t0 + D), e = q.ease === "p2" ? p2in(x) : p3in(x);
          if (x <= 0) {
            q.c.style.transform = q.base;
            // before the sweep the opacity belongs to whatever brought the card in: take back only a value this move left
            if (q.c.style.opacity === q.c.dataset.mlExitO) q.c.style.opacity = "";
            continue;
          }
          q.c.style.transform = `translate(${(q.dx * e).toFixed(2)}px, ${(q.dy * e).toFixed(2)}px) rotate(${(q.rot * e).toFixed(2)}deg) ${q.base}`;
          // fades on the same curve as it flies, so it reads as thrown and is gone by the time it lands
          q.c.style.opacity = (1 - e).toFixed(4);
          q.c.dataset.mlExitO = q.c.style.opacity;
        }
        if (stamp) {
          const u = p4out(ML.lin(t, sT, sT + 0.3));
          stamp.style.opacity = (ML.lin(t, sT, sT + 0.08) * (1 - ML.ease(t, end - 0.15, end))).toFixed(4);
          stamp.style.transform = `scale(${(2.4 - 1.4 * u).toFixed(4)})`;
        }
      },
    };
  },
});
