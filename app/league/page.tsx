import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/SubmitButton";
import { joinMatch } from "@/app/match/join/actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter a company name to join.",
  not_found: "That league no longer exists.",
  closed: "That league is no longer open.",
  full: "That league is already full.",
};

export default async function LeagueBrowseScreen({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: leagues } = await supabase
    .from("matches")
    .select("id, max_players")
    .eq("is_public", true)
    .eq("status", "open");

  const { data: allParticipants } = await supabase
    .from("match_participants")
    .select("match_id, company_id");
  const participantsByMatch = new Map<string, string[]>();
  for (const p of allParticipants ?? []) {
    const list = participantsByMatch.get(p.match_id) ?? [];
    list.push(p.company_id);
    participantsByMatch.set(p.match_id, list);
  }

  const companyIds = (allParticipants ?? []).map((p) => p.company_id);
  const { data: companies } =
    companyIds.length > 0 ? await supabase.from("companies").select("id, name").in("id", companyIds) : { data: [] };
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl font-semibold text-bp-text">
            Public leagues
          </h1>
        </div>
        <p className="text-bp-text-muted mb-6">
          Open leagues anyone can join — no invite code needed.
        </p>

        {searchParams.error && ERROR_MESSAGES[searchParams.error] && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            {ERROR_MESSAGES[searchParams.error]}
          </p>
        )}

        <Link href="/league/create" className="block mb-6">
          <Button variant="outline" fullWidth>
            Start a new league
          </Button>
        </Link>

        {(leagues ?? []).length === 0 ? (
          <p className="text-bp-text-muted text-sm">
            No open leagues right now — start one above.
          </p>
        ) : (
          <div className="space-y-4">
            {(leagues ?? []).map((league) => {
              const participantIds = participantsByMatch.get(league.id) ?? [];
              const isFull = league.max_players !== null && participantIds.length >= league.max_players;
              return (
                <Card key={league.id} highlighted>
                  <p className="text-bp-text font-medium mb-1">
                    League {league.id.slice(0, 8)}
                  </p>
                  <p className="text-bp-text-muted text-xs mb-3">
                    {participantIds.length}
                    {league.max_players ? ` / ${league.max_players}` : ""} players
                    {participantIds.length > 0 && (
                      <>
                        {" — "}
                        {participantIds
                          .slice(0, 3)
                          .map((id) => companyNameById.get(id) ?? "…")
                          .join(", ")}
                        {participantIds.length > 3 ? "…" : ""}
                      </>
                    )}
                  </p>
                  {isFull ? (
                    <p className="text-red-400 text-sm">Full</p>
                  ) : (
                    <form action={joinMatch}>
                      <input type="hidden" name="match_id" value={league.id} />
                      <input type="hidden" name="redirect_to" value="/league" />
                      <input
                        type="text"
                        name="company_name"
                        placeholder="Your company name"
                        className="w-full rounded-xl bg-bp-bg border border-bp-border px-3 py-2 text-bp-text mb-3 focus:outline-none focus:border-bp-gold text-sm"
                      />
                      <SubmitButton>Join league</SubmitButton>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
