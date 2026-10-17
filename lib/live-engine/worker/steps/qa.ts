/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/qa.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 5d — safety net. Free browser checks at every scene's hold point + one cheap vision look,
// then at most 2 small repair rounds (find/replace edits, not a rewrite). Keeps the best version.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { callTool, imageBlock } from "../claude";
import { LAYOUTS } from "./script";
import { embedClones } from "./build";
import { installInPage, call as inPage } from "../inpage";

const norm = (s) => String(s || "").replace(/[ً-ْـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();

export async function inspect({ htmlFile, layout, script, runDir, tag }) {
  const [W, H] = LAYOUTS[layout] || LAYOUTS["9:16"];
  const browser = await chromium.launch(); const qctx = await browser.newContext({ viewport: { width: W, height: H } }); await installInPage(qctx); const page = await qctx.newPage();
  const issues = []; const add = (sev, code, msg, t) => issues.push({ sev, code, msg, t });
  page.on("pageerror", (e) => add("error", "js", "JS error: " + e.message.slice(0, 200)));
  await page.goto("file://" + htmlFile + "?render", { waitUntil: "networkidle" }).catch((e) => add("error", "load", e.message.slice(0, 200)));
  const ok = await page.evaluate(() => typeof window.__seek === "function").catch(() => false);
  if (!ok) { add("error", "contract", "K.done(tl, duration) was never called, so the video cannot be seeked"); await browser.close(); return { issues, frames: [] }; }
  await page.evaluate(() => window.__ready).catch(() => {});
  const frames = [];
  // scenes whose script asks for a live product screen
  const assetsFile = path.join(runDir, "assets.json");
  const liveIds = new Set(fs.existsSync(assetsFile) ? JSON.parse(fs.readFileSync(assetsFile, "utf8")).filter((a) => /^live-/.test(a.kind)).map((a) => a.id) : []);
  for (const [i, s] of script.scenes.entries()) {
    const dur = s.bars * 2, last = i === script.scenes.length - 1;
    const t = +(last ? script.length - 0.4 : s.start + Math.min(dur * 0.65, dur - 0.45)).toFixed(2);
    await page.evaluate((x) => window.__seek(x), t);
    const p = await inPage(page, "QA_PROBE");
    const label = `scene ${i + 1} (${s.purpose}, ${s.start}-${s.start + dur}s)`;
    if (!p.texts.length && !p.media) add("error", "blank", `${label}: nothing visible at ${t}s`, t);
    // composed scenes whose recipe shows no device by design (offer number, cta, hook, problem cards) are exempt
    const noDevice = /\br-(stat|cta|hook|stack|type|pains|count|logo|none)\b/.test(await page.evaluate((n) => document.querySelector(`[data-scene="${n}"]`)?.className || "", i + 1).catch(() => ""));
    if (!noDevice && (s.visual.assets || []).some((id) => liveIds.has(id)) && !p.clones) add("error", "no-live", `${label}: the script shows a live product screen here, but none is visible at ${t}s`, t);
    const seen = norm(p.texts.map((x) => x.text).join(""));
    const words = String(s.headline || "").split(/\s+/).filter((w) => norm(w).length > 1).slice(0, 3);
    if (words.length && words.filter((w) => seen.includes(norm(w))).length < Math.ceil(words.length / 2)) add("error", "headline", `${label}: headline "${s.headline}" is not readable at ${t}s`, t);
    const m = Math.round(W * 0.03);
    for (const x of p.texts) {
      if (/(^|> )div\.(tick|track)( |$)/.test(x.sel)) continue; // ticker rows scroll past the frame edges by design
      if (x.o > 0.5 && (x.x < -4 || x.y < -4 || x.x + x.w > p.W + 4 || x.y + x.h > p.H + 4)) add("error", "offstage", `${label}: text "${x.text}" (${x.sel}) runs off the frame at ${t}s (box ${Math.round(x.x)},${Math.round(x.y)} ${Math.round(x.w)}×${Math.round(x.h)})`, t);
      else if (x.o > 0.5 && (x.x < m || x.x + x.w > p.W - m)) add("warn", "margin", `${label}: text "${x.text}" (${x.sel}) touches the edge at ${t}s`, t);
      if (x.fs < Math.round(W / 45) && x.text.length > 2) add("warn", "small", `${label}: text "${x.text}" (${x.sel}) is ${x.fs}px, too small to read on a phone`, t);
    }
    for (const [ta, sa, tb, sb] of p.overlaps) add("error", "overlap", `${label}: "${ta}" (${sa}) overlaps "${tb}" (${sb}) at ${t}s`, t);
    const f = path.join(runDir, `qa-${tag}-${i + 1}.jpg`); await page.screenshot({ path: f, type: "jpeg", quality: 60 }); frames.push({ file: f, t, label });
  }
  // a desktop live screen on screen for more than 1.5 s without the camera ever zooming in (its text is tiny at full width)
  const runs = new Map();
  for (let t = 0; t <= script.length; t = +(t + 0.25).toFixed(2)) {
    await page.evaluate((x) => window.__seek(x), t);
    const cams = await inPage(page, "QA_CAMS").catch(() => []);
    for (const c of cams) {
      const r = runs.get(c.id) || { from: null, flagged: false };
      if (c.vis && c.z <= 1.01) { if (r.from == null) r.from = t; if (!r.flagged && t - r.from > 1.5) { add("error", "unzoomed", `the live screen ${c.id} shows un-zoomed from ${r.from}s to beyond ${t}s — K.focus never moved the camera into it`, r.from); r.flagged = true; } }
      else { r.from = null; r.flagged = false; }
      runs.set(c.id, r);
    }
  }

  // contact sheet (one image, all scenes) built in the browser — no image libraries needed
  const cols = Math.min(frames.length, 5), cw = 200, ch = Math.round((cw * H) / W);
  await page.setViewportSize({ width: cols * cw, height: Math.ceil(frames.length / cols) * (ch + 22) });
  await page.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${cw}px);font:12px sans-serif;color:#fff">${frames.map((f) => `<div><img src="data:image/jpeg;base64,${fs.readFileSync(f.file).toString("base64")}" style="width:${cw}px;height:${ch}px;display:block"><div style="height:22px;padding:3px">${f.label.split(" (")[0]} · ${f.t}s</div></div>`).join("")}</body>`);
  const sheet = path.join(runDir, `qa-${tag}-sheet.jpg`); await page.screenshot({ path: sheet, type: "jpeg", quality: 75, fullPage: true });
  await browser.close();
  // de-duplicate repeated lines
  const uniq = [...new Map(issues.map((x) => [x.code + x.msg, x])).values()];
  return { issues: uniq, frames, sheet };
}

async function visionLook({ sheet, script, brand, ledger, model }) {
  const tool = { name: "review", description: "Problems a viewer would notice", input_schema: { type: "object", required: ["problems"], properties: { problems: { type: "array", items: { type: "object", required: ["scene", "problem"], properties: { scene: { type: "integer" }, problem: { type: "string" } } } } } } };
  const out = await callTool({ ledger, step: "qa-vision", model, maxTokens: 800, tool, content: [imageBlock(fs.readFileSync(sheet)), { type: "text", text: `Frames from a ${script.length}s ad for ${brand.name}, one per scene at its hold point. Scene headlines: ${JSON.stringify(script.scenes.map((s, i) => ({ scene: i + 1, headline: s.headline })))}.\nList only clear, visible defects: empty or nearly empty frame, unreadable text (low contrast, too small, cut off), text on top of text, broken/stretched images, a scene that does not show what its headline says. Ignore small text that is part of a product screenshot or UI mock-up (that is expected). Ignore taste. Return an empty list if the frames look fine.` }],
    system: "You are a strict video QA checker. Report only defects you can actually see." });
  return out.problems.map((p) => ({ sev: "error", code: "vision", msg: `scene ${p.scene}: ${p.problem}` }));
}

async function repair({ html, issues, script, ledger, model, round }) {
  const tool = { name: "edits", description: "Exact find/replace edits to the HTML", input_schema: { type: "object", required: ["edits"], properties: { edits: { type: "array", items: { type: "object", required: ["find", "replace"], properties: { find: { type: "string", description: "exact substring of the current HTML, long enough to be unique" }, replace: { type: "string" } } } } } } };
  const out = await callTool({ ledger, step: `qa-repair-${round}`, model, maxTokens: 8000, tool, effort: "low",
    system: "You fix a GSAP motion-graphics HTML file with small exact find/replace edits. Fix only the listed problems; keep everything else, keep timings on the same seconds, keep K.done. If a scene is missing or shows no visual, do NOT add text — leave it (a full rebuild handles it); never patch a scene with a text-only stub. Most common cause of invisible scenes: an element hidden in CSS (opacity:0) animated with gsap .from({opacity:0}) — the tween goes 0→0. Fix by replacing that .from with .fromTo(sel,{opacity:0,...},{opacity:1,...}). Other typical fixes: give an element a lower top/left or max-width so it stays in frame; reduce font-size; move or delay one of two overlapping texts; make sure an element that should be visible is not left at opacity 0 (check .from/.to/.set on it and any exit tween that fires too early); fix JS errors.",
    content: `PROBLEMS (time in seconds is when they were seen):\n${issues.map((x) => `- [${x.code}] ${x.msg}`).join("\n")}\n\nSCENES: ${JSON.stringify(script.scenes.map((s) => ({ start: s.start, end: s.start + s.bars * 2, headline: s.headline })))}\n\nHTML:\n${html}` });
  let next = html, applied = 0;
  for (const e of out.edits || []) if (e.find && next.includes(e.find)) { next = next.replace(e.find, e.replace); applied++; }
  return { html: next, applied, proposed: (out.edits || []).length };
}

/** check → (repair → check) ×≤2, keep the version with the fewest errors */
export async function safetyNet({ htmlFile, brief, brand, script, runDir, brandDir, ledger, models, rebuild, log = console.log }) {
  // repairs edit the model's source (placeholders only, small); the live UI is pasted in again after every edit
  const srcFile = path.join(runDir, "video.src.html"), hasSrc = fs.existsSync(srcFile);
  const readSrc = () => fs.readFileSync(hasSrc ? srcFile : htmlFile, "utf8");
  const writeSrc = (h) => { if (hasSrc) { fs.writeFileSync(srcFile, h); embedClones({ runDir, brandDir, layout: brief.layout }); } else fs.writeFileSync(htmlFile, h); };
  log("▶ qa: checking every scene");
  const score = (r) => r.issues.filter((x) => x.sev === "error").length;
  const check = async (tag) => {
    const r = await inspect({ htmlFile, layout: brief.layout, script, runDir, tag });
    if (r.sheet && models.qa) r.issues.push(...(await visionLook({ sheet: r.sheet, script, brand, ledger, model: models.qa }).catch((e) => [{ sev: "warn", code: "vision", msg: "vision check failed: " + e.message }])));
    return r;
  };
  const history = [];
  let cur = await check("v0"), best = { html: readSrc(), r: cur, tag: "v0" };
  history.push({ tag: "v0", errors: score(cur), warnings: cur.issues.length - score(cur) });
  log(`  v0: ${score(cur)} errors, ${cur.issues.length - score(cur)} warnings`); cur.issues.filter((x) => x.sev === "error").slice(0, 6).forEach((x) => log(`   ✗ ${x.msg}`));
  // composed videos (code from recipes) are not patched by the model — the edits could never apply to generated HTML;
  // QA problems go back to the director instead, and compose runs again (one retry)
  const composed = brief.composer !== "freeform";
  for (let round = 1; round <= 2 && score(best.r) > 0 && !composed; round++) {
    const model = round === 1 ? models.repair : models.repair2 || models.repair;
    const fix = await repair({ html: best.html, issues: best.r.issues.filter((x) => x.sev === "error"), script, ledger, model, round });
    if (!fix.applied) { log(`  repair ${round}: no applicable edits (${fix.proposed} proposed)`); history.push({ tag: `v${round}`, applied: 0 }); continue; }
    writeSrc(fix.html);
    const r = await check(`v${round}`);
    history.push({ tag: `v${round}`, applied: fix.applied, errors: score(r), warnings: r.issues.length - score(r) });
    log(`  repair ${round}: ${fix.applied} edits → ${score(r)} errors`);
    if (score(r) < score(best.r)) best = { html: fix.html, r, tag: `v${round}` };
  }
  const severe = (r) => new Set(r.issues.filter((x) => ["blank", "headline", "js", "contract", "no-live"].includes(x.code)).map((x) => x.t)).size;
  if (rebuild && (composed ? score(best.r) > 0 : severe(best.r) >= 2)) {
    log(composed ? `  ${score(best.r)} errors → the director gets them, compose runs again (one retry)` : `  ${severe(best.r)} scenes still broken → one full rebuild`);
    await rebuild(best.r.issues.filter((x) => x.sev === "error"));
    const r = await check("v3");
    history.push({ tag: "v3-rebuild", errors: score(r), warnings: r.issues.length - score(r) });
    log(`  rebuild → ${score(r)} errors`);
    if (score(r) < score(best.r)) best = { html: readSrc(), r, tag: "v3" };
  }
  writeSrc(best.html);
  const report = { shipped: best.tag, errors: score(best.r), history, issues: best.r.issues, sheet: best.r.sheet && path.basename(best.r.sheet) };
  fs.writeFileSync(path.join(runDir, "qa.json"), JSON.stringify(report, null, 2));
  log(`✓ qa: shipped ${best.tag} with ${report.errors} errors`);
  return report;
}
