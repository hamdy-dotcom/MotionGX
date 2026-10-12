// Phase 3C/3D acceptance run: companies through the spec pipeline.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/generate-3c.ts [slug,slug] [--no-export] [--out out/3d]
// Per video: concept, behaviors, tokens per call (+ cache hits), AI cost, time to preview; then 6
// contact-sheet stills, a chunked export with the stem music, and hit measurement.
// Outputs: out/<slug>.mp4, out/3c/<slug>/…, out/3c/report.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { costOf, entryCost } from "../../lib/ai/usage";
import { behaviorsUsed, generateVideo } from "../../lib/motion/generate";
import { measureHits } from "../../lib/motion/music";
import { runSpecJob } from "../../lib/motion/spec-runner";
import { DbStore } from "../../lib/motion/store";
import { verifyMp4 } from "../../lib/motion/verify-mp4";
import { admin, brandFor, briefFor, CAP, JOBS, workspaceFor } from "./jobs";

(async () => {
  const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : null;
  const doExport = !process.argv.includes("--no-export");
  const oi = process.argv.indexOf("--out");
  const root = path.resolve(oi > 0 ? process.argv[oi + 1] : "out/3c");
  mkdirSync(root, { recursive: true });
  const reportFile = path.join(root, "report.json");
  const report: Record<string, unknown> = existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : {};
  const store = new DbStore(admin);

  for (const job of JOBS) {
    if (only && !only.includes(job.slug)) continue;
    const ws = await workspaceFor(job.slug);
    const dir = path.join(root, job.slug);
    mkdirSync(dir, { recursive: true });
    console.log(`\n=== ${job.slug} (${job.url}) · ${job.format} ${job.lengthS}s ${job.dialect} ===`);
    const { draft, ogImage } = await brandFor(job, ws);
    const brief = await briefFor(job, ws, draft, ogImage);
    console.log(`  brand: ${draft.name} · ${draft.colors.map((c) => c.hex).join(" ")} · ${draft.fonts.arabic}/${draft.fonts.latin} · logo ${Boolean(draft.logoUrl)}`);

    let g;
    try {
      g = await generateVideo(brief, store, dir, { capUsd: CAP, printCost: true });
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : err}`);
      report[job.slug] = { error: String(err) };
      writeFileSync(reportFile, JSON.stringify(report, null, 1));
      continue;
    }
    writeFileSync(path.join(dir, "spec.json"), JSON.stringify(g.spec, null, 1));
    writeFileSync(path.join(dir, "plan.json"), JSON.stringify(g.plan, null, 1));
    const behaviors = behaviorsUsed(g.spec);
    console.log(`  concept: "${g.plan.motion_language}" — ${g.plan.concept}`);
    console.log(`  summary: ${g.plan.summary_en} (nearest previous ${g.similarity.toFixed(2)}, concept redos ${g.conceptRedos})`);
    console.log(`  spec: ${g.spec.elements.length} elements, ${behaviors.length} behaviors: ${behaviors.join(", ")}`);
    console.log(`  rounds: ${g.specRun.rounds.map((r) => `${r.stage}${r.model ? `(${r.model.replace("claude-", "")})` : ""}→${r.issues} issues${r.autoFixed ? `, ${r.autoFixed} auto-fixed` : ""} ${(r.ms / 1000).toFixed(1)}s`).join(" | ")}`);
    if (g.specRun.issues.length) console.log(`  REMAINING ISSUES: ${g.specRun.issues.map((i) => `[${i.code}] ${i.id}: ${i.msg}`).join(" ; ")}`);
    console.log(`  slideshow risk ${g.slideshow.score}/100 (${g.slideshow.log.map((x) => `${x.stage} ${x.score}`).join(" → ")}) · ${g.slideshow.factors.filter((f) => f.points).map((f) => `${f.key} ${f.points}`).join(", ") || "no factors"}`);
    console.log(`  ▶ preview ready in ${(g.toPreviewMs / 1000).toFixed(1)}s · AI $${g.costUsd.toFixed(4)} · status ${g.status} · timings ${JSON.stringify(Object.fromEntries(Object.entries(g.timings).map(([k, v]) => [k, Number((v / 1000).toFixed(1))])))}`);

    const bg = await g.background;
    console.log(`  taste: ${bg.taste ? `${bg.taste.score}/10 looks_good=${bg.taste.looks_good} brand_clear=${bg.taste.brand_clear} concept_legible=${bg.taste.concept_legible} — seen: "${bg.taste.idea_seen}" — ${bg.taste.note}` : "skipped"} (+$${bg.costUsd.toFixed(4)})`);

    // contact sheet stills (6) + export
    const sheetTimes = [0.1, 0.27, 0.44, 0.61, 0.78, 0.93].map((f) => Number((f * job.lengthS).toFixed(2)));
    const props = { spec: g.spec, input: g.input, audio: { music: null, sfx: null, voiceover: null }, custom: g.custom };
    const sheet = await runSpecJob({ task: "stills", props, times: sheetTimes, outDir: path.join(dir, "sheet"), scale: 0.5 });
    let exportInfo: Record<string, unknown> = {};
    let hits: Awaited<ReturnType<typeof measureHits>> = [];
    if (doExport && g.status === "ready") {
      const t0 = Date.now();
      const out = root.endsWith(`${path.sep}3c`) ? path.resolve(`out/${job.slug}.mp4`) : path.join(root, `${job.slug}.mp4`);
      const r = await runSpecJob({ task: "render", props, output: out, audioFile: g.audio.mix });
      exportInfo = r.ok ? { file: out, seconds: Number(((Date.now() - t0) / 1000).toFixed(1)), timings: r.timings } : { error: r.errors };
      if (r.ok) {
        const v = await verifyMp4(out, { duration: job.lengthS, fps: 30, width: brief.width, height: brief.height, audio: true });
        exportInfo.verification = { ok: v.ok, problems: v.problems, warnings: v.warnings, stats: v.stats };
        console.log(`  verification: ${v.ok ? "PASS" : `FAIL ${v.problems.join("; ")}`}${v.warnings.length ? ` (warnings: ${v.warnings.join("; ")})` : ""}`);
      }
      console.log(r.ok ? `  export → ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s ${JSON.stringify(r.timings)}` : `  export FAILED ${r.errors.join("; ")}`);
      hits = await measureHits(g.audio.mixWav, g.plan.energy, dir);
    }
    const calls = [...g.usage, ...bg.usage].map((u) => ({ kind: u.kind, model: u.model.replace("claude-", ""), in: u.input_tokens, cached: u.cache_read ?? 0, cache_write: u.cache_write ?? 0, out: u.output_tokens, usd: Number(entryCost(u).toFixed(5)), s: u.ms ? Number((u.ms / 1000).toFixed(1)) : null }));
    report[job.slug] = {
      brand: draft.name,
      format: job.format,
      length_s: job.lengthS,
      dialect: job.dialect,
      status: g.status,
      title: g.plan.title,
      concept: g.plan.concept,
      summary_en: g.plan.summary_en,
      motion_language: g.plan.motion_language,
      similarity_to_nearest_previous: Number(g.similarity.toFixed(3)),
      concept_redos: g.conceptRedos,
      refs: g.refs.map((r) => ({ id: r.id, creator: r.creator, label: r.label })),
      elements: g.spec.elements.length,
      behaviors,
      slideshow: g.slideshow,
      validation: { remaining: g.specRun.issues, rounds: g.specRun.rounds, model: g.specRun.model },
      calls,
      cost_usd: Number(g.costUsd.toFixed(5)),
      cost_with_taste_usd: Number((g.costUsd + bg.costUsd).toFixed(5)),
      cost_by_step: costOf(g.usage).byKind,
      to_preview_s: Number((g.toPreviewMs / 1000).toFixed(1)),
      timings_s: Object.fromEntries(Object.entries(g.timings).map(([k, v]) => [k, Number((v / 1000).toFixed(2))])),
      taste: bg.taste,
      audio: { lufs: g.audio.lufs, peak_dbfs: g.audio.truePeak, music_ms: g.audio.ms, events: g.events.length },
      energy_map: g.plan.energy,
      measured_hits: hits,
      sheet: sheet.ok ? sheet.stills : sheet.errors,
      export: exportInfo,
    };
    writeFileSync(reportFile, JSON.stringify(report, null, 1));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
