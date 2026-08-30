"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function submitPricing(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const salePriceRaw = formData.get("sale_price") as string | null;
  const targetRaw = formData.get("sales_target") as string | null;
  const salePrice = salePriceRaw ? parseFloat(salePriceRaw) : NaN;
  const salesTarget = targetRaw ? parseInt(targetRaw, 10) : NaN;

  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    redirect(`/setup/pricing?company=${companyId}&error=invalid_price`);
  }
  if (!Number.isFinite(salesTarget) || salesTarget < 0) {
    redirect(`/setup/pricing?company=${companyId}&error=invalid_target`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // upsert, not insert: revisiting this screen before the turn locks
  // should let the player revise price/target, not create a duplicate
  // decision row for the same turn+range.
  const { error } = await supabase.from("company_pricing_decisions").upsert(
    {
      company_id: companyId,
      turn_id: turn.id,
      range_code: "reference",
      sale_price: salePrice,
      sales_target_quantity: salesTarget,
    },
    { onConflict: "company_id,turn_id,range_code" }
  );
  if (error) {
    throw new Error(error.message);
  }

  redirect(`/setup/ready?company=${companyId}`);
}
