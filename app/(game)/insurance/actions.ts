"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { isPolicyActive } from "@/lib/game/insurance";

export async function purchaseInsurance(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const formulaRaw = formData.get("formula") as string | null;
  const VALID_FORMULAS = ["basique", "standard", "multirisque"] as const;
  type InsuranceFormula = (typeof VALID_FORMULAS)[number];
  if (!companyId || !formulaRaw || !VALID_FORMULAS.includes(formulaRaw as InsuranceFormula)) {
    redirect("/hub");
  }
  const formula = formulaRaw as InsuranceFormula;

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: formulaInfo } = await supabase
    .from("insurance_formulas_catalog")
    .select("*")
    .eq("formula", formula)
    .single();
  if (!formulaInfo || formulaInfo.premium_per_turn === null) {
    throw new Error("Insurance formula not configured — check seed data");
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Block buying a new policy while one is still active — the game
  // already has a real "already have one" guard pattern (depot,
  // supplier); a second overlapping policy would just be confusing,
  // not a legitimate choice (you can't file two claims for one loss).
  // Each existing policy's OWN formula determines its OWN duration —
  // this must not reuse the new formula's duration for that check.
  const { data: existingPolicies } = await supabase
    .from("company_insurance_policies")
    .select("id, formula, start_turn_id")
    .eq("company_id", companyId);

  for (const policy of existingPolicies ?? []) {
    const [{ data: startTurn }, { data: policyFormulaInfo }] = await Promise.all([
      supabase.from("session_turns").select("turn_number").eq("id", policy.start_turn_id).single(),
      supabase.from("insurance_formulas_catalog").select("duration_turns").eq("formula", policy.formula).single(),
    ]);
    if (
      startTurn &&
      policyFormulaInfo &&
      isPolicyActive(startTurn.turn_number, policyFormulaInfo.duration_turns, turn.turn_number)
    ) {
      redirect(`/turn?company=${companyId}`);
    }
  }

  const { error } = await supabase.from("company_insurance_policies").insert({
    company_id: companyId,
    formula,
    start_turn_id: turn.id,
    premium_per_turn: formulaInfo.premium_per_turn,
  });
  if (error) throw new Error(error.message);

  redirect(`/turn?company=${companyId}`);
}
