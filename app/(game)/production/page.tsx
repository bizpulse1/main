import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { setProductionTarget } from "./actions";

export default async function ProductionScreen({
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
    .select("id, name")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const [{ data: machine }, { data: rawStock }] = await Promise.all([
    supabase
      .from("company_machines")
      .select("machine_catalog_id")
      .eq("company_id", company.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("inventory_lots")
      .select("item_type, quantity_on_hand")
      .eq("company_id", company.id)
      .in("item_type", ["raw_material_c1", "raw_material_c2", "packaging"]),
  ]);

  if (!machine) redirect(`/machine?company=${company.id}`);

  const { data: machineCatalog } = await supabase
    .from("machines_catalog")
    .select("nominal_capacity_per_turn")
    .eq("id", machine!.machine_catalog_id)
    .single();

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Set production target
        </h1>
        <p className="text-bp-text-muted mb-6">
          Actual output this turn is whichever is lowest: your target,
          machine capacity ({machineCatalog?.nominal_capacity_per_turn ?? "?"}{" "}
          units), or your scarcest raw material.
        </p>

        {searchParams.error === "invalid_target" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Enter a valid target (0 or more).
          </p>
        )}

        <Card className="mb-6">
          <p className="text-bp-gold text-sm font-semibold mb-2">Raw materials on hand</p>
          {(rawStock ?? []).length === 0 ? (
            <p className="text-bp-text-muted text-sm">None yet.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {(rawStock ?? []).map((s) => (
                <div key={s.item_type} className="flex justify-between">
                  <span className="text-bp-text-muted">{s.item_type}</span>
                  <span className="text-bp-text">{s.quantity_on_hand}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <form action={setProductionTarget}>
          <input type="hidden" name="company_id" value={company.id} />
          <label className="text-sm text-bp-text-muted mb-2 block" htmlFor="target_quantity">
            Target units
          </label>
          <input
            id="target_quantity"
            name="target_quantity"
            type="number"
            min={0}
            step={1}
            defaultValue={machineCatalog?.nominal_capacity_per_turn ?? 0}
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-6"
          />
          <SubmitButton>Confirm production target</SubmitButton>
        </form>
      </div>
    </main>
  );
}
