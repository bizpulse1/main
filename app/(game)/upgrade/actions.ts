"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// No payment provider is wired up yet (flagged in the roadmap as TBD).
// This flips the subscription state directly so the rest of the app —
// zone gating, level cap — can be built and tested against a real
// "paid" state without blocking on choosing/integrating a provider.
export async function upgradeToPaid(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;

  const { error } = await supabase
    .from("subscriptions")
    .update({ plan: "paid", zone_limit: 3, level_cap: null })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  redirect(companyId ? `/turn?company=${companyId}` : "/hub");
}
