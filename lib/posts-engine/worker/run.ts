// A post job (kind "post"): write → AI images → design per canvas → render + check (one repair round) → upload.
// Outputs in the run folder: post.json (the content the app shows), design.json (the slides' HTML, for edits),
// slides/<canvas>-<n>.png, ai/slide-<n>.jpg, cost.json. A relaunched job starts over (posts take ~1–2 minutes).
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import type { JobFile } from "../../live-engine/protocol";
import { Ledger } from "../../live-engine/worker/claude";
import type { Sync } from "../../live-engine/worker/sync";
import { CANVAS, PLATFORM, canvasesFor } from "./platforms";
import { writePost, type Written } from "./write";
import { makeImages } from "./images";
import { designCanvas, repairCanvas, screenInfo, type Design } from "./design";
import { buildSlidePage, canvasKey, SlideRenderer } from "./render";

export async function runPosts(job: JobFile, dirs: { root: string; brandDir: string; runDir: string }, sync: Sync) {
  const { brandDir, runDir } = dirs, log = sync.log, t0 = Date.now();
  const post = job.post;
  if (!post) throw new Error("post job without its post");
  const brand = JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8"));
  const cap = fs.existsSync(path.join(brandDir, "capture.json")) ? JSON.parse(fs.readFileSync(path.join(brandDir, "capture.json"), "utf8")) : {};
  const identity = [cap.app?.identity?.email, cap.app?.identity?.name, cap.app?.identity?.phone, job.settings?.phone, job.settings?.email].filter(Boolean).map(String);
  const ledger = new Ledger(path.join(runDir, "cost.json"), log, (row) => sync.ledgerRow(row));
  const read = (f: string) => (fs.existsSync(path.join(runDir, f)) ? JSON.parse(fs.readFileSync(path.join(runDir, f), "utf8")) : null);
  // "Request a change": the version it changes (its content, design and AI images came as run/prev/…)
  const prev = post.request ? (read("prev/post.json") as (Written & Record<string, any>) | null) : null;
  const prevDesign = post.request ? (read("prev/design.json") as Design | null) : null;
  log(`■ post ${post.postId} (${post.type} · ${post.platforms.join(", ")}${post.request ? " · change" : ""}) · ${post.model} · cap $${post.maxUsd}`);
  const cap$ = () => { if (ledger.total() >= post.maxUsd) throw new Error(`cost cap reached ($${ledger.total().toFixed(2)} of $${post.maxUsd})`); };

  // 1 — write
  await sync.stage("write");
  const written = await writePost({ post, brand, ledger, prev, log });
  await sync.stepDone("write");

  const canvases = post.type === "text" ? [] : canvasesFor(post.platforms);
  const design: Design = {};
  const renders: Record<string, string[]> = {};
  const remaining: Record<string, string[][]> = {};
  if (canvases.length) {
    // 2 — AI images
    await sync.stage("images");
    cap$();
    await makeImages({ post, slides: written.slides, canvases, brand, runDir, ledger, prev: prev?.slides ?? null, log });
    await sync.stepDone("images");

    // 3 — design, one call per canvas (the first sets the look)
    await sync.stage("design");
    const screens = screenInfo(brand, brandDir, written.slides);
    for (const [i, canvas] of canvases.entries()) {
      cap$();
      design[canvas] = await designCanvas({ post, brand, canvas, slides: written.slides, screens, ledger, reference: i > 0 ? { canvas: canvases[0], design: design[canvases[0]]! } : null, prev: prevDesign?.[canvas] ?? null, log });
    }
    await sync.stepDone("design");

    // 4 — render + check, one repair round per canvas that has findings
    await sync.stage("slides");
    const renderer = new SlideRenderer();
    const rtl = /rtl|arab/i.test(String(brand.language ?? "")) || post.dialect !== "en";
    try {
      for (const canvas of canvases) {
        const draw = async () => {
          const pngs: string[] = [], issues: string[][] = [];
          for (const [n, d] of design[canvas]!.entries()) {
            const key = `${canvasKey(canvas)}-${n + 1}`;
            const html = buildSlidePage({ dir: path.join(runDir, "pages", key), canvas, design: d, screens, brandDir, runDir, rtl, identity });
            const png = path.join(runDir, "slides", `${key}.png`);
            issues.push(await renderer.render(html, canvas, png));
            pngs.push(png);
          }
          return { pngs, issues };
        };
        let r = await draw();
        if (r.issues.some((l) => l.length) && ledger.total() < post.maxUsd) {
          log(`  check ${canvas}: ${r.issues.map((l, i) => (l.length ? `slide ${i + 1}: ${l.join(" | ")}` : "")).filter(Boolean).join(" · ")}`);
          design[canvas] = await repairCanvas({ post, canvas, design: design[canvas]!, issues: r.issues, pngs: r.pngs, ledger, log });
          r = await draw();
        }
        renders[canvas] = r.pngs.map((p) => path.relative(runDir, p));
        remaining[canvas] = r.issues;
        log(`✓ slides ${canvas}: ${r.pngs.length} × ${CANVAS[canvas].join("×")}${r.issues.some((l) => l.length) ? ` · left: ${r.issues.flat().length} finding(s)` : " · check passed"}`);
      }
    } finally {
      await renderer.close();
    }
    await sync.stepDone("slides");
  }

  // the content the app shows: each platform's text + the slides of its canvas
  const content = {
    angle: written.angle,
    alt_text: written.alt_text,
    type: post.type,
    platforms: Object.fromEntries(post.platforms.map((p) => [p, { ...(written.platforms[p] ?? { text: "", hashtags: [] }), canvas: post.type === "text" ? null : PLATFORM[p].canvas }])),
    slides: written.slides,
    renders,
    check: remaining,
  };
  fs.writeFileSync(path.join(runDir, "post.json"), JSON.stringify(content, null, 2));
  fs.writeFileSync(path.join(runDir, "design.json"), JSON.stringify(design, null, 2));
  const files = ["post.json", "design.json", "cost.json", ...Object.values(renders).flat(), ...written.slides.map((s) => s.ai_file).filter((f): f is string => Boolean(f))];
  await sync.uploadRun([...new Set(files)]);
  const seconds = Math.round((Date.now() - t0) / 1000);
  log(`■ done in ${seconds}s · this post $${ledger.total().toFixed(4)} (cap $${post.maxUsd})`);
  return { jobId: job.jobId, kind: "post", seconds, cost: { total: ledger.total(), byStep: ledger.byStep() }, post: content };
}
