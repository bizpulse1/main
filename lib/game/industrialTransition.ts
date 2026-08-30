// No source doc specified exact eligibility criteria for the
// commercial -> industrial transition — chose thresholds consistent
// with the level-progression system (lib/game/progression.ts): level 3
// is the free-plan ceiling, so requiring it here means the transition
// is naturally a paid-tier decision without a separate explicit gate.
export const TRANSITION_MIN_LEVEL = 3;
export const TRANSITION_MIN_CAPITAL = 300_000;
export const TRANSITION_COST = 50_000; // workshop retrofit, admin overhead

export function checkTransitionEligibility(level: number, capital: number) {
  const meetsLevel = level >= TRANSITION_MIN_LEVEL;
  const meetsCapital = capital >= TRANSITION_MIN_CAPITAL;
  const canAffordCost = capital >= TRANSITION_COST;
  return {
    eligible: meetsLevel && meetsCapital && canAffordCost,
    meetsLevel,
    meetsCapital,
    canAffordCost,
  };
}
