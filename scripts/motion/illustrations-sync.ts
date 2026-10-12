// Upload the local illustrations library (data/illustrations/library.json — seeds and anything promoted
// before 0006_illustrations.sql ran) into the `illustrations` / `illustration_uses` tables. Idempotent:
// illustrations upsert on hash; uses are only inserted when the table has none for that workspace+video.
//   pnpm illustrations:sync
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { LibraryIllustration } from "../../lib/motion/illustrations";

(async () => {
  const file = "data/illustrations/library.json";
  if (!existsSync(file)) throw new Error(`${file} not found`);
  const d = JSON.parse(readFileSync(file, "utf8")) as { illustrations: LibraryIllustration[]; uses: { workspace_id: string; video_ref: string; illustration_hash: string; created_at: string }[] };
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const rows = d.illustrations.map(({ id: _id, embedding, ...r }) => (void _id, { ...r, embedding: JSON.stringify(embedding) }));
  const { error } = await admin.from("illustrations").upsert(rows, { onConflict: "hash" });
  if (error) throw new Error(`illustrations upsert: ${error.message} (did 0006_illustrations.sql run?)`);
  let uses = 0;
  const groups = new Map<string, typeof d.uses>();
  for (const u of d.uses) groups.set(`${u.workspace_id}|${u.video_ref}`, [...(groups.get(`${u.workspace_id}|${u.video_ref}`) ?? []), u]);
  for (const list of groups.values()) {
    const { count } = await admin.from("illustration_uses").select("id", { count: "exact", head: true }).eq("workspace_id", list[0].workspace_id).eq("video_ref", list[0].video_ref);
    if (count) continue;
    const { error: e2 } = await admin.from("illustration_uses").insert(list);
    if (e2) console.warn(`  uses for ${list[0].video_ref}: ${e2.message}`);
    else uses += list.length;
  }
  console.log(`synced ${rows.length} illustrations, ${uses} uses`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
