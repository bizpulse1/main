"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function selectArguments(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const selected = formData.getAll("argument_id") as string[];
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  if (selected.length > 2) {
    redirect(`/arguments?company=${companyId}&error=too_many`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { error } = await supabase.from("company_sales_arguments_used").upsert(
    {
      company_id: companyId,
      turn_id: turn.id,
      range_code: "reference",
      argument_1_id: selected[0] ?? null,
      argument_2_id: selected[1] ?? null,
    },
    { onConflict: "company_id,turn_id,range_code" }
  );
  if (error) throw new Error(error.message);

  redirect(`/turn?company=${companyId}`);
}
