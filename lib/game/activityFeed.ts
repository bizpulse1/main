// Which treasury_ledger movement_types are shown to match rivals in the
// activity ticker, and how each one reads as a one-line headline.
//
// Deliberately a small allowlist, not "everything a sibling can see" —
// routine costs (rent, payroll, purchases, insurance premiums, loan
// repayments) stay private between rivals even though they already
// share a market; only real strategic moves surface. This is a privacy
// choice as much as a noise-reduction one: a rival shouldn't be able to
// reconstruct your day-to-day P&L from the ticker, just see the big
// swings the same way a real competitor would hear about them.
export const NOTABLE_MOVEMENT_TYPES = [
  "industrial_transition",
  "machine_purchase",
  "loan_draw",
  "ipo_proceeds",
  "dividend",
  "rd_investment",
] as const;

export type NotableMovementType = (typeof NOTABLE_MOVEMENT_TYPES)[number];

export function isNotableMovement(movementType: string): movementType is NotableMovementType {
  return (NOTABLE_MOVEMENT_TYPES as readonly string[]).includes(movementType);
}

export function buildActivityLine(movementType: NotableMovementType, companyName: string): string {
  switch (movementType) {
    case "industrial_transition":
      return `${companyName} went industrial.`;
    case "machine_purchase":
      return `${companyName} bought a new machine.`;
    case "loan_draw":
      return `${companyName} took out a loan.`;
    case "ipo_proceeds":
      return `${companyName} went public.`;
    case "dividend":
      return `${companyName} paid a dividend.`;
    case "rd_investment":
      return `${companyName} invested in R&D.`;
  }
}
