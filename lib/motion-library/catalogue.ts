// The library's catalogue: every move file read, its card checked against the schema (a bad card fails the build),
// written to catalogue.json; and findMoves(), the search the director calls ("reveal the price, urgent, a number").
//   pnpm tsx lib/motion-library/catalogue.ts   → lib/motion-library/catalogue.json (+ a summary)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MoveCard, CATEGORIES, type Category } from "./schema";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MOVES_DIR = path.join(here, "moves");
export const CATALOGUE = path.join(here, "catalogue.json");
const STRICT = process.argv.includes("--strict");

/** every move file's card (setup dropped), validated */
export function readMoves(dir = MOVES_DIR) {
  const cards: MoveCard[] = [], errors: string[] = [];
  for (const cat of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const cdir = path.join(dir, cat);
    if (!fs.statSync(cdir).isDirectory()) continue;
    for (const f of fs.readdirSync(cdir).filter((x) => x.endsWith(".js")).sort()) {
      const file = path.join(cdir, f);
      const got: unknown[] = [];
      // a move file calls ML.define({...}); a stub collects the card without running setup
      try { new Function("ML", fs.readFileSync(file, "utf8"))({ define: (m: unknown) => got.push(m) }); }
      catch (err) { errors.push(`${cat}/${f}: does not load — ${String(err).slice(0, 160)}`); continue; }
      if (got.length !== 1) { errors.push(`${cat}/${f}: must define exactly one move (defines ${got.length})`); continue; }
      const { setup, ...card } = got[0] as Record<string, unknown>;
      if (typeof setup !== "function") { errors.push(`${cat}/${f}: no setup()`); continue; }
      const r = MoveCard.safeParse(card);
      if (!r.success) { errors.push(`${cat}/${f}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`); continue; }
      if (r.data.category !== cat || !r.data.id.startsWith(cat + ".")) { errors.push(`${cat}/${f}: id / category must match its folder (${r.data.id})`); continue; }
      cards.push(r.data);
    }
  }
  const ids = new Set<string>();
  for (const c of cards) { if (ids.has(c.id)) errors.push(`duplicate id ${c.id}`); ids.add(c.id); }
  // a pair naming a move not built yet is a warning while the library is being built, an error in --strict
  const warnings: string[] = [];
  for (const c of cards) for (const x of c.pairs) if (!ids.has(x)) (STRICT ? errors : warnings).push(`${c.id}: pairs with unknown move ${x}`);
  return { cards, errors, warnings };
}

/** the director's search: the moves that best fit a moment (never the whole library) */
export function findMoves(cards: MoveCard[], q: { says?: string[]; target?: string; category?: Category; energy?: number; shape?: string; rtl?: boolean; avoidIds?: string[]; limit?: number }) {
  const scored = cards
    .filter((c) => (!q.category || c.category === q.category) && (!q.target || c.targets.includes(q.target as never)) && (!q.shape || c.shapes.includes(q.shape as never)) && (!q.rtl || c.rtl) && !(q.avoidIds ?? []).includes(c.id))
    .map((c) => {
      const said = (q.says ?? []).filter((s) => c.says.includes(s as never)).length;
      const clash = (q.says ?? []).filter((s) => c.avoid.includes(s as never)).length;
      const energy = q.energy ? 1 - Math.abs(c.energy - q.energy) / 4 : 0.5;
      return { c, score: said * 2 + energy - clash * 3 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id));
  return scored.slice(0, q.limit ?? 12).map((x) => x.c);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { cards, errors, warnings } = readMoves();
  if (warnings.length) console.warn(`! ${warnings.length} warning(s):\n  ${warnings.join("\n  ")}`);
  if (errors.length) { console.error(`✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`); process.exit(1); }
  fs.writeFileSync(CATALOGUE, JSON.stringify({ built: new Date().toISOString(), moves: cards }, null, 1));
  const by = Object.fromEntries(CATEGORIES.map((c) => [c, cards.filter((x) => x.category === c).length]));
  console.log(`✓ ${cards.length} moves → ${path.relative(process.cwd(), CATALOGUE)}\n  ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
}
