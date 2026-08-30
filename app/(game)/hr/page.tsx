import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROLE_CATALOG, TRAINING_COST, TRAINING_COMPETENCY_GAIN } from "@/lib/game/hrCatalog";
import { hireWorker, trainWorker } from "./actions";

export default async function HrScreen({
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

  const { data: workers } = await supabase
    .from("workers")
    .select("id, role, base_salary, competency_pct, satisfaction_pct")
    .eq("company_id", company.id)
    .eq("status", "active");

  const totalPayroll = (workers ?? []).reduce((sum, w) => sum + w.base_salary, 0);

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Team
        </h1>
        <p className="text-bp-text-muted mb-6">
          Salaries are paid every turn — hiring adds to your fixed costs
          starting next resolution, whether you sell anything or not.
        </p>

        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital to train right now.
          </p>
        )}

        {totalPayroll > 0 && (
          <Card className="mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-bp-text-muted">Total payroll / turn</span>
              <span className="text-bp-text">${totalPayroll.toLocaleString("en-US")}</span>
            </div>
          </Card>
        )}

        {(workers ?? []).length > 0 && (
          <div className="space-y-3 mb-6">
            {workers!.map((w) => (
              <Card key={w.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-display font-semibold text-bp-text">
                    {ROLE_CATALOG[w.role as keyof typeof ROLE_CATALOG]?.label ?? w.role}
                  </p>
                  <p className="text-bp-gold text-sm">
                    ${w.base_salary.toLocaleString("en-US")}/turn
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-bp-text-muted mb-3">
                  <span>Competency: {w.competency_pct}%</span>
                  <span>Satisfaction: {w.satisfaction_pct}%</span>
                </div>
                {w.competency_pct < 100 ? (
                  <form action={trainWorker}>
                    <input type="hidden" name="company_id" value={company.id} />
                    <input type="hidden" name="worker_id" value={w.id} />
                    <Button variant="outline" type="submit" fullWidth>
                      Train (+{TRAINING_COMPETENCY_GAIN}% — ${TRAINING_COST})
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-bp-gold text-center">Fully trained</p>
                )}
              </Card>
            ))}
          </div>
        )}

        <h2 className="font-display text-lg font-semibold text-bp-text mb-3">
          Hire
        </h2>
        <div className="space-y-3">
          {Object.entries(ROLE_CATALOG).map(([role, info]) => (
            <form key={role} action={hireWorker}>
              <input type="hidden" name="company_id" value={company.id} />
              <input type="hidden" name="role" value={role} />
              <button type="submit" className="w-full text-left">
                <Card>
                  <div className="flex justify-between items-center">
                    <span className="text-bp-text">{info.label}</span>
                    <span className="text-bp-gold text-sm">
                      ${info.defaultSalary.toLocaleString("en-US")}/turn
                    </span>
                  </div>
                </Card>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
