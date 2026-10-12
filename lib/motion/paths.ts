import path from "node:path";

/**
 * A path inside the project, resolved at runtime. Marked turbopackIgnore so the build doesn't try to
 * trace it as a module asset (tracing `.venv/bin/python`, a symlink out of the project, made
 * Turbopack panic and hang). Files the server really needs are listed in next.config.ts
 * `outputFileTracingIncludes` instead.
 */
export const projectPath = (...parts: string[]) => path.join(/* turbopackIgnore: true */ process.cwd(), ...parts);
