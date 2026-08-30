"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCompanyColor, DEFAULT_COMPANY_COLOR } from "@/lib/game/companyColors";

export async function joinMatch(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Defaults to /match/join for backward compatibility — callers that
  // join from elsewhere (e.g. the /league browse list) pass their own
  // page so a join error sends the user back to where they actually
  // were, not always to the invite-code screen.
  const redirectTo = (formData.get("redirect_to") as string | null) || "/match/join";
  const matchId = (formData.get("match_id") as string | null)?.trim();
  const companyName = (formData.get("company_name") as string | null)?.trim();
  const rawColor = formData.get("color") as string | null;
  const color = isValidCompanyColor(rawColor) ? rawColor! : DEFAULT_COMPANY_COLOR;
  if (!matchId || !companyName) {
    redirect(`${redirectTo}?error=missing_fields`);
  }

  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) {
    redirect(`${redirectTo}?error=not_found`);
  }
  if (match!.status !== "open") {
    redirect(`${redirectTo}?error=closed`);
  }

  const { data: existingParticipants } = await supabase
    .from("match_participants")
    .select("id")
    .eq("match_id", matchId);
  if (match!.max_players !== null && (existingParticipants ?? []).length >= match!.max_players) {
    redirect(`${redirectTo}?error=full`);
  }

  if (!match!.zone_id) {
    // Shouldn't happen for any match created via createPrivateMatch,
    // but guards against a pre-existing match row from before zone_id
    // existed (a fresh migration sets it nullable on old rows).
    redirect(`${redirectTo}?error=not_found`);
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      session_id: match!.session_id,
      owner_user_id: user.id,
      name: companyName,
      color,
      activity_type: "commercial",
      zone_id: match!.zone_id,
      current_level: 1,
      capital: 150000,
    })
    .select()
    .single();
  if (companyError || !company) {
    throw new Error(companyError?.message ?? "Failed to create company");
  }

  const { error: participantError } = await supabase
    .from("match_participants")
    .insert({ match_id: matchId, company_id: company.id });
  if (participantError) throw new Error(participantError.message);

  redirect(`/match/lobby?match=${matchId}&company=${company.id}`);
}
