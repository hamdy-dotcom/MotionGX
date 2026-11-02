// Terminal output rows with status: in a mono terminal (dark on a light look, the look's panel on a dark one) a command
// types first (40 ms / char behind a "~/dir $" prompt, block cursor), then output rows print one by one, each ending in
// a status:
//   · tag — checklist rows opacity 0 → 1 + x −6 → 0 in 0.15 s, stagger `row_interval`; dim label + an end-aligned
//     accent status ("shipped") 0.1 s after its label;
//   · ok-leaders — boot log "[ ok ] service ....... online", instant (no fade) every `row_interval`, accent [ ok ] and
//     dotted leaders, an optional failing line "[ -- ]" in the bad colour;
//   · progress-bar — "› compiling file.ts [▮▮▮▮▮▮▮▮▮▮] ok", 10 cells filling one by one over 0.4 s before "ok" and the
//     next row (path in accent-2, file names in the accent);
//   · spinner-check — a braille spinner turning beside each row for 0.45 s, then a ✓.
// A final prompt line types in the accent with the cursor ("> no hands required"). Every row holds its place from the
// first frame, so the terminal never grows. Colours come from the look (good / accent / accent-2 / bad).
// Source: prompt-motion astrodevil-insane-made-with-claude, robvjourney-opus-5-5-is-cooking, madhav-xo-pretty-cool-
// with-just (reference only — rebuilt as our own code).
ML.define({
  id: "ui.terminal-output-rows",
  category: "ui",
  name: "Terminal output rows with status",
  does: "After a command, output lines print one by one in a terminal, each ending in a status — '[ ok ]', a filling progress bar, or an accent tag like 'shipped'.",
  says: ["proof", "step", "list", "result", "tech"],
  energy: 2,
  targets: ["list", "screen", "line"],
  duration: [1.2, 4],
  params: {
    status: { type: "choice", options: ["tag", "ok-leaders", "progress-bar", "spinner-check"], default: "tag" },
    rows: { type: "number", range: [2, 8], default: 4 },
    row_interval: { type: "number", range: [0.12, 0.5], default: 0.25, unit: "s" },
    command_first: { type: "bool", default: true },
    accent: { type: "choice", options: ["good", "accent", "accent-2", "bad"], default: "good" },
    fail: { type: "bool", default: false },
    command: { type: "text" },
    final: { type: "text" },
  },
  pairs: ["ui.terminal-type", "ui.success-chip", "data.counter-roll"],
  avoid: ["luxury", "calm"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "blip",
  source: { from: "prompt-motion:astrodevil-insane-made-with-claude", license: "reference", note: "with robvjourney-opus-5-5-is-cooking and madhav-xo-pretty-cool-with-just; our own code, no pixels or assets copied" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const N = Math.round(ML.clamp(p.rows, 2, 8));
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const isList = tgt && tgt.children.length > 1;

    // a dark terminal on a light look, the look's own panel on a dark one
    const probe = mk("div", "position:absolute;visibility:hidden;background:var(--x-ground);", ctx.stage);
    const m = getComputedStyle(probe).backgroundColor.match(/[\d.]+/g) || [255, 255, 255];
    probe.remove();
    const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    const bg = lum > 0.5 ? "var(--x-device)" : "var(--x-panel)", fg = lum > 0.5 ? "var(--x-panel)" : "var(--x-ink)";
    const dim = `color-mix(in srgb, ${fg} 55%, ${bg})`, faint = `color-mix(in srgb, ${fg} 22%, ${bg})`;
    const acc = `var(--x-${p.accent === "accent-2" ? "accent-2" : p.accent})`;

    // rows: the target list's items, padded with samples
    const own = isList ? [...tgt.children].map((c) => c.textContent.trim()).filter(Boolean) : [];
    const S = {
      tag: rtl ? ["بناء الصفحات", "ضغط الصور", "رفع النسخة", "تجهيز الرابط", "فحص الأداء", "إرسال الإشعار", "حفظ النسخة", "تنظيف الملفات"] : ["build pages", "compress images", "upload bundle", "warm the cache", "run checks", "send notice", "tag release", "clean up"],
      "ok-leaders": rtl ? ["قاعدة البيانات", "الخادم", "التخزين", "البوابة", "المهام", "المراقبة", "الإشعارات", "السجل"] : ["database", "api server", "storage", "gateway", "queue worker", "monitor", "mailer", "logger"],
      "progress-bar": ["ai_infra.cpp", "render.ts", "voice.ts", "scenes.js", "director.ts", "assets.css", "index.html", "worker.js"],
      "spinner-check": rtl ? ["تحميل الملفات", "فحص الروابط", "ترتيب المشاهد", "إضافة الصوت", "تصدير الفيديو", "رفع النسخة", "إرسال الرابط", "خلاص"] : ["fetch sources", "check links", "order scenes", "add voice", "export video", "upload", "share link", "done"],
    }[p.status] || [];
    const labels = own.slice(0, N);
    for (let i = 0; labels.length < N; i++) labels.push(S[i % S.length]);
    const tags = rtl ? ["اتشحن", "تم", "شغّال", "تمام", "جاهز", "اتبعت", "اتحفظ", "نضيف"] : ["shipped", "done", "live", "ok", "ready", "sent", "tagged", "clean"];
    const ends = rtl ? ["شغّال", "متصل", "جاهز", "مفتوح", "شغّال", "شغّال", "جاهز", "شغّال"] : ["online", "online", "mounted", "open", "running", "watching", "ready", "online"];
    const command = p.command || (!isList && tgt ? tgt.textContent.trim() : "") || { tag: "deploy --prod", "ok-leaders": "systemctl start stack", "progress-bar": "make build -j8", "spinner-check": "npx motiongx render" }[p.status];
    const finalText = p.final || (rtl ? "> من غير ما تلمس حاجة" : "> no hands required");

    // the terminal
    let host, width;
    if (tgt && (isList || tgt.dataset.slot === "screen")) { host = tgt; host.replaceChildren(); host.style.display = "block"; width = "100%"; }
    else { host = mk("div", `position:absolute;left:${f.pic.x}px;top:${f.pic.y}px;width:${f.pic.w}px;height:${f.pic.h}px;display:flex;align-items:center;justify-content:center;`, ctx.scene || ctx.stage); width = Math.min(f.pic.w, (f.wide ? 1150 : 900) * k).toFixed(1) + "px"; }
    const inside = host === tgt, fs = (inside ? 24 : 28) * k;
    const term = mk("div", `position:relative;box-sizing:border-box;width:${width};border-radius:calc(var(--x-radius) * 0.45);background:${bg};color:${fg};border:${Math.max(1, 1.5 * k).toFixed(1)}px solid ${faint};box-shadow:var(--x-shadow);overflow:hidden;min-width:0;max-width:100%;font:500 ${fs.toFixed(1)}px/${inside ? 1.5 : 1.6} var(--x-mono-font);`, host);
    term.dir = rtl ? "rtl" : "ltr";
    const bar = mk("div", `display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${((inside ? 12 : 18) * k).toFixed(1)}px ${(24 * k).toFixed(1)}px;border-bottom:${Math.max(1, 1.5 * k).toFixed(1)}px solid ${faint};direction:ltr;`, term);
    ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("i", `display:block;width:${(18 * k).toFixed(1)}px;height:${(18 * k).toFixed(1)}px;border-radius:50%;background:var(${v});opacity:var(--x-lights);`, bar));
    mk("span", `flex:1;text-align:center;color:${dim};font-size:${(22 * k).toFixed(1)}px;margin-right:${(66 * k).toFixed(1)}px;`, bar, "zsh — 80×24");
    const body = mk("div", `padding:${((inside ? 18 : 26) * k).toFixed(1)}px ${(32 * k).toFixed(1)}px ${((inside ? 20 : 30) * k).toFixed(1)}px;display:flex;flex-direction:column;`, term);
    const cursorEl = () => mk("span", `display:inline-block;width:0.55em;height:1.15em;vertical-align:-0.2em;background:${acc};margin-inline-start:0.1em;`, null);

    // the command line
    let cmdText = null, cmdCursor = null;
    if (p.command_first) {
      const ln = mk("div", "direction:ltr;text-align:left;white-space:pre;overflow:hidden;", body);
      mk("span", `color:var(--x-accent-2);`, ln, "~/app ");
      mk("span", `color:${dim};`, ln, "$ ");
      cmdText = mk("span", "", ln, "");
      cmdCursor = cursorEl(); ln.append(cmdCursor);
    }
    // the rows
    const cellN = 10;
    const rows = labels.map((lab, i) => {
      const r = mk("div", `display:flex;align-items:center;gap:0.6em;white-space:nowrap;min-width:0;`, body);
      const iso = "direction:ltr;unicode-bidi:isolate;";
      const o = { r };
      if (p.status === "ok-leaders") {
        const bad = p.fail && i === N - 1;
        o.st = mk("span", `${iso}color:${bad ? "var(--x-bad)" : acc};`, r, bad ? "[ -- ]" : "[ ok ]");
        o.lab = mk("span", "", r, lab);
        mk("span", `flex:1 1 0;width:0;min-width:1em;overflow:hidden;color:${faint};`, r, ".".repeat(120));
        o.end = mk("span", `color:${bad ? "var(--x-bad)" : dim};`, r, bad ? (rtl ? "فشل" : "failed") : ends[i % ends.length]);
      } else if (p.status === "progress-bar") {
        mk("span", `color:${dim};`, r, "›");
        o.lab = mk("span", "", r);
        mk("span", `color:${dim};`, o.lab, rtl ? "تجميع " : "compiling ");
        mk("span", `${iso}color:var(--x-accent);`, o.lab, lab);
        mk("span", "flex:1;", r);
        const cells = mk("span", `${iso}color:${faint};`, r);
        mk("span", "", cells, "[");
        o.cells = Array.from({ length: cellN }, () => mk("span", "", cells, "▮"));
        mk("span", "", cells, "]");
        o.end = mk("span", `color:${acc};min-width:2em;`, r, rtl ? "تم" : "ok");
      } else if (p.status === "spinner-check") {
        o.spin = mk("span", `display:inline-block;width:1em;text-align:center;color:${acc};`, r, "⠋");
        o.lab = mk("span", "", r, lab);
      } else {
        o.lab = mk("span", `color:${dim};overflow:hidden;text-overflow:ellipsis;`, r, lab);
        mk("span", "flex:1;", r);
        o.end = mk("span", `color:${acc};`, r, tags[i % tags.length]);
      }
      return o;
    });
    // the final prompt line
    const fin = mk("div", `color:${acc};white-space:pre;${ML.ARABIC.test(finalText) ? "" : "direction:ltr;text-align:left;"}`, body);
    const finText = mk("span", "", fin, "");
    const finCursor = cursorEl(); fin.append(finCursor);
    finText.textContent = "​";

    // timeline: type, enter, rows, final line — compressed to fit before the end
    const chars = Array.from(command || ""), fchars = Array.from(finalText);
    const tType = at + 0.2, typeDur = p.command_first ? chars.length * 0.04 : 0;
    let tRows = p.command_first ? tType + typeDur + 0.25 : at + 0.15;
    const per = p.status === "progress-bar" ? 0.55 + p.row_interval * 0.3 : p.status === "spinner-check" ? Math.max(p.row_interval, 0.3) : p.row_interval;
    const finDur = fchars.length * 0.04;
    const room = end - 0.45 - finDur - 0.25 - tRows;
    const need = per * (N - 1) + (p.status === "progress-bar" ? 0.55 : p.status === "spinner-check" ? 0.5 : 0.25);
    const sq = need > room && room > 0.3 ? room / need : 1;
    const rowAt = labels.map((_, i) => tRows + i * per * sq);
    const rowDone = rowAt.map((s) => s + (p.status === "progress-bar" ? 0.5 * sq : p.status === "spinner-check" ? 0.45 * sq : 0.1));
    const tFin = rowDone[N - 1] + 0.25;
    if (p.command_first) { ctx.sfx(tType, "key", 0.3); ctx.sfx(tType + typeDur + 0.05, "key.return", 0.35); }
    rowAt.forEach((s, i) => ctx.sfx(p.status === "progress-bar" || p.status === "spinner-check" ? rowDone[i] : s, "blip", 0.22));
    ctx.sfx(tFin, "key", 0.25);
    const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
    const caret = (el, t, typing, live) => { el.style.opacity = !live ? "0" : typing ? "1" : String(ML.blink(t, 1)); };

    return {
      draw(t) {
        term.style.opacity = (ML.out(t, at - 0.2, at + 0.1) * (1 - ML.lin(t, end - 0.2, end))).toFixed(4);
        if (cmdText) {
          cmdText.textContent = chars.slice(0, Math.floor(ML.clamp((t - tType) / 0.04, 0, chars.length))).join("");
          caret(cmdCursor, t, t >= tType && t < tType + typeDur, t < tRows);
        }
        rows.forEach((o, i) => {
          const s = rowAt[i], d = rowDone[i];
          if (p.status === "ok-leaders") { o.r.style.visibility = t >= s ? "visible" : "hidden"; return; }
          if (p.status === "tag") {
            const u = ML.out(t, s, s + 0.15);
            o.r.style.opacity = u.toFixed(4);
            o.r.style.translate = `${((1 - u) * -6 * k * (rtl ? -1 : 1)).toFixed(2)}px 0`;
            o.end.style.opacity = ML.lin(t, d, d + 0.12).toFixed(4);
            return;
          }
          o.r.style.visibility = t >= s ? "visible" : "hidden";
          if (p.status === "progress-bar") {
            const n = Math.floor(ML.clamp((t - s) / ((0.4 * sq) / cellN), 0, cellN));
            o.cells.forEach((c, j) => { c.style.color = j < n ? acc : ""; });
            o.end.style.visibility = t >= d ? "visible" : "hidden";
          } else {
            const done = t >= d;
            o.spin.textContent = done ? "✓" : SPIN[Math.max(0, Math.floor((t - s) * 12)) % SPIN.length];
            o.lab.style.color = done ? "" : dim;
          }
        });
        const nf = Math.floor(ML.clamp((t - tFin) / 0.04, 0, fchars.length));
        finText.textContent = nf ? fchars.slice(0, nf).join("") : "​";
        caret(finCursor, t, t >= tFin && t < tFin + finDur, t >= tFin);
        fin.style.visibility = t >= tFin ? "visible" : "hidden";
      },
    };
  },
});
