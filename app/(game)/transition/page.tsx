import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import {
  checkTransitionEligibility,
  TRANSITION_MIN_LEVEL,
  TRANSITION_MIN_CAPITAL,
  TRANSITION_COST,
} from "@/lib/game/industrialTransition";
import { beginTransition } from "./actions";

export default async function TransitionScreen({
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
    .select("id, name, capital, current_level, activity_type")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (company.activity_type === "industrial") {
    redirect(`/turn?company=${company.id}`);
  }

  const eligibility = checkTransitionEligibility(company.current_level, company.capital);

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Go industrial
        </h1>
        <p className="text-bp-text-muted mb-6">
          Moving to production is a one-way, costly step. Commercial
          operations stay as they are — this adds a manufacturing side,
          not a replacement.
        </p>

        {searchParams.error === "not_eligible" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            You don't meet the requirements yet.
          </p>
        )}

        <Card className="mb-4">
          <p className="text-bp-gold text-sm font-semibold mb-3">Requirements</p>
          <ChecklistRow
            met={eligibility.meetsLevel}
            label={`Level ${TRANSITION_MIN_LEVEL}+`}
            current={`You're level ${company.current_level}`}
          />
          <ChecklistRow
            met={eligibility.meetsCapital}
            label={`$${TRANSITION_MIN_CAPITAL.toLocaleString("en-US")} capital`}
            current={`You have $${company.capital.toLocaleString("en-US")}`}
          />
        </Card>

        <Card highlighted className="mb-6">
          <div className="flex justify-between">
            <span className="text-bp-text-muted text-sm">Transition cost</span>
            <span className="text-bp-gold font-semibold">
              ${TRANSITION_COST.toLocaleString("en-US")}
            </span>
          </div>
        </Card>

        <form action={beginTransition}>
          <input type="hidden" name="company_id" value={company.id} />
          <SubmitButton disabled={!eligibility.eligible}>
            {eligibility.eligible ? "Begin transition" : "Requirements not met"}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}

function ChecklistRow({
  met,
  label,
  current,
}: {
  met: boolean;
  label: string;
  current: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className={met ? "text-bp-text" : "text-bp-text-muted"}>{label}</p>
        <p className="text-xs text-bp-text-muted">{current}</p>
      </div>
      <span className={met ? "text-bp-gold" : "text-bp-text-muted"}>
        {met ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
      </span>
    </div>
  );
}
