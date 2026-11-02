// Blur curtain (progressive edge blur): the progressive-blur skill's 8-layer graded overlay — layers of
// backdrop-filter blur 0.5, 1, 2, 4, 8, 16, 32 and 64 px, each masked to its own feathered band (12.5% steps), the
// leading edge feathered at 0.5 px and the far edge fully smeared — climbs from the bottom (or top) of the frame,
// height 0 -> 100% over 0.6-0.9 s on power2.in with its strength scaling with its height (max_blur at full; its graded
// zone runs on past the frame's far edge at the top of its travel, so nothing stays crisp under a full curtain). At full
// cover the frame crossfades 0.2 s to the next scene (the next ground, --x-next-ground when the film sets it, with the
// chapter's title) and the curtain pulls back down (100 -> 0, power2.out) over it, leaving it sharp; or ("out-only")
// the next scene simply starts sharp on the cut. Blur only touches the scene through the curtain: pictures are never
// blurred on their own.
// Source: MengTo/Skills progressive-blur SKILL.md (MIT: the stepped backdrop-filter masks).
ML.define({
  id: "transition.progressive-edge-blur",
  category: "transition",
  name: "Blur curtain",
  does: "A soft wall of blur climbs up from the bottom of the frame, swallowing the scene into an abstract wash, then the next scene comes in sharp.",
  says: ["transition", "calm", "change"],
  energy: 2,
  targets: ["scene"],
  duration: [0.8, 2],
  params: {
    edge: { type: "choice", options: ["bottom", "top"], default: "bottom" },
    mode: { type: "choice", options: ["out-in", "out-only"], default: "out-in" },
    max_blur: { type: "number", range: [24, 64], default: 64, unit: "px" },
    duration: { type: "number", range: [0.6, 0.9], default: 0.75, unit: "s" },
  },
  pairs: ["transition.dip-through-background", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/web-design/progressive-blur/SKILL.md", license: "MIT" },
  async setup(ctx) {
    const { p, at, end, stage, f } = ctx;
    const host = ctx.scene || stage;
    const H = f.H;
    const dur = Math.min(ML.clamp(+p.duration || 0.75, 0.6, 0.9), Math.max(0.25, (end - at) * 0.4));
    const maxB = ML.clamp(+p.max_blur || 64, 24, 64);
    const fromBottom = p.edge !== "top";
    const hb = host === stage ? { x: 0, y: 0 } : ctx.box(host);

    // the next scene: the next ground with the chapter's title
    const inc = document.createElement("div");
    inc.setAttribute("aria-hidden", "true");
    inc.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;visibility:hidden;background:var(--x-next-ground, var(--x-ground));color:var(--x-next-ink, var(--x-ink))";
    host.append(inc);
    const head = host.querySelector(".ml-title") || host.querySelector(".ml-hero");
    if (head) {
      const text = head.textContent.trim();
      try { const cs = getComputedStyle(head); await document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, text || "A"); } catch (e) { /* as is */ }
      const r = ctx.box(head);
      const title = document.createElement("div");
      title.className = head.className;
      title.setAttribute("dir", ctx.rtl ? "rtl" : "ltr");
      title.textContent = text;
      // the new chapter's title on the middle of the frame
      title.style.cssText = `position:absolute;left:${(r.x - hb.x).toFixed(1)}px;top:50%;width:${r.w.toFixed(1)}px;transform:translateY(-50%);text-align:center`;
      inc.append(title);
    }

    // the curtain: 8 stacked layers, each blurring its own feathered band (the skill's masks, scaled to the curtain)
    const curtain = document.createElement("div");
    curtain.setAttribute("aria-hidden", "true");
    curtain.style.cssText = `position:absolute;left:0;right:0;${fromBottom ? "bottom" : "top"}:0;height:0;z-index:7;pointer-events:none;visibility:hidden`;
    host.append(curtain);
    const toward = fromBottom ? "to bottom" : "to top"; // 0% at the leading edge, 100% at the frame's edge
    const steps = [0.5, 1, 2, 4, 8, 16, 32, 64];
    // the graded zone: the skill's 12.5% bands over the leading `zone` px; behind it the full blur to the frame's edge
    const zoneMax = H * 0.42;
    const layers = steps.map((b, i) => {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;inset:0;z-index:${i + 1}`;
      curtain.append(d);
      return { d, b, i };
    });
    const maskOf = (i, zone) => {
      const z = (x) => `${((x / 100) * zone).toFixed(2)}px`;
      const lo = i * 12.5;
      const stops = [`rgba(0,0,0,0) ${z(lo)}`, `rgba(0,0,0,1) ${z(lo + 12.5)}`];
      if (i < 6) stops.push(`rgba(0,0,0,1) ${z(lo + 25)}`, `rgba(0,0,0,0) ${z(lo + 37.5)}`);
      else stops.push("rgba(0,0,0,1) 100%"); // the last two layers run on to the far edge
      return `linear-gradient(${toward}, ${stops.join(", ")})`;
    };
    const p2in = (x) => x * x, p2out = (x) => 1 - (1 - x) * (1 - x);
    const full = at + dur, swapEnd = full + 0.2;
    const down = p.mode === "out-in" ? Math.min(dur, Math.max(0.3, end - swapEnd)) : 0;
    ctx.sfx(at, "whoosh.soft", 0.25);
    return {
      draw(t) {
        let h = 0;
        if (t >= at && t < full) h = p2in(ML.lin(t, at, full));
        else if (t >= full && t < swapEnd) h = 1;
        else if (t >= swapEnd && p.mode === "out-in") h = 1 - p2out(ML.lin(t, swapEnd, swapEnd + down));
        // out-only: the next scene starts sharp on the cut (no curtain after the swap)
        if (p.mode === "out-only" && t >= swapEnd) h = 0;
        const on = h > 0.001;
        curtain.style.visibility = on ? "visible" : "hidden";
        const px = h * (H + zoneMax);
        curtain.style.height = `${px.toFixed(2)}px`;
        const zone = Math.min(zoneMax, px);
        if (on) for (const l of layers) {
          const m = maskOf(l.i, zone);
          l.d.style.webkitMask = m; l.d.style.mask = m;
          const v = l.b * (maxB / 64) * h;
          const css = v > 0.01 ? `blur(${v.toFixed(3)}px)` : "none";
          l.d.style.backdropFilter = css; l.d.style.webkitBackdropFilter = css;
        }
        // the swap: a 0.2 s crossfade at full cover (out-in), a cut (out-only)
        inc.style.visibility = t >= full ? "visible" : "hidden";
        inc.style.opacity = p.mode === "out-in" ? ML.lin(t, full, swapEnd).toFixed(4) : t >= swapEnd ? "1" : "0";
      },
    };
  },
});
