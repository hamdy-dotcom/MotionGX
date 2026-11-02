// Page scroll with stops: a page taller than its window opens on its top at full width, scrolls down, stops on each
// named section — zooms in (0.45 s), holds (~1 s; the section comes alive 0.2 s after arriving: a ring and a small lift
// of its parts), zooms back to full width (0.35 s) — and ends held on the form / CTA. From +1.1 s the scroll time is
// shared out by distance; a stop scrolls to y = section centre − 45% of the view. When the shot is too short to scroll
// (less than 0.6 s a stop, or slower than 2500 px/s), it cut-zooms hero → each section evenly behind a 0.18 s flash.
// The window is the target screen (its [data-page] or its tall first child; sections are its [data-stop] parts, else
// its blocks); without one, a browser window in the picture area carries a skeleton page built from the look. The view
// is a 2D camera on the page (log-space zoom, eased cubic), capped at 2x and at a section's pictures' own pixels so
// nothing gets soft. The skeleton page reads in the film's direction (RTL mirrors it whole).
// Source: MotionGX lib/live-engine/worker/vendor/recipes.js R.pageTour (own).
ML.define({
  id: "camera.page-scroll-stops",
  category: "camera",
  name: "Page scroll with stops",
  does: "A tall page scrolls from its top, pausing to zoom in on each named section and ending on the form or CTA.",
  says: ["flow", "proof", "step"],
  energy: 2,
  targets: ["screen"],
  duration: [4, 15],
  params: {
    pause: { type: "number", range: [0.6, 1.4], default: 1, unit: "s" },
    zoom_in: { type: "number", range: [0.3, 0.6], default: 0.45, unit: "s" },
    fallback: { type: "choice", options: ["cut-zoom", "none"], default: "cut-zoom" },
  },
  pairs: ["camera.region-tour", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "own:lib/live-engine/worker/vendor/recipes.js", license: "own", note: "R.pageTour" },
  setup(ctx) {
    const { el, p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const own = el && el !== stage && el !== host ? el : null;
    const rtl = ctx.rtl;
    const div = (css, parent) => { const d = document.createElement("div"); d.style.cssText = css; if (parent) parent.append(d); return d; };

    // ── the window and its page ──
    let win, page, built = false;
    if (own) {
      win = own;
      if (getComputedStyle(win).position === "static") win.style.position = "relative";
      win.style.overflow = "hidden";
      page = win.querySelector("[data-page]") || (win.firstElementChild && win.firstElementChild.scrollHeight > win.clientHeight + 4 && win.children.length === 1 ? win.firstElementChild : null);
      if (!page) { page = div("position:relative"); while (win.firstChild) page.append(win.firstChild); win.append(page); }
    } else {
      // a browser window in the picture area, with a skeleton page built from the look
      built = true;
      const r = f.pic, w = Math.min(r.w, f.wide ? r.h * 1.5 : r.w), h = r.h;
      const shell = div(`position:absolute;left:${r.x + (r.w - w) / 2}px;top:${r.y}px;width:${w}px;height:${h}px;display:flex;flex-direction:column;overflow:hidden;z-index:5;direction:${rtl ? "rtl" : "ltr"}`, host);
      shell.className = "ml-panel";
      // the window takes the picture area: whatever else stood there would show around it
      host.querySelectorAll(".ml-pic").forEach((n) => { n.style.visibility = "hidden"; });
      const bar = div(`height:${Math.round(h * 0.055 + 14)}px;flex:none;background:var(--x-bar);border-bottom:var(--x-edge) solid var(--x-edge-color);display:flex;align-items:center;gap:10px;padding:0 20px`, shell);
      ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => div(`width:14px;height:14px;border-radius:50%;background:var(${v});opacity:var(--x-lights)`, bar));
      div("flex:1;height:44%;margin:0 18px;border-radius:var(--x-radius-s);background:var(--x-panel-2)", bar);
      win = div("position:relative;flex:1;overflow:hidden;background:var(--x-panel)", shell);
      page = div("position:relative", win);
    }
    const vw = win.clientWidth, vh = win.clientHeight;
    if (built) {
      const u = vw / 100, pad = `padding:${6 * u}px ${7 * u}px`;
      const bar = (wp, hp, bg = "var(--x-line)", extra = "") => `<div style="width:${wp}%;height:${hp * u}px;border-radius:${hp * u}px;background:${bg};${extra}"></div>`;
      const col = (inner, gap = 2.2) => `<div style="display:flex;flex-direction:column;gap:${gap * u}px;align-items:flex-start">${inner}</div>`;
      const card = (inner) => `<div class="ml-panel" style="flex:1;padding:${3.5 * u}px;box-shadow:none">${inner}</div>`;
      const dir = "row"; // row and flex-start already follow the window's direction
      page.innerHTML = `
<section style="${pad};min-height:${vh * 0.95}px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:${3 * u}px;background:linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 14%, var(--x-panel)), var(--x-panel))">
  ${col(bar(30, 2.4, "var(--x-accent)") + bar(86, 7, "var(--x-ink)") + bar(64, 7, "var(--x-ink)") + bar(70, 2.6) + bar(52, 2.6))}
  <div style="display:flex;gap:${2 * u}px;flex-direction:${dir}">${bar(34, 9, "var(--x-accent)")}${bar(26, 9, "var(--x-panel-2)")}</div>
</section>
<section data-stop style="${pad};box-sizing:border-box;display:flex;gap:${3 * u}px;flex-direction:${dir}">
  ${[0, 1, 2].map((i) => card(col(`<div style="width:${9 * u}px;height:${9 * u}px;border-radius:${2.4 * u}px;background:color-mix(in srgb, var(--x-accent) ${30 + i * 25}%, var(--x-panel))"></div>` + bar(80, 2.8, "var(--x-ink)") + bar(95, 1.8) + bar(70, 1.8)))).join("")}
</section>
<section style="${pad};box-sizing:border-box;display:flex;gap:${3 * u}px;flex-direction:${dir};background:var(--x-panel-2)">
  ${[0, 1, 2].map(() => col(bar(70, 8, "var(--x-ink)") + bar(90, 2))).map((x) => `<div style="flex:1">${x}</div>`).join("")}
</section>
<section data-stop style="${pad};box-sizing:border-box;display:flex;gap:${3 * u}px;flex-direction:${dir}">
  ${[0, 1].map((i) => card(col(bar(40, 2.4, i ? "var(--x-accent)" : "var(--x-dim)") + bar(56, 9, "var(--x-ink)") + bar(90, 1.8) + bar(84, 1.8) + bar(76, 1.8) + bar(100, 8, i ? "var(--x-accent)" : "var(--x-panel-2)")))).join("")}
</section>
<section style="${pad};box-sizing:border-box">${col(bar(100, 1.8) + bar(96, 1.8) + bar(88, 1.8) + bar(92, 1.8) + bar(60, 1.8), 2.4)}</section>
<section data-stop style="${pad};box-sizing:border-box;background:color-mix(in srgb, var(--x-accent) 8%, var(--x-panel))">
  ${col(bar(50, 5, "var(--x-ink)") + bar(70, 2.2) + `<div style="height:${2 * u}px"></div>` + bar(100, 10, "var(--x-panel)", "border:var(--x-edge) solid var(--x-edge-color)") + bar(100, 10, "var(--x-panel)", "border:var(--x-edge) solid var(--x-edge-color)") + bar(100, 11, "var(--x-accent)"), 2.6)}
</section>
<section style="${pad};box-sizing:border-box;min-height:${vh * 0.3}px;background:var(--x-panel-2)">${col(bar(30, 2) + bar(20, 2))}</section>`;
    }
    page.style.width = vw + "px";
    page.style.transformOrigin = "0 0";
    const ph = Math.max(vh, page.scrollHeight, page.offsetHeight);
    const maxY = Math.max(0, ph - vh);

    // ── the stops, in page coordinates ──
    const pr = page.getBoundingClientRect(), k = pr.width / (page.offsetWidth || 1) || 1;
    let stopEls = [...page.querySelectorAll("[data-stop]")];
    if (!stopEls.length) stopEls = [...page.children].filter((c) => c.offsetHeight > vh * 0.12).slice(1, 5);
    const stops = stopEls.map((n) => { const r = n.getBoundingClientRect(); return { n, x: (r.left - pr.left) / k, y: (r.top - pr.top) / k, w: r.width / k, h: r.height / k }; }).filter((b) => b.h > 0).sort((a, b) => a.y - b.y);
    const ZMAX = 2;
    // a section's raster pictures: never past their pixels
    const pixels = (n) => [...n.querySelectorAll("img")].reduce((c, i) => {
      if (!i.naturalWidth || /^data:image\/svg|\.svg(\?|$)/i.test(i.currentSrc || i.src)) return c;
      const q = i.getBoundingClientRect();
      return Math.min(c, (i.naturalWidth * k) / Math.max(1, q.width), (i.naturalHeight * k) / Math.max(1, q.height));
    }, ZMAX);
    const zoomOf = (b) => ML.clamp(Math.max(1.3, Math.min((vw * 0.92) / b.w, (vh * 0.9) / b.h)), 1, Math.max(1, pixels(b.n)));
    const yOf = (b) => ML.clamp(b.y + b.h / 2 - vh * 0.45, 0, maxY);
    const rest = (y) => ({ cx: vw / 2, cy: y + vh / 2, z: 1 });
    const focus = (b) => { const z = zoomOf(b), hw = vw / (2 * z), hh = vh / (2 * z); return { cx: ML.clamp(b.x + b.w / 2, hw, vw - hw), cy: ML.clamp(b.y + b.h / 2, hh, Math.max(hh, ph - hh)), z }; };

    // ── the schedule (R.pageTour) ──
    const keys = [{ t: -1e9, ...rest(0) }];
    const key = (t, s) => keys.push({ t, ...s });
    const alive = [], flashes = [];
    const ZIN = ML.clamp(p.zoom_in, 0.3, 0.6), ZOUT = 0.35;
    let PAUSE = ML.clamp(p.pause, 0.6, 1.4);
    const t0 = at + 1.1, tEnd = end - 0.1;
    const n = stops.length;
    if (!n) { if (maxY > 0) { key(t0, rest(0)); key(Math.max(t0 + 1, tEnd), rest(maxY)); } }
    else {
      const dist = stops.reduce((acc, b, i) => acc + Math.abs(yOf(b) - (i ? yOf(stops[i - 1]) : 0)), 0);
      let perStop = ZIN + PAUSE + ZOUT, scrollTime = tEnd - t0 - n * perStop;
      const fits = scrollTime >= Math.max(0.6 * n, dist / 2500);
      if (fits || p.fallback === "none") {
        let zin = ZIN, zout = ZOUT, pause = PAUSE;
        if (!fits) { // no cut-zoom: everything shares the time there is
          const room = Math.max(0.5, tEnd - t0), need = n * perStop + Math.max(0.6 * n, dist / 2500), sc = room / need;
          zin *= sc; zout *= sc; pause *= sc; perStop = zin + pause + zout; scrollTime = room - n * perStop;
        }
        let t = t0, y = 0;
        // every leg gets a floor, the rest of the scroll time goes by distance, so the legs sum exactly to scrollTime
        const legs = stops.filter((b, i) => Math.abs(yOf(b) - (i ? yOf(stops[i - 1]) : 0)) > 4).length;
        const floor = Math.min(fits ? 0.5 : 0.2, scrollTime / Math.max(1, legs)), free = Math.max(0, scrollTime - floor * legs);
        stops.forEach((b, i) => {
          const y1 = yOf(b), far = Math.abs(y1 - y) > 4, dt = far ? floor + (free * Math.abs(y1 - y)) / (dist || 1) : 0;
          if (far) { key(t, rest(y)); key(t + dt, rest(y1)); }
          t += dt; y = y1;
          key(t, rest(y)); key(t + zin, focus(b));
          ctx.sfx(t, "whoosh.soft", 0.18);
          alive.push({ b, from: t + 0.2, to: i < n - 1 ? t + zin + pause : Infinity });
          if (i < n - 1) { key(t + zin + pause, focus(b)); key(t + zin + pause + zout, rest(y)); t += perStop; }
        });
      } else {
        const slot = Math.max(0.1, (tEnd - t0) / n);
        stops.forEach((b, i) => {
          const a = t0 + i * slot;
          key(a, i ? focus(stops[i - 1]) : rest(0)); key(a, focus(b));
          flashes.push(a); ctx.sfx(a, "snap", 0.2);
          alive.push({ b, from: a + 0.2, to: i < n - 1 ? a + slot : Infinity });
        });
      }
    }
    keys.sort((a, b) => a.t - b.t);
    const camAt = (t) => {
      let i = keys.length - 1;
      while (i > 0 && keys[i].t > t) i--;
      const a = keys[i], b = keys[i + 1];
      if (!b || b.t === a.t) return a;
      const e = ML.ease(t, a.t, b.t);
      return { cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * e) };
    };
    const flash = div("position:absolute;inset:0;pointer-events:none;background:var(--x-panel);opacity:0;z-index:2", win);
    // what comes alive at each stop: its parts lift a little, and a ring marks it
    const parts = alive.map((s) => ({ ...s, kids: [...s.b.n.children].slice(0, 6) }));

    return {
      draw(t) {
        const c = camAt(t);
        page.style.transform = `translate(${(vw / 2 - c.cx * c.z).toFixed(2)}px, ${(vh / 2 - c.cy * c.z).toFixed(2)}px) scale(${c.z.toFixed(4)})`;
        let fl = 0;
        for (const a of flashes) if (t >= a) fl = Math.max(fl, 1 - ML.lin(t, a, a + 0.18));
        flash.style.opacity = fl.toFixed(4);
        for (const s of parts) {
          ML.ring(s.b.n, t, s.from, s.to, 6);
          s.kids.forEach((kd, j) => {
            const l = ML.pulse(t, s.from + 0.06 * j + 0.12, 0.1, 0.35);
            kd.style.translate = l > 0.002 ? `0 ${(-l * Math.min(10, vh * 0.012)).toFixed(2)}px` : "none";
          });
        }
      },
    };
  },
});
