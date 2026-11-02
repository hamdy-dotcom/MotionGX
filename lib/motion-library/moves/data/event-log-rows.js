// Event log rows: a monospace log grows line by line — time (dim), "req N" (bright), status (good "taken" / bad
// "refused"), tokens remaining (dim, end-aligned), and optionally a latency column — each new row fading in over 0.1 s.
// Past `max_rows` the list shifts up one row height (0.15 s power2.out) and the top row fades as it leaves. Row times
// come from the simulation clock (a seeded request schedule run through a small token bucket, so taken / refused and
// the remaining count are true to each other). Built as a terminal-dark panel from the look's own ink and ground.
// On a list the log replaces its items; with no target it is built in the picture region.
// Source: prompt-motion "parkerrex-3-ole-lehmann-s-list" (reference only: rebuilt as our own code).
ML.define({
  id: "data.event-log-rows",
  category: "data",
  name: "Event log rows append",
  does: "A monospace log grows line by line with each status coloured, scrolling up once full.",
  says: ["proof", "tech", "precision", "list"],
  energy: 2,
  targets: ["list", "label"],
  duration: [1.5, 6],
  params: {
    max_rows: { type: "number", range: [4, 12], default: 6 },
    columns: { type: "number", range: [2, 5], default: 4 },
    status_colours: { type: "bool", default: true },
    capacity: { type: "number", range: [2, 10], default: 5 },
    rate: { type: "number", range: [2, 12], default: 5, unit: "/s" },
  },
  pairs: ["data.token-bucket", "data.timecode-hud"],
  avoid: ["luxury", "playful"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:parkerrex-3-ole-lehmann-s-list", license: "reference", note: "our own rebuild: seeded schedule through a token bucket, closed-form scroll" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const u = Math.min(f.W, f.H) / 1080;
    const maxRows = Math.round(ML.clamp(p.max_rows, 4, 12)), ncol = Math.round(ML.clamp(p.columns, 2, 5));

    // the schedule: rows every 1/rate s (jittered), a bucket of `capacity` refilling one token per 3 rows' time
    const span = Math.max(0.8, end - at - 0.6);
    const step = 1 / ML.clamp(p.rate, 2, 12);
    const times = [];
    for (let i = 0, tt = 0.1; tt < span; i++) { times.push(at + tt); tt += step * (0.6 + 0.8 * ML.rnd(i, 41)); }
    const cap = Math.round(ML.clamp(p.capacity, 2, 10)), refill = 1 / (step * 3);
    let tokens = cap, last = 0;
    const rows = times.map((t, i) => {
      const st = t - at; tokens = Math.min(cap, tokens + (st - last) * refill); last = st;
      const ok = tokens >= 1; if (ok) tokens -= 1;
      return { t, sim: st, ok, left: Math.floor(tokens), ms: Math.round(8 + ML.rnd(i, 43) * 60) };
    });

    // the panel
    let host, w;
    if (el) {
      el.textContent = "";
      Object.assign(el.style, { display: "block", position: "relative" });
      host = el; w = el.clientWidth || f.pic.w * 0.8;
    } else {
      w = Math.min(f.pic.w * 0.9, 1100 * u);
      host = mk("div", `position:absolute;left:${f.pic.x + (f.pic.w - w) / 2}px;top:${f.pic.y + f.pic.h / 2}px;translate:0 -50%;width:${w}px;z-index:20;will-change:transform`, ctx.scene || stage);
    }
    const fs = Math.round(ML.clamp(w / 30, 18 * u, 28 * u)), rh = Math.round(fs * 1.75), pad = Math.round(fs * 1.1);
    const panel = mk("div", `position:relative;box-sizing:border-box;width:100%;padding:${pad}px;border-radius:calc(var(--x-radius) * 0.6);background:color-mix(in srgb, var(--x-ink) 94%, var(--x-ground));box-shadow:var(--x-shadow);font:500 ${fs}px/1 var(--x-mono-font);direction:${rtl ? "rtl" : "ltr"};will-change:transform`, host);
    const view = mk("div", `position:relative;height:${rh * maxRows}px;overflow:hidden`, panel);
    const list = mk("div", "position:absolute;left:0;right:0;top:0;will-change:transform", view);
    const dim = "color-mix(in srgb, var(--x-ground) 50%, var(--x-ink))", bright = "var(--x-ground)";
    const W = { taken: rtl ? "مقبول" : "taken", refused: rtl ? "مرفوض" : "refused", req: rtl ? "طلب" : "req", left: rtl ? "باقي" : "left" };
    const clock = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`; };
    // the columns shown: 2 → req · status, 3 → + time, 4 → + remaining, 5 → + latency
    const show = { time: ncol >= 3, rem: ncol >= 4, ms: ncol >= 5 };
    const els = rows.map((r, i) => {
      const row = mk("div", `position:absolute;left:0;right:0;top:${i * rh}px;height:${rh}px;display:flex;align-items:center;gap:${fs * 1.2}px;white-space:nowrap`, list);
      if (show.time) mk("span", `color:${dim};direction:ltr;unicode-bidi:isolate`, row, clock(r.sim));
      mk("span", `color:${bright};min-width:${fs * 5}px`, row, `${W.req} ${i + 1}`);
      mk("span", `color:${p.status_colours ? (r.ok ? "var(--x-good)" : "var(--x-bad)") : bright};min-width:${fs * 4.6}px`, row, r.ok ? W.taken : W.refused);
      if (show.ms) mk("span", `color:${dim};direction:ltr;unicode-bidi:isolate`, row, `${r.ms}ms`);
      if (show.rem) mk("span", `margin-inline-start:auto;color:${dim}`, row, `${r.left} ${W.left}`);
      return row;
    });
    els.forEach((_, i) => i % 2 === 0 && ctx.sfx(rows[i].t, "key", 0.18));

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        const enter = ML.out(t, at - 0.1, at + 0.2);
        panel.style.opacity = (enter * (1 - leave)).toFixed(4);
        // the scroll: one row height per row past the view, 0.15 s power2.out each
        let shift = 0;
        for (let i = maxRows; i < rows.length; i++) { const x = ML.clamp((t - rows[i].t) / 0.15); shift += 1 - (1 - x) * (1 - x); }
        list.style.transform = `translateY(${(-shift * rh).toFixed(2)}px)`;
        els.forEach((e, i) => {
          const a = ML.clamp((t - rows[i].t) / 0.1);
          const posInView = i - shift; // < 0: leaving at the top
          const out = posInView < 0 ? ML.clamp(1 + posInView) : 1;
          e.style.opacity = (a * out).toFixed(4);
        });
      },
    };
  },
});
