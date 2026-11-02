// Hero choreography in reading order: a hero (or a screen) assembles part by part with overlapping starts — the
// primary element first, secondaries after on a small stagger. The GSAP recipe, as closed forms of t:
//   timeline defaults power2.out 0.6 s · top label y −20 · headline lines y 30 at "−=overlap" · copy · the buttons /
//   chips scale 0.95 at "−=overlap"; the media block rises y 16–24 with autoAlpha, 0.8–1 s power3.out, its inner rows
//   staggered 0.06–0.15 s.
// container "phone": the framed-grid demo's phone-screen intro (easeOutQuart) — time block y 20 → 0 + fade 0.8 s at
// 0.1 s, visual band fade 0.8 s at 0.3 s, day row 0.8 s at 0.5 s, cards x 20 → 0 + fade 0.6 s at 0.6 + i·0.15 s —
// on the target screen's own rows, or on a phone this move builds in the picture region when there is none.
// The parts are found in the scene: the headline band (title lines, copy, labels) and the picture block (its rows;
// a row of chips or buttons is staggered). Cards slide in from the reading side (from the left in Arabic).
// Source: MengTo/Skills web-design/framed-grid-layout/demo (MIT, the phone intro) + gsap SKILL.md hero timeline (MIT)
// + animation-systems / cinematic-gsap-lenis-motion-system ordering rules (MIT).
ML.define({
  id: "element.hero-choreography",
  category: "element",
  name: "Hero choreography in reading order",
  does: "A hero or screen assembles in reading order - media, headline lines, copy, button (or time, visual band, row, cards inside a phone) - with overlapping starts.",
  says: ["arrival", "story", "simplicity", "tech"],
  energy: 2,
  targets: ["headline", "line", "image", "label", "card", "screen", "list"],
  duration: [1.2, 3],
  params: {
    order: { type: "choice", options: ["media-first", "text-first"], default: "media-first" },
    overlap: { type: "number", range: [0.1, 0.3], default: 0.2, unit: "s" },
    stagger: { type: "number", range: [0.04, 0.15], default: 0.08, unit: "s" },
    container: { type: "choice", options: ["frame", "phone"], default: "frame" },
  },
  pairs: ["text-in.punchline", "element.idle-float", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/framed-grid-layout/demo/index.html", license: "MIT", note: "with gsap SKILL.md's hero timeline and the animation-systems ordering rules (MIT); rewritten as closed forms of t" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const k = Math.min(f.W, f.H) / 1080;
    const scene = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const dir = rtl ? -1 : 1;
    // easing: power2.out (GSAP's power2 is cubic), power3.out / easeOutQuart (quartic)
    const p2 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 3);
    const p3 = (t, a, d) => 1 - Math.pow(1 - ML.lin(t, a, a + d), 4);
    const steps = []; // { els, at (relative), d, y, x, s, ease }
    const add = (els, o) => { els = (Array.isArray(els) ? els : [els]).filter(Boolean); if (els.length) steps.push({ els, y: 0, x: 0, s: 1, ease: p2, d: 0.6, ...o }); };

    // ── the parts ──
    const isText = (e) => e && !e.querySelector("img, svg, canvas, video") && e.children.length <= 1 && (e.textContent || "").trim().length > 0;
    const head = el && (el.closest(".ml-head") || (isText(el) ? el.parentElement : null));
    const textRoot = head || (el && isText(el) ? el : null);
    let mediaRoot = null;
    if (textRoot) mediaRoot = scene.querySelector(".ml-pic");
    else if (el) mediaRoot = el; // a screen, a card, a list: its own rows are the parts
    if (mediaRoot && textRoot && mediaRoot.contains(textRoot)) mediaRoot = null;

    // headline lines: the words grouped by the line they sit on (Arabic words stay whole)
    const lines = (e) => {
      const ws = ML.split(e, "words"), out = [];
      let top = null;
      ws.forEach((w) => { const y = Math.round(w.offsetTop); if (top === null || Math.abs(y - top) > 4) { out.push([]); top = y; } out[out.length - 1].push(w); });
      return out;
    };
    // a block's rows; a row of 3+ small siblings (chips, buttons, cards) is staggered as one group
    const rowsOf = (box) => {
      const out = [];
      for (const c of box.children) {
        if (c.offsetWidth === 0 && c.offsetHeight === 0) continue;
        const kids = [...c.children].filter((x) => x.offsetWidth > 0);
        if (kids.length >= 3 && kids.every((x) => x.offsetHeight < c.offsetHeight * 1.05 && x.offsetWidth < c.offsetWidth * 0.6)) out.push({ group: kids });
        else if (kids.length === 1 && kids[0].children.length >= 2 && c.offsetHeight > f.H * 0.2) out.push(...rowsOf(c)); // a wrapper: go into it
        else out.push({ one: c });
      }
      return out;
    };

    let phone = null;
    const textSteps = () => {
      if (!textRoot) return 0;
      const before = steps.length;
      const kids = textRoot === el && !head ? [el] : [...textRoot.children].filter((c) => c.offsetWidth > 0);
      const big = kids.reduce((m, c) => Math.max(m, parseFloat(getComputedStyle(c).fontSize) || 0), 0);
      kids.forEach((c) => {
        const fs = parseFloat(getComputedStyle(c).fontSize) || 0;
        if (c.matches(".ml-label") || fs < big * 0.4) add(c, { y: -20 * k, kind: "nav" }); // a top label drops in
        else if (fs >= big * 0.98) lines(c).forEach((ln, i) => add(ln, { y: 30 * k, kind: i ? "line+" : "title" }));
        else add(c, { y: 24 * k, kind: "copy" });
      });
      return steps.length - before;
    };
    const mediaSteps = () => {
      if (p.container === "phone" && !(el && /screen/.test(el.dataset.slot || "") && el.children.length >= 3)) {
        // no screen of its own: a phone in the picture region (time block, visual band, day row, cards)
        const R = f.pic;
        const ph = Math.min(R.h * 0.94, R.w * 0.9 * 2.05), pw = ph / 2.05;
        const cover = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;background:var(--x-ground);background-image:var(--x-ground-image);z-index:5;pointer-events:none;display:flex;align-items:center;justify-content:center;`, scene);
        const dev = mk("div", `position:relative;width:${pw}px;height:${ph}px;box-sizing:border-box;padding:${pw * 0.035}px;border-radius:calc(var(--x-device-radius) * ${(pw / 420).toFixed(3)});background:var(--x-device);box-shadow:var(--x-shadow);`, cover);
        const scr = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;border-radius:calc(var(--x-device-radius) * ${(pw / 420).toFixed(3)} - ${pw * 0.035}px);background:var(--x-ground);display:flex;flex-direction:column;gap:${pw * 0.045}px;padding:${pw * 0.14}px ${pw * 0.07}px ${pw * 0.07}px;box-sizing:border-box;direction:${rtl ? "rtl" : "ltr"};`, dev);
        const u = pw / 100;
        const time = mk("div", `display:grid;gap:${u * 1.2}px;`, scr);
        mk("div", `height:${(u * 3).toFixed(1)}px;width:30%;border-radius:9px;background:var(--x-dim);opacity:.55;`, time); // the date line
        mk("div", `font:var(--x-head-weight) ${(u * 15).toFixed(1)}px/1 var(--x-head-font);color:var(--x-ink);direction:ltr;text-align:${rtl ? "right" : "left"};`, time, "09:41");
        const band = mk("div", `flex:none;height:${u * 30}px;border-radius:min(var(--x-radius), ${(u * 7).toFixed(1)}px);background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));display:flex;align-items:flex-end;gap:${u * 2}px;padding:${u * 5}px;box-sizing:border-box;`, scr);
        for (let i = 0; i < 9; i++) mk("div", `flex:1;height:${(30 + 60 * ML.rnd(i, 23)).toFixed(0)}%;border-radius:${u}px;background:var(--x-accent-ink);opacity:.55;`, band);
        const day = mk("div", `display:flex;justify-content:space-between;`, scr);
        for (let i = 0; i < 7; i++) mk("div", `width:${u * 9}px;height:${u * 9}px;border-radius:50%;background:${i === 3 ? "var(--x-accent)" : "var(--x-panel)"};border:var(--x-edge) solid var(--x-edge-color);box-sizing:border-box;`, day);
        const cards = [];
        for (let i = 0; i < 3; i++) {
          const c = mk("div", `display:flex;align-items:center;gap:${u * 4}px;padding:${u * 4}px;border-radius:min(var(--x-radius), ${(u * 5).toFixed(1)}px);background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);`, scr);
          mk("div", `flex:none;width:${u * 10}px;height:${u * 10}px;border-radius:${u * 3}px;background:${i ? "var(--x-panel-2)" : "var(--x-accent)"};`, c);
          const tx = mk("div", `flex:1;display:grid;gap:${u * 2}px;`, c);
          mk("div", `height:${u * 3}px;width:${70 - i * 12}%;border-radius:9px;background:var(--x-ink);opacity:.8;`, tx);
          mk("div", `height:${u * 2.4}px;width:${45 + i * 8}%;border-radius:9px;background:var(--x-dim);opacity:.5;`, tx);
          cards.push(c);
        }
        phone = { cover, time, band, day, cards };
        return 1;
      }
      if (p.container === "phone" && el) {
        // the target screen's own rows on the phone timings
        const rows = rowsOf(el).map((r) => r.one || r.group[0]);
        phone = { time: rows[0], band: rows[1], day: rows[2], cards: rows.slice(3) };
        return 1;
      }
      if (!mediaRoot) return 0;
      const before = steps.length;
      // the frame / panel itself rises first, then its rows
      const panel = mediaRoot.children.length === 1 && mediaRoot.firstElementChild.children.length >= 2 ? mediaRoot.firstElementChild : mediaRoot;
      if (panel !== el) add(panel, { y: 24 * k, ease: p3, d: 0.9, kind: "media" });
      rowsOf(panel).forEach((r) => {
        if (r.group) add(r.group, { s: 0.95, y: 8 * k, kind: "cta", each: true });
        else add(r.one, { y: 16 * k, ease: p3, d: 0.8, kind: "row" });
      });
      return steps.length - before;
    };

    // ── reading order: the primary block first, the rest overlapping ──
    if (p.order === "text-first") { textSteps(); mediaSteps(); } else { mediaSteps(); textSteps(); }
    if (!steps.length && !phone) return null;

    // times: each step starts `overlap` before the previous one ends ("-=0.2"); inner rows of the media on the stagger
    let cursor = 0, phoneAt = null;
    const order = p.order === "text-first" ? ["text", "media"] : ["media", "text"];
    const timed = [];
    const placeGroup = (list) => {
      list.forEach((s, i) => {
        const inner = s.kind === "row" || s.kind === "cta" || s.kind === "line+";
        const prev = timed[timed.length - 1], lead = prev && (prev.kind === "media" || prev.kind === "nav") ? Math.max(p.stagger, 0.15) : p.stagger;
        const t0 = i === 0 ? cursor : inner ? prev.t + lead : cursor - p.overlap;
        if (s.each) s.els.forEach((e, j) => timed.push({ ...s, els: [e], t: t0 + j * p.stagger }));
        else timed.push({ ...s, t: t0 });
        cursor = Math.max(cursor, t0 + s.d + (s.each ? (s.els.length - 1) * p.stagger : 0));
      });
    };
    const textList = steps.filter((s) => ["nav", "title", "line+", "copy"].includes(s.kind));
    const mediaList = steps.filter((s) => !["nav", "title", "line+", "copy"].includes(s.kind));
    for (const g of order) {
      if (g === "media" && phone) { phoneAt = cursor; cursor += 0.9; continue; }
      const list = g === "text" ? textList : mediaList;
      if (!list.length) continue;
      if (cursor > 0) cursor -= p.overlap;
      placeGroup(list);
    }
    // the whole assembly fits before the scene's end
    const total = Math.max(cursor, phoneAt != null ? phoneAt + 0.6 + 0.15 * (phone.cards.length - 1) + 0.6 : 0);
    const room = Math.max(0.6, end - at - 0.4), fit = total > room ? room / total : 1;
    const T = (x) => at + x * fit;
    timed.forEach((s) => { s.t = T(s.t); s.d *= Math.min(1, fit * 1.2); });
    // the phone's own rows
    const phoneSteps = [];
    if (phone) {
      const pa = phoneAt ?? 0;
      if (phone.cover) phoneSteps.push({ els: [phone.cover], t: T(pa), d: 0.5, y: 0, x: 0, s: 1, ease: p3 });
      [[phone.time, 0.1, 0.8, 20], [phone.band, 0.3, 0.8, 0], [phone.day, 0.5, 0.8, 0]].forEach(([e, a, d, y]) => e && phoneSteps.push({ els: [e], t: T(pa + a), d: d * fit, y: y * k, x: 0, s: 1, ease: p3 }));
      phone.cards.forEach((e, i) => phoneSteps.push({ els: [e], t: T(pa + 0.6 + i * 0.15), d: 0.6 * fit, y: 0, x: 20 * k * dir, s: 1, ease: p3 }));
    }
    const all = [...timed, ...phoneSteps];
    ctx.sfx(at, "whoosh.soft", 0.3);
    const cta = timed.find((s) => s.kind === "cta");
    if (cta) ctx.sfx(cta.t, "pop.soft", 0.25);
    return {
      draw(t) {
        for (const s of all) {
          const u = s.ease(t, s.t, s.d);
          const o = t < s.t ? 0 : u;
          for (const e of s.els) {
            e.style.opacity = o.toFixed(4);
            e.style.visibility = o <= 0 ? "hidden" : "visible";
            const x = (1 - u) * s.x, y = (1 - u) * s.y, sc = s.s + (1 - s.s) * u;
            e.style.translate = Math.abs(x) + Math.abs(y) < 0.01 ? "none" : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
            e.style.scale = Math.abs(sc - 1) < 1e-4 ? "none" : sc.toFixed(4);
          }
        }
      },
    };
  },
});
