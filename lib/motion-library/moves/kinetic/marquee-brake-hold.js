// Marquee brake and hold: a ticker runs at v0, brakes to a stop so one chosen item settles exactly where its slot sits
// on the spoken word, holds (highlighted) and runs on. Seekable because the offset is the closed-form integral of the
// speed: run at v0, brake v = v0·(1 − u)² (a power2.out fall of the velocity, distance v0·B/3), hold, resume
// v = v0·u² (power2.in, distance v0·R/3). The brake's start is solved backwards from the stop time, and the strip's
// phase is solved so the held item's centre is at the slot's centre at that moment. Soft brake 0.6 s, snap 0.25 s.
// Source: MengTo/Skills web-design/marquee-loop (MIT) — the duplicated seamless strip; the brake is our own.
ML.define({
  id: "kinetic.marquee-brake-hold",
  category: "kinetic",
  name: "Marquee brake and hold",
  does: "A running ticker slows smoothly to a stop so one item settles in place under the spoken word, then resumes.",
  says: ["focus", "reveal", "choice"],
  energy: 2,
  targets: ["label", "logo", "word", "list"],
  duration: [2, 6],
  params: {
    brake: { type: "choice", options: ["soft", "snap"], default: "soft" },
    hold: { type: "number", range: [0.5, 2], default: 1, unit: "s" },
    highlight: { type: "choice", options: ["colour", "scale", "underline", "none"], default: "colour" },
    resume: { type: "bool", default: true },
    speed: { type: "number", range: [60, 400], default: 180, unit: "px/s" },
    pick: { type: "number", range: [0, 9], default: 1 },
    edge: { type: "choice", options: ["mask", "none"], default: "mask" },
  },
  pairs: ["kinetic.marquee", "text-emphasis.accent-word"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "tap",
  source: { from: "MengTo/Skills:web-design/marquee-loop", license: "MIT", note: "the seamless strip; the analytic brake / hold is our own" },
  setup(ctx) {
    const { el, p, at, end, rtl } = ctx;
    if (!el) return null;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const W = ctx.f.W, k = Math.min(W, ctx.f.H) / 1080;
    const textOf = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    // items: a list's entries (the held one is `pick`), else the slot's own text held among the scene's other words
    let items, held, isPic = el.matches("svg, img");
    const kids = [...el.children].filter((c) => textOf(c));
    if (!isPic && kids.length > 1) { items = kids.map(textOf); held = Math.min(items.length - 1, Math.round(p.pick)); }
    else {
      const own = isPic ? "" : textOf(el);
      const others = [...host.querySelectorAll(".ml-title, .ml-sub, .ml-label")].filter((n) => n !== el && !el.contains(n) && !n.contains(el)).flatMap((n) => textOf(n).split(" ")).filter((w) => w.length > 1);
      const fill = [...new Set(others)].slice(0, 6);
      if (fill.length < 3) fill.push(...(ctx.words || []).map((w) => w.w).slice(0, 4));
      items = fill.slice(0, 6); held = Math.min(items.length, 2); items.splice(held, 0, own);
    }
    // where the slot sits: the held item stops on its centre; the band runs across the frame at that height
    const b = ctx.box(el), cs = getComputedStyle(el);
    const font = isPic ? `600 ${Math.max(28 * k, b.h * 0.5)}px var(--x-label-font)` : `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / 1.15 ${cs.fontFamily}`;
    const band = doc.createElement("div");
    Object.assign(band.style, { position: "absolute", left: "0", width: W + "px", top: "0", direction: "ltr", overflow: "hidden", pointerEvents: "none", zIndex: "3", padding: `${12 * k}px 0` });
    if (p.edge === "mask") { const m = "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)"; band.style.maskImage = m; band.style.webkitMaskImage = m; }
    const track = doc.createElement("div");
    Object.assign(track.style, { position: "relative", display: "flex", width: "max-content", whiteSpace: "nowrap", alignItems: "center" });
    band.append(track); host.append(band);
    const gap = Math.max(40 * k, parseFloat(cs.fontSize) * 0.9);
    const group = doc.createElement("div");
    Object.assign(group.style, { display: "flex", alignItems: "center", gap: gap + "px", paddingInlineEnd: gap + "px", flex: "none", direction: rtl ? "rtl" : "ltr", font, letterSpacing: rtl ? "0" : cs.letterSpacing, textTransform: rtl ? "none" : cs.textTransform, color: "var(--x-dim)" });
    const spans = [];
    const add = (txt, i) => {
      const s = doc.createElement("span");
      Object.assign(s.style, { position: "relative", display: "inline-block", flex: "none", transformOrigin: "50% 60%" });
      if (isPic && i === held) { const c = el.cloneNode(true); c.removeAttribute("data-slot"); c.removeAttribute("data-slot-sample"); Object.assign(c.style, { opacity: "1", visibility: "visible", translate: "none", scale: "none", transform: "none", display: "block" }); s.append(c); }
      else s.textContent = txt;
      const dot = doc.createElement("span");
      Object.assign(dot.style, { display: "inline-block", width: 7 * k + "px", height: 7 * k + "px", borderRadius: "50%", background: "var(--x-dim)", opacity: "0.5", flex: "none" });
      group.append(s, dot);
      spans.push({ s, i });
    };
    items.forEach(add);
    track.append(group);
    let guard = 0;
    while (group.offsetWidth < W * 1.1 && guard++ < 20) items.forEach(add);
    const gw = group.offsetWidth;
    const copies = Math.ceil(W / gw) + 2;
    const groups = [group];
    for (let c = 0; c < copies; c++) { const g = group.cloneNode(true); track.append(g); groups.push(g); }
    // the held item in the first group (the copy nearest the middle of the first group)
    const cands = spans.filter((x) => x.i === held);
    const pickSpan = cands[Math.floor((cands.length - 1) / 2)].s;
    const itemCentre = pickSpan.offsetLeft + pickSpan.offsetWidth / 2;
    const idx = [...group.children].indexOf(pickSpan);
    const heldEls = groups.map((g) => g.children[idx]);
    const bh = band.offsetHeight;
    band.style.top = (b.y + b.h / 2 - bh / 2).toFixed(1) + "px";
    const targetX = b.x + b.w / 2;
    // underline under each copy of the held item
    const lines = heldEls.map((h) => { const u = doc.createElement("span"); Object.assign(u.style, { position: "absolute", left: "0", right: "0", bottom: "-0.08em", height: Math.max(3, 4 * k) + "px", background: "var(--x-accent)", transformOrigin: rtl ? "100% 50%" : "0 50%", transform: "scaleX(0)" }); h.append(u); return u; });
    // ── timing: stop on the spoken word ──
    const v0 = p.speed * k, B = p.brake === "snap" ? 0.25 : 0.6, R = 0.5;
    const heldText = items[held] || "";
    let ts = ctx.word(heldText, at + 1.1);
    ts = Math.max(ts, at + B + 0.35);
    const hold = p.hold;
    ts = Math.min(ts, Math.max(at + B + 0.1, end - hold - (p.resume ? R + 0.2 : 0.2)));
    const tb = ts - B, tr = ts + hold;
    const t0 = ctx.from ?? 0;
    // distance travelled since the scene began (closed form)
    const dist = (t) => {
      if (t <= tb) return v0 * (t - t0);
      const runD = v0 * (tb - t0);
      if (t <= ts) { const u = (t - tb) / B; return runD + (v0 * B * (1 - Math.pow(1 - u, 3))) / 3; }
      const stopD = runD + (v0 * B) / 3;
      if (t <= tr || !p.resume) return stopD;
      if (t <= tr + R) { const u = (t - tr) / R; return stopD + (v0 * R * u * u * u) / 3; }
      return stopD + (v0 * R) / 3 + v0 * (t - tr - R);
    };
    const dir = rtl ? -1 : 1; // +1 runs to the left
    const sAt = dist(ts);
    const mod = (a, m) => ((a % m) + m) % m;
    const c = targetX - itemCentre + dir * sAt;
    ctx.sfx(ts, "tap", 0.35);
    if (p.resume) ctx.sfx(tr, "whoosh.soft", 0.15);
    return {
      draw(t) {
        const on = t >= at - 0.3 - 1e-6;
        band.style.visibility = on ? "visible" : "hidden";
        band.style.opacity = ML.ease(t, at - 0.3, at).toFixed(4);
        el.style.opacity = on ? "0" : "";
        const x = mod(c - dir * dist(t), gw) - gw;
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        const hi = ML.out(t, ts - 0.1, ts + 0.15) * (p.resume ? 1 - ML.ease(t, tr, tr + 0.3) : 1);
        heldEls.forEach((h, i) => {
          // the held item comes up to ink (every highlight but "none"), and grows or gets its underline drawn
          h.style.color = p.highlight !== "none" && hi > 0.001 ? `color-mix(in srgb, var(--x-ink) ${(hi * 100).toFixed(1)}%, var(--x-dim))` : "";
          h.style.scale = p.highlight === "scale" && hi > 0.001 ? (1 + 0.06 * hi).toFixed(4) : "none";
          lines[i].style.transform = `scaleX(${(p.highlight === "underline" ? ML.ease(t, ts - 0.05, ts + 0.3) * (p.resume ? 1 - ML.ease(t, tr, tr + 0.25) : 1) : 0).toFixed(4)})`;
        });
      },
    };
  },
});
