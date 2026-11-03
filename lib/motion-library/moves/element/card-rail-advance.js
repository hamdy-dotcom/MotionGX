// Snap card rail advance: a row of tall picture cards (aspect 4/5, an 8 px padded frame round an inner picture with a
// softer radius, a title and a muted caption below) sits with its first card in the hero spot at the leading edge and
// the rest running off the frame. On each step the track slides by exactly one card + gap (24 px) in 0.8 s
// power3.inOut, then holds; the card arriving in the hero spot grows 0.96 → 1 as it lands. Optional arrow buttons
// press (y −2 px) on each step. The hero sits at the edge the rail travels toward (in Arabic the right edge by default,
// the rail running leftwards). The cards are `items` ("title | caption; …"), several targets or a list's items, with
// the targets' pictures; sizes are stage px at a 1080 short side.
// Source: MengTo/Skills agent-skills/web-design/masked-reveal (MIT) — the card rail and its frame; the stepping is ours.
ML.define({
  id: "element.card-rail-advance",
  category: "element",
  name: "Snap card rail advance",
  does: "A row of tall picture cards slides by exactly one card and settles, bringing the next card into the hero position.",
  says: ["list", "choice", "flow"],
  energy: 2,
  targets: ["card", "image", "list"],
  duration: [1.5, 8],
  params: {
    direction: { type: "choice", options: ["left", "right"], default: "left" },
    steps: { type: "number", range: [1, 4], default: 2 },
    card_width: { type: "number", range: [320, 600], default: 476, unit: "px" },
    hold: { type: "number", range: [0.8, 2.5], default: 1.5, unit: "s" },
    arrow_press: { type: "bool", default: false },
    backdrop: { type: "bool", default: true },
    items: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "ui.card-carousel", "camera.push-in"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/masked-reveal", license: "MIT", note: "card frame from the demo; the one-card snap stepping is our own" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;
    const own = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const k = Math.min(f.W, f.H) / 1080;
    const R = f.pic;
    // the rail runs the full width of the frame (cards leave off the edge), in the picture band
    const layer = mk("div", `position:absolute;left:0;top:${R.y}px;width:${f.W}px;height:${R.h}px;pointer-events:none;z-index:6;overflow:hidden;`, host);
    const back = p.backdrop ? mk("div", "position:absolute;inset:0;background:var(--x-ground);", layer) : null;

    const given = String(p.items || "").split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => x.split("|").map((y) => y.trim()));
    const srcEls = ctx.els.length > 1 ? ctx.els : own && own.dataset.slot === "list" ? [...own.children] : [];
    const mine = given.length ? given : srcEls.map((c) => (c.textContent || "").trim()).filter(Boolean).map((x) => [x]);
    const hide = ctx.els.filter((e) => e !== ctx.stage); // the target is rebuilt as the cards: it never shows twice
    const pics = own ? ctx.els.flatMap((e) => (e.tagName === "IMG" ? [e] : [...e.querySelectorAll("img")])) : [];
    const picMax = Math.min(Infinity, ...pics.map((i) => i.naturalWidth || Infinity)); // never enlarged past its pixels
    const nGiven = mine.length || (pics.length > 1 ? pics.length : 0);
    let steps = Math.max(1, Math.min(nGiven ? nGiven - 1 : 4, Math.round(ML.clamp(p.steps, 1, 4))));
    const arrowsH = p.arrow_press ? 84 * k : 0;
    const capH = 0.34; // title + caption under the picture, as a share of the card width
    const cw = Math.min(p.card_width * k, (R.h - arrowsH - 24 * k) / (1.25 + capH), R.w * 0.78, picMax);
    const gap = 24 * k, pad = 8 * k, ch = cw * 1.25;
    // the frame stays full to the last step: a sample rail is long enough; a given one stops while its end still fills it
    const inFrame = Math.floor((f.W - R.x) / (cw + gap));
    if (nGiven) steps = Math.max(1, Math.min(steps, nGiven - inFrame));
    const n = nGiven ? Math.max(2, nGiven) : steps + inFrame + 2;
    const top = Math.max(0, (R.h - arrowsH - ch - cw * capH) / 2);

    // pictures: the targets' own (one per card, a lone one recropped), else look-coloured fields
    const T = rtl
      ? [["الأساسي", "للبداية"], ["المتقدم", "لفرق صغيرة"], ["الاحترافي", "للشركات"], ["المؤسسات", "تحكم كامل"], ["المخصص", "على مقاسك"], ["السنوي", "وفّر أكتر"], ["الطلاب", "خصم خاص"]]
      : [["Starter", "For getting going"], ["Plus", "For small teams"], ["Pro", "For growing companies"], ["Business", "Full control"], ["Custom", "Made to measure"], ["Yearly", "Save more"], ["Student", "A special rate"]];
    const track = mk("div", "position:absolute;left:0;top:0;", layer);
    const dir = (p.direction === "left" ? 1 : -1) * (rtl ? -1 : 1); // +1: the rail advances toward the start edge
    const heroX = dir > 0 ? R.x : f.W - R.x - cw; // the rail runs off the far edge, whichever way it travels
    const cards = Array.from({ length: n }, (_, i) => {
      const c = mk("div", `position:absolute;left:${heroX + i * (cw + gap) * dir}px;top:${top}px;width:${cw}px;transform-origin:50% 0;`, track);
      const frame = mk("div", `position:relative;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:${pad}px;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) + ${pad}px);box-shadow:var(--x-shadow);`, c);
      const inner = mk("div", `position:relative;width:100%;height:100%;overflow:hidden;border-radius:var(--x-pic-radius);background:linear-gradient(${150 + i * 23}deg, color-mix(in srgb, var(--x-accent) ${70 - i * 8}%, var(--x-panel-2)), color-mix(in srgb, var(--x-accent-2) ${45 + i * 7}%, var(--x-ink) ${Math.round(ML.rnd(i, 4) * 25)}%));`, frame);
      if (pics.length) {
        const im = pics[i % pics.length].cloneNode(true); im.removeAttribute("data-slot");
        im.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${(i * 37) % 100}% 50%;display:block;filter:var(--x-pic-filter);`;
        inner.append(im);
      } else {
        mk("div", `position:absolute;width:62%;aspect-ratio:1;border-radius:50%;left:${10 + ML.rnd(i, 2) * 40}%;top:${12 + ML.rnd(i, 3) * 40}%;background:color-mix(in srgb, var(--x-panel) 40%, transparent);`, inner);
        mk("div", `position:absolute;inset-inline-start:${pad * 2}px;bottom:${pad * 2}px;padding:${cw * 0.025}px ${cw * 0.05}px;border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-panel) 85%, transparent);font:var(--x-label-weight) ${cw * 0.045}px var(--x-label-font);letter-spacing:${rtl ? 0 : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-ink);`, inner, String(i + 1).padStart(2, "0"));
      }
      const [title, cap] = mine.length ? [mine[i][0], mine[i][1] || ""] : pics.length ? ["", ""] : T[i % T.length];
      mk("div", `margin-top:${cw * 0.05}px;padding:0 ${pad}px;font:var(--x-head-weight) ${cw * 0.1}px/1.15 var(--x-head-font);color:var(--x-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, c, title);
      mk("div", `margin-top:${cw * 0.015}px;padding:0 ${pad}px;font:var(--x-body-weight) ${cw * 0.07}px/1.3 var(--x-body-font);color:var(--x-dim);white-space:nowrap;`, c, cap);
      return c;
    });

    // arrows (optional): previous / next, the next one presses on each step
    let arrows = null;
    if (p.arrow_press) {
      const row = mk("div", `position:absolute;top:${R.h - arrowsH + 12 * k}px;${rtl ? `right:${R.x}px` : `left:${R.x}px`};display:flex;gap:${16 * k}px;`, layer);
      arrows = [0, 1].map((j) => {
        const b = mk("div", `width:${arrowsH - 20 * k}px;height:${arrowsH - 20 * k}px;border-radius:50%;display:grid;place-items:center;background:${j ? "var(--x-ink)" : "var(--x-panel)"};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);`, row);
        const s = (arrowsH - 20 * k) * 0.4, flip = (j ? 1 : -1) * (rtl ? -1 : 1);
        b.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" style="transform:scaleX(${flip})"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="${j ? "var(--x-panel)" : "var(--x-ink)"}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        return b;
      });
    }

    // step times: an entrance, then one 0.8 s step per beat with a hold between (compressed to fit the run)
    const ent = 0.5;
    const room = Math.max(0.5, end - at - ent - 0.5), each = room / steps;
    const move = Math.min(0.8, each * 0.72), hold = Math.min(p.hold, each - move);
    const S = Array.from({ length: steps }, (_, i) => at + ent + Math.min(hold, 0.6) * 0.3 + i * (move + hold));
    S.forEach((s) => ctx.sfx(s + 0.05, "whoosh.soft", 0.28));
    if (arrows) S.forEach((s) => ctx.sfx(s - 0.06, "click", 0.2));
    const p3 = (t, a, b) => { const x = ML.lin(t, a, b); return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }; // power3.inOut
    const goA = Math.max(S[steps - 1] + move + 0.3, end - 0.3);

    return {
      draw(t) {
        const leave = ML.clamp((t - goA) / 0.28);
        layer.style.opacity = (1 - leave).toFixed(4);
        layer.style.visibility = t < at - 0.2 ? "hidden" : "visible";
        if (back) back.style.opacity = ML.out(t, at - 0.15, at + 0.15).toFixed(4);
        hide.forEach((e) => { e.style.opacity = t >= at ? "0" : ""; });
        // position of the rail in cards (0 → steps)
        let pos = 0;
        S.forEach((s) => { pos += p3(t, s, s + move); });
        track.style.transform = `translateX(${(-pos * (cw + gap) * dir).toFixed(2)}px)`;
        cards.forEach((c, i) => {
          const e = ML.expo(t, at + i * 0.07, at + i * 0.07 + ent + 0.2);
          const hero = 1 - ML.clamp(Math.abs(i - pos));
          c.style.opacity = Math.min(1, e * 1.6).toFixed(4);
          c.style.translate = `0 ${((1 - e) * 40 * k).toFixed(2)}px`;
          c.style.scale = (0.96 + 0.04 * hero).toFixed(4);
        });
        if (arrows) {
          let press = 0;
          S.forEach((s) => { press = Math.max(press, ML.pulse(t, s - 0.04, 0.04, 0.12)); });
          arrows[1].style.translate = `0 ${(-2 * k * press * 2).toFixed(2)}px`;
          arrows[1].style.filter = press > 0.02 ? `brightness(${(1 + 0.25 * press).toFixed(3)})` : "none";
        }
      },
    };
  },
});
