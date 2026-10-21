export const PLAN_GOALS = ["sales", "awareness", "launch", "community", "season"] as const;
export const PLAN_KINDS = ["image", "carousel", "video", "text"] as const;
export const PLAN_PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;
export type PlanGoal = (typeof PLAN_GOALS)[number];
export type PlanKind = (typeof PLAN_KINDS)[number];

export type Plan = { id: string; company_id: string; starts_on: string; ends_on: string; per_week: number; goals: PlanGoal[]; mix: PlanKind[]; platforms: string[]; notes: string };
export type PlanIdea = {
  id: string;
  plan_id: string;
  position: number;
  kind: PlanKind;
  angle: string;
  title: string;
  why: string;
  hook: string;
  platforms: string[];
  occasion: string | null;
  suggested_on: string | null;
  status: "new" | "ok" | "no" | "made";
  scheduled_on: string | null;
  video_id: string | null;
  post_id: string | null;
};
export const IDEA_COLUMNS = "id, plan_id, position, kind, angle, title, why, hook, platforms, occasion, suggested_on, status, scheduled_on, video_id, post_id";

/** how many posts a plan asks for, and how many ideas we suggest to choose from */
export const postsNeeded = (days: number, perWeek: number) => (perWeek >= 7 ? days : Math.max(1, Math.round((days / 7) * perWeek)));
export const ideasToSuggest = (needed: number) => Math.min(40, Math.max(8, needed * 2));

/** when each platform's audience is most active (Egypt and the Gulf, local time) */
export const BEST_HOUR: Record<string, number> = { instagram: 21, facebook: 20, tiktok: 22, linkedin: 10, x: 13 };
