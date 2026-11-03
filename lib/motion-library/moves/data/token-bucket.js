// Segmented bucket drains and refills: an outlined bucket (1 px, dim) holds `capacity` segments (accent, small gaps).
// Requests arrive on a seeded three-phase schedule — steady traffic the refill keeps up with, a burst that spends the
// saved tokens, then traffic on an empty bucket — and the bucket follows a closed-form token-bucket model (refill at
// `refill_rate` per second, one token per request when one is whole, else refused), computed in setup so draw(t) only
// looks the state up. A take flashes the top segment to a green outline for 0.15 s before it empties; a segment
// refilling fades 0 → 100% (a dim tint while partial). Empty: outline and counter turn red. Beside it a light mono
// counter + "/ N tokens", a phase caption at the top, and a short request log (req n · taken / refused · n left).
// The burst is sized from capacity and refill so the bucket always empties, whatever the rate. On a number slot the slot
// itself counts (and reads its own text again before `at`) and the bucket stands at its reading-end side.
// Source: prompt-motion parkerrex-3-ole-lehmann-s-list (reference only: rebuilt as our own code).
ML.define({
  id: "data.token-bucket",
  category: "data",
  name: "Segmented bucket drains and refills",
  does: "A bucket of segments loses one per request and slowly refills; when empty it turns red and the counter reads 0.",
  says: ["precision", "tech", "time", "problem"],
  energy: 2,
  targets: ["chart", "number"],
  duration: [3, 10],
  params: {
    capacity: { type: "number", range: [4, 20], default: 10 },
    refill_rate: { type: "number", range: [0.5, 5], default: 1, unit: "/s" },
    orientation: { type: "choice", options: ["vertical", "horizontal"], default: "vertical" },
    log: { type: "bool", default: true },
    captions: { type: "text", default: "" },
    unit: { type: "text", default: "" },
  },
  pairs: ["data.timecode-hud", "data.waveform-bars"],
  avoid: ["luxury", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:parkerrex-3-ole-lehmann-s-list", license: "reference", note: "our own rebuild: closed-form token bucket on a seeded request schedule" },
  setup(ctx) {
    const { el, p, at, end, rtl, f, stage } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const host = ctx.scene || stage;
    const C = Math.round(ML.clamp(p.capacity, 4, 20)), r = ML.clamp(p.refill_rate, 0.5, 5);
    const vert = p.orientation !== "horizontal";
    const u = Math.min(f.W, f.H) / 1080;
    const isNum = !!(el && el.childElementCount === 0 && /\d/.test(el.textContent || ""));
    const unit = p.unit || (rtl ? "رصيد" : "tokens");
    const caps = (p.captions || "").split("|").map((s) => s.trim()).filter(Boolean);
    const CAPS = caps.length >= 3 ? caps : rtl ? ["حركة هادئة: الإضافة تملأ الدلو", "دفعة تصرف الرصيد المحفوظ", "فاضي: الطلبات مرفوضة لحد ما يتملى"] : ["steady traffic, refill keeps the bucket full", "a burst spends the saved tokens", "empty: requests refused until a token refills"];

    // ── the schedule and the model (pure: computed once from the span) ──
    const span = Math.max(2, end - at), s0 = at + 0.35, pB = at + span * 0.36, pE = at + span * 0.62, sEnd = end - 0.3;
    const reqs = [];
    for (let x = s0; x < pB; x += 1.25 / r + 0.2 * ML.rnd(reqs.length, 3)) reqs.push(x);
    { // the burst has to outrun the refill and spend everything: at 0.14 s apart if that fits its window, else packed into it
      const W = pE - pB - 0.1;
      let dt = 0.14, n = r * dt < 0.9 ? Math.ceil(C / (1 - r * dt)) + 2 : Infinity;
      if (n * dt > W) { n = Math.ceil(C + r * W) + 2; dt = W / n; }
      for (let i = 0; i < n; i++) reqs.push(pB + 0.05 + i * dt);
    }
    for (let x = pE + 0.15; x < sEnd; x += 0.55 / r + 0.1 * ML.rnd(reqs.length, 5)) reqs.push(x);
    let lvl = C, last = at;
    const log = reqs.map((tr, i) => {
      lvl = Math.min(C, lvl + r * (tr - last)); last = tr;
      const before = lvl, ok = lvl >= 1;
      if (ok) lvl -= 1;
      return { t: tr, n: i + 1, ok, before, after: lvl };
    });
    const state = (t) => { // level at t, the last request at or before t
      let i = -1; for (let j = 0; j < log.length; j++) { if (log[j].t <= t) i = j; else break; }
      const base = i < 0 ? C : log[i].after, from = i < 0 ? at : log[i].t;
      return { level: Math.min(C, base + r * Math.max(0, t - from)), i };
    };
    const firstEmpty = log.find((q) => !q.ok);

    // ── the drawing ──
    let R, wrap, bucket, counter, total, capEl, logBox, row, side;
    const own = isNum ? el.textContent : "";
    if (isNum) {
      const b = ctx.box(el), hostB = ctx.box(host);
      counter = el;
      // keep the side the slot's text sits on: direction:ltr alone would throw an Arabic slot to the left
      const al = getComputedStyle(el).textAlign;
      el.style.textAlign = al === "start" ? (rtl ? "right" : "left") : al === "end" ? (rtl ? "left" : "right") : al;
      counter.style.fontVariantNumeric = "tabular-nums"; counter.style.direction = "ltr"; counter.style.unicodeBidi = "isolate";
      el.textContent = String(C); // the bucket stands beside what the slot will read (its widest), not beside the old text
      const rg = doc.createRange(); rg.selectNodeContents(el); const tb = rg.getBoundingClientRect(), sb = stage.getBoundingClientRect(), sc = sb.width / (stage.offsetWidth || 1) || 1;
      const textEnd = rtl ? (tb.left - sb.left) / sc : (tb.right - sb.left) / sc;
      el.textContent = own;
      const bh = Math.min(b.h * 1.15, f.H * 0.35), bw = vert ? bh * 0.5 : bh * 2;
      const bx = rtl ? textEnd - 24 * u - bw : textEnd + 24 * u;
      wrap = mk("div", `position:absolute;left:${(Math.max(0, Math.min(f.W - bw, bx)) - hostB.x).toFixed(1)}px;top:${(b.y + b.h / 2 - (vert ? bh : bh * 0.25) / 2 - hostB.y).toFixed(1)}px;z-index:20;visibility:hidden`, host);
      bucket = mk("div", `position:relative;width:${bw}px;height:${vert ? bh : bh * 0.25}px`, wrap);
      R = null;
    } else {
      R = el && el !== stage ? ctx.box(el) : f.pic;
      if (R.h < 200) R = f.pic;
      wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;z-index:20;box-sizing:border-box;padding:${Math.round(40 * u)}px;display:flex;flex-direction:column;gap:${Math.round(30 * u)}px;visibility:hidden`, host);
      wrap.className = "ml-panel";
      wrap.dir = rtl ? "rtl" : "ltr";
      wrap.style.willChange = "opacity"; // its own layer: the log's rows repaint every frame, and dirty rects were not pixel-stable
      capEl = mk("div", `font:var(--x-label-weight) ${Math.round(26 * u)}px var(--x-mono-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:clip`, wrap);
      row = mk("div", `flex:none;display:flex;align-items:${vert ? "flex-start" : "center"};gap:${Math.round(44 * u)}px;flex-direction:${vert ? "row" : "column"};${vert ? "" : "align-items:flex-start"}`, wrap);
      const avail = R.h - 80 * u - 56 * u - 30 * u;
      const bh = vert ? Math.min(avail * 0.92, R.w * 0.6) : Math.min(R.w * 0.8, avail * 1.2) * 0.25;
      const bw = vert ? bh * 0.5 : bh * 4;
      bucket = mk("div", `position:relative;flex:none;width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px`, row);
      side = mk("div", `display:flex;flex-direction:column;gap:${Math.round(26 * u)}px;min-width:0`, row);
      const cRow = mk("div", "display:flex;align-items:baseline;gap:0.4em;white-space:nowrap", side);
      const big = Math.round(Math.min(150 * u, (vert ? bh : bh * 4) * 0.32));
      counter = mk("div", `font:300 ${big}px/1 var(--x-mono-font);color:var(--x-ink);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate`, cRow);
      total = mk("div", `font:400 ${Math.round(big * 0.2)}px var(--x-mono-font);color:var(--x-dim)`, cRow);
      total.textContent = `/ ${C} ${unit}`;
      if (p.log) {
        const logFs = Math.round(Math.max(16, 23 * u)), logGap = Math.round(6 * u);
        logBox = mk("div", `display:grid;grid-template-columns:repeat(4, auto);align-content:start;justify-content:start;column-gap:1.2em;row-gap:${logGap}px;font:400 ${logFs}px/1.2 var(--x-mono-font);color:var(--x-dim);white-space:nowrap;min-width:${20 * logFs}px;min-height:${(6 * logFs * 1.2 + 5 * logGap).toFixed(1)}px`, side);
      }
      // a caption of any length fits one line; the panel hugs what it holds (widest caption, counter, the log's six rows
      // reserved), centred in the region
      counter.textContent = String(C);
      row.style.alignSelf = capEl.style.alignSelf = "flex-start";
      for (const c of CAPS) { capEl.textContent = c; ML.fit(capEl, R.w - 80 * u); }
      let inW = row.offsetWidth;
      for (const c of CAPS) { capEl.textContent = c; inW = Math.max(inW, capEl.offsetWidth); }
      capEl.style.alignSelf = "";
      const W = Math.min(R.w, Math.ceil(inW + 80 * u) + 4);
      wrap.style.width = W + "px";
      wrap.style.left = (R.x + (R.w - W) / 2).toFixed(1) + "px";
      wrap.style.height = "auto";
      let H = wrap.offsetHeight;
      if (H > R.h) { bucket.style.height = Math.max(bh * 0.5, bh - (H - R.h)).toFixed(1) + "px"; H = wrap.offsetHeight; } // a short region takes it from the bucket
      wrap.style.height = H + "px";
      wrap.style.top = (R.y + (R.h - H) / 2).toFixed(1) + "px";
    }
    // the bucket: an outline holding C segments, the first one is the bottom (or the reading start)
    const B = { w: parseFloat(bucket.style.width), h: parseFloat(bucket.style.height) };
    const outline = mk("i", `position:absolute;inset:0;border:${Math.max(1, Math.round(1.5 * u))}px solid var(--x-dim);border-radius:min(var(--x-radius-s), ${Math.round(4 * u)}px);box-sizing:border-box`, bucket);
    const pad = Math.max(3, B.w * (vert ? 0.075 : 0.012)), gap = Math.max(2, (vert ? B.h : B.w) * 0.02);
    const segL = ((vert ? B.h : B.w) - pad * 2 - gap * (C - 1)) / C;
    const segs = Array.from({ length: C }, (_, i) => {
      const off = pad + i * (segL + gap);
      const s = mk("i", `position:absolute;box-sizing:border-box;border-radius:min(var(--x-radius-s), ${Math.round(2 * u)}px);${vert ? `left:${pad}px;right:${pad}px;bottom:${off}px;height:${segL}px` : `top:${pad}px;bottom:${pad}px;${rtl ? "right" : "left"}:${off}px;width:${segL}px`}`, bucket);
      return s;
    });
    const logRows = logBox ? Array.from({ length: 6 }, () => mk("div", "display:contents", logBox)) : [];
    ctx.sfx(at, "tap", 0.2);
    log.forEach((q, i) => { if (i % 3 === 0 || (!q.ok && q === firstEmpty)) ctx.sfx(q.t, q.ok ? "blip" : "hit", q.ok ? 0.15 : 0.3); });
    const words = rtl ? { req: "طلب", ok: "اتاخد", no: "مرفوض", left: "باقي" } : { req: "req", ok: "taken", no: "refused", left: "left" };
    return {
      draw(t) {
        if (t < at - 1e-6) { wrap.style.visibility = "hidden"; if (isNum) { el.textContent = own; el.style.color = ""; } return; }
        ML.show(wrap, t, at, end - 0.25);
        const { level, i } = state(t);
        const full = Math.floor(level + 1e-9), part = level - full, empty = level < 1;
        const q = i >= 0 ? log[i] : null, flashing = q && q.ok && t - q.t < 0.15 ? Math.floor(q.before + 1e-9) - 1 : -1;
        segs.forEach((s, k) => {
          if (k === flashing) { s.style.background = "transparent"; s.style.border = `${Math.max(1, Math.round(2 * u))}px solid var(--x-good)`; s.style.opacity = "1"; return; }
          s.style.border = "none";
          if (k < full) { s.style.background = "var(--x-accent)"; s.style.opacity = "1"; }
          else if (k === full && part > 0.001) { s.style.background = "color-mix(in srgb, var(--x-accent) 30%, var(--x-ink) 20%)"; s.style.opacity = part.toFixed(3); }
          else { s.style.opacity = "0"; }
        });
        outline.style.borderColor = empty ? "var(--x-bad)" : "var(--x-dim)";
        counter.textContent = String(full);
        counter.style.color = empty ? "var(--x-bad)" : "var(--x-ink)";
        if (capEl) capEl.textContent = CAPS[t < pB ? 0 : t < pE && !(q && !q.ok) ? 1 : 2];
        if (logRows.length) {
          const shown = log.slice(Math.max(0, i - 5), i + 1);
          logRows.forEach((row, k) => {
            const e = shown[k];
            if (!e) { row.textContent = ""; return; }
            row.innerHTML = "";
            mk("span", "direction:ltr;unicode-bidi:isolate", row, `${(e.t - at).toFixed(2)}s`);
            mk("span", "color:var(--x-ink)", row, `${words.req} ${e.n}`);
            mk("span", `color:${e.ok ? "var(--x-good)" : "var(--x-bad)"}`, row, e.ok ? words.ok : words.no);
            mk("span", "", row, `${Math.floor(e.after + 1e-9)} ${words.left}`);
          });
        }
      },
    };
  },
});
