import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { selectRawSupplier } from "./actions";

export default async function RawSupplierScreen({
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
    .select("id, name, activity_type")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");
  if (company.activity_type !== "industrial") redirect(`/turn?company=${company.id}`);

  const { data: machine } = await supabase
    .from("company_machines")
    .select("id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .maybeSingle();
  if (!machine) redirect(`/machine?company=${company.id}`);

  const { data: suppliers } = await supabase
    .from("raw_material_suppliers")
    .select("*")
    .order("code");

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Choose your raw material supplier
        </h1>
        <p className="text-bp-text-muted mb-6">
          Cheaper suppliers cost less but ship less reliably — same
          trade-off as your finished-goods supplier.
        </p>

        <form action={selectRawSupplier}>
          <input type="hidden" name="company_id" value={company.id} />
          <div className="space-y-3 mb-6">
            {(suppliers ?? []).map((s, i) => (
              <label key={s.id} className="block cursor-pointer">
                <input
                  type="radio"
                  name="supplier_id"
                  value={s.id}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <Card className="peer-checked:border-bp-gold peer-checked:shadow-gold-glow">
                  <div className="flex justify-between items-baseline">
                    <p className="font-display font-semibold text-bp-text">{s.code}</p>
                    <p className="text-bp-gold text-sm">
                      {s.price_coefficient}× baseline cost
                    </p>
                  </div>
                  <p className="text-sm text-bp-text-muted mt-1">{s.profile_label}</p>
                  <div className="flex gap-4 mt-2 text-xs text-bp-text-muted">
                    <span>MOQ: {s.moq}</span>
                    <span>On-time: {s.on_time_delivery_rate}%</span>
                  </div>
                </Card>
              </label>
            ))}
          </div>
          <SubmitButton>Confirm supplier</SubmitButton>
        </form>
      </div>
    </main>
  );
}
