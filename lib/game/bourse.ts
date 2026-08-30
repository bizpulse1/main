// Scope decision: this models an IPO (real cash injection) and a
// deterministic book-value share price, NOT a trading simulation.
// The schema has share_transactions with an actor_type of
// 'ai_investor'/'market', which implies real order-matching against
// simulated investors — that's a genuinely different, much larger
// feature (investor sentiment, bid/ask, price discovery) than
// anything else built so far. Building half of it (an IPO with a
// price that never actually trades) is more honest than faking
// investor activity that doesn't exist. Share price here is pure
// book value: capital / total_shares — it moves only because capital
// moves, which is a fair, transparent, and fully game-consistent
// starting point that can be replaced with real trading later without
// changing the company_shares/dividends data model.

export function computeSharePrice(capital: number, totalShares: number): number {
  if (totalShares <= 0) return 0;
  return capital / totalShares;
}

export function computeIpoProceeds(
  totalShares: number,
  sharesPublicPct: number,
  pricePerShare: number
): number {
  return totalShares * (sharesPublicPct / 100) * pricePerShare;
}

export function computeDividendCost(
  totalShares: number,
  sharesPublicPct: number,
  amountPerShare: number
): number {
  return totalShares * (sharesPublicPct / 100) * amountPerShare;
}
