import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CapitalOverTimeChart, RevenueVsCostsChart } from "@/components/DashboardCharts";
import { TurnRevealCard } from "@/components/TurnRevealCard";
import { buildHeadline } from "@/lib/game/turnNarrative";

interface TurnKpis {
  units_sold: number;
  units_lost_demand: number;
  demand_captured: number;
  revenue: number;
  rent_and_charges: number;
  payroll: number;
  net_cash_change: number;
  capital_after: number;
  stock_remaining: number;
  sale_price: number;
  market_reference_price: number;
  marketing_bonus_pct?: number;
  arguments_bonus_pct?: number;
  event_code?: string | null;
  event_label?: string | null;
  event_extra_cost?: number;
  level?: number;
  leveled_up?: boolean;
  at_level_cap?: boolean;
  produced_quantity?: number;
  production_constraint?: string | null;
  energy_cost?: number;
  sellable_quantity?: number;
  defect_quantity?: number;
  defect_rate_pct?: number;
  breakdown_occurred?: boolean;
  corrective_maintenance_cost?: number;
  loan_repayment?: number;
  insurance_premium?: number;
  insurance_payout?: number;
}

export default async function DashboardScreen({
  searchParams,
}: {
  searchParams: { company?: string; turn?: string };
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

  let turnId = searchParams.turn;
  if (!turnId) {
    // "Latest turn" means highest turn_number, not highest turn_id —
    // turn_id is a UUID and sorts arbitrarily, not chronologically.
    const { data: latestTurn } = await supabase
      .from("session_turns")
      .select("id")
      .eq("session_id", company.session_id)
      .order("turn_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    turnId = latestTurn?.id;
  }
  if (!turnId) redirect(`/setup/ready?company=${company.id}`);

  const { data: dashboard } = await supabase
    .from("turn_dashboards")
    .select("kpis, turn_id")
    .eq("company_id", company.id)
    .eq("department", "general")
    .eq("turn_id", turnId)
    .maybeSingle();

  if (!dashboard) {
    redirect(`/setup/ready?company=${company.id}`);
  }

  const kpis = dashboard!.kpis as unknown as TurnKpis;
  const explanation = buildExplanation(kpis);
  const headline = buildHeadline({
    netCashChange: kpis.net_cash_change,
    capitalAfter: kpis.capital_after,
    leveledUp: kpis.leveled_up,
    level: kpis.level,
    breakdownOccurred: kpis.breakdown_occurred,
  });

  const { data: turn } = await supabase
    .from("session_turns")
    .select("turn_number")
    .eq("id", turnId)
    .single();

  // History for the charts: every computed turn's dashboard KPIs, joined
  // to its turn_number via a plain follow-up query rather than an
  // embedded select (that pattern has broken type inference here before
  // — see turnEngine.ts comments on the same issue).
  const [{ data: allDashboards }, { data: allTurns }] = await Promise.all([
    supabase
      .from("turn_dashboards")
      .select("turn_id, kpis")
      .eq("company_id", company.id)
      .eq("department", "general"),
    supabase.from("session_turns").select("id, turn_number").eq("session_id", company.session_id),
  ]);
  const turnNumberById = new Map((allTurns ?? []).map((t) => [t.id, t.turn_number]));
  const history = (allDashboards ?? [])
    .map((d) => {
      const k = d.kpis as unknown as TurnKpis;
      const turnNumber = turnNumberById.get(d.turn_id);
      if (turnNumber === undefined) return null;
      return {
        turn_number: turnNumber,
        capital_after: k.capital_after,
        revenue: k.revenue,
        total_costs: k.revenue - k.net_cash_change,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.turn_number - b.turn_number);

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Turn {turn?.turn_number ?? ""} results
        </h1>

        <TurnRevealCard
          headline={headline}
          revenue={kpis.revenue}
          costs={kpis.revenue - kpis.net_cash_change}
          netCashChange={kpis.net_cash_change}
          capitalAfter={kpis.capital_after}
        />

        {history.length >= 2 && (
          <Card className="mb-4">
            <p className="text-bp-gold text-sm font-semibold mb-2">Capital over time</p>
            <CapitalOverTimeChart data={history} />
          </Card>
        )}
        {history.length >= 1 && (
          <Card className="mb-4">
            <p className="text-bp-gold text-sm font-semibold mb-2">Revenue vs. costs</p>
            <RevenueVsCostsChart data={history} />
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label="Units sold" value={kpis.units_sold} />
          <Stat label="Stock left" value={kpis.stock_remaining} />
          <Stat
            label="Rent & charges"
            value={`-$${kpis.rent_and_charges.toLocaleString("en-US")}`}
          />
          {kpis.payroll > 0 && (
            <Stat label="Payroll" value={`-$${kpis.payroll.toLocaleString("en-US")}`} />
          )}
          {(kpis.loan_repayment ?? 0) > 0 && (
            <Stat
              label="Loan repayment"
              value={`-$${(kpis.loan_repayment ?? 0).toLocaleString("en-US")}`}
            />
          )}
          {(kpis.insurance_premium ?? 0) > 0 && (
            <Stat
              label="Insurance premium"
              value={`-$${(kpis.insurance_premium ?? 0).toLocaleString("en-US")}`}
            />
          )}
          {(kpis.insurance_payout ?? 0) > 0 && (
            <Stat
              label="Insurance payout"
              value={`+$${(kpis.insurance_payout ?? 0).toLocaleString("en-US")}`}
            />
          )}
        </div>

        <Card>
          <p className="text-bp-gold text-sm font-semibold mb-2">Why this happened</p>
          <p className="text-bp-text text-sm leading-relaxed">{explanation}</p>
          {((kpis.marketing_bonus_pct ?? 0) > 0 || (kpis.arguments_bonus_pct ?? 0) > 0) && (
            <p className="text-bp-text-muted text-xs mt-2">
              {kpis.marketing_bonus_pct ? `Marketing added +${kpis.marketing_bonus_pct}% demand. ` : ""}
              {kpis.arguments_bonus_pct ? `Sales arguments added +${kpis.arguments_bonus_pct}% demand.` : ""}
            </p>
          )}
        </Card>

        {kpis.event_code && (
          <Card highlighted className="mt-4">
            <p className="text-bp-gold text-sm font-semibold mb-1">
              Event: {kpis.event_label ?? kpis.event_code}
            </p>
            {kpis.event_extra_cost ? (
              <p className="text-red-400 text-sm">
                Cost: -${kpis.event_extra_cost.toLocaleString("en-US")}
              </p>
            ) : (
              <p className="text-bp-text-muted text-sm">Affected demand this turn.</p>
            )}
          </Card>
        )}

        {kpis.produced_quantity !== undefined && kpis.produced_quantity > 0 && (
          <Card className="mt-4">
            <p className="text-bp-gold text-sm font-semibold mb-1">Production</p>
            <p className="text-bp-text text-sm">
              Produced {kpis.produced_quantity} units
              {kpis.production_constraint && kpis.production_constraint !== "target" && (
                <> — capped by {kpis.production_constraint}</>
              )}
            </p>
            {(kpis.defect_quantity ?? 0) > 0 && (
              <p className="text-bp-text-muted text-xs mt-1">
                {kpis.defect_quantity} defective ({kpis.defect_rate_pct}% defect rate) —{" "}
                {kpis.sellable_quantity} sellable
              </p>
            )}
            {kpis.energy_cost ? (
              <p className="text-bp-text-muted text-xs mt-1">
                Energy cost: ${kpis.energy_cost.toLocaleString("en-US")}
              </p>
            ) : null}
          </Card>
        )}

        {kpis.breakdown_occurred && (
          <Card highlighted className="mt-4">
            <p className="text-bp-gold text-sm font-semibold mb-1">Machine broke down</p>
            <p className="text-bp-text text-sm">
              No production this turn — automatic repair cost{" "}
              ${(kpis.corrective_maintenance_cost ?? 0).toLocaleString("en-US")}.
            </p>
            <p className="text-bp-text-muted text-xs mt-1">
              Scheduling preventive maintenance before wear gets high avoids this.
            </p>
          </Card>
        )}

        {kpis.leveled_up && (
          <Card highlighted className="mt-4">
            <p className="text-bp-gold text-sm font-semibold">
              Level up — you're now level {kpis.level}
            </p>
          </Card>
        )}

        {kpis.at_level_cap && !kpis.leveled_up && (
          <Card className="mt-4">
            <p className="text-bp-text text-sm">
              You've hit the free plan's level cap (level {kpis.level}). Growing
              further needs a paid upgrade.
            </p>
            <Link href={`/upgrade?company=${company.id}`} className="block mt-3">
              <Button variant="outline" fullWidth>
                See upgrade options
              </Button>
            </Link>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          <Link href={`/turn?company=${company.id}`}>
            <Button fullWidth>Continue to next turn</Button>
          </Link>
          <Link href={`/treasury?company=${company.id}`}>
            <Button variant="ghost" fullWidth>
              View treasury →
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-bp-surface border border-bp-border p-4">
      <p className="text-bp-text-muted text-xs mb-1">{label}</p>
      <p className="text-bp-text font-display font-semibold text-lg">{value}</p>
    </div>
  );
}

function buildExplanation(kpis: TurnKpis): string {
  const priceDiff = kpis.sale_price - kpis.market_reference_price;
  const priceNote =
    priceDiff < 0
      ? `You priced $${Math.abs(priceDiff).toFixed(0)} below the market reference, which pulled in more demand.`
      : priceDiff > 0
        ? `You priced $${priceDiff.toFixed(0)} above the market reference, which cost you some demand.`
        : `You priced right at the market reference.`;

  const bindingConstraint =
    kpis.units_sold < kpis.demand_captured && kpis.stock_remaining === 0
      ? "Stock ran out before demand did — you could have sold more with a bigger first order."
      : kpis.units_lost_demand > 0
        ? "Demand fell short of your target — the price or the zone's appetite limited you, not your stock."
        : "You sold exactly what you targeted.";

  return `${priceNote} ${bindingConstraint}`;
}
