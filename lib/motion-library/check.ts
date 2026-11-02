// The gate every item passes before it enters the library: a move rendered alone on a sample scene, in Arabic and
// English, in 9:16 and 16:9, at moments through its run —
//   · the same moment rendered twice must give the same pixels (a pure function of t),
//   · no page error,
//   · no slot pushed off the frame,
//   · stills saved for the gallery.
//   pnpm tsx lib/motion-library/check.ts <move id …>|--all   (→ lib/motion-library/.checks/<id>/…)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { readMoves, MOVES_DIR } from "./catalogue";
import type { MoveCard } from "./schema";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, ".checks");
// GSAP 3.13 and the plugins a move may use (all free since 3.13); every page that plays moves loads the same set
export const GSAP_FILES = ["gsap", "CustomEase", "CustomBounce", "CustomWiggle", "EasePack", "DrawSVGPlugin", "MorphSVGPlugin", "MotionPathPlugin", "Physics2DPlugin", "ScrambleTextPlugin", "SplitText", "TextPlugin", "Flip"].map((f) => path.join(here, "..", "..", "node_modules", "gsap", "dist", `${f}.min.js`));
const GSAP_REGISTER = "gsap.registerPlugin(CustomEase, CustomBounce, CustomWiggle, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, Physics2DPlugin, ScrambleTextPlugin, SplitText, TextPlugin, Flip);";
// ML_LOOK=<id>: render with looks/<id>.css (to see a look on real moves); stills go to .checks/<move>/<look>/
const LOOK = process.env.ML_LOOK || "";
const SHAPES: Record<string, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };

const SAMPLE = {
  ar: { dir: "rtl", headline: "قسّطها على مزاجك", sub: "من غير فوايد ولا ورق", words: "قسّطها على مزاجك من غير فوايد ولا ورق", number: "4,500", label: "الدفعة الأولى", list: ["اختار الخطة", "اكتب رقمك", "خلاص اتأكّد"] },
  en: { dir: "ltr", headline: "Pay it your way", sub: "No interest, no paperwork", words: "Pay it your way no interest no paperwork", number: "4,500", label: "First payment", list: ["Pick a plan", "Add your number", "Done, confirmed"] },
};
const IMG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4a261"/><stop offset="1" stop-color="#2a9d8f"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="820" cy="320" r="170" fill="#fff" opacity=".5"/></svg>')}`;

/** a one-scene film with every slot a move can target, the move on its target */
function page(card: MoveCard, lang: "ar" | "en", shape: string, dur: number) {
  const s = SAMPLE[lang], target = card.targets[0];
  // a synthetic voice: the sample words spread over the first 70% of the scene
  const ws = s.words.split(" "), words = ws.map((w, i) => ({ w, t: +(0.3 + (i * dur * 0.7) / ws.length).toFixed(3), e: +(0.3 + ((i + 0.8) * dur * 0.7) / ws.length).toFixed(3) }));
  const slot = (name: string) => (name === target ? ` data-slot="${name}"` : ` data-slot-sample="${name}"`);
  const body = `
<div class="ml-head"><div class="ml-title"${slot("headline")}${slot("line")}>${s.headline}</div><div class="ml-sub"${slot("word")}>${s.sub}</div></div>
<div class="ml-pic"><div class="ml-panel" style="padding:40px;display:grid;gap:22px;width:80%">
  <div style="display:flex;align-items:center;gap:18px"><svg viewBox="0 0 120 40" width="180" height="60"${slot("logo")}><rect x="0" y="4" width="32" height="32" rx="9" fill="var(--x-accent)"/><text x="42" y="30" direction="ltr" unicode-bidi="embed" font-size="26" font-weight="700" fill="var(--x-ink)" font-family="var(--x-head-font)">brand</text></svg><div class="ml-label"${slot("label")}>${s.label}</div></div>
  <div style="font:800 120px var(--x-head-font)"${slot("number")}>${s.number}</div>
  <img src="${IMG}" style="width:100%;height:260px;object-fit:cover;border-radius:var(--x-pic-radius)"${slot("image")}>
  <div style="display:flex;gap:14px"${slot("list")}>${s.list.map((x) => `<span class="ml-panel" style="padding:12px 20px;font-size:28px">${x}</span>`).join("")}</div>
</div></div>`.replace(/ data-slot="(\w+)" data-slot="\w+"/g, ' data-slot="$1"');
  const moveFile = path.join(MOVES_DIR, card.category, card.id.split(".")[1] + ".js");
  return `<!doctype html><html lang="${lang}" dir="${s.dir}"${LOOK ? ` data-look="${LOOK}"` : ""}><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;600;700&family=JetBrains+Mono:wght@500;600&family=Newsreader:ital,wght@0,400;1,400&family=Caveat:wght@500&family=Noto+Naskh+Arabic:wght@400;700&family=Aref+Ruqaa&display=block">
<style>${fs.readFileSync(path.join(here, "looks", "base.css"), "utf8")}${LOOK ? fs.readFileSync(path.join(here, "looks", `${LOOK}.css`), "utf8") : ""}</style></head>
<body style="margin:0"><div id="stage" data-shape="${shape}"><section class="ml-scene" id="s0">${body}</section></div>
${GSAP_FILES.map((f) => `<script>${fs.readFileSync(f, "utf8")}</script>`).join("")}<script>${GSAP_REGISTER}</script>
<script>${fs.readFileSync(path.join(here, "runtime", "kit.js"), "utf8")}</script>
<script>${fs.readFileSync(moveFile, "utf8")}</script>
<script>document.fonts.ready.then(() => ML.film({ duration: ${dur}, shape: "${shape}", words: ${JSON.stringify(words)},
  scenes: [{ el: document.getElementById("s0"), from: 0, to: ${dur}, moves: [{ move: "${card.id}", target: "${target === "stage" || target === "scene" ? "stage" : target}", at: "start" }] }] }));</script></body></html>`;
}

