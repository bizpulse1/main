import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DepotSelector } from "./DepotSelector";

export default async function DepotScreen({
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
    .select("*")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: options } = await supabase
    .from("premises_options")
    .select("*")
    .eq("category", "storage_commercial")
    .order("size_sqm", { ascending: true });

  if (!options || options.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">
          No depot options configured yet — run biz_pulse_seed_data.sql
          against your Supabase project.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Choose your depot
        </h1>
        <p className="text-bp-text-muted mb-6">
          Bigger space costs more per turn but lets you hold more stock —
          you won't be able to change this without releasing it later.
        </p>
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            You don't have enough capital for that deposit — pick a smaller
            depot.
          </p>
        )}
        <DepotSelector
          companyId={company.id}
          options={options}
          capital={company.capital}
        />
      </div>
    </main>
  );
}
