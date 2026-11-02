// Duration badge + playhead bar on a video tile: a dark translucent rounded badge in the tile's bottom corner shows
// the clip's length ("0:57", or counting down as it plays), and a thin bar along the bottom edge grows linearly with
// the tile's playback from the reading-side corner (RTL: from the right). Works on the given card or picture, or on a
// video tile it builds (a thumbnail in the look's own colours with a play mark).
// Source: prompt-motion lemomo-ai-lemo-opuscar-skill-opus-5-5 (reference only — our own rebuild).
ML.define({
  id: "ui.duration-badge-progress",
  category: "ui",
  name: "Duration badge and playhead bar on a video tile",
  does: "A video tile shows a corner duration badge and a thin progress bar growing along its bottom edge as it plays.",
  says: ["time", "proof"],
  energy: 1,
  targets: ["card", "image"],
  duration: [1, 10],
  params: {
    time: { type: "text", default: "0:57" },
    bar_colour: { type: "choice", options: ["accent", "accent-2", "good", "bad", "ink"], default: "accent" },
    countdown: { type: "bool", default: false },
    start: { type: "number", range: [0, 0.9], default: 0 },
    played: { type: "number", range: [0.05, 1], default: 1 },
    play_mark: { type: "bool", default: true },
  },
  pairs: ["ui.cursor-follower", "ui.editor-hud-frame"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  source: { from: "prompt-motion:lemomo-ai-lemo-opuscar-skill-opus-5-5", license: "reference", note: "our own rebuild" },
  setup(ctx) {
    const { el, p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, html) => { const e = doc.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; parent.append(e); return e; };
    const host = ctx.scene || ctx.stage;

    // the tile: the given card (overlay inside it), the given picture (overlay over its box), or one we build
    let tile, built = false;
    if (el && el !== ctx.stage && el.tagName !== "IMG") {
      tile = el;
      if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
      if (getComputedStyle(tile).overflow === "visible") tile.style.overflow = "hidden";
    } else if (el && el.tagName === "IMG") {
      const b = ctx.box(el), r = getComputedStyle(el).borderRadius;
      tile = mk("div", `position:absolute;left:${b.x.toFixed(1)}px;top:${b.y.toFixed(1)}px;width:${b.w.toFixed(1)}px;height:${b.h.toFixed(1)}px;border-radius:${r};overflow:hidden;pointer-events:none;z-index:8;`, host);
    } else {
      built = true;
      const R = f.pic, ratio = f.wide ? 16 / 9 : 4 / 5;
      let w = Math.min(R.w * (f.wide ? 0.62 : 0.84), 1100 * k), h = w / ratio;
      if (h > R.h * 0.9) { h = R.h * 0.9; w = h * ratio; }
      tile = mk("div", `position:absolute;left:${(R.x + (R.w - w) / 2).toFixed(1)}px;top:${(R.y + (R.h - h) / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:var(--x-pic-radius);overflow:hidden;box-shadow:var(--x-shadow);background:linear-gradient(160deg, color-mix(in srgb, var(--x-ink) 55%, var(--x-accent-2)), color-mix(in srgb, var(--x-ink) 78%, var(--x-accent)));z-index:8;`, host,
        `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="118" cy="30" r="15" fill="var(--x-accent-2)" opacity=".7"/><path d="M0 100 L0 72 L38 48 L66 70 L96 52 L160 84 L160 100 Z" fill="var(--x-ground)" opacity=".12"/><path d="M0 100 L0 86 L50 66 L92 88 L130 74 L160 90 L160 100 Z" fill="var(--x-ground)" opacity=".2"/></svg>`);
    }
    const tw = tile.offsetWidth || 600 * k, th = tile.offsetHeight || 340 * k, S = Math.min(tw, th * 1.6);
    const play = built && p.play_mark ? mk("div", `position:absolute;left:50%;top:50%;width:${(S * 0.16).toFixed(1)}px;height:${(S * 0.16).toFixed(1)}px;margin:${(-S * 0.08).toFixed(1)}px 0 0 ${(-S * 0.08).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-ink) 45%, transparent);display:grid;place-items:center;`, tile,
      `<svg viewBox="0 0 24 24" width="${(S * 0.07).toFixed(1)}" height="${(S * 0.07).toFixed(1)}"><path d="M7 4.5v15l12.5-7.5z" fill="var(--x-ground)"/></svg>`) : null;

    // the bar along the bottom edge (a faint track under it), from the reading-side corner
    const bh = Math.max(3 * k, th * 0.012);
    const side = rtl ? "right" : "left";
    const track = mk("div", `position:absolute;left:0;right:0;bottom:0;height:${bh.toFixed(1)}px;background:color-mix(in srgb, var(--x-ground) 28%, transparent);opacity:0;`, tile);
    const bar = mk("div", `position:absolute;${side}:0;bottom:0;height:${bh.toFixed(1)}px;width:0;background:var(--x-${p.bar_colour});opacity:0;`, tile);

    // the badge in the far bottom corner (the reading end), dark translucent, tabular figures
    const fs = Math.max(14 * k, S * 0.042), far = rtl ? "left" : "right";
    const badge = mk("div", `position:absolute;${far}:${(fs * 0.7).toFixed(1)}px;bottom:${(fs * 0.7 + bh).toFixed(1)}px;padding:${(fs * 0.18).toFixed(1)}px ${(fs * 0.42).toFixed(1)}px;border-radius:${(fs * 0.3).toFixed(1)}px;background:color-mix(in srgb, var(--x-ink) 72%, transparent);color:var(--x-ground);box-shadow:0 0 0 ${Math.max(1, k * 1.5).toFixed(1)}px color-mix(in srgb, var(--x-ground) 22%, transparent);font:600 ${fs.toFixed(1)}px var(--x-body-font);font-variant-numeric:tabular-nums;direction:ltr;line-height:1.2;opacity:0;`, tile);

    // the clip's length in seconds, for the countdown
    const parts = String(p.time || "0:57").split(":").map((x) => parseInt(x, 10) || 0);
    const total = parts.reduce((a, x) => a * 60 + x, 0);
    const fmt = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + ":" + String(x).padStart(2, "0"); };
    const p0 = ML.clamp(p.start, 0, 0.95), p1 = Math.max(p0 + 0.02, ML.clamp(p.played, 0.05, 1));
    const tA = at + 0.3, tB = Math.max(tA + 0.5, end - 0.3);
    ctx.sfx(at + 0.2, "blip", 0.15);

    return {
      draw(t) {
        if (built) ML.show(tile, t, at, end - 0.25);
        const bv = ML.out(t, at + 0.15, at + 0.45);
        badge.style.opacity = track.style.opacity = bar.style.opacity = bv.toFixed(4); // nothing on a given tile before the move starts
        badge.style.scale = bv < 1 ? (0.9 + 0.1 * bv).toFixed(4) : "none";
        const u = p0 + (p1 - p0) * ML.lin(t, tA, tB);
        bar.style.width = Math.round(u * tw) + "px"; // whole pixels: a fractional edge rasterises differently by the frame before
        badge.textContent = p.countdown ? fmt(total * (1 - u)) : String(p.time || "0:57");
        if (play) play.style.opacity = (1 - 0.4 * ML.lin(t, tA, tA + 0.4)).toFixed(4);
      },
    };
  },
});
