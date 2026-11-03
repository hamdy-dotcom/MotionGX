// Push out: the finished line leaves unmasked — y 0 → −60 % of the frame height (or down) over 0.35 s power3.in, a
// vertical-only motion blur growing 0 → 10 px (SVG stdDeviation "0 n"), opacity 1 → 0 in the last 30 % — letters
// optionally staggered 0.02 s for a crumble (Arabic words move whole). 0.1 s after it starts, the next line arrives
// in its place, smaller (the look's sub size: title → tagline), rising in on the look's landing curve and fading up
// only as the old line clears, so the two never read on top of each other. The line's slot never moves: its content
// does, inside it.
// Source: prompt-motion:rossaxbt-3085b7 + bizibeast-motion-designers-are-cooked (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.push-out",
  category: "text-emphasis",
  name: "Line pushes up and out",
  does: "A finished title slides up out of the frame (unmasked) as the next smaller line starts in its place.",
  says: ["change", "flow", "transition"],
  energy: 2,
  targets: ["line", "headline"],
  duration: [0.3, 0.8],
  params: {
    direction: { type: "choice", options: ["up", "down"], default: "up" },
    distance: { type: "number", range: [30, 100], default: 60, unit: "%" },
    duration: { type: "number", range: [0.25, 0.5], default: 0.35, unit: "s" },
    "size-change": { type: "bool", default: true },
    stagger: { type: "number", range: [0, 0.04], default: 0, unit: "s" },
    next: { type: "text", default: "" },
  },
  pairs: ["text-in.punchline", "text-in.mask-rise"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:bizibeast-motion-designers-are-cooked", license: "reference", note: "our own rebuild; also rossaxbt-3085b7" },
  setup(ctx) {
    const { el, p, at } = ctx;
    if (!el) return null;
    const text = (el.textContent || "").trim();
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    // the outgoing content in its own box, so the slot keeps its place
    const out = document.createElement("span");
    while (el.firstChild) out.append(el.firstChild);
    Object.assign(out.style, { display: "inline-block", maxWidth: "100%" });
    el.append(out);
    const units = p.stagger > 0 ? ML.split(out, "chars") : [out];
    const id = "ml-push-blur-" + document.querySelectorAll("[data-ml-filter]").length;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-ml-filter", "1"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    Object.assign(svg.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" });
    svg.innerHTML = `<filter id="${id}" x="-10%" y="-80%" width="120%" height="260%"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    el.append(svg);
    const blurNode = svg.querySelector("feGaussianBlur");
    // the incoming line, in the same place
    const inc = document.createElement("div");
    inc.setAttribute("aria-hidden", "true");
    inc.textContent = String(p.next || "").trim() || text;
    Object.assign(inc.style, { position: "absolute", left: "0", right: "0", top: "50%", textAlign: "inherit", pointerEvents: "none", opacity: "0" });
    if (p["size-change"]) Object.assign(inc.style, { font: "var(--x-sub-weight) var(--x-sub-size) / 1.3 var(--x-body-font)", letterSpacing: "0", textTransform: "none" });
    el.append(inc);
    const H = ctx.f.H, sgn = p.direction === "down" ? 1 : -1, D = ML.clamp(p.duration, 0.25, 0.5);
    const dist = (ML.clamp(p.distance, 30, 100) / 100) * H;
    const lag = (i) => (units.length > 1 ? i * p.stagger : 0);
    const last = at + lag(units.length - 1) + D;
    const nIn = at + 0.1, rise = Math.max(12, ctx.look.dist || 28);
    ctx.sfx(at, "whoosh.soft", 0.4);
    return {
      draw(t) {
        let blurMax = 0;
        units.forEach((u, i) => {
          const x = ML.lin(t, at + lag(i), at + lag(i) + D), e = x * x * x;
          u.style.translate = x > 0 ? `0 ${(sgn * dist * e).toFixed(2)}px` : "none";
          u.style.opacity = (1 - ML.lin(x, 0.7, 1)).toFixed(4);
          blurMax = Math.max(blurMax, x < 1 ? 10 * x : 0);
        });
        blurNode.setAttribute("stdDeviation", `0 ${blurMax.toFixed(2)}`);
        out.style.filter = blurMax > 0.05 ? `url(#${id})` : "none";
        out.style.visibility = t >= last ? "hidden" : "visible";
        const v = ML.land(t, nIn, nIn + Math.max(0.35, D));
        inc.style.opacity = ML.lin(t, nIn + 0.06, nIn + 0.3).toFixed(4);
        inc.style.transform = `translateY(calc(-50% + ${(-sgn * (1 - v) * rise).toFixed(2)}px))`;
      },
    };
  },
});
