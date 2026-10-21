import "server-only";
import type { AppContext } from "@/lib/context";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** After a video or post is created from the composer, a day or a plan idea: put it on its day and mark the idea made.
 *  Separate from the insert so creating still works before the 0013 migration is applied. */
export async function placeCreated(supabase: AppContext["supabase"], table: "videos" | "posts", id: string, formData: FormData) {
  const day = String(formData.get("scheduled_on") ?? "");
  const ideaId = String(formData.get("plan_idea_id") ?? "");
  if (DAY.test(day)) {
    const { error } = await supabase.from(table).update({ scheduled_on: day }).eq("id", id);
    if (error && error.code !== "42703") console.error("[placeCreated] schedule failed", { table, id, code: error.code, message: error.message });
  }
  if (ideaId) {
    const { error } = await supabase.from("plan_ideas").update({ status: "made", [table === "videos" ? "video_id" : "post_id"]: id, ...(DAY.test(day) ? { scheduled_on: day } : {}) }).eq("id", ideaId);
    if (error) console.error("[placeCreated] idea update failed", { ideaId, code: error.code, message: error.message });
  }
}
