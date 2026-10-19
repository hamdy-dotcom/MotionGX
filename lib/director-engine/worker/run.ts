// VIDEO_ENGINE=director: one video job = one director agent run (the /brag method, see method.ts) on the company's
// capture. Input: the capture (brand.json, screens, parts, clones, clips, library) + the video brief. Output, uploaded
// as a normal live version so the studio works unchanged: video.mp4, script.json (scenes for the studio), music.wav
// (MotionGX's own bed), qa.json (the check), video.src.html (the composition), cost.json — plus brag-plan.md,
// share-copy.txt, poster.jpg and director.tgz (the work dir + transcript, so an edit resumes the same agent).
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { JobFile, Step } from "../../live-engine/protocol";
import { Ledger } from "../../live-engine/worker/claude";
import type { Sync } from "../../live-engine/worker/sync";
import { LEAN, METHOD } from "./method";
import { Director, fontFamilies } from "./agent";
import { gridImage, prepare, SIZES } from "./renderer";

// the video steps the studio's progress follows (protocol.ts VIDEO_STEPS — repeated here: protocol.ts loads as CommonJS
// in the worker, so only its types may be imported)
const VIDEO_STEPS: Step[] = ["script", "build", "music", "qa", "render"];
const DIALECT: [RegExp, string][] = [[/^EG$/, "Egyptian Arabic (masri, natural and warm, not formal)"], [/^SA$/, "Saudi Arabic (natural Saudi dialect)"], [/^AE$/, "Gulf Arabic (khaleeji)"], [/^JO$/, "Levantine Arabic (shami)"], [/^US$/, "English"], [/فصحى|Modern Standard/i, "Modern Standard Arabic (فصحى)"]];
const OBJECTIVE: Record<string, string> = { acquire: "get sign-ups / sales", launch: "announce a launch", offer: "push an offer", awareness: "make the brand known", recruit: "hire", announce: "announce an occasion" };

