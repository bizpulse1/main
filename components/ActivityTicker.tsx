import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { NOTABLE_MOVEMENT_TYPES, isNotableMovement, buildActivityLine } from "@/lib/game/activityFeed";

export async function ActivityTicker({
  sessionId,
  myCompanyId,
}: {
  sessionId: string;
  myCompanyId: string;
}) {
  const supabase = createClient();

  const { data: sessionCompanies } = await supabase
    .from("companies")
    .select("id, name, color")
    .eq("session_id", sessionId);

  // Solo session (just this one company) — nothing to show, and no
  // point rendering an empty-state card here the way Standings does;
  // /turn already has plenty on it.
  if (!sessionCompanies || sessionCompanies.length <= 1) return null;

  const companyIds = sessionCompanies.map((c) => c.id);
  const { data: events } = await supabase
    .from("treasury_ledger")
    .select("id, company_id, movement_type, created_at")
    .in("company_id", companyIds)
    .in("movement_type", NOTABLE_MOVEMENT_TYPES)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!events || events.length === 0) return null;

  const companyById = new Map(sessionCompanies.map((c) => [c.id, c]));

  return (
    <Card className="mb-6">
      <p className="text-bp-gold text-sm font-semibold mb-3">Market activity</p>
      <div className="space-y-2.5">
        {events.map((e) => {
          const c = companyById.get(e.company_id);
          if (!c || !isNotableMovement(e.movement_type)) return null;
          const displayName = c.id === myCompanyId ? "You" : c.name;
          return (
            <div key={e.id} className="flex items-center gap-2.5">
              <CompanyAvatar name={c.name} color={c.color} size="sm" />
              <span className="text-bp-text-muted text-sm">
                {buildActivityLine(e.movement_type, displayName)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
