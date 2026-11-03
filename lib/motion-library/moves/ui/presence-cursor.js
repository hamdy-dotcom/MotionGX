// Named collaborator cursor: a coloured arrow (white-edged, drop-shadowed, turned −12°) with a name pill attached at its
// foot. It arrives on a slight arc (0.8 s power2.inOut), then either hovers (idle-bob: y 0 → −bob, x 0 → 10/15 of it,
// rotation 0 → 5°, 3 s sine.inOut yoyo) or roams a curved path between 2–3 things on the scene, each segment 0.6–0.8 s
// power2.inOut with a 0.15 s pause and a tiny 0.9 click squash at every stop. Several cursors take different colours and
// names for a collaboration story. In Arabic the arrow mirrors and the pill sits at its other side.
// Sources: MengTo/Skills web-design/gooey-blob-system demo (MIT: the arrow path, the name pill, the bob's numbers);
// prompt-motion kikelopezdesign "lol i asked opus…" (reference only: the roam).
ML.define({
  id: "ui.presence-cursor",
  category: "ui",
  name: "Named collaborator cursor",
  does: "A coloured arrow cursor with a name pill hovers near the content or roams between artboards, as if a live collaborator is there.",
  says: ["connection", "playful", "trust", "tech", "story"],
  energy: 2,
  targets: ["cursor"],
  duration: [1.5, 6],
  params: {
    motion: { type: "choice", options: ["idle-bob", "roam"], default: "idle-bob" },
    count: { type: "number", range: [1, 3], default: 1 },
    name: { type: "text" },
    colour: { type: "text" },
    bob: { type: "number", range: [5, 20], default: 15, unit: "px" },
  },
  pairs: ["ui.selection-box-grow", "ui.live-edit-apply"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "click",
  source: { from: "MengTo/Skills:web-design/gooey-blob-system", license: "MIT", note: "floating cursor from demo/index.html; the roam rebuilt from prompt-motion:kikelopezdesign-lol-i-asked-opus (reference)" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, host = ctx.scene || stage, k = Math.min(f.W, f.H) / 1080, s = 2.4 * k;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const count = Math.round(ML.clamp(p.count, 1, 3));
    const names = p.name ? String(p.name).split(/\s*[,،|]\s*/).filter(Boolean) : [];
    const FALLBACK = rtl ? ["سارة", "عمر", "لينا"] : ["Sarah", "Omar", "Lina"];
    const COLOURS = [p.colour || "var(--x-accent)", "var(--x-good)", "var(--x-bad)"];

    // what they hover: the target first, then whatever is on the scene (else points across the safe region)
    const seen = new Set(), anchors = [];
    const add = (e) => { if (!e || seen.has(e)) return; seen.add(e); const b = ctx.box(e); if (b.w > 4 && b.h > 4) anchors.push(b); };
    if (el && el !== stage) add(el);
    host.querySelectorAll("[data-slot], [data-slot-sample], .ml-title, .ml-sub").forEach(add);
    if (anchors.length < 3) { const S = f.safe; [[0.3, 0.3], [0.7, 0.5], [0.4, 0.75]].forEach(([x, y]) => anchors.push({ x: S.x + S.w * x, y: S.y + S.h * y, w: 0, h: 0 })); }

    const layer = mk("position:absolute;inset:0;z-index:20;pointer-events:none;overflow:hidden;", host);
    const cursors = Array.from({ length: count }, (_, i) => {
      const colour = COLOURS[i], box = mk(`position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;filter:drop-shadow(0 ${(4 * k).toFixed(1)}px ${(8 * k).toFixed(1)}px color-mix(in srgb, var(--x-device) 40%, transparent));`, layer);
      const size = 24 * s, tipX = (3.4 / 24) * size, tipY = (2.6 / 24) * size;
      const arrow = mk(`position:absolute;top:${(-tipY).toFixed(1)}px;${rtl ? "right" : "left"}:${(-tipX).toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;${rtl ? "transform:scaleX(-1);" : ""}`, box);
      arrow.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block;overflow:visible;transform:rotate(-12deg);transform-origin:${tipX.toFixed(1)}px ${tipY.toFixed(1)}px"><path d="M4.3314 2.81055L21.3659 10.3703C22.6106 10.9221 22.5186 12.7235 21.2223 13.1517L14.7788 15.28L12.6505 21.7235C12.2223 23.0198 10.4209 23.1118 9.8691 21.8671L2.30932 4.8326C1.73715 3.55169 3.05047 2.23837 4.3314 2.81055Z" fill="${colour}" stroke="var(--x-pointer-edge)" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
      const pill = mk(`position:absolute;top:${(size * 0.74).toFixed(1)}px;${rtl ? "right" : "left"}:${(size * 0.66).toFixed(1)}px;padding:${(6 * s * 0.85).toFixed(1)}px ${(12 * s * 0.85).toFixed(1)}px;border-radius:var(--x-radius-s);background:${colour};color:var(--x-accent-ink);font:500 ${(12 * s).toFixed(1)}px/1.1 var(--x-body-font);white-space:nowrap;`, box, names[i] || (i === 0 && p.name) || FALLBACK[i]);

      // its stops (the tip's points) on the things it visits; kept so the pill stays inside the frame
      const room = pill.offsetWidth + size, n = anchors.length;
      const clampPt = (q) => ({ x: ML.clamp(q.x, rtl ? room + 12 * k : 24 * k, rtl ? f.W - 24 * k : f.W - room - 12 * k), y: ML.clamp(q.y, 40 * k, f.H - size * 2) });
      const stops = [0, 1, 2].map((j) => {
        const a = anchors[(i * 2 + j * 3) % n];
        return clampPt({ x: a.x + a.w * (0.28 + 0.44 * ML.rnd(i + 1, j + 3)), y: a.y + a.h * (0.45 + 0.4 * ML.rnd(i + 5, j + 7)) });
      });
      const a0 = at + i * 0.25;
      const home = stops[0], from = { x: home.x + (rtl ? -1 : 1) * 260 * k, y: home.y + 300 * k };
      // the route: the arrival, then stop to stop until the scene is nearly over
      const legs = [{ a: a0, b: a0 + 0.8, from, to: home, bend: 0.14 }];
      if (p.motion === "roam") {
        let tt = a0 + 0.8 + 0.15, cur = 0, j = 0;
        while (tt < end - 0.8) {
          const next = (cur + 1) % stops.length, d = 0.6 + 0.2 * ML.rnd(i + 2, j + 11);
          legs.push({ a: tt, b: tt + d, from: stops[cur], to: stops[next], bend: j % 2 ? 0.16 : -0.16 });
          tt += d + 0.15; cur = next; j++;
        }
      }
      if (i === 0) legs.forEach((l, q) => (q === 0 ? ctx.sfx(l.b, "tap", 0.15) : ctx.sfx(l.b, "click", 0.18)));
      return { box, legs, a0, i };
    });

    const inOut2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const dir = rtl ? -1 : 1;
    return {
      draw(t) {
        const gone = ML.clamp((t - (end - 0.25)) / 0.22);
        layer.style.opacity = (1 - gone).toFixed(4);
        for (const c of cursors) {
          c.box.style.visibility = t < c.a0 ? "hidden" : "visible";
          let leg = c.legs[0];
          for (const l of c.legs) if (t >= l.a) leg = l;
          const u = inOut2(ML.lin(t, leg.a, leg.b));
          const dx = leg.to.x - leg.from.x, dy = leg.to.y - leg.from.y, arc = Math.sin(Math.PI * u) * leg.bend;
          let x = leg.from.x + dx * u - dy * arc, y = leg.from.y + dy * u + dx * arc;
          // the squash on landing: 0.15 s dip to 0.9
          const sq = t >= leg.b ? Math.sin(Math.PI * ML.lin(t, leg.b, leg.b + 0.15)) : 0;
          let rot = 0;
          if (p.motion !== "roam") {
            // the bob: a 3 s sine.inOut yoyo, from the moment it has landed
            const v = t > leg.b ? 0.5 - 0.5 * Math.cos((Math.PI * (t - leg.b + c.i * 0.7)) / 3) : 0;
            x += dir * ((v * p.bob * 10) / 15) * 2 * k;
            y -= v * p.bob * 2 * k;
            rot = v * 5;
          }
          c.box.style.opacity = ML.lin(t, c.a0, c.a0 + 0.15).toFixed(4);
          c.box.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
          c.box.style.rotate = rot > 0.001 ? `${(dir * rot).toFixed(2)}deg` : "none";
          const sc = 1 - 0.1 * sq;
          c.box.style.scale = sq > 0.001 ? sc.toFixed(4) : "none";
        }
      },
    };
  },
});
