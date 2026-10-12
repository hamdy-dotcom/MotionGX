// Phase 3E A/B: Sonnet vs Haiku as the spec writer. For each brand × run, ONE director plan is made and
// reused by both arms, so only the spec writer differs. Per arm: taste, concept legibility, slideshow
// risk, cost (incl. the shared plan) and time to preview (incl. the plan's time).
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/ab-spec.ts [runs=2]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { costOf, withRun, type RunContext } from "../../lib/ai/usage";
import { generateVideo } from "../../lib/motion/generate";
import { makePlan } from "../../lib/motion/plan";
import { DbStore } from "../../lib/motion/store";
import { admin, brandFor, briefFor, JOBS, workspaceFor } from "./jobs";

type Row = { brand: string; run: number; arm: string; taste: number | null; legible: boolean | null; ideaSeen: string; risk: number; costUsd: number; previewS: number; status: string };

(async () => {
  const runs = Number(process.argv[2] ?? 2);
  const store = new DbStore(admin);
  const rows: Row[] = [];
  const root = path.resolve("out/3e/ab");
  mkdirSync(root, { recursive: true });
  for (const slug of ["slllr", "instabug"]) {
    const job = JOBS.find((j) => j.slug === slug)!;
    const ws = await workspaceFor(`${slug}-ab`);
    const { draft, ogImage } = await brandFor(job, ws);
    const brief = await briefFor(job, ws, draft, ogImage);
    for (let run = 1; run <= runs; run++) {
      const planCtx: RunContext = { usage: [], capUsd: 0.05, printCost: true };
      const t0 = Date.now();
      const planned = await withRun(planCtx, () => makePlan(brief, store));
      const planMs = Date.now() - t0;
      const planUsd = costOf(planCtx.usage).usd;
      console.log(`\n=== ${slug} run ${run}: "${planned.plan.motion_language}" — metaphor: ${planned.plan.metaphor?.object ?? "-"} (plan $${planUsd.toFixed(4)}, ${(planMs / 1000).toFixed(1)}s)`);
      for (const arm of ["haiku", "sonnet"] as const) {
        process.env.MOTIONGX_SPEC_MODEL = arm;
        const dir = path.join(root, `${slug}-${run}-${arm}`);
        mkdirSync(dir, { recursive: true });
        try {
          const g = await generateVideo(brief, store, dir, { capUsd: 0.1, printCost: false, planned: { result: planned, ms: planMs } });
          const bg = await g.background;
          writeFileSync(path.join(dir, "spec.json"), JSON.stringify(g.spec));
          const row: Row = { brand: slug, run, arm, taste: bg.taste?.score ?? null, legible: bg.taste?.concept_legible ?? null, ideaSeen: bg.taste?.idea_seen ?? "", risk: g.slideshow.score, costUsd: Number((g.costUsd + planUsd).toFixed(4)), previewS: Number((g.toPreviewMs / 1000).toFixed(1)), status: g.status };
          rows.push(row);
          console.log(`  ${arm.padEnd(6)} taste ${row.taste} legible ${row.legible} risk ${row.risk} $${row.costUsd} ${row.previewS}s ${row.status} — seen: ${row.ideaSeen}`);
        } catch (err) {
          console.log(`  ${arm} FAILED ${err instanceof Error ? err.message : err}`);
          rows.push({ brand: slug, run, arm, taste: null, legible: null, ideaSeen: "", risk: -1, costUsd: -1, previewS: -1, status: "failed" });
        }
        writeFileSync(path.join(root, "ab.json"), JSON.stringify(rows, null, 1));
      }
    }
  }
  delete process.env.MOTIONGX_SPEC_MODEL;
  console.log(`\n| brand | run | arm | taste | concept reads | slideshow risk | cost | preview |\n|---|---|---|---|---|---|---|---|`);
  for (const r of rows) console.log(`| ${r.brand} | ${r.run} | ${r.arm} | ${r.taste ?? "–"} | ${r.legible === null ? "–" : r.legible ? "yes" : "no"} | ${r.risk} | $${r.costUsd} | ${r.previewS}s |`);
  for (const arm of ["haiku", "sonnet"]) {
    const rs = rows.filter((r) => r.arm === arm && r.taste !== null);
    const avg = (f: (r: Row) => number) => rs.reduce((s, r) => s + f(r), 0) / Math.max(1, rs.length);
    console.log(`${arm}: taste ${avg((r) => r.taste!).toFixed(2)} · legible ${rs.filter((r) => r.legible).length}/${rs.length} · risk ${avg((r) => r.risk).toFixed(1)} · $${avg((r) => r.costUsd).toFixed(4)} · ${avg((r) => r.previewS).toFixed(1)}s`);
  }
})();
