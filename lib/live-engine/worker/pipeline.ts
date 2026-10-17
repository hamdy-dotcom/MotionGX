// The sandbox's runPipeline (pipeline.mjs), split into the two job kinds the 45-minute sandbox cap needs:
//   capture job: capture → profile          (once per company; result saved to storage before any video job)
//   video job:   script → build → music → qa → render
// Every step uploads its outputs and reports step_done; a restarted job downloads them and skips finished steps.
// Step logic, models, effort and order are the sandbox's; only "Edit lines" / "Request a change" are new
// (approved decision Q10) and reuse the sandbox steps.
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { JobFile, Step } from "../protocol";
import { Ledger, MODELS } from "./claude";
import { capture } from "./steps/capture";
import { buildProfile } from "./steps/profile";
import { writeScript } from "./steps/script";
import { buildVideo, embedClones } from "./steps/build";
import { makeMusic } from "./steps/music";
import { render } from "./steps/render";
import { safetyNet } from "./steps/qa";
import type { Sync } from "./sync";

export const DEFAULT_MODELS = { agent: "sonnet", profile: "sonnet", script: "sonnet", build: "sonnet", qa: "haiku", repair: "haiku", repair2: "sonnet" };

export async function runJob(job: JobFile, dirs: { root: string; brandDir: string; runDir: string }, sync: Sync) {
  const { brandDir, runDir } = dirs;
  const log = sync.log;
  const done = new Set<Step>(job.doneSteps);
  const brief: any = { ...job.brief, askCode: sync.askCode, testPhone: job.settings?.phone, testEmail: job.settings?.email };
  const models = Object.fromEntries(Object.entries({ ...DEFAULT_MODELS, ...(job.models || {}) }).map(([k, v]) => [k, MODELS[v] || v]));
  fs.writeFileSync(path.join(runDir, "brief.json"), JSON.stringify({ ...job.brief, models, mode: job.mode, edit: job.edit ?? null }, null, 2));
  const ledger = new Ledger(path.join(runDir, "cost.json"), log, (row) => sync.ledgerRow(row));
  const t0 = Date.now();
  const step = async <T>(name: Step, fn: () => Promise<T>, info?: (r: T) => Record<string, unknown>): Promise<T | undefined> => {
    if (done.has(name)) {
      log(`↺ ${name}: already done in an earlier attempt — skipped`);
      return undefined;
    }
    await sync.stage(name);
    const r = await fn();
    await sync.stepDone(name, info?.(r));
    done.add(name);
    return r;
  };
  log(`■ job ${job.jobId} (${job.kind}${job.mode ? ` · ${job.mode}` : ""})\n  brand ${job.slug} · ${brief.objective} · ${brief.country} · ${brief.layout} · ${brief.length}s\n  models ${JSON.stringify(models)}${done.size ? `\n  resuming after: ${[...done].join(", ")}` : ""}`);

  if (job.kind === "capture") {
    // 3 — capture (once per company)
    const cap: any =
      (await step("capture", async () => {
        const c = await capture({ brief, brandDir, ledger, models, log });
        await sync.uploadBrand();
        return c;
      }, (c: any) => ({ pages: c.pages.length, app_screens: c.app.screens.length, app_status: c.app.status, steps: c.app.steps ?? null, identity_email: c.app.identity?.email ?? null, scope: c.app.scope ?? null, manifest: c }))) ?? JSON.parse(fs.readFileSync(path.join(brandDir, "capture.json"), "utf8"));
    // 4 — brand profile (once per company)
    await step("profile", async () => {
      const brand = await buildProfile({ brief, brandDir, capture: cap, ledger, models, log });
      // the chosen logo also as a plain file: "Add company" shows it before anything is unpacked
      await sync.uploadBrand(["library"], ["brand.json"]);
      // shown on "Add company" / the company page: the brand-files panel and the brand card's homepage hero — nothing else
      await sync.uploadDisplay(brand, cap);
      return brand;
    }, (b: any) => ({ profile: b }));
    return finish();
  }

  // ── video job ──
  const brand = JSON.parse(fs.readFileSync(path.join(brandDir, "brand.json"), "utf8"));
  const scriptFile = path.join(runDir, "script.json");
  // 5 — script (new / direction: one model call; edit lines: the saved script with the edited lines; request a change: the saved script)
  const script: any =
    (await step("script", async () => {
      if (job.mode === "lines") {
        const s = JSON.parse(fs.readFileSync(scriptFile, "utf8"));
        for (const l of job.edit?.lines ?? []) {
          const sc = s.scenes[l.scene];
          if (!sc) continue;
          sc.headline = l.headline;
          if (l.sub !== undefined) sc.sub = l.sub;
        }
        fs.writeFileSync(scriptFile, JSON.stringify(s, null, 2));
        log(`✓ script: ${job.edit?.lines?.length ?? 0} edited lines written into the saved script`);
        await sync.uploadRun(["script.json", "assets.json"]);
        return s;
      }
      if (job.mode === "edit") {
        log("↺ script: reusing the saved script (request a change)");
        await sync.uploadRun(["script.json", "assets.json"]);
        return JSON.parse(fs.readFileSync(scriptFile, "utf8"));
      }
      const s = await writeScript({ brief, brand, runDir, ledger, models, log });
      await sync.uploadRun(["script.json", "assets.json"]);
      return s;
    }, (s: any) => ({ scenes: s.scenes.length }))) ?? JSON.parse(fs.readFileSync(scriptFile, "utf8"));

  const htmlFile = path.join(runDir, "video.html");
  // "Request a change" (Q10): the composed path hands the client's text to the director as an instruction;
  // the freeform path (brief.composer = "freeform") gets it as a fix for the model-written composition
  const request = job.mode === "edit" && job.edit?.request ? job.edit.request : undefined;
  const fixIssues = request && brief.composer === "freeform" ? [{ msg: `The client asks for this change: ${request}` }] : undefined;
  await step("build", async () => {
    const f = await buildVideo({ brief, brand, script, runDir, brandDir, ledger, models, log, fixIssues, request });
    await sync.uploadRun(["video.src.html"]);
    return f;
  });
  // a resumed job has video.src.html but not video.html: paste the live UI in again
  if (!fs.existsSync(htmlFile) && fs.existsSync(path.join(runDir, "video.src.html"))) embedClones({ runDir, brandDir, layout: brief.layout });

  const musicFile = path.join(runDir, "music.wav");
  await step("music", async () => {
    if (job.mode === "edit" && fs.existsSync(musicFile)) {
      log("↺ music: reusing the saved bed (request a change)");
      return { file: musicFile, drops: [] as number[] };
    }
    const m = makeMusic({ script, file: musicFile });
    log(`✓ music: 120 BPM, drops at ${m.drops.join(", ")}s`);
    await sync.uploadRun(["music.wav"]);
    return m;
  });

  const qa: any = await step("qa", async () => {
    const r = await safetyNet({ htmlFile, brief, brand, script, runDir, brandDir, ledger, models, log, rebuild: (issues: any) => buildVideo({ brief, brand, script, runDir, brandDir, ledger, models, log, fixIssues: issues, request }) });
    await sync.uploadRun(["video.src.html", "qa.json", ...fs.readdirSync(runDir).filter((f) => /^qa-.*\.jpg$/.test(f))]);
    return r;
  }, (r: any) => ({ shipped: r.shipped, errors: r.errors }));
  const qaReport = qa ?? (fs.existsSync(path.join(runDir, "qa.json")) ? JSON.parse(fs.readFileSync(path.join(runDir, "qa.json"), "utf8")) : null);

  // 6 — render (skipped, as in the sandbox, when the composition broke the contract)
  if (qaReport?.issues?.some((x: any) => x.code === "contract")) throw new Error("the composition never called K.done(tl, duration) — nothing to render");
  await step("render", async () => {
    const out = path.join(runDir, "video.mp4");
    // frames render in parallel browsers: use the machine (the sandbox's default is 3)
    const workers = Math.max(3, Math.min(8, os.cpus().length - 2));
    await render({ htmlFile, layout: brief.layout, duration: script.length, musicFile, outFile: out, log, workers });
    // music toggle off (decision Q11): export strips the audio track from this file (no second upload)
    await sync.uploadRun(["video.mp4", "cost.json"]);
    return out;
  }, () => ({ bytes: fs.statSync(path.join(runDir, "video.mp4")).size }));
  return finish();

  function finish() {
    const by = ledger.byStep();
    const brandCost = (by["capture-agent"] || 0) + (by.profile || 0);
    const videoCost = Object.entries(by).filter(([k]) => !["capture-agent", "profile"].includes(k)).reduce((a, [, v]) => a + v, 0);
    const qaFile = path.join(runDir, "qa.json");
    const qaSum = fs.existsSync(qaFile) ? (({ shipped, errors, history }: any) => ({ shipped, errors, history }))(JSON.parse(fs.readFileSync(qaFile, "utf8"))) : null;
    const summary = { jobId: job.jobId, kind: job.kind, qa: qaSum, brand: job.slug, seconds: Math.round((Date.now() - t0) / 1000), cost: { total: ledger.total(), brand_one_time: +brandCost.toFixed(4), per_video: +videoCost.toFixed(4), byStep: by } };
    fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
    log(`■ done in ${summary.seconds}s · brand (one-time) $${summary.cost.brand_one_time} · this video $${summary.cost.per_video} · total $${summary.cost.total}`);
    return summary;
  }
}
