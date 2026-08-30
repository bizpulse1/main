import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { RseHistoryChart } from "@/components/RseHistoryChart";

export default async function RseScreen({
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

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, session_id")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const [{ data: allMetrics }, { data: allTurns }] = await Promise.all([
    supabase
      .from("company_rse_metrics")
      .select("turn_id, environmental_score, social_score, governance_score")
      .eq("company_id", company.id),
    supabase.from("session_turns").select("id, turn_number").eq("session_id", company.session_id),
  ]);

  const turnNumberById = new Map((allTurns ?? []).map((t) => [t.id, t.turn_number]));
  const history = (allMetrics ?? [])
    .map((m) => {
      const turnNumber = turnNumberById.get(m.turn_id);
      if (turnNumber === undefined) return null;
      return {
        turn_number: turnNumber,
        environmental_score: m.environmental_score ?? 0,
        social_score: m.social_score ?? 0,
        governance_score: m.governance_score ?? 0,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.turn_number - b.turn_number);

  const latest = history[history.length - 1];

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          RSE
        </h1>
        <p className="text-bp-text-muted mb-6">
          These scores aren't a separate spend — they follow from how you
          already run the company: worker satisfaction, energy use, and
          R&D maturity.
        </p>

        {!latest ? (
          <p className="text-bp-text-muted text-sm">
            No turns resolved yet — scores appear after your first turn.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <ScoreCard label="Environmental" value={latest.environmental_score} color="text-green-400" />
              <ScoreCard label="Social" value={latest.social_score} color="text-blue-400" />
              <ScoreCard label="Governance" value={latest.governance_score} color="text-bp-gold" />
            </div>

            {history.length >= 2 && (
              <Card>
                <p className="text-bp-gold text-sm font-semibold mb-2">History</p>
                <RseHistoryChart data={history} />
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-bp-surface border border-bp-border p-3 text-center">
      <p className="text-bp-text-muted text-xs mb-1">{label}</p>
      <p className={`font-display font-semibold text-lg ${color}`}>{Math.round(value)}</p>
    </div>
  );
}
