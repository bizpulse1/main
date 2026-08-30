import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSharePrice } from "@/lib/game/bourse";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { goPublic, declareDividend } from "./actions";

export default async function BourseScreen({
  searchParams,
}: {
  searchParams: { company?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!searchParams.company) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, capital")
    .eq("id", searchParams.company)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: shares } = await supabase
    .from("company_shares")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  if (!shares) {
    return (
      <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
        <div className="mt-6">
          <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
            {company.name}
          </p>
          <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
            Go public
          </h1>
          <p className="text-bp-text-muted mb-6">
            Issue shares and sell a portion to the public for an immediate
            cash injection. Share price is your book value — capital
            divided by total shares — so it moves with your company's
            actual performance, not a simulated market.
          </p>

          {searchParams.error === "invalid_terms" && (
            <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
              Enter a valid share count and a public percentage between 1
              and 100.
            </p>
          )}

          <form action={goPublic}>
            <input type="hidden" name="company_id" value={company.id} />
            <label className="text-sm text-bp-text-muted mb-2 block">
              Total shares
            </label>
            <input
              type="number"
              name="total_shares"
              min={1}
              step={100}
              defaultValue={10000}
              className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
            />
            <label className="text-sm text-bp-text-muted mb-2 block">
              % offered to the public
            </label>
            <input
              type="number"
              name="shares_public_pct"
              min={1}
              max={100}
              step={1}
              defaultValue={20}
              className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-6"
            />
            <SubmitButton>Go public</SubmitButton>
          </form>
        </div>
      </main>
    );
  }

  const sharePrice = computeSharePrice(company.capital, shares.total_shares);
  const publicShares = shares.total_shares * (shares.shares_public_pct / 100);

  return (
    <main className="flex flex-col min-h-[calc(100dvh-64px)] md:min-h-dvh px-6 py-8">
      <div className="mt-6">
        <p className="text-bp-gold text-sm font-semibold tracking-wide mb-1">
          {company.name}
        </p>
        <h1 className="font-display text-2xl font-semibold text-bp-text mb-6">
          Bourse
        </h1>

        {searchParams.error === "invalid_amount" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Enter a valid dividend amount.
          </p>
        )}
        {searchParams.error === "insufficient_funds" && (
          <p className="mb-4 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            Not enough capital to cover that dividend.
          </p>
        )}

        <Card highlighted className="mb-4">
          <div className="flex justify-between">
            <span className="text-bp-text-muted text-sm">Share price (book value)</span>
            <span className="text-bp-gold font-semibold">
              ${sharePrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-bp-text-muted">Total shares</span>
              <span className="text-bp-text">{shares.total_shares.toLocaleString("en-US")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bp-text-muted">Publicly held</span>
              <span className="text-bp-text">
                {publicShares.toLocaleString("en-US")} ({shares.shares_public_pct}%)
              </span>
            </div>
          </div>
        </Card>

        <p className="text-bp-gold text-sm font-semibold mb-2">Declare a dividend</p>
        <p className="text-bp-text-muted text-sm mb-4">
          Paid to public shareholders only — shares you still hold cost
          nothing to "pay yourself."
        </p>
        <form action={declareDividend}>
          <input type="hidden" name="company_id" value={company.id} />
          <input
            type="number"
            name="amount_per_share"
            min={0.01}
            step={0.01}
            placeholder="$ per share"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
          />
          <SubmitButton>Pay dividend</SubmitButton>
        </form>
      </div>
    </main>
  );
}
