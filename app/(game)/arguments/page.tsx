import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { ArgumentsSelector } from "./ArgumentsSelector";

export default async function ArgumentsScreen({
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
    .select("id, name, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const [{ data: options }, { data: current }] = await Promise.all([
    supabase
      .from("sales_arguments_catalog")
      .select("id, label")
      .eq("range_code", "reference"),
    supabase
      .from("company_sales_arguments_used")
      .select("argument_1_id, argument_2_id")
      .eq("company_id", company.id)
      .eq("turn_id", turn.id)
      .maybeSingle(),
  ]);

  const initialSelected = [current?.argument_1_id, current?.argument_2_id].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Sales arguments
        </h1>
        <p className="text-bp-text-muted mb-6">
          Pick up to 2 — free, but only a small edge each. Choose the ones
          that are actually true about your offer.
        </p>

        {searchParams.error === "too_many" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Pick at most 2.
          </p>
        )}

        <ArgumentsSelector
          companyId={company.id}
          options={options ?? []}
          initialSelected={initialSelected}
        />
      </div>
    </main>
  );
}
