// Word roll: one word in a fixed line sits in a slot one line high and rolls to the next word — once, through a list,
// or as a slot machine — landing on the real one. Hard mask: out word y 0 → −100 % (clipped), in word +100 % → 0;
// blur-fade: out −35 % with blur 0 → 5 px and fade, in +35 % → 0 with blur 6 → 0; lift (serif): out −6 px rotate −3°
// fade 0.25 s power2.in, in +6 → 0 rotate 2 → 0 0.35 s power3.out. Out 0.22 s power3.in, in 0.28 s power3.out,
// overlapping 0.05 s. Slot machine: a column of every option moves one line per beat, 0.3 s expo.inOut, with a
// vertical motion blur 0 → 8 → 0 px and the leaving word still showing at the top edge. The slot width follows each
// word (0.3 s power2.inOut) so the words round it slide over; an optional 3 px phrase underline stretches with it.
// Options sit in 50 % ink, the final word in full ink or the accent; tracking variant: the incoming word arrives
// tracked +.12 em (Latin only) and settles. 0.4–0.6 s per option, optionally accelerating; two slots can swap out of
// phase. Whole words only — Arabic-safe; RTL anchors the slot on the right.
// Sources: MengTo/Skills build-threejs-scroll-worlds demo (MIT, the rolling hero word); prompt-motion samuel-yostt,
// techyoutbe, misbahsy, wani-shola, utopyaszx (reference) — our own code.
ML.define({
  id: "text-emphasis.word-roll",
  category: "text-emphasis",
  name: "Word rolls to the next word in its slot",
  does: "One word in a fixed line rolls vertically out of its slot and the next word rolls in, once or through a list of options, landing on the real one.",
  says: ["change", "choice", "list", "precision"],
  energy: 3,
  targets: ["word", "label", "headline"],
  duration: [0.6, 4],
  params: {
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    mask: { type: "choice", options: ["hard", "blur-fade", "lift"], default: "hard" },
    mode: { type: "choice", options: ["single", "cycle", "slot-machine"], default: "single" },
    options: { type: "number", range: [1, 8], default: 4 },
    "per-option": { type: "number", range: [0.3, 0.7], default: 0.45, unit: "s" },
    "speed-ramp": { type: "bool", default: false },
    "final-accent": { type: "bool", default: true },
    "tracking-change": { type: "bool", default: false },
    slots: { type: "number", range: [1, 2], default: 1 },
    "width-follow": { type: "bool", default: true },
    underline: { type: "bool", default: false },
    words: { type: "text", default: "" },
    "slot-word": { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-emphasis.underline-draw"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:agent-skills/web-design/build-threejs-scroll-worlds/demo/index.html", license: "MIT", note: "also prompt-motion samuel-yostt-891f87, techyoutbe, misbahsy, wani-shola, utopyaszx (reference); our own code" },
  setup(ctx) {
    const { el, p, at, end, rtl, stage } = ctx;
    if (!el) return null;
    const words = ML.split(el, "words");
    if (!words.length) return null;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 56, u = fs / 56;
    const sk = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
    // the slot word(s): named, else the last word (and for two slots, the first too)
    const want = ML.plain(p["slot-word"] || "");
    let slotWords = want ? words.filter((w) => ML.plain(w.textContent) === want).slice(0, 1) : [];
    if (!slotWords.length) slotWords = [words[words.length - 1]];
    if (Math.round(p.slots) >= 2 && words.length > 1) slotWords.push(words.find((w) => !slotWords.includes(w)));
    // options: named (comma-separated), else words from the voice / the line that are not already showing
    const named = String(p.words || "").split(",").map((s) => s.trim()).filter(Boolean);
    const inLine = new Set(words.map((w) => ML.plain(w.textContent)));
    const clean = (x) => String(x).replace(/[.,،؛؟?!…:«»"'()]/g, "");
    const uniq = (list) => list.map(clean).filter((x, i, a) => ML.plain(x) && a.findIndex((y) => ML.plain(y) === ML.plain(x)) === i);
    let pool = uniq(named);
    if (!pool.length) pool = uniq((ctx.words || []).map((v) => (typeof v === "string" ? v : v.w))).filter((x) => !inLine.has(ML.plain(x)));
    if (!pool.length) pool = uniq(words.map((w) => w.textContent));
    const count = p.mode === "single" ? 1 : Math.max(1, Math.round(p.options));
    const io2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const exio = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const NS = "http://www.w3.org/2000/svg";
    const sgn = p.direction === "up" ? -1 : 1;
    const hard = p.mask === "hard", lift = p.mask === "lift", machine = p.mode === "slot-machine";
    const dOut = lift ? 0.25 : 0.22, dIn = lift ? 0.35 : 0.28;
    const build = (w, si) => {
      const real = w.textContent;
      const opts = [];
      for (let k = 0; opts.length < count && k < pool.length * 2 + 2; k++) {
        const x = pool[(k + si * count) % Math.max(1, pool.length)];
        if (x && ML.plain(x) !== ML.plain(real)) opts.push(x);
        if (!pool.length) break;
      }
      if (!opts.length) opts.push(real);
      const seq = [...opts, real];
      const H = w.offsetHeight;
      w.textContent = "";
      Object.assign(w.style, { position: "relative", verticalAlign: "top", height: H.toFixed(2) + "px", whiteSpace: "nowrap" });
      const clip = document.createElement("span");
      Object.assign(clip.style, { position: "absolute", inset: "0", display: "block", clipPath: hard || machine ? (machine ? "inset(-0.42em -0.3em 0 -0.3em)" : "inset(0 -0.3em 0 -0.3em)") : "none" });
      w.append(clip);
      const col = document.createElement("span");
      Object.assign(col.style, { position: "absolute", inset: "0", display: "block" });
      clip.append(col);
      let fid = "";
      let fe = null;
      if (machine) {
        fid = "ml-roll-" + si + "-" + Math.floor(ML.rnd(H + si, 9) * 1e8);
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); Object.assign(svg.style, { position: "absolute", width: "0", height: "0" });
        svg.innerHTML = `<filter id="${fid}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
        stage.append(svg); fe = svg.querySelector("feGaussianBlur");
      }
      const items = seq.map((txt, i) => {
        const s = document.createElement("span");
        s.textContent = txt;
        Object.assign(s.style, { position: "absolute", top: "0", [rtl ? "right" : "left"]: "0", display: "inline-block", whiteSpace: "pre", lineHeight: H.toFixed(2) + "px", transformOrigin: rtl ? "100% 70%" : "0% 70%" });
        const last = i === seq.length - 1;
        s.style.color = last ? (p["final-accent"] ? "var(--x-accent)" : "") : "color-mix(in srgb, currentColor 50%, transparent)";
        col.append(s);
        return s;
      });
      const widths = items.map((s) => s.getBoundingClientRect().width / sk);
      let line = null;
      if (p.underline) {
        line = document.createElement("span");
        Object.assign(line.style, { position: "absolute", left: "0", right: "0", bottom: (fs * 0.02).toFixed(2) + "px", height: Math.max(2, 3 * u).toFixed(2) + "px", background: "var(--x-accent)", borderRadius: "2px" });
        w.append(line);
      }
      return { w, seq, items, widths, H, col, fe, fid, latin: !ML.ARABIC.test(seq.join("")) };
    };
    const slots = slotWords.filter(Boolean).map(build);
    // swap times: a steady (or accelerating) beat from `at`, fitted inside the run
    const timesFor = (n, phase) => {
      const out = []; let x = at + 0.3 + phase;
      for (let k = 1; k <= n; k++) { out.push(x); x += p["per-option"] * (p["speed-ramp"] ? Math.max(0.45, Math.pow(0.85, k)) : 1); }
      const last = end - 0.55 - dIn;
      if (out.length && out[out.length - 1] > last) { const s = (last - at - 0.3) / Math.max(0.001, out[out.length - 1] - at - 0.3); for (let k = 0; k < out.length; k++) out[k] = at + 0.3 + Math.max(0, (out[k] - at - 0.3) * s); }
      return out;
    };
    slots.forEach((s, si) => { s.T = timesFor(s.seq.length - 1, si * p["per-option"] * 0.5); s.T.forEach((t) => ctx.sfx(t, "tap", 0.22)); });
    const widthAt = (s, t) => {
      if (!p["width-follow"]) return Math.max(...s.widths);
      let v = s.widths[0];
      s.T.forEach((T, k) => { const e = io2(ML.lin(t, T, T + 0.3)); if (e > 0) v += (s.widths[k + 1] - v) * e; });
      return v;
    };
    return {
      draw(t) {
        for (const s of slots) {
          s.w.style.width = widthAt(s, t).toFixed(2) + "px";
          const N = s.seq.length - 1;
          if (machine) {
            let c = 0, blur = 0;
            s.T.forEach((T) => { const x = ML.lin(t, T, T + 0.3); c += exio(x); if (x > 0 && x < 1) blur = 8 * Math.sin(Math.PI * x); });
            s.col.style.transform = `translateY(${(sgn * c * s.H).toFixed(2)}px)`;
            s.fe.setAttribute("stdDeviation", `0 ${blur.toFixed(2)}`);
            s.col.style.filter = blur > 0.05 ? `url(#${s.fid})` : "none";
            s.items.forEach((it, i) => {
              it.style.top = (-sgn * i * s.H).toFixed(2) + "px";
              const d = Math.abs(i - c);
              it.style.opacity = d < 1.5 ? (1 - 0.6 * Math.min(1, d)).toFixed(3) : "0";
            });
            continue;
          }
          s.items.forEach((it, i) => {
            const To = i < N ? s.T[i] : Infinity, Ti = i > 0 ? s.T[i - 1] : -Infinity;
            const o = i < N ? (lift ? Math.pow(ML.lin(t, To, To + dOut), 2) : Math.pow(ML.lin(t, To, To + dOut), 3)) : 0;
            const n = i > 0 ? ML.out(t, Ti + dOut - 0.05, Ti + dOut - 0.05 + dIn) : 1;
            if (n <= 0 || o >= 1) { it.style.opacity = "0"; return; }
            let y, op = 1, bl = 0, rot = 0;
            if (hard) y = `${(sgn * o * 100 + -sgn * (1 - n) * 100).toFixed(2)}%`;
            else if (lift) { y = `${((sgn * o * 6 - sgn * (1 - n) * 6) * u).toFixed(2)}px`; rot = -3 * o + 2 * (1 - n); op = (1 - o) * n; }
            else { y = `${(sgn * o * 35 - sgn * (1 - n) * 35).toFixed(2)}%`; op = (1 - o) * n; bl = 5 * o + 6 * (1 - n); }
            it.style.opacity = op.toFixed(4);
            it.style.transform = `translateY(${y}) rotate(${rot.toFixed(2)}deg)`;
            it.style.filter = bl > 0.01 ? `blur(${bl.toFixed(2)}px)` : "none";
            if (p["tracking-change"] && s.latin) it.style.letterSpacing = i > 0 && n < 1 ? `${(0.12 * (1 - n)).toFixed(4)}em` : "";
          });
        }
      },
    };
  },
});
