import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { getNextEligibleRdLevel, computeRdDefectBonus } from "@/lib/game/rd";
import { startRdProject } from "./actions";

export default async function RdScreen({
  searchParams,
}: {
  searchParams: { company?: string; error?: string; result?: string };
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

  const { data: pastProjects } = await supabase
    .from("company_rd_projects")
    .select("level, status")
    .eq("company_id", company.id);
  const successfulLevels = (pastProjects ?? [])
    .filter((p) => p.status === "success")
    .map((p) => p.level);
  const nextLevel = getNextEligibleRdLevel(successfulLevels);
  const currentBonus = computeRdDefectBonus(successfulLevels.length);

  const { data: levelInfo } = await supabase
    .from("rd_levels_catalog")
    .select("*")
    .eq("level", nextLevel)
    .single();

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Research & Development
        </h1>
        <p className="text-bp-text-muted mb-6">
          Each successful level permanently lowers your defect rate.
          Failed attempts still cost the full amount — that's the risk.
        </p>

        {searchParams.result === "success" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-bp-gold/40 px-4 py-3 text-sm text-bp-gold">
            Success — your defect rate just improved.
          </p>
        )}
        {searchParams.result === "failed" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            The project failed. The cost is gone, but you can try the same
            level again next time.
          </p>
        )}
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for this level.
          </p>
        )}

        <Card className="mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-bp-text-muted">Completed levels</span>
            <span className="text-bp-text">{successfulLevels.length} / 12</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-bp-text-muted">Current defect-rate bonus</span>
            <span className="text-bp-gold">
              −{(currentBonus * 100).toFixed(1)}%
            </span>
          </div>
        </Card>

        {levelInfo ? (
          <>
            <Card highlighted className="mb-6">
              <p className="font-display font-semibold text-bp-text mb-2">
                Level {levelInfo.level}: {levelInfo.label}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-bp-text-muted">Cost</span>
                  <span className="text-bp-gold">
                    ${(levelInfo.cost ?? 0).toLocaleString("en-US")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bp-text-muted">Risk of failure</span>
                  <span className="text-bp-text">{levelInfo.base_risk_pct}%</span>
                </div>
              </div>
            </Card>

            <form action={startRdProject}>
              <input type="hidden" name="company_id" value={company.id} />
              <SubmitButton>Start this project</SubmitButton>
            </form>
          </>
        ) : (
          <p className="text-bp-text-muted text-sm">
            All 12 levels completed — nothing left to research.
          </p>
        )}
      </div>
    </main>
  );
}
