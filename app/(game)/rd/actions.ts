"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { getNextEligibleRdLevel, rollRdOutcome } from "@/lib/game/rd";

export async function startRdProject(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: pastProjects } = await supabase
    .from("company_rd_projects")
    .select("level, status")
    .eq("company_id", companyId);
  const successfulLevels = (pastProjects ?? [])
    .filter((p) => p.status === "success")
    .map((p) => p.level);
  const nextLevel = getNextEligibleRdLevel(successfulLevels);

  // No resubmit guard here on purpose: a failed attempt is meant to be
  // retryable (the screen says so), and since nextLevel only advances
  // on success, "already has a row at this level" would match every
  // failed attempt too — that would permanently block retrying the
  // same level after one failure, which is the opposite of the
  // intended design.

  const { data: levelInfo } = await supabase
    .from("rd_levels_catalog")
    .select("*")
    .eq("level", nextLevel)
    .single();
  if (!levelInfo || levelInfo.cost === null) {
    throw new Error("R&D level not configured — check seed data");
  }

  if (levelInfo.cost > company.capital) {
    redirect(`/rd?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);
  const succeeded = rollRdOutcome(levelInfo.base_risk_pct ?? 0);

  const { error: projectError } = await supabase.from("company_rd_projects").insert({
    company_id: companyId,
    level: nextLevel,
    status: succeeded ? "success" : "failed",
    started_turn_id: turn.id,
    completed_turn_id: turn.id,
    cost_incurred: levelInfo.cost,
    outcome: { succeeded, base_risk_pct: levelInfo.base_risk_pct },
  });
  if (projectError) throw new Error(projectError.message);

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "rd_investment",
    direction: "out",
    amount: levelInfo.cost,
    reference_table: "company_rd_projects",
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - levelInfo.cost })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/rd?company=${companyId}&result=${succeeded ? "success" : "failed"}`);
}