export async function runDirector(job: JobFile, dirs: { root: string; brandDir: string; runDir: string }, sync: Sync) {
  const { root, brandDir, runDir } = dirs, log = sync.log, t0 = Date.now();
  const workDir = path.join(runDir, "director");
  // an edit: the previous version's work dir (plan, composition, transcript) comes as run/director.tgz
  const pack = path.join(runDir, "director.tgz");
  if (fs.existsSync(pack)) { execFileSync("tar", ["-xzf", pack, "-C", runDir]); fs.rmSync(pack); }
  fs.mkdirSync(path.join(workDir, "composition"), { recursive: true });

  const brief = job.brief, layout = brief.layout in SIZES ? brief.layout : "9:16", [W, H] = SIZES[layout], length = brief.length;
  const model = job.director?.model || "claude-opus-5-5", maxUsd = job.director?.maxUsd ?? 6, lean = job.director?.lean !== false;
  const ledger = new Ledger(path.join(runDir, "cost.json"), log, (row) => sync.ledgerRow(row));
  const language = DIALECT.find(([re]) => re.test(brief.country))?.[1] ?? `the language of ${brief.country}`;
  const brand = JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8"));
  const cap = fs.existsSync(path.join(brandDir, "capture.json")) ? JSON.parse(fs.readFileSync(path.join(brandDir, "capture.json"), "utf8")) : {};
  // the test identity and remembered test data: blurred wherever they show in the real UI
  const identity = [cap.app?.identity?.email, cap.app?.identity?.name, cap.app?.identity?.phone, job.settings?.phone, job.settings?.email].filter(Boolean).map(String);
  log(`■ job ${job.jobId} (video · director${job.mode ? ` · ${job.mode}` : ""})\n  brand ${job.slug} · ${brief.objective} · ${language} · ${layout} ${W}×${H} · ${length}s\n  model ${model} · cost cap $${maxUsd} (DIRECTOR_MAX_USD) · ${lean ? "lean mode (DIRECTOR_LEAN=0 turns it off)" : "lean mode off"}`);
  fs.writeFileSync(path.join(runDir, "brief.json"), JSON.stringify({ ...brief, engine: "director", model, maxUsd, mode: job.mode, edit: job.edit ?? null }, null, 2));

  // the composition's lib/ (gsap, kit), sfx/ and capture/ links are there before the agent starts
  prepare({ compDir: path.join(workDir, "composition"), brandDir, root, layout, identity });
  let stageNow = "";
  const stage = async (s: "script" | "build" | "music" | "qa" | "render") => { if (s !== stageNow) { stageNow = s; await sync.stage(s); } };
  await stage("script");

  const agent = new Director({ brandDir, workDir, runDir, root, layout, length, identity, ledger, model, maxUsd, log, stage, lean }, lean ? METHOD + LEAN : METHOD);
  const resumed = (job.mode === "lines" || job.mode === "edit") && agent.resume();
  if (resumed) {
    // "Edit lines": the studio's edited lines go into the saved script now; the agent updates the composition to match
    let ask = "";
    if (job.mode === "lines") {
      const sf = path.join(runDir, "script.json"), s = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, "utf8")) : null;
      const changes = (job.edit?.lines ?? []).filter((l) => s?.scenes?.[l.scene] && (s.scenes[l.scene].headline !== l.headline || (l.sub !== undefined && s.scenes[l.scene].sub !== l.sub)));
      for (const l of changes) { s.scenes[l.scene].headline = l.headline; if (l.sub !== undefined) s.scenes[l.scene].sub = l.sub; }
      if (s) fs.writeFileSync(sf, JSON.stringify(s, null, 2));
      ask = `The client edited the on-screen lines in the studio (the script is already updated):\n${changes.map((l) => `- scene ${l.scene + 1}: headline «${l.headline}»${l.sub !== undefined ? ` · sub «${l.sub}»` : ""}`).join("\n") || "- (no line changed)"}\nUpdate composition/video.src.html so these scenes show exactly these lines (keep everything else: the look, the timing, the material), update brag-plan.md, then snapshot, check, render_video and finish.`;
    } else ask = `The client asks for this change:\n«${job.edit?.request ?? ""}»\nApply it to the video you made (brag-plan.md, the composition, and set_storyboard again if the scenes change). Keep everything the client didn't ask to change. Then snapshot, check, render_video and finish.`;
    agent.addUser([{ type: "text", text: `NEW REQUEST (an edit of this video — same brief, same capture, your work dir is as you left it).\n${ask}` }]);
    log(`↺ director: resuming the agent of the previous version (${agent.messages.length} messages) for ${job.mode === "lines" ? "edited lines" : "a change request"}`);
  } else {
    if (job.mode === "lines" || job.mode === "edit") log("! director: the previous version has no saved agent run — starting a new one with the edit as direction");
    const text = firstMessage({ brand, cap, brandDir, brief, language, layout, W, H, length, lean, edit: job.mode === "edit" ? job.edit?.request : undefined });
    // lean mode: every captured screen in ONE labeled image, so browsing starts from a look, not a file-by-file crawl
    const sheet = lean ? await contactSheet(brand, brandDir).catch((e) => { log(`  ! contact sheet failed (${e instanceof Error ? e.message : e})`); return null; }) : null;
    agent.addUser(sheet ? [{ type: "text", text }, { type: "text", text: `CONTACT SHEET — every captured screen, labeled with its id (screenshots in capture/screens/<id>.jpg; clones by the same ids):` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: sheet.toString("base64") } }] : [{ type: "text", text }]);
  }

  try {
    const out = await agent.run();
    log(`✓ director: delivered — ${out.angle.slice(0, 160)}`);
  } finally {
    // whatever happened, the cost so far is on record
    log(`  $ director total: $${ledger.total().toFixed(4)} of cap $${maxUsd} · ${ledger.rows.length} model calls · ${ledger.rows.reduce((a, r) => a + r.in + r.cacheRead + r.cacheWrite, 0)} prompt tokens · ${ledger.rows.reduce((a, r) => a + r.out, 0)} output tokens`);
  }

  // deliverables next to the run (the studio reads script.json / video.mp4 / video.src.html / music.wav / qa.json)
  const comp = path.join(workDir, "composition");
  fs.copyFileSync(path.join(comp, "video.src.html"), path.join(runDir, "video.src.html"));
  for (const f of ["brag-plan.md", "share-copy.txt", "poster.jpg"]) if (fs.existsSync(path.join(workDir, f))) fs.copyFileSync(path.join(workDir, f), path.join(runDir, f));
  // the work dir for a later edit — without the links into the capture / SFX, the rendered stills and the clip frames
  execFileSync("tar", ["-czf", pack, "-C", runDir, "--exclude", "director/composition/capture", "--exclude", "director/composition/sfx", "--exclude", "director/composition/clipframes", "--exclude", "director/frames", "director"]);
  await sync.uploadRun(["video.mp4", "video.src.html", "script.json", "music.wav", "qa.json", "cost.json", "brag-plan.md", "share-copy.txt", "poster.jpg", "director.tgz", "brief.json"]);
  for (const s of VIDEO_STEPS) if (!job.doneSteps.includes(s)) await sync.stepDone(s, s === "render" ? { bytes: fs.statSync(path.join(runDir, "video.mp4")).size } : undefined);

  const qa = fs.existsSync(path.join(runDir, "qa.json")) ? JSON.parse(fs.readFileSync(path.join(runDir, "qa.json"), "utf8")) : null;
  const summary = {
    jobId: job.jobId, kind: job.kind, engine: "director", model, brand: job.slug, seconds: Math.round((Date.now() - t0) / 1000),
    qa: qa ? { shipped: "director", errors: qa.errors, history: qa.history } : null,
    cost: { total: ledger.total(), brand_one_time: 0, per_video: +ledger.total().toFixed(4), cap: maxUsd, byStep: ledger.byStep(), calls: ledger.rows.length },
    share_copy: agent.done?.share_copy ?? null, angle: agent.done?.angle ?? null, fingerprint: null,
  };
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  log(`■ done in ${summary.seconds}s · director · this video $${summary.cost.per_video} (cap $${maxUsd})`);
  return summary;
}

