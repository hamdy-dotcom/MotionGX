// Phase 3F: seed the illustrations library with 25 common-commerce hero illustrations (one style),
// then write a contact sheet. Re-running skips names already in the library for that style.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/motion/seed-illustrations.ts [--style line] [--out out/3f/seed]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { costOf, withRun, type RunContext } from "../../lib/ai/usage";
import { ILLUSTRATION_STYLES, STYLE_STROKE, type IllustrationNeed, type IllustrationStyle } from "../../lib/motion/illustration-core";
import { drawIllustration, IllustrationLibrary, runIllustrationJob } from "../../lib/motion/illustrations";
import { buildTokens } from "../../packages/primitives/src/palette";

export const SEEDS: IllustrationNeed[] = [
  { name: "parcel_box", shows: "a cardboard shipping box with flaps and a packing tape strip", parts: [{ name: "lid", does: "flaps close" }, { name: "tape", does: "tape runs across the closed flaps" }], directional: false },
  { name: "delivery_truck", shows: "a delivery van seen from the side with a cargo box and two wheels", parts: [{ name: "drive", does: "van moves forward a little and wheels turn" }, { name: "door", does: "rear cargo door swings open" }], directional: true },
  { name: "warehouse_shelves", shows: "a warehouse with tall shelving racks holding boxes", parts: [{ name: "fill", does: "boxes appear on the shelves one by one" }, { name: "door", does: "rolling door rises" }], directional: false },
  { name: "phone_sales_chart", shows: "a smartphone whose screen shows a bar chart of sales", parts: [{ name: "bars", does: "bars grow upward" }, { name: "glow", does: "screen lights up" }], directional: false },
  { name: "shopping_cart", shows: "a shopping cart with items inside", parts: [{ name: "fill", does: "items drop into the cart" }, { name: "roll", does: "cart rolls forward and wheels turn" }], directional: true },
  { name: "credit_card", shows: "a payment card with chip and stripe", parts: [{ name: "flip", does: "card turns from back to front" }, { name: "tap", does: "contactless waves appear" }], directional: false },
  { name: "wallet", shows: "a leather wallet with cards peeking out", parts: [{ name: "open", does: "wallet opens" }, { name: "cards", does: "cards slide up out of it" }], directional: false },
  { name: "cash_stack", shows: "a stack of banknotes with a band", parts: [{ name: "stack", does: "notes stack up higher" }, { name: "fan", does: "top notes fan out" }], directional: false },
  { name: "receipt", shows: "a paper receipt with line items and a total", parts: [{ name: "print", does: "receipt unrolls downward" }, { name: "check", does: "a check mark draws on" }], directional: false },
  { name: "store_front", shows: "a small shop front with awning, door and window", parts: [{ name: "awning", does: "awning rolls down" }, { name: "lights", does: "window lights switch on" }], directional: false },
  { name: "map_pin", shows: "a location pin standing on a small map grid", parts: [{ name: "drop", does: "pin drops onto the map" }, { name: "pulse", does: "ring pulses out under the pin" }], directional: false },
  { name: "delivery_route", shows: "a winding route line between a start dot and an end flag", parts: [{ name: "draw", does: "route draws from start to end" }, { name: "arrive", does: "end flag pops up" }], directional: true },
  { name: "calendar", shows: "a wall calendar page with a grid of days", parts: [{ name: "flip", does: "the top page flips over" }, { name: "mark", does: "one day gets circled" }], directional: false },
  { name: "growth_chart", shows: "a line chart rising on axes with an arrow head", parts: [{ name: "draw", does: "line draws upward" }, { name: "peak", does: "a highlight dot appears at the peak" }], directional: true },
  { name: "rocket", shows: "a rocket with fins and a window", parts: [{ name: "launch", does: "rocket lifts up" }, { name: "flame", does: "exhaust flame grows" }], directional: false },
  { name: "gift_box", shows: "a gift box with ribbon and bow", parts: [{ name: "lid", does: "lid lifts off" }, { name: "sparkle", does: "sparkles burst from inside" }], directional: false },
  { name: "megaphone", shows: "a megaphone/loudspeaker", parts: [{ name: "shout", does: "sound waves come out" }, { name: "tilt", does: "megaphone tilts up" }], directional: true },
  { name: "support_headset", shows: "a customer-support headset with microphone", parts: [{ name: "talk", does: "voice waves come from the mic" }, { name: "light", does: "ear cup indicator lights up" }], directional: false },
  { name: "team_people", shows: "three simple people figures side by side", parts: [{ name: "join", does: "side figures slide in next to the middle one" }, { name: "wave", does: "middle figure raises an arm" }], directional: false },
  { name: "clock", shows: "a round wall clock with hour and minute hands", parts: [{ name: "spin", does: "minute hand sweeps around" }, { name: "ring", does: "alarm ring lines appear" }], directional: false },
  { name: "shield_check", shows: "a security shield with a check mark", parts: [{ name: "check", does: "check mark draws on" }, { name: "glow", does: "shield fills with colour" }], directional: false },
  { name: "price_tag", shows: "a price tag hanging on a string", parts: [{ name: "swing", does: "tag swings" }, { name: "slash", does: "a discount slash draws across" }], directional: false },
  { name: "star_rating", shows: "a row of five stars", parts: [{ name: "fill", does: "stars fill in one by one" }, { name: "pop", does: "stars bounce up slightly" }], directional: true },
  { name: "chat_bubble", shows: "two overlapping chat bubbles", parts: [{ name: "reply", does: "second bubble pops in" }, { name: "typing", does: "typing dots appear in the first bubble" }], directional: false },
  { name: "coffee_cup", shows: "a takeaway coffee cup with lid and sleeve", parts: [{ name: "steam", does: "steam curls rise" }, { name: "fill", does: "cup fills up" }], directional: false },
];

