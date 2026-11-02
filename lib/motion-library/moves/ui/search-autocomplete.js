// Search bar types and drops suggestions: a pill search bar (420 × 44 at 1×, full radius, a magnifier) opens from 40 %
// to full width while it fades up out of a soft grey blur (0.3 s, power3.out); a query types itself at 12–16 chars/s
// behind a caret; 0.2 s after the last character a dropdown panel (panel colour, small radius, the look's shadow) unfolds
// from the top (scaleY 0 → 1, 0.25 s) and its suggestion rows land 0.06 s apart — the typed part in normal weight, the
// completion lighter. With click_suggestion a row lights up, the query fills with it and the list folds away.
// On a text line the query is the line's own words; elsewhere the bar is built in the picture region.
// Source: prompt-motion sab8a "opus 5.5 openedit prompt" (reference only — our own rebuild).
ML.define({
  id: "ui.search-autocomplete",
  category: "ui",
  name: "Search bar types and drops suggestions",
  does: "A pill search bar opens, a query types itself, and an autocomplete list of funny suggestions drops below.",
  says: ["problem", "story", "playful"],
  energy: 3,
  targets: ["screen", "line"],
  duration: [1.5, 3],
  params: {
    suggestions: { type: "number", range: [2, 6], default: 3 },
    theme: { type: "choice", options: ["light", "dark"], default: "light" },
    click_suggestion: { type: "bool", default: false },
    chars_per_s: { type: "number", range: [12, 16], default: 14 },
    query: { type: "text" },
    completions: { type: "text" },
  },
  pairs: ["ui.caret-blink", "ui.cursor-glide-click"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:sab8a-opus-5-5-openedit-prompt", license: "reference", note: "our own code" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const el = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isLine = el && el.children.length === 0 && (el.textContent || "").trim().length > 0;

    // the words
    const own = isLine ? el.textContent.trim() : "";
    const query = p.query || own || (rtl ? "إزاي أطبق ملاية بأستك" : "how to fold a fitted sheet");
    const DEF = rtl
      ? [" من غير ما أعيّط", " في أقل من ١٠ دقايق", " هل ده ممكن أصلاً", " وأنا لوحدي", " بالفيديو", " ولا أرميها"]
      : [" without crying", " in under 10 minutes", " is it even possible", " alone at 2am", " video slow motion", " or just give up"];
    const given = String(p.completions || "").split(/[|,،]/).map((s) => s.trim()).filter(Boolean).map((s) => " " + s);
    const n = Math.round(ML.clamp(p.suggestions, 2, 6));
    const rows = [...given, ...DEF].slice(0, n);

    // the host: the line itself (its text becomes the bar) or the picture region
    let host, R;
    if (isLine) {
      el.textContent = "";
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      host = el; const w = el.clientWidth || f.pic.w;
      R = { x: 0, y: 0, w, h: 0 };
    } else if (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      host = el; R = { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight };
    } else { host = ctx.scene || ctx.stage; R = f.pic; }

    const dark = p.theme === "dark";
    const bg = dark ? "var(--x-ink)" : "var(--x-panel)", fg = dark ? "var(--x-panel)" : "var(--x-ink)";
    const dim = dark ? "color-mix(in srgb, var(--x-panel) 55%, transparent)" : "var(--x-dim)";
    const font = rtl ? "var(--x-body-font)" : "var(--x-mono-font)";
    const W = Math.min(R.w, 900 * k), H = Math.max(56, 96 * k), fs = H * 0.36;
    const top = isLine ? 0 : R.y + Math.max(0, R.h * 0.3 - H);
    // its own compositing layer: the caret and the typing never re-raster the scene beneath (pixel-stable frames)
    const wrap = mk("div", `position:${isLine ? "relative" : "absolute"};${isLine ? "margin:0 auto;" : `left:${(R.x + (R.w - W) / 2).toFixed(1)}px;top:${top.toFixed(1)}px;`}width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;z-index:6;pointer-events:none;will-change:transform;`, host);
    wrap.dir = rtl ? "rtl" : "ltr";
    const pill = mk("div", `position:absolute;top:0;${rtl ? "right" : "left"}:0;height:100%;width:100%;box-sizing:border-box;border-radius:var(--x-radius-s);background:${bg};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);display:flex;align-items:center;gap:${(H * 0.22).toFixed(1)}px;padding:0 ${(H * 0.36).toFixed(1)}px;overflow:hidden;`, wrap);
    const mag = mk("span", `flex:none;width:${(H * 0.36).toFixed(1)}px;height:${(H * 0.36).toFixed(1)}px;`, pill);
    mag.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${dim}" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`;
    const field = mk("span", `flex:1;min-width:0;white-space:nowrap;overflow:hidden;font:500 ${fs.toFixed(1)}px ${font};color:${fg};`, pill);
    const typed = mk("span", "", field);
    const caret = mk("span", `display:inline-block;width:${Math.max(2, 3 * k).toFixed(1)}px;height:1.15em;vertical-align:-0.22em;margin-inline-start:${(2 * k).toFixed(1)}px;background:var(--x-accent);`, field);

    // the dropdown
    const drop = mk("div", `position:absolute;top:${(H + 10 * k).toFixed(1)}px;left:0;right:0;box-sizing:border-box;padding:${(10 * k).toFixed(1)}px 0;border-radius:calc(var(--x-radius) * 0.33);background:${bg};border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);transform-origin:50% 0;overflow:hidden;`, wrap);
    const rowEls = rows.map((c) => {
      const r = mk("div", `display:flex;align-items:center;gap:${(H * 0.22).toFixed(1)}px;padding:${(H * 0.16).toFixed(1)}px ${(H * 0.36).toFixed(1)}px;font:${fs.toFixed(1)}px ${font};white-space:nowrap;overflow:hidden;`, drop);
      const ic = mk("span", `flex:none;width:${(H * 0.3).toFixed(1)}px;height:${(H * 0.3).toFixed(1)}px;opacity:.6;`, r);
      ic.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${dim}" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`;
      const tx = mk("span", "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", r);
      mk("span", `font-weight:500;color:${fg};`, tx, query);
      mk("span", `font-weight:300;color:${dim};`, tx, c);
      return r;
    });

    // the joke is in the completion, so it must not be cut: all rows share one size, small enough for the longest
    const fitRows = () => {
      const texts = rowEls.map((r) => r.lastElementChild), widest = Math.max(...texts.map((x) => x.scrollWidth)), room = Math.min(...texts.map((x) => x.clientWidth));
      if (widest > room && room > 0) { const size = Math.max(fs * 0.6, fs * (room / widest) * 0.98); rowEls.forEach((r) => (r.style.fontSize = size.toFixed(1) + "px")); }
    };
    fitRows();

    // timing
    const cps = ML.clamp(p.chars_per_s, 12, 16), chars = Array.from(query).length;
    const tIn = at, tType = at + 0.35;
    const tailRoom = p.click_suggestion ? 1.5 : 0.9;
    const tDone = Math.min(tType + chars / cps, Math.max(tType + 0.4, end - tailRoom - 0.3));
    const tDrop = tDone + 0.2;
    const pick = Math.min(1, rows.length - 1);
    const tClick = p.click_suggestion ? Math.min(end - 0.6, tDrop + 0.25 + rows.length * 0.06 + 0.45) : Infinity;
    const full = query + rows[pick];
    ctx.sfx(tIn, "whoosh.soft", 0.18);
    for (let s = tType; s < tDone; s += 0.28) ctx.sfx(s, "key", 0.2);
    ctx.sfx(tDrop, "pop.soft", 0.25);
    if (p.click_suggestion) ctx.sfx(tClick, "click", 0.35);

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.25, end);
        const u = ML.out(t, tIn, tIn + 0.3); // power3.out ≈ cubic out
        wrap.style.opacity = (t < tIn ? 0 : u * (1 - leave)).toFixed(4);
        pill.style.width = `${(40 + 60 * u).toFixed(2)}%`;
        const bl = (1 - u) * 8 * k;
        pill.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px) grayscale(${(1 - u).toFixed(3)})` : "none";
        // the query, then (after a click) the chosen suggestion
        const clicked = t >= tClick + 0.12;
        typed.textContent = clicked ? full : ML.typed(query, t, tType, tDone);
        caret.style.opacity = t < tType - 0.05 ? "0" : t < tDone ? "1" : String(ML.blink(t - tDone, 1));
        // the dropdown
        const dOpen = ML.out(t, tDrop, tDrop + 0.25), dClose = ML.lin(t, tClick + 0.15, tClick + 0.35);
        const dv = dOpen * (1 - dClose);
        drop.style.opacity = dv > 0 ? Math.min(1, dv * 2).toFixed(4) : "0";
        drop.style.scale = `1 ${Math.max(0.001, dv).toFixed(4)}`;
        rowEls.forEach((r, i) => {
          const s = tDrop + 0.08 + i * 0.06, q = ML.out(t, s, s + 0.2);
          r.style.opacity = q.toFixed(4);
          r.style.translate = `0 ${((1 - q) * -6 * k).toFixed(2)}px`;
          const hi = i === pick ? ML.lin(t, tClick - 0.3, tClick - 0.15) : 0;
          r.style.background = hi > 0 ? `color-mix(in srgb, var(--x-accent) ${(hi * 14).toFixed(1)}%, transparent)` : "transparent";
        });
      },
    };
  },
});
