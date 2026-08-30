// No source doc gave exact wear/defect/breakdown numbers — these are
// placeholder constants in the same spirit as the demand-elasticity
// constants: defensible, tunable, not arbitrary. Every number is used
// consistently by both computeWearAfterProduction and computeDefects
// so the story stays coherent: producing more wears the machine faster,
// a worn machine makes more defects and risks breaking down, and
// preventive maintenance is the lever that manages both.

export const MAINTENANCE_COST = 2000;
export const MAINTENANCE_WEAR_REDUCTION = 15; // percentage points
export const CORRECTIVE_MAINTENANCE_COST = 5000;

const WEAR_PER_UNIT_PRODUCED = 0.05; // % wear per unit produced
const BASE_DEFECT_RATE = 0.02; // 2% defects even at zero wear
const DEFECT_WEAR_FACTOR = 0.003; // extra defect rate per wear point
const BREAKDOWN_WEAR_THRESHOLD = 70; // wear% above which breakdown risk applies
const BREAKDOWN_BASE_PROBABILITY = 0.15; // if above threshold and no maintenance this turn

export function computeWearAfterProduction(
  currentWearPct: number,
  unitsProduced: number,
  maintenancePerformed: boolean
): number {
  let wear = currentWearPct + unitsProduced * WEAR_PER_UNIT_PRODUCED;
  if (maintenancePerformed) {
    wear -= MAINTENANCE_WEAR_REDUCTION;
  }
  return Math.min(100, Math.max(0, wear));
}

export function computeDefects(
  producedQuantity: number,
  wearPct: number,
  defectRateReduction: number = 0
): { defectQuantity: number; sellableQuantity: number; defectRate: number } {
  const defectRate = Math.min(
    1,
    Math.max(0, BASE_DEFECT_RATE + wearPct * DEFECT_WEAR_FACTOR - defectRateReduction)
  );
  const defectQuantity = Math.round(producedQuantity * defectRate);
  const sellableQuantity = Math.max(0, producedQuantity - defectQuantity);
  return { defectQuantity, sellableQuantity, defectRate };
}

// Breakdown only becomes possible above the wear threshold, and
// maintenance this turn removes the risk entirely (not just reduces
// it) — the whole point of scheduling maintenance is to prevent this,
// not just to make it less likely.
export function rollBreakdown(
  wearPct: number,
  maintenancePerformed: boolean,
  random: number = Math.random()
): boolean {
  if (maintenancePerformed) return false;
  if (wearPct < BREAKDOWN_WEAR_THRESHOLD) return false;
  return random < BREAKDOWN_BASE_PROBABILITY;
}
