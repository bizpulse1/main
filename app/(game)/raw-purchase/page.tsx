import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { purchaseRawMaterials } from "./actions";

export default async function RawPurchaseScreen({
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

  const { data: relationship } = await supabase
    .from("company_supplier_relationships")
    .select("raw_material_supplier_id")
    .eq("company_id", company.id)
    .eq("supplier_kind", "raw_material")
    .maybeSingle();
  if (!relationship || !relationship.raw_material_supplier_id) {
    redirect(`/raw-supplier?company=${company.id}`);
  }

  const [{ data: supplier }, { data: bom }] = await Promise.all([
    supabase
      .from("raw_material_suppliers")
      .select("code, price_coefficient")
      .eq("id", relationship!.raw_material_supplier_id!)
      .single(),
    supabase
      .from("bill_of_materials")
      .select("component_code, target_cost")
      .eq("range_code", "reference"),
  ]);

  if (!supplier || !bom) {
    return (
      <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">Missing data — check seed data.</p>
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
          Buy raw materials — {supplier.code}
        </h1>
        <p className="text-bp-text-muted mb-6">
          Stock up on what your machine needs to actually produce
          something — running short on any one component caps output.
        </p>

        {searchParams.error === "nothing_selected" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Enter a quantity for at least one component.
          </p>
        )}
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for that order.
          </p>
        )}

        <form action={purchaseRawMaterials}>
          <input type="hidden" name="company_id" value={company.id} />
          <div className="space-y-4 mb-6">
            {bom.map((line) => {
              const unitCost = (line.target_cost ?? 0) * supplier.price_coefficient;
              return (
                <Card key={line.component_code}>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-bp-text font-medium">{line.component_code}</p>
                    <p className="text-bp-gold text-sm">
                      ${unitCost.toFixed(2)}/unit
                    </p>
                  </div>
                  <input
                    type="number"
                    name={`qty_${line.component_code}`}
                    min={0}
                    step={1}
                    defaultValue={0}
                    className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-3 text-bp-text focus:outline-none focus:border-bp-gold"
                  />
                </Card>
              );
            })}
          </div>
          <SubmitButton>Place order</SubmitButton>
        </form>
      </div>
    </main>
  );
}
