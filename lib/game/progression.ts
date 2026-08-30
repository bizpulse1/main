// Level thresholds are capital-growth milestones relative to a 150,000
// dollar starting capital (see /setup/actions.ts createCompany). None of
// the source docs specified exact leveling criteria — this ties
// progression to actual business performance (capital growth) rather
// than turns played, so it rewards good decisions instead of just
// grinding turns on the free plan's unlimited-turns allowance.
export const LEVEL_THRESHOLDS: Record<number, number> = {
  2: 200_000,
  3: 300_000,
  4: 450_000,
  5: 650_000,
  6: 900_000,
  7: 1_200_000,
  8: 1_600_000,
};

// Highest level whose threshold `capital` has crossed, capped at
// `levelCap` (null = uncapped, i.e. paid plan). Never returns a level
// lower than `currentLevel` — levels don't regress if capital drops.
export function computeLevel(
  capital: number,
  currentLevel: number,
  levelCap: number | null
): { level: number; atCap: boolean } {
  let level = currentLevel;
  for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
    const lvlNum = Number(lvl);
    if (capital >= threshold && lvlNum > level) {
      level = lvlNum;
    }
  }

  const cap = levelCap ?? Infinity;
  const atCap = level >= cap;
  return { level: Math.min(level, cap), atCap };
}
