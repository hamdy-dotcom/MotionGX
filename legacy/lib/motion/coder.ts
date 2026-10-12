import "server-only";
import { readFileSync } from "node:fs";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { OPUS, SONNET, streamText, type ClaudeModel } from "@/lib/ai/claude";
import { AiError } from "@/lib/ai/usage";
import type { ScriptBeat } from "@motiongx/primitives";
import type { Treatment } from "./director";
import type { MotionBrief } from "./types";
import { projectPath } from "./paths";

export { OPUS, SONNET };

const sfxSchema = z.object({
  sfx: z.array(z.object({ t: z.number().min(0), kind: z.enum(["whoosh", "pop", "click", "riser", "impact"]) })).max(80),
});
export type SfxEvent = z.infer<typeof sfxSchema>["sfx"][number];

let apiDoc: string | null = null;
const primitivesApi = () => (apiDoc ??= readFileSync(projectPath("packages/primitives/API.md"), "utf8"));

const SYSTEM = () => `You are a senior motion designer who codes bespoke Remotion compositions in React + TypeScript.
You implement a creative director's treatment for ONE video, from scratch: invent the shapes, layouts, transitions and motion. There are no templates and no stock scenes — only the low-level primitives below.

${primitivesApi()}

Hard rules:
- Output exactly one TSX file in a \`\`\`tsx fence, then a \`\`\`json fence with {"sfx":[{"t":seconds,"kind":"whoosh|pop|click|riser|impact"}]} listing the sound effects your animation implies (whoosh on transitions, pop/click on element entrances, riser right before reveals, impact on the logo). Nothing else.
- React rules of hooks: call hooks (useCurrentFrame, useUnit, useBeat, useHit, …) only at the top level of a component — never inside loops, conditions, .map() callbacks or after an early return. For per-item motion, make a small child component and call the hooks there.
- Default-export the component. Use only the allowed imports. Pure function of the frame. No setTimeout/Date/Math.random (use random(seed)).
- Copy: every on-screen line comes from props.script.beats[i].lines, shown with <Text> (one per line). Keep each beat's text on screen long enough to read. The brand name and props.brand.url may also appear.
- Colors: only props.palette (and mix/rgba/shade of palette colors). Text must reach 4.5:1 contrast with what is behind it — use palette.text on dark areas, pickTextColor() on colored areas.
- Fonts: props.fonts.head/body/latin/arabic only.
- Timing: place each beat with <Sequence from={Math.round(beat.start_s*fps)} durationInFrames=…>. Land key motion on props.energy.hits (useHit / hitFrames), breathe with useBeat().pulse, scale intensity with useEnergy().level.
- Never leave the frame static for more than 0.6 s: something must always move (camera drift, particles, noise, pulses).
- Layout: size everything in u = useUnit(). Keep text inside the frame with ≥ 6% margins; give <Text> an explicit width. Respect props.dir for direction-dependent layout (RTL for Arabic).
- Logo: <BrandLogo/> only — never stretch, crop, recolor or redraw it.
- Keep the file tight: under ~450 lines. Factor repeated motion into small helpers inside the file instead of copy-pasting per beat.
- Make it look custom-made for this brand: rich layering, depth, purposeful transitions, real craft. Avoid generic "title on gradient" scenes.`;

function userBrief(b: MotionBrief, t: Treatment, script: { title: string; beats: ScriptBeat[] }) {
  return `Brand: ${b.brand.name} (${b.brand.url}); palette roles: ${b.brand.colors.map((c) => `${c.hex} ${c.role ?? ""}`).join(", ")}; logo: ${b.brand.hasLogo ? "yes" : "no"}; brand images: ${b.brand.imageCount}.
Format ${b.format} = ${b.width}×${b.height} @30fps, ${b.lengthS}s. Language ${b.dialect === "en" ? "English (LTR)" : "Arabic (RTL)"}.

TREATMENT
Concept: ${t.concept}
Visual metaphor: ${t.visual_metaphor}
Motion language: ${t.motion_language} — ${t.motion_language_detail}
Typography: ${t.typography}
Palette usage: ${t.palette_usage}
Camera: ${t.camera}
Beats:
${t.beats.map((x) => `- ${x.id} ${x.start_s}–${x.end_s}s "${x.name}": ${x.visual} → out: ${x.transition_out}`).join("\n")}

ENERGY MAP (also in props.energy)
${JSON.stringify(t.energy)}

SCRIPT (props.script.beats — on-screen lines per beat)
${JSON.stringify(script.beats.map((x) => ({ id: x.id, lines: x.lines })))}`;
}

function parseOutput(text: string): { code: string; sfx: SfxEvent[] } {
  const code = [...text.matchAll(/```(?:tsx|typescript|ts)\s*\n([\s\S]*?)```/g)].pop()?.[1];
  if (!code) throw new AiError("ai_invalid", "coder returned no tsx block");
  const json = [...text.matchAll(/```json\s*\n([\s\S]*?)```/g)].pop()?.[1];
  let sfx: SfxEvent[] = [];
  if (json) {
    const parsed = sfxSchema.safeParse((() => { try { return JSON.parse(json); } catch { return null; } })());
    if (parsed.success) sfx = parsed.data.sfx;
  }
  return { code: code.trim(), sfx };
}

export type CoderFeedback = {
  previousCode: string;
  errors: string[];
  stills?: { t: number; label: string; jpegBase64: string }[];
};

/** Writes (or fixes) the composition. Streams; long outputs are fine. */
export async function codeComposition(
  b: MotionBrief,
  t: Treatment,
  script: { title: string; beats: ScriptBeat[] },
  opts: { model?: ClaudeModel; feedback?: CoderFeedback; instruction?: string } = {},
): Promise<{ code: string; sfx: SfxEvent[]; model: string }> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text: userBrief(b, t, script) }];
  if (opts.instruction) content.push({ type: "text", text: `CHANGE REQUEST from the client (apply it, keep everything else):\n"""${opts.instruction}"""` });
  if (opts.feedback) {
    if (opts.feedback.previousCode) content.push({ type: "text", text: `CURRENT FILE:\n\`\`\`tsx\n${opts.feedback.previousCode}\n\`\`\`` });
    for (const s of opts.feedback.stills ?? []) {
      content.push({ type: "text", text: `Rendered frame at ${s.t.toFixed(2)}s (${s.label}):` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: s.jpegBase64 } });
    }
    content.push({ type: "text", text: `PROBLEMS TO FIX (all of them):\n${opts.feedback.errors.map((e) => `- ${e}`).join("\n")}\n\nReturn the complete corrected file and the sfx JSON.` });
  } else if (!opts.instruction) {
    content.push({ type: "text", text: "Write the composition." });
  }
  const res = await streamText({
    workspaceId: b.workspaceId,
    kind: "motion_code",
    model: opts.model ?? SONNET,
    system: SYSTEM(),
    messages: [{ role: "user", content }],
    maxTokens: 48000,
    // "high" made Sonnet think for 50k+ tokens on a ~15k-token file (8 min/round); medium keeps the craft
    // and roughly quarters the time. Opus (rounds 3–4) writes the same file in ~14k tokens.
    effort: (opts.model ?? SONNET) === OPUS ? "high" : "medium",
  });
  if (res.stopReason === "max_tokens") throw new AiError("ai_invalid", "composition too long (max_tokens)");
  return { ...parseOutput(res.text), model: res.model };
}
