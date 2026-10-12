// Re-embeds every motion_refs row (and stored treatments) after an embedding-model change.
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/refs/reembed.ts
import { createClient } from "@supabase/supabase-js";
import { embed, EMBED_MODEL } from "../../lib/motion/embed";
import { refText, type MotionRef } from "../../lib/motion/store";

type Row = MotionRef & { card: { summary?: string; techniques?: string[] } | null };
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

/** Same recipe as refs:import: carded rows embed summary + techniques + tags. */
export const refEmbedText = (r: Row) => (r.card?.summary ? `${r.card.summary} ${(r.card.techniques ?? []).join(", ")}. ${r.tags.join(", ")}` : refText(r));

(async () => {
  const t0 = Date.now();
  const { data: refs, error } = await admin.from("motion_refs").select("id, title, category, tags, prompt_text, card");
  if (error) throw error;
  for (const r of refs as Row[]) {
    const { error: e } = await admin.from("motion_refs").update({ embedding: JSON.stringify(await embed(refEmbedText(r))) }).eq("id", r.id);
    if (e) throw e;
  }
  const { data: ts } = await admin.from("motion_treatments").select("id, concept, motion_language");
  for (const t of ts ?? []) {
    const { error: e } = await admin.from("motion_treatments").update({ embedding: JSON.stringify(await embed(`${t.motion_language}. ${t.concept}`)) }).eq("id", t.id);
    if (e) throw e;
  }
  console.log(`${EMBED_MODEL}: re-embedded ${refs!.length} refs + ${ts?.length ?? 0} treatments in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
