import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { takeLoan } from "./actions";

interface RateProfile {
  rate_pct: number;
  down_payment_pct: number;
  min_term_turns: number;
  max_term_turns: number;
}

export default async function BankScreen({
  searchParams,
}: {
  searchParams: { company?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.company) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, capital")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const [{ data: banks }, { data: existingLoans }] = await Promise.all([
    supabase.from("banks_catalog").select("*").order("code"),
    supabase
      .from("company_bank_loans")
      .select("principal, remaining_balance")
      .eq("company_id", company.id),
  ]);

  const totalOwed = (existingLoans ?? []).reduce((sum, l) => sum + l.remaining_balance, 0);

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Take a loan
        </h1>
        <p className="text-bp-text-muted mb-6">
          Lower rates mean more upfront cash needed. Repayments are
          deducted automatically every turn.
        </p>

        {totalOwed > 0 && (
          <Card className="mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-bp-text-muted">Currently owed (all loans)</span>
              <span className="text-bp-text">${totalOwed.toLocaleString("en-US")}</span>
            </div>
          </Card>
        )}

        {searchParams.error === "invalid_terms" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Check your amount and term — term must be within the bank's
            allowed range.
          </p>
        )}
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital to cover the down payment.
          </p>
        )}

        <div className="space-y-6">
          {(banks ?? []).map((bank) => {
            const rp = bank.rate_profile as unknown as RateProfile;
            return (
              <form key={bank.id} action={takeLoan}>
                <input type="hidden" name="company_id" value={company.id} />
                <input type="hidden" name="bank_id" value={bank.id} />
                <Card highlighted className="mb-3">
                  <p className="font-display font-semibold text-bp-text mb-1">{bank.label}</p>
                  <p className="text-sm text-bp-text-muted mb-3">{bank.positioning}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-bp-text-muted mb-4">
                    <span>Rate: {rp?.rate_pct}%/year</span>
                    <span>Down payment: {rp?.down_payment_pct}%</span>
                    <span>
                      Term: {rp?.min_term_turns}–{rp?.max_term_turns} turns
                    </span>
                  </div>
                  <label className="text-xs text-bp-text-muted mb-1 block">Amount ($)</label>
                  <input
                    type="number"
                    name="principal"
                    min={1}
                    step={1000}
                    defaultValue={50000}
                    className="w-full rounded-xl bg-bp-bg border border-bp-border px-3 py-2 text-bp-text mb-3 focus:outline-none focus:border-bp-gold"
                  />
                  <label className="text-xs text-bp-text-muted mb-1 block">Term (turns)</label>
                  <input
                    type="number"
                    name="term_turns"
                    min={rp?.min_term_turns ?? 1}
                    max={rp?.max_term_turns ?? 20}
                    defaultValue={rp?.min_term_turns ?? 4}
                    className="w-full rounded-xl bg-bp-bg border border-bp-border px-3 py-2 text-bp-text mb-4 focus:outline-none focus:border-bp-gold"
                  />
                  <SubmitButton>Borrow from {bank.label}</SubmitButton>
                </Card>
              </form>
            );
          })}
        </div>
      </div>
    </main>
  );
}
