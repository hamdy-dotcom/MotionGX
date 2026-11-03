// App panel glides in from blur. Side: the panel slides from 40% of its width off its rest (from the reading end of the
// frame) to 0 while a 12 px blur clears over 0.7 s expo.out and its fill shifts from an accent tint to the panel colour;
// its header, list and card stagger in 0.06 s apart. Bottom: panels (a chat 220 × 460, an email card 300 × 200, an app
// 340 × 420 by reference) rise 160 → 0 with blur 8 → 0 and opacity 0 → 1 over 0.8 s power3.out, each 0.15 s after the
// last, while the headline behind blurs out (headline_out); a `prompt` can then type into the chat's input. Targets
// given by the director (up to `count`) are the panels themselves, their children staggering; alone it builds its own.
// Sources: prompt-motion notdwd "another one…", justincooperman "opus 5.5 one shotted…" (reference only, our own rebuild).
ML.define({
  id: "ui.panel-blur-in",
  category: "ui",
  name: "App panel glides in from blur",
  does: "An app panel (or two side by side) glides in from the edge or rises from below, sharpening from a heavy blur as it lands.",
  says: ["arrival", "tech", "simplicity", "flow"],
  energy: 2,
  targets: ["screen", "card"],
  duration: [0.7, 2],
  params: {
    from: { type: "choice", options: ["side", "bottom"], default: "side" },
    count: { type: "number", range: [1, 3], default: 1 },
    blur: { type: "number", range: [6, 16], default: 12, unit: "px" },
    headline_out: { type: "bool", default: false },
    prompt: { type: "text" },
  },
  pairs: ["ui.chat-prompt-typing", "ui.cursor-glide-click"],
  avoid: [],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "whoosh.soft",
  source: { from: "prompt-motion:notdwd-another-one-1000-ai", license: "reference", note: "our own code; the rising pair of panels from prompt-motion:justincooperman-opus-5-5-one-shotted-a" },
  setup(ctx) {
    const { el, p, at, end, f, rtl, stage } = ctx;
    const doc = document, host = ctx.scene || stage;
    const mk = (css, parent, text) => { const e = doc.createElement("div"); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const side = p.from !== "bottom", count = Math.round(ML.clamp(p.count, 1, 3));
    const power3 = (x) => 1 - Math.pow(1 - x, 4);
    const L = rtl
      ? { app: "المشاريع", search: "دوّر هنا", rows: ["الإطلاق الجديد", "فيديو المنتج", "حملة الصيف"], card: "جاهز للمراجعة", cardSub: "٣ مشاهد · ٢٤ ثانية", who: "المساعد", chat: ["لخّصلي الإيميل ده", "تمام. فيه طلب واحد: الموافقة على العرض قبل الخميس."], ph: "اكتب رسالة…", subject: "العرض النهائي", from: "من: منى", send: "رد" }
      : { app: "Projects", search: "Search", rows: ["New launch", "Product film", "Summer campaign"], card: "Ready for review", cardSub: "3 scenes · 24 sec", who: "Assistant", chat: ["Sum up this email for me", "Sure. One ask: approve the offer before Thursday."], ph: "Write a message…", subject: "The final offer", from: "From: Mona", send: "Reply" };

    const bar = (u, w, parent) => mk(`height:${(7 * u).toFixed(1)}px;width:${w}%;border-radius:${(4 * u).toFixed(1)}px;background:color-mix(in srgb, var(--x-ink) 12%, transparent);`, parent);
    const build = {
      app(u, root) {
        const fs = 13 * u, head = mk(`display:flex;align-items:center;gap:${(10 * u).toFixed(1)}px;`, root);
        mk(`flex:none;width:${(26 * u).toFixed(1)}px;height:${(26 * u).toFixed(1)}px;border-radius:${(8 * u).toFixed(1)}px;background:var(--x-accent);`, head);
        mk(`flex:1;font:var(--x-head-weight) ${(fs * 1.25).toFixed(1)}px/1.2 var(--x-head-font);white-space:nowrap;`, head, L.app);
        mk(`padding:${(4 * u).toFixed(1)}px ${(12 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-panel-2);color:var(--x-dim);font-size:${(fs * 0.85).toFixed(1)}px;white-space:nowrap;`, head, L.search);
        const rows = L.rows.map((x, i) => {
          const r = mk(`display:flex;align-items:center;gap:${(10 * u).toFixed(1)}px;padding:${(10 * u).toFixed(1)}px;border-radius:${(10 * u).toFixed(1)}px;background:var(--x-panel-2);font-size:${fs.toFixed(1)}px;white-space:nowrap;`, root);
          mk(`flex:none;width:${(16 * u).toFixed(1)}px;height:${(16 * u).toFixed(1)}px;border-radius:50%;background:color-mix(in srgb, var(--x-accent) ${70 - i * 20}%, var(--x-panel));`, r);
          r.append(x);
          return r;
        });
        const card = mk(`margin-top:auto;padding:${(14 * u).toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;border:var(--x-edge) solid var(--x-edge-color);background:linear-gradient(160deg, color-mix(in srgb, var(--x-accent) 16%, var(--x-panel)), var(--x-panel));display:grid;gap:${(4 * u).toFixed(1)}px;`, root);
        mk(`font:var(--x-head-weight) ${fs.toFixed(1)}px/1.3 var(--x-head-font);`, card, L.card);
        mk(`font-size:${(fs * 0.85).toFixed(1)}px;color:var(--x-dim);`, card, L.cardSub);
        return { pieces: [head, ...rows, card] };
      },
      chat(u, root) {
        const fs = 12 * u, head = mk(`display:flex;align-items:center;gap:${(8 * u).toFixed(1)}px;font:var(--x-head-weight) ${(fs * 1.1).toFixed(1)}px/1.2 var(--x-head-font);white-space:nowrap;`, root);
        mk(`flex:none;width:${(22 * u).toFixed(1)}px;height:${(22 * u).toFixed(1)}px;border-radius:50%;background:linear-gradient(135deg, var(--x-accent), var(--x-accent-2));`, head);
        head.append(L.who);
        const q = mk(`align-self:flex-end;max-width:84%;padding:${(8 * u).toFixed(1)}px ${(11 * u).toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;background:var(--x-accent);color:var(--x-accent-ink);font-size:${fs.toFixed(1)}px;line-height:1.35;`, root, L.chat[0]);
        const a = mk(`align-self:flex-start;max-width:90%;padding:${(8 * u).toFixed(1)}px ${(11 * u).toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;background:var(--x-panel-2);font-size:${fs.toFixed(1)}px;line-height:1.35;`, root, L.chat[1]);
        const box = mk(`margin-top:auto;padding:${(9 * u).toFixed(1)}px ${(12 * u).toFixed(1)}px;min-height:${(16 * u).toFixed(1)}px;border-radius:${(12 * u).toFixed(1)}px;border:var(--x-edge) solid var(--x-edge-color);background:var(--x-panel);color:var(--x-dim);font-size:${fs.toFixed(1)}px;line-height:1.3;`, root, L.ph);
        return { pieces: [head, q, a, box], input: box };
      },
      email(u, root) {
        const fs = 12 * u;
        const s = mk(`font:var(--x-head-weight) ${(fs * 1.25).toFixed(1)}px/1.2 var(--x-head-font);`, root, L.subject);
        const w = mk(`font-size:${(fs * 0.9).toFixed(1)}px;color:var(--x-dim);`, root, L.from);
        const lines = mk(`display:grid;gap:${(7 * u).toFixed(1)}px;`, root);
        [94, 82, 58].forEach((x) => bar(u, x, lines));
        const b = mk(`margin-top:auto;align-self:flex-start;padding:${(5 * u).toFixed(1)}px ${(14 * u).toFixed(1)}px;border-radius:var(--x-radius-s);background:var(--x-accent);color:var(--x-accent-ink);font-size:${fs.toFixed(1)}px;`, root, L.send);
        return { pieces: [s, w, lines, b] };
      },
    };

    const target = el && el !== stage ? el : null;
    let panels, layer = null, input = null;
    if (target) {
      panels = ctx.els.slice(0, count).map((e) => ({ root: e, pieces: [...e.children], own: false, fill: getComputedStyle(e).backgroundColor }));
    } else {
      const REF = { app: [340, 420], chat: [220, 460], email: [300, 200] };
      const kinds = (side ? ["app", "chat", "email"] : ["chat", "email", "app"]).slice(0, count);
      const R = f.pic, gap = 20, sumW = kinds.reduce((a, x) => a + REF[x][0], 0) + gap * (kinds.length - 1), maxH = Math.max(...kinds.map((x) => REF[x][1]));
      const u = Math.min(R.w / sumW, R.h / maxH);
      layer = mk(`position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;align-items:center;justify-content:center;gap:${(gap * u).toFixed(1)}px;z-index:6;pointer-events:none;`, host);
      panels = kinds.map((x) => {
        const root = mk(`flex:none;box-sizing:border-box;width:${(REF[x][0] * u).toFixed(1)}px;height:${(REF[x][1] * u).toFixed(1)}px;padding:${(16 * u).toFixed(1)}px;display:flex;flex-direction:column;gap:${(10 * u).toFixed(1)}px;overflow:hidden;color:var(--x-ink);font-family:var(--x-body-font);border:var(--x-edge) solid var(--x-edge-color);border-radius:var(--x-radius);box-shadow:var(--x-shadow);`, layer);
        const b = build[x](u, root);
        if (b.input) input = b.input;
        return { root, pieces: b.pieces, own: true, fill: "var(--x-panel)" };
      });
    }
    const head = p.headline_out && !target ? host.querySelector('[data-slot="headline"], .ml-title') : null;

    // timing: panels 0.15 s apart, inner pieces 0.06 s apart from a third of the way through the landing
    const land = side ? 0.7 : 0.8, gapT = 0.15;
    const times = panels.map((_, i) => at + i * gapT), lastLand = times[times.length - 1] + land;
    const prompt = p.prompt ? String(p.prompt) : "", typeA = lastLand + 0.1, typeB = Math.min(end - 0.35, typeA + Array.from(prompt).length * 0.05);
    ctx.sfx(at, "whoosh.soft", 0.35);
    if (panels.length > 1) ctx.sfx(lastLand - land + 0.05, "whoosh.soft", 0.2);
    if (input && prompt) for (let x = typeA; x < typeB; x += 0.16) ctx.sfx(x, "key", 0.2);
    const blur = side ? p.blur : p.blur * (8 / 12);
    const dir = rtl ? -1 : 1, W = panels.map((P) => P.root.offsetWidth);

    return {
      draw(t) {
        const leave = ML.clamp((t - (end - 0.25)) / 0.22);
        panels.forEach((P, i) => {
          const a = times[i], r = P.root;
          r.style.visibility = t < a ? "hidden" : "visible";
          const x = ML.lin(t, a, a + land), u = side ? ML.expo(t, a, a + land) : power3(x);
          if (side) {
            r.style.translate = u >= 1 && !leave ? "none" : `${((1 - u) * 0.4 * dir * W[i]).toFixed(1)}px ${(leave * -12).toFixed(1)}px`;
            r.style.opacity = (ML.lin(t, a, a + 0.12) * (1 - leave)).toFixed(4);
          } else {
            r.style.translate = u >= 1 && !leave ? "none" : `0 ${((1 - u) * 160 * (Math.min(f.W, f.H) / 1080) - leave * 12).toFixed(1)}px`;
            r.style.opacity = (u * (1 - leave)).toFixed(4);
          }
          const b = (1 - u) * blur + leave * 8;
          r.style.filter = b > 0.03 ? `blur(${b.toFixed(2)}px)` : "none";
          if (P.own || P.fill !== "rgba(0, 0, 0, 0)") r.style.backgroundColor = `color-mix(in srgb, var(--x-accent) ${((1 - ML.ease(t, a, a + land)) * 26).toFixed(1)}%, ${P.fill})`;
          P.pieces.forEach((e, k) => {
            const b0 = a + land * 0.3 + k * 0.06, v = ML.out(t, b0, b0 + 0.32);
            e.style.opacity = v.toFixed(4);
            e.style.translate = v < 1 ? `0 ${((1 - v) * 14).toFixed(2)}px` : "none";
          });
        });
        if (input && prompt) {
          const typed = ML.typed(prompt, t, typeA, typeB), on = t >= typeA;
          input.textContent = on ? typed + (t < typeB + 0.3 && ML.blink(t, 0.7) ? "|" : "") : L.ph;
          input.style.color = on ? "var(--x-ink)" : "var(--x-dim)";
        }
        if (head) {
          const h = ML.ease(t, at, at + land);
          head.style.filter = h > 0.002 ? `blur(${(h * 14).toFixed(2)}px)` : "none";
          head.style.opacity = (1 - h * 0.82).toFixed(4);
        }
      },
    };
  },
});
