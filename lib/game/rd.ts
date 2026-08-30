// R&D resolves instantly on starting (risk roll happens immediately),
// not across rd_levels_catalog.duration_turns — same simplification
// made for the commercial->industrial transition, and for the same
// reason: there's no multi-turn "project in progress" tracking
// infrastructure yet, and modeling a wait with nothing to fill it
// adds complexity without payoff.
//
// Success effect: each successfully completed level permanently
// reduces the company's production defect rate — a concrete, testable
// tie-in to the maintenance/quality system already built, rather than
// an abstract "IP" system with no mechanical effect.
export const RD_DEFECT_REDUCTION_PER_LEVEL = 0.003; // 0.3 percentage points per level

export function getNextEligibleRdLevel(successfulLevels: number[]): number {
  const maxCompleted = successfulLevels.length > 0 ? Math.max(...successfulLevels) : 0;
  return Math.min(12, maxCompleted + 1);
}

// Success chance is 1 - risk. A level with base_risk_pct=30 succeeds on
// 70% of draws.
export function rollRdOutcome(baseRiskPct: number, random: number = Math.random()): boolean {
  return random >= baseRiskPct / 100;
}

export function computeRdDefectBonus(successfulLevelsCount: number): number {
  return successfulLevelsCount * RD_DEFECT_REDUCTION_PER_LEVEL;
}
