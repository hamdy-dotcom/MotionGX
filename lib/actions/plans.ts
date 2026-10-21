"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/context";
import { brandDetails } from "@/lib/data/works";
import { toAiErrorCode, type AiErrorCode } from "@/lib/ai/usage";
import { writeIdeas } from "@/lib/plans/ideas";
import { IDEA_COLUMNS, PLAN_GOALS, PLAN_KINDS, PLAN_PLATFORMS, postsNeeded, type Plan, type PlanIdea } from "@/lib/plans/types";
import { addDays, daysBetween, todayKey } from "@/lib/dates";

type Result<T> = { ok: true; value: T } | { ok: false; error: "generic" | "notFound" | AiErrorCode };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const only = <T extends string>(xs: unknown[], allowed: readonly T[]) => [...new Set(xs.map(String))].filter((x): x is T => (allowed as readonly string[]).includes(x));

async function loadIdeas(planId: string): Promise<PlanIdea[]> {
  const { supabase } = await getAppContext();
  const { data } = await supabase.from("plan_ideas").select(IDEA_COLUMNS).eq("plan_id", planId).order("position");
  return (data ?? []) as PlanIdea[];
}

async function planContext(planId: string) {
  const ctx = await getAppContext();
  const { data: plan } = await ctx.supabase.from("content_plans").select("id, company_id, starts_on, ends_on, per_week, goals, mix, platforms, notes").eq("id", planId).eq("workspace_id", ctx.workspace.id).maybeSingle();
  return { ctx, plan: plan as Plan | null };
}

/** Saves the plan's settings (a new plan, or the current one edited). */
export async function savePlan(input: { id?: string | null; companyId: string; startsOn: string; endsOn: string; perWeek: number; goals: string[]; mix: string[]; platforms: string[]; notes: string }): Promise<Result<Plan>> {
  const { supabase, workspace } = await getAppContext();
  const today = todayKey();
  const startsOn = DAY.test(input.startsOn) && input.startsOn >= today ? input.startsOn : addDays(today, 1);
  const endsOn = DAY.test(input.endsOn) && input.endsOn >= startsOn ? input.endsOn : addDays(startsOn, 13);
  if (daysBetween(startsOn, endsOn) > 92) return { ok: false, error: "generic" };
  const row = {
    workspace_id: workspace.id, company_id: input.companyId, starts_on: startsOn, ends_on: endsOn,
    per_week: Math.min(7, Math.max(1, Math.round(input.perWeek))), goals: only(input.goals, PLAN_GOALS),
    mix: only(input.mix, PLAN_KINDS).length ? only(input.mix, PLAN_KINDS) : ["image"], platforms: only(input.platforms, PLAN_PLATFORMS), notes: input.notes.slice(0, 1000),
  };
  const q = input.id ? supabase.from("content_plans").update(row).eq("id", input.id).eq("workspace_id", workspace.id) : supabase.from("content_plans").insert(row);
  const { data, error } = await q.select("id, company_id, starts_on, ends_on, per_week, goals, mix, platforms, notes").single();
  if (error || !data) { console.error("[savePlan] failed", { code: error?.code, message: error?.message }); return { ok: false, error: "generic" }; }
  return { ok: true, value: data as Plan };
}

/** Writes ideas for the plan. fresh = replace the ideas still undecided; otherwise add `count` more. */
export async function suggestIdeas(planId: string, count: number, fresh: boolean): Promise<Result<PlanIdea[]>> {
  const { ctx, plan } = await planContext(planId);
  if (!plan) return { ok: false, error: "notFound" };
  const { supabase, workspace } = ctx;
  if (fresh) await supabase.from("plan_ideas").delete().eq("plan_id", planId).in("status", ["new", "no"]);
  const kept = await loadIdeas(planId);
  const [{ data: company }, details] = await Promise.all([supabase.from("companies").select("name, website_url, default_dialect").eq("id", plan.company_id).single(), brandDetails(ctx, plan.company_id)]);
  try {
    const drafts = await writeIdeas({
      workspaceId: workspace.id,
      brand: { name: company?.name ?? "", site: company?.website_url ?? "", tone: details.tone, tagline: details.tagline, audience: details.facts.audience ?? "", whatItDoes: details.facts.what_it_does ?? "", features: details.facts.key_features ?? [], offers: details.facts.offers ?? [], numbers: (details.facts.numbers ?? []).map((n) => `${n.value} ${n.label}`), dialect: company?.default_dialect ?? "msa" },
      startsOn: plan.starts_on, endsOn: plan.ends_on, goals: plan.goals, mix: plan.mix, platforms: plan.platforms.length ? plan.platforms : ["instagram", "facebook"], notes: plan.notes,
      count: Math.min(40, Math.max(1, count)), avoid: kept.map((i) => i.title),
    });
    const base = kept.reduce((m, i) => Math.max(m, i.position), 0);
    if (drafts.length) {
      const { error } = await supabase.from("plan_ideas").insert(drafts.map((d, i) => ({ ...d, plan_id: planId, workspace_id: workspace.id, company_id: plan.company_id, position: base + i + 1 })));
      if (error) { console.error("[suggestIdeas] insert failed", { code: error.code, message: error.message }); return { ok: false, error: "generic" }; }
    }
    return { ok: true, value: await loadIdeas(planId) };
  } catch (err) {
    return { ok: false, error: toAiErrorCode(err) };
  }
}

