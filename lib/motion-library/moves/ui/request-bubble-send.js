// Chat request typed and sent. Bubble variant (scenes.js S.phone): a request panel with a tail corner (radius 34 34 34 8
// at 1080, mirrored in Arabic) — label, the typed line with its caret, the brand send button — fades in at word − 0.5
// (y 40 → 0, 0.4 s), types over `typing` s from word − 0.3, and a pointer glides on an arc and clicks send at word + 0.9
// (the button dips, the caret goes). Window variant (prompt-motion majorbaguette): an accent "01" step chip and a mono
// "ASK IN CHAT" label fade in, a dark rounded window (the look's ink, traffic lights, title + mono status) rises
// y 20 → 0 over 0.5 s power3.out, the user's bubble on the reading end grows in width as the text types (40 ms a
// character), and a caption below lights its keyword in the accent.
// Sources: MotionGX lib/studio-engine/assets/scenes.js S.phone (own); prompt-motion majorbaguette "opus 5.5 is pretty…"
// (reference only — our own rebuild).
ML.define({
  id: "ui.request-bubble-send",
  category: "ui",
  name: "Chat request typed and sent",
  does: "A chat request bubble appears (optionally inside an app window that rises in), the request types itself, and a pointer taps send.",
  says: ["step", "simplicity", "change", "tech"],
  energy: 2,
  targets: ["card", "line", "cursor", "screen"],
  duration: [2.2, 4],
  params: {
    typing: { type: "number", range: [0.8, 1.6], default: 1, unit: "s" },
    window: { type: "bool", default: false },
    step_chip: { type: "bool", default: false },
    send_click: { type: "bool", default: true },
    request: { type: "text" },
    word: { type: "text", default: "" },
  },
  pairs: ["ui.processing-overlay", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key.return",
  source: { from: "own:lib/studio-engine/assets/scenes.js", license: "own", note: "S.phone request bubble; window variant rebuilt from prompt-motion majorbaguette-opus-5-5-is-pretty (reference)" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; parent.append(e); return e; };
    const px = (v) => (v * k).toFixed(1) + "px";
    const own = !ctx.el || ctx.el === ctx.stage;
    const host = ctx.scene || ctx.stage;
    // a big slot of the director's hosts the chat; a line (or nothing) gets the picture region, and a line it types stands aside
    const slot = !own && ctx.el.offsetHeight >= 240;
    const R = slot ? ctx.box(ctx.el) : f.pic;
    const gives = !own && !slot;
    const L = rtl
      ? { label: "طلب تعديل", req: "خلّي العنوان أكبر وبلون البراند", send: "ابعت", ask: "اطلب في الشات", title: "المساعد", status: "● متصل", caption: ["اطلب", " بس، والباقي عليه"] }
      : { label: "Change request", req: "Make the title bigger, in our brand colour", send: "Send", ask: "Ask in chat", title: "Assistant", status: "● online", caption: ["Just ask", " — it does the rest"] };
    const req = p.request || (gives && ctx.el.textContent.trim()) || L.req;
    const chars = Array.from(req);
    const tail = rtl ? `${px(34)} ${px(34)} ${px(8)} ${px(34)}` : `${px(34)} ${px(34)} ${px(34)} ${px(8)}`;
    const tailEnd = rtl ? `${px(34)} ${px(34)} ${px(34)} ${px(8)}` : `${px(34)} ${px(34)} ${px(8)} ${px(34)}`;

    const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${px(26)};z-index:6;pointer-events:none;background:var(--x-ground);direction:${rtl ? "rtl" : "ltr"};`, host);
    let chipRow = null, win = null, caption = null, bubble, typed, caret, send;
    if (p.step_chip || p.window) {
      chipRow = mk("div", `display:flex;align-items:center;gap:${px(16)};align-self:${p.window ? "center" : "center"};`, wrap);
      if (p.step_chip) mk("div", `padding:${px(6)} ${px(16)};border-radius:${px(8)};background:var(--x-accent);color:var(--x-accent-ink);font:700 ${px(26)} var(--x-mono-font);`, chipRow, "01");
      mk("div", `font:var(--x-label-weight) ${px(22)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, chipRow, L.ask);
    }
    if (p.window) {
      const ww = Math.min(R.w, 900 * k);
      win = mk("div", `width:${ww.toFixed(1)}px;border-radius:${px(18)};overflow:hidden;background:var(--x-ink);color:var(--x-ground);box-shadow:var(--x-shadow);`, wrap);
      const bar = mk("div", `display:flex;align-items:center;gap:${px(16)};padding:${px(18)} ${px(22)};border-bottom:1px solid color-mix(in srgb, var(--x-ground) 12%, transparent);`, win);
      const lights = mk("div", `display:flex;gap:${px(9)};direction:ltr;`, bar);
      ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("i", `width:${px(15)};height:${px(15)};border-radius:50%;background:var(${v});opacity:var(--x-lights);`, lights));
      mk("div", `font:600 ${px(26)} var(--x-body-font);`, bar, L.title);
      mk("div", `margin-inline-start:auto;font:500 ${px(20)} var(--x-mono-font);color:var(--x-good);`, bar, L.status);
      const body = mk("div", `display:flex;flex-direction:column;align-items:flex-end;padding:${px(34)} ${px(28)};min-height:${px(340)};justify-content:flex-end;gap:${px(18)};`, win);
      bubble = mk("div", `max-width:82%;box-sizing:border-box;padding:${px(20)} ${px(28)};border-radius:${tailEnd};background:var(--x-accent);color:var(--x-accent-ink);font:500 ${px(34)}/1.35 var(--x-body-font);`, body);
      typed = mk("span", "", bubble);
      caret = mk("span", `display:inline-block;width:${px(3)};height:1em;vertical-align:-0.12em;margin-inline-start:${px(3)};background:currentColor;`, bubble);
      const row = mk("div", `align-self:stretch;display:flex;align-items:center;gap:${px(14)};padding-block:${px(12)};padding-inline:${px(24)} ${px(12)};border-radius:var(--x-radius-s);background:color-mix(in srgb, var(--x-ground) 10%, transparent);font:400 ${px(26)} var(--x-body-font);color:color-mix(in srgb, var(--x-ground) 55%, transparent);`, body);
      mk("div", "flex:1;", row, rtl ? "اكتب رسالة…" : "Message…");
      send = mk("div", `width:${px(56)};height:${px(56)};border-radius:50%;background:var(--x-accent);color:var(--x-accent-ink);display:grid;place-items:center;`, row);
      send.innerHTML = `<svg viewBox="0 0 24 24" width="${(26 * k).toFixed(1)}" height="${(26 * k).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>`;
      caption = mk("div", `font:500 ${px(36)}/1.3 var(--x-body-font);color:var(--x-ink);text-align:center;`, wrap);
      const hl = mk("span", `background:linear-gradient(var(--x-accent), var(--x-accent)) no-repeat ${rtl ? "100%" : "0"} 85% / 0% 40%;padding:0 ${px(4)};`, caption, L.caption[0]);
      caption.append(L.caption[1]);
      caption._hl = hl;
    } else {
      bubble = mk("div", `max-width:${Math.min(R.w, 720 * k).toFixed(1)}px;box-sizing:border-box;padding:${px(26)} ${px(34)};border-radius:${tail};background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);box-shadow:var(--x-shadow);color:var(--x-ink);align-self:${rtl ? "flex-start" : "flex-end"};margin-inline:${px(20)};`, wrap);
      bubble.style.alignSelf = "center";
      mk("div", `font:var(--x-label-weight) ${px(22)} ${rtl ? "var(--x-body-font)" : "var(--x-label-font)"};letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:var(--x-label-case);color:var(--x-dim);`, bubble, L.label);
      const ln = mk("div", `position:relative;margin-top:${px(12)};font:500 ${px(40)}/1.35 var(--x-body-font);`, bubble);
      ln.textContent = req; ln.style.minHeight = ln.offsetHeight + "px"; ln.style.minWidth = Math.min(ln.offsetWidth, 640 * k) + "px"; ln.textContent = "";
      typed = mk("span", "", ln);
      caret = mk("span", `display:inline-block;width:${px(4)};height:1em;vertical-align:-0.12em;margin-inline-start:${px(4)};background:var(--x-accent);`, ln);
      send = mk("div", `display:inline-block;margin-top:${px(18)};padding:${px(14)} ${px(34)};border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font:600 ${px(32)} var(--x-body-font);`, bubble, L.send);
    }

    // timing: on the spoken word (else ~0.6 s in), squeezed so the send lands before the end
    const first = p.word || req.split(/\s+/)[0];
    let T = Math.max(at + 0.5, ctx.word(first, at + 0.6));
    const dType = p.window ? Math.min(p.typing * 1.4, chars.length * 0.04) : p.typing;
    T = Math.min(T, Math.max(at + 0.5, end - 1.3 - Math.max(0, dType - 1.2)));
    const tIn = T - 0.5, t0 = T - 0.3, t1 = t0 + dType, tSend = Math.max(T + 0.9, t1 + 0.25);
    for (let i = 0; i < chars.length; i += 4) ctx.sfx(t0 + (i / chars.length) * dType, "key", 0.22);
    if (p.send_click) { ctx.sfx(tSend - 0.011, "click", 0.4); ctx.sfx(tSend + 0.02, "key.return", 0.45); }

    // the pointer (scenes.js moveClick: an arc in 0.45 s onto the send button)
    typed.textContent = req; // the send button's place with the whole request typed
    const sb = ctx.box(send), target = { x: sb.x + sb.w / 2, y: sb.y + sb.h / 2 };
    const start = { x: f.W * (rtl ? 0.18 : 0.82), y: f.H * 0.96 };
    const cs = 54 * k, tip = [(5 / 24) * cs, (2 / 24) * cs];
    const cur = mk("div", "position:absolute;left:0;top:0;z-index:10;pointer-events:none;opacity:0;", host);
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" style="position:absolute;left:${(-tip[0]).toFixed(1)}px;top:${(-tip[1]).toFixed(1)}px;overflow:visible;transform-origin:${tip[0].toFixed(1)}px ${tip[1].toFixed(1)}px;filter:drop-shadow(0 ${px(4)} ${px(7)} color-mix(in srgb, var(--x-ink) 30%, transparent))"><path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="var(--x-pointer)" stroke="var(--x-pointer-edge)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    const arrow = cur.firstElementChild;
    typed.textContent = "";
    const glide = ML.bezier(0.42, 0, 0.12, 1);
    const power3out = (x) => 1 - Math.pow(1 - x, 3);
    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.2);
        wrap.style.opacity = (t < at ? 0 : ML.lin(t, at, at + 0.15) * (1 - leave)).toFixed(4);
        if (gives) ctx.el.style.opacity = t < at ? "" : (1 - ML.lin(t, at, at + 0.15)).toFixed(4);
        if (chipRow) { const q = ML.out(t, tIn - 0.2, tIn + 0.2); chipRow.style.opacity = (t < tIn - 0.2 ? 0 : q).toFixed(4); }
        if (win) {
          const q = power3out(ML.lin(t, tIn, tIn + 0.5));
          win.style.opacity = (t < tIn ? 0 : q).toFixed(4); win.style.translate = `0 ${((1 - q) * 20 * k).toFixed(2)}px`;
          const b = ML.out(t, t0 - 0.1, t0 + 0.1); bubble.style.opacity = (t < t0 - 0.1 ? 0 : b).toFixed(4);
          const c = ML.out(t, tSend + 0.1, tSend + 0.5); caption.style.opacity = (t < tSend + 0.1 ? 0 : c).toFixed(4);
          caption._hl.style.backgroundSize = `${(ML.ease(t, tSend + 0.35, tSend + 0.8) * 100).toFixed(2)}% 40%`;
        } else {
          const q = ML.out(t, tIn, tIn + 0.4);
          bubble.style.opacity = (t < tIn ? 0 : q).toFixed(4); bubble.style.translate = `0 ${Math.round((1 - q) * 40 * k)}px`;
        }
        typed.textContent = ML.typed(req, t, t0, t1);
        caret.style.opacity = t < t0 - 0.05 || (p.send_click && t >= tSend) ? "0" : t <= t1 ? "1" : String(ML.blink(t - t1, 0.9));
        // the pointer glides on an arc and presses send
        if (p.send_click) {
          const g0 = tSend - 0.45, u = ML.lin(t, g0, tSend), e = glide(u);
          const dx = target.x - start.x, dy = target.y - start.y, len = Math.hypot(dx, dy) || 1, bulge = Math.sin(Math.PI * u) * Math.min(70 * k, len * 0.09);
          const x = start.x + dx * e - (dy / len) * bulge, y = start.y + dy * e + (dx / len) * bulge;
          cur.style.opacity = (t < g0 - 0.2 ? 0 : ML.lin(t, g0 - 0.2, g0) * (1 - ML.lin(t, tSend + 0.5, tSend + 0.8)) * (1 - leave)).toFixed(4);
          cur.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
          const sq = t >= tSend && t < tSend + 0.16 ? 1 - 0.2 * Math.sin((Math.PI * (t - tSend)) / 0.16) : 1;
          arrow.style.transform = sq === 1 ? "none" : `scale(${sq.toFixed(4)})`;
          let s = 1;
          if (t >= tSend && t < tSend + 0.09) s = 1 - 0.06 * ML.out(t, tSend, tSend + 0.09); else if (t >= tSend + 0.09) s = 0.94 + 0.06 * ML.back(t, tSend + 0.09, tSend + 0.39);
          send.style.scale = s === 1 ? "none" : s.toFixed(4);
          send.style.filter = t >= tSend ? `brightness(${(1 + 0.15 * (1 - ML.lin(t, tSend, tSend + 0.4))).toFixed(4)})` : "none";
        }
      },
    };
  },
});
