// Score a finished MP4 (e.g. the Phase 3B reference) with the same taste / concept-legibility judge the
// pipeline uses, on frames at the contact-sheet times.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/taste-ref.ts <frames-dir> "<concept>" ["<metaphor>"]
import { readdirSync } from "node:fs";
import path from "node:path";
import { costOf, withRun, type RunContext } from "../../lib/ai/usage";
import type { Plan } from "../../lib/motion/plan";
import { tasteQa } from "../../lib/motion/taste";
import { admin, workspaceFor } from "./jobs";

(async () => {
  void admin;
  const [dir, concept, metaphor] = process.argv.slice(2);
  const stills = readdirSync(dir)
    .filter((f) => /^t[\d.]+\.jpe?g$/.test(f))
    .map((f) => ({ t: Number(f.slice(1).replace(/\.jpe?g$/, "")), path: path.join(dir, f) }))
    .sort((a, b) => a.t - b.t);
  const ws = await workspaceFor("taste-ref");
  const plan = { concept, motion_language: "—", metaphor: metaphor ? { object: metaphor, stands_for: "", transformation: "" } : undefined } as unknown as Plan;
  const ctx: RunContext = { usage: [], capUsd: 0.02 };
  const t = await withRun(ctx, () => tasteQa(ws, "SLLLR", plan, stills));
  console.log(JSON.stringify({ taste: t, cost: costOf(ctx.usage).usd }, null, 1));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
