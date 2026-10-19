"""Ports video-sandbox/steps/*.mjs → lib/live-engine/worker/steps/*.ts with an explicit, counted list of
edits per file (imports, in-page calls, capture scope). Everything else stays byte-for-byte.
  python3 scripts/live-engine/port-sandbox.py ../video-sandbox
"""
import re, sys, pathlib

SB = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "../video-sandbox")
OUT = pathlib.Path("lib/live-engine/worker/steps")

def edit(src, old, new, count=1, regex=False):
    n = len(re.findall(old, src)) if regex else src.count(old)
    assert n == count, f"expected {count}× {old[:70]!r}, found {n}"
    return re.sub(old, new, src) if regex else src.replace(old, new)

def cut(src, start, end_marker):
    i = src.index(start); j = src.index(end_marker, i) + len(end_marker)
    return src[:i] + src[j:]

HEAD = "/* eslint-disable */\n// @ts-nocheck — verbatim port of video-sandbox/{f}; the only edits are listed in scripts/live-engine/port-sandbox.py.\n"

def port(name, edits):
    src = (SB / "steps" / f"{name}.mjs").read_text()
    for e in edits: src = e(src)
    (OUT / f"{name}.ts").write_text(HEAD.format(f=f"steps/{name}.mjs") + src)
    print("ported", name)

# ── capture ──────────────────────────────────────────────────────────────────────────────────────────
port("capture", [
  lambda s: edit(s, 'import { rawCall, imageBlock } from "../lib/claude.mjs";', 'import { rawCall, imageBlock } from "../claude";'),
  lambda s: edit(s, 'from "./clips.mjs";', 'from "./clips";'),
  lambda s: edit(s, 'import { createInbox } from "../lib/inbox.mjs";', 'import { createInbox } from "../inbox";'),
  lambda s: edit(s, 'import { SNAPSHOT, saveSnapshot, fontFaceCss } from "../lib/snapshot.mjs";',
                 'import { saveSnapshot, fontFaceCss } from "../snapshot";\nimport { installInPage, call as inPage } from "../inpage";\nimport { makeScope } from "../scope";'),
  # in-page functions now live in inpage.js (verbatim) — drop their definitions (PROBE … OBJECTS) here
  lambda s: s[:s.index("// In-page probe: computed colours")] + s[s.index("export async function capture"):],
  lambda s: edit(s, "await page.evaluate(PROBE)", 'await inPage(page, "PROBE")'),
  lambda s: edit(s, "page.evaluate(MARK)", 'inPage(page, "MARK")'),
  lambda s: edit(s, "page.evaluate(REGIONS)", 'inPage(page, "REGIONS")'),
  lambda s: edit(s, "page.evaluate(OBJECTS)", 'inPage(page, "OBJECTS")'),
  lambda s: edit(s, "page.evaluate(NAV)", 'inPage(page, "NAV")', count=2),
  lambda s: edit(s, "page.evaluate(BUSY)", 'inPage(page, "BUSY")', count=3),
  lambda s: edit(s, "pg.evaluate(HUMAN)", 'inPage(pg, "HUMAN")'),
  lambda s: edit(s, "getPage().evaluate(REFUSED)", 'inPage(getPage(), "REFUSED")'),
  lambda s: edit(s, "page.evaluate(NAVBTNS)", 'inPage(page, "NAVBTNS")', count=2),
  lambda s: edit(s, "page.evaluate(CONSENT)", 'inPage(page, "CONSENT")', count=2),
  lambda s: edit(s, "page.evaluate(SETTLE)", 'inPage(page, "SETTLE")'),
  lambda s: edit(s, "page.evaluate(SNAPSHOT, ", 'inPage(page, "SNAPSHOT", ', count=5),
  # install the in-page functions into every page of the context
  lambda s: edit(s, '  // Save every image / css / font the site loads.', '  await installInPage(ctx);\n\n  // Save every image / css / font the site loads.'),
  # capture scope (decision Q12)
  lambda s: edit(s, '  // ---------- A) public crawl ----------', '  const scope = makeScope(brief.url);\n\n  // ---------- A) public crawl ----------'),
  lambda s: edit(s, '    log(`▶ capture: agent enters the product (${appUrl})`);',
                    '    scope.open(appUrl, "linked from the site");\n    log(`▶ capture: agent enters the product (${appUrl})`);'),
  lambda s: edit(s, "manifest.app = await runAgent({ getPage: () => page, setPage: (p) => { page = p; }, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises, rec });",
                    "manifest.app = await runAgent({ getPage: () => page, setPage: (p) => { page = p; }, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises, rec, scope });"),
  lambda s: edit(s, "async function runAgent({ getPage, setPage, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises = \"\", rec = null }) {",
                    "async function runAgent({ getPage, setPage, ctx, brief, brandDir, ledger, models, log, savePage, settle, promises = \"\", rec = null, scope }) {"),
  # pages the site itself navigates to (a click, a redirect, a tab it opens) join the scope
  lambda s: edit(s, '  const plan = []; // [{ name, done }]',
                    '  const plan = []; // [{ name, done }]\n'
                    '  const track = (p, fromAllowed) => { let last = fromAllowed ? "about:blank" : "chrome-error://"; p.on("framenavigated", (f) => { if (f !== p.mainFrame()) return; const u = f.url(); if (scope.allows(last) && !scope.allows(u)) { scope.open(u, `opened by the site from ${last.slice(0, 80)}`); log(`  ↪ scope: the site opened ${new URL(u).origin}`); } last = u; }); };\n'
                    '  for (const p of ctx.pages()) track(p, true);\n'
                    '  ctx.on("page", async (p) => { const op = await p.opener().catch(() => null); track(p, !!op && scope.allows(op.url())); });'),
  lambda s: edit(s, "    try {\n      const el = a.id != null ? page.locator(`[data-mgx=\"${a.id}\"]`).first() : null;",
                    "    const refusal = call.name === \"goto\" && !scope.allows(a.url) ? `Not allowed: ${a.url} is outside the company's website (${scope.domain}). Only the company's own site and pages it opens itself are allowed — continue on it.`\n"
                    "      : [\"click\", \"type\", \"select\", \"upload\", \"key\", \"save_screen\"].includes(call.name) && !scope.allows(page.url()) ? `Not allowed: this page (${page.url().slice(0, 80)}) is outside the company's website (${scope.domain}). Go back, or goto the company's site.` : null;\n"
                    "    if (refusal) { out = refusal; log(`  ⛔ ${refusal}`); }\n"
                    "    else try {\n      const el = a.id != null ? page.locator(`[data-mgx=\"${a.id}\"]`).first() : null;"),
  lambda s: edit(s, "const m = await inbox.waitForMail(90);", "const m = await inbox.waitForMail(90); if (m) for (const l of m.links) scope.open(l, \"link in a confirmation email from the site\");"),
  lambda s: edit(s, "        if (/^https?:\\/\\//i.test(code)) { await page.goto(code,", "        if (/^https?:\\/\\//i.test(code)) { scope.open(code, \"link given by the human\"); await page.goto(code,"),
  lambda s: edit(s, "  result.plan = plan;\n", "  result.plan = plan;\n  result.scope = { domain: scope.domain, opened: scope.opened };\n"),
])

