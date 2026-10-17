/* eslint-disable */
// @ts-nocheck — verbatim port of video-sandbox/steps/capture.mjs; the only edits are listed in scripts/live-engine/port-sandbox.py.
// STEP 3 — capture agent.
// A) Public crawl: home + main same-site pages → full-page screenshots, HTML, CSS, fonts, images, logo, computed styles.
// B) App agent: Claude drives the browser to sign up (or log in with given credentials), then walks the app and saves each screen.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { rawCall, imageBlock } from "../claude";
import { createInbox } from "../inbox";
import { saveSnapshot, fontFaceCss } from "../snapshot";
import { installInPage, call as inPage } from "../inpage";
import { makeScope } from "../scope";

const VIEW = { width: 1440, height: 900 };
const MAX_PUBLIC_PAGES = 6;
const MAX_AGENT_STEPS = 130;

const slugify = (s) => s.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const extOf = (ct, url) => {
  const map = { "image/svg+xml": ".svg", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif", "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico", "text/css": ".css", "font/woff2": ".woff2", "font/woff": ".woff", "font/ttf": ".ttf", "font/otf": ".otf", "application/font-woff2": ".woff2" };
  for (const k in map) if (ct.includes(k)) return map[k];
  const m = url.split("?")[0].match(/\.(svg|png|jpe?g|webp|gif|avif|ico|css|woff2?|ttf|otf)$/i);
  return m ? "." + m[1].toLowerCase().replace("jpeg", "jpg") : null;
};

export async function capture({ brief, brandDir, ledger, models, log = console.log }) {
  for (const d of ["screens", "parts", "clones", "html", "assets/images", "assets/css", "assets/fonts", "assets/logo", "probes"]) fs.mkdirSync(path.join(brandDir, d), { recursive: true });
  const manifest = { version: 4, site: brief.url, capturedAt: new Date().toISOString(), pages: [], app: { status: "not_started", screens: [] }, assets: {} };
  const seen = new Set();
  const browser = await chromium.launch({ headless: process.env.HEADFUL ? false : true });
  const authState = path.join(brandDir, "auth.json");
  const ctx = await browser.newContext({ ...(brief.resnap && fs.existsSync(authState) ? { storageState: authState } : {}), viewport: VIEW, deviceScaleFactor: 2, locale: brief.locale || "ar-SA", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" });

  await installInPage(ctx);

  // Save every image / css / font the site loads.
  ctx.on("response", async (res) => {
    try {
      const url = res.url(); if (seen.has(url) || !url.startsWith("http")) return;
      const ct = (res.headers()["content-type"] || "").toLowerCase(); const ext = extOf(ct, url); if (!ext) return;
      seen.add(url);
      const buf = await res.body(); if (ext !== ".svg" && ext !== ".css" && buf.length < 300) return;
      const kind = ext === ".css" ? "css" : /woff|ttf|otf/.test(ext) ? "fonts" : "images";
      const name = `${slugify(path.basename(url.split("?")[0], ext)).slice(0, 40)}-${sha(url)}${ext}`;
      fs.writeFileSync(path.join(brandDir, "assets", kind, name), buf);
      manifest.assets[url] = `assets/${kind}/${name}`;
    } catch {}
  });

  let page = await ctx.newPage();
  ctx.on("page", async (p) => { page = p; await p.waitForLoadState("domcontentloaded").catch(() => {}); });
  const settle = async () => { try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {} await page.waitForTimeout(800); };
  const autoscroll = async () => { await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); }); await page.waitForTimeout(500); };

  let seq = 0;
  async function savePage(label, extra = {}) {
    const id = `${String(++seq).padStart(2, "0")}-${slugify(label)}`;
    await autoscroll();
    await page.screenshot({ path: path.join(brandDir, "screens", `${id}.full.png`), fullPage: true });
    await page.screenshot({ path: path.join(brandDir, "screens", `${id}.view.jpg`), type: "jpeg", quality: 70 });
    fs.writeFileSync(path.join(brandDir, "html", `${id}.html`), await page.content());
    const probe = await inPage(page, "PROBE");
    fs.writeFileSync(path.join(brandDir, "probes", `${id}.json`), JSON.stringify(probe, null, 2));
    // each meaningful block of the screen as its own sharp image (2x) — these are what videos should show
    // embedded previews (iframes: theme / store previews) cannot be copied as DOM — keep a sharp picture of each instead
    try {
      const frames = await page.locator("iframe").all();
      for (const [k, fr] of frames.slice(0, 12).entries()) {
        const bb = await fr.boundingBox().catch(() => null); if (!bb || bb.width < 120 || bb.height < 90) continue;
        const f = `assets/frames/${id}-f${k}.jpg`; fs.mkdirSync(path.join(brandDir, "assets/frames"), { recursive: true });
        await fr.screenshot({ path: path.join(brandDir, f), type: "jpeg", quality: 85, timeout: 5000 }).catch(() => null);
        if (fs.existsSync(path.join(brandDir, f))) await fr.evaluate((e, src) => e.setAttribute("data-shot", src), `{{B}}/${f}`).catch(() => {});
      }
    } catch {}
    const parts = [];
    const regions = await inPage(page, "REGIONS").catch(() => []);
    const objs = await inPage(page, "OBJECTS").catch(() => []);
    for (const r of regions) {
      const pid = `${id}-p${String(r.i).padStart(2, "0")}`, file = `parts/${pid}.png`;
      const object = objs.find((o) => o.part === r.i) || {};
      for (const im of object.images || []) im.file = manifest.assets[im.src] || null;
      try { await page.locator(`[data-part="${r.i}"]`).first().screenshot({ path: path.join(brandDir, file), scale: "device", timeout: 5000 }); } catch {}
      // the block itself as live UI (real DOM, real styles) — this is what videos embed
      const clone = await saveSnapshot({ snap: await inPage(page, "SNAPSHOT", { sel: `[data-part="${r.i}"]`, mode: "el", maxEls: 1500 }).catch(() => null), id: pid, brandDir, manifest, request: page.context().request, extra: { screen: id, kind: r.kind, heading: r.heading } }).catch(() => null);
      parts.push({ id: pid, file: fs.existsSync(path.join(brandDir, file)) ? file : null, ...r, object, clone: clone?.file || null });
    }
    // the whole screen as live UI, plus the state right before the click that led here (typed fields, the pressed button)
    const clones = {};
    const full = await saveSnapshot({ snap: await inPage(page, "SNAPSHOT", { mode: "page" }).catch(() => null), id, brandDir, manifest, request: page.context().request, extra: { label, kind: "screen" } }).catch(() => null);
    if (full) clones.screen = full;
    if (extra.before) { const b = await saveSnapshot({ snap: extra.before.snap, id: `${id}-before`, brandDir, manifest, request: page.context().request, extra: { label: `${label} — before`, kind: "before", action: extra.before.action, leads_to: id } }).catch(() => null); if (b) clones.before = { ...b, action: extra.before.action }; }
    // customer-facing pages (site, store, landing page) also as they look on a phone
    if (!extra.app || extra.customer || /preview|store|shop|landing|theme|product|\/p\//i.test(page.url())) {
      const vs = page.viewportSize();
      try { await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900); const m = await saveSnapshot({ snap: await inPage(page, "SNAPSHOT", { mode: "page", maxH: 3600 }), id: `${id}-mobile`, brandDir, manifest, request: page.context().request, extra: { label: `${label} — phone`, kind: "mobile" } }); if (m) clones.mobile = m; } catch {}
      await page.setViewportSize(vs); await page.waitForTimeout(400);
    }
    delete extra.before;
    await page.evaluate(() => document.querySelectorAll("[data-acted]").forEach((e) => e.removeAttribute("data-acted"))).catch(() => {});
    fs.writeFileSync(path.join(brandDir, "probes", `${id}.objects.json`), JSON.stringify(parts.map(({ id, kind, heading, object }) => ({ id, kind, heading, object })), null, 2));
    return { id, url: page.url(), title: probe.title, label, screen: `screens/${id}.full.png`, view: `screens/${id}.view.jpg`, html: `html/${id}.html`, probe: `probes/${id}.json`, parts, clones, ...extra };
  }

  // ---------- RESNAP: re-copy every saved screen with the logged-in session from last time (no agent, no cost) ----------
  const prevFile = path.join(brandDir, "capture.json"), authFile = path.join(brandDir, "auth.json");
  if (brief.resnap && fs.existsSync(prevFile) && fs.existsSync(authFile)) {
    const prev = JSON.parse(fs.readFileSync(prevFile, "utf8"));
    log(`▶ capture: resnap ${prev.pages.length} pages + ${prev.app.screens.length} app screens with the saved login (no agent)`);
    for (const old of [...prev.pages, ...prev.app.screens]) {
      try { await page.goto(old.url, { waitUntil: "domcontentloaded", timeout: 30000 }); await settle(); const s = await savePage(old.label, old.app ? { description: old.description, features: old.features, app: true } : {}); (old.app ? manifest.app.screens : manifest.pages).push(s); log(`  📸 ${old.label}`); } catch (e) { log(`  ! ${old.url}: ${e.message.split("\n")[0]}`); }
    }
    manifest.app.status = prev.app.status; manifest.app.notes = "resnap of " + prev.capturedAt; manifest.logoCandidates = prev.logoCandidates || [];
    if (manifest.app.screens.length && /login|signin|sign-in|تسجيل/i.test(manifest.app.screens[0].url)) log("  ! the saved login seems expired — run a full capture (Recapture) instead");
    fs.writeFileSync(path.join(brandDir, "clones", "fonts.css"), fontFaceCss(manifest, brandDir));
    fs.writeFileSync(prevFile, JSON.stringify(manifest, null, 2));
    await browser.close();
    log(`✓ capture: resnap done (${manifest.pages.length} pages, ${manifest.app.screens.length} app screens)`);
    return manifest;
  }

  const scope = makeScope(brief.url);

  // ---------- A) public crawl ----------
  log(`▶ capture: public pages of ${brief.url}`);
  await page.goto(brief.url, { waitUntil: "domcontentloaded", timeout: 45000 }); await settle();
  const home = await savePage("home"); manifest.pages.push(home);
  const homeProbe = JSON.parse(fs.readFileSync(path.join(brandDir, home.probe)));
  const origin = new URL(page.url()).hostname.replace(/^www\./, "");
  const candidates = [...new Map(homeProbe.links.filter((l) => { try { const u = new URL(l.href); return u.hostname.replace(/^www\./, "") === origin && !u.hash && u.pathname !== "/" && !/\.(pdf|zip|png|jpg)$/i.test(u.pathname); } catch { return false; } }).sort((a, b) => b.inNav - a.inNav).map((l) => [new URL(l.href).pathname, l])).values()].slice(0, MAX_PUBLIC_PAGES - 1);
  for (const l of candidates) {
    try { log(`  · ${l.href}`); await page.goto(l.href, { waitUntil: "domcontentloaded", timeout: 30000 }); await settle(); manifest.pages.push(await savePage(l.text || new URL(l.href).pathname)); } catch (e) { log(`  ! ${l.href}: ${e.message.split("\n")[0]}`); }
  }

  // logo files: inline svgs + logo <img> + icons
  const logoFiles = [];
  homeProbe.logos.forEach((lg, i) => { if (lg.svg) { const f = `assets/logo/logo-inline-${i}.svg`; fs.writeFileSync(path.join(brandDir, f), lg.svg.includes("xmlns") ? lg.svg : lg.svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')); logoFiles.push({ file: f, ...lg, svg: undefined }); } else if (lg.src && manifest.assets[lg.src]) logoFiles.push({ file: manifest.assets[lg.src], ...lg }); });
  for (const ic of homeProbe.icons) if (manifest.assets[ic]) logoFiles.push({ file: manifest.assets[ic], icon: true, src: ic });
  manifest.logoCandidates = logoFiles;

  // ---------- B) app agent ----------
  const appUrl = brief.appUrl || homeProbe.links.find((l) => /app\.|dashboard|signup|sign-up|register|login|ابدأ|سجل|تسجيل|انضم|start|get started/i.test(l.href + " " + l.text))?.href;
  if (brief.skipApp || !appUrl) { manifest.app.status = appUrl ? "skipped" : "no_app_link"; }
  else {
    scope.open(appUrl, "linked from the site");
    log(`▶ capture: agent enters the product (${appUrl})`);
    // what the public site promises (headings + feature copy) — the essentials plan must cover it
    const promises = manifest.pages.map((pg) => { try { const pr = JSON.parse(fs.readFileSync(path.join(brandDir, pg.probe), "utf8")); return `[${pg.label}] ${pr.headings.join(" · ")}\n${pr.text.replace(/\s*\n\s*/g, " · ").slice(0, 1800)}`; } catch { return ""; } }).filter(Boolean).join("\n\n").slice(0, 6000);
    try { await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 45000 }); await settle(); manifest.app = await runAgent({ getPage: () => page, setPage: (p) => { page = p; }, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises, scope }); }
    catch (e) { manifest.app = { status: "error", error: e.message.split("\n")[0], screens: [] }; }
  }
  try { await ctx.storageState({ path: path.join(brandDir, "auth.json") }); } catch {}
  fs.writeFileSync(path.join(brandDir, "clones", "fonts.css"), fontFaceCss(manifest, brandDir));
  fs.writeFileSync(path.join(brandDir, "capture.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  log(`✓ capture: ${manifest.pages.length} public pages, ${manifest.app.screens.length} app screens (${manifest.app.status}), ${Object.keys(manifest.assets).length} files`);
  return manifest;
}

const wellFormed = (x) => (typeof x === "string" ? (x.toWellFormed ? x.toWellFormed() : x.replace(/[\uD800-\uDFFF]/g, "")) : x);

async function runAgent({ getPage, setPage, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises = "", scope }) {
  const creds = brief.login?.email ? brief.login : null;
  const id = Date.now().toString(36);
  // sandbox settings remember the phone you gave once, so you are not asked again
  const settingsFile = path.join(brandDir, "..", "..", ".sandbox-settings.json");
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, "utf8")) : {};
  const saveSetting = (k, v) => { if (!v) return; settings[k] = v; fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2)); };
  if (brief.testPhone) saveSetting("phone", brief.testPhone);
  if (brief.testEmail) saveSetting("email", brief.testEmail);
  let inbox = null;
  const fixedEmail = brief.testEmail || process.env.TEST_EMAIL || settings.email;
  if (!creds && !fixedEmail) { inbox = await createInbox().catch((e) => { log(`  ! throwaway inbox unavailable (${e.message}) — email confirmations will need you`); return null; }); if (inbox) log(`  ✉ sign-up email: ${inbox.address} (read automatically)`); }
  const identity = creds || {
    full_name: "Video Test", first_name: "Video", last_name: "Test",
    email: inbox?.address || (fixedEmail || "video.test+{id}@gmail.com").replace("{id}", id),
    password: `Vt!${id}9aZ`, phone: brief.testPhone || process.env.TEST_PHONE || settings.phone || "", store_name: `Demo Store ${id}`, city: "Riyadh",
    company: `Demo Trading ${id}`, website: `https://demo-${id}.example.com`, address: "King Fahd Road, Al Olaya", district: "Al Olaya", postal_code: "12211", country: "Saudi Arabia",
    birth_date: "1992-04-15", gender: "male", job_title: "Owner", team_size: "1-10", monthly_orders: "100-500", industry: "Electronics & accessories",
    sample_product: { name: "Wireless Earbuds Pro", price: 149, compare_at_price: 199, cost: 60, quantity: 50, sku: `DEMO-${id}`, description: "Bluetooth 5.3 earbuds with noise cancellation and 30-hour battery." },
  };
  const stepsDir = path.join(brandDir, "agent"); fs.mkdirSync(stepsDir, { recursive: true });
  const system = `You are a capture agent for a video studio, operating a real browser on ${brief.url}.
GOAL: get inside the product (the logged-in app/dashboard), then save its main screens one by one with save_screen so designers can use them in a promo video.
${creds ? `LOG IN with email/phone "${creds.email}" and password "${creds.password}".` : `SIGN UP for a new account with this test identity — use exactly these values, nothing invented:\n${JSON.stringify(identity)}\nIf the site only offers login on the page you see, look for its sign-up / register / create account / "حساب جديد" / "تسجيل" / "انضم" link first.`}
HOW TO WORK
- Each turn you get a screenshot plus a numbered list of interactive elements with their labels, placeholders and current values. Make ONE tool call per turn.
- Match each value to the right field by its label/placeholder/type (phone → tel/phone field, never the password field). Check the "value=" of fields you already filled before typing again.
- Tick required terms checkboxes. Pick sensible options in required dropdowns (country Saudi Arabia / Egypt, any category).
- EMAIL confirmation (link or code sent to the test email): call check_email — the inbox is read for you. Do not ask the human for email codes.
- BE AUTONOMOUS — this is a test account, nothing you type is real:
  · Optional fields: leave them empty. Optional questions, surveys, "tell us about you", onboarding tours, tips, cookie banners, "complete your profile", upsells, rate-us popups: skip / later / X / Escape / close — never stop for them.
  · Required fields not in the test identity: INVENT a plausible test value yourself (names "Demo …", numbers like 149 / 50 / 10, dates in the future for campaigns and in the past for birth dates, any city, the first sensible dropdown option, any category). Never ask the human for these.
  · File uploads (logo, product image, banner): use the upload tool — a sample image is attached for you.
  · Identity / KYC / business-document / tax-ID / bank / card steps: never fill them. Skip them (skip / later / تخطي / لاحقاً / X), or leave and goto the app's dashboard URL directly. Only if the whole product is locked behind them, call finish "blocked".
  · If a step will not let you through, try in order: the visible error message → skip/later/X → Escape → scroll to a hidden button → goto the dashboard/home URL of the app → another section. Never loop on the same step more than 3 times.
- ask_code is ONLY for a one-time code sent by SMS to the test phone (or a phone number the sign-up insists on when the identity has none). Anything else you decide yourself.
- If there is a CAPTCHA you cannot pass, or the site demands payment/card details to continue, call finish with status "blocked".
- Never enter payment details, delete anything, submit real orders, or change account settings.
- If your last 3 actions did not change the page, try something different (another button, scroll, the visible error message).
- ESSENTIALS FIRST (right after you are inside, before the tour): call set_plan with the product's ESSENTIAL OUTPUTS — the real things this product produces for its user and their customers, the proof a viewer must see. Think "what does the customer end up with?": e.g. a store builder → the live storefront home, a product page, the generated landing page, the cart/checkout form, the theme applied; an ads tool → a generated ad / creative; a CRM → a filled pipeline and a contact card; a booking tool → the public booking page. Read WHAT THE SITE PROMISES below: the plan must include EVERY core output the site promises that can be produced in a test account (e.g. for a store builder: the landing page generated from a product link, the storefront, the product page, a theme applied, the order form, orders in the dashboard, the ads tool) — at least 6 items when the site promises that many. Then actually PRODUCE each one inside the test account (create the product, generate the page, apply the theme…) and OPEN IT THE WAY THE END CUSTOMER SEES IT (the public store link / "view store" / "preview" / the generated URL, even if it opens in a new tab or another domain — use tab and goto), scroll it, and save_screen it with customer_facing=true and covers=[the plan item]. Saving a settings page ABOUT the store is not the store. The tour only counts once the essentials are done.
- FLAGSHIP FLOW: when the site promises an AI / automatic way to create something ("from a link", "generate", "import", "with AI", "in one click"), produce that essential THROUGH that flow — not the manual alternative. Use the manual way only if the flagship flow is impossible in a test account, and say why in the save_screen description.
- After any generate / create / import / apply / save, call wait until the page has finished (no spinner, skeleton or "loading…"), then save the FINISHED result. An essential only counts when its screen shows the finished result; a screen still loading cannot be saved.
- Once inside, your job is a FEATURE TOUR for a promo video, not a list of pages. The app's main navigation is read for you and shown every turn as SECTIONS (✓ visited / ☐ not visited); a section counts as visited once you opened it and saved at least one screen there, or called skip_section because it is empty / locked. Visit every SECTION AND go one level deeper: tabs inside a page, "create / new / add / import / launch / generate" flows, editors, wizards, preview screens, settings sub-tabs (themes, pixels, shipping, domains…). Save each distinct screen that shows a feature in action.
- Empty screens make bad videos. If a section is empty and offers a create flow, create ONE demo item inside this test account (e.g. add a product${brief.sampleUrl ? ` from ${brief.sampleUrl}` : " from a product link the page suggests or a sample it offers"}, generate a page, open a wizard) and save the filled result. Do not publish ads, spend money, or connect external accounts.
- FILL IT WITH LIFE: empty dashboards and lists make dead videos. After the essentials, generate the ACTIVITY the product exists for, through the product's OWN flows inside this test account — e.g. a test order on a store (via its own storefront / checkout, cash-on-delivery or test mode), a booking on a booking tool, a lead on a CRM, a submission on a form builder, a message on a chat tool. Invented test data only, at most 2-3 items. Never a real payment, never publishing, never messaging real people. Then revisit the dashboard and the lists so they are saved WITH that data.
- APPEARANCE: settings that change how the customer-facing side looks (themes, branding, templates, appearance) are SECTIONS too: open one, apply a different option, then re-open the customer view and save it (customer_facing=true) to show the result.
- The video replays what you do: every click and the typed values are recorded with the screen before and after. So run flows for real (type a real value, press the real button, wait for the result) and save the RESULT screen right after it appears. Make sure to open and save what the merchant's customers see too: the store front / store preview, a generated landing or product page, the theme gallery and a theme applied, plus orders, dashboard stats, ad / TikTok tools.
- save_screen: short English label, one line on what it shows, and the features visible on it (name + what it does for the merchant).
- Call finish "done" only when every essential in your plan is saved AND every SECTION is visited (finish is refused until then).

WHAT THE SITE PROMISES (its public pages: headings + copy):
${promises || "(no public pages captured)"}`;
  const tools = [
    { name: "click", description: "Click element by its number", input_schema: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] } },
    { name: "type", description: "Clear the field, then type text; enter=true presses Enter after", input_schema: { type: "object", properties: { id: { type: "integer" }, text: { type: "string" }, enter: { type: "boolean" } }, required: ["id", "text"] } },
    { name: "select", description: "Choose an option in a <select> by its visible label", input_schema: { type: "object", properties: { id: { type: "integer" }, label: { type: "string" } }, required: ["id", "label"] } },
    { name: "set_plan", description: "Set (or update) the list of ESSENTIAL OUTPUTS to produce and save as the end customer sees them", input_schema: { type: "object", properties: { essentials: { type: "array", items: { type: "string" }, description: "e.g. 'storefront home with products', 'product page', 'AI landing page from a product link', 'theme applied on the store'" } }, required: ["essentials"] } },
    { name: "tab", description: "Switch to an open browser tab by its number (see Tabs)", input_schema: { type: "object", properties: { index: { type: "integer" } }, required: ["index"] } },
    { name: "goto", description: "Open a URL (the product's own site, or a link it gave you: store / preview / generated page)", input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
    { name: "upload", description: "Attach a sample image to a file input (logo / product photo / banner). id = the file input, or the upload button/area next to it", input_schema: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] } },
    { name: "key", description: "Press a key on the page (Escape closes popups, Enter submits, Tab moves on)", input_schema: { type: "object", properties: { key: { type: "string", enum: ["Escape", "Enter", "Tab"] } }, required: ["key"] } },
    { name: "scroll", description: "Scroll the page", input_schema: { type: "object", properties: { direction: { type: "string", enum: ["down", "up"] } }, required: ["direction"] } },
    { name: "back", description: "Browser back", input_schema: { type: "object", properties: {} } },
    { name: "ask_code", description: "ONLY for a one-time SMS code sent to the test phone, or a phone number the sign-up insists on when the identity has none. Never for anything else — invent test values or skip instead.", input_schema: { type: "object", properties: { sent_to: { type: "string", description: "what you need, e.g. 'code sent to +9665…' or 'a phone number for the sign-up form'" } }, required: ["sent_to"] } },
    { name: "check_email", description: "Read the newest email in the test inbox (waits up to 90 s). Returns subject, confirmation links and codes.", input_schema: { type: "object", properties: {} } },
    { name: "save_screen", description: "Save the current screen for the brand library", input_schema: { type: "object", properties: { label: { type: "string" }, description: { type: "string" }, features: { type: "array", items: { type: "string" }, description: "features visible here, e.g. 'AI product page generator — writes the landing page from a product link'" }, customer_facing: { type: "boolean", description: "true when this is what the end customer sees (store, product page, landing page, checkout, public link)" }, covers: { type: "array", items: { type: "string" }, description: "plan essentials this screen proves (exact names from set_plan)" } }, required: ["label", "description", "features"] } },
    { name: "wait", description: "Wait until the page finishes loading / generating (spinners, skeletons, \"loading…\" gone), up to the given seconds", input_schema: { type: "object", properties: { seconds: { type: "integer", minimum: 5, maximum: 90 } }, required: ["seconds"] } },
    { name: "skip_section", description: "Mark a SECTION as visited without a screen because it is empty, locked behind payment/verification, or not part of the product (only after you opened it)", input_schema: { type: "object", properties: { section: { type: "string", description: "the section name exactly as listed in SECTIONS" }, reason: { type: "string" } }, required: ["section", "reason"] } },
    { name: "finish", description: "Stop the agent", input_schema: { type: "object", properties: { status: { type: "string", enum: ["done", "blocked"] }, notes: { type: "string" } }, required: ["status", "notes"] } },
  ];
  const result = { status: "running", screens: [], notes: "", steps: 0, identity: creds ? { email: creds.email } : { ...identity, password: undefined } };
  // a sample image for upload steps: the brand's biggest downloaded photo, else a generated placeholder
  const sampleImage = () => {
    const dir = path.join(brandDir, "assets/images"); let best = null;
    try { for (const f of fs.readdirSync(dir)) { if (!/\.(jpe?g|png|webp)$/i.test(f)) continue; const st = fs.statSync(path.join(dir, f)); if (st.size > 15000 && st.size < 4e6 && (!best || st.size > best.size)) best = { f: path.join(dir, f), size: st.size }; } } catch {}
    if (best) return best.f;
    const f = path.join(brandDir, "sample-upload.png");
    if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAIAAAAxBA+LAAAKDElEQVR42u3bO3biShSGUVlLCaMg9hjM1EjM1JgDsSYBqQNCFljYelTVv3d0o9vd8qnz6dH98fV97QAgVe8SACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEACCEAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAAghAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAEIIAK8MLgEs53zczfW/OpxuricIITReu7/9KhoJQgitZe+fvyVpBCGElsv37u9ZF0EIof34TfzjiCIIIUTETxRBCEH/pv7ZFREhBP1zNRQRIQT9c30UESEE/UMREULQPxQRIQQJ5OGSyiFCCBLo8sohQgj652p3nSIihCCBLr4HRIQQJNAPQg4RQpBA5BAhBAlEDhFCkEDkkKr0LgEqiJ8angjBMsWjIUIIEogcIoQggcghUXwjRAXx88UTIViReDTEEyGoIH7ieCIECxGPhngiBBXEDCCEYANiEkjg1SgWHwWNhNekeCJEBTEbIITYdJgQWItXo1hwFDoqXpPiiRAVxMyAEGKjYXJACLHLMD+wEN8IscKoY5B8MsQTISqIiQIhxM7CXIEQYlthukAIsacwYyCE2FCYNBBC7CbMGwghthKmDoQQ+wizB0KITYQJBCHEDsIcghBi+2AaQQixdzCTIITYOJhM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", "base64"));
    return f;
  };
  let lastSig = "", same = 0;
  const history = [], trace = []; let asks = 0, lastPre = null, lastSave = 0, fillPass = false, waitedAt = "";
  const plan = []; // [{ name, done }]
  const track = (p, fromAllowed) => { let last = fromAllowed ? "about:blank" : "chrome-error://"; p.on("framenavigated", (f) => { if (f !== p.mainFrame()) return; const u = f.url(); if (scope.allows(last) && !scope.allows(u)) { scope.open(u, `opened by the site from ${last.slice(0, 80)}`); log(`  ↪ scope: the site opened ${new URL(u).origin}`); } last = u; }); };
  for (const p of ctx.pages()) track(p, true);
  ctx.on("page", async (p) => { const op = await p.opener().catch(() => null); track(p, !!op && scope.allows(op.url())); });
  const planText = () => plan.length ? plan.map((x) => `${x.done ? "✓" : "☐"} ${x.name}`).join("\n") : "(not set yet — call set_plan once you are inside)";
  // SECTIONS: the app's main navigation (read once you are inside) + tabs found on app screens
  const sections = []; // [{ name, key, href, tab, visited, note }]
  const opened = new Set(); // normalized URLs the agent has been on
  const norm = (u) => { try { const x = new URL(u); return (x.hostname + x.pathname).replace(/\/$/, "").toLowerCase(); } catch { return ""; } };
  const addNav = (nav) => { let n = 0; for (const l of [...(nav?.links || []), ...(nav?.looks || [])]) { const key = l.href ? norm(l.href) : "nav:" + l.text; if (key && !sections.some((x) => x.key === key || x.name === l.text)) { sections.push({ name: l.text, key, href: l.href, tab: false, visited: false }); n++; } } for (const t of nav?.tabs || []) { const key = "tab:" + t.text; if (!sections.some((x) => x.key === key)) { sections.push({ name: t.text, key, href: null, tab: true, visited: false }); n++; } } return n; };
  // a saved screen marks the section whose path matches its URL best (exact, else the longest parent path), plus the selected tab
  const markSaved = (url, nav, step) => { for (const x of sections) if (!x.href && x.clickedAt != null && step - x.clickedAt <= 6) x.visited = true; const k = norm(url); const hit = sections.filter((x) => !x.tab && (x.key === k || k.startsWith(x.key + "/"))).sort((a, b) => b.key.length - a.key.length)[0]; if (hit) hit.visited = true; for (const t of nav?.tabs || []) if (t.selected) { const s = sections.find((x) => x.key === "tab:" + t.text); if (s) s.visited = true; } };
  // a menu button (no href) learns its URL from the page it leads to when the agent clicks it
  const learnUrl = (label, url) => { const sec = sections.find((x) => !x.tab && !x.href && label.includes(x.name)); if (sec && norm(url)) { sec.href = url.split(/[?#]/)[0]; sec.key = norm(url); } };
  // a section button that opens a panel without changing the URL (settings sub-tabs) counts once a screen is saved right after clicking it
  const clicked = (label, step) => { for (const x of sections) if (!x.href && label.includes(x.name)) x.clickedAt = step; };
  const where = (x) => (x.tab ? " (tab)" : x.href ? ` (${x.href})` : " (menu button)");
  const sectionsText = () => sections.length ? sections.map((x) => `${x.visited ? "✓" : "☐"} ${x.name}${where(x)}${x.note ? ` — ${x.note}` : ""}`).join("\n") : "(read once you are inside — after set_plan)";
  // empty states on saved app screens: "no data" style texts, or stats that are all zero
  const EMPTY = /\bno (data|results?|records|items|orders|products|customers|bookings|leads|contacts|messages|campaigns|activity|entries|submissions)\b|nothing (here|yet|to show)|you (don't|do not) have any|get started by|لا توجد|لا يوجد|ليس لديك|لم تقم|فارغ|ابدأ بإضافة|لا .{1,20} بعد/i;
  const num = (v) => parseFloat(String(v).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[^\d.]/g, ""));
  const isEmpty = (s) => { try { const pr = JSON.parse(fs.readFileSync(path.join(brandDir, s.probe), "utf8")); const stats = s.parts.flatMap((p) => p.object?.stats || []).map((x) => num(x.value)).filter((v) => !Number.isNaN(v)); return EMPTY.test(pr.text || "") || (stats.length >= 2 && stats.every((v) => v === 0)); } catch { return false; } };
  const emptyCount = () => { const app = result.screens.filter((x) => !x.customer); const e = app.filter(isEmpty); return { empty: e.length, total: app.length, ids: e.map((x) => x.id) }; };
  const missing = () => [...plan.filter((x) => !x.done).map((x) => `essential: ${x.name}`), ...sections.filter((x) => !x.visited).map((x) => `section: ${x.name}${where(x)}`)];
  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    const page = getPage();
    result.steps = step + 1;
    const urlAtStart = page.url();
    const elements = wellFormed(await inPage(page, "MARK").catch(() => ""));
    const sig = page.url() + "|" + elements.length + "|" + elements.slice(0, 400);
    same = sig === lastSig ? same + 1 : 0; lastSig = sig;
    const stuck = same >= 3 ? `\n⚠ STUCK: the page has not changed for ${same + 1} turns. Do something different now: read the error, skip/later/X, key Escape, scroll, or goto the app's dashboard URL and continue with another section.` : "";
    const shot = await page.screenshot({ type: "jpeg", quality: 55 }).catch(() => null);
    if (shot) fs.writeFileSync(path.join(stepsDir, `${String(step + 1).padStart(2, "0")}.jpg`), shot);
    opened.add(norm(page.url()));
    // the app's navigation: read right after set_plan (inside the app), and again while it is still empty
    if (plan.length && !sections.some((x) => !x.tab)) { const n = addNav(await inPage(page, "NAV").catch(() => null)); if (n) log(`  🧭 sections: ${sections.map((x) => x.name).join(" | ")}`); }
    const tabs = ctx.pages().map((p, i) => `[${i}] ${p.url().slice(0, 100)}${p === page ? "  ← current" : ""}`).join("\n");
    const text = wellFormed(`Step ${step + 1}/${MAX_AGENT_STEPS}\nURL: ${page.url()}\nTitle: ${await page.title().catch(() => "")}\nTabs:\n${tabs}\nESSENTIALS PLAN:\n${planText()}\nSECTIONS:\n${sectionsText()}\nSaved so far: ${result.screens.map((s) => s.label).join(", ") || "none"}\nLast actions:\n${history.slice(-14).join("\n") || "(none)"}${stuck}\n\nElements:\n${elements}`);
    const content = shot ? [imageBlock(shot), { type: "text", text }] : [{ type: "text", text }];
    const res = await rawCall({ ledger, step: "capture-agent", model: models.agent, system, messages: [{ role: "user", content }], tools, effort: "low" });
    const call = res.content.find((c) => c.type === "tool_use");
    if (!call) { history.push("- (no action)"); continue; }
    const a = call.input; let out = "ok";
    const refusal = call.name === "goto" && !scope.allows(a.url) ? `Not allowed: ${a.url} is outside the company's website (${scope.domain}). Only the company's own site and pages it opens itself are allowed — continue on it.`
      : ["click", "type", "select", "upload", "key", "save_screen"].includes(call.name) && !scope.allows(page.url()) ? `Not allowed: this page (${page.url().slice(0, 80)}) is outside the company's website (${scope.domain}). Go back, or goto the company's site.` : null;
    if (refusal) { out = refusal; log(`  ⛔ ${refusal}`); }
    else try {
      const el = a.id != null ? page.locator(`[data-mgx="${a.id}"]`).first() : null;
      if (call.name === "click") {
        // remember the screen exactly as it was before this click (with the button marked) — videos replay it
        await el.evaluate((e) => e.setAttribute("data-acted", "click"), null, { timeout: 3000 }).catch(() => {});
        const snap = await inPage(page, "SNAPSHOT", { mode: "page" }).catch(() => null);
        if (snap) lastPre = { snap, step: step + 1, action: `click "${(elements.split("\n").find((l) => l.startsWith(`[${a.id}]`)) || "").replace(/^\[\d+\]\s*/, "").slice(0, 70)}"` };
        await el.click({ timeout: 6000 });
        await page.evaluate(() => document.querySelectorAll("[data-acted=click]").forEach((e) => e.removeAttribute("data-acted"))).catch(() => {});
      }
      else if (call.name === "type") { await el.fill("", { timeout: 6000 }).catch(() => {}); await el.pressSequentially(String(a.text), { delay: 20 }); await el.evaluate((e) => e.setAttribute("data-acted", "type")).catch(() => {}); if (a.enter) { const snap = await inPage(page, "SNAPSHOT", { mode: "page" }).catch(() => null); if (snap) lastPre = { snap, step: step + 1, action: `type "${String(a.text).slice(0, 40)}" + Enter` }; await el.press("Enter"); } }
      else if (call.name === "select") await el.selectOption({ label: a.label });
      else if (call.name === "goto") await page.goto(a.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      else if (call.name === "tab") { const p = ctx.pages()[a.index]; if (!p) out = "no such tab"; else { setPage(p); await p.bringToFront().catch(() => {}); out = `now on tab ${a.index}: ${p.url()}`; } }
      else if (call.name === "set_plan") { for (const n of a.essentials || []) if (!plan.some((x) => x.name === n)) plan.push({ name: n, done: false }); out = `plan set: ${plan.map((x) => x.name).join(" | ")} — now produce each one and open it as the customer sees it`; log(`  🎯 essentials: ${plan.map((x) => x.name).join(" · ")}`); }
      else if (call.name === "scroll") await page.mouse.wheel(0, a.direction === "up" ? -700 : 700);
      else if (call.name === "key") await page.keyboard.press(a.key);
      else if (call.name === "upload") {
        const file = sampleImage();
        const ok = await el.evaluate((e) => {
          const F = "input[type=file]", lab = e.closest("label");
          const f = (e.matches(F) ? e : null) || e.querySelector(F) || (lab?.htmlFor && document.getElementById(lab.htmlFor)?.matches(F) ? document.getElementById(lab.htmlFor) : null) || lab?.querySelector(F)
            || e.closest("[class*=drop i], [class*=upload i], form, section, [role=dialog], fieldset")?.querySelector(F) || e.closest("div")?.querySelector(F) || document.querySelector(F);
          if (f) f.setAttribute("data-mgx-file", "1"); return !!f;
        }).catch(() => false);
        if (ok) { await page.locator("[data-mgx-file='1']").first().setInputFiles(file); await page.evaluate(() => document.querySelectorAll("[data-mgx-file]").forEach((e) => e.removeAttribute("data-mgx-file"))); out = "sample image attached"; }
        else { const [fc] = await Promise.all([page.waitForEvent("filechooser", { timeout: 5000 }), el.click({ timeout: 5000 })]).catch(() => [null]); if (fc) { await fc.setFiles(file); out = "sample image attached"; } else out = "no file input found here — skip the upload if it is optional"; }
      }
      else if (call.name === "back") await page.goBack();
      else if (call.name === "check_email") {
        if (!inbox) out = "no inbox is connected to this sign-up email — call ask_code instead";
        else { log("  ✉ checking the inbox…"); const m = await inbox.waitForMail(90); if (m) for (const l of m.links) scope.open(l, "link in a confirmation email from the site"); out = m ? `email from ${m.from}: "${m.subject}". Links: ${m.links.join(" | ") || "none"}. Codes: ${m.codes.join(", ") || "none"}. Text: ${m.text}. → goto the confirmation link (or type the code).` : "no email arrived within 90 s — try the site's resend button once, then check_email again"; log(m ? `  ✉ got "${m.subject}"` : "  ✉ nothing yet"); }
      }
      else if (call.name === "ask_code" && !/sms|otp|code|كود|رمز|تحقق|verif|phone|mobile|جوال|هاتف|whatsapp|واتس/i.test(a.sent_to)) {
        out = "Not allowed: the human only provides SMS codes / a phone number. Invent a plausible test value for this, or skip the step (skip / later / X / goto the dashboard).";
      }
      else if (call.name === "ask_code" && /phone|mobile|جوال|هاتف/i.test(a.sent_to) && !/code|otp|رمز|كود/i.test(a.sent_to) && identity.phone) {
        out = `use the test phone: ${identity.phone}`;
      }
      else if (call.name === "ask_code") {
        asks++; if (asks > 3) { result.status = "blocked"; result.notes = "asked the human more than 3 times — stopping to avoid a loop"; log(`  ■ agent blocked: ${result.notes}`); break; }
        if (!brief.askCode) { result.status = "blocked"; result.notes = `needs a verification code sent to ${a.sent_to}, and no human is attached to this run`; log(`  ■ agent blocked: ${result.notes}`); break; }
        log(`  ⌨ waiting for the human: ${a.sent_to}`);
        const code = await brief.askCode(a.sent_to);
        if (!code) { result.status = "blocked"; result.notes = "no verification code was given"; break; }
        if (/phone|جوال|هاتف|mobile/i.test(a.sent_to) && /^[+\d][\d\s-]{6,}$/.test(code)) { saveSetting("phone", code); identity.phone = code; }
        if (/^https?:\/\//i.test(code)) { scope.open(code, "link given by the human"); await page.goto(code, { waitUntil: "domcontentloaded", timeout: 45000 }); await settle(); out = `the human gave a confirmation link; it is now open (${page.url()}). Continue (log in with the test identity if asked).`; }
        else out = `the human answered: "${code}". If that is a value (code, number), type it into the right field. If it is an instruction (e.g. skip / later / not now), follow it: press the page's skip / later / X / back button or go straight to the dashboard URL, and NEVER call ask_code for this step again.`;
        log(`  ↳ code received`);
      }
      else if (call.name === "save_screen" && (await inPage(page, "BUSY").catch(() => ({ busy: false }))).busy && waitedAt !== page.url()) { out = "the page is still loading / generating — call wait, then save the finished result"; }
      else if (call.name === "save_screen") { const loading = (await inPage(page, "BUSY").catch(() => ({ busy: false }))).busy; const before = lastPre && lastPre.step > lastSave && lastPre.step >= step - 5 ? lastPre : null; lastSave = step + 1; const s = await savePage(a.label, { description: a.description, features: a.features || [], app: true, before, customer: !!a.customer_facing, covers: a.covers || [] }); result.screens.push(s); if (plan.length) { const nav = await inPage(page, "NAV").catch(() => null); if (!a.customer_facing) addNav({ tabs: nav?.tabs, looks: nav?.looks }); markSaved(page.url(), nav, step + 1); } for (const c of loading ? [] : a.covers || []) { const it = plan.find((x) => x.name === c) || plan.find((x) => x.name.toLowerCase().includes(String(c).toLowerCase()) || String(c).toLowerCase().includes(x.name.toLowerCase())); if (it) it.done = true; } out = `saved ${s.id}${loading ? " (still loading — it does not count for the essentials)" : ""}${missing().length ? ` — still to do: ${missing().slice(0, 12).join(" | ")}` : ""}`; log(`  📸 ${a.customer_facing ? "[customer view] " : ""}${a.label} — ${a.description} (${s.parts.length} parts · live UI ${s.clones.screen ? "✓" : "✗"}${s.clones.before ? ` · replay: ${s.clones.before.action}` : ""})`); }
      else if (call.name === "wait") {
        const until = Date.now() + Math.max(5, Math.min(90, +a.seconds || 10)) * 1000; let b = { busy: true, why: "" };
        while (Date.now() < until) { b = await inPage(page, "BUSY").catch(() => ({ busy: false, why: "" })); if (!b.busy) break; await page.waitForTimeout(1500); }
        await settle(); waitedAt = page.url();
        out = b.busy ? `still loading after ${a.seconds}s (${b.why}) — wait again or continue` : "finished loading";
      }
      else if (call.name === "skip_section") {
        const sec = sections.find((x) => x.name === a.section) || sections.find((x) => x.name.toLowerCase().includes(String(a.section).toLowerCase()) || String(a.section).toLowerCase().includes(x.name.toLowerCase()));
        if (!sec) out = `no such section — use a name from SECTIONS`;
        else if (!sec.tab && (!sec.href || ![...opened].some((k) => k === sec.key || k.startsWith(sec.key + "/")))) out = `open it first (${sec.href ? `goto ${sec.href}` : "click it in the menu"}), then skip it only if it really is empty / locked`;
        else { sec.visited = true; sec.note = String(a.reason).slice(0, 80); out = `section "${sec.name}" marked visited (${sec.note})`; log(`  ⤼ section skipped: ${sec.name} — ${sec.note}`); }
      }
      else if (call.name === "finish" && a.status === "done" && (plan.length === 0 || missing().length) && step < MAX_AGENT_STEPS - 12) { out = plan.length ? `not yet — still missing: ${missing().join(" | ")}. Produce each missing essential and open it as the customer sees it; open each missing section and save a screen there (or skip_section if it is empty / locked).` : "not yet — call set_plan with the product's essential outputs and produce them first"; log(`  ↩ finish refused: ${plan.length ? `${missing().length} missing` : "no plan"}`); }
      else if (call.name === "finish" && a.status === "done" && !fillPass && step < MAX_AGENT_STEPS - 12 && (() => { const c = emptyCount(); return c.total && c.empty > c.total / 2; })()) {
        fillPass = true; const c = emptyCount();
        out = `not yet — ${c.empty} of ${c.total} saved app screens are EMPTY (${c.ids.join(", ")}). FILL IT WITH LIFE: create 2-3 test items of the product's core activity through its own flows (invented data, no real payments / publishing / messages), then revisit those screens and save them again with data. Then finish.`;
        log(`  ↩ finish refused: ${c.empty}/${c.total} app screens empty — one fill pass`);
      }
      else if (call.name === "finish") { result.status = a.status; result.notes = a.notes; log(`  ■ agent ${a.status}: ${a.notes}`); break; }
      if (!["save_screen", "finish", "ask_code"].includes(call.name)) log(`  ↳ ${call.name} ${JSON.stringify({ ...a, text: a.text && /pass/i.test(elements.split("\n").find((l) => l.startsWith(`[${a.id}]`)) || "") ? "••••" : a.text }).slice(0, 90)}`);
      await settle();
    } catch (e) { out = `error: ${e.message.split("\n")[0].slice(0, 120)}`; }
    const lbl = a.id != null ? (elements.split("\n").find((l) => l.startsWith(`[${a.id}]`)) || "").slice(0, 90) : "";
    if (call.name === "click" && lbl && getPage().url() !== urlAtStart) learnUrl(lbl, getPage().url());
    if (call.name === "click" && lbl) clicked(lbl, step + 1);
    history.push(`- ${call.name} ${JSON.stringify(a).slice(0, 80)} on ${lbl} → ${out}`);
    trace.push({ step: step + 1, url: page.url(), action: call.name, input: a, target: lbl, result: out });
    fs.writeFileSync(path.join(stepsDir, "trace.json"), JSON.stringify(trace, null, 2));
  }
  if (result.status === "running") result.status = "step_limit";
  result.plan = plan;
  result.scope = { domain: scope.domain, opened: scope.opened };
  result.sections = sections.map(({ name, href, tab, visited, note }) => ({ name, href, tab, visited, note: note || null }));
  result.empty = emptyCount();
  log(`  ■ empty states: ${result.empty.empty}/${result.empty.total} app screens${result.empty.ids.length ? ` (${result.empty.ids.join(", ")})` : ""}`);
  log(`  ■ coverage: essentials ${plan.filter((x) => x.done).length}/${plan.length} · sections ${sections.filter((x) => x.visited).length}/${sections.length} · screens ${result.screens.length} · steps ${result.steps}/${MAX_AGENT_STEPS}`);
  return result;
}
