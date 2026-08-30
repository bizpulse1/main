import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupplierSelector } from "./SupplierSelector";

export default async function SupplierScreen({
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
    .select("id, name")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  // Enforce the intended order: depot before supplier.
  const { data: depot } = await supabase
    .from("company_premises")
    .select("id")
    .eq("company_id", company.id)
    .is("released_turn_id", null)
    .maybeSingle();
  if (!depot) redirect(`/setup/depot?company=${company.id}`);

  const [{ data: suppliers }, { data: prices }] = await Promise.all([
    supabase.from("finished_goods_suppliers").select("*").order("code"),
    supabase.from("finished_goods_prices").select("*"),
  ]);

  if (!suppliers || suppliers.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-bp-text-muted">
          No suppliers configured yet — run biz_pulse_seed_data.sql against
          your Supabase project.
        </p>
      </main>
    );
  }

  const options = suppliers.map((s) => ({
    ...s,
    prices: (prices ?? []).filter((p) => p.supplier_id === s.id),
  }));

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Choose your supplier
        </h1>
        <p className="text-bp-text-muted mb-6">
          Cheaper suppliers cut your cost per unit but ship less reliably —
          weigh price against how often you'll actually get what you ordered.
        </p>
        <SupplierSelector companyId={company.id} options={options} />
      </div>
    </main>
  );
}
