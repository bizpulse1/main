// Policy "active" is computed from turn numbers rather than stored as
// a fixed end_turn_id at purchase time — the schema's end_turn_id
// exists for the row to eventually record when a policy actually
// lapsed, but that turn doesn't exist yet at purchase time (it's in
// the future), so activity is derived instead of pre-committed.
export function isPolicyActive(
  startTurnNumber: number,
  durationTurns: number,
  currentTurnNumber: number
): boolean {
  return (
    currentTurnNumber >= startTurnNumber &&
    currentTurnNumber < startTurnNumber + durationTurns
  );
}

// Standard deductible-then-cap payout: the policyholder eats the
// deductible, insurance covers the rest up to the coverage cap. A
// multirisque policy with deductible=0 pays from the first dollar, as
// its premium implies.
export function computeInsurancePayout(
  incurredCost: number,
  deductible: number,
  coverageCap: number
): number {
  const eligibleAmount = Math.max(0, incurredCost - deductible);
  return Math.min(eligibleAmount, coverageCap);
}
