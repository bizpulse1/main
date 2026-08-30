"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function selectSupplier(formData: FormData) {
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

  // Already has a finished-goods supplier — don't let a resubmit create a
  // second relationship. Supplier changes later become their own decision,
  // not a side effect of revisiting this screen.
  const { data: existing } = await supabase
    .from("company_supplier_relationships")
    .select("id")
    .eq("company_id", companyId)
    .eq("supplier_kind", "finished_goods")
    .maybeSingle();
  if (existing) {
    redirect(`/setup/purchase?company=${companyId}`);
  }

  const { data: supplier } = await supabase
    .from("finished_goods_suppliers")
    .select("id, default_payment_term")
    .eq("id", supplierId)
    .single();
  if (!supplier) {
    throw new Error("Selected supplier no longer exists");
  }

  const { error } = await supabase.from("company_supplier_relationships").insert({
    company_id: companyId,
    supplier_kind: "finished_goods",
    finished_goods_supplier_id: supplierId,
    payment_term_unlocked: supplier.default_payment_term,
  });
  if (error) {
    throw new Error(error.message);
  }

  redirect(`/setup/purchase?company=${companyId}`);
}
