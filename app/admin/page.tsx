import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdminDashboard } from "@/lib/game/admin";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { addManagedSession } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Paste a match invite code.",
  not_found: "No match found with that code.",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!canAccessAdminDashboard(profile?.role)) {
    redirect("/hub");
  }

  const { data: managed } = await supabase
    .from("admin_managed_sessions")
    .select("session_id")
    .eq("admin_id", user.id);

  const sessionIds = (managed ?? []).map((m) => m.session_id);
  const { data: sessions } =
    sessionIds.length > 0
      ? await supabase.from("game_sessions").select("id, mode, created_at").in("id", sessionIds)
      : { data: [] };

  // Company counts per session — a plain follow-up query rather than
  // an embedded select, matching the pattern used everywhere else in
  // this project.
  const { data: allCompanies } =
    sessionIds.length > 0
      ? await supabase.from("companies").select("session_id").in("session_id", sessionIds)
      : { data: [] };
  const companyCountBySession = new Map<string, number>();
  for (const c of allCompanies ?? []) {
    companyCountBySession.set(c.session_id, (companyCountBySession.get(c.session_id) ?? 0) + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Admin / Trainer dashboard
        </h1>
        <p className="text-bp-text-muted mb-6">
          Track sessions you're running — add one using its match invite
          code, then see every company in it.
        </p>

        {searchParams.error && ERROR_MESSAGES[searchParams.error] && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            {ERROR_MESSAGES[searchParams.error]}
          </p>
        )}

        <form action={addManagedSession} className="mb-8">
          <label className="text-sm text-bp-text-muted mb-2 block">
            Add a session (paste its match invite code)
          </label>
          <input
            type="text"
            name="match_id"
            placeholder="Match invite code"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-3 text-bp-text focus:outline-none focus:border-bp-gold mb-3"
          />
          <SubmitButton>Add session</SubmitButton>
        </form>

        <p className="text-bp-gold text-sm font-semibold mb-3">
          Managed sessions ({(sessions ?? []).length})
        </p>
        {(sessions ?? []).length === 0 ? (
          <p className="text-bp-text-muted text-sm">None yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions!.map((s) => (
              <Link key={s.id} href={`/admin/session?session=${s.id}`}>
                <Card highlighted>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-bp-text font-medium capitalize">{s.mode}</p>
                      <p className="text-bp-text-muted text-xs">
                        {companyCountBySession.get(s.id) ?? 0} companies
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
