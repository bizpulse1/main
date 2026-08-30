import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { purchaseAssemblyLine } from "./actions";

export default async function AssemblyLineScreen({
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
    .select("id, name, capital, activity_type")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");
  if (company.activity_type !== "industrial") redirect(`/turn?company=${company.id}`);

  const { data: existing } = await supabase
    .from("company_assembly_lines")
    .select("id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing) redirect(`/turn?company=${company.id}`);

  const { data: catalogLine } = await supabase
    .from("assembly_lines_catalog")
    .select("*")
    .eq("range_code", "reference")
    .single();

  if (!catalogLine) {
    return (
      <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">
          No assembly line configured yet — run biz_pulse_seed_data.sql.
        </p>
      </main>
    );
  }

  const totalCost = catalogLine.price + catalogLine.install_cost;

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Add an assembly line
        </h1>
        <p className="text-bp-text-muted mb-6">
          Runs alongside your machine, adding capacity — not a
          replacement, an expansion.
        </p>

        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for this.
          </p>
        )}

        <Card highlighted className="mb-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-bp-text-muted">Price + install</span>
              <span className="text-bp-gold">${totalCost.toLocaleString("en-US")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bp-text-muted">Extra capacity</span>
              <span className="text-bp-text">+{catalogLine.capacity_per_turn} units/turn</span>
            </div>
          </div>
        </Card>

        <form action={purchaseAssemblyLine}>
          <input type="hidden" name="company_id" value={company.id} />
          <SubmitButton>Buy assembly line</SubmitButton>
        </form>
      </div>
    </main>
  );
}
