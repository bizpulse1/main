import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const INCOME_LABELS: Record<string, string> = {
  rich: "High income",
  poor: "Price-sensitive",
  mixed: "Mixed income",
};

export default async function ZoneRevealScreen({
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
    .select("*")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();

  if (!company) redirect("/hub");

  const { data: zone } = await supabase
    .from("zones")
    .select("*")
    .eq("id", company.zone_id)
    .single();

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-8">
      <div className="mt-10">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Your market: {zone?.name}
        </h1>

        <Card highlighted>
          <p className="text-bp-gold text-sm font-semibold mb-2">
            {(zone?.income_profile && INCOME_LABELS[zone.income_profile]) ?? zone?.income_profile}
          </p>
          <p className="text-bp-text mb-3">{zone?.description}</p>
          <p className="text-bp-text-muted text-sm">
            Population: {zone?.population_size?.toLocaleString("en-US")}
          </p>
        </Card>

        <p className="text-bp-text-muted mt-6 text-sm">
          Next: choose your depot and your first supplier — that's what
          decides what you can actually sell on turn one.
        </p>
      </div>

      <div className="pb-4">
        <Link href={`/setup/depot?company=${company.id}`}>
          <Button fullWidth>Continue to depot selection</Button>
        </Link>
      </div>
    </main>
  );
}