/** the brief + what the capture holds, so the agent starts from the inventory instead of crawling */
/** one line per clone: size, blocks, keys by role — enough to choose a screen without opening it */
function cloneSummary(brandDir: string, id?: string) {
  if (!id) return null;
  const f = path.join(brandDir, "clones", `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(f, "utf8")), keys = (c.keys || []) as any[], roles: Record<string, number> = {};
    for (const k of keys) if (k.part == null) roles[k.role] = (roles[k.role] || 0) + 1;
    return `${c.w}×${c.h} · ${keys.filter((k) => k.part != null).length} blocks · ${Object.entries(roles).map(([r, n]) => `${n} ${r}`).join(", ")}`;
  } catch { return null; }
}

/** every captured screen (its viewport screenshot) in one labeled grid */
async function contactSheet(brand: any, brandDir: string) {
  const tiles = (brand.screens || []).map((s: any) => ({ file: s.view || s.file, label: `${s.id}${s.customer ? " · customer" : s.app ? "" : " · site"}${s.empty ? " · EMPTY" : ""}` }))
    .filter((t: any) => t.file && fs.existsSync(path.join(brandDir, t.file))).slice(0, 24)
    .map((t: any) => ({ jpg: fs.readFileSync(path.join(brandDir, t.file)), label: t.label }));
  return tiles.length ? gridImage(tiles, { cols: 4, tileW: 270, aspect: 0.625 }) : null;
}

function firstMessage(o: { brand: any; cap: any; brandDir: string; lean?: boolean; brief: JobFile["brief"]; language: string; layout: string; W: number; H: number; length: number; edit?: string }) {
  const { brand } = o;
  const sum = (cid?: string) => cloneSummary(o.brandDir, cid);
  const screens = (brand.screens || []).map((s: any) => ({ id: s.id, label: s.label, shows: s.shows, app: !!s.app, customer: !!s.customer, empty: !!s.empty, features: s.features, screenshot: s.view || s.file, clones: Object.fromEntries(Object.entries(s.clones || {}).filter(([k]) => k !== "clip").map(([k, v]: any) => [k, v?.id])), flow: s.clones?.before ? { before: s.clones.before.id, action: s.clones.before.action, typed: s.clones.before.typed ?? null } : null, clip: s.clones?.clip ? { file: s.clones.clip.file, seconds: s.clones.clip.dur } : null, clone_summary: Object.fromEntries(Object.entries(s.clones || {}).filter(([k]) => k !== "clip").map(([k, v]: any) => [k, sum(v?.id)])) }));
  const inventory = {
    ...(o.lean && fs.existsSync(path.join(o.brandDir, "clones", "fonts.css")) ? { brand_fonts: { stylesheet: "capture/clones/fonts.css", families: fontFamilies(path.join(o.brandDir, "clones", "fonts.css")) } } : {}),
    brand: { name: brand.name, name_ar: brand.name_ar, tagline: brand.tagline, summary: brand.summary, audience: brand.audience, voice: brand.voice, selling_points: brand.selling_points, look: brand.look, palette: brand.palette, fonts: brand.fonts, logo: brand.logo, site: brand.site },
    features: (brand.features || []).map((f: any) => ({ name: f.name, detail: f.detail, benefit: f.benefit, evidence: f.evidence })),
    screens,
    parts: (brand.parts || []).slice(0, 60).map((p: any) => ({ id: p.id, shows: p.shows, feature: p.feature, file: p.file, clone: !!p.clone })),
    images: (brand.images || []).filter((i: any) => !i.demo).map((i: any) => ({ file: i.file, kind: i.kind, note: i.note })),
    test_data_images: (brand.images || []).filter((i: any) => i.demo).map((i: any) => i.file),
  };
  return [
    `BRIEF`,
    `- Product: ${brand.name || o.brief.url} (${o.brief.url})`,
    `- Goal: ${OBJECTIVE[o.brief.objective] ?? o.brief.objective}`,
    `- What the client wants (their own words): ${o.brief.description || "(none)"}`,
    o.brief.offer ? `- Offer / CTA: ${o.brief.offer}` : "",
    `- Language: all on-screen copy and the share copy in ${o.language}`,
    `- Format: ${o.layout} — ${o.W}×${o.H} px, 30fps · Duration: exactly ${o.length} s (window.__duration = ${o.length})`,
    `- Tone: infer it (preset + creative direction) from the brief and the product`,
    o.edit ? `- Direction from the client: «${o.edit}»` : "",
    ``,
    `CAPTURE INVENTORY (root "capture"; in the composition the same files are under capture/…; clones are used with data-clone ids; test_data_images are the capture agent's test data — product-demo content, never brand photos)`,
    JSON.stringify(inventory),
    ``,
    `Use inspect_clone to look inside a clone (not read_file on its JSON). WORK DIR (root "work"): write brag-plan.md and composition/video.src.html there (then fix it with edit_file). composition/lib/gsap.min.js and lib/kit.js, composition/sfx/ (CC0 effects + sfx/sfx-analysis.md) and composition/capture/ are ready.`,
    `Start with Inspect.`,
  ].filter((l) => l !== "").join("\n");
}
