"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function setProductionTarget(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const raw = formData.get("target_quantity") as string | null;
  const targetQuantity = raw ? parseFloat(raw) : NaN;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (!Number.isFinite(targetQuantity) || targetQuantity < 0) {
    redirect(`/production?company=${companyId}&error=invalid_target`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Delete-then-insert: production_orders has no unique constraint on
  // (company_id, turn_id, range_code) the way pricing decisions do, so
  // revising this turn's target means replace, not insert-and-collide.
  await supabase
    .from("production_orders")
    .delete()
    .eq("company_id", companyId)
    .eq("turn_id", turn.id)
    .eq("range_code", "reference");

  const { error } = await supabase.from("production_orders").insert({
    company_id: companyId,
    turn_id: turn.id,
    range_code: "reference",
    target_quantity: targetQuantity,
    produced_quantity: 0,
    defect_quantity: 0,
    rework_quantity: 0,
  });
  if (error) throw new Error(error.message);

  redirect(`/turn?company=${companyId}`);
}
