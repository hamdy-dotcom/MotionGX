// Letters fall: the letters of a word lose support and tumble out of frame under gravity. Each letter pivots on its
// bottom-left corner, leans a little first (the word bends), then falls y = ½·g·t² with a small seeded sideways drift
// and a rotation growing to ±rotation, a vertical smear (blur) as it speeds up; one after another from the first
// letter or in a seeded random order. Line variant: only one word of the line falls and the words left glide to the
// centre and grow (up to 1.6×, never past the slot's width), 0.5 s power3.inOut. Letters are split, so Arabic (whose
// letters join) is not offered this move.
// Source: own rebuild of prompt-motion references (leonkohli-opus-5-5-is-crazy, ultimaxbt-bbebf5).
ML.define({
  id: "text-emphasis.letters-fall",
  category: "text-emphasis",
  name: "Letters tumble off under gravity",
  does: "The letters of a word lose support and fall with rotation and motion blur out of frame — the whole word, or one word of a line while the rest recentres.",
  says: ["transition", "playful", "simplicity", "change"],
  energy: 4,
  targets: ["word", "headline"],
  duration: [0.8, 2],
  params: {
    scope: { type: "choice", options: ["word", "one-word-of-line"], default: "word" },
    pick: { type: "choice", options: ["last", "first", "longest"], default: "last" },
    order: { type: "choice", options: ["first-last", "random"], default: "first-last" },
    rotation: { type: "number", range: [20, 110], default: 60, unit: "deg" },
    direction: { type: "choice", options: ["down", "up"], default: "down" },
    gravity: { type: "number", range: [1500, 4000], default: 2600, unit: "px/s2" },
    stagger: { type: "number", range: [0.02, 0.08], default: 0.04, unit: "s" },
    lean: { type: "bool", default: true },
    "recentre-rest": { type: "bool", default: true },
  },
  pairs: ["text-in.punchline", "text-in.drop-in"],
  avoid: ["luxury", "trust"],
  rtl: false,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "drop",
  source: { from: "prompt-motion:leonkohli-opus-5-5-is-crazy", license: "reference", note: "our own rebuild; also ultimaxbt-bbebf5" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    ML.split(el, "chars");
    const words = [...el.querySelectorAll(".ml-w")];
    if (!words.length) return null;
    // which letters fall
    let fallWord = null;
    if (p.scope === "one-word-of-line" && words.length > 1) {
      fallWord = p.pick === "first" ? words[0] : p.pick === "longest" ? words.reduce((a, b) => (b.textContent.length > a.textContent.length ? b : a)) : words[words.length - 1];
    }
    const falling = fallWord ? [...fallWord.querySelectorAll(".ml-c")] : [...el.querySelectorAll(".ml-c")];
    if (fallWord && !falling.length) falling.push(fallWord);
    const rest = fallWord ? words.filter((w) => w !== fallWord) : [];
    const n = falling.length;
    const H = stage.offsetHeight || 1920;
    const g = p.gravity * (H / 1920);
    const dir = p.direction === "up" ? -1 : 1;
    // the order they go: first to last, or a seeded shuffle
    const rank = falling.map((_, i) => i);
    if (p.order === "random") rank.sort((a, b) => ML.rnd(a, 7) - ML.rnd(b, 7));
    const slot = new Array(n);
    rank.forEach((ci, k) => (slot[ci] = k));
    const LEAN = p.lean ? 0.16 : 0;
    const st = Math.min(p.stagger, Math.max(0.01, (end - at - 0.9 - LEAN) / Math.max(1, n)));
    const go = falling.map((_, i) => at + LEAN + slot[i] * st);
    const fall = Math.sqrt((2 * H * 1.2) / g); // seconds to leave the frame from anywhere on it
    const mid = (n - 1) / 2;
    const L = falling.map((c, i) => ({
      vx: (-40 + 100 * ML.rnd(i, 3)) * (H / 1920),
      rot: (ML.rnd(i, 5) < 0.5 ? -1 : 1) * p.rotation * (0.7 + 0.3 * ML.rnd(i, 9)),
      lean: (i - mid) * 2.2, // the word bends along an arc before it goes
    }));
    // the falling letters pass in front of whatever sits below the slot
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.zIndex = "5";
    falling.forEach((c) => { c.style.transformOrigin = dir > 0 ? "0% 100%" : "0% 0%"; c.style.willChange = "transform"; });
    // the words left behind: glide to the centre of the slot and grow, never past its width
    let shiftX = 0, grow = 1, originX = 0, restAt = Infinity;
    if (rest.length && p["recentre-rest"]) {
      const eb = el.getBoundingClientRect(), k = eb.width / (el.offsetWidth || 1) || 1;
      const rs = rest.map((w) => w.getBoundingClientRect());
      const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
      const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
      const gw = (right - left) / k, gx = (left - eb.left) / k, ew = el.offsetWidth;
      const multiLine = bottom - top > rs[0].height * 1.5;
      shiftX = multiLine ? 0 : ew / 2 - (gx + gw / 2);
      grow = multiLine ? 1 : Math.max(1, Math.min(1.6, (ew * 0.96) / Math.max(1, gw)));
      originX = gx + gw / 2; // the group's centre, in the slot's px
      rest.forEach((w) => { w.dataset.mlLeft = String((w.getBoundingClientRect().left - eb.left) / k); });
      restAt = go[rank[n - 1]] + 0.1;
    }
    ctx.sfx(at + LEAN, "drop", 0.4);
    return {
      draw(t) {
        falling.forEach((c, i) => {
          const pre = p.lean ? ML.ease(t, at, at + LEAN) * (1 - ML.lin(t, go[i], go[i] + 0.25)) : 0;
          const d = Math.max(0, t - go[i]);
          const y = dir * 0.5 * g * d * d;
          const x = L[i].vx * d;
          const r = L[i].rot * ML.clamp(d / (fall * 0.6)) + L[i].lean * pre;
          const v = g * d; // speed now, for the smear
          const blur = Math.min(4, v / 900);
          const gone = d > fall;
          c.style.visibility = gone ? "hidden" : "visible";
          c.style.transform = d > 0 || pre > 0 ? `translate(${x.toFixed(2)}px, ${(y - dir * pre * 4).toFixed(2)}px) rotate(${r.toFixed(2)}deg)` : "none";
          c.style.filter = blur > 0.1 && !gone ? `blur(${blur.toFixed(2)}px)` : "none";
        });
        if (rest.length && p["recentre-rest"]) {
          const e = ML.ease(t, restAt, restAt + 0.5); // power3.inOut
          const s = 1 + (grow - 1) * e;
          rest.forEach((w) => {
            const wl = +w.dataset.mlLeft;
            // scale the whole group about its centre: each word moves by its distance from the centre
            w.style.transformOrigin = `${(originX - wl).toFixed(2)}px 50%`;
            w.style.transform = e > 0 ? `translateX(${(shiftX * e).toFixed(2)}px) scale(${s.toFixed(4)})` : "none";
          });
        }
      },
    };
  },
});
