// Image mode (POSTS_VISUAL=image, the default): each slide is ONE GPT Image call that sees the brand — its logo, its
// website and product screenshots, the slide's own references — and gets the exact words to write. A cheap check
// (Haiku, looking at the result) compares the words and the logo; one retry with what was wrong.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import type { PostJob } from "../../live-engine/protocol";
import { callTool, imageBlock, MODELS, type Ledger } from "../../live-engine/worker/claude";
import { LANGUAGE, type Canvas } from "./platforms";
import { canvasKey, smallJpeg } from "./render";
import { embedClones } from "../../live-engine/worker/steps/build";
import type { Slide } from "./write";

// sizes GPT Image accepts (multiples of 16) closest to each platform's canvas
const SIZE: Record<Canvas, string> = { "4:5": "1088x1360", "9:16": "1088x1920", "16:9": "1600x896" };
// OpenAI's GPT Image price per 1M tokens: text in, image in, image out (developers.openai.com/api/docs/pricing)
const PRICE: Record<string, [number, number, number]> = { default: [5, 8, 30], "gpt-image-1.5": [5, 8, 32], "gpt-image-1": [5, 10, 40], "gpt-image-1-mini": [2, 2.5, 8] };

type Ref = { file: string; role: string };

/** an image's type from its bytes (a file's name can lie: a .png that is really WebP) */
const mediaOf = (buf: Buffer) => (buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP" ? "image/webp" : buf.subarray(0, 3).toString() === "GIF" ? "image/gif" : "image/png");

/** any raster image → a real PNG (ffmpeg keeps transparency) */
async function toPng(src: string, out: string) {
  const ff = process.env.FFMPEG_PATH || ((await import("ffmpeg-static").then((m: any) => m.default).catch(() => null)) as string | null) || "ffmpeg";
  const r = spawnSync(ff, ["-v", "error", "-y", "-i", src, "-frames:v", "1", out]);
  return r.status === 0 && fs.existsSync(out) ? out : null;
}

/** the logo as a PNG reference: an SVG is cropped to its mark and rasterised (transparent background) */
async function logoPng(brand: any, brandDir: string, out: string): Promise<string | null> {
  const file = brand.logo?.file ? path.join(brandDir, brand.logo.file) : null;
  if (!file || !fs.existsSync(file)) return null;
  if (!/\.svg$/i.test(file)) return toPng(file, out);
  const svg = fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
    await page.route("**/*", (r) => (r.request().url().startsWith("data:") || r.request().url() === "about:blank" ? r.continue() : r.abort()));
    await page.setContent(`<html><body style="margin:0;background:transparent"><div id="l">${svg}</div></body></html>`);
    const ok = await page.evaluate(`(() => { const s = document.querySelector("#l svg"); if (!s) return false; const b = s.getBBox(); if (!(b.width > 0)) return false; const h = 480, w = Math.round(h * b.width / b.height); s.setAttribute("viewBox", [b.x, b.y, b.width, b.height].join(" ")); s.setAttribute("width", w); s.setAttribute("height", h); s.style.display = "block"; return true; })()`);
    if (!ok) return null;
    await (await page.$("#l svg"))!.screenshot({ path: out, omitBackground: true });
    return out;
  } finally {
    await browser.close().catch(() => {});
  }
}

/** a reference as a JPEG ≤ 1024 px wide (cheaper image input) */
async function refJpeg(file: string, out: string) {
  const jpg = await smallJpeg(file, 1024);
  if (!jpg) return null;
  fs.writeFileSync(out, jpg);
  return out;
}

/** the logo on a tile that shows it: a light logo (made for dark backgrounds) on near-black, a dark one on white —
 *  a white logo on a transparent PNG is invisible to the image model and to the check */
async function logoTile(png: string, onDark: boolean, out: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.route("**/*", (r) => (r.request().url().startsWith("data:") || r.request().url() === "about:blank" ? r.continue() : r.abort()));
    await page.setContent(`<html><body style="margin:0;background:${onDark ? "#121318" : "#ffffff"}"><div id="t" style="display:inline-block;padding:80px;background:${onDark ? "#121318" : "#ffffff"}"><img src="data:image/png;base64,${fs.readFileSync(png).toString("base64")}" style="display:block;height:360px;width:auto"></div></body></html>`, { waitUntil: "load" });
    await (await page.$("#t"))!.screenshot({ path: out });
    return out;
  } catch {
    return png;
  } finally {
    await browser.close().catch(() => {});
  }
}

