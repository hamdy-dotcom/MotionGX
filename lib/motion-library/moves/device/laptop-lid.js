// Laptop lid opens / closes: a CSS-3D laptop (deck with keys and trackpad, a lid with a screen on its face and metal on
// its back, both with thickness) whose lid swings on its hinge — close: rotateX from open (105° off the deck) to shut in
// 0.6 s power2.inOut, the screen dimming 1 → 0.3 as it closes, a small bounce off the deck at the end (2°), the shadow
// under the base shrinking; open: the reverse, the screen brightening 0.3 → 1, a small overshoot past open that settles,
// the shadow growing. The screen's light spills on the keys while it is lit. Planes are laid out at their own size and
// never scaled above 1.
// Source: prompt-motion "cansincengiz-me-bu-videoyu-sadece-claude" (reference only: rebuilt as our own code).
ML.define({
  id: "device.laptop-lid",
  category: "device",
  name: "Laptop lid opens / closes",
  does: "The laptop lid swings shut (or open) on its hinge in 3D, screen glow fading out (or in).",
  says: ["story", "change", "calm"],
  energy: 3,
  targets: ["screen"],
  duration: [0.6, 1.5],
  params: {
    direction: { type: "choice", options: ["close", "open"], default: "close" },
    overshoot: { type: "number", range: [0, 5], default: 2, unit: "deg" },
    duration: { type: "number", range: [0.4, 1], default: 0.6, unit: "s" },
  },
  pairs: ["device.laptop-3d-terminal", "transition.recede-fade"],
  avoid: ["urgency"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "land.light",
  source: { from: "prompt-motion:cansincengiz-me-bu-videoyu-sadece-claude", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const given = ctx.el && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const room = given ? ctx.box(given) : { x: ctx.f.pic.x, y: ctx.f.pic.y, w: ctx.f.pic.w, h: ctx.f.pic.h };
    if (given) given.style.visibility = "hidden";
    const host = mk("div", `position:absolute;left:${room.x}px;top:${room.y}px;width:${room.w}px;height:${room.h}px;z-index:4;overflow:hidden;background:var(--x-ground)`, null, ctx.scene || ctx.stage);
    const LW = Math.round(Math.min(room.w * 0.64, (room.h * 0.8) / (0.64 * 1.5))), LH = Math.round(LW * 0.64), D = LH, TH = Math.max(4, Math.round(LW * 0.016));
    host.style.perspective = Math.round(LW * 3.2) + "px";
    host.style.perspectiveOrigin = "50% 35%";
    const metal = "linear-gradient(180deg, color-mix(in srgb, var(--x-panel-2) 78%, var(--x-dim)), color-mix(in srgb, var(--x-panel-2) 58%, var(--x-dim)))";
    const metalDark = "color-mix(in srgb, var(--x-panel-2) 45%, var(--x-dim))";
    const P3 = "transform-style:preserve-3d;position:absolute";
    const rad = Math.round(LW * 0.028);
    const rig = mk("div", `${P3};left:50%;top:${Math.round(room.h * 0.5 + LH * 0.28)}px;width:0;height:0`, null, host);
    const shadow = mk("div", `position:absolute;left:${-LW * 0.62}px;top:${TH}px;width:${LW * 1.24}px;height:${D * 1.3}px;transform-origin:50% 0;transform:rotateX(90deg) translateZ(-1px);background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 34%, transparent), transparent)`, null, rig);
    const deck = mk("div", `${P3};left:${-LW / 2}px;top:0;width:${LW}px;height:${D}px;transform-origin:50% 0;transform:rotateX(90deg);background:${metal};border-radius:0 0 ${rad}px ${rad}px;overflow:hidden`, null, rig);
    const kb = mk("div", `position:absolute;left:9%;right:9%;top:9%;height:50%;display:grid;grid-template-columns:repeat(14, 1fr);grid-template-rows:repeat(5, 1fr);gap:${Math.max(1, Math.round(LW * 0.004))}px;padding:${Math.round(LW * 0.006)}px;border-radius:${Math.round(LW * 0.008)}px;background:${metalDark}`, null, deck);
    const key = (span) => mk("i", `display:block;grid-column:span ${span};border-radius:${Math.max(1, Math.round(LW * 0.003))}px;background:color-mix(in srgb, var(--x-device) 88%, var(--x-panel))`, null, kb);
    for (let i = 0; i < 56; i++) key(1);
    [1, 1, 1, 1, 6, 1, 1, 1, 1].forEach(key);
    mk("div", `position:absolute;left:33%;right:33%;top:65%;bottom:7%;border-radius:${Math.round(LW * 0.01)}px;background:color-mix(in srgb, var(--x-panel-2) 66%, var(--x-dim))`, null, deck);
    // the screen's light on the keys
    const spill = mk("div", "position:absolute;inset:0;background:linear-gradient(180deg, color-mix(in srgb, var(--x-accent-2) 40%, transparent), transparent 60%);mix-blend-mode:screen;opacity:0", null, deck);
    mk("div", `position:absolute;left:${-LW / 2}px;top:0;width:${LW}px;height:${TH}px;transform:translateZ(${D}px);background:${metalDark};border-radius:0 0 ${TH}px ${TH}px`, null, rig);
    for (const s of [-1, 1]) mk("div", `position:absolute;left:${s * LW / 2 - D / 2}px;top:0;width:${D}px;height:${TH}px;transform:translateZ(${D / 2}px) rotateY(${s * 90}deg);background:${metalDark}`, null, rig);
    // the lid, hinged a hair above the deck so it rests on it when shut
    const lift = Math.max(2, Math.round(TH * 0.6));
    const lid = mk("div", `${P3};left:${-LW / 2}px;top:${-LH - lift}px;width:${LW}px;height:${LH}px;transform-origin:50% 100%`, null, rig);
    const bez = Math.round(LW * 0.022);
    const front = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${bez}px ${bez}px ${Math.round(bez * 1.6)}px;background:var(--x-device);border-radius:${rad}px ${rad}px ${Math.round(LW * 0.008)}px ${Math.round(LW * 0.008)}px;backface-visibility:hidden;-webkit-backface-visibility:hidden`, null, lid);
    const back = mk("div", `position:absolute;inset:0;transform:rotateY(180deg) translateZ(${lift * 0.5}px);background:${metal};border-radius:${rad}px ${rad}px ${Math.round(LW * 0.008)}px ${Math.round(LW * 0.008)}px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;align-items:center;justify-content:center`, null, lid);
    mk("i", `display:block;width:${Math.round(LW * 0.07)}px;height:${Math.round(LW * 0.07)}px;border-radius:30%;background:color-mix(in srgb, var(--x-panel) 55%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--x-ink) 10%, transparent)`, null, back);
    const screen = mk("div", "position:relative;width:100%;height:100%;overflow:hidden;border-radius:3px", null, front);
    // what's on the screen: a real app
    const SW = LW - 2 * bez, fs = SW / 42;
    const app = mk("div", `position:absolute;inset:0;display:flex;font-size:${fs.toFixed(2)}px;background:var(--x-ground);color:var(--x-ink);font-family:var(--x-body-font);direction:${rtl ? "rtl" : "ltr"}`, null, screen);
    const side = mk("div", "flex:none;width:22%;padding:1em 0.8em;display:flex;flex-direction:column;gap:0.5em;background:var(--x-panel-2);border-inline-end:var(--x-edge) solid var(--x-line)", null, app);
    mk("div", "width:1.8em;height:1.8em;border-radius:0.5em;background:var(--x-accent);margin-bottom:0.6em", null, side);
    (rtl ? ["الرئيسية", "الطلبات", "العملاء", "التقارير"] : ["Home", "Orders", "Customers", "Reports"]).forEach((n, i) => mk("div", `padding:0.35em 0.6em;border-radius:0.5em;font-size:0.9em;white-space:nowrap;${i === 0 ? "background:color-mix(in srgb, var(--x-accent) 14%, transparent);color:var(--x-accent);font-weight:600" : "color:var(--x-dim)"}`, n, side));
    const main = mk("div", "flex:1;min-width:0;padding:1.1em 1.3em;display:flex;flex-direction:column;gap:0.8em", null, app);
    mk("div", "font:var(--x-head-weight) 1.6em var(--x-head-font)", rtl ? "خلّصنا شغل النهارده" : "All done for today", main);
    const stats = mk("div", "display:grid;grid-template-columns:repeat(3,1fr);gap:0.7em", null, main);
    (rtl ? [["المهام", "24"], ["الوقت", "6:40"], ["التركيز", "92%"]] : [["Tasks", "24"], ["Time", "6:40"], ["Focus", "92%"]]).forEach(([l, v]) => { const c = mk("div", "padding:0.7em 0.9em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)", null, stats); mk("div", "font-size:0.75em;color:var(--x-dim)", l, c); mk("div", "font:700 1.4em var(--x-head-font)", v, c); });
    const chart = mk("div", "flex:1;display:flex;align-items:flex-end;gap:3%;padding:0.8em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)", null, main);
    for (let i = 0; i < 12; i++) mk("i", `display:block;flex:1;height:${(25 + 70 * ML.rnd(i, 9) * (0.5 + i / 22)).toFixed(1)}%;border-radius:0.25em 0.25em 0 0;background:${i === 11 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 32%, transparent)"}`, null, chart);
    const dimmer = mk("div", "position:absolute;inset:0;background:var(--x-device);opacity:0;pointer-events:none", null, screen);
    // the swing
    const OPEN = 105, close = p.direction !== "open", dur = p.duration;
    const t1 = at + dur;
    const angle = (t) => {
      const u = ML.ease(t, at, t1);
      if (close) {
        const bounce = t > t1 ? p.overshoot * Math.sin(Math.PI * ML.clamp((t - t1) / 0.2)) * (1 - ML.clamp((t - t1) / 0.2) * 0.3) : 0;
        return OPEN * (1 - u) + bounce;
      }
      const os = p.overshoot * Math.sin(Math.PI * ML.clamp((t - (t1 - 0.12)) / 0.4));
      return OPEN * u + (t > t1 - 0.12 ? os : 0);
    };
    ctx.sfx(close ? t1 : t1 - 0.05, "land.light", 0.45);
    const from = ctx.from ?? at - 0.2;
    const leave = Math.max(t1 + 0.4, end - 0.3);
    return {
      draw(t) {
        const a = angle(t), u = ML.ease(t, at, t1);
        lid.style.transform = `rotateX(${(a - 90).toFixed(3)}deg)`;
        const b = close ? 1 - 0.7 * u : 0.3 + 0.7 * u; // screen brightness
        dimmer.style.opacity = (1 - b).toFixed(4);
        spill.style.opacity = (Math.max(0, b - 0.3) / 0.7 * 0.35 * ML.clamp(a / 40)).toFixed(4);
        const sh = close ? 1 - 0.15 * u : 0.85 + 0.15 * u;
        shadow.style.transform = `rotateX(90deg) translateZ(-1px) scale(${(0.9 + 0.1 * sh).toFixed(4)}, ${sh.toFixed(4)})`;
        shadow.style.opacity = (0.7 + 0.3 * sh).toFixed(4);
        const gone = ML.ease(t, leave, leave + 0.25);
        host.style.opacity = (ML.ease(t, from, from + 0.15) * (1 - gone)).toFixed(4);
        rig.style.transform = `rotateX(-18deg) rotateY(${(rtl ? 12 : -12).toFixed(1)}deg)`;
      },
    };
  },
});
