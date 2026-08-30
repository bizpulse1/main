import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function MatchLandingScreen() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Private multiplayer
        </h1>
        <p className="text-bp-text-muted mb-6">
          You'll compete against your friends' companies AND the same 4
          AI rivals solo players face — real competition doesn't replace
          the market, it adds to it.
        </p>

        <div className="space-y-4">
          <Link href="/match/create">
            <Card highlighted>
              <p className="font-display font-semibold text-bp-text mb-1">
                Create a match
              </p>
              <p className="text-sm text-bp-text-muted">
                Start a new match and invite friends with a link.
              </p>
            </Card>
          </Link>
          <Link href="/match/join">
            <Card highlighted>
              <p className="font-display font-semibold text-bp-text mb-1">
                Join a match
              </p>
              <p className="text-sm text-bp-text-muted">
                Have an invite link? Enter it here.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
