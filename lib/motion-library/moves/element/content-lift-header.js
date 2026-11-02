// Content lifts and a header bar appears: once the intro block has played, the whole block shifts up `lift` px (at
// 720p, scaled to the stage) and shrinks 1 → `shrink` about the frame's centre over 0.5 s power2.inOut, while a small
// header row — an accent icon tile, the title (the scene's headline unless given) and a date or step — fades in at the
// top start corner (top-left; top-right in Arabic). The block keeps its layout: only a transform moves it, so every
// other move on it still works.
// Source: prompt-motion "gigabit-million-claude-opus-5-5-9-25-9-26-steam-60" (reference only — rebuilt as our own code).
ML.define({
  id: "element.content-lift-header",
  category: "element",
  name: "Content lifts and a header bar appears",
  does: "After the intro block completes, the whole block shifts up slightly and shrinks while a small header with title and date fades in at the top.",
  says: ["transition", "step"],
  energy: 1,
  targets: ["scene"],
  duration: [0.5, 1.2],
  params: {
    lift: { type: "number", range: [6, 20], default: 10, unit: "px" },
    shrink: { type: "number", range: [0.94, 1], default: 0.97 },
    title: { type: "text", default: "" },
    date: { type: "text", default: "" },
    icon: { type: "bool", default: true },
  },
  pairs: ["element.dock-to-header", "text-in.punchline"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:gigabit-million-claude-opus-5-5-9-25-9-26-steam-60", license: "reference", note: "technique rebuilt as our own code" },
  setup(ctx) {
    const { p, at, f, el, rtl } = ctx;
    const doc = document;
    const host = ctx.scene || ctx.stage;
    const k = Math.min(f.W, f.H) / 720;
    // the block: the target itself, or (for the whole scene) everything already in it
    const block = el && el !== ctx.stage && el !== host ? [el] : [...host.children].filter((c) => !c.dataset.mlLayer && c.tagName !== "SCRIPT");
    if (!block.length) return null;
    const cx = f.W / 2, cy = f.H / 2;
    const origin = block.map((b) => { const r = ctx.box(b); return `${(cx - r.x).toFixed(1)}px ${(cy - r.y).toFixed(1)}px`; });

    // the header row: icon + title + date, at the top start corner, inside the frame's margin above the content
    const title = (p.title || (host.querySelector(".ml-title, [data-slot='headline']") || {}).textContent || "").trim();
    const fs = 14 * k;
    const top = f.tall ? Math.max(fs * 3, f.safe.y - fs * 4.2) : Math.max(fs * 1.6, f.safe.y * 0.32);
    const bar = doc.createElement("div");
    bar.dataset.mlLayer = "1";
    bar.style.cssText = `position:absolute;top:${top}px;${rtl ? "right" : "left"}:${f.m}px;max-width:${f.W - f.m * 2}px;display:flex;align-items:center;gap:${10 * k}px;z-index:6;pointer-events:none;white-space:nowrap;font:var(--x-label-weight) ${fs}px var(--x-body-font);color:var(--x-ink);`;
    if (p.icon) {
      const ic = doc.createElement("div");
      ic.style.cssText = `width:${fs * 1.5}px;height:${fs * 1.5}px;flex:none;border-radius:calc(var(--x-radius) * 0.22);background:var(--x-accent);box-shadow:inset 0 0 0 ${fs * 0.32}px color-mix(in srgb, var(--x-accent-ink) 30%, var(--x-accent));`;
      bar.append(ic);
    }
    const tt = doc.createElement("div");
    tt.textContent = title;
    tt.style.cssText = "overflow:hidden;text-overflow:ellipsis;font-family:var(--x-head-font);font-weight:var(--x-head-weight);";
    if (title) bar.append(tt);
    if (p.date) {
      const sep = doc.createElement("div");
      sep.style.cssText = `width:1px;height:${fs}px;background:var(--x-line);flex:none;`;
      const dd = doc.createElement("div");
      dd.textContent = p.date;
      dd.style.cssText = `font-family:var(--x-mono-font);color:var(--x-dim);font-size:${fs * 0.86}px;`;
      bar.append(sep, dd);
    }
    host.append(bar);

    const a = at, b = at + 0.5, h0 = at + 0.15, h1 = at + 0.55;
    const lift = ML.clamp(p.lift, 6, 20) * k, sc = ML.clamp(p.shrink, 0.94, 1);
    ctx.sfx(a, "whoosh.soft", 0.2);
    // power2.inOut
    const io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    return {
      draw(t) {
        const u = io(ML.lin(t, a, b));
        block.forEach((e, i) => {
          e.style.transformOrigin = origin[i];
          e.style.transform = u > 0 ? `translateY(${(-lift * u).toFixed(2)}px) scale(${(1 - (1 - sc) * u).toFixed(4)})` : "none";
        });
        const v = ML.ease(t, h0, h1);
        bar.style.visibility = v > 0 ? "visible" : "hidden";
        bar.style.opacity = v.toFixed(4);
        bar.style.transform = `translateY(${((1 - v) * -6 * k).toFixed(2)}px)`;
      },
    };
  },
});