async function checkMove(browser: Browser, card: MoveCard) {
  const dir = path.join(OUT, card.id, LOOK);
  fs.mkdirSync(dir, { recursive: true });
  const dur = Math.min(8, Math.max(3, card.duration[1] + 1.2));
  const problems: string[] = [];
  for (const shape of (["9:16", "16:9"] as const).filter((x) => card.shapes.includes(x))) {
    for (const lang of card.rtl ? (["ar", "en"] as const) : (["en"] as const)) {
      const [W, H] = SHAPES[shape];
      const pg = await browser.newPage({ viewport: { width: W, height: H } });
      const errs: string[] = [];
      pg.on("pageerror", (e) => errs.push(e.message));
      const file = path.join(dir, `page-${lang}-${shape.replace(":", "x")}.html`);
      fs.writeFileSync(file, page(card, lang, shape, dur));
      await pg.goto("file://" + file, { waitUntil: "load", timeout: 60000 });
      await pg.waitForFunction("window.__ready === true", null, { timeout: 30000 }).catch(() => errs.push("never ready"));
      const times = [0.2, 0.5, 0.8, 1.2, 2, dur * 0.6, dur - 0.4].map((x) => +x.toFixed(2));
      for (const t of times) {
        await pg.evaluate(`window.__seek(${t})`);
        const a = await pg.screenshot({ type: "png" });
        await pg.evaluate(`window.__seek(${(t + dur / 2) % dur}); window.__seek(${t})`);
        const b = await pg.screenshot({ type: "png" });
        if (crypto.createHash("sha1").update(a).digest("hex") !== crypto.createHash("sha1").update(b).digest("hex")) problems.push(`${lang} ${shape} t=${t}: not the same picture twice`);
        fs.writeFileSync(path.join(dir, `${lang}-${shape.replace(":", "x")}-t${t}.png`), a);
        const off = await pg.evaluate(`[...document.querySelectorAll('[data-slot]')].filter(e => { const r = e.getBoundingClientRect(); const v = getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.05; return v && (r.right < 0 || r.left > ${W} || r.bottom < 0 || r.top > ${H} || r.left < -2 || r.right > ${W + 2}); }).length`);
        if (Number(off) > 0) problems.push(`${lang} ${shape} t=${t}: a slot is off the frame`);
      }
      if (errs.length) problems.push(`${lang} ${shape}: ${errs.slice(0, 3).join(" | ")}`);
      await pg.close();
    }
  }
  const result = { id: card.id, ok: problems.length === 0, problems, at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { cards, errors } = readMoves();
  if (errors.length) console.error(`✗ card problems (these moves are not in the library until fixed):\n  ${errors.join("\n  ")}`);
  const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const list = process.argv.includes("--all") ? cards : cards.filter((c) => want.includes(c.id));
  if (!list.length) { console.error("no moves to check (ids, or --all)"); process.exit(1); }
  const browser = await chromium.launch();
  let bad = 0;
  for (const c of list) {
    const r = await checkMove(browser, c);
    if (!r.ok) bad++;
    console.log(`${r.ok ? "✓" : "✗"} ${c.id}${r.ok ? "" : `\n    ${r.problems.join("\n    ")}`}`);
  }
  await browser.close();
  console.log(`${list.length - bad} of ${list.length} passed`);
  process.exit(bad ? 1 : 0);
}