/** Replaces one undecided idea with a new one. */
export async function swapIdea(ideaId: string): Promise<Result<PlanIdea[]>> {
  const { supabase } = await getAppContext();
  const { data: idea } = await supabase.from("plan_ideas").select("id, plan_id, position").eq("id", ideaId).maybeSingle();
  if (!idea) return { ok: false, error: "notFound" };
  const before = await loadIdeas(idea.plan_id);
  const res = await suggestIdeas(idea.plan_id, 1, false);
  if (!res.ok) return res;
  const fresh = res.value.find((i) => !before.some((b) => b.id === i.id));
  if (!fresh) return res;
  await supabase.from("plan_ideas").update({ position: idea.position }).eq("id", fresh.id);
  await supabase.from("plan_ideas").delete().eq("id", ideaId);
  return { ok: true, value: await loadIdeas(idea.plan_id) };
}

/** Accept / reject / undo an idea, or give it a day (null = no day). Accepting an occasion idea puts it on its day when free. */
export async function updateIdea(ideaId: string, change: { status?: "new" | "ok" | "no"; scheduledOn?: string | null }): Promise<Result<PlanIdea[]>> {
  const { supabase } = await getAppContext();
  const { data: idea } = await supabase.from("plan_ideas").select("id, plan_id, suggested_on, scheduled_on").eq("id", ideaId).maybeSingle();
  if (!idea) return { ok: false, error: "notFound" };
  const patch: Record<string, unknown> = {};
  if (change.status) patch.status = change.status;
  if (change.status === "new" || change.status === "no") patch.scheduled_on = null;
  if (change.scheduledOn !== undefined) patch.scheduled_on = change.scheduledOn && DAY.test(change.scheduledOn) ? change.scheduledOn : null;
  if (change.status === "ok" && idea.suggested_on && !idea.scheduled_on && change.scheduledOn === undefined) {
    const { count } = await supabase.from("plan_ideas").select("id", { count: "exact", head: true }).eq("plan_id", idea.plan_id).eq("scheduled_on", idea.suggested_on).in("status", ["ok", "made"]);
    if (!count) patch.scheduled_on = idea.suggested_on;
  }
  const { error } = await supabase.from("plan_ideas").update(patch).eq("id", ideaId);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/calendar");
  return { ok: true, value: await loadIdeas(idea.plan_id) };
}

/** Spreads the accepted ideas without a day evenly over the plan's free days. */
export async function autoAssign(planId: string): Promise<Result<{ ideas: PlanIdea[]; placed: number }>> {
  const { ctx, plan } = await planContext(planId);
  if (!plan) return { ok: false, error: "notFound" };
  const ideas = await loadIdeas(planId);
  const n = daysBetween(plan.starts_on, plan.ends_on) + 1;
  const days = Array.from({ length: n }, (_, i) => addDays(plan.starts_on, i));
  const need = postsNeeded(n, plan.per_week), step = n / Math.max(need, 1);
  const [{ data: v }, { data: p }] = await Promise.all([
    ctx.supabase.from("videos").select("scheduled_on").eq("company_id", plan.company_id).gte("scheduled_on", plan.starts_on).lte("scheduled_on", plan.ends_on),
    ctx.supabase.from("posts").select("scheduled_on").eq("company_id", plan.company_id).gte("scheduled_on", plan.starts_on).lte("scheduled_on", plan.ends_on),
  ]);
  const taken = new Set([...ideas.filter((i) => i.scheduled_on && (i.status === "ok" || i.status === "made")).map((i) => i.scheduled_on!), ...[...(v ?? []), ...(p ?? [])].map((r) => r.scheduled_on as string)]);
  const slots = Array.from({ length: need }, (_, k) => days[Math.min(n - 1, Math.floor(k * step + step / 2))]);
  const pool = [...new Set([...slots.filter((d) => !taken.has(d)), ...days.filter((d) => !taken.has(d))])];
  let placed = 0;
  for (const i of ideas.filter((x) => x.status === "ok" && !x.scheduled_on)) {
    const d = pool.shift(); if (!d) break;
    await ctx.supabase.from("plan_ideas").update({ scheduled_on: d }).eq("id", i.id); placed++;
  }
  revalidatePath("/calendar");
  return { ok: true, value: { ideas: await loadIdeas(planId), placed } };
}