/** a phone screen as it really is: the screen's mobile clone (the real UI), rendered at the capture's 390×844 viewport */
async function phoneShot(cloneId: string, brandDir: string, out: string) {
  const dir = path.join(path.dirname(out), `phone-${cloneId}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "video.src.html"), `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:390px;height:844px;overflow:hidden;background:#fff}</style></head><body><div data-clone="${cloneId}" data-w="390" data-h="844" data-frame="none" style="position:absolute;left:0;top:0"></div></body></html>`);
  embedClones({ runDir: dir, brandDir, layout: "9:16" });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.route("**/*", (r) => (r.request().url().startsWith("file://") || r.request().url().startsWith("data:") ? r.continue() : r.abort()));
    await page.goto("file://" + path.join(dir, "video.html"), { waitUntil: "load", timeout: 60000 });
    await page.evaluate("Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))])");
    await page.screenshot({ path: out, type: "jpeg", quality: 90 });
    return out;
  } catch {
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

/** a stable pick per post: each post leans on a different one of the brand's pages / images */
const pick = <T,>(list: T[], seed: string, salt: string) => { if (!list.length) return null; let h = 2166136261; for (const c of seed + salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return list[h % list.length]; };

export async function brandRefs(brand: any, brandDir: string, runDir: string, seed = "") {
  const dir = path.join(runDir, "refs");
  fs.mkdirSync(dir, { recursive: true });
  const raw = await logoPng(brand, brandDir, path.join(dir, "logo-raw.png"));
  const logo = raw ? await logoTile(raw, brand.logo?.on_dark !== false, path.join(dir, "logo.png")) : null;
  const screens = (brand.screens ?? []).filter((s: any) => s.view && fs.existsSync(path.join(brandDir, s.view)));
  // the brand's identity lives on its own website (app: false, not a customer page) — never on product screens, which show
  // the product's content (a customer's store, a generated page) in someone else's theme
  const site = screens.filter((s: any) => !s.app && !s.customer);
  // one of the brand's own pages per post (rotated), so no single page becomes every post's picture
  const page: any = pick(site, seed, "page");
  const looks: Ref[] = [];
  if (page) { const f = await refJpeg(path.join(brandDir, page.view), path.join(dir, `look-${page.id}.jpg`)); if (f) looks.push({ file: f, role: `the brand's own website (${page.id}) — STYLE REFERENCE ONLY — take its colours, light, mood and visual language; never reproduce it: not these people, not this photo, not this page or its layout, and never show it on a screen` }); }
  // the brand's own imagery (its photos / illustrations, never the capture's demo products): the picture's style comes from it
  const rank: Record<string, number> = { people: 0, lifestyle: 1, illustration: 2 };
  const own = (brand.images ?? []).filter((i: any) => !i.demo && i.kind in rank && i.w >= 400 && fs.existsSync(path.join(brandDir, i.file)));
  const imagery: Ref[] = [];
  // one of the brand's own images per post (rotated among its best), for the style of the picture — never its content
  const best = own.sort((a: any, b: any) => rank[a.kind] - rank[b.kind] || (b.w * b.h) - (a.w * a.h)).slice(0, 6);
  const img: any = pick(best, seed, "imagery");
  if (img) { const f = await refJpeg(path.join(brandDir, img.file), path.join(dir, `imagery-${path.basename(img.file).replace(/\.\w+$/, "")}.jpg`)); if (f) imagery.push({ file: f, role: `the brand's own ${img.kind === "people" || img.kind === "lifestyle" ? "photography" : img.kind} — STYLE REFERENCE ONLY — take its colours, light, mood and visual language; never reproduce it: not these people, not this photo, not this page or its layout, and never show it on a screen; create NEW people / subjects and a NEW scene in this style (its kind of subjects, light, colour grade, rendering)` }); }
  return { logo, looks, screens, imagery };
}

/** one slide's references: a screen id → its real screenshot; a captured image file → itself */
async function slideRefs(slide: Slide, brand: any, brandDir: string, runDir: string, screens: any[]): Promise<Ref[]> {
  const out: Ref[] = [];
  for (const r of slide.refs ?? []) {
    const sc = screens.find((s: any) => s.id === r);
    // a phone in the scene shows the screen's real mobile UI; otherwise its desktop screenshot on a laptop
    const mobile = sc?.clones?.mobile?.id && /phone|mobile|smartphone|هاتف|موبايل/i.test(slide.scene ?? "") ? sc.clones.mobile.id : null;
    if (mobile) {
      const f = await phoneShot(mobile, brandDir, path.join(runDir, "refs", `phone-${mobile}.jpg`));
      if (f) { out.push({ file: f, role: `the real phone screen of the product (${sc.shows ?? sc.id}) — put exactly this screen on the phone, as it is; never change, redraw or invent its UI, text or numbers` }); continue; }
    }
    const src = sc ? path.join(brandDir, sc.view) : path.join(brandDir, r);
    if (!fs.existsSync(src)) continue;
    const f = await refJpeg(src, path.join(runDir, "refs", `ref-${path.basename(r).replace(/\.\w+$/, "")}.jpg`));
    if (f) out.push({ file: f, role: sc ? `a real product screen (${sc.shows ?? sc.id}) — show exactly this screen on a laptop, as it is; never change, redraw or invent its UI, text or numbers` : `a captured image (${r}) — use it as it is` });
  }
  return out;
}

/**
 * The brand's visual style in words, from its own website page and imagery (Haiku looks at them). Style images are never
 * sent to the image model: the edits endpoint reuses whatever it is given (the same people, the same page in every post).
 */
async function styleBrief(post: PostJob, brand: any, looks: Ref[], imagery: Ref[], ledger: Ledger) {
  const shots = [...looks, ...imagery];
  if (!shots.length) return "";
  const content: any[] = [];
  for (const r of shots) { const buf = fs.readFileSync(r.file); content.push({ type: "text", text: r.role.split(" — ")[0] + ":" }, imageBlock(buf, mediaOf(buf))); }
  content.push({ type: "text", text: `Describe this brand's VISUAL STYLE so an image model can create brand-new images that clearly belong to it — without copying anything shown. Cover: how the palette is used (${JSON.stringify(brand.palette ?? {})}), backgrounds and surfaces, graphic elements and shapes, the photography or illustration style (kinds of subjects in general terms, wardrobe and setting genre, light, colour grade, depth, framing), composition habits, and the typography feel. Never describe specific people, faces, a specific photo or page; 120–180 words, one paragraph, English.` });
  const tool = { name: "style_brief", description: "The brand's visual style.", input_schema: { type: "object", required: ["style"], properties: { style: { type: "string" } } } };
  const r = (await callTool({ ledger, step: "post-check", model: MODELS.haiku, system: "You are a brand art director.", content, tool, maxTokens: 1200 })) as { style: string };
  return String(r.style ?? "").trim();
}

function promptFor(post: PostJob, brand: any, slide: Slide, canvas: Canvas, refs: { logo: boolean; roles: string[]; screen: boolean; style: string }, n: number, total: number, feedback?: string) {
  const imagery = Boolean(refs.style);
  const [w, h] = SIZE[canvas].split("x");
  const words = [`Headline: «${slide.headline}»`, slide.sub ? `Second line: «${slide.sub}»` : "", slide.cta ? `Call to action (as a button or tag): «${slide.cta}»` : ""].filter(Boolean).join("\n  ");
  const rtl = post.dialect !== "en";
  const palette = brand.palette ? Object.entries(brand.palette).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k} ${v}`).join(", ") : "";
  return [
    `Create a finished, premium social media post image (${w}×${h}) for the brand ${brand.name}${brand.name_ar ? ` (${brand.name_ar})` : ""}${total > 1 ? ` — slide ${n} of ${total} of a carousel; keep one consistent design across the slides` : ""}.`,
    slide.scene ?? "",
    `Everything in the picture is newly made for this post: style references set the look, never the content.`,
    `Make it alive: a real subject in a real moment — the brand's audience, or its product in real use — rendered in ${imagery ? "the brand's visual style above — with new people / subjects and a new scene" : "premium, natural lifestyle photography"}; depth, light and emotion, like a top brand's campaign — never a flat badge of icons on a plain background.`,
    `Text on the image — write EXACTLY these words and nothing else, in ${LANGUAGE[post.dialect] ?? post.dialect}${rtl ? " (Arabic script, right-to-left, every letter correctly joined, all dots in place, no extra or missing letters)" : ""}, large and crisp, in bold modern typography that matches the brand:\n  ${words}`,
    refs.style ? `THE BRAND'S VISUAL STYLE (from its own website and imagery): ${refs.style}` : "",
    `THE BRAND IS THE BASE OF THIS IMAGE — it must feel like an extension of the brand itself, as if taken from its own website. Its colours dominate: ${palette}${brand.palette?.theme ? ` (a ${brand.palette.theme} brand: the image is ${brand.palette.theme})` : ""}. Its look: ${brand.look ?? ""}. Its type: ${brand.fonts?.display ?? ""} / ${brand.fonts?.body ?? ""} style. Any occasion or theme (a holiday, a season, an event) is expressed INSIDE this identity — its motifs drawn in the brand's own colours and style — never with the occasion's traditional stock palette or look, unless those are the brand's own colours.`,
    refs.roles.map((r, i) => `Reference image ${i + 1}: ${r}.`).join("\n"),
    refs.logo ? `Reference image 1 is the brand's logo (shown on a plain tile — the tile is not part of the logo): reproduce the mark and its lettering exactly as given — same shapes, letters, colours and proportions, never redrawn, re-spelled, recoloured or altered — clearly visible and well sized, like a signature.` : "",
    refs.screen ? "Any phone or laptop in the image shows ONLY the real screen given as a reference, exactly as it is. The scene must be physically real: a screen faces the person using it — if the viewer sees the screen, the person is beside or behind it looking the same way (over the shoulder), or the device is held / placed toward the viewer with nobody looking at it from the back." : "Do NOT show any phone, laptop, tablet, app screen or user interface — there is no real screen for this image.",
    `No other text, letters, numbers, watermarks or made-up interface anywhere. Keep all text well inside the edges. Everything physically plausible: correct perspective and light, natural hands and faces, objects used the way they really are.`,
    feedback ? `The previous attempt had these problems — fix them: ${feedback}` : "",
  ].filter(Boolean).join("\n\n");
}

async function generate(post: PostJob, prompt: string, size: string, files: string[], ledger: Ledger) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set — image posts need it");
  const form = new FormData();
  form.append("model", post.image.model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", post.image.quality);
  form.append("output_format", "jpeg");
  form.append("output_compression", "92");
  for (const f of files) { const buf = fs.readFileSync(f); form.append("image[]", new Blob([buf], { type: mediaOf(buf) }), path.basename(f)); }
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
  const body = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number } }; error?: { message?: string } } | null;
  const u = body?.usage, [pt, pi, po] = PRICE[post.image.model] ?? PRICE.default;
  const tin = u?.input_tokens ?? 0, timg = u?.input_tokens_details?.image_tokens ?? 0, ttxt = u?.input_tokens_details?.text_tokens ?? Math.max(0, tin - timg), tout = u?.output_tokens ?? 0;
  if (u) ledger.addPriced("post-image", post.image.model, { in: tin, out: tout }, (ttxt * pt + timg * pi + tout * po) / 1e6, Date.now() - t0);
  if (!res.ok || !body?.data?.[0]?.b64_json) throw new Error(`OpenAI ${res.status}: ${body?.error?.message?.slice(0, 300) ?? "no image"}`);
  return Buffer.from(body.data[0].b64_json, "base64");
}

