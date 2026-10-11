// Fails when messages/ar.json and messages/en.json don't have identical keys.
import { readFileSync } from "node:fs";

const load = (locale) => JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));

function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const ar = new Set(keys(load("ar")));
const en = new Set(keys(load("en")));
const missingInEn = [...ar].filter((k) => !en.has(k));
const missingInAr = [...en].filter((k) => !ar.has(k));

if (missingInEn.length || missingInAr.length) {
  if (missingInEn.length) console.error(`Missing in en.json:\n  ${missingInEn.join("\n  ")}`);
  if (missingInAr.length) console.error(`Missing in ar.json:\n  ${missingInAr.join("\n  ")}`);
  process.exit(1);
}

console.log(`i18n: ${ar.size} keys match in ar.json and en.json`);
