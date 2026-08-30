"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function selectDepot(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const premisesOptionId = formData.get("premises_option_id") as string | null;
  if (!companyId || !premisesOptionId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  // Already rented a depot this session — don't let a resubmit (double
  // click, back-button) rent a second one and double-charge the deposit.
  const { data: existingPremises } = await supabase
    .from("company_premises")
    .select("id")
    .eq("company_id", companyId)
    .is("released_turn_id", null)
    .maybeSingle();
  if (existingPremises) {
    redirect(`/setup/supplier?company=${companyId}`);
  }

  const { data: option } = await supabase
    .from("premises_options")
    .select("*")
    .eq("id", premisesOptionId)
    .single();
  if (!option) {
    throw new Error("Selected depot option no longer exists");
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);
  const depositAmount = option.rent_per_turn * option.security_deposit_turns;

  if (depositAmount > company.capital) {
    redirect(
      `/setup/depot?company=${companyId}&error=insufficient_funds`
    );
  }

  const { data: premises, error: premisesError } = await supabase
    .from("company_premises")
    .insert({
      company_id: companyId,
      premises_option_id: premisesOptionId,
      rented_turn_id: turn.id,
      security_deposit_paid: depositAmount,
    })
    .select()
    .single();

  if (premisesError || !premises) {
    throw new Error(premisesError?.message ?? "Failed to rent depot");
  }

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "deposit",
    direction: "out",
    amount: depositAmount,
    reference_table: "company_premises",
    reference_id: premises.id,
  });
  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - depositAmount })
    .eq("id", companyId);
  if (capitalError) {
    throw new Error(capitalError.message);
  }

  redirect(`/setup/supplier?company=${companyId}`);
}