# ── profile, script, build ───────────────────────────────────────────────────────────────────────────
port("profile", [lambda s: edit(s, 'from "../lib/claude.mjs";', 'from "../claude";'), lambda s: edit(s, 'from "./capture.mjs";', 'from "./capture";')])
port("clips", [])
port("script", [lambda s: edit(s, 'from "../lib/claude.mjs";', 'from "../claude";'), lambda s: edit(s, 'from "./compose.mjs";', 'from "./compose";')])
port("build", [lambda s: edit(s, 'from "../lib/claude.mjs";', 'from "../claude";'), lambda s: edit(s, 'from "./script.mjs";', 'from "./script";'), lambda s: edit(s, 'from "./compose.mjs";', 'from "./compose";'), lambda s: edit(s, 'from "./artdirect.mjs";', 'from "./artdirect";')])
port("compose", [lambda s: edit(s, 'from "./script.mjs";', 'from "./script";'), lambda s: edit(s, 'from "./clips.mjs";', 'from "./clips";')])
port("artdirect", [lambda s: edit(s, 'from "../lib/claude.mjs";', 'from "../claude";'), lambda s: edit(s, 'from "./compose.mjs";', 'from "./compose";')])

# ── qa ───────────────────────────────────────────────────────────────────────────────────────────────
port("qa", [
  lambda s: edit(s, 'from "../lib/claude.mjs";', 'from "../claude";'),
  lambda s: edit(s, 'from "./script.mjs";', 'from "./script";'),
  lambda s: edit(s, 'import { embedClones } from "./build.mjs";', 'import { embedClones } from "./build";\nimport { installInPage, call as inPage } from "../inpage";'),
  lambda s: s[:s.index("// Runs inside the page: every visible text element at the current frame.")] + s[s.index("export async function inspect"):],
  lambda s: edit(s, "  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: W, height: H } });",
                    "  const browser = await chromium.launch(); const qctx = await browser.newContext({ viewport: { width: W, height: H } }); await installInPage(qctx); const page = await qctx.newPage();"),
  lambda s: edit(s, "await page.evaluate(PROBE)", 'await inPage(page, "QA_PROBE")'),
  lambda s: edit(s, "await page.evaluate(CAMS)", 'await inPage(page, "QA_CAMS")'),
])

# ── music, render ────────────────────────────────────────────────────────────────────────────────────
port("music", [])
port("render", [lambda s: edit(s, 'from "./script.mjs";', 'from "./script";')])
