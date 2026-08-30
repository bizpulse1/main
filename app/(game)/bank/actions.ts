"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { computeLoanOrigination, type BankRateProfile } from "@/lib/game/loans";

export async function takeLoan(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const bankId = formData.get("bank_id") as string | null;
  const principalRaw = formData.get("principal") as string | null;
  const termRaw = formData.get("term_turns") as string | null;
  const principal = principalRaw ? parseFloat(principalRaw) : NaN;
  const termTurns = termRaw ? parseInt(termRaw, 10) : NaN;

  if (!companyId || !bankId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: bank } = await supabase
    .from("banks_catalog")
    .select("id, rate_profile")
    .eq("id", bankId)
    .single();
  if (!bank || !bank.rate_profile) {
    redirect(`/bank?company=${companyId}&error=invalid_bank`);
  }

  const rateProfile = bank!.rate_profile as unknown as BankRateProfile;

  if (
    !Number.isFinite(principal) ||
    principal <= 0 ||
    !Number.isFinite(termTurns) ||
    termTurns < rateProfile.min_term_turns ||
    termTurns > rateProfile.max_term_turns
  ) {
    redirect(`/bank?company=${companyId}&error=invalid_terms`);
  }

  // The bank disburses the FULL principal — that's what's owed and
  // repaid over the term. The down payment is a separate origination
  // cost paid out of pocket to get the loan, not a deduction from what
  // gets disbursed (computeLoanOrigination's netDisbursement field
  // isn't used here for that reason — it represents a different
  // framing, financing part of a purchase, that doesn't apply to a
  // standalone cash loan).
  const { downPaymentAmount } = computeLoanOrigination(principal, rateProfile);

  if (downPaymentAmount > company.capital) {
    redirect(`/bank?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { data: loan, error: loanError } = await supabase
    .from("company_bank_loans")
    .insert({
      company_id: companyId,
      bank_id: bankId,
      taken_turn_id: turn.id,
      principal,
      rate_pct: rateProfile.rate_pct,
      term_turns: termTurns,
      remaining_balance: principal,
      down_payment_amount: downPaymentAmount,
    })
    .select()
    .single();
  if (loanError || !loan) {
    throw new Error(loanError?.message ?? "Failed to originate loan");
  }

  const ledgerRows: { company_id: string; turn_id: string; movement_type: string; direction: "in" | "out"; amount: number; reference_table: string; reference_id: string }[] = [
    {
      company_id: companyId,
      turn_id: turn.id,
      movement_type: "loan_draw",
      direction: "in",
      amount: principal,
      reference_table: "company_bank_loans",
      reference_id: loan.id,
    },
  ];
  if (downPaymentAmount > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turn.id,
      movement_type: "loan_down_payment",
      direction: "out",
      amount: downPaymentAmount,
      reference_table: "company_bank_loans",
      reference_id: loan.id,
    });
  }
  const { error: ledgerError } = await supabase.from("treasury_ledger").insert(ledgerRows);
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital + principal - downPaymentAmount })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/turn?company=${companyId}`);
}
