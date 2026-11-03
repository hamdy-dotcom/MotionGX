// Logo collapses into a seed: the wordmark's letters fall down out of a baseline mask (translateY 0 → 110 %, 0.3 s
// ease-in, 0.03 s apart from the far end), the icon scales to 0.5 and fades, and at the same time a small accent square
// (10 px) appears at the lockup's centre and holds — the seed the next animation grows from. Total ≈0.6 s. "rise"
// lifts the letters out through a cap-line mask instead; "scatter" throws them apart unmasked. Arabic wordmarks
// drop as whole words (joined letters are never split); the far end is then the left.
// SVG lockups are handled in place (their <text> becomes per-letter tspans moved by dy, clipped at the baseline).
// Source: prompt-motion "ddryo-loos-bgm-opus-5-5-lism-css" (reference only — rebuilt as our own code).
ML.define({
  id: "element.logo-collapse-to-seed",
  category: "element",
  name: "Logo collapses into a seed",
  does: "The logo lockup drops away letter by letter, leaving a tiny accent square that seeds the next animation.",
  says: ["transition", "brand", "change"],
  energy: 3,
  targets: ["logo"],
  duration: [0.5, 1],
  params: {
    exit: { type: "choice", options: ["drop", "rise", "scatter"], default: "drop" },
    seed: { type: "choice", options: ["square", "dot"], default: "square" },
    seed_size: { type: "number", range: [6, 24], default: 10, unit: "px" },
    stagger: { type: "number", range: [0.015, 0.06], default: 0.03, unit: "s" },
    hold: { type: "number", range: [0.1, 0.6], default: 0.2, unit: "s" },
  },
  pairs: ["element.line-collapse-to-dot", "transition.slash-wipe-to-dot"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "prompt-motion:ddryo-loos-bgm-opus-5-5-lism-css", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document, NS = "http://www.w3.org/2000/svg";
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const S = ctx.box(el);
    const isSvg = el.tagName.toLowerCase() === "svg";
    const st = ML.clamp(p.stagger, 0.015, 0.06), fallD = 0.3;
    const easeIn = (t, a, b) => { const x = ML.lin(t, a, b); return x * x * x; };
    let letters = [], icons = [], apply;
    if (isSvg) {
      const texts = [...el.querySelectorAll("text")];
      icons = [...el.children].filter((c) => !["text", "defs", "title", "desc", "clippath"].includes(c.tagName.toLowerCase()));
      // letters as tspans moved by dy (cumulative, so each one's dy is its offset minus the previous one's)
      const groups = texts.map((tx) => {
        const s = tx.textContent; const arabic = ML.ARABIC.test(s);
        const parts = arabic ? s.split(/(\s+)/).filter(Boolean) : Array.from(s);
        tx.textContent = "";
        const spans = parts.map((ch) => { const ts = doc.createElementNS(NS, "tspan"); ts.textContent = ch; tx.append(ts); return ts; });
        return { tx, spans };
      });
      // the baseline mask (or cap line for "rise"): a clip on each text, in its own units
      groups.forEach(({ tx }, gi) => {
        if (p.exit === "scatter") return;
        let b; try { b = tx.getBBox(); } catch (e) { return; }
        const y = +tx.getAttribute("y") || b.y + b.height * 0.8;
        const cp = doc.createElementNS(NS, "clipPath"), id = `ml-seed-clip-${gi}-${Math.round(S.x)}-${Math.round(S.y)}`;
        cp.setAttribute("id", id);
        const r = doc.createElementNS(NS, "rect");
        const desc = b.y + b.height - y;
        if (p.exit === "rise") { r.setAttribute("x", b.x - b.width); r.setAttribute("width", b.width * 3); r.setAttribute("y", b.y); r.setAttribute("height", b.height * 3); }
        else { r.setAttribute("x", b.x - b.width); r.setAttribute("width", b.width * 3); r.setAttribute("y", b.y - b.height * 2); r.setAttribute("height", b.height * 2 + (y - b.y) + desc); }
        cp.append(r); el.append(cp); tx.setAttribute("clip-path", `url(#${id})`);
      });
      letters = groups.flatMap(({ tx, spans }) => spans.map((s, i) => ({ s, tx, i, spans, h: (() => { try { return tx.getBBox().height; } catch (e) { return 30; } })() })));
      apply = (L, k, idx, t) => {
        const dist = L.h * 1.1, sc = p.exit === "scatter";
        const off = (j) => { const kk = kOf(j, t); return sc ? (ML.rnd(j, 5) - 0.5) * 2 * dist * kk : (p.exit === "rise" ? -1 : 1) * dist * kk; };
        const prev = L.i === 0 ? 0 : off(idx - 1);
        L.s.setAttribute("dy", (off(idx) - prev).toFixed(3));
        if (sc) { const prevX = L.i === 0 ? 0 : (ML.rnd(idx - 1, 9) - 0.5) * 2 * dist * kOf(idx - 1, t); L.s.setAttribute("dx", ((ML.rnd(idx, 9) - 0.5) * 2 * dist * k - prevX).toFixed(3)); L.s.setAttribute("fill-opacity", (1 - k).toFixed(4)); }
      };
    } else {
      icons = [...el.querySelectorAll("img, svg")];
      if (el.tagName === "IMG") icons = [el];
      const units = el.tagName === "IMG" ? [] : ML.split(el, "chars").filter((u) => !icons.some((i) => u.contains(i)));
      if (p.exit !== "scatter" && units.length) el.style.clipPath = p.exit === "rise" ? "inset(0 -50% -100vh -50%)" : "inset(-100vh -50% 0 -50%)";
      letters = units.map((s, i) => ({ s, i, h: ctx.box(s).h || S.h }));
      apply = (L, k, idx) => {
        const dist = L.h * 1.1;
        if (p.exit === "scatter") { L.s.style.translate = `${((ML.rnd(idx, 9) - 0.5) * 2 * dist * k).toFixed(2)}px ${((ML.rnd(idx, 5) - 0.5) * 2 * dist * k).toFixed(2)}px`; L.s.style.rotate = `${((ML.rnd(idx, 3) - 0.5) * 120 * k).toFixed(2)}deg`; L.s.style.opacity = (1 - k).toFixed(4); }
        else L.s.style.translate = `0 ${((p.exit === "rise" ? -1 : 1) * dist * k).toFixed(2)}px`;
      };
    }
    // the far end goes first: the last letter in reading order (for Arabic words the last word, which sits leftmost)
    const n = letters.length;
    const startOf = (j) => at + (n - 1 - j) * st;
    const kOf = (j, t) => easeIn(t, startOf(j), startOf(j) + fallD);
    const iconEnd = at + Math.max(0.3, (n - 1) * st + fallD);
    // the seed
    const sz = ML.clamp(p.seed_size, 6, 24) * (Math.min(f.W, f.H) / 1080) * 1.4;
    const seed = doc.createElement("div");
    seed.style.cssText = `position:absolute;left:${S.x + S.w / 2 - sz / 2}px;top:${S.y + S.h / 2 - sz / 2}px;width:${sz}px;height:${sz}px;background:var(--x-accent);border-radius:${p.seed === "dot" ? "50%" : "0"};pointer-events:none;z-index:7;transform:scale(0);`;
    host.append(seed);
    const seedIn = at + 0.12, holdEnd = Math.max(iconEnd + ML.clamp(p.hold, 0.1, 0.6), end - 0.12);
    ctx.sfx(at, "drop", 0.3);
    ctx.sfx(seedIn + 0.08, "blip", 0.3);
    return {
      draw(t) {
        letters.forEach((L, j) => apply(L, kOf(j, t), j, t));
        const ik = ML.ease(t, at, iconEnd);
        icons.forEach((ic) => {
          ic.style.opacity = (1 - ik).toFixed(4);
          if (isSvg && ic !== el) { ic.style.transformBox = "fill-box"; ic.style.transformOrigin = "50% 50%"; }
          ic.style.scale = (1 - 0.5 * ik).toFixed(4);
        });
        const s = t < seedIn ? 0 : ML.back(t, seedIn, seedIn + 0.18, 1.8);
        seed.style.transform = `scale(${Math.max(0, s).toFixed(4)})`;
        seed.style.opacity = (1 - ML.clamp((t - holdEnd) / 0.12)).toFixed(4);
      },
    };
  },
});
