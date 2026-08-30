import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";

export default async function CompanySetupScreen({
  searchParams,
}: {
  searchParams: { mode?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const mode = searchParams.mode ?? "solo";

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mt-10">
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
          Name your company
        </h1>
        <p className="text-bp-text-muted mb-8">
          This is who you'll be in the market — you can't change your zone
          later, so this is the only step before things get real.
        </p>

        <form action={createCompany} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <input
            type="text"
            name="name"
            required
            maxLength={60}
            placeholder="e.g. Atlas Distribution"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text placeholder:text-bp-text-muted focus:outline-none focus:border-bp-gold"
          />
          <div>
            <p className="text-sm text-bp-text-muted mb-3">Pick a color</p>
            <ColorSwatchPicker />
          </div>
          {searchParams.error === "missing_name" && (
            <p className="text-sm text-red-400">Give your company a name to continue.</p>
          )}
          <SubmitButton>Continue</SubmitButton>
        </form>
      </div>
    </main>
  );
}
