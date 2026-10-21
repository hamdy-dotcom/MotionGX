"use client";

import { useTranslations } from "next-intl";
import { createPost } from "@/app/[locale]/(app)/posts/new/actions";
import { createVideo } from "@/app/[locale]/(app)/videos/new/actions";
import { BEST_HOUR, type PlanIdea } from "@/lib/plans/types";
import { KindIcon, PlatformIcon } from "./platform-icon";

export type IdeaBrand = { id: string; dialect: string };

/** "9 م" / "9 pm" — when the idea's first platform is most active */
export function useBestTime() {
  const t = useTranslations("plans");
  return (i: Pick<PlanIdea, "platforms">) => { const h = BEST_HOUR[i.platforms[0]] ?? 21; return h >= 12 ? t("pm", { h: h === 12 ? 12 : h - 12 }) : t("am", { h }); };
}

/** Starts the idea as a real video or post (it opens the creating screen) and marks the idea made. */
export async function makeIdea(i: PlanIdea, brand: IdeaBrand) {
  const fd = new FormData();
  fd.set("brief", i.hook && i.hook !== i.title ? `${i.title}\n\n${i.hook}` : i.title);
  fd.set("company_id", brand.id); fd.set("dialect", brand.dialect); fd.set("plan_idea_id", i.id);
  if (i.scheduled_on) fd.set("scheduled_on", i.scheduled_on);
  if (i.kind === "video") { fd.set("goal", "sell"); fd.set("format", "9:16"); fd.set("length_s", "30"); fd.set("pace", "medium"); return createVideo({}, fd); }
  fd.set("type", i.kind === "image" ? "single" : i.kind); fd.set("ai_image", i.kind === "text" ? "no" : "auto");
  (i.platforms.length ? i.platforms : ["instagram"]).forEach((p) => fd.append("platforms", p));
  return createPost({}, fd);
}

/** A planned idea inside a day: what it is, where it goes, when to post, and a one-tap make. */
export function PlanCard({ idea, onOpen, onMake, onDragStart }: { idea: PlanIdea; onOpen: () => void; onMake: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const t = useTranslations("compose.kinds");
  const tc = useTranslations("calendar");
  const best = useBestTime();
  return (
    <div className="s-pcard" draggable role="button" tabIndex={0} aria-label={idea.title} onDragStart={onDragStart} onClick={(e) => { e.stopPropagation(); onOpen(); }} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}>
      <span className="pk"><KindIcon k={idea.kind} size={11} />{t(idea.kind)}<em>· {idea.angle}</em></span>
      <b dir="auto">{idea.title}</b>
      <span className="pf">{idea.platforms.map((p) => <PlatformIcon key={p} p={p} size={11} />)}<span>{best(idea)}</span><button type="button" className="pmk" onClick={(e) => { e.stopPropagation(); onMake(); }}>{tc("make")}</button></span>
    </div>
  );
}
