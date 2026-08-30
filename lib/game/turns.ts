import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Every operational table (company_premises, treasury_ledger, purchase
// decisions, etc.) FKs to a session_turns row. Nothing creates turn 1
// automatically on session creation — it's created lazily, the first
// time a player makes a decision that needs one. This keeps "start a
// session" and "start playing" decoupled, which matters once sessions
// can be created by an admin ahead of a trainee actually starting.
export async function getOrCreateCurrentTurn(
  supabase: SupabaseClient<Database>,
  sessionId: string
) {
  const { data: existing } = await supabase
    .from("session_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.status !== "computed") {
    return existing;
  }

  const nextTurnNumber = existing ? existing.turn_number + 1 : 1;

  const { data: created, error } = await supabase
    .from("session_turns")
    .insert({
      session_id: sessionId,
      turn_number: nextTurnNumber,
      status: "open",
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create turn");
  }

  return created;
}
