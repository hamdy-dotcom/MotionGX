// The behavior catalogue the AI sees, generated from the registry — so it can never drift from what the
// engine actually supports.
import { z } from "zod";
import { BEHAVIORS, EASE, type Behavior } from "@/remotion/behaviors";

const EASES = Object.keys(EASE).join("|");
const DIR8 = "left|right|up|down|upLeft|upRight|downLeft|downRight";

function paramText(schema: z.ZodObject<z.ZodRawShape>) {
  const parts: string[] = [];
  for (const [name, t] of Object.entries(schema.shape)) {
    let type = t as z.ZodTypeAny;
    let def: unknown;
    if (type instanceof z.ZodDefault) {
      def = (type as z.ZodDefault<z.ZodTypeAny>).def.defaultValue;
      type = (type as z.ZodDefault<z.ZodTypeAny>).def.innerType as z.ZodTypeAny;
    }
    let desc = "";
    if (type instanceof z.ZodEnum) {
      const opts = (type.options as string[]).join("|");
      desc = opts === EASES ? "ease" : opts === DIR8 ? "dir8" : opts;
    }
    else if (type instanceof z.ZodNumber) desc = "n";
    else if (type instanceof z.ZodBoolean) desc = "bool";
    else desc = "str";
    parts.push(`${name}:${desc}${def !== undefined ? `=${typeof def === "function" ? (def as () => unknown)() : def}` : ""}`);
  }
  return parts.join(", ");
}

const ORDER: Behavior["kind"][] = ["enter", "loop", "exit", "emphasis", "morph", "physics", "generative", "data"];

/** One line per behavior, grouped by kind. */
export function catalogueText() {
  const lines: string[] = [`(ease = ${EASES}; dir8 = ${DIR8}; n = number; every behavior also takes at:time, dur:seconds; on a group, stagger:seconds applies it to each child in turn)`];
  for (const kind of ORDER) {
    lines.push(`# ${kind}`);
    for (const [name, b] of Object.entries(BEHAVIORS)) {
      if (b.kind !== kind) continue;
      const p = paramText(b.params);
      const dur = Number.isFinite(b.dur) ? `${b.dur}s` : "∞";
      lines.push(`- ${name} (${dur}${b.textOnly ? ", text" : ""}${b.perLetter ? ", Latin only" : ""}) ${b.desc}${p ? ` [${p}]` : ""}`);
    }
  }
  return lines.join("\n");
}

export const BEHAVIOR_COUNT = Object.keys(BEHAVIORS).length;
