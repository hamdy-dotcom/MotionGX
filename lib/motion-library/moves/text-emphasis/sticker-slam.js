// Sticker slam: the target becomes a sticker word — heavy rounded caps in the look's panel colour with an `outline` px
// ink outline (text-stroke painted under the fill) and a hard offset shadow of the same ink, tilted `tilt` degrees —
// and slams on: scale 2.5 → 1 in 0.18 s power4.out, then a 0.05 s overshoot squash (scaleY 0.9) and back; the scene
// shakes 6 px for 0.12 s on the impact (seeded per frame). It can end on a one-frame flash in the lighter of the look's
// ink / ground into the next scene. 2D scale only; sizes relative to the stage and the target.
// Source: prompt-motion:topi-003-opus5-5-15-2 (reference) — our own rebuild.
ML.define({
  id: "text-emphasis.sticker-slam",
  category: "text-emphasis",
  name: "Tilted sticker word slams on",
  does: "A tilted outlined sticker word slams onto the frame (over a number or the last beat) with a squash and a shake.",
  says: ["celebration", "energy", "playful"],
  energy: 5,
  targets: ["word", "line", "label"],
  duration: [0.5, 1.5],
  params: {
    tilt: { type: "number", range: [-10, 10], default: -6, unit: "deg" },
    shake: { type: "bool", default: true },
    "flash-out": { type: "bool", default: false },
    outline: { type: "number", range: [0, 8], default: 6, unit: "px" },
  },
  pairs: ["data.count-up", "text-emphasis.squash-stretch"],
  avoid: ["calm", "luxury", "trust"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "hit",
  source: { from: "prompt-motion:topi-003-opus5-5-15-2", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, stage } = ctx;
    if (!el) return null;
    const host = ctx.scene || stage;
    // the lighter of the look's ink and ground, for the flash
    const lum = (v) => {
      const pr = document.createElement("i"); pr.style.color = `var(${v})`; pr.style.display = "none"; host.append(pr);
      const m = getComputedStyle(pr).color.match(/[\d.]+/g) || [0, 0, 0]; pr.remove();
      return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
    };
    const lighter = lum("--x-ink") > lum("--x-ground") ? "var(--x-ink)" : "var(--x-ground)";
    const darker = lighter === "var(--x-ink)" ? "var(--x-ground)" : "var(--x-ink)";
    const fill = lighter === "var(--x-ink)" ? "var(--x-ink)" : "var(--x-panel)";
    // the sticker: the target's own words in one inline box
    const core = document.createElement("span");
    while (el.firstChild) core.append(el.firstChild);
    el.append(core);
    const fs0 = parseFloat(getComputedStyle(el).fontSize) || 56;
    const size = Math.max(fs0, Math.min(stage.offsetWidth, stage.offsetHeight) * 0.065);
    Object.assign(core.style, {
      display: "inline-block", position: "relative", zIndex: "30", whiteSpace: "nowrap", font: `800 ${size.toFixed(1)}px/1.1 var(--x-head-font)`, letterSpacing: ML.ARABIC.test(core.textContent) ? "0" : "0.01em", textTransform: "uppercase",
      color: fill, paintOrder: "stroke fill", transformOrigin: "50% 60%",
    });
    // never wider than the room it has; a long line takes two lines rather than turning into small print
    const room = (el.clientWidth || ctx.box(el).w) * 0.96;
    let final = ML.fit(core, room);
    if (final < size * 0.72 && /\s/.test(core.textContent.trim())) {
      final = Math.min(size, final * 1.7);
      Object.assign(core.style, { whiteSpace: "normal", textWrap: "balance", textAlign: "center", maxWidth: room.toFixed(1) + "px", fontSize: final.toFixed(2) + "px" });
    }
    // the outline and shadow are read at a 70 px sticker, at the size it ends up
    const k = final / 70, ol = p.outline * k, sh = 6 * k;
    Object.assign(core.style, {
      webkitTextStroke: ol > 0 ? `${(ol * 2).toFixed(1)}px ${darker}` : "0", textShadow: `${sh.toFixed(1)}px ${sh.toFixed(1)}px 0 ${darker}`,
      padding: `${(ol + sh).toFixed(1)}px`, rotate: `${p.tilt}deg`,
    });
    let flash = null;
    if (p["flash-out"]) {
      flash = document.createElement("div");
      Object.assign(flash.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", background: lighter, opacity: "0", pointerEvents: "none", zIndex: "40" });
      host.append(flash);
    }
    const T1 = at + 0.18, T2 = T1 + 0.05, T3 = T2 + 0.06;
    ctx.sfx(T1, "hit", 0.55);
    const p4 = (x) => 1 - Math.pow(1 - x, 4);
    return {
      draw(t) {
        // the shake: 6 px (relative to the stage) for 0.12 s from the impact, one seeded offset per frame, decaying. It moves
        // the scene's box (left / top), so it adds to a camera or any other move driving the scene's translate or transform
        let sx0 = 0, sy0 = 0;
        if (p.shake && t >= T1 && t < T1 + 0.12) {
          const f = Math.floor((t - T1) * 30), d = 6 * (Math.min(stage.offsetWidth, stage.offsetHeight) / 1080) * (1 - (t - T1) / 0.12);
          sx0 = (ML.rnd(f, 1) * 2 - 1) * d; sy0 = (ML.rnd(f, 2) * 2 - 1) * d;
        }
        if (p.shake) { host.style.left = sx0 ? sx0.toFixed(2) + "px" : ""; host.style.right = sx0 ? (-sx0).toFixed(2) + "px" : ""; host.style.top = sy0 ? sy0.toFixed(2) + "px" : ""; host.style.bottom = sy0 ? (-sy0).toFixed(2) + "px" : ""; }
        if (t < at) { core.style.opacity = "0"; core.style.scale = "none"; if (flash) flash.style.opacity = "0"; return; }
        core.style.opacity = Math.min(1, (t - at) / 0.04).toFixed(3);
        let sx = 1, sy = 1;
        if (t < T1) { const s = 2.5 - 1.5 * p4(ML.lin(t, at, T1)); sx = sy = s; }
        else if (t < T2) { const u = Math.sin(Math.PI * 0.5 * ML.lin(t, T1, T2)); sy = 1 - 0.1 * u; sx = 1 + 0.05 * u; }
        else if (t < T3) { const u = ML.out(t, T2, T3); sy = 0.9 + 0.1 * u; sx = 1.05 - 0.05 * u; }
        core.style.scale = sx === 1 && sy === 1 ? "none" : `${sx.toFixed(4)} ${sy.toFixed(4)}`;
        if (flash) flash.style.opacity = t >= end - 1 / 30 ? "1" : "0";
      },
    };
  },
});
