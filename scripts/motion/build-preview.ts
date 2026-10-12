// Builds the sandboxed preview runtime → public/preview/runtime.js
import path from "node:path";
import { rmSync } from "node:fs";
import { build } from "esbuild";

(async () => {
  const t0 = Date.now();
  rmSync(path.resolve("public/preview"), { recursive: true, force: true });
  const res = await build({
    entryPoints: [path.resolve("preview/runtime.tsx")],
    // ESM + splitting: @remotion/google-fonts lazily imports ~1,700 font modules; each becomes its own chunk.
    outdir: path.resolve("public/preview"),
    entryNames: "runtime",
    chunkNames: "chunks/[name]-[hash]",
    splitting: true,
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@motiongx/primitives": path.resolve("packages/primitives/src/index.ts") },
    metafile: true,
    logLevel: "warning",
  });
  const entry = Object.entries(res.metafile.outputs).find(([k]) => k.endsWith("runtime.js"))![1].bytes;
  const chunks = Object.keys(res.metafile.outputs).length - 1;
  console.log(`preview runtime → public/preview/runtime.js (${(entry / 1024 / 1024).toFixed(2)} MB entry + ${chunks} lazy chunks, ${Date.now() - t0}ms)`);
})();
