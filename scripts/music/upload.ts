// Uploads the generated library (scripts/music/out/*.mp3 + manifest.json) to the public `music`
// bucket and upserts `music_tracks`. Run after 0003_motion.sql:
//   npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/music/upload.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Entry = { file: string; pace: string; mood: string; variation: number; bpm: number; duration_s: number };

async function main() {
  const dir = path.resolve("scripts/music/out");
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as Entry[];
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  for (const t of manifest) {
    const storagePath = `${t.pace}/${t.mood}-${t.variation}.mp3`;
    const bytes = readFileSync(path.join(dir, t.file));
    const { error: upErr } = await admin.storage.from("music").upload(storagePath, bytes, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw new Error(`upload ${storagePath}: ${upErr.message}`);
    const { error } = await admin
      .from("music_tracks")
      .upsert({ bpm: t.bpm, mood: t.mood, pace: t.pace, variation: t.variation, duration_s: t.duration_s, storage_path: storagePath }, { onConflict: "pace,mood,variation" });
    if (error) throw new Error(`row ${storagePath}: ${error.message}`);
    console.log("uploaded", storagePath);
  }
  console.log(`done: ${manifest.length} tracks`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
