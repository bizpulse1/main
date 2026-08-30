// Scope decision: no source doc or schema table gives players a
// dedicated "invest in RSE" decision (unlike marketing, which has its
// own catalog + investment table). Rather than invent a new mechanic
// the schema doesn't support, all three scores are DERIVED from state
// the game already tracks:
//   - social: average satisfaction across active workers (HR system)
//   - environmental: inverse of this turn's energy spend (production
//     system) — commercial-only companies have no energy cost, so
//     they get the baseline
//   - governance: R&D maturity (successful levels completed)
// This means RSE naturally improves as a side effect of running the
// company well, rather than being a separate spend to remember.

const BASELINE_SCORE = 50;

export function computeSocialScore(workerSatisfactions: number[]): number {
  if (workerSatisfactions.length === 0) return BASELINE_SCORE;
  const average = workerSatisfactions.reduce((sum, s) => sum + s, 0) / workerSatisfactions.length;
  return clamp(average, 0, 100);
}

export function computeEnvironmentalScore(energyCost: number): number {
  // Baseline 70 (commercial companies, or an industrial company that
  // simply didn't produce this turn, sit here). Every 20 dollars of energy
  // spend cuts 1 point — a rough, tunable proxy for energy intensity.
  return clamp(70 - energyCost / 20, 0, 100);
}

export function computeGovernanceScore(successfulRdLevels: number): number {
  return clamp(40 + successfulRdLevels * 5, 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
