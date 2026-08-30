"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { MAINTENANCE_COST } from "@/lib/game/maintenance";

export async function scheduleMaintenance(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: machine } = await supabase
    .from("company_machines")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (!machine) redirect(`/machine?company=${companyId}`);

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Already scheduled this turn — don't double-charge on a resubmit.
  const { data: existing } = await supabase
    .from("maintenance_logs")
    .select("id")
    .eq("company_machine_id", machine!.id)
    .eq("turn_id", turn.id)
    .eq("type", "preventive")
    .maybeSingle();
  if (existing) {
    redirect(`/turn?company=${companyId}`);
  }

  if (MAINTENANCE_COST > company.capital) {
    redirect(`/maintenance?company=${companyId}&error=insufficient_funds`);
  }

  const { error: logError } = await supabase.from("maintenance_logs").insert({
    company_machine_id: machine!.id,
    turn_id: turn.id,
    type: "preventive",
    cost: MAINTENANCE_COST,
    breakdown_occurred: false,
    downtime_turns: 0,
  });
  if (logError) throw new Error(logError.message);

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "maintenance",
    direction: "out",
    amount: MAINTENANCE_COST,
    reference_table: "maintenance_logs",
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - MAINTENANCE_COST })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/turn?company=${companyId}`);
}
