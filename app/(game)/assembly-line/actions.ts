"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function purchaseAssemblyLine(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");
  if (company.activity_type !== "industrial") redirect(`/turn?company=${companyId}`);

  const { data: machine } = await supabase
    .from("company_machines")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (!machine) redirect(`/machine?company=${companyId}`);

  const { data: existing } = await supabase
    .from("company_assembly_lines")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) redirect(`/turn?company=${companyId}`);

  const { data: catalogLine } = await supabase
    .from("assembly_lines_catalog")
    .select("*")
    .eq("range_code", "reference")
    .single();
  if (!catalogLine) throw new Error("No assembly line configured — check seed data");

  const totalCost = catalogLine.price + catalogLine.install_cost;
  if (totalCost > company.capital) {
    redirect(`/assembly-line?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { data: purchased, error: purchaseError } = await supabase
    .from("company_assembly_lines")
    .insert({
      company_id: companyId,
      assembly_line_catalog_id: catalogLine.id,
      purchased_turn_id: turn.id,
      status: "active",
    })
    .select()
    .single();
  if (purchaseError || !purchased) {
    throw new Error(purchaseError?.message ?? "Failed to purchase assembly line");
  }

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "assembly_line_purchase",
    direction: "out",
    amount: totalCost,
    reference_table: "company_assembly_lines",
    reference_id: purchased.id,
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - totalCost })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/turn?company=${companyId}`);
}
