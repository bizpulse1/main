export interface BomComponent {
  component_code: string;
  quantity_per_unit: number;
}

export interface MaterialStock {
  component_code: string;
  quantity_on_hand: number;
}

export type CapacityConstraint = "machine" | "materials" | "target";

// Production output is bound by three independent limits — target
// (what the player asked for), machine capacity (nominal_capacity_per_turn,
// wear/breakdown not modeled yet — see note in resolveTurn), and
// materials (the tightest of: stock_of_component / quantity_per_unit,
// across every BOM component — one missing ingredient caps everything).
// Reports which constraint actually bound the result, since that's the
// single most useful piece of feedback for the player to act on next
// turn (buy more materials vs. buy a bigger machine vs. raise target).
export function computeProduction({
  targetQuantity,
  machineCapacity,
  bom,
  materialStock,
}: {
  targetQuantity: number;
  machineCapacity: number;
  bom: BomComponent[];
  materialStock: MaterialStock[];
}): {
  producedQuantity: number;
  constraint: CapacityConstraint;
  materialsConsumed: Record<string, number>;
} {
  const stockByComponent = new Map(materialStock.map((m) => [m.component_code, m.quantity_on_hand]));

  let materialsConstrainedQuantity = Infinity;
  for (const line of bom) {
    if (line.quantity_per_unit <= 0) continue;
    const available = stockByComponent.get(line.component_code) ?? 0;
    const possibleUnits = Math.floor(available / line.quantity_per_unit);
    materialsConstrainedQuantity = Math.min(materialsConstrainedQuantity, possibleUnits);
  }
  if (!Number.isFinite(materialsConstrainedQuantity)) {
    materialsConstrainedQuantity = 0; // no BOM defined for this range — can't produce
  }

  const candidates: { value: number; constraint: CapacityConstraint }[] = [
    { value: targetQuantity, constraint: "target" },
    { value: machineCapacity, constraint: "machine" },
    { value: materialsConstrainedQuantity, constraint: "materials" },
  ];
  const binding = candidates.reduce((min, c) => (c.value < min.value ? c : min));
  const producedQuantity = Math.max(0, Math.floor(binding.value));

  const materialsConsumed: Record<string, number> = {};
  for (const line of bom) {
    materialsConsumed[line.component_code] = line.quantity_per_unit * producedQuantity;
  }

  return { producedQuantity, constraint: binding.constraint, materialsConsumed };
}
