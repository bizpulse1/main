"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";
import { computeSharePrice, computeIpoProceeds, computeDividendCost } from "@/lib/game/bourse";

export async function goPublic(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const totalSharesRaw = formData.get("total_shares") as string | null;
  const sharesPublicPctRaw = formData.get("shares_public_pct") as string | null;
  const totalShares = totalSharesRaw ? parseFloat(totalSharesRaw) : NaN;
  const sharesPublicPct = sharesPublicPctRaw ? parseFloat(sharesPublicPctRaw) : NaN;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: existing } = await supabase
    .from("company_shares")
    .select("company_id")
    .eq("company_id", companyId)
    .maybeSingle();
  if (existing) redirect(`/bourse?company=${companyId}`);

  if (
    !Number.isFinite(totalShares) ||
    totalShares <= 0 ||
    !Number.isFinite(sharesPublicPct) ||
    sharesPublicPct <= 0 ||
    sharesPublicPct > 100
  ) {
    redirect(`/bourse?company=${companyId}&error=invalid_terms`);
  }

  const pricePerShare = computeSharePrice(company.capital, totalShares);
  const proceeds = computeIpoProceeds(totalShares, sharesPublicPct, pricePerShare);

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { error: sharesError } = await supabase.from("company_shares").insert({
    company_id: companyId,
    total_shares: totalShares,
    shares_public_pct: sharesPublicPct,
  });
  if (sharesError) throw new Error(sharesError.message);

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "ipo_proceeds",
    direction: "in",
    amount: proceeds,
    reference_table: "company_shares",
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital + proceeds })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/bourse?company=${companyId}`);
}

export async function declareDividend(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const amountRaw = formData.get("amount_per_share") as string | null;
  const amountPerShare = amountRaw ? parseFloat(amountRaw) : NaN;
  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("id, session_id, capital")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: shares } = await supabase
    .from("company_shares")
    .select("total_shares, shares_public_pct")
    .eq("company_id", companyId)
    .single();
  if (!shares) redirect(`/bourse?company=${companyId}`);

  if (!Number.isFinite(amountPerShare) || amountPerShare <= 0) {
    redirect(`/bourse?company=${companyId}&error=invalid_amount`);
  }

  const cost = computeDividendCost(
    shares!.total_shares,
    shares!.shares_public_pct,
    amountPerShare
  );
  if (cost > company.capital) {
    redirect(`/bourse?company=${companyId}&error=insufficient_funds`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  const { error: dividendError } = await supabase.from("dividends").upsert(
    { company_id: companyId, turn_id: turn.id, amount_per_share: amountPerShare },
    { onConflict: "company_id,turn_id" }
  );
  if (dividendError) throw new Error(dividendError.message);

  if (cost > 0) {
    const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
      company_id: companyId,
      turn_id: turn.id,
      movement_type: "dividend",
      direction: "out",
      amount: cost,
      reference_table: "dividends",
    });
    if (ledgerError) throw new Error(ledgerError.message);

    const { error: capitalError } = await supabase
      .from("companies")
      .update({ capital: company.capital - cost })
      .eq("id", companyId);
    if (capitalError) throw new Error(capitalError.message);
  }

  redirect(`/bourse?company=${companyId}`);
}
