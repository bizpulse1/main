import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyAvatar } from "@/components/CompanyAvatar";

export default async function StandingsScreen({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.company) redirect("/hub");

  const { data: myCompany } = await supabase
    .from("companies")
    .select("id, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!myCompany) redirect("/hub");

  // Every company sharing this session is a real market rival — this
  // is the same sibling visibility resolveTurn already relies on for
  // the competitor engine, just surfaced to the player directly. A
  // solo session only ever has one company (itself), which is how we
  // tell "not in a multiplayer match" apart from "in one."
  const { data: sessionCompanies } = await supabase
    .from("companies")
    .select("id, name, capital, current_level, activity_type, owner_user_id, color")
    .eq("session_id", myCompany.session_id)
    .order("capital", { ascending: false });

  const isInMatch = (sessionCompanies ?? []).length > 1;

  const ownerIds = Array.from(new Set((sessionCompanies ?? []).map((c) => c.owner_user_id)));
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", ownerIds)
      : { data: [] };
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.display_name]));

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Standings
        </h1>

        {!isInMatch ? (
          <>
            <p className="text-bp-text-muted mb-6">
              You're playing solo right now — standings only apply once
              other real companies share your market.
            </p>
            <Link href="/match" className="block mb-3">
              <Button fullWidth>Create or join a private match</Button>
            </Link>
            <Link href="/league">
              <Button variant="outline" fullWidth>
                Browse public leagues
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-bp-text-muted mb-6">
              Every real company sharing your market, ranked by capital.
            </p>
            <div className="space-y-3">
              {sessionCompanies!.map((c, i) => (
                <Card key={c.id} highlighted={c.id === myCompany.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={c.name} color={c.color} />
                      <div>
                        <p className="text-bp-text font-medium">
                          {i + 1}. {c.name}
                          {c.id === myCompany.id && (
                            <span className="text-bp-gold text-xs"> (you)</span>
                          )}
                        </p>
                        <p className="text-bp-text-muted text-xs mt-0.5">
                          {ownerNameById.get(c.owner_user_id) ?? "Player"} · Level{" "}
                          {c.current_level} ·{" "}
                          {c.activity_type === "industrial" ? "Industrial" : "Commercial"}
                        </p>
                      </div>
                    </div>
                    <p className="text-bp-gold font-semibold text-sm">
                      ${c.capital.toLocaleString("en-US")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
