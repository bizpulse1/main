import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { purchaseMachine } from "./actions";

export default async function MachineScreen({
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

  const { data: existingMachine } = await supabase
    .from("company_machines")
    .select("id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (existingMachine) redirect(`/production?company=${company.id}`);

  const { data: machine } = await supabase.from("machines_catalog").select("*").limit(1).single();

  if (!machine) {
    return (
      <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">
          No machine configured yet — run biz_pulse_seed_data.sql.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Buy your machine
        </h1>
        <p className="text-bp-text-muted mb-6">
          One machine, cash only for now — financing options come later.
        </p>

        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for this machine.
          </p>
        )}

        <Card highlighted className="mb-6">
          <p className="font-display font-semibold text-bp-text mb-2">{machine.name}</p>
          <div className="space-y-1 text-sm text-bp-text-muted">
            <div className="flex justify-between">
              <span>Price</span>
              <span className="text-bp-gold">${machine.price.toLocaleString("en-US")}</span>
            </div>
            <div className="flex justify-between">
              <span>Capacity</span>
              <span>{machine.nominal_capacity_per_turn} units/turn</span>
            </div>
            <div className="flex justify-between">
              <span>Footprint</span>
              <span>{machine.footprint_sqm} m²</span>
            </div>
          </div>
        </Card>

        <form action={purchaseMachine}>
          <input type="hidden" name="company_id" value={company.id} />
          <SubmitButton>Buy machine</SubmitButton>
        </form>
      </div>
    </main>
  );
}
