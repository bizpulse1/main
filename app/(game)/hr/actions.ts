"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { ROLE_CATALOG, TRAINING_COST, TRAINING_COMPETENCY_GAIN, type CommercialRole } from "@/lib/game/hrCatalog";

export async function hireWorker(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const role = formData.get("role") as string | null;
  if (!companyId || !role || !(role in ROLE_CATALOG)) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const salary = ROLE_CATALOG[role as CommercialRole].defaultSalary;
  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Salary is a recurring cost paid every turn by the resolution engine —
  // hiring itself doesn't cost anything up front in this model, unlike
  // depot deposits or stock purchases which are one-time cash outlays.
  const { error } = await supabase.from("workers").insert({
    company_id: companyId,
    role: role as CommercialRole,
    hired_turn_id: turn.id,
    base_salary: salary,
    competency_pct: 0,
    satisfaction_pct: 100,
    assigned: true,
    status: "active",
  });
  if (error) throw new Error(error.message);

  redirect(`/hr?company=${companyId}`);
}

export async function trainWorker(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const workerId = formData.get("worker_id") as string | null;
  if (!companyId || !workerId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: worker } = await supabase
    .from("workers")
    .select("id, competency_pct")
    .eq("id", workerId)
    .eq("company_id", companyId)
    .single();
  if (!worker) redirect(`/hr?company=${companyId}`);

  if (TRAINING_COST > company.capital) {
    redirect(`/hr?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);
  const newCompetency = Math.min(100, worker!.competency_pct + TRAINING_COMPETENCY_GAIN);

  const { error: trainingError } = await supabase.from("worker_training").insert({
    worker_id: workerId,
    turn_id: turn.id,
    training_type: "standard",
    cost: TRAINING_COST,
  });
  if (trainingError) throw new Error(trainingError.message);

  const { error: workerError } = await supabase
    .from("workers")
    .update({ competency_pct: newCompetency })
    .eq("id", workerId);
  if (workerError) throw new Error(workerError.message);

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "training",
    direction: "out",
    amount: TRAINING_COST,
    reference_table: "worker_training",
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - TRAINING_COST })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/hr?company=${companyId}`);
}
