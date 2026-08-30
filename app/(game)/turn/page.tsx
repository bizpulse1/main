import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ActivityTicker } from "@/components/ActivityTicker";

export default async function TurnHub({
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
    .select("*")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  if (turn.status === "computed") {
    redirect(`/dashboard?company=${company.id}&turn=${turn.id}`);
  }

  // The dashboard is otherwise only reached automatically right after
  // submitting a turn — there's no way back to it once you've moved on
  // to the next turn's decisions. Show a persistent link to the most
  // recently computed turn's results, whenever one exists.
  const [{ data: dashboardTurnIds }, { data: sessionTurns }] = await Promise.all([
    supabase
      .from("turn_dashboards")
      .select("turn_id")
      .eq("company_id", company.id)
      .eq("department", "general"),
    supabase
      .from("session_turns")
      .select("id, turn_number")
      .eq("session_id", company.session_id),
  ]);
  const dashboardTurnIdSet = new Set((dashboardTurnIds ?? []).map((d) => d.turn_id));
  const lastDashboardTurn = (sessionTurns ?? [])
    .filter((t) => dashboardTurnIdSet.has(t.id))
    .sort((a, b) => b.turn_number - a.turn_number)[0];

  const { data: inventory } = await supabase
    .from("inventory_lots")
    .select("quantity_on_hand, unit_cost")
    .eq("company_id", company.id)
    .eq("range_code", "reference")
    .maybeSingle();

  const { data: pricingDone } = await supabase
    .from("company_pricing_decisions")
    .select("id")
    .eq("company_id", company.id)
    .eq("turn_id", turn.id)
    .maybeSingle();

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Turn {turn.turn_number}
        </h1>

        {lastDashboardTurn && (
          <Link
            href={`/dashboard?company=${company.id}&turn=${lastDashboardTurn.id}`}
            className="block mb-6"
          >
            <span className="text-bp-gold text-sm underline">
              View last turn's results →
            </span>
          </Link>
        )}

        <ActivityTicker sessionId={company.session_id} myCompanyId={company.id} />

        <Card className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-bp-text-muted">Capital</span>
            <span className="text-bp-text">
              ${company.capital.toLocaleString("en-US")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-bp-text-muted">Stock on hand</span>
            <span className="text-bp-text">
              {inventory?.quantity_on_hand?.toLocaleString("en-US") ?? 0} units
            </span>
          </div>
        </Card>

        <div className="space-y-3">
          <Link href={`/setup/purchase?company=${company.id}`}>
            <Button variant="outline" fullWidth>
              {inventory && inventory.quantity_on_hand > 0
                ? "Order more stock"
                : "Order stock"}
            </Button>
          </Link>
          {inventory ? (
            <Link
              href={
                pricingDone
                  ? `/setup/ready?company=${company.id}`
                  : `/setup/pricing?company=${company.id}`
              }
            >
              <Button fullWidth>
                {pricingDone ? "Review & submit turn" : "Set price"}
              </Button>
            </Link>
          ) : (
            <Button fullWidth disabled>
              Set price
            </Button>
          )}
        </div>
        {!inventory && (
          <p className="text-sm text-bp-text-muted mt-4 text-center">
            You need stock before you can set a price.
          </p>
        )}

        <Link href={`/treasury?company=${company.id}`} className="block mt-6">
          <Button variant="ghost" fullWidth>
            View treasury →
          </Button>
        </Link>
        <Link href={`/bank?company=${company.id}`} className="block mt-3">
          <Button variant="ghost" fullWidth>
            Take a loan →
          </Button>
        </Link>
        <Link href={`/insurance?company=${company.id}`} className="block mt-3">
          <Button variant="ghost" fullWidth>
            Insurance →
          </Button>
        </Link>
        <Link href={`/hr?company=${company.id}`} className="block mt-3">
          <Button variant="ghost" fullWidth>
            Manage team →
          </Button>
        </Link>
        <Link href={`/marketing?company=${company.id}`} className="block mt-3">
          <Button variant="ghost" fullWidth>
            Marketing →
          </Button>
        </Link>
        <Link href={`/arguments?company=${company.id}`} className="block mt-3">
          <Button variant="ghost" fullWidth>
            Sales arguments →
          </Button>
        </Link>
        {company.activity_type === "commercial" && (
          <Link href={`/transition?company=${company.id}`} className="block mt-3">
            <Button variant="ghost" fullWidth>
              Go industrial →
            </Button>
          </Link>
        )}
        {company.activity_type === "industrial" && (
          <>
            <Link href={`/machine?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                Machine →
              </Button>
            </Link>
            <Link href={`/raw-supplier?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                Raw materials →
              </Button>
            </Link>
            <Link href={`/production?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                Production target →
              </Button>
            </Link>
            <Link href={`/maintenance?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                Maintenance →
              </Button>
            </Link>
            <Link href={`/assembly-line?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                Assembly line →
              </Button>
            </Link>
            <Link href={`/rd?company=${company.id}`} className="block mt-3">
              <Button variant="ghost" fullWidth>
                R&D →
              </Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
