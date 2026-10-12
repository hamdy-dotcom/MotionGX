// Phase 3D: store the full prompt-motion.com prompt for every entry in motion_refs.prompt_text (internal
// only — never shown to users or in the UI). The card stays in motion_refs.card (and is what's embedded).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => {
  const entries = JSON.parse(readFileSync("scripts/refs/cache/entries.json", "utf8")) as { slug: string; prompt: string; type: string }[];
  let n = 0;
  let chars = 0;
  for (const e of entries) {
    if (!e.prompt.trim()) continue;
    const { error, count } = await admin.from("motion_refs").update({ prompt_text: e.prompt }, { count: "exact" }).eq("id", `pm-${e.slug}`);
    if (error) throw error;
    n += count ?? 0;
    chars += e.prompt.length;
  }
  console.log(`stored full prompts for ${n}/${entries.length} prompt-motion refs (${chars} chars, avg ${Math.round(chars / Math.max(1, n))})`);
})();
