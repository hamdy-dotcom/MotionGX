// Lift out to inspect: the piece itself is lifted, not the camera. Over `duration` (1.0 s) it leaves its place on
// insOut = 1 − (1 − k)^4.4 along a perspective-true line — its screen position runs linearly with e while its scale is
// 1 / depth, the depth lerped from 1 to 1 / fit — on a small upward arc sin(π e) × 4 % of the frame height, to the
// middle of the free band between the headline and the foot, sized fit = min(0.92 band height, 0.88 W). Behind it a
// full-frame scrim in the room colour rises to dim × e and a warm light falls on the piece only. "lift-spin" keeps it
// turning in the hand at 0.26 rad/s after 2.2 s (a 2D turn: scaleX(cos), never 3D). "lift-return" puts it back:
// 0.60 s (× up to 1.5 the further it turned), rotation straightening first (smoothstep 0 → 0.36) and then descending
// (smoothstep 0.24 → 1), landing exactly where it was. Ported from MengTo/Skills 3d-orbit-inspect-demo's updateHand.
// A picture is never enlarged past its own pixels; transforms are 2D only.
// Source: MengTo/Skills agent-skills/3d/3d-orbit-inspect-demo/demo.html (MIT).
ML.define({
  id: "element.lift-to-inspect",
  category: "element",
  name: "Lift out to inspect",
  does: "A piece resting in the scene lifts on a small arc to a spot in front of the lens while the scene behind dims; later it straightens and settles back exactly where it was.",
  says: ["focus", "reveal", "proof", "precision", "luxury"],
  energy: 3,
  targets: ["image", "card", "screen", "logo", "shape"],
  duration: [1.5, 5],
  params: {
    travel: { type: "choice", options: ["lift", "lift-spin", "lift-return"], default: "lift-return" },
    dim: { type: "number", range: [0.6, 0.85], default: 0.8 },
    duration: { type: "number", range: [0.8, 1.2], default: 1, unit: "s" },
    fast_return: { type: "bool", default: false },
  },
  pairs: ["camera.push-in", "text-in.punchline"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:agent-skills/3d/3d-orbit-inspect-demo", license: "MIT", note: "updateHand's lift, arc, scrim and two-stage return ported to a 2D card" },
  setup(ctx) {
    const { p, at, end, f } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    if (!el) return null;
    const insOut = (k) => 1 - Math.pow(1 - k, 4.4);
    const sstep = (a, b, x) => { const u = ML.clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const B = ctx.box(el);
    const cs = getComputedStyle(el);

    // the scrim between the scene and the piece, then the piece's double on top (the original hides while it is out)
    const scrim = doc.createElement("div");
    scrim.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:20;background:color-mix(in srgb, var(--x-ink) 88%, var(--x-ground));opacity:0;";
    host.append(scrim);
    const carrier = doc.createElement("div");
    carrier.style.cssText = `position:absolute;left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;pointer-events:none;z-index:21;transform-origin:50% 50%;visibility:hidden;`;
    const twin = el.cloneNode(true);
    twin.removeAttribute("data-slot");
    twin.removeAttribute("id");
    twin.style.width = B.w + "px"; twin.style.height = B.h + "px";
    twin.style.margin = "0"; twin.style.boxSizing = "border-box"; twin.style.display = cs.display === "inline" ? "inline-block" : cs.display;
    for (const k of ["font", "color", "direction", "textAlign", "letterSpacing", "lineHeight"]) twin.style[k] = cs[k];
    carrier.append(twin);
    host.append(carrier);
    // a warm light on the piece only
    const glow = doc.createElement("div");
    glow.style.cssText = `position:absolute;inset:0;border-radius:${cs.borderRadius || "var(--x-radius)"};pointer-events:none;box-shadow:0 ${B.h * 0.12}px ${B.h * 0.5}px -${B.h * 0.1}px color-mix(in srgb, var(--x-accent-2) 45%, transparent), var(--x-shadow);opacity:0;`;
    carrier.prepend(glow);

    // the hand pose: the middle of the free band, sized to fit it
    const band = f.pic, bandH = band.h;
    let fit = Math.min((bandH * 0.92) / B.h, (f.W * 0.88) / B.w);
    if (el.tagName === "IMG" && el.naturalWidth) fit = Math.min(fit, el.naturalWidth / B.w, el.naturalHeight / B.h); // never past its pixels
    fit = Math.max(1, fit);
    const toX = band.x + band.w / 2 - (B.x + B.w / 2), toY = band.y + band.h / 2 - (B.y + B.h / 2);
    const z1 = 1 / fit;

    const D = ML.clamp(p.duration, 0.8, 1.2), t0 = at, t1 = at + D;
    const spinFrom = t1 + 2.2, spinRate = 0.26;
    const turnAt = (t) => (p.travel === "lift-spin" && t > spinFrom ? spinRate * (t - spinFrom) * ML.clamp((t - spinFrom) / 0.8) : 0);
    // return: from wherever it got to, as the source closes; a piece turned further takes up to 1.5× longer
    const backDur0 = p.fast_return ? 0.28 : 0.6;
    const r0 = p.travel === "lift-return" ? Math.max(t1 + 0.4, end - backDur0 * 1.5 - 0.25) : Infinity;
    const turned = Math.abs(turnAt(r0 === Infinity ? t1 : r0));
    const span = backDur0 * (1 + 0.5 * Math.min(1, turned / Math.PI));
    ctx.sfx(t0, "whoosh.soft", 0.35);
    if (r0 !== Infinity) { ctx.sfx(r0, "whoosh.soft", 0.22); ctx.sfx(r0 + span, "land.light", 0.25); }

    return {
      draw(t) {
        let e, eR;
        const k = ML.clamp((t - t0) / D);
        if (t < r0) { e = insOut(k); eR = e; }
        else { const c = ML.clamp((t - r0) / span); eR = 1 - sstep(0, 0.36, c); e = 1 - sstep(0.24, 1, c); }
        const out = e > 0.0005 || (t >= t0 && t < r0);
        carrier.style.visibility = out ? "visible" : "hidden";
        el.style.opacity = out ? "0" : "";
        scrim.style.opacity = (ML.clamp(p.dim, 0.6, 0.85) * e).toFixed(4);
        scrim.style.visibility = e > 0.0005 ? "visible" : "hidden";
        if (!out) { carrier.style.transform = "none"; return; }
        // perspective-true: screen position linear in e, scale 1 / depth
        const z = 1 + (z1 - 1) * e, s = 1 / z;
        const x = toX * e, y = toY * e - Math.sin(Math.PI * e) * f.H * 0.04;
        const turn = turnAt(t < r0 ? t : r0) * (t < r0 ? 1 : eR);
        const sx = Math.cos(turn);
        carrier.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(s * sx).toFixed(4)}, ${s.toFixed(4)})`;
        glow.style.opacity = e.toFixed(4);
      },
    };
  },
});
