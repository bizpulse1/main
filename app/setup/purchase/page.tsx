import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "./PurchaseForm";

export default async function PurchaseScreen({
  searchParams,
}: {
  searchParams: { company?: string; error?: string; moq?: string };
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
    .select("finished_goods_supplier_id")
    .eq("company_id", company.id)
    .eq("supplier_kind", "finished_goods")
    .maybeSingle();
  if (!relationship || !relationship.finished_goods_supplier_id) {
    redirect(`/setup/supplier?company=${company.id}`);
  }

  const [{ data: supplier }, { data: priceRow }] = await Promise.all([
    supabase
      .from("finished_goods_suppliers")
      .select("code, moq")
      .eq("id", relationship!.finished_goods_supplier_id!)
      .single(),
    supabase
      .from("finished_goods_prices")
      .select("unit_price")
      .eq("supplier_id", relationship!.finished_goods_supplier_id!)
      .eq("range_code", "reference")
      .single(),
  ]);

  if (!supplier || !priceRow) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">
          Missing supplier price data — run biz_pulse_seed_data.sql against
          your Supabase project.
        </p>
      </main>
    );
  }

  const { data: existingInventory } = await supabase
    .from("inventory_lots")
    .select("quantity_on_hand")
    .eq("company_id", company.id)
    .eq("range_code", "reference")
    .maybeSingle();
  const isFirstPurchase = !existingInventory || existingInventory.quantity_on_hand === 0;

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          {isFirstPurchase ? "First purchase" : "Restock"} — {supplier.code}
        </h1>
        <p className="text-bp-text-muted mb-6">
          {isFirstPurchase
            ? "This stock is what you'll actually have to sell this turn. Paid in full now — deferred payment terms unlock later with a track record."
            : "Adding to your existing stock. Paid in full now — deferred payment terms unlock later with a track record."}
        </p>

        {searchParams.error === "below_moq" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Order must meet the minimum of {searchParams.moq} units.
          </p>
        )}
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital for that order size — order fewer units.
          </p>
        )}

        <PurchaseForm
          companyId={company.id}
          moq={supplier.moq ?? 1}
          unitPrice={priceRow.unit_price}
          capital={company.capital}
        />
      </div>
    </main>
  );
}
