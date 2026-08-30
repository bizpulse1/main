import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdminDashboard } from "@/lib/game/admin";
import { Card } from "@/components/ui/Card";

export default async function AdminSessionDetail({
  searchParams,
}: {
  searchParams: { session?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.session) redirect("/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canAccessAdminDashboard(profile?.role)) {
    redirect("/hub");
  }

  const { data: managedRow } = await supabase
    .from("admin_managed_sessions")
    .select("session_id")
    .eq("admin_id", user.id)
    .eq("session_id", searchParams.session)
    .maybeSingle();
  if (!managedRow) redirect("/admin");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, capital, current_level, activity_type, owner_user_id")
    .eq("session_id", searchParams.session)
    .order("capital", { ascending: false });

  const ownerIds = Array.from(new Set((companies ?? []).map((c) => c.owner_user_id)));
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", ownerIds)
      : { data: [] };
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.display_name]));

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Session tracking
        </h1>

        {(companies ?? []).length === 0 ? (
          <p className="text-bp-text-muted text-sm">No companies in this session yet.</p>
        ) : (
          <div className="space-y-3">
            {companies!.map((c, i) => (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-bp-text font-medium">
                      {i + 1}. {c.name}
                    </p>
                    <p className="text-bp-text-muted text-xs mt-0.5">
                      {ownerNameById.get(c.owner_user_id) ?? "Unknown player"} · Level{" "}
                      {c.current_level} ·{" "}
                      {c.activity_type === "industrial" ? "Industrial" : "Commercial"}
                    </p>
                  </div>
                  <p className="text-bp-gold font-semibold text-sm">
                    ${c.capital.toLocaleString("en-US")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
