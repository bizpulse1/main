import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyAvatar } from "@/components/CompanyAvatar";

export default async function MatchLobbyScreen({
  searchParams,
}: {
  searchParams: { match?: string; company?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.match || !searchParams.company) redirect("/hub");

  const { data: match } = await supabase.from("matches").select("*").eq("id", searchParams.match).single();
  if (!match) redirect("/hub");

  const { data: myCompany } = await supabase
    .from("companies")
    .select("id, name, color")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!myCompany) redirect("/hub");

  const { data: participants } = await supabase
    .from("match_participants")
    .select("company_id")
    .eq("match_id", match.id);

  // Sibling companies' basic info — readable via the additive
  // companies_match_sibling_read policy, not the owner-only one.
  const companyIds = (participants ?? []).map((p) => p.company_id);
  const { data: participantCompanies } =
    companyIds.length > 0
      ? await supabase.from("companies").select("id, name, color").in("id", companyIds)
      : { data: [] };

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Match lobby
        </h1>
        <p className="text-bp-text-muted mb-6">
          Share the invite code below — friends can join anytime before
          the match fills up or you start playing.
        </p>

        <Card highlighted className="mb-6">
          <p className="text-bp-text-muted text-xs mb-1">Invite code</p>
          <p className="text-bp-gold font-mono text-sm break-all">{match.id}</p>
        </Card>

        <p className="text-bp-gold text-sm font-semibold mb-3">
          Players ({(participantCompanies ?? []).length}
          {match.max_players ? ` / ${match.max_players}` : ""})
        </p>
        <div className="space-y-2 mb-6">
          {(participantCompanies ?? []).map((c) => (
            <Card key={c.id}>
              <div className="flex items-center gap-3">
                <CompanyAvatar name={c.name} color={c.color} size="sm" />
                <p className="text-bp-text">
                  {c.name}
                  {c.id === myCompany.id && (
                    <span className="text-bp-text-muted text-xs"> (you)</span>
                  )}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Link href={`/turn?company=${myCompany.id}`}>
          <Button fullWidth>Continue to game</Button>
        </Link>
      </div>
    </main>
  );
}
