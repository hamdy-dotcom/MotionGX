// Smoke test: validate the sample composition through the isolated worker.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { sampleProps } from "../../remotion/fixtures/sample";

const job = {
  task: "validate",
  source: readFileSync("remotion/fixtures/sample-source.tsx", "utf8"),
  input: sampleProps.input,
  stills: [{ t: 1, label: "intro" }, { t: 3.27, label: "hit: drop" }, { t: 5, label: "mid" }, { t: 8.2, label: "hit: logo" }],
  outDir: "out/smoke",
};
writeFileSync("out/smoke-job.json", JSON.stringify(job));
const t0 = Date.now();
execFileSync("npx", ["tsx", "--tsconfig", "tsconfig.scripts.json", "scripts/motion/worker.ts", "out/smoke-job.json", "out/smoke-result.json"], { stdio: "inherit" });
const res = JSON.parse(readFileSync("out/smoke-result.json", "utf8"));
console.log(JSON.stringify({ ok: res.ok, errors: res.errors, stills: res.stills?.map((s: { t: number; path: string }) => `${s.t.toFixed(2)} ${s.path}`), staticSpans: res.staticSpans, timings: res.timings }, null, 1), `${Date.now() - t0}ms`);
