"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCompanyColor, DEFAULT_COMPANY_COLOR } from "@/lib/game/companyColors";

export async function createPrivateMatch(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyName = (formData.get("company_name") as string | null)?.trim();
  const maxPlayersRaw = formData.get("max_players") as string | null;
  const maxPlayers = maxPlayersRaw ? parseInt(maxPlayersRaw, 10) : 4;
  const isPublic = formData.get("is_public") === "true";
  const rawColor = formData.get("color") as string | null;
  const color = isValidCompanyColor(rawColor) ? rawColor! : DEFAULT_COMPANY_COLOR;
  if (!companyName) {
    redirect(isPublic ? "/league/create?error=missing_name" : "/match/create?error=missing_name");
  }

  const { data: paramVersion } = await supabase
    .from("parameter_versions")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!paramVersion) {
    throw new Error("No active parameter_versions row — run biz_pulse_seed_data.sql");
  }

  // A match's zone is fixed once for everyone who joins it (so they
  // actually compete for the same demand pool) and isn't gated by the
  // host's own zone_limit — joining a shared match doesn't use up a
  // slot from the host's personal free/paid zone allowance the way
  // creating a new solo company does.
  const { data: zones } = await supabase.from("zones").select("id");
  if (!zones || zones.length === 0) {
    throw new Error("No zones configured — run biz_pulse_seed_data.sql");
  }
  const zoneId = zones[Math.floor(Math.random() * zones.length)].id;

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      owner_user_id: user.id,
      mode: "multiplayer",
      parameter_version_id: paramVersion.id,
      starting_level: 1,
    })
    .select()
    .single();
  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create match session");
  }

  // Company must exist before the match row — the match/match_participants
  // RLS policies check "do I have a company in this session", so that
  // has to already be true by the time this insert runs.
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      session_id: session.id,
      owner_user_id: user.id,
      name: companyName,
      color,
      activity_type: "commercial",
      zone_id: zoneId,
      current_level: 1,
      capital: 150000,
    })
    .select()
    .single();
  if (companyError || !company) {
    throw new Error(companyError?.message ?? "Failed to create company");
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({ session_id: session.id, status: "open", max_players: maxPlayers, is_public: isPublic, zone_id: zoneId })
    .select()
    .single();
  if (matchError || !match) {
    throw new Error(matchError?.message ?? "Failed to create match");
  }

  const { error: participantError } = await supabase
    .from("match_participants")
    .insert({ match_id: match.id, company_id: company.id });
  if (participantError) throw new Error(participantError.message);

  redirect(`/match/lobby?match=${match.id}&company=${company.id}`);
}

// Same underlying logic serves both — a public league is just a match
// with is_public=true (set via the form's hidden field), discoverable
// via the matches_public_browse RLS policy instead of requiring an
// invite code. Exported under both names so each screen imports the
// name that matches what it's actually doing.
export const createLeague = createPrivateMatch;
