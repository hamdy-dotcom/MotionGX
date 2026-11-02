// Ball glyph: an accent ball becomes part of a letter — or leaves it. The glyph part is our own accent shape over the
// word: the letter is set dotless (ı / ȷ) for a tittle, or kept as a transparent gap for an O, and the real glyph is
// measured on a canvas in the word's own font so the ball lands exactly where the font draws its dot or its bowl.
//   lands-as-tittle — the ball travels in on an arc (bouncing `bounces` times along the tittle line), shrinks to the
//                     dot's size and lands with a 0.08 s squash while the word's letters blur-slide in from the left.
//   lands-as-o      — the ball falls (stretched along its speed, the motion blur of a shape), squashes on the baseline,
//                     bounces, then opens into a ring matching the font's O (stroke thins, the hole opens in 0.25 s);
//                     the neighbouring letters nudge on impact.
//   tittle-detaches — the dot squashes on the stem (scaleY .7, 0.1 s), launches up ~0.8 em (power2.out 0.25 s,
//                     stretched 1.3), falls back and bounces at 55 % height, then stays, hops off frame or jumps to the
//                     next element.
// Letters are split, so Arabic (whose letters join, and has no tittles) is not offered this move.
// Source: prompt-motion ghinaiya-nirmal-motion-designers-are-cooked, leonkohli-opus-5-5-is-crazy, ultimaxbt-bbebf5
// (reference) — our own code.
ML.define({
  id: "text-emphasis.ball-glyph",
  category: "text-emphasis",
  name: "Ball becomes part of a letter (or leaves it)",
  does: "A bouncing accent ball lands as a letter's O or the dot of an i — or the i-dot pops off and bounces away as a ball.",
  says: ["brand", "playful", "reveal", "connection", "transition"],
  energy: 4,
  targets: ["word", "logo", "shape"],
  duration: [1, 3],
  params: {
    mode: { type: "choice", options: ["lands-as-o", "lands-as-tittle", "tittle-detaches"], default: "lands-as-tittle" },
    glyph: { type: "text", default: "i" },
    bounces: { type: "number", range: [0, 3], default: 2 },
    persist: { type: "bool", default: true },
    exit: { type: "choice", options: ["off-frame", "to-next-element", "stay"], default: "stay" },
  },
  pairs: ["text-in.punchline", "text-emphasis.accent-word"],
  avoid: ["luxury", "calm"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land",
  source: { from: "prompt-motion:ghinaiya-nirmal-motion-designers-are-cooked", license: "reference", note: "our own rebuild; also leonkohli-opus-5-5-is-crazy, ultimaxbt-bbebf5" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const NS = "http://www.w3.org/2000/svg";
    const ringMode = p.mode === "lands-as-o";
    // the letter: the asked glyph if the word has it, else the first i / j (tittle) or o (ring)
    const want = String(p.glyph || "").trim().charAt(0);
    const ok = ringMode ? /[oO0]/ : /[ij]/;
    const chars = ML.split(el, "chars");
    if (!chars.length) return null;
    const pick = (re) => chars.find((c) => re.test(c.textContent));
    let host = (want && ok.test(want) && pick(new RegExp(want.replace(/[^\w]/g, "\\$&")))) || pick(ok) || null;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const cs = getComputedStyle(host || el);
    const fs = parseFloat(cs.fontSize) || 56;
    const er = el.getBoundingClientRect(), k = er.width / (el.offsetWidth || 1) || 1;
    const local = (r) => ({ x: (r.left - er.left) / k - el.clientLeft, y: (r.top - er.top) / k - el.clientTop, w: r.width / k, h: r.height / k });
    // the ink of one glyph in this font, relative to its origin (left edge) and baseline
    const inkOf = (ch) => {
      const W = Math.ceil(fs * 2), cv = document.createElement("canvas"); cv.width = W; cv.height = W;
      const g = cv.getContext("2d"); g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; g.fillStyle = "#000"; g.textBaseline = "alphabetic";
      const ox = fs * 0.5, by = fs * 1.5; g.fillText(ch, ox, by);
      const d = g.getImageData(0, 0, W, W).data, ink = (x, y) => d[(y * W + x) * 4 + 3] > 110;
      const rowHas = (y) => { for (let x = 0; x < W; x++) if (ink(x, y)) return true; return false; };
      let top = 0; while (top < W && !rowHas(top)) top++;
      let bot = W - 1; while (bot > top && !rowHas(bot)) bot--;
      let first = top; while (first <= bot && rowHas(first)) first++; // the end of the first blob (the tittle)
      const cols = (y0, y1) => { let a = W, b = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { a = Math.min(a, x); b = Math.max(b, x); } return [a, b]; };
      const [l, r] = cols(top, first), [L, R] = cols(top, bot + 1);
      let sw = 0; const my = Math.round((top + bot) / 2); for (let x = L; x <= R && ink(x, my); x++) sw++;
      return { dot: { x: (l + r + 1) / 2 - ox, y: (top + first) / 2 - by, r: Math.max(first - top, r - l + 1) / 2 }, box: { x: L - ox, y: top - by, w: R - L + 1, h: bot - top + 1 }, sw: Math.max(2, sw) };
    };
    const baselineOf = (span) => { const pr = document.createElement("i"); Object.assign(pr.style, { display: "inline-block", width: "0", height: "0", verticalAlign: "baseline" }); span.append(pr); const y = local(pr.getBoundingClientRect()).y; pr.remove(); return y; };
    // geometry: where the dot / ring sits (el px)
    let G, orig = host ? host.textContent : "";
    if (host) {
      const hb = local(host.getBoundingClientRect()), base = baselineOf(host);
      const ink = inkOf(orig);
      if (ringMode) G = { cx: hb.x + ink.box.x + ink.box.w / 2, cy: base + ink.box.y + ink.box.h / 2, rx: ink.box.w / 2, ry: ink.box.h / 2, sw: ink.sw, ground: base + ink.box.y + ink.box.h };
      else G = { cx: hb.x + ink.dot.x, cy: base + ink.dot.y, r: ink.dot.r };
    } else {
      // no such letter: the ball lands as a full stop after the word
      const last = chars[chars.length - 1], lb = local(last.getBoundingClientRect()), base = baselineOf(last), r = fs * 0.075;
      G = ringMode ? { cx: lb.x + lb.w + fs * 0.3, cy: base - fs * 0.27, rx: fs * 0.27, ry: fs * 0.27, sw: fs * 0.1, ground: base } : { cx: lb.x + lb.w + fs * 0.15, cy: base - r, r };
    }
    const dotless = orig === "i" ? "ı" : orig === "j" ? "ȷ" : orig;
    const svg = document.createElementNS(NS, "svg");
    Object.assign(svg.style, { position: "absolute", left: "0", top: "0", width: "1px", height: "1px", overflow: "visible", pointerEvents: "none", zIndex: "5" });
    const ball = document.createElementNS(NS, "ellipse");
    ball.style.fill = "var(--x-accent)"; ball.style.stroke = "var(--x-accent)";
    svg.append(ball); el.append(svg);
    // the next element (for exit to-next-element) in el px
    let next = null;
    for (let n = el; n && n !== stage && !next; n = n.parentElement) { let s = n.nextElementSibling; if (s && s.offsetWidth) { for (let d = 0; d < 1 && s.firstElementChild && s.firstElementChild.offsetWidth; d++) s = s.firstElementChild; next = local(s.getBoundingClientRect()); } }
    const sb = local(stage.getBoundingClientRect());
    // ── hops: a fall from H over T0, then n bounces at 55 % of the last height (pure in tau) ──
    const nB = Math.round(ML.clamp(p.bounces, 0, 3));
    const hops = (tau, H, T0, n) => {
      if (tau < 0) return { h: H, v: 0, since: 1e3, done: false, n: -1 };
      if (tau < T0) { const u = tau / T0; return { h: H * (1 - u * u), v: (2 * u * H) / T0, since: 1e3, done: false, n: 0 }; }
      let t0 = T0;
      for (let i = 1; i <= n; i++) {
        const d = 2 * T0 * Math.sqrt(Math.pow(0.55, i)), hi = H * Math.pow(0.55, i);
        if (tau < t0 + d) { const u = (tau - t0) / d * 2 - 1; return { h: hi * (1 - u * u), v: Math.abs((2 * u * hi) / (d / 2)), since: tau - t0, done: false, n: i }; }
        t0 += d;
      }
      return { h: 0, v: 0, since: tau - t0, done: true, n: n + 1, total: t0 };
    };
    const totalOf = (T0, n) => { let s = T0; for (let i = 1; i <= n; i++) s += 2 * T0 * Math.sqrt(Math.pow(0.55, i)); return s; };
    const squashOf = (since) => (since < 0.1 ? 0.3 * (1 - since / 0.1) : 0);
    const put = (cx, cy, rx, ry, sw, fill) => {
      ball.setAttribute("cx", cx.toFixed(2)); ball.setAttribute("cy", cy.toFixed(2));
      ball.setAttribute("rx", Math.max(0, rx).toFixed(2)); ball.setAttribute("ry", Math.max(0, ry).toFixed(2));
      ball.style.strokeWidth = sw.toFixed(2); ball.style.fillOpacity = fill ? "1" : "0";
    };
    const start = at + 0.1;
    const fade = p.persist ? Infinity : end - 0.35;
    // ── lands-as-tittle ──
    if (p.mode === "lands-as-tittle") {
      const T0 = 0.34, H = fs * 1.5, Tt = totalOf(T0, nB), x0 = G.cx - fs * 2.6;
      const rB = G.r * 1.8;
      ctx.sfx(start + Tt, "land", 0.4);
      for (let i = 1; i <= nB; i++) ctx.sfx(start + totalOf(T0, i - 1), "land.light", 0.18);
      return {
        draw(t) {
          if (host) host.textContent = t >= fade + 0.3 ? orig : dotless;
          chars.forEach((c, i) => {
            const s = at + 0.05 + i * 0.04, u = ML.out(t, s, s + 0.35);
            c.style.opacity = u.toFixed(4);
            c.style.translate = u < 1 ? `${(-(1 - u) * fs * 0.35).toFixed(2)}px 0` : "none";
            c.style.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(2)}px)` : "none";
          });
          const tau = t - start, hp = hops(tau, H, T0, nB);
          if (tau < 0 || t >= fade + 0.3) { put(G.cx, G.cy, 0, 0, 0, true); return; }
          const prog = ML.clamp(tau / Tt), r = rB + (G.r - rB) * ML.out(t, start, start + Tt);
          const x = x0 + (G.cx - x0) * (1 - Math.pow(1 - prog, 1.4));
          const sq = hp.done ? (hp.since < 0.08 ? 0.3 * (1 - hp.since / 0.08) : 0) : squashOf(hp.since);
          const st = Math.min(0.35, hp.v / (fs * 14)); // stretch with speed
          const ry = r * (1 - sq + st), rx = r * (1 + sq * 0.6 - st * 0.4);
          const shrink = 1 - ML.ease(t, fade, fade + 0.3);
          put(x, G.cy + r - ry - hp.h, rx * shrink, ry * shrink, 0, true);
        },
      };
    }
    // ── lands-as-o ──
    if (ringMode) {
      const T0 = 0.42, H = fs * 2.2, Tt = totalOf(T0, nB), rB = Math.min(G.rx, G.ry) * 0.62;
      const tLand = start + Tt;
      const ci = chars.indexOf(host), nb = [chars[ci - 1], chars[ci + 1]];
      ctx.sfx(start + T0, "land.light", 0.3);
      ctx.sfx(tLand + 0.05, "pop.soft", 0.3);
      return {
        draw(t) {
          if (host) { host.style.color = t >= fade + 0.3 ? "" : "transparent"; host.textContent = orig; }
          chars.forEach((c) => { c.style.opacity = "1"; c.style.filter = "none"; c.style.translate = "none"; });
          // neighbours nudge on the first impact
          const imp = start + T0, nk = t >= imp ? Math.exp(-(t - imp) / 0.08) * Math.sin(Math.min(Math.PI, (t - imp) / 0.25 * Math.PI)) : 0;
          nb.forEach((c, j) => { if (c && c !== host) c.style.translate = nk ? `${((j ? 1 : -1) * fs * 0.06 * nk).toFixed(2)}px 0` : "none"; });
          const tau = t - start;
          if (tau < 0 || t >= fade + 0.3) { put(G.cx, G.cy, 0, 0, 0, true); return; }
          const shrink = 1 - ML.ease(t, fade, fade + 0.3);
          if (t < tLand + 0.06) {
            const hp = hops(tau, H, T0, nB), sq = squashOf(hp.since), st = Math.min(0.45, hp.v / (fs * 12));
            const ry = rB * (1 - sq + st), rx = rB * (1 + sq * 0.6 - st * 0.4);
            // a filled disc = an ellipse of half the radius with a stroke as wide as the radius
            put(G.cx, G.ground - ry - hp.h, rx / 2, ry / 2, (rx + ry) / 2, true);
            return;
          }
          // open into the ring: centre rises to the bowl, stroke thins, the hole opens
          const m = ML.out(t, tLand + 0.06, tLand + 0.31);
          const rx0 = rB, ry0 = rB, cy0 = G.ground - rB, sw = rB + (G.sw - rB) * m;
          const rx = (rx0 + (G.rx - rx0) * m) - sw / 2, ry = (ry0 + (G.ry - ry0) * m) - sw / 2;
          put(G.cx, cy0 + (G.cy - cy0) * m, rx * shrink, ry * shrink, sw * shrink, false);
        },
      };
    }
    // ── tittle-detaches ──
    const L = fs * 0.8, tUp = start + 0.1, tTop = tUp + 0.25, tDown = tTop + 0.25;
    const Tb = totalOf(0.25, nB) - 0.25, tRest = tDown + Tb; // bounces after the fall
    const tExit = tRest + 0.15, dExit = 0.5;
    let goal = null;
    if (p.exit === "to-next-element" && next) goal = { x: next.x + next.w / 2, y: next.y - G.r };
    else if (p.exit === "off-frame" || (p.exit === "to-next-element" && !next)) goal = { x: sb.x + sb.w + G.r * 4, y: G.cy + fs * 0.6 };
    ctx.sfx(tUp, "pop.soft", 0.3);
    ctx.sfx(tDown, "land.light", 0.25);
    if (goal) ctx.sfx(tExit + dExit * (p.exit === "to-next-element" ? 1 : 0.4), p.exit === "to-next-element" ? "land" : "whoosh.soft", 0.3);
    return {
      draw(t) {
        if (host) host.textContent = t >= fade + 0.3 ? orig : dotless;
        chars.forEach((c) => { c.style.opacity = "1"; c.style.filter = "none"; c.style.translate = "none"; });
        const r = G.r, shrink = 1 - ML.ease(t, fade, fade + 0.3);
        if (t >= fade + 0.3) { put(G.cx, G.cy, 0, 0, 0, true); return; }
        let x = G.cx, y = G.cy, rx = r, ry = r;
        if (t < tUp) { const sq = 0.3 * ML.out(t, start, tUp); ry = r * (1 - sq); rx = r * (1 + sq * 0.5); y = G.cy + r - ry; }
        else if (t < tTop) { const u = ML.lin(t, tUp, tTop), h = L * (1 - (1 - u) * (1 - u)); const st = 0.3 * (1 - u); ry = r * (1 + st); rx = r * (1 - st * 0.4); y = G.cy - h; }
        else if (t < tDown) { const u = ML.lin(t, tTop, tDown), h = L * (1 - u * u); const st = 0.3 * u; ry = r * (1 + st); rx = r * (1 - st * 0.4); y = G.cy - h; }
        else if (t < tRest) {
          const hp = hops(t - tDown + 0.25, L, 0.25, nB), sq = squashOf(hp.since);
          ry = r * (1 - sq); rx = r * (1 + sq * 0.6); y = G.cy + r - ry - hp.h;
        } else if (goal && t >= tExit) {
          const u = ML.ease(t, tExit, tExit + dExit), arc = Math.sin(Math.PI * Math.min(1, u)) * fs * 0.9;
          x = G.cx + (goal.x - G.cx) * u; y = G.cy + (goal.y - G.cy) * u - arc;
          const v = Math.abs(Math.cos(Math.PI * u)); rx = r * (1 + 0.5 * (1 - v) * (u < 1 ? 1 : 0)); ry = r * (1 - 0.2 * (1 - v) * (u < 1 ? 1 : 0));
          if (u >= 1 && p.exit === "to-next-element") { const sq = squashOf(t - tExit - dExit); ry = r * (1 - sq); rx = r * (1 + sq * 0.6); y = goal.y + r - ry; }
        } else { const sq = squashOf(t - tRest); ry = r * (1 - sq); rx = r * (1 + sq * 0.6); y = G.cy + r - ry; }
        put(x, y, rx * shrink, ry * shrink, 0, true);
      },
    };
  },
});
