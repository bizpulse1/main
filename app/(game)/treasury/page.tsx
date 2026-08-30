import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function TreasuryScreen({
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
    .select("id, name, capital, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const [{ data: ledger }, { data: turns }, { data: premises }, { data: openPurchases }] =
    await Promise.all([
      supabase
        .from("treasury_ledger")
        .select("turn_id, movement_type, direction, amount")
        .eq("company_id", company.id),
      supabase
        .from("session_turns")
        .select("id, turn_number")
        .eq("session_id", company.session_id),
      supabase
        .from("company_premises")
        .select("premises_option_id")
        .eq("company_id", company.id)
        .is("released_turn_id", null)
        .maybeSingle(),
      supabase
        .from("purchase_orders")
        .select("deferred_payment_amount")
        .eq("company_id", company.id)
        .gt("deferred_payment_amount", 0),
    ]);

  const turnNumberById = new Map((turns ?? []).map((t) => [t.id, t.turn_number]));

  // Reconstruct net cash movement per turn from the ledger — this is
  // real history, not a display-only estimate, since treasury_ledger is
  // the single source of truth every capital change was written from.
  const netByTurn = new Map<number, number>();
  for (const row of ledger ?? []) {
    const turnNumber = turnNumberById.get(row.turn_id);
    if (turnNumber === undefined) continue;
    const signedAmount = row.direction === "in" ? row.amount : -row.amount;
    netByTurn.set(turnNumber, (netByTurn.get(turnNumber) ?? 0) + signedAmount);
  }
  const history = Array.from(netByTurn.entries()).sort((a, b) => a[0] - b[0]);

  let rentAndCharges = 0;
  if (premises?.premises_option_id) {
    const { data: option } = await supabase
      .from("premises_options")
      .select("rent_per_turn, charges_per_turn")
      .eq("id", premises.premises_option_id)
      .single();
    rentAndCharges = (option?.rent_per_turn ?? 0) + (option?.charges_per_turn ?? 0);
  }

  const { data: activeWorkers } = await supabase
    .from("workers")
    .select("base_salary")
    .eq("company_id", company.id)
    .eq("status", "active");
  const payroll = (activeWorkers ?? []).reduce((sum, w) => sum + w.base_salary, 0);
  const recurringCostPerTurn = rentAndCharges + payroll;

  const payables = (openPurchases ?? []).reduce(
    (sum, o) => sum + o.deferred_payment_amount,
    0
  );

  const zeroSalesFloor = company.capital - recurringCostPerTurn * 3;

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Treasury
        </h1>

        <Card highlighted className="mb-4">
          <p className="text-bp-text-muted text-sm">Current capital</p>
          <p className="font-display text-2xl font-semibold text-bp-gold">
            ${company.capital.toLocaleString("en-US")}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-bp-surface border border-bp-border p-4">
            <p className="text-bp-text-muted text-xs mb-1">Payables (deferred)</p>
            <p className="text-bp-text font-display font-semibold text-lg">
              ${payables.toLocaleString("en-US")}
            </p>
            {payables === 0 && (
              <p className="text-bp-text-muted text-xs mt-1">
                All purchases so far were cash
              </p>
            )}
          </div>
          <div className="rounded-xl bg-bp-surface border border-bp-border p-4">
            <p className="text-bp-text-muted text-xs mb-1">Rent & charges / turn</p>
            <p className="text-bp-text font-display font-semibold text-lg">
              ${rentAndCharges.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {payroll > 0 && (
          <div className="rounded-xl bg-bp-surface border border-bp-border p-4 mb-4">
            <p className="text-bp-text-muted text-xs mb-1">Payroll / turn</p>
            <p className="text-bp-text font-display font-semibold text-lg">
              ${payroll.toLocaleString("en-US")}
            </p>
          </div>
        )}

        <Card className="mb-4">
          <p className="text-bp-gold text-sm font-semibold mb-2">
            3-turn floor projection
          </p>
          <p className="text-bp-text-muted text-sm mb-2">
            If you made zero sales for the next 3 turns, rent, charges
            {payroll > 0 ? ", and payroll" : ""} alone would bring you to:
          </p>
          <p
            className={`font-display text-xl font-semibold ${
              zeroSalesFloor < 0 ? "text-red-400" : "text-bp-text"
            }`}
          >
            ${zeroSalesFloor.toLocaleString("en-US")}
          </p>
          {zeroSalesFloor < 0 && (
            <p className="text-red-400 text-xs mt-1">
              That's below zero — you have less runway than it looks like.
            </p>
          )}
        </Card>

        <Card>
          <p className="text-bp-gold text-sm font-semibold mb-3">Turn-by-turn cash</p>
          {history.length === 0 ? (
            <p className="text-bp-text-muted text-sm">No turns resolved yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map(([turnNumber, net]) => (
                <div key={turnNumber} className="flex justify-between text-sm">
                  <span className="text-bp-text-muted">Turn {turnNumber}</span>
                  <span className={net >= 0 ? "text-bp-gold" : "text-red-400"}>
                    {net >= 0 ? "+" : ""}
                    ${net.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
