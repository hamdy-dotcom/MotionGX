// Element expands to frame: a bar, button, card or field on screen thickens and blows up to fill the whole frame,
// becoming the next scene's ground (a colour) or its first shot (an image).
// Bar ("start from one dot"): a dot (1.5% of the short side) pops in on back.out(2) in 0.25 s, stretches into a bar
// (16 -> 240 px on a 1080 frame, 0.3 s expo.inOut, a horizontal motion blur at peak speed) made of dots, the dots merge
// into a solid rect (0.1 s), then it blows up from its own centre — height and width to the frame in 0.4 s expo.in,
// its edges blurred while it grows. Button / card pop in, the button's label clears, then they blow up the same way.
// Field: the field pops in with its text, the text clears, its box fills (clip reveal along the reading side, 0.3 s),
// then it blows up. On a real target (a chart, a screen, a card, a picture) it blows up from that element's own box.
// Image fill: the box fills with a horizontal strip of the scene's picture (clip reveal 0.3 s), which then grows to the
// full frame on expo.inOut as the first shot (laid out, never scaled past its pixels; pictures never blurred).
// Colour fill: at full cover, optional glitch — 3-5 dark blocks at the edges for 3 frames — then a soft lighter
// radial centre; the next scene sits on that colour.
// Source: prompt-motion motiondsgnr-yo-opus-5-5-raw, influencer-seo-opus-5-5-is-insanely,
// manuelogomigo-i-gave-claude-opus (reference only: our own rebuild).
ML.define({
  id: "transition.element-expand-to-frame",
  category: "transition",
  name: "Element expands to frame",
  does: "A bar, field or card on screen thickens and blows up to fill the whole frame, becoming the next scene's ground (a colour) or its first shot (an image).",
  says: ["result", "transition", "energy", "reveal", "tech"],
  energy: 4,
  targets: ["chart", "scene", "screen", "image", "card", "shape"],
  duration: [0.5, 1.4],
  params: {
    from: { type: "choice", options: ["bar", "button", "card", "field"], default: "bar" },
    fill: { type: "choice", options: ["colour", "image"], default: "colour" },
    glitch: { type: "bool", default: false },
    colour: { type: "text", default: "accent" },
  },
  pairs: ["text-in.punchline", "transition.colour-field-cut"],
  avoid: ["calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.heavy",
  source: { from: "prompt-motion:motiondsgnr-yo-opus-5-5-raw", license: "reference", note: "our own rebuild; also influencer-seo-opus-5-5-is-insanely, manuelogomigo-i-gave-claude-opus" },
  async setup(ctx) {
    const { p, at, stage, f } = ctx;
    const W = f.W, H = f.H, v = Math.min(W, H) / 100, k = Math.min(W, H) / 1080;
    const host = ctx.scene || stage;
    const c = String(p.colour || "accent").trim().replace(/\s+/g, "-");
    const col = c.startsWith("--x-") ? `var(${c})` : /^(accent|accent-2|ink|dim|good|bad|panel|panel-2|ground|device)$/.test(c) ? `var(--x-${c})` : "var(--x-accent)";
    const onCol = /^(panel|panel-2|ground)$/.test(c) ? "var(--x-ink)" : c === "ink" || c === "device" ? "var(--x-ground)" : "var(--x-accent-ink)";
    const real = ctx.el && ctx.el !== stage ? ctx.el : null;
    // the picture for an image fill: the target itself, else the scene's first picture; a raster picture smaller than
    // the frame would be enlarged past its pixels, so it falls back to the colour
    const img = real && real.tagName === "IMG" ? real : host.querySelector("img");
    let fillImg = p.fill === "image" && img ? img : null;
    if (fillImg) {
      const vector = /^data:image\/svg|\.svg(\?|#|$)/i.test(fillImg.currentSrc || fillImg.src);
      const nw = fillImg.naturalWidth || 0, nh = fillImg.naturalHeight || 0;
      if (!vector && (!nw || Math.max(W / nw, H / nh) > 1.001)) fillImg = null;
    }
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;visibility:hidden";
    host.append(layer);
    const mk = (css, parent = layer) => { const d = document.createElement("div"); d.style.cssText = "position:absolute;" + css; parent.append(d); return d; };
    const rtl = !!ctx.rtl;
    // the start box, and the timeline of its phases
    const cx = W / 2, cy = H * 0.52;
    const from = real ? "real" : p.from;
    const direct = !!fillImg && fillImg === real; // the picture itself blows up: no colour, no strip, straight from its own box
    let S, R; // start rect, start radius
    if (real) { S = ctx.box(real); R = parseFloat(getComputedStyle(real).borderTopLeftRadius) || 0; }
    else if (from === "bar") { S = { x: cx - 120 * k, y: cy - 8 * k, w: 240 * k, h: 16 * k }; R = 8 * k; }
    else if (from === "button") { S = { x: cx - 17 * v, y: cy - 4.4 * v, w: 34 * v, h: 8.8 * v }; R = 4.4 * v; }
    else if (from === "card") { S = { x: cx - 26 * v, y: cy - 17 * v, w: 52 * v, h: 34 * v }; R = parseFloat(getComputedStyle(host).getPropertyValue("--x-radius")) || 3 * v; }
    else { S = { x: cx - 32 * v, y: cy - 4.8 * v, w: 64 * v, h: 9.6 * v }; R = 1.6 * v; }
    const T = {};
    let tt = at;
    if (from === "bar") { T.pop = [tt, tt + 0.25]; T.stretch = [tt + 0.25, tt + 0.55]; T.merge = [tt + 0.55, tt + 0.65]; tt += 0.65; }
    else if (from === "real") { const d = direct ? 0 : 0.12; T.tint = [tt, tt + d]; tt += d; }
    else { T.pop = [tt, tt + 0.25]; T.clear = [tt + 0.3, tt + 0.4]; tt += from === "card" ? 0.35 : 0.4; }
    const fillBox = !direct && (fillImg || from === "field") ? [tt, tt + 0.3] : null; // the box fills before it grows
    if (fillBox) tt += 0.32;
    const grow = [tt, tt + 0.4];
    const full = grow[1];
    // the blob that grows
    const blob = mk(`left:0;top:0;width:0;height:0;overflow:hidden;background:${from === "field" ? "var(--x-panel)" : col}`);
    const edge = Math.max(2, 0.2 * v).toFixed(1) + "px";
    if (from === "field") { blob.style.boxSizing = "border-box"; blob.style.border = `${edge} solid var(--x-edge-color)`; }
    if (from === "field" || from === "card") blob.style.boxShadow = "var(--x-shadow)";
    // bar: a track of dots that merge into a solid rect
    const dots = from === "bar" ? mk("inset:0", blob) : null;
    // button / field: their text
    const labelSrc = host.querySelector(".ml-label, [data-slot-sample='label']");
    const subSrc = host.querySelector(".ml-sub");
    let label = null;
    if (from === "button" || from === "field") {
      label = mk(`inset:0;display:flex;align-items:center;justify-content:${from === "field" ? "flex-start" : "center"};padding:0 ${(3 * v).toFixed(1)}px;white-space:nowrap;overflow:hidden;` +
        (from === "button" ? `color:${onCol};font:600 ${(3.2 * v).toFixed(1)}px var(--x-body-font)` : `color:var(--x-dim);font:400 ${(3 * v).toFixed(1)}px var(--x-body-font)`), blob);
      label.setAttribute("dir", rtl ? "rtl" : "ltr");
      label.textContent = from === "button" ? (labelSrc ? labelSrc.textContent.trim() : "→") : (subSrc ? subSrc.textContent.trim() : "");
    }
    // the fill inside the box: a colour, or a strip of the picture
    const fillEl = mk(`inset:0;visibility:hidden;background:${col}`, blob);
    let pic = null;
    if (fillImg) {
      pic = document.createElement("img");
      pic.src = fillImg.currentSrc || fillImg.src;
      pic.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block";
      fillEl.style.background = "var(--x-pic-ground)";
      fillEl.append(pic);
      await pic.decode().catch(() => {}); // a picture made here is not one the film waits for
    }
    // the soft lighter centre on a colour ground, and the glitch blocks
    const glow = mk(`inset:0;opacity:0;background:radial-gradient(ellipse 65% 55% at 50% 48%, color-mix(in srgb, var(--x-accent-ink) 22%, transparent), transparent 70%)`);
    const nBlocks = 3 + Math.floor(ML.rnd(Math.round(at * 100), 3) * 3);
    const blocks = Array.from({ length: nBlocks }, (_, i) => {
      const edge = (i + Math.floor(ML.rnd(Math.round(at * 100), 11) * 4)) % 4, bw = (8 + 18 * ML.rnd(i, 12)) * v, bh = (2 + 6 * ML.rnd(i, 13)) * v, along = ML.rnd(i, 14);
      const x = edge === 0 ? -bw * 0.3 : edge === 1 ? W - bw * 0.7 : along * (W - bw), y = edge === 2 ? -bh * 0.3 : edge === 3 ? H - bh * 0.7 : along * (H - bh);
      return mk(`left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px;background:var(--x-device);visibility:hidden`);
    });
    const expoIn = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * (x - 1)) - 0.001 * (1 - x));
    const expoIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
    const growE = fillImg ? expoIO : (x) => Math.max(0, expoIn(x));
    const place = (r, rad) => { blob.style.left = r.x.toFixed(2) + "px"; blob.style.top = r.y.toFixed(2) + "px"; blob.style.width = Math.max(0, r.w).toFixed(2) + "px"; blob.style.height = Math.max(0, r.h).toFixed(2) + "px"; blob.style.borderRadius = Math.max(0, rad).toFixed(2) + "px"; };
    if (T.pop) ctx.sfx(T.pop[0], "pop.soft", 0.3);
    ctx.sfx(grow[0], "whoosh.heavy", 0.45);
    if (p.glitch && !fillImg) ctx.sfx(full, "hit", 0.3);
    return {
      draw(t) {
        const on = t >= at;
        layer.style.visibility = on ? "visible" : "hidden";
        // a real target stays until the box over it has tinted in
        if (real) real.style.visibility = t >= T.tint[1] ? "hidden" : "";
        if (!on) return;
        let r = { ...S }, rad = R, blur = 0;
        // the start: pop / stretch / merge / tint
        if (from === "bar") {
          const s = ML.back(t, T.pop[0], T.pop[1], 2);
          const d = 16 * k;
          const sx = expoIO(ML.lin(t, T.stretch[0], T.stretch[1]));
          const w = d + (S.w - d) * sx;
          r = { x: cx - (w * s) / 2, y: cy - (d * s) / 2, w: w * s, h: d * s };
          rad = (d * s) / 2;
          blur = Math.sin(Math.PI * ML.lin(t, T.stretch[0], T.stretch[1])) * 4 * k;
          // dots: spaced along the bar, merging into solid
          const m = ML.lin(t, T.merge[0], T.merge[1]);
          const g = d, rr = g * (0.3 + 0.45 * m);
          dots.style.background = m >= 1 ? col : `radial-gradient(circle at 50% 50%, ${col} ${rr.toFixed(2)}px, transparent ${(rr + 0.8).toFixed(2)}px) 0 0 / ${g.toFixed(2)}px ${g.toFixed(2)}px repeat-x`;
          blob.style.background = m >= 1 ? col : "transparent";
        } else if (from === "real") {
          blob.style.opacity = ML.lin(t, T.tint[0], T.tint[1]).toFixed(4);
        } else {
          const s = ML.back(t, T.pop[0], T.pop[1], 2);
          r = { x: S.x + (S.w * (1 - s)) / 2, y: S.y + (S.h * (1 - s)) / 2, w: S.w * s, h: S.h * s };
          rad = R * s;
          if (label) label.style.opacity = (1 - ML.lin(t, T.clear[0], T.clear[1])).toFixed(4);
          blob.style.opacity = ML.lin(t, T.pop[0], T.pop[0] + 0.08).toFixed(4);
        }
        // the box fills (along the reading side)
        if (fillBox || from === "button" || from === "card" || from === "bar" || from === "real") {
          if (fillBox) {
            const u = ML.ease(t, fillBox[0], fillBox[1]);
            fillEl.style.visibility = t >= fillBox[0] ? "visible" : "hidden";
            const rest = ((1 - u) * 100).toFixed(3);
            fillEl.style.clipPath = rtl ? `inset(0 0 0 ${rest}%)` : `inset(0 ${rest}% 0 0)`;
          } else fillEl.style.visibility = direct ? "visible" : "hidden";
        }
        // the blow-up: from its own centre to the frame
        if (t >= grow[0]) {
          const g = growE(ML.lin(t, grow[0], grow[1]));
          const a = { ...r };
          r = { x: a.x * (1 - g), y: a.y * (1 - g), w: a.w + (W - a.w) * g, h: a.h + (H - a.h) * g };
          rad = rad * (1 - g);
          // motion blur on the edges at speed (colour only: pictures are never blurred)
          const x = ML.lin(t, grow[0], grow[1]);
          blur = fillImg ? 0 : (x > 0 && x < 1 ? Math.min(1, x * 1.6) * (1 - x) * 4 * 6 * k : 0);
        }
        if (from === "field") blob.style.borderWidth = t >= grow[0] ? "0" : edge; // no ring left around the frame
        if (t >= full) { r = { x: 0, y: 0, w: W, h: H }; rad = 0; blur = 0; blob.style.opacity = "1"; }
        place(r, rad);
        blob.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        // at full cover: glitch blocks for 3 frames, then the lighter centre
        const gl = p.glitch && !fillImg && t >= full && t < full + 0.1;
        blocks.forEach((b) => (b.style.visibility = gl ? "visible" : "hidden"));
        glow.style.opacity = fillImg ? "0" : ML.ease(t, full + (p.glitch ? 0.1 : 0.02), full + 0.4).toFixed(4);
      },
    };
  },
});
