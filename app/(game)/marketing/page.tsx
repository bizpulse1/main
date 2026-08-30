import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { investInMarketing } from "./actions";

export default async function MarketingScreen({
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
    .select("id, name, capital, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const [{ data: campaigns }, { data: currentInvestments }] = await Promise.all([
    supabase.from("marketing_campaigns_catalog").select("*").order("cost_per_turn"),
    supabase
      .from("company_marketing_investments")
      .select("campaign_id")
      .eq("company_id", company.id)
      .eq("turn_id", turn.id),
  ]);

  const selectedIds = new Set((currentInvestments ?? []).map((i) => i.campaign_id));

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Marketing
        </h1>
        <p className="text-bp-text-muted mb-6">
          Spend now, boosts demand this turn only — pick as many as you can
          afford.
        </p>

        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for that combination — deselect one.
          </p>
        )}

        <form action={investInMarketing}>
          <input type="hidden" name="company_id" value={company.id} />
          <div className="space-y-3 mb-6">
            {(campaigns ?? []).map((c) => (
              <label key={c.id} className="block cursor-pointer">
                <input
                  type="checkbox"
                  name="campaign_id"
                  value={c.id}
                  defaultChecked={selectedIds.has(c.id)}
                  className="peer sr-only"
                />
                <Card className="peer-checked:border-bp-gold peer-checked:shadow-gold-glow">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-bp-text font-medium">{c.label}</p>
                      <p className="text-bp-text-muted text-xs">
                        +{((c.awareness_effect ?? 0) * 100).toFixed(0)}% demand this turn
                      </p>
                    </div>
                    <span className="text-bp-gold text-sm">
                      ${(c.cost_per_turn ?? 0).toLocaleString("en-US")}
                    </span>
                  </div>
                </Card>
              </label>
            ))}
          </div>
          <SubmitButton>Confirm marketing spend</SubmitButton>
        </form>
      </div>
    </main>
  );
}
