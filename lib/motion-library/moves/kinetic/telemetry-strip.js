// Pulsing telemetry strip: a footer row of mono system stats ("UPTIME 99.999% · LATENCY 4ms · NODES 2,041"), a tray
// sliding out from under its panel (or, with no room below, a strip over the panel's foot with a top hairline, ink at
// 10%) — mono uppercase at the widest tracking in a faint ink, 24 px gaps. Three motions on the stats, each a pure
// function of t: pulse (opacity 1 → .5 → 1 on a cosine over the period),
// marquee (the stats glide as a slow seamless track) or tick (the last digit of every value steps once a second from a
// seeded sequence, mono so nothing shifts). Hold-only texture: it never carries the message.
// Source: MengTo/Skills web-design/globe-particles demo (MIT) — its "UPTIME: 99.999%" status strip, rebuilt seekable.
ML.define({
  id: "kinetic.telemetry-strip",
  category: "kinetic",
  name: "Pulsing telemetry strip",
  does: "A row of mono system stats ('UPTIME 99.999% · LATENCY 4ms') pulses softly at the foot of a panel.",
  says: ["tech", "trust", "time", "ambient"],
  energy: 1,
  targets: ["label", "list"],
  duration: [2, 15],
  params: {
    mode: { type: "choice", options: ["pulse", "marquee", "tick"], default: "pulse" },
    period: { type: "number", range: [1.5, 5], default: 3, unit: "s" },
    stats: { type: "text", default: "UPTIME 99.999% · LATENCY 4ms · NODES 2,041" },
  },
  pairs: ["background.dot-globe", "kinetic.marquee"],
  avoid: ["playful", "celebration"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "MengTo/Skills:web-design/globe-particles", license: "MIT", note: "demo index.html status strip (base64 srcdoc, decoded)" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, H = ctx.f.H, k = Math.min(W, H) / 1080;
    const isStage = !el || el === ctx.stage;
    // the stats: a list target gives its items, else the stats text
    let stats = String(p.stats || "").split(/\s*[·|•]\s*/).map((s) => s.trim()).filter(Boolean);
    const fromList = !isStage && el.children.length > 1 && el.getAttribute("data-slot") === "list";
    if (fromList) stats = [...el.children].map((c) => c.textContent.trim()).filter(Boolean); // the strip takes over its items
    const arabic = stats.some((s) => ML.ARABIC.test(s)); // Latin stats keep their tracking and caps in an Arabic film
    if (!stats.length) stats = ["UPTIME 99.999%", "LATENCY 4ms"];
    // anchor: the panel the target sits in (else the target, else the safe area)
    const panel = !isStage && el.closest ? el.closest(".ml-panel") : null;
    const anchor = panel || (!isStage ? el : null);
    const a = anchor ? ctx.box(anchor) : { ...ctx.f.safe };
    const strip = doc.createElement("div");
    const pad = 16 * k * 1.6, fontPx = 26 * k;
    Object.assign(strip.style, {
      position: "absolute", left: a.x.toFixed(1) + "px", width: a.w.toFixed(1) + "px", overflow: "hidden", zIndex: "3", pointerEvents: "none", direction: "ltr",
      background: "var(--x-panel)", borderTop: "1px solid color-mix(in srgb, var(--x-ink) 10%, transparent)",
      borderRadius: panel ? "0 0 var(--x-radius) var(--x-radius)" : "0", padding: `${pad}px ${pad * 1.2}px`, boxSizing: "border-box",
    });
    host.append(strip);
    const win = doc.createElement("div"); // the marquee's window: its fade never eats the strip's surface
    win.style.overflow = "hidden";
    const fadeMask = "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)";
    if (p.mode === "marquee") { win.style.maskImage = fadeMask; win.style.webkitMaskImage = fadeMask; }
    strip.append(win);
    const track = doc.createElement("div");
    Object.assign(track.style, { display: "flex", width: "max-content", whiteSpace: "nowrap", direction: "ltr" });
    win.append(track);
    const ticks = []; // [span of the last digit, that digit, seed, Arabic-Indic?]
    const makeGroup = () => {
      const g = doc.createElement("div");
      Object.assign(g.style, { display: "flex", alignItems: "center", gap: 24 * k * 1.6 + "px", paddingInlineEnd: 24 * k * 1.6 + "px", flex: "none", direction: ctx.rtl ? "rtl" : "ltr", font: `500 ${fontPx}px var(--x-mono-font)`, letterSpacing: arabic ? "0" : "0.2em", textTransform: arabic ? "none" : "uppercase", color: "color-mix(in srgb, var(--x-ink) 55%, transparent)" });
      stats.forEach((s, i) => {
        const item = doc.createElement("span");
        // the last digit of the value gets its own span (it ticks)
        const m = s.match(/^(.*)([0-9٠-٩])([^0-9٠-٩]*)$/);
        if (m && p.mode === "tick") {
          item.append(m[1]);
          const d = doc.createElement("span"); d.textContent = m[2]; item.append(d, m[3]);
          ticks.push([d, m[2], ticks.length + i * 7 + 1, /[٠-٩]/.test(m[2])]);
        } else item.textContent = s;
        g.append(item);
        if (i < stats.length - 1 || p.mode === "marquee") { const dot = doc.createElement("span"); dot.textContent = "·"; dot.style.opacity = "0.6"; g.append(dot); }
      });
      track.append(g);
      return g;
    };
    const g0 = makeGroup();
    let gw = g0.offsetWidth;
    if (p.mode === "marquee") {
      const copies = Math.ceil(a.w / gw) + 1;
      for (let c = 0; c < copies; c++) makeGroup();
    } else {
      // static: centred, shrunk to fit the strip
      const room = a.w - pad * 2.4;
      if (gw > room) g0.style.fontSize = (fontPx * room / gw).toFixed(2) + "px";
      track.style.margin = "0 auto";
      gw = g0.offsetWidth;
    }
    // where it sits: just below the anchor when there is room, else over its foot
    const sh = strip.offsetHeight;
    let top = a.y + a.h;
    const room = top + sh <= H - (ctx.f.tall ? ctx.f.safe.y * 0.35 : 16 * k);
    if (!room) top = a.y + a.h - sh;
    // below a panel it is a tray tucked under the panel's rounded foot: it slides out from behind
    const tucked = !!panel && room;
    if (tucked) {
      const r = parseFloat(getComputedStyle(panel).borderBottomLeftRadius) || 0;
      host.prepend(strip); // before the panel's region, so the panel lies over it
      Object.assign(strip.style, { zIndex: "auto", background: "var(--x-panel-2)", border: "var(--x-edge) solid var(--x-edge-color)", boxShadow: "var(--x-shadow)", paddingTop: pad + r + "px" });
      top -= r;
    }
    strip.style.top = Math.max(0, top).toFixed(1) + "px";
    const from = ctx.from ?? 0;
    return {
      draw(t) {
        const show = ML.ease(t, at, at + 0.5) * (1 - ML.ease(t, end - 0.3, end));
        strip.style.visibility = show > 0.001 ? "visible" : "hidden";
        strip.style.opacity = show.toFixed(4);
        if (tucked) strip.style.translate = `0 ${(-(1 - ML.ease(t, at, at + 0.5)) * sh).toFixed(2)}px`;
        if (fromList) el.style.opacity = "0";
        // the stats breathe, not the surface they sit on
        if (p.mode === "pulse") track.style.opacity = (0.75 + 0.25 * Math.cos((2 * Math.PI * Math.max(0, t - at)) / p.period)).toFixed(4);
        if (p.mode === "marquee") {
          const v = gw / (p.period * 6); // one group every six periods: slow
          const x = -(((t - from) * v) % gw);
          track.style.transform = `translateX(${(ctx.rtl ? -(gw + x) : x).toFixed(2)}px)`;
        }
        if (p.mode === "tick") {
          const n = Math.floor(Math.max(0, t - at));
          for (const [d, base, seed, indic] of ticks) d.textContent = n === 0 ? base : (indic ? "٠١٢٣٤٥٦٧٨٩" : "0123456789")[Math.floor(ML.rnd(seed, n) * 10)];
        }
      },
    };
  },
});