/** Haiku reads the image: are the words exactly right, is the logo there, is there any other text? */
async function checkImage(post: PostJob, slide: Slide, file: string, logo: string | null, ledger: Ledger, screenAllowed: boolean) {
  const small = (await smallJpeg(file, 900)) ?? fs.readFileSync(file);
  const content: any[] = [{ type: "text", text: "THE POST IMAGE:" }, imageBlock(small)];
  if (logo) { const buf = fs.readFileSync(logo); content.push({ type: "text", text: "THE BRAND'S LOGO (for comparison):" }, imageBlock(buf, mediaOf(buf))); }
  content.push({ type: "text", text: `The image must show exactly these words (and no other text):\n- «${slide.headline}»${slide.sub ? `\n- «${slide.sub}»` : ""}${slide.cta ? `\n- «${slide.cta}»` : ""}\nRead the image letter by letter. Not problems: a line break inside a phrase, an emoji drawn as a graphic or left out, equivalent spellings (tanween on or before the alif: مجانًا = مجاناً; hamza / taa marbuta forms the language allows), missing optional diacritics. Problems: a wrong, missing, extra or swapped letter or word. Compare the logo with the reference shape by shape and letter by letter (a re-spelled or redrawn logo is not the logo). Look for anything physically impossible: a screen seen from the front while the person using it looks at it from the other side, wrong hands or faces, impossible perspective.${screenAllowed ? "" : " This image must not show any phone, laptop, tablet, app screen or user interface."} Report honestly.` });
  const tool = { name: "check_image", description: "What the image shows.", input_schema: { type: "object", required: ["words_exact", "logo_visible", "problems"], properties: { words_exact: { type: "boolean", description: "every required word is spelled exactly right (every letter, joined correctly)" }, logo_visible: { type: "boolean", description: "the brand's logo appears, recognisably the same" }, extra_text: { type: "boolean", description: "other text or gibberish appears" }, ui_shown: { type: "boolean", description: "a phone, laptop, tablet, app screen or interface appears" }, impossible: { type: "string", description: "what is physically impossible, if anything (empty when the scene is real)" }, device_ok: { type: "boolean", description: "true when no laptop / phone screen is visible; or when a visible screen faces the viewer AND every person looking at it is on the viewer's side of it (beside or behind it, looking the same way). false when anyone looks at a screen we can see from its front (they would be seeing its back)." }, problems: { type: "array", items: { type: "string" }, description: "what is wrong, precisely (which word is misspelled and how)" } } } };
  const r = (await callTool({ ledger, step: "post-check", model: MODELS.haiku, system: "You check generated social media images against what they must show.", content, tool, maxTokens: 1500 })) as { words_exact: boolean; logo_visible: boolean; extra_text?: boolean; ui_shown?: boolean; impossible?: string; device_ok?: boolean; problems: string[] };
  const badUi = !screenAllowed && Boolean(r.ui_shown);
  const impossible = [String(r.impossible ?? "").trim(), r.device_ok === false ? "people look at a screen that faces the viewer — they would see its back: turn the device toward them and show it over their shoulder, or nobody behind it" : ""].filter(Boolean).join("; ");
  const ok = r.words_exact && r.logo_visible && !r.extra_text && !badUi && !impossible;
  return { ok, problems: ok ? [] : [...(r.problems ?? []), !r.words_exact ? "the words are not exactly right" : "", !r.logo_visible ? "the logo is not exactly the brand's logo" : "", r.extra_text ? "there is other text" : "", badUi ? "it shows a device / app screen — remove it (no real screen for this image)" : "", impossible ? `physically impossible: ${impossible}` : ""].filter(Boolean) };
}

