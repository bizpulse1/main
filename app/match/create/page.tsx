import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { createPrivateMatch } from "./actions";

export default async function CreateMatchScreen({
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
          Create a match
        </h1>
        <p className="text-bp-text-muted mb-6">
          You'll get an invite link to share once it's created.
        </p>

        {searchParams.error === "missing_name" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Enter a company name.
          </p>
        )}

        <form action={createPrivateMatch}>
          <label className="text-sm text-bp-text-muted mb-2 block">
            Your company name
          </label>
          <input
            type="text"
            name="company_name"
            placeholder="e.g. Atlas Trading"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
          />
          <p className="text-sm text-bp-text-muted mb-3">Pick a color</p>
          <div className="mb-6">
            <ColorSwatchPicker />
          </div>
          <label className="text-sm text-bp-text-muted mb-2 block">
            Max players
          </label>
          <input
            type="number"
            name="max_players"
            min={2}
            max={8}
            defaultValue={4}
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-6"
          />
          <SubmitButton>Create match</SubmitButton>
        </form>
      </div>
    </main>
  );
}
