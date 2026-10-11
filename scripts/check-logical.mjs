// Fails on physical-direction Tailwind classes. Use ms-/me-/ps-/pe-/start-/end-/text-start instead.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const BANNED =
  /(?<![\w-])(?:-?(?:ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|border-l|border-r)-[\w./[\]-]+|text-left|text-right|float-left|float-right)(?![\w-])/g;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

const problems = [];
for (const file of ROOTS.flatMap(walk)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const match of line.matchAll(/className=\{?["'`]([^"'`]*)["'`]|@apply ([^;]*);/g)) {
        const classes = match[1] ?? match[2];
        for (const bad of classes.matchAll(BANNED)) problems.push(`${file}:${i + 1}  ${bad[0]}`);
      }
    });
}

if (problems.length) {
  console.error(`Physical direction classes found (use logical ones):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("logical-properties: ok");
