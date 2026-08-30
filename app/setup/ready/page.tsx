import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { SubmitButton } from "@/components/SubmitButton";
import { submitTurn } from "./actions";

export default async function ReadyScreen({
  searchParams,
}: {
  searchParams: { company?: string };
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

  const [{ data: depot }, { data: supplierRel }, { data: order }, { data: pricing }] =
    await Promise.all([
      supabase
        .from("company_premises")
        .select("premises_option_id")
        .eq("company_id", company.id)
        .is("released_turn_id", null)
        .maybeSingle(),
      supabase
        .from("company_supplier_relationships")
        .select("finished_goods_supplier_id")
        .eq("company_id", company.id)
        .eq("supplier_kind", "finished_goods")
        .maybeSingle(),
      supabase
        .from("purchase_orders")
        .select("quantity, unit_price")
        .eq("company_id", company.id)
        .maybeSingle(),
      supabase
        .from("company_pricing_decisions")
        .select("sale_price, sales_target_quantity")
        .eq("company_id", company.id)
        .maybeSingle(),
    ]);

  let depotSize: number | null = null;
  if (depot) {
    const { data: option } = await supabase
      .from("premises_options")
      .select("size_sqm")
      .eq("id", depot.premises_option_id)
      .single();
    depotSize = option?.size_sqm ?? null;
  }

  let supplierCode: string | null = null;
  if (supplierRel?.finished_goods_supplier_id) {
    const { data: supplier } = await supabase
      .from("finished_goods_suppliers")
      .select("code")
      .eq("id", supplierRel.finished_goods_supplier_id)
      .single();
    supplierCode = supplier?.code ?? null;
  }

  const allComplete = Boolean(depot && supplierRel && order && pricing);

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Ready for turn {turn.turn_number}?
        </h1>

        <div className="rounded-xl bg-bp-surface border border-bp-border divide-y divide-bp-border mb-6">
          <SummaryRow label="Depot" value={depotSize ? `${depotSize} m²` : "Not set"} />
          <SummaryRow label="Supplier" value={supplierCode ?? "Not set"} />
          <SummaryRow
            label="Purchase"
            value={
              order ? `${order.quantity} units @ $${order.unit_price}` : "Not set"
            }
          />
          <SummaryRow
            label="Pricing"
            value={
              pricing
                ? `$${pricing.sale_price}, target ${pricing.sales_target_quantity} units`
                : "Not set"
            }
          />
          <SummaryRow
            label="Capital remaining"
            value={`$${company.capital.toLocaleString("en-US")}`}
          />
        </div>

        {!allComplete && (
          <p className="mb-4 text-sm text-bp-text-muted">
            Finish every decision above before submitting the turn.
          </p>
        )}

        <form action={submitTurn}>
          <input type="hidden" name="company_id" value={company.id} />
          <SubmitButton>Submit turn {turn.turn_number}</SubmitButton>
        </form>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-bp-text-muted text-sm">{label}</span>
      <span className="text-bp-text font-medium">{value}</span>
    </div>
  );
}
