// Vertical hanging title: a title (or a second-script word, a number, a date) runs top to bottom along the frame's outer
// edge, quiet and large, under the top chrome so it never crosses the artwork. Upright Latin uses writing-mode
// vertical-rl with letters stacked; "rotated" (and always Arabic, which is never stacked letter by letter) turns the
// whole line a quarter turn (Latin 90°, Arabic −90° so both read downwards). Sizes: mark 13 px at .62em tracking, title
// 30–82 px at .06–.12em (scaled to the frame and fitted to the column), ink at 50–62% (or .93 beside a companion).
// Companion: the target becomes a giant serif chapter title (14.2% of the frame wide, line-height .79, −0.024em) with
// the column at the outer edge; on tall frames the column hangs after the title. Enter: fade + 20 px rise over 0.9 s
// (look ease) or per-character 0.06 s stagger; the column arrives with the title, holds, leaves with the scene.
// Source: MengTo/Skills web-design/horizontal-scroll-scenes demo.html (.big em vertical-rl) and
// build-threejs-scroll-worlds demo (MIT).
ML.define({
  id: "kinetic.vertical-type",
  category: "kinetic",
  name: "Vertical hanging title",
  does: "A title or a second-script word runs top to bottom along the frame edge, quiet and large, optionally beside a giant chapter title.",
  says: ["brand", "story", "calm", "luxury"],
  energy: 2,
  targets: ["headline", "label", "word"],
  duration: [2, 8],
  params: {
    size: { type: "choice", options: ["mark", "title"], default: "title" },
    side: { type: "choice", options: ["right", "left"], default: "right" },
    orientation: { type: "choice", options: ["upright", "rotated"], default: "rotated" },
    companion: { type: "choice", options: ["none", "giant-title"], default: "none" },
    content: { type: "choice", options: ["title", "native-word", "number", "date"], default: "title" },
    enter: { type: "choice", options: ["fade-rise", "per-char"], default: "fade-rise" },
    opacity: { type: "number", range: [0.5, 1], default: 0.6 },
    text: { type: "text", default: "" },
  },
  pairs: ["kinetic.ghost-backdrop-word", "camera.analytical-drift"],
  avoid: ["urgency", "energy"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "MengTo/Skills:web-design/horizontal-scroll-scenes", license: "MIT", note: "demo.html .big em writing-mode vertical-rl column; build-threejs-scroll-worlds vertical marks" },
  setup(ctx) {
    const { el, p, at, end } = ctx;
    const host = ctx.scene || ctx.stage, doc = host.ownerDocument;
    const f = ctx.f, W = f.W, H = f.H, k = Math.min(W, H) / 1080;
    const isStage = !el || el === ctx.stage;
    const textOf = (n) => (n && n.textContent ? n.textContent.replace(/\s+/g, " ").trim() : "");
    const find = (slot) => host.querySelector(`[data-slot="${slot}"], [data-slot-sample="${slot}"]`);
    const own = isStage ? textOf(host.querySelector(".ml-title")) : textOf(el);
    const companion = p.companion === "giant-title" && !isStage;
    // what the column says
    let txt = p.text;
    if (!txt) {
      if (p.content === "native-word") txt = own.split(" ")[0];
      else if (p.content === "number") txt = textOf(find("number")) || (own.match(/[\d.,:]+/) || [own])[0];
      else if (p.content === "date") txt = (own.match(/\d[\d./:-]*/) || [])[0] || textOf(find("number")) || own.split(" ")[0];
      else if (companion) {
        // the column takes over another slot's words: that slot leaves the layout, or the words would show twice
        const other = [find("word"), find("label")].find((n) => n && n !== el && textOf(n));
        txt = other ? textOf(other) : own;
        if (other) other.style.display = "none";
      } else txt = own;
    }
    if (!txt) return null;
    const arabic = ML.ARABIC.test(txt);
    const rtl = ctx.rtl;
    const side = (p.side === "right") !== !!rtl ? "right" : "left"; // the outer edge mirrors for RTL
    const upright = p.orientation === "upright" && !arabic;
    // ── the giant companion title (the target itself) ──
    const colGap = 40 * k;
    const cur0 = companion ? parseFloat(getComputedStyle(el).fontSize) || 56 : 0; // the size it had: the giant never ends up below it
    if (companion) {
      Object.assign(el.style, { fontFamily: "var(--x-serif-font)", fontWeight: "400", lineHeight: "0.79", letterSpacing: arabic || rtl ? "0" : "-0.024em", textTransform: "none", textAlign: side === "right" ? "left" : "right" });
      el.style.fontSize = (W * 0.142).toFixed(1) + "px";
    }
    // ── the column ──
    const col = doc.createElement("div");
    Object.assign(col.style, { position: "absolute", zIndex: "3", pointerEvents: "none" });
    const line = doc.createElement("div");
    const markPx = 22 * k, titlePx = (f.wide ? 82 : 80) * k;
    const px = p.size === "mark" ? markPx : titlePx;
    const track = arabic ? "0" : p.size === "mark" ? "0.62em" : p.content === "number" || p.content === "date" ? "0.12em" : "0.08em";
    Object.assign(line.style, {
      font: `${p.size === "mark" ? "var(--x-label-weight)" : "var(--x-head-weight)"} ${px}px / 1 ${p.size === "mark" || p.content === "date" ? "var(--x-label-font)" : "var(--x-head-font)"}`,
      letterSpacing: track, textTransform: p.size === "mark" && !arabic ? "uppercase" : "none", whiteSpace: "nowrap", color: "var(--x-ink)", direction: arabic ? "rtl" : "ltr",
      fontVariantNumeric: "tabular-nums",
    });
    line.textContent = txt;
    if (upright) Object.assign(line.style, { writingMode: "vertical-rl", textOrientation: "upright" });
    col.append(line);
    host.append(col);
    const units = p.enter === "per-char" ? ML.split(line, "chars") : [];
    // fit the column's length into the room it hangs in
    const top0 = f.safe.y;
    let room = f.safe.h;
    let gb = null;
    if (companion) {
      ML.fit(el, f.safe.w - titlePx * 1.4 - colGap);
      // and never taller than the band it sits in (a wide frame's headline band is short)
      const band = el.parentElement;
      if (band && band !== host && band !== ctx.stage) {
        const need = () => [...band.children].reduce((sum, c) => sum + c.offsetHeight, 0);
        let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
        while (need() > band.clientHeight && size > cur0 && guard++ < 30) { size = Math.max(cur0, size * 0.92); el.style.fontSize = size.toFixed(1) + "px"; }
      }
      gb = ctx.box(el);
      if (f.tall) room = Math.max(H * 0.25, f.safe.y + f.safe.h - (gb.y + gb.h + colGap));
    }
    const lenOf = () => (upright ? line.offsetHeight : line.offsetWidth);
    let len = lenOf();
    if (len > room) { line.style.fontSize = (px * room / len).toFixed(2) + "px"; len = lenOf(); }
    const thick = upright ? line.offsetWidth : line.offsetHeight;
    // place: upright stands as is; rotated turns the horizontal line inside a vertical box
    Object.assign(col.style, { width: thick + "px", height: len + "px" });
    if (!upright) Object.assign(line.style, { position: "absolute", left: ((thick - len) / 2).toFixed(1) + "px", top: ((len - thick) / 2).toFixed(1) + "px", width: len + "px", transform: `rotate(${arabic ? -90 : 90}deg)` });
    const edge = Math.max(16 * k, f.m * 0.3);
    let top = top0;
    if (companion && f.tall && gb) top = gb.y + gb.h + colGap;
    else if (companion && gb) top = gb.y + 0.06 * px;
    col.style.top = Math.min(top, H - len - f.safe.y * 0.3).toFixed(1) + "px";
    col.style[side] = edge.toFixed(1) + "px";
    const alpha = companion ? 0.93 : p.opacity;
    // the target hands its words to the column when it is not the companion
    const hideSource = !isStage && !companion && p.content === "title" && !p.text;
    const lead = at - (ctx.from ?? 0) > 0.2; // a move starting with its scene never flashes the source first
    ctx.sfx(at, "whoosh.soft", 0.12);
    const leave0 = end - 0.35;
    return {
      draw(t) {
        const leave = ML.ease(t, leave0, end);
        const u = ML.out(t, at, at + 0.9);
        if (units.length) {
          col.style.opacity = (alpha * (1 - leave)).toFixed(4);
          units.forEach((c, i) => { const v = ML.out(t, at + i * 0.06, at + i * 0.06 + 0.5); c.style.opacity = v.toFixed(4); c.style.translate = upright ? `0 ${((1 - v) * 20).toFixed(2)}px` : `${((1 - v) * 20 * (arabic ? -1 : 1)).toFixed(2)}px 0`; });
        } else {
          col.style.opacity = (alpha * u * (1 - leave)).toFixed(4);
          col.style.translate = `0 ${((1 - u) * 20).toFixed(2)}px`;
        }
        col.style.visibility = t >= at - 1e-6 ? "visible" : "hidden";
        if (companion) { el.style.opacity = (u * (1 - leave)).toFixed(4); el.style.translate = `0 ${((1 - u) * 20).toFixed(2)}px`; }
        if (hideSource) el.style.opacity = !lead ? "0" : t < at ? "" : t < at + 0.35 ? (1 - u).toFixed(4) : "0";
      },
    };
  },
});
