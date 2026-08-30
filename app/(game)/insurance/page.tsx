import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { isPolicyActive } from "@/lib/game/insurance";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { purchaseInsurance } from "./actions";

export default async function InsuranceScreen({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.company) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const [{ data: formulas }, { data: existingPolicies }] = await Promise.all([
    supabase.from("insurance_formulas_catalog").select("*").order("premium_per_turn"),
    supabase.from("company_insurance_policies").select("formula, start_turn_id").eq("company_id", company.id),
  ]);

  let activePolicyFormula: string | null = null;
  for (const policy of existingPolicies ?? []) {
    const [{ data: startTurn }, { data: formulaInfo }] = await Promise.all([
      supabase.from("session_turns").select("turn_number").eq("id", policy.start_turn_id).single(),
      supabase.from("insurance_formulas_catalog").select("duration_turns").eq("formula", policy.formula).single(),
    ]);
    if (startTurn && formulaInfo && isPolicyActive(startTurn.turn_number, formulaInfo.duration_turns, turn.turn_number)) {
      activePolicyFormula = policy.formula;
    }
  }

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Insurance
        </h1>
        <p className="text-bp-text-muted mb-6">
          Covers breakdown repairs and operational-risk events, minus a
          deductible, up to the coverage cap. Premium is charged every
          turn while active.
        </p>

        {activePolicyFormula && (
          <Card highlighted className="mb-4">
            <p className="text-bp-gold text-sm">
              Active policy: {activePolicyFormula}
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {(formulas ?? []).map((f) => (
            <form key={f.formula} action={purchaseInsurance}>
              <input type="hidden" name="company_id" value={company.id} />
              <input type="hidden" name="formula" value={f.formula} />
              <Card highlighted={f.formula === activePolicyFormula} className="mb-2">
                <p className="font-display font-semibold text-bp-text mb-1 capitalize">
                  {f.formula}
                </p>
                <p className="text-sm text-bp-text-muted mb-3">{f.coverage_description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-bp-text-muted mb-4">
                  <span>Premium: ${(f.premium_per_turn ?? 0).toLocaleString("en-US")}/turn</span>
                  <span>Duration: {f.duration_turns} turns</span>
                  <span>Deductible: ${(f.deductible ?? 0).toLocaleString("en-US")}</span>
                  <span>Coverage cap: ${(f.coverage_cap ?? 0).toLocaleString("en-US")}</span>
                </div>
                <SubmitButton disabled={Boolean(activePolicyFormula)}>
                  {activePolicyFormula ? "Policy already active" : `Buy ${f.formula}`}
                </SubmitButton>
              </Card>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
