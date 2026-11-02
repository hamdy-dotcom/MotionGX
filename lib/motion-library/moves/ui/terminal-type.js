// Terminal command types: a mono command line types out character by character behind an accent prompt ("❯" / ">")
// at `chars_per_s` with a seeded ±25 % jitter per character, the cursor (block 0.55 em, bar or underscore) solid while
// typing and blinking 0.5 s on / 0.5 s off (steps) when idle. Chrome:
//   · window — a terminal window (dark on a light look, the look's panel on a dark one): traffic lights + a centred
//     dim title, the line inside;
//   · none — no chrome, the line centred on the ground with a soft vignette and a sparse, slowly drifting starfield;
//   · pill-under-code — a code panel (line numbers, syntax colours from the look) with a terminal pill under it typing
//     the command at ≤ 18 chars / s;
//   · corner-box — a small box at the top-start corner that wipes in from the inline start (scaleX 0 → 1, 0.25 s) and
//     types 3 short note lines at 40 chars / s.
// Hero size: big light type, the block cursor at 50 %. underline_label: a label above fades in and a 1 px accent-2
// underline draws start → end in 0.4 s. After typing: a 0.25 s pause, then an enter-key chip + caption.
// Source: prompt-motion astrodevil-insane-made-with-claude, maxalexweber-i-made-this-with, influencer-seo-opus-5-5-is-
// insanely, topi-003-opus5-5-15-2, kyonax-on-tech-yes-i-also-did (reference only — rebuilt as our own code).
ML.define({
  id: "ui.terminal-type",
  category: "ui",
  name: "Terminal command types",
  does: "A mono command line types out character by character behind a prompt with a blinking cursor — in a terminal window, floating centred, or in a small corner box.",
  says: ["tech", "step", "story"],
  energy: 2,
  targets: ["screen", "line", "label"],
  duration: [1, 4],
  params: {
    chrome: { type: "choice", options: ["window", "none", "pill-under-code", "corner-box"], default: "window" },
    chars_per_s: { type: "number", range: [16, 40], default: 24 },
    cursor: { type: "choice", options: ["block", "bar", "underscore"], default: "block" },
    size: { type: "choice", options: ["small", "hero"], default: "small" },
    underline_label: { type: "bool", default: false },
    prompt: { type: "choice", options: ["❯", ">", "$"], default: "❯" },
    enter: { type: "bool", default: true },
    command: { type: "text" },
    label: { type: "text" },
  },
  pairs: ["ui.terminal-output-rows", "ui.llm-window-stream", "camera.push-in"],
  avoid: ["luxury"],
  rtl: true,
  shapes: ["9:16", "16:9", "1:1", "4:5"],
  sfx: "key",
  source: { from: "prompt-motion:astrodevil-insane-made-with-claude", license: "reference", note: "with maxalexweber, influencer-seo, topi-003, kyonax videos; our own code, no pixels or assets copied" },
  setup(ctx) {
    const { p, at, end, f, rtl } = ctx;
    const doc = document;
    const k = Math.min(f.W, f.H) / 1080;
    const mk = (tag, css, parent, text) => { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; if (parent) parent.append(e); return e; };
    const tgt = ctx.el && ctx.el !== ctx.stage ? ctx.el : null;
    const textTarget = tgt && !tgt.children.length && tgt.textContent.trim();
    const hero = p.size === "hero";
    const scene = ctx.scene || ctx.stage;

    // terminal colours: dark on a light look, the look's panel on a dark one
    const probe = mk("div", "position:absolute;visibility:hidden;background:var(--x-ground);", ctx.stage);
    const m = getComputedStyle(probe).backgroundColor.match(/[\d.]+/g) || [255, 255, 255];
    probe.remove();
    const light = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 > 0.5;
    const bg = light ? "var(--x-device)" : "var(--x-panel)", fg = light ? "var(--x-panel)" : "var(--x-ink)";
    const dim = `color-mix(in srgb, ${fg} 50%, ${bg})`, faint = `color-mix(in srgb, ${fg} 20%, ${bg})`;
    const edge = Math.max(1, 1.5 * k).toFixed(1);

    const sampleCmd = rtl ? 'claude "اعمل فيديو للإطلاق"' : "claude \"make the launch video\"";
    const command = p.command || textTarget || (p.chrome === "pill-under-code" ? "org2html build post.org -o site/" : sampleCmd);
    const notes = p.chrome === "corner-box" ? (p.command ? p.command.split("|") : rtl ? ["- راجع الصوت", "- قصّر المشهد ٢", "- صدّر ١٠٨٠"] : ["- check the voice", "- trim scene 2", "- export 1080p"]).slice(0, 3) : [command];
    const rate = p.chrome === "corner-box" ? 40 : p.chrome === "pill-under-code" ? Math.min(18, p.chars_per_s) : p.chars_per_s;

    // per-character times, seeded jitter ±25 %
    const lines = notes.map((s) => Array.from(s));
    const t0 = at + (p.chrome === "corner-box" ? 0.35 : p.underline_label ? 0.55 : 0.3);
    const times = [];
    let tc = t0;
    lines.forEach((chs, li) => { times.push(chs.map((_, i) => { tc += (1 / rate) * (0.75 + 0.5 * ML.rnd(li * 97 + i, 7)); return tc; })); tc += 0.12; });
    const tEnd = times[times.length - 1][times[times.length - 1].length - 1] || t0;
    // a key sound about four times a second while typing, the return after the pause
    let lastKey = -1;
    times.flat().forEach((s) => { if (s - lastKey >= 0.25) { ctx.sfx(s, "key", 0.18); lastKey = s; } });
    const tEnter = tEnd + 0.25;
    if (p.enter && p.chrome !== "corner-box" && tEnter < end - 0.2) ctx.sfx(tEnter, "key.return", 0.35);

    const fs = hero ? 76 * k : p.chrome === "corner-box" ? 22 * k : 30 * k;
    const cursorCss = () => {
      const c = p.cursor === "bar" ? "width:0.08em;height:1.15em;vertical-align:-0.2em;" : p.cursor === "underscore" ? "width:0.55em;height:0.1em;vertical-align:-0.12em;" : "width:0.55em;height:1.1em;vertical-align:-0.18em;";
      return `display:inline-block;${c}background:var(--x-accent);margin-inline-start:0.06em;${hero && p.cursor === "block" ? "opacity:0.5;" : ""}`;
    };
    const makeLine = (parent, colour, promptOn = true) => {
      const ln = mk("div", `white-space:pre-wrap;word-break:break-word;direction:${rtl && ML.ARABIC.test(notes.join("")) && p.chrome === "corner-box" ? "rtl" : "ltr"};text-align:start;color:${colour};`, parent);
      if (promptOn) mk("span", "color:var(--x-accent);", ln, p.prompt + " ");
      const tx = mk("span", "", ln, "");
      const cu = mk("span", cursorCss(), ln);
      return { ln, tx, cu };
    };

    // the chrome
    let shell, out = [], wipe = null, starL = null, stars = [];
    const host = tgt && !textTarget ? tgt : null;
    const R = f.pic;
    const place = (w) => { const wrap = mk("div", `position:absolute;left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${(26 * k).toFixed(1)}px;pointer-events:none;`, host || scene); if (host) { wrap.style.cssText = `position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:${(26 * k).toFixed(1)}px;`; } return wrap; };
    let wrap, labelEl = null, under = null, chip = null;
    if (p.chrome === "none" && textTarget) {
      // type the target's own line in place
      const keep = tgt.textContent;
      tgt.replaceChildren();
      out.push(makeLine(tgt, "inherit"));
      out[0].ln.style.direction = ML.ARABIC.test(keep) ? "rtl" : "ltr";
      shell = tgt; wrap = null;
    } else if (p.chrome === "corner-box") {
      const S = f.safe, w = Math.min(S.w * 0.55, 520 * k);
      shell = mk("div", `position:absolute;top:${(S.y + 10 * k).toFixed(1)}px;${rtl ? "right" : "left"}:${(rtl ? f.W - S.x - S.w : S.x).toFixed(1)}px;width:${w.toFixed(1)}px;box-sizing:border-box;padding:${(18 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;background:${bg};color:${fg};border-radius:calc(var(--x-radius) * 0.3);border:${edge}px solid ${faint};box-shadow:var(--x-shadow);font:500 ${fs.toFixed(1)}px/1.55 var(--x-mono-font);transform-origin:${rtl ? "100%" : "0"} 50%;z-index:6;`, scene);
      shell.dir = rtl ? "rtl" : "ltr";
      lines.forEach(() => out.push(makeLine(shell, fg, false)));
      out.forEach((o) => { o.tx.textContent = "​"; });
      wipe = shell;
    } else {
      wrap = place();
      if (p.underline_label) {
        labelEl = mk("div", `position:relative;font:var(--x-label-weight) ${(24 * k).toFixed(1)}px var(--x-label-font);letter-spacing:${rtl ? "0" : "var(--x-label-track)"};text-transform:${rtl ? "none" : "var(--x-label-case)"};color:var(--x-dim);padding-bottom:${(12 * k).toFixed(1)}px;`, wrap, p.label || (rtl ? "البرومبت ٠١ / التنفيذ" : "Prompt 01 / render queue"));
        under = mk("div", `position:absolute;left:0;right:0;bottom:0;height:${edge}px;background:var(--x-accent-2);transform-origin:${rtl ? "100%" : "0"} 50%;`, labelEl);
      }
      if (p.chrome === "window") {
        const w = Math.min(R.w, (f.wide ? 1100 : 900) * k * (hero ? 1.15 : 1));
        shell = mk("div", `box-sizing:border-box;width:${w.toFixed(1)}px;background:${bg};color:${fg};border:${edge}px solid ${faint};border-radius:calc(var(--x-radius) * 0.4);box-shadow:var(--x-shadow);overflow:hidden;font:${hero ? 300 : 500} ${fs.toFixed(1)}px/1.45 var(--x-mono-font);`, wrap);
        const bar = mk("div", `display:flex;align-items:center;gap:${(12 * k).toFixed(1)}px;padding:${(16 * k).toFixed(1)}px ${(22 * k).toFixed(1)}px;border-bottom:${edge}px solid ${faint};direction:ltr;`, shell);
        ["--x-light-1", "--x-light-2", "--x-light-3"].forEach((v) => mk("i", `display:block;width:${(18 * k).toFixed(1)}px;height:${(18 * k).toFixed(1)}px;border-radius:50%;background:var(${v});opacity:var(--x-lights);`, bar));
        mk("span", `flex:1;text-align:center;color:${dim};font:500 ${(22 * k).toFixed(1)}px var(--x-mono-font);margin-right:${(66 * k).toFixed(1)}px;`, bar, "~/studio — zsh");
        const body = mk("div", `padding:${(30 * k).toFixed(1)}px ${(34 * k).toFixed(1)}px ${(40 * k).toFixed(1)}px;min-height:${(fs * 2.9).toFixed(1)}px;`, shell);
        out.push(makeLine(body, fg));
      } else if (p.chrome === "pill-under-code") {
        const w = Math.min(R.w, (f.wide ? 1000 : 880) * k);
        const code = mk("div", `box-sizing:border-box;width:${w.toFixed(1)}px;background:${bg};color:${fg};border:${edge}px solid ${faint};border-radius:calc(var(--x-radius) * 0.4);box-shadow:var(--x-shadow);padding:${(28 * k).toFixed(1)}px ${(30 * k).toFixed(1)}px;font:500 ${(24 * k).toFixed(1)}px/1.7 var(--x-mono-font);direction:ltr;text-align:left;white-space:pre;overflow:hidden;`, wrap);
        const SRC = [
          [["c", "#+title: "], ["s", "Shipping notes"]],
          [["c", "#+date: "], ["n", "2026-11-02"]],
          [],
          [["k", "* "], ["p", "What changed"]],
          [["p", "- the build is "], ["s", "twice as fast"]],
          [["p", "- one command: "], ["k", "org2html"]],
        ];
        const tone = { c: dim, s: "var(--x-accent-2)", n: "var(--x-good)", k: "var(--x-accent)", p: fg };
        SRC.forEach((parts, i) => { const ln = mk("div", "", code); mk("span", `display:inline-block;width:2.2em;color:${faint};`, ln, String(i + 1)); parts.forEach(([c, s]) => mk("span", `color:${tone[c]};`, ln, s)); if (!parts.length) ln.append("​"); });
        shell = mk("div", `box-sizing:border-box;max-width:${w.toFixed(1)}px;min-width:${(w * 0.75).toFixed(1)}px;background:${bg};color:${fg};border:${edge}px solid ${faint};border-radius:var(--x-radius-s);box-shadow:var(--x-shadow);padding:${(16 * k).toFixed(1)}px ${(32 * k).toFixed(1)}px;font:500 ${(fs * 0.9).toFixed(1)}px/1.4 var(--x-mono-font);`, wrap);
        out.push(makeLine(shell, fg));
        shell._code = code;
      } else {
        // none: floating on the ground, a soft vignette and a sparse slow starfield behind
        starL = mk("div", `position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%, transparent 40%, color-mix(in srgb, var(--x-ink) 12%, transparent) 100%);`, null);
        scene.prepend(starL);
        for (let i = 0; i < 46; i++) {
          const s = 2 + ML.rnd(i, 3) * 3;
          stars.push({ el: mk("i", `position:absolute;left:0;top:0;width:${(s * k).toFixed(1)}px;height:${(s * k).toFixed(1)}px;border-radius:50%;background:var(--x-ink);`, starL), x: ML.rnd(i, 1) * f.W, y: ML.rnd(i, 2) * f.H, v: (4 + ML.rnd(i, 4) * 10) * k, o: 0.12 + ML.rnd(i, 5) * 0.3, ph: ML.rnd(i, 6) * 6.28 });
        }
        shell = mk("div", `max-width:${(R.w * 0.95).toFixed(1)}px;color:var(--x-ink);font:${hero ? 300 : 500} ${fs.toFixed(1)}px/1.3 var(--x-mono-font);text-align:center;`, wrap);
        out.push(makeLine(shell, "var(--x-ink)"));
        out[0].ln.style.textAlign = "center";
      }
      if (p.enter && p.chrome !== "corner-box") {
        chip = mk("div", `will-change:opacity,translate;display:flex;align-items:center;margin-top:${(36 * k).toFixed(1)}px;gap:${(16 * k).toFixed(1)}px;font:500 ${(24 * k).toFixed(1)}px var(--x-body-font);color:var(--x-dim);`, wrap);
        mk("span", `display:inline-flex;align-items:center;gap:0.4em;padding:${(8 * k).toFixed(1)}px ${(18 * k).toFixed(1)}px;border:${edge}px solid var(--x-edge-color);border-bottom-width:${(4 * k).toFixed(1)}px;border-radius:calc(var(--x-radius) * 0.25);background:var(--x-panel);color:var(--x-ink);font:600 ${(22 * k).toFixed(1)}px var(--x-mono-font);direction:ltr;`, chip, "↵ enter");
        mk("span", "", chip, rtl ? "اتبعت، شغّال…" : "sent, running…");
      }
    }
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const cuOn = hero && p.cursor === "block" ? "0.5" : "1";

    return {
      draw(t) {
        const leave = ML.lin(t, end - 0.22, end);
        // text and cursors
        out.forEach((o, li) => {
          const ts = times[li], n = ts.filter((s) => s <= t).length;
          const s = lines[li].slice(0, n).join("");
          o.tx.textContent = s || (p.chrome === "corner-box" ? "​" : "");
          const started = t >= (li === 0 ? t0 - 0.2 : times[li - 1][times[li - 1].length - 1] || t0);
          const done = n >= ts.length, current = started && (li === out.length - 1 || !done);
          const typing = t >= (ts[0] ?? t0) && !done;
          o.cu.style.visibility = current ? "visible" : "hidden";
          o.cu.style.opacity = typing || (t % 1) < 0.5 ? cuOn : "0";
        });
        if (wipe) {
          const u = easeOut(ML.lin(t, at, at + 0.25));
          wipe.style.transform = `scaleX(${u.toFixed(4)})`;
          wipe.style.opacity = (u > 0 ? 1 : 0) * (1 - leave) + "";
          return;
        }
        if (wrap) {
          const o = ML.out(t, at - 0.15, at + 0.2) * (1 - leave);
          [...wrap.children].forEach((c) => { if (c !== chip && c !== labelEl) c.style.opacity = o.toFixed(4); });
          if (shell && shell._code) shell._code.style.opacity = o.toFixed(4);
        } else shell.style.opacity = String(1 - leave);
        if (labelEl) { labelEl.style.opacity = (ML.lin(t, at, at + 0.3) * (1 - leave)).toFixed(4); under.style.transform = `scaleX(${easeOut(ML.lin(t, at + 0.1, at + 0.5)).toFixed(4)})`; }
        if (chip) { const u = ML.out(t, tEnter, tEnter + 0.25); chip.style.opacity = (u * (1 - leave)).toFixed(4); chip.style.translate = `0 ${((1 - u) * 10 * k).toFixed(2)}px`; }
        if (starL) {
          starL.style.opacity = (ML.lin(t, at - 0.2, at + 0.4) * (1 - leave)).toFixed(4);
          stars.forEach((s) => {
            const y = (((s.y - s.v * t) % f.H) + f.H) % f.H;
            s.el.style.transform = `translate(${s.x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            s.el.style.opacity = (s.o * (0.65 + 0.35 * Math.sin(t * 1.3 + s.ph))).toFixed(3);
          });
        }
      },
    };
  },
});
