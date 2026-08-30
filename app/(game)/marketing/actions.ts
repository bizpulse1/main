"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function investInMarketing(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const campaignIds = formData.getAll("campaign_id") as string[];
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (campaignIds.length === 0) {
    redirect(`/turn?company=${companyId}`);
  }

  const { data: campaigns } = await supabase
    .from("marketing_campaigns_catalog")
    .select("id, cost_per_turn")
    .in("id", campaignIds);
  const totalCost = (campaigns ?? []).reduce((sum, c) => sum + (c.cost_per_turn ?? 0), 0);

  if (totalCost > company.capital) {
    redirect(`/marketing?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Replace this turn's investments if the player revisits the screen —
  // same revise-not-duplicate pattern as pricing.
  await supabase
    .from("company_marketing_investments")
    .delete()
    .eq("company_id", companyId)
    .eq("turn_id", turn.id);

  const rows = (campaigns ?? []).map((c) => ({
    company_id: companyId,
    turn_id: turn.id,
    campaign_id: c.id,
    spend: c.cost_per_turn ?? 0,
  }));
  const { error: insertError } = await supabase.from("company_marketing_investments").insert(rows);
  if (insertError) throw new Error(insertError.message);

  if (totalCost > 0) {
    const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
      company_id: companyId,
      turn_id: turn.id,
      movement_type: "marketing",
      direction: "out",
      amount: totalCost,
      reference_table: "company_marketing_investments",
    });
    if (ledgerError) throw new Error(ledgerError.message);

    const { error: capitalError } = await supabase
      .from("companies")
      .update({ capital: company.capital - totalCost })
      .eq("id", companyId);
    if (capitalError) throw new Error(capitalError.message);
  }

  redirect(`/turn?company=${companyId}`);
}
