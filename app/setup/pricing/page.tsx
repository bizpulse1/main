import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingForm } from "./PricingForm";

export default async function PricingScreen({
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

  const [{ data: inventory }, { data: range }] = await Promise.all([
    supabase
      .from("inventory_lots")
      .select("quantity_on_hand, unit_cost")
      .eq("company_id", company.id)
      .eq("range_code", "reference")
      .order("quantity_on_hand", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("product_ranges")
      .select("reference_market_price")
      .eq("code", "reference")
      .single(),
  ]);

  if (!inventory) {
    redirect(`/setup/purchase?company=${company.id}`);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Set your price
        </h1>
        <p className="text-bp-text-muted mb-6">
          Price too high and demand walks away; too low and you're leaving
          margin on the table. There's no single right answer here.
        </p>

        {searchParams.error === "invalid_price" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Enter a valid sale price above zero.
          </p>
        )}
        {searchParams.error === "invalid_target" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Sales target can't be negative.
          </p>
        )}

        <PricingForm
          companyId={company.id}
          unitCost={inventory!.unit_cost}
          marketReference={range?.reference_market_price ?? inventory!.unit_cost * 1.3}
          stockOnHand={inventory!.quantity_on_hand}
        />
      </div>
    </main>
  );
}
