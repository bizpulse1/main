"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdminDashboard } from "@/lib/game/admin";

export async function addManagedSession(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canAccessAdminDashboard(profile?.role)) {
    redirect("/hub");
  }

  const matchId = (formData.get("match_id") as string | null)?.trim();
  if (!matchId) {
    redirect("/admin?error=missing_code");
  }

  const { data: match } = await supabase.from("matches").select("session_id").eq("id", matchId).maybeSingle();
  if (!match) {
    redirect("/admin?error=not_found");
  }

  const { error } = await supabase
    .from("admin_managed_sessions")
    .insert({ admin_id: user.id, session_id: match!.session_id });
  // Already managing this session — not an error worth surfacing, just
  // land back on the dashboard where it's already listed.
  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }

  redirect("/admin");
}
