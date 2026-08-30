import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { joinMatch } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter both the invite code and a company name.",
  not_found: "No match found with that code.",
  closed: "This match is no longer open.",
  full: "This match is already full.",
};

export default async function JoinMatchScreen({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-6">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Join a match
        </h1>
        <p className="text-bp-text-muted mb-6">
          Paste the invite code your friend shared with you.
        </p>

        {searchParams.error && ERROR_MESSAGES[searchParams.error] && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            {ERROR_MESSAGES[searchParams.error]}
          </p>
        )}

        <form action={joinMatch}>
          <label className="text-sm text-bp-text-muted mb-2 block">
            Invite code
          </label>
          <input
            type="text"
            name="match_id"
            placeholder="Paste the code here"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
          />
          <label className="text-sm text-bp-text-muted mb-2 block">
            Your company name
          </label>
          <input
            type="text"
            name="company_name"
            placeholder="e.g. Meridian Goods"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
          />
          <p className="text-sm text-bp-text-muted mb-3">Pick a color</p>
          <div className="mb-6">
            <ColorSwatchPicker />
          </div>
          <SubmitButton>Join match</SubmitButton>
        </form>
      </div>
    </main>
  );
}