/** neutral demo palette for seed stills (the library itself stores colour roles only) */
export const DEMO_PALETTE = { ...buildTokens([{ hex: "#3B5BDB", role: "primary" }, { hex: "#14213D", role: "ink" }, { hex: "#F59F00", role: "accent" }, { hex: "#FFFFFF", role: "background" }]), white: "#FFFFFF", black: "#0A0A0A" } as unknown as Record<string, string>;

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}

(async () => {
  const si = process.argv.indexOf("--style");
  const style = (si > 0 ? process.argv[si + 1] : "line") as IllustrationStyle;
  if (!ILLUSTRATION_STYLES.includes(style)) throw new Error(`unknown style ${style}`);
  const oi = process.argv.indexOf("--out");
  const out = path.resolve(oi > 0 ? process.argv[oi + 1] : "out/3f/seed");
  mkdirSync(out, { recursive: true });
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
  const lib = new IllustrationLibrary(admin);
  const have = new Map((await lib.inStyle(style)).map((x) => [x.name, x]));
  const ctx: RunContext = { usage: [], capUsd: 4, printCost: true };
  const T0 = Date.now();
  const results = await withRun(ctx, () =>
    pool(SEEDS, 8, async (need) => {
      if (have.has(need.name)) return { name: need.name, ok: true, skipped: true, rounds: 0, ms: 0, problems: [] as string[] };
      const r = await drawIllustration(null, need, style, "a generic online-commerce promo");
      if (r.ready) await lib.promote(r.ready, { tags: [...need.name.split("_"), "seed", "commerce"] });
      else if (r.tsx) writeFileSync(path.join(out, `failed-${need.name}.tsx`), `// ${r.problems.join("\n// ")}\n${r.tsx}`);
      console.log(`  ${r.ready ? "✓" : "✗"} ${need.name} (${r.rounds} round${r.rounds > 1 ? "s" : ""}, ${(r.ms / 1000).toFixed(1)}s)${r.problems.length ? ` — ${r.problems.join("; ")}` : ""}`);
      return { name: need.name, ok: !!r.ready, skipped: false, rounds: r.rounds, ms: r.ms, problems: r.problems };
    }),
  );
  // stills for the contact sheet: every seeded illustration in this style at progress 0 / 0.5 / 1
  const all = (await lib.inStyle(style)).filter((x) => SEEDS.some((s) => s.name === x.name));
  const sheet = await runIllustrationJob({ items: all.map((x) => ({ key: x.name, tsx: x.tsx, parts: x.parts.map((p) => p.name), sw: STYLE_STROKE[style], stills: { dir: path.join(out, "stills"), palette: DEMO_PALETTE, size: 300 } })) }, 300_000);
  const cost = costOf(ctx.usage);
  const report = { style, seconds: Number(((Date.now() - T0) / 1000).toFixed(1)), cost_usd: Number(cost.usd.toFixed(4)), calls: ctx.usage.length, drawn: results.filter((r) => r.ok && !r.skipped).length, failed: results.filter((r) => !r.ok).map((r) => ({ name: r.name, problems: r.problems })), fix_rounds: results.filter((r) => r.rounds > 1).length, results, sheet: sheet.ok ? sheet.results.map((r) => ({ name: r.key, ok: r.ok, problems: r.problems, stills: r.stills, fill: r.stats?.fill })) : sheet.errors };
  writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 1));
  console.log(`seeded ${report.drawn} new (${report.failed.length} failed, ${report.fix_rounds} needed a fix round) in ${report.seconds}s · $${report.cost_usd} over ${report.calls} calls`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
