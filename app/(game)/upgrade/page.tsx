import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { upgradeToPaid } from "./actions";

export default async function UpgradeScreen({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, zone_limit, level_cap")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.plan === "paid") {
    redirect(searchParams.company ? `/turn?company=${searchParams.company}` : "/hub");
  }

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Upgrade to Paid
        </h1>
        <p className="text-bp-text-muted mb-6">
          No payment provider is connected yet — this switches your plan
          directly so you can test what paid unlocks.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <p className="text-bp-gold text-sm font-semibold mb-2">Free</p>
            <ul className="text-bp-text-muted text-sm space-y-1">
              <li>1 zone</li>
              <li>Level cap: 3</li>
              <li>Unlimited turns</li>
            </ul>
          </Card>
          <Card highlighted>
            <p className="text-bp-gold text-sm font-semibold mb-2">Paid</p>
            <ul className="text-bp-text text-sm space-y-1">
              <li>3 zones</li>
              <li>No level cap</li>
              <li>Unlimited turns</li>
            </ul>
          </Card>
        </div>

        <form action={upgradeToPaid}>
          {searchParams.company && (
            <input type="hidden" name="company_id" value={searchParams.company} />
          )}
          <SubmitButton>Upgrade to Paid</SubmitButton>
        </form>
      </div>
    </main>
  );
}
