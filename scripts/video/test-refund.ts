// Forced-failure test: a throwaway workspace (no members, invisible in the app) is topped up with a
// $1 test credit, a 15 s export is charged, the render is forced to fail, and refund_render() must
// return the money. Run: npx tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/video/test-refund.ts
import { createClient } from "@supabase/supabase-js";
import { runRender } from "../../lib/render/run";

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const must = <T = { id: string }>(r: { data: unknown; error: { message: string } | null }, what: string): T => {
    if (r.error || r.data == null) throw new Error(`${what}: ${r.error?.message}`);
    return r.data as T;
  };

  const ws = must(await admin.from("workspaces").insert({ name: "[test] refund probe", country_code: "EG", currency_code: "USD" }).select("id").single(), "workspace");
  must(await admin.from("wallet_ledger").insert({ workspace_id: ws.id, kind: "topup", amount_usd: 1, amount_local: 1, currency_code: "USD", fx_rate: 1, note: "test credit (refund probe)" }).select("id").single(), "topup");
  const co = must(await admin.from("companies").insert({ workspace_id: ws.id, name: "Probe Co", website_url: "https://example.com", default_dialect: "en" }).select("id").single(), "company");
  must(await admin.from("brand_profiles").insert({ company_id: co.id, colors: [{ hex: "#5558E3", role: "primary" }], fonts: {}, raw: { source: "manual" } }).select("id").single(), "profile");
  const video = must(
    await admin.from("videos").insert({ workspace_id: ws.id, company_id: co.id, title: "Refund probe", brief: "test", goal: "about", format: "9:16", length_s: 15, pace: "medium", dialect: "en", voiceover: false, status: "draft" }).select("id").single(),
    "video",
  );
  const version = must(
    await admin.from("video_versions").insert({ video_id: video.id, version: 1, scenes: [{ id: "s1", type: "hook", title: "Hook", duration_beats: 27, lines: ["Probe"], props: {}, voiceover_line: null }], script: {} }).select("id").single(),
    "version",
  );
  const render = must(await admin.from("renders").insert({ video_id: video.id, version_id: version.id, status: "queued" }).select("id").single(), "render");
  const cost = must<number>(await admin.rpc("charge_export", { p_render_id: render.id }), "charge_export");
  const before = must<{ wallet_balance_usd: number }>(await admin.from("workspaces").select("wallet_balance_usd").eq("id", ws.id).single(), "balance");
  console.log("charged", cost, "→ balance", before.wallet_balance_usd);

  await runRender(render.id, { forceFailure: true });

  const after = must<{ wallet_balance_usd: number }>(await admin.from("workspaces").select("wallet_balance_usd").eq("id", ws.id).single(), "balance");
  const r = must<{ status: string; error: string | null }>(await admin.from("renders").select("status, error").eq("id", render.id).single(), "render row");
  const v = must<{ status: string }>(await admin.from("videos").select("status").eq("id", video.id).single(), "video row");
  const ledger = must<{ kind: string; amount_usd: number; note: string | null }[]>(await admin.from("wallet_ledger").select("kind, amount_usd, note").eq("workspace_id", ws.id).order("created_at"), "ledger");
  console.log("render:", r, "video:", v.status, "balance after:", after.wallet_balance_usd);
  console.log("ledger:", ledger);
  const ok = r.status === "failed" && Number(after.wallet_balance_usd) === 1 && ledger.some((l) => l.kind === "refund");
  console.log(ok ? "PASS: forced failure refunded" : "FAIL");
  console.log("throwaway workspace:", ws.id);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
