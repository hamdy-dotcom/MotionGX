// Shared webpack override for Remotion bundles: resolve `@motiongx/primitives` to the package source
// and the app's `@/` alias (shared pure modules: spec evaluator, behaviors).
import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@motiongx/primitives": path.resolve(process.cwd(), "packages/primitives/src/index.ts"),
      // shared pure modules (spec evaluator, behaviors) use the app's @/ alias
      "@": process.cwd(),
    },
  },
});
