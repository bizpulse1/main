// Turn = 1 quarter (per the schema's own convention), so the annual
// rate on a loan is divided by 4 for each turn's interest charge.
//
// Simplification: the effective rate used is always the bank's stated
// rate (no credit-scoring system exists to justify offering anything
// better or worse), and repayment uses flat principal amortization —
// an equal principal portion every turn, interest computed on the
// declining balance. Simpler than an annuity schedule, and correct in
// the sense that a real bank statement is easy to independently verify
// against.

export interface BankRateProfile {
  rate_pct: number;
  down_payment_pct: number;
  min_term_turns: number;
  max_term_turns: number;
}

export function computeLoanOrigination(
  principal: number,
  rateProfile: BankRateProfile
): { downPaymentAmount: number; netDisbursement: number } {
  const downPaymentAmount = principal * (rateProfile.down_payment_pct / 100);
  return {
    downPaymentAmount,
    netDisbursement: principal - downPaymentAmount,
  };
}

export function computeQuarterlyPayment(
  remainingBalance: number,
  originalPrincipal: number,
  termTurns: number,
  annualRatePct: number
): { principalPortion: number; interestPortion: number; totalPayment: number; newRemainingBalance: number } {
  if (remainingBalance <= 0 || termTurns <= 0) {
    return { principalPortion: 0, interestPortion: 0, totalPayment: 0, newRemainingBalance: 0 };
  }
  const flatPrincipalPortion = originalPrincipal / termTurns;
  const principalPortion = Math.min(flatPrincipalPortion, remainingBalance);
  const quarterlyRate = annualRatePct / 100 / 4;
  const interestPortion = remainingBalance * quarterlyRate;
  const totalPayment = principalPortion + interestPortion;
  const newRemainingBalance = Math.max(0, remainingBalance - principalPortion);
  return { principalPortion, interestPortion, totalPayment, newRemainingBalance };
}