export async function imageSlides(opts: { post: PostJob; brand: any; brandDir: string; runDir: string; slides: Slide[]; canvases: Canvas[]; ledger: Ledger; prevRenders?: Record<string, string[]> | null; log: (l: string) => void }) {
  const { post, brand, brandDir, runDir, slides, canvases, ledger, log } = opts;
  const { logo, looks, screens, imagery } = await brandRefs(brand, brandDir, runDir, post.postId);
  const style = await styleBrief(post, brand, looks, imagery, ledger).catch(() => "");
  if (style) log(`✓ style: ${style.slice(0, 160)}…`);
  const renders: Record<string, string[]> = {}, check: Record<string, string[][]> = {};
  fs.mkdirSync(path.join(runDir, "slides"), { recursive: true });
  for (const canvas of canvases) {
    renders[canvas] = [];
    check[canvas] = [];
    for (const [i, slide] of slides.entries()) {
      if (ledger.total() >= post.maxUsd) throw new Error(`cost cap reached ($${ledger.total().toFixed(2)} of $${post.maxUsd})`);
      const own = await slideRefs(slide, brand, brandDir, runDir, screens);
      // "Request a change": the current slide goes in as a reference, so what wasn't asked to change stays
      const prevFile = opts.prevRenders?.[canvas]?.[i] ? path.join(runDir, "prev", opts.prevRenders[canvas][i]) : null;
      const prev: Ref[] = prevFile && fs.existsSync(prevFile) ? [{ file: prevFile, role: `the current version of this slide — keep everything the client didn't ask to change (the change: ${post.request})` }] : [];
      // only what the image must reproduce goes in as an image: the logo, the current version, the slide's real screen
      const refs: Ref[] = [...(logo ? [{ file: logo, role: "the brand's logo" }] : []), ...prev, ...own].slice(0, 3);
      const roles = refs.map((r) => r.role);
      const hasScreen = own.some((r) => /real (phone )?(product )?screen/.test(r.role));
      const file = path.join(runDir, "slides", `${canvasKey(canvas)}-${i + 1}.jpg`);
      let feedback: string | undefined, last: string[] = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const jpg = await generate(post, promptFor(post, brand, slide, canvas, { logo: Boolean(logo), roles, screen: hasScreen, style }, i + 1, slides.length, feedback), SIZE[canvas], refs.map((r) => r.file), ledger);
        fs.writeFileSync(file, jpg);
        const c = await checkImage(post, slide, file, logo, ledger, hasScreen);
        last = c.problems;
        if (c.ok) break;
        log(`  check ${canvas} slide ${i + 1}: ${c.problems.join(" | ")}${attempt === 0 ? " — retrying" : ""}`);
        feedback = c.problems.join("; ");
        if (ledger.total() >= post.maxUsd) break;
      }
      renders[canvas].push(path.relative(runDir, file));
      check[canvas].push(last);
    }
    log(`✓ slides ${canvas}: ${slides.length} image(s) · ${SIZE[canvas]}${check[canvas].some((l) => l.length) ? ` · left: ${check[canvas].flat().join(" | ").slice(0, 200)}` : " · check passed"}`);
  }
  return { renders, check };
}
