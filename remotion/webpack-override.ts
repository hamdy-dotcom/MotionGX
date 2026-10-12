// Shared webpack override for Remotion bundles: resolve `@motiongx/primitives` to the package source.
import path from "node:path";
import type { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@motiongx/primitives": path.resolve(process.cwd(), "packages/primitives/src/index.ts"),
    },
  },
});
