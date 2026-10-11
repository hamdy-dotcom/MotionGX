import "server-only";
import { z } from "zod";
import { callTool } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { Scene } from "@/lib/types";
import { COLOR_ROLES, MOTIONS } from "@/lib/types";
import { brandContext, scriptRules, type ScriptInput } from "./generate";
import { fitDurations, sceneJsonSchema, scriptProblems, scriptSchema, visualSchema, withIds } from "./schema";

type EditContext = Pick<ScriptInput, "workspaceId" | "brief" | "lengthS" | "dialect" | "voiceover" | "brand">;

function scenesForPrompt(scenes: Scene[]) {
  return JSON.stringify(
    scenes.map((s) => ({ ...s, visual: s.visual ?? { layout: "hero", emphasis_color_role: "primary", motion: "rise" } })),
    null,
    1,
  );
}

const rewriteSchema = z.object({
  title: z.string().min(1).max(80),
  on_screen_text: z.string().min(1).max(200),
  voiceover_line: z.string().max(600).nullable(),
  emphasis_color_role: visualSchema.shape.emphasis_color_role,
  motion: visualSchema.shape.motion,
});

const rewriteTool = {
  name: "save_scene",
  description: "Save the rewritten scene.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: sceneJsonSchema.properties.title,
      on_screen_text: sceneJsonSchema.properties.on_screen_text,
      voiceover_line: sceneJsonSchema.properties.voiceover_line,
      emphasis_color_role: { type: "string", enum: [...COLOR_ROLES] },
      motion: { type: "string", enum: [...MOTIONS] },
    },
    required: ["title", "on_screen_text", "voiceover_line", "emphasis_color_role", "motion"],
    additionalProperties: false,
  },
};

/** "أعد كتابة المشهد": fresh copy for one scene; duration and layout stay the same. */
export async function rewriteOneScene(ctx: EditContext, scenes: Scene[], index: number): Promise<Scene> {
  const target = scenes[index];
  if (!target) throw new AiError("ai_invalid", "scene index out of range");
  const layout = target.visual?.layout ?? "hero";

  const prompt = `${brandContext(ctx.brand)}

Brief: """${ctx.brief}"""

Full script for context:
${scenesForPrompt(scenes)}

Rewrite scene ${index + 1} ("${target.title}") with fresh wording and a different angle. Keep it ${target.duration_s} seconds long with layout "${layout}", and keep it consistent with the scenes around it. Call save_scene.`;

  const result = await callTool({
    workspaceId: ctx.workspaceId,
    kind: "rewrite_scene",
    system: scriptRules(ctx),
    prompt,
    tool: rewriteTool,
    schema: rewriteSchema,
    check: (s) => {
      const problems = scriptProblems(
        [{ id: target.id, title: s.title, duration_s: target.duration_s, on_screen_text: s.on_screen_text, voiceover_line: s.voiceover_line }],
        { lengthS: target.duration_s, voiceover: ctx.voiceover },
      );
      return problems.length ? problems.join("; ") : null;
    },
    maxTokens: 2000,
  });
  if (!result.value) throw new AiError("ai_invalid", result.problem);

  const v = result.value;
  return {
    ...target,
    title: v.title,
    on_screen_text: v.on_screen_text,
    voiceover_line: ctx.voiceover ? v.voiceover_line : null,
    visual: { layout, emphasis_color_role: v.emphasis_color_role, motion: v.motion },
  };
}

const editSchema = scriptSchema.extend({ summary: z.string().min(1).max(400) });

const editTool = {
  name: "save_edit",
  description: "Save the full updated script and a one-sentence summary of what changed.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "One short sentence describing what changed, in the requested summary language." },
      scenes: { type: "array", items: sceneJsonSchema },
    },
    required: ["summary", "scenes"],
    additionalProperties: false,
  },
};

/** "اطلب تعديلًا": apply the user's instruction to the whole script. */
export async function applyEditRequest(
  ctx: EditContext,
  scenes: Scene[],
  instruction: string,
  uiLocale: "ar" | "en",
): Promise<{ scenes: Scene[]; summary: string }> {
  const prompt = `${brandContext(ctx.brand)}

Brief: """${ctx.brief}"""

Current script (${ctx.lengthS} seconds):
${scenesForPrompt(scenes)}

The client asked for this change:
"""
${instruction}
"""

Apply the change and return the FULL updated script. Leave scenes the request doesn't touch as they are. Durations must still add up to exactly ${ctx.lengthS} seconds. Write "summary" in ${uiLocale === "ar" ? "Arabic (Egyptian, short)" : "English"} — one sentence, max 20 words. Call save_edit.`;

  const result = await callTool({
    workspaceId: ctx.workspaceId,
    kind: "request_edit",
    system: scriptRules(ctx),
    prompt,
    tool: editTool,
    schema: editSchema,
    check: ({ scenes: next }) => {
      const problems = scriptProblems(next, { lengthS: ctx.lengthS, voiceover: ctx.voiceover, sceneRange: [3, 12] });
      return problems.length ? problems.join("; ") : null;
    },
  });

  if (result.value) return { scenes: withIds(result.value.scenes), summary: result.value.summary };

  const parsed = editSchema.safeParse(result.lastInput);
  if (!parsed.success) throw new AiError("ai_invalid", result.problem);
  let fixed = fitDurations(parsed.data.scenes, ctx.lengthS);
  if (!ctx.voiceover) fixed = fixed.map((s) => ({ ...s, voiceover_line: null }));
  return { scenes: withIds(fixed), summary: parsed.data.summary };
}
