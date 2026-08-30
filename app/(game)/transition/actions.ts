"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { checkTransitionEligibility, TRANSITION_COST } from "@/lib/game/industrialTransition";

export async function beginTransition(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (company.activity_type === "industrial") {
    redirect(`/turn?company=${companyId}`);
  }

  // Re-validate server-side — the UI already checks this, but a
  // client-side-only check is not a security boundary.
  const eligibility = checkTransitionEligibility(company.current_level, company.capital);
  if (!eligibility.eligible) {
    redirect(`/transition?company=${companyId}&error=not_eligible`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { data: transition, error: transitionError } = await supabase
    .from("company_activity_transitions")
    .insert({
      company_id: companyId,
      from_activity: "commercial",
      to_activity: "industrial",
      diagnostic_result: eligibility,
      started_turn_id: turn.id,
      completed_turn_id: turn.id, // instant for now — see industrialTransition.ts
      total_cost: TRANSITION_COST,
    })
    .select()
    .single();
  if (transitionError || !transition) {
    throw new Error(transitionError?.message ?? "Failed to record transition");
  }

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "industrial_transition",
    direction: "out",
    amount: TRANSITION_COST,
    reference_table: "company_activity_transitions",
    reference_id: transition.id,
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      activity_type: "industrial",
      capital: company.capital - TRANSITION_COST,
    })
    .eq("id", companyId);
  if (companyError) throw new Error(companyError.message);

  redirect(`/turn?company=${companyId}`);
}
