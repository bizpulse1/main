"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidCompanyColor, DEFAULT_COMPANY_COLOR } from "@/lib/game/companyColors";

export async function createCompany(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const name = (formData.get("name") as string | null)?.trim();
  const rawMode = (formData.get("mode") as string | null) || "solo";
  const rawColor = formData.get("color") as string | null;
  const color = isValidCompanyColor(rawColor) ? rawColor! : DEFAULT_COMPANY_COLOR;

  // The Hub's mode selector uses UI-facing IDs (solo/private/public) that
  // don't match the DB's session_mode enum (solo/training/multiplayer/
  // assessment) — both multiplayer variants map to the same session mode;
  // public vs private visibility is a `matches` table concern for Phase 7,
  // not something game_sessions.mode encodes.
  const modeMap: Record<string, "solo" | "training" | "multiplayer" | "assessment"> = {
    solo: "solo",
    private: "multiplayer",
    public: "multiplayer",
  };
  const mode = modeMap[rawMode] ?? "solo";

  if (!name) {
    redirect(`/setup?mode=${rawMode}&error=missing_name`);
  }

  // Free plan gating: zone_limit caps how many DISTINCT zones this user
  // can operate in. If they're already at the cap, new companies reuse
  // one of their existing zones instead of expanding into a new one.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("zone_limit")
    .eq("user_id", user.id)
    .maybeSingle();
  const zoneLimit = subscription?.zone_limit ?? 1;

  const { data: existingCompanies } = await supabase
    .from("companies")
    .select("zone_id")
    .eq("owner_user_id", user.id);
  const usedZoneIds = Array.from(
    new Set((existingCompanies ?? []).map((c) => c.zone_id))
  );

  const { data: zones } = await supabase.from("zones").select("*");
  if (!zones || zones.length === 0) {
    throw new Error(
      "No zones configured — run biz_pulse_seed_data.sql against your Supabase project."
    );
  }

  let zoneId: string;
  if (usedZoneIds.length > 0 && usedZoneIds.length >= zoneLimit) {
    // Already at the plan's zone cap — reuse an existing zone.
    zoneId = usedZoneIds[0];
  } else {
    const unused = zones.filter((z) => !usedZoneIds.includes(z.id));
    const pool = unused.length > 0 ? unused : zones;
    zoneId = pool[Math.floor(Math.random() * pool.length)].id;
  }

  const { data: paramVersion } = await supabase
    .from("parameter_versions")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!paramVersion) {
    throw new Error(
      "No active parameter_versions row — run biz_pulse_seed_data.sql against your Supabase project."
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .insert({
      owner_user_id: user.id,
      mode,
      parameter_version_id: paramVersion.id,
      starting_level: 1,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create game session");
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      session_id: session.id,
      owner_user_id: user.id,
      name,
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

  redirect(`/setup/zone-reveal?company=${company.id}`);
}
