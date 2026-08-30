import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HubModeSelector } from "@/components/HubModeSelector";
import { Card } from "@/components/ui/Card";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { canAccessAdminDashboard } from "@/lib/game/admin";

export default async function HubScreen() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: profile }, { data: companies }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("companies")
      .select("id, name, capital, current_level, activity_type, zone_id, color")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan, zone_limit").eq("user_id", user.id).maybeSingle(),
  ]);

  // Zone names for display — a plain follow-up query rather than an
  // embedded select (that pattern has broken type inference in this
  // project before).
  const zoneIds = Array.from(new Set((companies ?? []).map((c) => c.zone_id)));
  const { data: zones } =
    zoneIds.length > 0
      ? await supabase.from("zones").select("id, name").in("id", zoneIds)
      : { data: [] };
  const zoneNameById = new Map((zones ?? []).map((z) => [z.id, z.name]));

  const hasCompanies = (companies ?? []).length > 0;
  const totalCapital = (companies ?? []).reduce((sum, c) => sum + c.capital, 0);

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="h-11 w-11 rounded-full bg-bp-surface border border-bp-border flex items-center justify-center text-bp-text-muted">
          {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        {hasCompanies && (
          <div className="rounded-xl bg-bp-surface border border-bp-gold/40 px-4 py-2">
            <span className="text-bp-gold font-semibold">
              ${totalCapital.toLocaleString("en-US")}
            </span>
            <span className="text-bp-text-muted text-sm"> across all companies</span>
          </div>
        )}
      </header>

      {subscription?.plan !== "paid" && (
        <Link href="/upgrade" className="block mt-3">
          <span className="text-bp-gold text-sm underline">Upgrade to Paid →</span>
        </Link>
      )}

      {canAccessAdminDashboard(profile?.role) && (
        <Link href="/admin" className="block mt-3">
          <span className="text-bp-gold text-sm underline">Admin / Trainer dashboard →</span>
        </Link>
      )}

      {hasCompanies && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold text-bp-text mb-4">
            Your companies
          </h2>
          <div className="space-y-3">
            {companies!.map((c) => (
              <Link key={c.id} href={`/turn?company=${c.id}`}>
                <Card highlighted className="mb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={c.name} color={c.color} />
                      <div>
                        <p className="text-bp-text font-medium">{c.name}</p>
                        <p className="text-bp-text-muted text-xs mt-0.5">
                          {zoneNameById.get(c.zone_id) ?? "Unknown zone"} · Level{" "}
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mode selection for creating a NEW company (client component —
          needs interactivity). Always available, not just when the
          player has no companies yet — zone_limit gating (reuse an
          existing zone once at cap) is handled server-side at creation. */}
      <div className="mt-10 flex-1">
        <h2 className="font-display text-xl font-semibold text-bp-text mb-5">
          {hasCompanies ? "Start a new company" : "Choose your mode"}
        </h2>
        <HubModeSelector />
      </div>
    </main>
  );
}
