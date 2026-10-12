// Phase 1/2 versions stored { on_screen_text, duration_s, visual? }. Convert them to kit scenes so
// old videos still preview and render.
import { kitSceneSchema, type KitScene } from "./kit";

type LegacyScene = {
  id?: string;
  title?: string;
  duration_s?: number;
  on_screen_text?: string;
  voiceover_line?: string | null;
  visual?: { layout?: string };
};

const LAYOUT_TO_TYPE: Record<string, KitScene["type"]> = { logo: "logo_reveal", cta: "cta" };

export function toKitScenes(raw: unknown, bpm: number, websiteUrl?: string | null): KitScene[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i): KitScene => {
    const parsed = kitSceneSchema.safeParse(item);
    if (parsed.success) return parsed.data;
    const s = item as LegacyScene;
    const lines = String(s.on_screen_text ?? s.title ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);
    const base = {
      id: s.id ?? `s${i + 1}`,
      title: s.title?.slice(0, 60) || `${i + 1}`,
      duration_beats: Math.max(2, Math.round(((s.duration_s ?? 4) * bpm) / 60)),
      lines: lines.length ? lines.map((l) => l.slice(0, 48)) : ["…"],
      voiceover_line: s.voiceover_line ?? null,
    };
    const type = LAYOUT_TO_TYPE[s.visual?.layout ?? ""] ?? "hook";
    if (type === "cta") return { ...base, type, props: { url: (websiteUrl ?? "").replace(/^https?:\/\//, "") || "—", button: lines[0]?.slice(0, 26) || "→" } };
    if (type === "logo_reveal") return { ...base, type, props: {} };
    return { ...base, type: "hook", props: {} };
  });
}
