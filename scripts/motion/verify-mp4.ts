// Post-encode verification for exported MP4s. Expectations (format, length) come from a generation
// report (default out/3c/report.json, keyed by the file's basename), else 9:16 / 30 s.
//   npx tsx --tsconfig tsconfig.scripts.json scripts/motion/verify-mp4.ts [--report out/3d/report.json] out/*.mp4
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { verifyMp4 } from "../../lib/motion/verify-mp4";
import { dimensionsFor } from "../../lib/motion/types";

(async () => {
  const args = process.argv.slice(2);
  const ri = args.indexOf("--report");
  const reportFile = ri >= 0 ? args.splice(ri, 2)[1] : "out/3c/report.json";
  const report = existsSync(reportFile) ? (JSON.parse(readFileSync(reportFile, "utf8")) as Record<string, { format?: string; length_s?: number }>) : {};
  let bad = 0;
  for (const f of args) {
    const r0 = report[path.basename(f, ".mp4")] ?? {};
    const { width, height } = dimensionsFor((r0.format ?? "9:16") as Parameters<typeof dimensionsFor>[0]);
    const r = await verifyMp4(f, { duration: r0.length_s ?? 30, fps: 30, width, height, audio: true });
    if (!r.ok) bad++;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${f}\n${r.checks.map((c) => `   ${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`).join("\n")}${r.warnings.map((w) => `\n   ⚠ ${w}`).join("")}`);
  }
  process.exit(bad ? 1 : 0);
})();
