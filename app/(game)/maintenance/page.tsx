import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { MAINTENANCE_COST, MAINTENANCE_WEAR_REDUCTION } from "@/lib/game/maintenance";
import { scheduleMaintenance } from "./actions";

const BREAKDOWN_WEAR_THRESHOLD = 70;

export default async function MaintenanceScreen({
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

  const { data: machine } = await supabase
    .from("company_machines")
    .select("id, wear_pct, cumulative_production")
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (!machine) redirect(`/machine?company=${company.id}`);

  const atRisk = machine!.wear_pct >= BREAKDOWN_WEAR_THRESHOLD;

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Machine maintenance
        </h1>
        <p className="text-bp-text-muted mb-6">
          Wear builds up with every unit produced. High wear means more
          defects and a real chance of breaking down mid-turn.
        </p>

        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for maintenance right now.
          </p>
        )}

        <Card highlighted={atRisk} className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-bp-text-muted text-sm">Wear</span>
            <span className={atRisk ? "text-red-400 font-semibold" : "text-bp-text"}>
              {machine!.wear_pct}%
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-bp-text-muted text-sm">Lifetime production</span>
            <span className="text-bp-text">{machine!.cumulative_production} units</span>
          </div>
          {atRisk && (
            <p className="text-red-400 text-xs mt-2">
              Above {BREAKDOWN_WEAR_THRESHOLD}% wear — real risk of breaking
              down this turn without maintenance.
            </p>
          )}
        </Card>

        <form action={scheduleMaintenance}>
          <input type="hidden" name="company_id" value={company.id} />
          <SubmitButton>
            Schedule preventive maintenance — ${MAINTENANCE_COST.toLocaleString("en-US")}{" "}
            (−{MAINTENANCE_WEAR_REDUCTION}% wear)
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
