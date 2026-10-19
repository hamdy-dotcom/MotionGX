/* Motion kit: small helpers the generated composition may call. Not scenes, not templates — just mechanics. */
(function () {
  const K = {};
  K.BPM = 120; K.BEAT = 0.5; K.BAR = 2;
  /** wrap each word of el in <span class="w"> so words can stagger in */
  K.split = (sel) => document.querySelectorAll(sel).forEach((root) => {
    // gradient text (background-clip:text) disappears on inline-block children, so each word gets the gradient itself
    const clipOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if ((cs.webkitBackgroundClip || cs.backgroundClip) === "text" && cs.backgroundImage !== "none") return cs; if (e === root) break; } return null; };
    const walk = (n) => [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const clip = clipOf(c.parentElement), f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((p) => {
          if (!p.trim()) { f.appendChild(document.createTextNode(p)); return; }
          const s = document.createElement("span"); s.className = "w"; s.style.display = "inline-block"; s.textContent = p;
          if (clip) Object.assign(s.style, { backgroundImage: clip.backgroundImage, backgroundSize: clip.backgroundSize, webkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", webkitTextFillColor: "transparent" });
          f.appendChild(s);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && !c.classList.contains("w")) walk(c);
    });
    walk(root);
  });
  /** white overlay flash at time t (needs nothing in the page) */
  K.flash = (tl, t, strength = 0.35) => {
    let f = document.getElementById("__flash");
    if (!f) { f = document.createElement("div"); f.id = "__flash"; Object.assign(f.style, { position: "absolute", inset: 0, background: "#fff", opacity: 0, pointerEvents: "none", zIndex: 999, mixBlendMode: "overlay" }); document.getElementById("stage").appendChild(f); }
    tl.fromTo(f, { opacity: strength }, { opacity: 0, duration: 0.45, ease: "power2.out" }, t);
  };
  /** pulse target on every beat between from and to (seconds) */
  K.pulse = (tl, target, from, to, vars = { scale: 1.04 }, every = 0.5) => { for (let t = from; t < to - 1e-6; t += every) tl.fromTo(target, vars, { ...Object.fromEntries(Object.keys(vars).map((k) => [k, k === "scale" ? 1 : k === "opacity" ? 1 : 0])), duration: every * 0.85, ease: "power2.out" }, t); };
  /** count a number up inside el */
  K.count = (tl, el, from, to, at, dur, fmt = (v) => Math.round(v).toLocaleString("en-US")) => { const o = { v: from }; tl.to(o, { v: to, duration: dur, ease: "power2.out", onUpdate: () => { document.querySelector(el).textContent = fmt(o.v); } }, at); };
  /** typewriter text into el */
  K.type = (tl, el, text, at, dur) => { const o = { c: 0 }; tl.to(o, { c: text.length, duration: dur, ease: "none", onUpdate: () => { document.querySelector(el).textContent = text.slice(0, Math.round(o.c)); } }, at); };
  // ---------- LIVE UI (real product screens embedded with data-clone) ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uiInfo = (ui) => { const el = typeof ui === "string" ? document.querySelector(ui) : ui; if (!el) throw new Error("K: no element " + ui); const m = (window.__clones || {})[el.dataset.clone]; if (!m) throw new Error("K: " + ui + " has no data-clone"); return { el, m, s: +el.dataset.scale, vw: +el.dataset.vw, vh: +el.dataset.vh, cam: el.querySelector(".ui-cam") }; };
  const boxOf = (m, target) => Array.isArray(target) ? target : target === "all" ? [0, 0, m.w, m.h] : String(target).startsWith("part:") ? m.parts[String(target).slice(5)] : m.keys[target];
  /** camera: move/zoom the live screen in `ui` so `target` (key "k12", "part:3", "all", or [x,y,w,h] in screen px) is centred. opts: zoom (number, default fits the target), dur, ease */
  K.focus = (tl, ui, target, at, opts = {}) => {
    const { m, s, vw, vh, cam } = uiInfo(ui); const box = boxOf(m, target);
    if (!box) { console.warn("K.focus: unknown target " + target + " in " + ui); return; }
    let z = opts.zoom != null ? opts.zoom : target === "all" ? vw / (m.w * s) : Math.min((vw * 0.92) / (box[2] * s), (vh * 0.9) / (box[3] * s));
    z = clamp(z, Math.min(opts.min || 0.3, opts.max || 4), opts.max || 4); // min: a floor (e.g. the zoom that keeps text readable)
    // bounds: the page's content box — the view stays on content (no empty page area below a short page); fill: a content box
    // shorter than the view zooms in until it fills the view's height
    const bb = opts.bounds;
    if (bb && opts.fill && bb[3] * s * z < vh * 0.98) z = clamp((vh * 0.98) / (bb[3] * s), z, opts.max || 4);
    const cw = m.w * s * z, ch = m.h * s * z;
    let x = vw / 2 - (box[0] + box[2] / 2) * s * z, y = vh / 2 - (box[1] + box[3] / 2) * s * z;
    if (target === "all") y = 0;
    if (bb) {
      x = bb[2] * s * z > vw ? clamp(x, vw - (bb[0] + bb[2]) * s * z, -bb[0] * s * z) : vw / 2 - (bb[0] + bb[2] / 2) * s * z;
      y = bb[3] * s * z > vh ? clamp(y, vh - (bb[1] + bb[3]) * s * z, -bb[1] * s * z) : vh / 2 - (bb[1] + bb[3] / 2) * s * z;
    }
    x = cw > vw ? clamp(x, vw - cw, 0) : (vw - cw) / 2; y = ch > vh ? clamp(y, vh - ch, 0) : (vh - ch) / 2;
    const d = opts.dur == null ? 0.8 : opts.dur;
    if (d <= 0) tl.set(cam, { x, y, scale: z, transformOrigin: "0 0" }, at); else tl.to(cam, { x, y, scale: z, transformOrigin: "0 0", duration: d, ease: opts.ease || "power3.inOut" }, at);
  };
  /** scroll the live screen like a real page: show it from screen-y `y` at width-fit zoom */
  K.scrollTo = (tl, ui, y, at, dur = 1.2) => { const { m, s, vh } = uiInfo(ui); K.focus(tl, ui, [0, y, m.w, vh / s], at, { zoom: 1, dur, ease: "power2.inOut" }); };
  const cur = () => { let c = document.getElementById("__cursor"); if (!c) { c = document.createElement("div"); c.id = "__cursor"; c.innerHTML = '<svg width="58" height="58" viewBox="0 0 24 24"><path d="M5 2.5l13.5 12.2-6.2.6 3.7 7.1-2.6 1.3-3.6-7.2L5 21z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>'; Object.assign(c.style, { position: "absolute", left: 0, top: 0, zIndex: 998, opacity: 0, pointerEvents: "none", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))" }); const r = document.createElement("div"); r.id = "__ripple"; Object.assign(r.style, { position: "absolute", left: 0, top: 0, width: "90px", height: "90px", margin: "-45px 0 0 -45px", borderRadius: "50%", border: "5px solid rgba(255,255,255,.95)", boxShadow: "0 0 30px rgba(255,255,255,.6)", zIndex: 997, opacity: 0, pointerEvents: "none" }); const st = document.getElementById("stage"); st.appendChild(r); st.appendChild(c); } return c; };
  const centerOf = (el) => { const st = document.getElementById("stage").getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - st.left + r.width / 2, r.top - st.top + r.height / 2]; };
  const keyEl = (ui, key) => { const el = (typeof ui === "string" ? document.querySelector(ui) : ui).querySelector(`[data-k="${key}"]`); if (!el) throw new Error("K: no key " + key + " in " + ui); return el; };
  /** press an element (scale punch + glow) */
  K.press = (tl, el, at) => { el = typeof el === "string" ? document.querySelector(el) : el; tl.to(el, { scale: 0.92, duration: 0.1, ease: "power2.in" }, at); tl.to(el, { scale: 1, duration: 0.3, ease: "back.out(3)" }, at + 0.1); };
  /** a pointer glides to key `key` of the live screen `ui` and taps it at time `at` (arrives at `at`). opts: from [x,y] stage px, dur */
  K.tap = (tl, ui, key, at, opts = {}) => {
    const c = cur(), rp = document.getElementById("__ripple"), el = keyEl(ui, key), d = opts.dur || 0.6, W = document.getElementById("stage").offsetWidth, H = document.getElementById("stage").offsetHeight;
    const from = opts.from || [W * 0.72, H * 0.9], o = { p: 0 };
    tl.set(c, { opacity: 1 }, at - d);
    tl.fromTo(o, { p: 0 }, { p: 1, duration: d, ease: "power2.inOut", immediateRender: false, onUpdate: () => { const [tx, ty] = centerOf(el); gsap.set(c, { x: from[0] + (tx - from[0]) * o.p - 6, y: from[1] + (ty - from[1]) * o.p - 4 }); } }, at - d);
    const q = { r: 0 };
    tl.fromTo(q, { r: 0 }, { r: 1, duration: 0.5, ease: "power2.out", immediateRender: false, onUpdate: () => { const [tx, ty] = centerOf(el); gsap.set(rp, { x: tx, y: ty, scale: 0.3 + q.r * 1.3, opacity: q.r < 1 ? 0.9 * (1 - q.r) : 0 }); } }, at);
    tl.to(c, { scale: 0.85, duration: 0.1, transformOrigin: "10% 10%" }, at); tl.to(c, { scale: 1, duration: 0.2 }, at + 0.1);
    K.press(tl, el, at);
    tl.to(c, { opacity: 0, duration: 0.25 }, at + (opts.hold || 0.6));
  };
  /** type into a live field (data-role=field): placeholder → typed text with a caret. text defaults to what was typed during capture */
  K.typeInto = (tl, ui, key, at, dur = 1.2, text) => {
    const el = keyEl(ui, key), v = el.querySelector(".uv"); if (!v) return;
    const t = text != null ? String(text) : el.dataset.val || v.textContent, ph = el.dataset.ph || "", o = { c: 0 };
    const draw = () => { const n = Math.round(o.c); if (n <= 0 && o.c < 0.01) { v.textContent = ph; v.style.color = el.dataset.phink || ""; } else { v.textContent = Array.from(t).slice(0, n).join("") + (o.c < Array.from(t).length ? "|" : ""); v.style.color = el.dataset.ink || ""; } };
    draw();
    tl.fromTo(o, { c: 0 }, { c: Array.from(t).length, duration: dur, ease: "none", immediateRender: false, onUpdate: draw }, at);
  };
  /** cut from one live screen to the next (e.g. before the click → the result) */
  K.swap = (tl, a, b, at, dur = 0.4) => { tl.to(a, { autoAlpha: 0, scale: 0.97, duration: dur, ease: "power2.in" }, at); tl.fromTo(b, { autoAlpha: 0, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: dur, ease: "power2.out" }, at + dur * 0.4); };

  /** register the timeline so the renderer can seek it frame by frame */
  K.done = (tl, duration) => {
    tl.to({}, { duration: 0.001 }, duration - 0.001);
    // a seek resolves once every flow-clip frame it switched to is decoded (render / QA screenshot the exact frame)
    window.__duration = duration; window.__seek = (t) => { tl.pause(); tl.seek(t, false); const w = (window.__clipImgs || []).filter((im) => !im.complete || !im.naturalWidth); return w.length ? Promise.all(w.map((im) => (im.decode ? im.decode().catch(() => null) : null))) : undefined; };
    window.__ready = Promise.all([document.fonts ? document.fonts.ready : null, ...[...document.images].map((im) => (im.complete ? null : im.decode().catch(() => null)))]).then(() => true);
    if (!/[?&]render/.test(location.search)) tl.play(0);
  };
  window.K = K;
})();
