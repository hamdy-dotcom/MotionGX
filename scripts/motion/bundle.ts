// Prebuilds the runtime Remotion bundle (MotionVideo) into .remotion-bundle (used by the worker and Vercel Sandbox).
import path from "node:path";
import { rmSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { webpackOverride } from "../../remotion/webpack-override";

(async () => {
  const outDir = path.resolve(".remotion-bundle");
  rmSync(outDir, { recursive: true, force: true });
  const t0 = Date.now();
  await bundle({ entryPoint: path.resolve("remotion/index.ts"), outDir, webpackOverride });
  console.log(`bundle → ${outDir} (${Date.now() - t0}ms)`);
})();
