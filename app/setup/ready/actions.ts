"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { resolveTurn } from "@/lib/game/turnEngine";

export async function submitTurn(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Already resolved (e.g. a resubmit after navigating back) — don't
  // recompute, just show the result again.
  if (turn.status === "computed") {
    redirect(`/dashboard?company=${companyId}&turn=${turn.id}`);
  }

  // Verify prerequisites before locking anything, each redirecting back
  // to the specific incomplete screen:
  // - depot & supplier are persistent, one-time choices (not per-turn)
  // - pricing is required EVERY turn (turn-scoped check)
  // - a purchase order is NOT required every turn — you can sell down
  //   existing stock without buying more — but you need to have bought
  //   *something*, ever, or there's nothing to sell. That's an inventory
  //   check, not a "did you order this turn" check.
  const [{ data: depot }, { data: supplierRel }, { data: inventory }, { data: pricing }] =
    await Promise.all([
      supabase
        .from("company_premises")
        .select("id")
        .eq("company_id", companyId)
        .is("released_turn_id", null)
        .maybeSingle(),
      supabase
        .from("company_supplier_relationships")
        .select("id")
        .eq("company_id", companyId)
        .eq("supplier_kind", "finished_goods")
        .maybeSingle(),
      supabase
        .from("inventory_lots")
        .select("id")
        .eq("company_id", companyId)
        .eq("range_code", "reference")
        .maybeSingle(),
      supabase
        .from("company_pricing_decisions")
        .select("id")
        .eq("company_id", companyId)
        .eq("turn_id", turn.id)
        .maybeSingle(),
    ]);

  if (!depot) redirect(`/setup/depot?company=${companyId}`);
  if (!supplierRel) redirect(`/setup/supplier?company=${companyId}`);
  if (!inventory) redirect(`/setup/purchase?company=${companyId}`);
  if (!pricing) redirect(`/setup/pricing?company=${companyId}`);

  await supabase
    .from("session_turns")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", turn.id);

  await resolveTurn(supabase, companyId, turn.id);

  redirect(`/dashboard?company=${companyId}&turn=${turn.id}`);
}
