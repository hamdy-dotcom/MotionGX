import "server-only";
import { readFileSync } from "node:fs";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, SONNET } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { Palette, ScriptBeat } from "@motiongx/primitives";
import type { Treatment } from "./director";

export const QA_CHECKS = [
  "text_overflow_or_cropping",
  "broken_arabic_letters",
  "low_contrast",
  "empty_or_dead_frame",
  "off_brand_colors",
  "logo_distorted",
  "static_over_0_6s",
  "treatment_not_followed",
  "render_error",
] as const;
export type QaCheck = (typeof QA_CHECKS)[number];

const qaSchema = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(10),
  treatment_followed: z.boolean(),
  issues: z
    .array(z.object({ check: z.enum(QA_CHECKS), severity: z.enum(["blocking", "minor"]).default("blocking"), t: z.number().nullable(), detail: z.string().max(500) }))
    .max(30),
  summary: z.string().max(600),
});
export type QaReport = z.infer<typeof qaSchema> & { static_spans: { from_s: number; to_s: number }[]; round: number; checked_frames: number[] };

const tool = {
  name: "save_qa_report",
  description: "Save the QA verdict for these frames.",
  input_schema: {
    type: "object" as const,
    properties: {
      pass: { type: "boolean", description: "true only if no frame has a blocking issue" },
      score: { type: "number", description: "overall craft 0–10" },
      treatment_followed: { type: "boolean" },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            check: { type: "string", enum: [...QA_CHECKS] },
            severity: { type: "string", enum: ["blocking", "minor"], description: "blocking = a viewer would see a defect in the settled frame; minor = polish" },
            t: { anyOf: [{ type: "number" }, { type: "null" }] },
            detail: { type: "string", description: "What is wrong and how to fix it, concretely." },
          },
          required: ["check", "severity", "t", "detail"],
        },
      },
      summary: { type: "string" },
    },
    required: ["pass", "score", "treatment_followed", "issues", "summary"],
  },
};

/** Vision QA on rendered stills + the deterministic static-frame scan. */
export async function visionQa({
  workspaceId,
  stills,
  treatment,
  script,
  palette,
  staticSpans,
  round,
  lang,
}: {
  workspaceId: string;
  stills: { t: number; label: string; path: string }[];
  treatment: Treatment;
  script: { beats: ScriptBeat[] };
  palette: Palette;
  staticSpans: { from_s: number; to_s: number }[];
  round: number;
  lang: "ar" | "en";
}): Promise<QaReport> {
  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `You are a strict motion-design QA reviewer. Below are frames rendered from one generated brand video.
Treatment: ${treatment.motion_language} — ${treatment.concept}
Beats: ${treatment.beats.map((b) => `${b.id} ${b.start_s}–${b.end_s}s: ${b.visual}`).join(" | ")}
Expected on-screen copy per beat (${lang === "ar" ? "Arabic, RTL" : "English"}): ${script.beats.map((b) => `${b.start_s}–${b.end_s}s: ${b.lines.join(" / ")}`).join(" | ")}
Brand palette (the only allowed colors, plus their tints/mixes and white/near-black for text): ${[palette.bg, palette.bg2, palette.surface, palette.text, palette.primary, palette.accent, palette.gradA, palette.gradB].join(", ")}

Checklist — FAIL the video if any frame shows:
1. text_overflow_or_cropping: text cut off by the frame edge or by a container, overlapping other text, or wrapped mid-word.
2. broken_arabic_letters: Arabic letters disconnected, reversed word order, isolated letter forms inside a word, tofu boxes.
3. low_contrast: text below ~4.5:1 contrast with its background.
4. empty_or_dead_frame: a mostly empty/blank frame, or nothing meaningful on screen where the beat expects content.
5. off_brand_colors: prominent colors that are clearly not from the palette.
6. logo_distorted: logo stretched, cropped, recolored or illegible.
7. treatment_not_followed: the frames don't show the treatment's motion language / visual idea.
Frames labelled "hit" are captured on a musical hit, while things are entering: partially revealed words, motion blur and elements mid-flight are EXPECTED there and are not defects. Judge settled states mainly from the "even" frames; a problem seen only mid-motion is at most "minor".
Severity: "blocking" for anything a viewer would notice as broken in a settled frame (cut-off or overlapping text, unreadable or broken Arabic, illegible contrast, an empty frame where copy should be, a distorted logo, an empty CTA). "minor" for polish. pass = no blocking issues and the treatment is followed.
Be concrete in "detail" so a coder can fix it.`,
    },
  ];
  for (const s of stills) {
    content.push({ type: "text", text: `Frame t=${s.t.toFixed(2)}s (${s.label})` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: readFileSync(s.path).toString("base64") } });
  }

  const res = await callTool({ workspaceId, kind: "vision_qa", model: SONNET, strict: false, system: "You review rendered video frames against a checklist and report precisely.", prompt: content, tool, schema: qaSchema, maxTokens: 6000 });
  if (!res.value) throw new AiError("ai_invalid", res.problem);
  const issues = [...res.value.issues];
  for (const s of staticSpans) issues.push({ check: "static_over_0_6s", severity: "blocking", t: s.from_s, detail: `Nothing moves from ${s.from_s}s to ${s.to_s}s — add continuous motion (camera drift, particles, pulses).` });
  const blocking = issues.some((i) => i.severity === "blocking");
  return {
    ...res.value,
    issues,
    pass: res.value.pass && !blocking && res.value.treatment_followed,
    static_spans: staticSpans,
    round,
    checked_frames: stills.map((s) => s.t),
  };
}
