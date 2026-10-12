import "server-only";
import { z } from "zod";
import { callTool, HAIKU, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import { PACE_BPM, kitSceneSchema, type KitScene } from "@/lib/video/kit";
import { brandContext, rulesFor, scriptSystem, scriptTool, type ScriptInput } from "./generate";
import { scriptProblems, withIds } from "./schema";

type EditContext = Pick<ScriptInput, "workspaceId" | "brief" | "lengthS" | "dialect" | "voiceover" | "brand" | "pace">;

/** "أعد كتابة المشهد" (Haiku): fresh copy for one scene — same type and duration. */
export async function rewriteOneScene(ctx: EditContext, scenes: KitScene[], index: number): Promise<KitScene> {
  const target = scenes[index];
  if (!target) throw new AiError("ai_invalid", "scene index out of range");
  const bpm = PACE_BPM[ctx.pace];
  const rules = rulesFor(ctx, false);

  const prompt = `${brandContext(ctx.brand)}

Brief: """${ctx.brief}"""

Full script for context:
${JSON.stringify(scenes, null, 1)}

Rewrite scene ${index + 1} with fresh wording and a different angle. Keep "type": "${target.type}", "duration_beats": ${target.duration_beats} and "id": "${target.id}". Stay consistent with the scenes around it. Return the whole scene object.`;

  const sceneTool = {
    name: "save_scene",
    description: "Save the rewritten scene.",
    input_schema: { type: "object" as const, properties: { scene: scriptTool.input_schema.properties.scenes.items }, required: ["scene"] },
  };

  const result = await callTool({
    workspaceId: ctx.workspaceId,
    kind: "rewrite_scene",
    model: HAIKU,
    strict: false,
    system: scriptSystem({ dialect: ctx.dialect, voiceover: ctx.voiceover, bpm }),
    prompt,
    tool: sceneTool,
    schema: z.object({ scene: kitSceneSchema }),
    check: ({ scene }) => {
      if (scene.type !== target.type) return `keep the scene type "${target.type}"`;
      const problems = scriptProblems([scene], { ...rules, lengthS: (target.duration_beats * 60) / bpm }).filter((p) => !/different scene types|cta url/.test(p) || scene.type === "cta");
      return problems.length ? problems.join("; ") : null;
    },
    maxTokens: 3000,
  });
  if (!result.value) throw new AiError("ai_invalid", result.problem);
  const scene = result.value.scene;
  return { ...scene, id: target.id, duration_beats: target.duration_beats, voiceover_line: ctx.voiceover ? scene.voiceover_line : null } as KitScene;
}

const editSchema = z.object({ summary: z.string().trim().min(1).max(300), scenes: z.array(kitSceneSchema).min(3).max(12) });

/** "اطلب تعديلًا" (Sonnet): apply the user's instruction to the whole script. */
export async function applyEditRequest(ctx: EditContext, scenes: KitScene[], instruction: string, uiLocale: "ar" | "en"): Promise<{ scenes: KitScene[]; summary: string }> {
  const bpm = PACE_BPM[ctx.pace];
  const totalBeats = Math.round((ctx.lengthS * bpm) / 60);
  const rules = rulesFor(ctx, false, [3, 12]);
  const prompt = `${brandContext(ctx.brand)}

Brief: """${ctx.brief}"""

Current script (${ctx.lengthS}s = ${totalBeats} beats):
${JSON.stringify(scenes, null, 1)}

The client asked for this change (it may be in any language):
"""
${instruction}
"""

Apply the change and return the FULL updated script. Leave scenes the request doesn't touch exactly as they are. duration_beats must still add up to ${totalBeats}. Write "summary" in ${uiLocale === "ar" ? "short Egyptian Arabic" : "English"} — one sentence, max 20 words, saying what changed.`;

  const result = await callTool({
    workspaceId: ctx.workspaceId,
    kind: "request_edit",
    model: SONNET,
    strict: false,
    system: scriptSystem({ dialect: ctx.dialect, voiceover: ctx.voiceover, bpm }),
    prompt,
    tool: {
      name: "save_edit",
      description: "Save the full updated script and a one-sentence summary of what changed.",
      input_schema: {
        type: "object" as const,
        properties: { summary: { type: "string" }, scenes: scriptTool.input_schema.properties.scenes },
        required: ["summary", "scenes"],
      },
    },
    schema: editSchema,
    check: ({ scenes: next }) => {
      const problems = scriptProblems(next, rules).filter((p) => !/different scene types/.test(p));
      return problems.length ? problems.join("; ") : null;
    },
    maxTokens: 16000,
  });

  let value = result.value;
  if (!value) {
    // Accept a still-imperfect edit only when what's left is soft (the beat grid snaps durations).
    const failed = result as { lastInput: unknown; problem: string };
    const parsed = editSchema.safeParse(failed.lastInput);
    const hard = parsed.success ? scriptProblems(parsed.data.scenes, rules).filter((p) => !/duration_beats add up|different scene types|scenes \(got/.test(p)) : ["invalid shape"];
    if (!parsed.success || hard.length) throw new AiError("ai_invalid", failed.problem);
    value = parsed.data;
  }
  return { scenes: withIds(value.scenes).map((s) => (ctx.voiceover ? s : { ...s, voiceover_line: null })), summary: value.summary };
}
