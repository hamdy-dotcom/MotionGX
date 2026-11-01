/* MotionGX motion library — the runtime every move runs on (browser, no build step).
   One rule: every frame is a pure function of t, the film's seconds. The renderer calls window.__seek(t) once a frame
   and screenshots; nothing reads a clock, nothing is random, nothing carries state between frames. So a new voice
   retimes a film without animating anything again, and the same t always gives the same picture.
   Merged from: MengTo/Skills html-explainer-video (MIT: clock helpers, regions, show / ring / view / pointer / split /
   fit, look-driven motion), Rieranthony/product-film-skill (MIT: closed-form springs, camera on a world canvas, magic
   moves, punchline landing curve, cursor arcs) and MotionGX's own ads / studio engine (words as times, Arabic, SFX).

   A move:  ML.define({ id, category, …card, setup(ctx) { …once…; return { draw(t) { …every frame… } } } })
   ctx:     { el, els, stage, at, end, p (params, defaults filled), f (regions), look (its motion), rtl, words, word(),
              sfx(t, cue, vol), gsapAt(build) }
   A film:  ML.film({ duration, words, scenes: [{ el, from, to, moves: [{ move, target, at, end?, params }] }] }) */
(function (root) {
  "use strict";
  const doc = root.document;

  // ── time math (pure) ───────────────────────────────────────────────────────
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lin = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  /** cubic in-out */
  const ease = (t, a, b) => { const x = lin(t, a, b); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  /** cubic out: fast, settling */
  const out = (t, a, b) => 1 - Math.pow(1 - lin(t, a, b), 3);
  /** expo out: decelerating hard into place (words, cards landing) */
  const expo = (t, a, b) => { const x = lin(t, a, b); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); };
  /** overshoot a little, settle */
  const back = (t, a, b, c = 1.5) => { const x = lin(t, a, b) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
  /** any CSS cubic-bezier as a function of progress (Newton + bisection) */
  function bezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
    const at = (u, a, b) => ((A(a, b) * u + B(a, b)) * u + C(a)) * u, slope = (u, a, b) => 3 * A(a, b) * u * u + 2 * B(a, b) * u + C(a);
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) { const s = slope(u, x1, x2); if (Math.abs(s) < 1e-6) break; u -= (at(u, x1, x2) - x) / s; }
      if (u < 0 || u > 1) { let lo = 0, hi = 1; u = x; for (let i = 0; i < 30; i++) { const v = at(u, x1, x2); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = u; else hi = u; u = (lo + hi) / 2; } }
      return at(u, y1, y2);
    };
  }
  /** product-film's landing curve for punchlines: cubic-bezier(0.22, 1, 0.36, 1) */
  const landCurve = bezier(0.22, 1, 0.36, 1);
  const land = (t, a, b) => landCurve(lin(t, a, b));
  const mix = (t, a, b, from, to) => from + (to - from) * ease(t, a, b);
  /** a beat: rises to 1 at `at` over `up`, dies away over `down` */
  const pulse = (t, at, up = 0.08, down = 0.5) => (t < at ? Math.exp(-Math.pow((at - t) / up, 2)) : Math.exp(-(t - at) / down));
  const typed = (text, t, a, b) => { const chars = Array.from(text); return chars.slice(0, Math.round(chars.length * lin(t, a, b))).join(""); };
  const cue = (t, list, before) => list.reduce((v, [at, x]) => (t >= at ? x : v), before);
  const blink = (t, period = 1) => ((t % period) / period < 0.55 ? 1 : 0);
  /** 0–1, always the same for the same (i, k): nothing random on the stage */
  const rnd = (i, k = 1) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

  // ── springs (closed form, so a spring stays a pure function of t) — product-film kit ──
  function step(t, { stiffness = 150, damping = 20, mass = 1, clamp: c = false } = {}) {
    if (t <= 0) return 0;
    const w = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    let v;
    if (z < 1) { const d = w * Math.sqrt(1 - z * z); v = 1 - Math.exp(-z * w * t) * (Math.cos(d * t) + ((z * w) / d) * Math.sin(d * t)); }
    else if (z === 1) v = 1 - Math.exp(-w * t) * (1 + w * t);
    else { const d = w * Math.sqrt(z * z - 1); v = 1 - Math.exp(-z * w * t) * (Math.cosh(d * t) + ((z * w) / d) * Math.sinh(d * t)); }
    return c ? Math.min(v, 1) : v;
  }
  /** a value retargeted at each key [[time, value], …]: one spring per change, sorted by time */
  const track = (t, keys, cfg) => { let v = keys[0][1]; for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * step(t - keys[i][0], cfg); return v; };
  const critical = (response) => ({ stiffness: response * response, damping: 2 * response });
  const SPRING = { glide: { stiffness: 150, damping: 20 }, camera: { stiffness: 120, damping: 30, mass: 1.2 }, pop: { stiffness: 320, damping: 18 }, soft: { stiffness: 90, damping: 18 } };

  // ── camera on a world canvas (product-film): keys [[t, x, y, zoom]], zoom springs in log space ──
  function camera(t, keys, cfg = SPRING.camera) {
    return {
      x: track(t, keys.map((k) => [k[0], k[1]]), cfg),
      y: track(t, keys.map((k) => [k[0], k[2]]), cfg),
      zoom: Math.exp(track(t, keys.map((k) => [k[0], Math.log(k[3])]), cfg)),
    };
  }
  const worldTransform = (cam, W, H) => `translate(${W / 2}px, ${H / 2}px) scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)`;

  // ── magic move: one element travels between two rects on a spring (product-film) ──
  const moveRect = (t, start, a, b, cfg = SPRING.glide) => { const u = step(t - start, cfg); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u }; };
  /** content arriving after a move lands and leaving just before the next: a short blur swap */
  const swapIn = (t, from, to = Infinity, delay = 0.18, outD = 0.1) => { const e = clamp((t - from - delay) / 0.18), l = to === Infinity ? 0 : clamp((t - (to - outD)) / outD), v = e * (1 - l); return { o: v, blur: (1 - v) * 10 }; };

  // ── cursor path through timed stops (Catmull-Rom in time; held stops rest) — product-film ──
  function pathAt(stops, t, hold = []) {
    if (t <= stops[0].t) return { x: stops[0].x, y: stops[0].y };
    const last = stops[stops.length - 1]; if (t >= last.t) return { x: last.x, y: last.y };
    const i = stops.findIndex((s, k) => t >= s.t && t < stops[k + 1].t), p0 = stops[i], p1 = stops[i + 1];
    const vel = (k, ax) => { if (hold.includes(stops[k].t)) return 0; const a = stops[Math.max(0, k - 1)], b = stops[Math.min(stops.length - 1, k + 1)]; return (b[ax] - a[ax]) / (b.t - a.t || 1); };
    const span = p1.t - p0.t, u = (t - p0.t) / span;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const along = (ax) => h00 * p0[ax] + h10 * span * vel(i, ax) + h01 * p1[ax] + h11 * span * vel(i + 1, ax);
    return { x: along("x"), y: along("y") };
  }

  // ── words as times (Arabic-aware) ──────────────────────────────────────────
  const HARAKAT = /[ً-ْـ]/g;
  const plain = (w) => String(w).replace(HARAKAT, "").replace(/[.,،؛؟?!…:«»"'()]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
  /** words: [{ w, t, e }]. The time a word is spoken (first containing the needle, the n-th if asked), else a share of the span */
  function wordAt(words, needle, fallback, n = 1) {
    const q = plain(needle);
    if (q) { let k = 0; for (const x of words || []) if (plain(x.w).includes(q) && ++k === n) return x.t; }
    return fallback;
  }

  // ── regions per shape (explainer frameOf, + 4:5; short side 1080) ──────────
  const SHAPES = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
  /** m side margin, head the headline band, pic what's left for the picture; at: top | bottom | side (side → top on tall / square) */
  function frameOf(shape = "9:16", at = "top", headH0 = 0, m0 = 0) {
    const [W, H] = SHAPES[shape] || SHAPES["9:16"], tall = H > W * 1.4, wide = W / H > 1.5, square = !tall && !wide;
    const m = m0 || (wide ? 96 : tall ? 64 : 72);
    const place = at === "side" && !wide ? "top" : at === "bottom" || at === "side" ? at : "top";
    const topY = tall ? 210 : wide ? 72 : 96; // a phone's own buttons cover the top and bottom of 9:16
    const headH = headH0 ? headH0 * (tall ? 1.55 : wide ? 1.2 : 1) : tall ? 300 : wide ? 180 : 220;
    const foot = tall ? 300 : wide ? 96 : 110, room = W - m * 2;
    let head, pic;
    if (place === "side") { const col = 620; head = { x: m, y: topY, w: col, h: H - topY - foot }; pic = { x: m + col + 56, y: topY, w: room - col - 56, h: H - topY - foot }; }
    else if (place === "bottom") { head = { x: m, y: H - foot - headH, w: room, h: headH }; pic = { x: m, y: topY, w: room, h: H - foot - headH - 32 - topY }; }
    else { head = { x: m, y: topY, w: room, h: headH }; pic = { x: m, y: topY + headH + 24, w: room, h: H - topY - headH - 24 - foot }; }
    return { W, H, shape, tall, wide, square, at: place, m, head, pic, safe: { x: m, y: topY, w: room, h: H - topY - foot } };
  }

  // ── looks: the motion a look asks for (--x-motion, --x-motion-dur, --x-motion-dist) ──
  const motions = new Map();
  function motionOf(el) {
    const host = (el && el.closest && el.closest("[data-look]")) || doc.documentElement, key = host.getAttribute("data-look") || "";
    if (!motions.has(key)) {
      const cs = root.getComputedStyle(host);
      motions.set(key, { kind: cs.getPropertyValue("--x-motion").trim() || "rise", dur: parseFloat(cs.getPropertyValue("--x-motion-dur")) || 0.55, dist: parseFloat(cs.getPropertyValue("--x-motion-dist")) || 28 });
    }
    return motions.get(key);
  }
  /** brings el in at `at` and out from `leave` the way its look moves (rise, fade, snap, wipe, blur, spring, slide, scale) */
  function show(el, t, at, leave = Infinity, o = {}) {
    if (!el) return 0;
    const m = { ...motionOf(el), ...o }, gone = 0.22, dur = o.dur ?? m.dur, rtl = isRtl(el);
    if (t < at - 1e-6 || t > leave + gone) { el.style.visibility = "hidden"; return 0; }
    el.style.visibility = "visible";
    let p, q = ease(t, leave, leave + gone), o1 = 1, tx = 0, ty = 0, sc = 1, clip = "none", blur = 0;
    switch (m.kind) {
      case "snap": p = back(t, at, at + dur, 2); q = t >= leave ? 1 : 0; sc = 0.94 + 0.06 * p; ty = (1 - p) * m.dist * 0.6; o1 = q ? 0 : 1; break;
      case "wipe": p = ease(t, at, at + dur); { const a = (1 - p) * 110 - 5, b = q * 110 - 5; clip = rtl ? `inset(-20% ${b}% -20% ${a}%)` : `inset(-20% ${a}% -20% ${b}%)`; } break;
      case "fade": p = ease(t, at, at + dur); o1 = p * (1 - q); ty = (1 - p) * m.dist * 0.3; break;
      case "blur": p = land(t, at, at + dur); o1 = p * (1 - q); ty = (1 - p) * m.dist; blur = (1 - p) * 16 + q * 12; break;
      case "spring": p = step(t - at, SPRING.pop); o1 = Math.min(1, lin(t, at, at + 0.12)) * (1 - q); sc = 0.85 + 0.15 * p; break;
      case "slide": p = expo(t, at, at + dur); o1 = Math.min(1, p * 1.6) * (1 - q); tx = (1 - p) * m.dist * 2 * (rtl ? -1 : 1); break;
      case "scale": p = out(t, at, at + dur); o1 = p * (1 - q); sc = 1.12 - 0.12 * p; break;
      default: p = expo(t, at, at + dur); o1 = Math.min(1, p * 1.5) * (1 - q); ty = (1 - p) * m.dist - q * m.dist * 0.5;
    }
    el.style.opacity = o1.toFixed(4);
    el.style.translate = tx || ty ? `${tx.toFixed(2)}px ${ty.toFixed(2)}px` : "none";
    el.style.scale = sc === 1 ? "none" : sc.toFixed(4);
    el.style.clipPath = clip;
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    return p * (1 - q);
  }
  /** a highlight that fits what it marks: a thin line with even clear space (never a band) */
  function ring(el, t, at, leave = Infinity, gap = 5) {
    if (!el) return;
    const a = ease(t, at, at + 0.22) * (1 - ease(t, leave, leave + 0.22));
    el.style.outline = a > 0.004 ? `var(--x-ring-w, 2px) solid color-mix(in srgb, var(--x-ring, var(--x-accent)) ${(a * 100).toFixed(1)}%, transparent)` : "none";
    el.style.outlineOffset = `${gap}px`;
  }
  /** a view of el inside its parent along stops [[from, to, { x, y, s, ax?, ay? }], …] (shares of el / the parent) */
  function view(el, t, stops) {
    if (!el) return;
    const W = el.offsetWidth, H = el.offsetHeight, P = el.parentElement, PW = P.clientWidth, PH = P.clientHeight;
    const pose = (p) => ({ s: p.s, x: PW * (p.ax ?? 0.5) - W * p.x * p.s, y: PH * (p.ay ?? 0.5) - H * p.y * p.s });
    let cur = pose(stops[0][2]);
    for (const [a, b, p] of stops) { if (t <= a) break; const q = pose(p), e = ease(t, a, b); cur = { s: cur.s + (q.s - cur.s) * e, x: cur.x + (q.x - cur.x) * e, y: cur.y + (q.y - cur.y) * e }; if (t < b) break; }
    el.style.transformOrigin = "0 0";
    el.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px) scale(${cur.s.toFixed(4)})`;
  }

  // ── text: split into words, or letters where letters may stand alone (never Arabic: its letters join) ──
  const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const isRtl = (el) => (el && el.closest && el.closest("[dir]")?.getAttribute("dir") === "rtl") || (el && ARABIC.test(el.textContent || ""));
  /** wraps each word (or each letter) of el in a span once; returns the spans. Arabic words stay whole in "chars" mode */
  function split(el, by = "words") {
    if (!el) return [];
    const cls = by === "chars" ? "ml-c" : "ml-w";
    if (el.dataset.mlSplit === by) return [...el.querySelectorAll("." + cls)];
    el.dataset.mlSplit = by;
    const walk = (n) => {
      for (const c of [...n.childNodes]) {
        if (c.nodeType === 3) {
          const frag = doc.createDocumentFragment();
          for (const part of c.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const word = doc.createElement("span"); word.className = "ml-w"; word.style.display = "inline-block"; word.style.whiteSpace = "pre";
            if (by === "chars" && !ARABIC.test(part)) for (const ch of Array.from(part)) { const s = doc.createElement("span"); s.className = "ml-c"; s.style.display = "inline-block"; s.textContent = ch; word.append(s); }
            else { word.textContent = part; if (by === "chars") word.classList.add("ml-c"); }
            frag.append(word);
          }
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      }
    };
    walk(el);
    return [...el.querySelectorAll("." + cls)];
  }
  /** shrinks el's type until its widest line fits `max` px (in setup, after fonts) */
  function fit(el, max) {
    const size = parseFloat(root.getComputedStyle(el).fontSize), r = doc.createRange(); r.selectNodeContents(el);
    const k = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1, w = r.getBoundingClientRect().width / k;
    if (w > max) el.style.fontSize = ((size * max) / w).toFixed(2) + "px";
    return w > max ? (size * max) / w : size;
  }
  /** an element's box in stage px (measured as laid out now) */
  function box(el, stage) {
    const s = stage.getBoundingClientRect(), k = s.width / (stage.offsetWidth || 1) || 1, r = el.getBoundingClientRect();
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  }

  // ── the library ────────────────────────────────────────────────────────────
  const MOVES = new Map();
  /** registers a move: its card fields + setup(ctx) → { draw(t) } */
  function define(m) {
    if (!m || !m.id || typeof m.setup !== "function") throw new Error("ML.define: a move needs an id and setup()");
    MOVES.set(m.id, m);
    return m;
  }
  const defaults = (m, p = {}) => { const o = {}; for (const [k, d] of Object.entries(m.params || {})) o[k] = p[k] ?? d.default; return { ...o, ...p }; };

  // ── a film: scenes on one clock, moves on their words ─────────────────────
  const SFX = [];
  let live = [], film = null;
  /** o: { stage, duration, words, shape, scenes: [{ el, from, to, dissolve?, moves: [{ move, target, at, end?, params }] }] } */
  function makeFilm(o) {
    const stage = o.stage || doc.getElementById("stage");
    const f = frameOf(o.shape || stage.dataset.shape || "9:16", root.getComputedStyle(doc.documentElement).getPropertyValue("--x-head-at").trim() || "top");
    for (const [name, r] of [["head", f.head], ["pic", f.pic], ["safe", f.safe]]) for (const k of ["x", "y", "w", "h"]) stage.style.setProperty(`--${name}-${k}`, r[k] + "px");
    stage.style.setProperty("--W", f.W + "px"); stage.style.setProperty("--H", f.H + "px"); stage.style.setProperty("--m", f.m + "px");
    const words = o.words || [];
    film = { o, stage, f, words, scenes: o.scenes.map((s) => ({ ...s })) };
    return film;
  }
  /** resolves "start" | "end" | "word:<w>[#n]" | "<seconds into the scene>" against a scene */
  function timeOf(spec, s, words) {
    if (typeof spec === "number") return s.from + spec;
    const x = String(spec ?? "start");
    if (x === "start") return s.from + 0.15;
    if (x === "end") return s.to - 0.6;
    if (x.startsWith("word:")) { const [w, n] = x.slice(5).split("#"); return wordAt(words, w, s.from + 0.3, n ? +n : 1); }
    const v = parseFloat(x); return Number.isFinite(v) ? s.from + v : s.from + 0.15;
  }
  async function prepare() {
    if (doc.fonts) { await Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 15000))]); }
    await Promise.all([...doc.images].map((i) => (i.decode ? i.decode().catch(() => {}) : 0)));
    live = [];
    for (const s of film.scenes) {
      if (s.el) s.el.style.display = "block"; // moves measure themselves while shown
      const sfx = (t, name, vol = 0.5) => SFX.push({ t: +(+t).toFixed(3), src: name, vol });
      for (const mv of s.moves || []) {
        const m = MOVES.get(mv.move);
        if (!m) { console.warn("ML: unknown move", mv.move); continue; }
        const els = mv.target === "stage" ? [film.stage] : [...(s.el || film.stage).querySelectorAll(`[data-slot="${mv.target}"], ${/^[#.\[]/.test(mv.target) ? mv.target : "[data-none]"}`)];
        const at = timeOf(mv.at, s, film.words), end = mv.end != null ? timeOf(mv.end, s, film.words) : s.to;
        const ctx = { el: els[0] || null, els, stage: film.stage, scene: s.el, at, end, from: s.from, to: s.to, p: defaults(m, mv.params), f: film.f, look: motionOf(els[0] || film.stage), rtl: isRtl(els[0] || film.stage), words: film.words, word: (w, fb, n) => wordAt(film.words, w, fb ?? at, n), sfx, gsapAt, box: (e) => box(e, film.stage) };
        const inst = await m.setup(ctx);
        if (inst && inst.draw) live.push({ s, inst });
      }
      if (s.el) s.el.style.display = "none";
    }
  }
  /** a move built on a paused GSAP timeline (for GSAP's plugins): draw(t) seeks it to t − at, so it stays a function of t */
  function gsapAt(build) {
    if (!root.gsap) throw new Error("ML.gsapAt needs GSAP");
    const tl = root.gsap.timeline({ paused: true });
    build(tl);
    return (t, at) => tl.seek(Math.max(0, t - at), false);
  }
  function drawAt(t) {
    for (const s of film.scenes) {
      if (!s.el) continue;
      const d = s.dissolve || 0, on = t >= s.from - d / 2 && t < s.to + d / 2;
      s.el.style.display = on ? "block" : "none";
      if (on) s.el.style.opacity = d ? String(ease(t, s.from - d / 2, s.from + d / 2)) : "1";
    }
    for (const { s, inst } of live) if (t >= s.from - 0.5 && t < s.to + 0.5) inst.draw(t);
  }

  const ready = { done: false };
  root.ML = {
    // math
    clamp, lin, ease, out, expo, back, bezier, land, mix, pulse, typed, cue, blink, rnd,
    step, track, critical, SPRING, camera, worldTransform, moveRect, swapIn, pathAt,
    // words, regions, looks, drawing helpers
    plain, wordAt, SHAPES, frameOf, motionOf, show, ring, view, split, fit, box, isRtl, ARABIC,
    // the library
    define, moves: MOVES, defaults, gsapAt,
    film(o) {
      makeFilm(o);
      root.__duration = o.duration;
      root.__sfx = SFX;
      prepare().then(() => { drawAt(0); ready.done = true; root.__ready = true; });
      root.__seek = (t) => drawAt(Math.min(t, o.duration - 0.001));
      return film;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
