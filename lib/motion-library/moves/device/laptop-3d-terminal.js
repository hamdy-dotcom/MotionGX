// 3D laptop with a live terminal: a CSS-3D laptop at a three-quarter angle (rotateX 20°, rotateY −15°) — a lid with a
// bezel and screen, a back in brushed metal, a deck with real keys and a trackpad, edges with thickness, a contact
// shadow — whose screen shows an agent's terminal adding a log line every 0.4 s (Read / Update / Bash entries with
// coloured dots and their indented results) under a status line ("Refactoring auth… (2h 14m)") with a spinning glyph;
// the whole laptop floats ±4 px over 4 s. The screen can instead show an app or a playing video. Every plane is laid
// out at its own size and never scaled above 1; the terminal's colours are the look's ink and ground, inverted.
// Source: prompt-motion "cansincengiz-me-bu-videoyu-sadece-claude" (reference only: rebuilt as our own code).
ML.define({
  id: "device.laptop-3d-terminal",
  category: "device",
  name: "3D laptop with a live terminal",
  does: "A 3D laptop at a three-quarter angle shows a terminal where an agent's log keeps adding lines.",
  says: ["tech", "proof", "time"],
  energy: 2,
  targets: ["screen", "stage"],
  duration: [2, 10],
  params: {
    angle_x: { type: "number", range: [0, 30], default: 20, unit: "deg" },
    angle_y: { type: "number", range: [-30, 30], default: -15, unit: "deg" },
    line_every: { type: "number", range: [0.2, 1], default: 0.4, unit: "s" },
    float: { type: "number", range: [0, 8], default: 4, unit: "px" },
    prompt: { type: "text", default: "" }, // the terminal's first line; empty: a sample in the film's language
    status: { type: "text", default: "" }, // the working line under the log; empty: a sample
    content: { type: "choice", options: ["terminal", "app", "video"], default: "terminal" },
  },
  pairs: ["device.block-lift-out", "camera.slow-push"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:cansincengiz-me-bu-videoyu-sadece-claude", license: "reference", note: "our own rebuild of the technique" },
  setup(ctx) {
    const { p, at, end, rtl } = ctx;
    const doc = document;
    const mk = (tag, css, text, parent) => { const e = doc.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const given = ctx.el && ctx.el !== ctx.stage && ctx.el.tagName !== "IMG" ? ctx.el : null;
    const room = given ? ctx.box(given) : { x: ctx.f.pic.x, y: ctx.f.pic.y, w: ctx.f.pic.w, h: ctx.f.pic.h };
    if (given) given.style.visibility = "hidden";
    const host = mk("div", `position:absolute;left:${room.x}px;top:${room.y}px;width:${room.w}px;height:${room.h}px;z-index:4;overflow:hidden;background:var(--x-ground)`, null, ctx.scene || ctx.stage);
    const LW = Math.round(Math.min(room.w * 0.74, (room.h * 0.8) / (0.64 * 1.45))), LH = Math.round(LW * 0.64), D = Math.round(LH * 0.7), TH = Math.max(4, Math.round(LW * 0.016));
    host.style.perspective = Math.round(LW * 3.2) + "px";
    host.style.perspectiveOrigin = "50% 40%";
    const metal = "linear-gradient(180deg, color-mix(in srgb, var(--x-panel-2) 78%, var(--x-dim)), color-mix(in srgb, var(--x-panel-2) 58%, var(--x-dim)))";
    const metalDark = "color-mix(in srgb, var(--x-panel-2) 45%, var(--x-dim))";
    const P3 = "transform-style:preserve-3d;position:absolute";
    // the rig: a point at the hinge's centre, set a little below the room's middle so the whole laptop sits centred
    const rig = mk("div", `${P3};left:50%;top:${Math.round(room.h * 0.5 + LH * 0.3)}px;width:0;height:0`, null, host);
    // contact shadow on the floor
    mk("div", `position:absolute;left:${-LW * 0.6}px;top:${TH}px;width:${LW * 1.2}px;height:${D * 1.25}px;transform-origin:50% 0;transform:rotateX(90deg) translateZ(-1px);background:radial-gradient(closest-side, color-mix(in srgb, var(--x-ink) 32%, transparent), transparent)`, null, rig);
    // deck (lying flat toward the viewer), its front and side edges
    const deck = mk("div", `${P3};left:${-LW / 2}px;top:0;width:${LW}px;height:${D}px;transform-origin:50% 0;transform:rotateX(90deg);background:${metal};border-radius:0 0 ${Math.round(LW * 0.03)}px ${Math.round(LW * 0.03)}px`, null, rig);
    const kb = mk("div", `position:absolute;left:9%;right:9%;top:7%;height:52%;display:grid;grid-template-columns:repeat(14, 1fr);grid-template-rows:repeat(5, 1fr);gap:${Math.max(1, Math.round(LW * 0.004))}px;padding:${Math.round(LW * 0.006)}px;border-radius:${Math.round(LW * 0.008)}px;background:${metalDark}`, null, deck);
    const key = (span) => mk("i", `display:block;grid-column:span ${span};border-radius:${Math.max(1, Math.round(LW * 0.003))}px;background:color-mix(in srgb, var(--x-device) 88%, var(--x-panel));box-shadow:inset 0 -1px 0 color-mix(in srgb, var(--x-panel) 12%, transparent)`, null, kb);
    for (let i = 0; i < 56; i++) key(1); // four rows of 14
    [1, 1, 1, 1, 6, 1, 1, 1, 1].forEach(key); // the bottom row with its space bar
    mk("div", `position:absolute;left:33%;right:33%;top:64%;bottom:7%;border-radius:${Math.round(LW * 0.01)}px;background:color-mix(in srgb, var(--x-panel-2) 66%, var(--x-dim));box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--x-ink) 8%, transparent)`, null, deck);
    mk("div", `position:absolute;left:${-LW / 2}px;top:0;width:${LW}px;height:${TH}px;transform:translateZ(${D}px);background:${metalDark};border-radius:0 0 ${TH}px ${TH}px`, null, rig);
    for (const s of [-1, 1]) mk("div", `position:absolute;left:${s * LW / 2 - D / 2}px;top:0;width:${D}px;height:${TH}px;transform:translateZ(${D / 2}px) rotateY(${s * 90}deg);background:${metalDark}`, null, rig);
    // lid: front (bezel + screen) and back (metal), hinged at its bottom edge, opened to 105°
    const lid = mk("div", `${P3};left:${-LW / 2}px;top:${-LH}px;width:${LW}px;height:${LH}px;transform-origin:50% 100%;transform:rotateX(15deg)`, null, rig);
    const bez = Math.round(LW * 0.022);
    const front = mk("div", `position:absolute;inset:0;box-sizing:border-box;padding:${bez}px ${bez}px ${Math.round(bez * 1.6)}px;background:var(--x-device);border-radius:${Math.round(LW * 0.028)}px ${Math.round(LW * 0.028)}px ${Math.round(LW * 0.008)}px ${Math.round(LW * 0.008)}px;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--x-panel) 10%, transparent)`, null, lid);
    mk("div", `position:absolute;inset:0;transform:rotateY(180deg);background:${metal};border-radius:${Math.round(LW * 0.028)}px ${Math.round(LW * 0.028)}px ${Math.round(LW * 0.008)}px ${Math.round(LW * 0.008)}px;backface-visibility:hidden;-webkit-backface-visibility:hidden`, null, lid);
    const screen = mk("div", "position:relative;width:100%;height:100%;overflow:hidden;border-radius:3px", null, front);
    const SW = LW - 2 * bez, fs = SW / 44;
    // what the screen shows
    const T = rtl ? { status: "بعيد تنظيم الدخول…", prompt: "> رتّب نظام الدخول واستخدم الجلسات" } : { status: "Refactoring auth…", prompt: "> refactor auth to use sessions" };
    if (p.status) T.status = p.status;
    if (p.prompt) T.prompt = "> " + p.prompt;
    let drawScreen = () => {};
    if (p.content === "terminal") {
      const ink = "var(--x-ground)", dim = "color-mix(in srgb, var(--x-ground) 55%, transparent)";
      const term = mk("div", `position:absolute;inset:0;display:flex;flex-direction:column;background:color-mix(in srgb, var(--x-ink) 94%, var(--x-accent) 6%);color:${ink};font:500 ${fs.toFixed(2)}px/1.5 var(--x-mono-font);direction:ltr`, null, screen);
      const tb = mk("div", "flex:none;display:flex;align-items:center;gap:0.5em;padding:0.45em 0.8em;border-bottom:1px solid color-mix(in srgb, var(--x-ground) 10%, transparent)", null, term);
      for (let i = 1; i <= 3; i++) mk("i", `display:block;width:0.75em;height:0.75em;border-radius:50%;background:var(--x-light-${i});opacity:calc(var(--x-lights) * .9)`, null, tb);
      mk("span", `margin-inline-start:auto;margin-inline-end:auto;color:${dim};font-size:0.85em`, "~/app — agent", tb);
      // a fresh terminal fills from the top; once full, each new line pushes the rest up
      const logBox = mk("div", "position:relative;flex:1;min-height:0;overflow:hidden", null, term);
      const log = mk("div", "position:absolute;left:0;right:0;top:0;box-sizing:border-box;padding:0.4em 0.9em", null, logBox);
      const files = ["src/auth/session.ts", "src/auth/token.ts", "src/middleware/guard.ts", "src/routes/login.ts", "src/db/users.ts", "tests/auth.test.ts", "src/auth/cookies.ts", "src/api/me.ts"];
      const tools = [["Read", "var(--x-good)", (f, i) => `Read ${60 + Math.round(ML.rnd(i, 2) * 180)} lines`], ["Update", "var(--x-accent-2)", (f, i) => `Updated with ${2 + Math.round(ML.rnd(i, 3) * 20)} additions and ${Math.round(ML.rnd(i, 4) * 9)} removals`], ["Bash", "var(--x-accent)", (f, i) => `✓ ${20 + Math.round(ML.rnd(i, 5) * 40)} passed`]];
      const entries = [{ s: T.prompt, c: "prompt" }];
      for (let i = 0; i < 18; i++) {
        const [name, col, res] = tools[i % 3 === 2 ? 2 : Math.round(ML.rnd(i, 7))], f = files[i % files.length];
        entries.push({ s: `${name}(${name === "Bash" ? "npm test -- auth" : f})`, c: "tool", col });
        entries.push({ s: `⎿  ${res(f, i)}`, c: name === "Bash" ? "ok" : "res" });
      }
      const rows = entries.map((e) => {
        const r = mk("div", "white-space:pre;overflow:hidden;text-overflow:ellipsis;display:none", null, log);
        if (e.c === "prompt") { r.style.color = ink; r.style.marginBottom = "0.4em"; r.style.direction = rtl ? "rtl" : "ltr"; r.style.textAlign = "start"; r.textContent = e.s; }
        else if (e.c === "tool") { const d = mk("span", `color:${e.col}`, "⏺ ", r); d.style.fontSize = "0.9em"; mk("b", "font-weight:600", e.s, r); }
        else { r.style.paddingInlineStart = "1.3em"; r.style.color = e.c === "ok" ? "var(--x-good)" : dim; r.textContent = e.s; }
        return r;
      });
      const st = mk("div", "flex:none;display:flex;align-items:center;gap:0.6em;padding:0.5em 0.9em 0.7em;border-top:1px solid color-mix(in srgb, var(--x-ground) 10%, transparent)", null, term);
      const spin = mk("span", "color:var(--x-accent-2);width:1em;text-align:center", "✻", st);
      const stt = mk("span", "color:var(--x-accent-2)", T.status, st);
      stt.style.direction = rtl ? "rtl" : "ltr";
      const clock = mk("span", `color:${dim}`, "", st);
      const glyphs = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
      const t0 = at + 0.35;
      // a log line every line_every; result lines follow their tool line a beat later
      const times = rows.map((_, i) => (i === 0 ? t0 : t0 + 0.3 + (i - 1) * p.line_every));
      times.forEach((tt, i) => { if (i % 4 === 1) ctx.sfx(tt, "key", 0.2); });
      drawScreen = (t) => {
        rows.forEach((r, i) => { const on = t >= times[i]; r.style.display = on ? "block" : "none"; if (on) r.style.opacity = ML.clamp((t - times[i]) / 0.12).toFixed(3); });
        if (t >= t0) rows[0].textContent = ML.typed(T.prompt, t, t0, t0 + 0.25);
        log.style.translate = `0 ${(-Math.max(0, log.offsetHeight - logBox.clientHeight)).toFixed(0)}px`;
        spin.textContent = glyphs[Math.floor(Math.max(0, t) * 10) % glyphs.length];
        const secs = 2 * 3600 + 14 * 60 + Math.max(0, Math.floor(t - at));
        clock.textContent = `(${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m ${String(secs % 60).padStart(2, "0")}s · esc to interrupt)`;
      };
    } else if (p.content === "app" && given) {
      // the target's own UI, laid out for this screen
      const mount = (el, into, W, H) => { const c = el.cloneNode(true); c.removeAttribute("data-slot"); const z = Math.min(1, W / Math.max(1, el.offsetWidth)); c.style.cssText += `;position:absolute;left:0;top:0;margin:0;box-sizing:border-box;visibility:visible;width:${(W / z).toFixed(1)}px;height:${(H / z).toFixed(1)}px;zoom:${z.toFixed(5)}`; into.append(c); };
      mount(given, screen, SW, LH - bez - Math.round(bez * 1.6));
    } else if (p.content === "app") {
      const app = mk("div", `position:absolute;inset:0;display:flex;font-size:${(fs * 1.05).toFixed(2)}px;background:var(--x-ground);color:var(--x-ink);font-family:var(--x-body-font);direction:${rtl ? "rtl" : "ltr"}`, null, screen);
      const side = mk("div", "flex:none;width:22%;padding:1em 0.8em;display:flex;flex-direction:column;gap:0.5em;background:var(--x-panel-2);border-inline-end:var(--x-edge) solid var(--x-line)", null, app);
      mk("div", "width:1.8em;height:1.8em;border-radius:0.5em;background:var(--x-accent);margin-bottom:0.6em", null, side);
      (rtl ? ["الرئيسية", "الطلبات", "العملاء"] : ["Home", "Orders", "Customers"]).forEach((n, i) => mk("div", `padding:0.35em 0.6em;border-radius:0.5em;font-size:0.9em;${i === 0 ? "background:color-mix(in srgb, var(--x-accent) 14%, transparent);color:var(--x-accent);font-weight:600" : "color:var(--x-dim)"}`, n, side));
      const main = mk("div", "flex:1;padding:1.1em 1.3em;display:flex;flex-direction:column;gap:0.8em", null, app);
      mk("div", "font:var(--x-head-weight) 1.6em var(--x-head-font)", rtl ? "مبيعات اليوم" : "Today's sales", main);
      const chart = mk("div", "flex:1;display:flex;align-items:flex-end;gap:3%;padding:0.8em;background:var(--x-panel);border:var(--x-edge) solid var(--x-edge-color);border-radius:calc(var(--x-radius) * 0.4)", null, main);
      const bars = Array.from({ length: 12 }, (_, i) => mk("i", `display:block;flex:1;border-radius:0.25em 0.25em 0 0;background:${i === 11 ? "var(--x-accent)" : "color-mix(in srgb, var(--x-accent) 32%, transparent)"}`, null, chart));
      drawScreen = (t) => bars.forEach((b, i) => { const a = at + 0.4 + i * p.line_every * 0.25; b.style.height = ((25 + 70 * ML.rnd(i, 9) * (0.5 + i / 22)) * ML.expo(t, a, a + 0.6)).toFixed(2) + "%"; });
    } else {
      // a playing video: a scene painted from t, a scrubber and timecode
      const vid = mk("div", "position:absolute;inset:0;background:var(--x-device);overflow:hidden", null, screen);
      const blobs = [0, 1, 2, 3].map((i) => mk("i", `position:absolute;display:block;border-radius:50%;width:${40 + i * 12}%;aspect-ratio:1;background:radial-gradient(closest-side, ${["var(--x-accent)", "var(--x-accent-2)", "var(--x-good)", "var(--x-accent)"][i]}, transparent);opacity:.75`, null, vid));
      const bar = mk("div", "position:absolute;left:4%;right:4%;bottom:6%;height:0.5em;border-radius:1em;background:color-mix(in srgb, var(--x-ground) 25%, transparent)", null, vid);
      bar.style.fontSize = fs + "px";
      const fill = mk("i", "position:absolute;left:0;top:0;bottom:0;border-radius:1em;background:var(--x-accent)", null, bar);
      const tc = mk("div", `position:absolute;left:4%;bottom:10%;font:600 ${fs.toFixed(2)}px var(--x-mono-font);color:var(--x-ground);direction:ltr`, "", vid);
      drawScreen = (t) => {
        const u = Math.max(0, t - at);
        blobs.forEach((b, i) => { b.style.left = (50 + 38 * Math.sin(u * (0.35 + i * 0.13) + i * 1.7) - 25).toFixed(2) + "%"; b.style.top = (40 + 30 * Math.cos(u * (0.29 + i * 0.11) + i) - 30).toFixed(2) + "%"; });
        const pr = ML.clamp(0.12 + u / 40); fill.style.width = (pr * 100).toFixed(2) + "%";
        const s = Math.floor(pr * 300); tc.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} / 5:00`;
      };
    }
    const ax = p.angle_x, ay = p.angle_y * (rtl ? -1 : 1);
    const leave = Math.max(at + 1.2, end - 0.3);
    return {
      draw(t) {
        const u = ML.expo(t, at, at + 0.6), gone = ML.ease(t, leave, leave + 0.25);
        const fl = p.float * Math.sin(((t - at) / 4) * Math.PI * 2);
        rig.style.transform = `translateY(${((1 - u) * LH * 0.12 + fl).toFixed(2)}px) rotateX(${(-ax).toFixed(2)}deg) rotateY(${ay.toFixed(2)}deg)`;
        host.style.opacity = (t < at ? 0 : ML.clamp(u * 1.4) * (1 - gone)).toFixed(4);
        drawScreen(t);
      },
    };
  },
});
