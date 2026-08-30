"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function selectRawSupplier(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const supplierId = formData.get("supplier_id") as string | null;
  if (!companyId || !supplierId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: existing } = await supabase
    .from("company_supplier_relationships")
    .select("id")
    .eq("company_id", companyId)
    .eq("supplier_kind", "raw_material")
    .maybeSingle();
  if (existing) {
    redirect(`/raw-purchase?company=${companyId}`);
  }

  const { data: supplier } = await supabase
    .from("raw_material_suppliers")
    .select("id, default_payment_term")
    .eq("id", supplierId)
    .single();
  if (!supplier) {
    throw new Error("Selected supplier no longer exists");
  }

  const { error } = await supabase.from("company_supplier_relationships").insert({
    company_id: companyId,
    supplier_kind: "raw_material",
    raw_material_supplier_id: supplierId,
    payment_term_unlocked: supplier.default_payment_term ?? "cash",
  });
  if (error) throw new Error(error.message);

  redirect(`/raw-purchase?company=${companyId}`);
}
