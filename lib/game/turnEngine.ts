import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { computeLevel } from "./progression";
import { computeProduction } from "./production";
import { computeWearAfterProduction, computeDefects, rollBreakdown, CORRECTIVE_MAINTENANCE_COST } from "./maintenance";
import { computeRdDefectBonus } from "./rd";
import { computeQuarterlyPayment } from "./loans";
import { isPolicyActive, computeInsurancePayout } from "./insurance";
import { computeSocialScore, computeEnvironmentalScore, computeGovernanceScore } from "./rse";
import {
  computePriceScore,
  computeQualityScore,
  computeMarketingScore,
  computeStockAvailabilityScore,
  computeCommercialTermsScore,
  computeReputationScore,
  computeAttractivenessScore,
  computeMarketShareAllocation,
  AI_COMPETITOR_PROFILES,
  ATTRIBUTE_WEIGHTS,
  type AttributeScores,
  type MarketParticipant,
} from "./competitors";

type IncomeProfile = "rich" | "mixed" | "poor";

interface DemandParams {
  base_conversion_rate: number;
  sensitivity_factor: number;
  price_elasticity: Record<
    IncomeProfile,
    { min_multiplier: number; max_multiplier: number }
  >;
}

const DEFAULT_DEMAND_PARAMS: DemandParams = {
  base_conversion_rate: 0.004,
  sensitivity_factor: 2,
  price_elasticity: {
    rich: { min_multiplier: 0.5, max_multiplier: 1.3 },
    mixed: { min_multiplier: 0.3, max_multiplier: 1.4 },
    poor: { min_multiplier: 0.15, max_multiplier: 1.6 },
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const ARGUMENT_DEMAND_BONUS = 0.03; // per sales argument used, up to 2

// Sequential weighted roll: each event's base_probability is a slice of
// [0,1), evaluated in the order given. Sum of probabilities across all
// catalog events should stay comfortably under 1 (leftover probability
// mass = "nothing happens this turn"). `random` is injectable so this
// is deterministically testable without mocking Math.random.
export function rollEvent(
  events: { id: string; base_probability: number }[],
  random: number = Math.random()
): string | null {
  let cumulative = 0;
  for (const e of events) {
    cumulative += e.base_probability;
    if (random < cumulative) return e.id;
  }
  return null;
}

// Demand model for Tour 1 (single company, no competitor engine seeded
// yet — that's real future work, not faked here). Deliberately simple
// but not arbitrary: every constant comes from parameter_versions so
// tuning later is a data change, not a code change.
//
//   zoneDemandPotential = population_size × base_conversion_rate
//   priceMultiplier     = 1 + (pctCheaperThanReference × sensitivity_factor),
//                         clamped per zone income_profile
//   demandCaptured      = zoneDemandPotential × priceMultiplier
//   unitsSold           = min(stock, salesTarget, demandCaptured)
export function computeDemand({
  populationSize,
  incomeProfile,
  salePrice,
  marketReferencePrice,
  params = DEFAULT_DEMAND_PARAMS,
}: {
  populationSize: number;
  incomeProfile: string;
  salePrice: number;
  marketReferencePrice: number;
  params?: DemandParams;
}) {
  const profile: IncomeProfile =
    incomeProfile === "rich" || incomeProfile === "poor" ? incomeProfile : "mixed";
  const elasticity = params.price_elasticity[profile];

  const zoneDemandPotential = populationSize * params.base_conversion_rate;
  const pctCheaperThanReference =
    marketReferencePrice > 0
      ? (marketReferencePrice - salePrice) / marketReferencePrice
      : 0;
  const rawMultiplier = 1 + pctCheaperThanReference * params.sensitivity_factor;
  const priceMultiplier = clamp(
    rawMultiplier,
    elasticity.min_multiplier,
    elasticity.max_multiplier
  );

  return {
    demandCaptured: zoneDemandPotential * priceMultiplier,
    priceMultiplier,
  };
}

export async function resolveTurn(
  supabase: SupabaseClient<Database>,
  companyId: string,
  turnId: string
) {
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  if (!company) throw new Error("Company not found");

  const [{ data: zone }, { data: session }, { data: pricing }, { data: inventory }, { data: premises }] =
    await Promise.all([
      supabase.from("zones").select("*").eq("id", company.zone_id).single(),
      supabase
        .from("game_sessions")
        .select("parameter_version_id")
        .eq("id", company.session_id)
        .single(),
      supabase
        .from("company_pricing_decisions")
        .select("*")
        .eq("company_id", companyId)
        .eq("turn_id", turnId)
        .eq("range_code", "reference")
        .single(),
      supabase
        .from("inventory_lots")
        .select("*")
        .eq("company_id", companyId)
        .eq("range_code", "reference")
        .order("quantity_on_hand", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("company_premises")
        .select("premises_option_id")
        .eq("company_id", companyId)
        .is("released_turn_id", null)
        .single(),
    ]);

  if (!zone || !pricing || !inventory || !session) {
    throw new Error("Missing turn inputs — depot, supplier, purchase, or pricing not complete");
  }

  const { data: paramVersion } = await supabase
    .from("parameter_versions")
    .select("parameters")
    .eq("id", session.parameter_version_id)
    .single();
  // parameters is namespaced by category (e.g. { demand: {...}, future
  // categories like banking/production go alongside it later) so
  // different systems can share one parameter_versions row without
  // key collisions. Validate the actual shape we need, not just that
  // *some* keys exist — an empty {} and a differently-shaped non-empty
  // object both need to fall back to defaults, not crash downstream.
  const demandParams = paramVersion?.parameters?.demand as DemandParams | undefined;
  const params: DemandParams =
    demandParams && typeof demandParams.price_elasticity === "object"
      ? demandParams
      : DEFAULT_DEMAND_PARAMS;

  const { data: range } = await supabase
    .from("product_ranges")
    .select("reference_market_price")
    .eq("code", "reference")
    .single();
  const marketReferencePrice = range?.reference_market_price ?? pricing.sale_price;

  // Zone total demand — independent of any one company's price/decisions;
  // this is the whole addressable market this turn, split among
  // competitors below by attractiveness rather than any one company
  // computing "its own" demand in isolation (the old model).
  const zoneDemandPotential = (zone.population_size ?? 0) * params.base_conversion_rate;

  // Marketing: sum of awareness_effect for every campaign invested in
  // this turn (already paid for at investment time, not charged again
  // here — this only reads the effect).
  const { data: investments } = await supabase
    .from("company_marketing_investments")
    .select("campaign_id")
    .eq("company_id", companyId)
    .eq("turn_id", turnId);
  let marketingBonus = 0;
  if (investments && investments.length > 0) {
    const { data: campaigns } = await supabase
      .from("marketing_campaigns_catalog")
      .select("id, awareness_effect")
      .in(
        "id",
        investments.map((i) => i.campaign_id)
      );
    marketingBonus = (campaigns ?? []).reduce((sum, c) => sum + (c.awareness_effect ?? 0), 0);
  }

  // Sales arguments: flat small bonus per argument actually selected.
  const { data: argsUsed } = await supabase
    .from("company_sales_arguments_used")
    .select("argument_1_id, argument_2_id")
    .eq("company_id", companyId)
    .eq("turn_id", turnId)
    .eq("range_code", "reference")
    .maybeSingle();
  const argumentCount = [argsUsed?.argument_1_id, argsUsed?.argument_2_id].filter(Boolean).length;
  const argumentsBonus = argumentCount * ARGUMENT_DEMAND_BONUS;

  // Random event roll — one per turn. Macro-category events scale the
  // whole zone's demand pool; operational-risk events penalize only
  // this company's own reputation attribute instead — previously both
  // categories were treated identically (scaling one company's demand
  // directly), which didn't actually match what event_catalog.category
  // was for.
  const { data: eventCatalog } = await supabase
    .from("event_catalog")
    .select("id, code, category, label, base_probability, effect_template");
  const triggeredEventId = rollEvent(
    (eventCatalog ?? []).map((e) => ({ id: e.id, base_probability: e.base_probability }))
  );
  let macroFactor = 1;
  let eventReputationPenalty = 0;
  let eventExtraCost = 0;
  let triggeredEvent: { code: string; label?: string } | null = null;
  if (triggeredEventId) {
    const fullEventRow = (eventCatalog ?? []).find((e) => e.id === triggeredEventId);
    if (fullEventRow) {
      const effect = fullEventRow.effect_template as Record<string, number>;
      eventExtraCost = effect.extra_cost ?? 0;
      if (fullEventRow.category === "macro" && effect.demand_multiplier !== undefined) {
        macroFactor = effect.demand_multiplier;
      } else if (fullEventRow.category === "operational_risk" && effect.demand_multiplier !== undefined) {
        // A demand_multiplier of 0.95 (5% below neutral) converts to a
        // 15-point reputation penalty — company-specific, not a
        // market-wide effect, matching what "operational_risk" means.
        eventReputationPenalty = (1 - effect.demand_multiplier) * 300;
      }
      triggeredEvent = { code: fullEventRow.code, label: fullEventRow.label ?? undefined };

      await supabase.from("turn_events").insert({
        session_id: company.session_id,
        company_id: companyId,
        turn_id: turnId,
        event_catalog_id: triggeredEventId,
        severity: "normal",
        effect_applied: effect,
      });
    }
  }

  const totalZoneDemand = zoneDemandPotential * macroFactor;
  await supabase.from("market_demand").upsert(
    {
      session_id: company.session_id,
      turn_id: turnId,
      zone_id: zone.id,
      range_code: "reference",
      base_demand: zoneDemandPotential,
      seasonal_factor: 1,
      macro_factor: macroFactor,
      total_demand: totalZoneDemand,
    },
    { onConflict: "session_id,turn_id,zone_id,range_code" }
  );

  // Industrial production — only applies if the company has an active
  // machine and set a production target this turn. Produced units are
  // added to the same finished-goods inventory pool commercial purchases
  // use, so pricing/sales work identically regardless of source.
  let producedQuantity = 0;
  let sellableQuantity = 0;
  let defectQuantity = 0;
  let defectRate = 0;
  let productionUnitCost = 0;
  let energyCost = 0;
  let productionConstraint: string | null = null;
  let breakdownOccurred = false;
  let correctiveMaintenanceCost = 0;
  const rawMaterialUpdates: { itemType: string; newQuantity: number }[] = [];

  const { data: activeMachine } = await supabase
    .from("company_machines")
    .select("id, machine_catalog_id, cumulative_production, wear_pct")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (activeMachine) {
    const { data: productionOrder } = await supabase
      .from("production_orders")
      .select("id, target_quantity")
      .eq("company_id", companyId)
      .eq("turn_id", turnId)
      .eq("range_code", "reference")
      .maybeSingle();

    if (productionOrder) {
      const { data: maintenanceThisTurn } = await supabase
        .from("maintenance_logs")
        .select("id")
        .eq("company_machine_id", activeMachine.id)
        .eq("turn_id", turnId)
        .eq("type", "preventive")
        .maybeSingle();
      const maintenancePerformed = Boolean(maintenanceThisTurn);

      breakdownOccurred = rollBreakdown(activeMachine.wear_pct, maintenancePerformed);

      if (breakdownOccurred) {
        // Machine is down this turn — zero output, but the corrective
        // repair happens automatically (matches auto_authorize_ceiling's
        // intent in the schema: routine repairs don't need a separate
        // player decision) and costs more than scheduling maintenance
        // would have.
        correctiveMaintenanceCost = CORRECTIVE_MAINTENANCE_COST;
        await supabase.from("maintenance_logs").insert({
          company_machine_id: activeMachine.id,
          turn_id: turnId,
          type: "corrective",
          cost: correctiveMaintenanceCost,
          breakdown_occurred: true,
          downtime_turns: 1,
        });
      } else {
        const [{ data: machineCatalog }, { data: bomRows }, { data: rawStock }, { data: assemblyLine }, { data: successfulRd }] =
          await Promise.all([
            supabase
              .from("machines_catalog")
              .select("nominal_capacity_per_turn, energy_cost_per_unit")
              .eq("id", activeMachine.machine_catalog_id)
              .single(),
            supabase
              .from("bill_of_materials")
              .select("component_code, quantity_per_unit")
              .eq("range_code", "reference"),
            supabase
              .from("inventory_lots")
              .select("*")
              .eq("company_id", companyId)
              .in("item_type", ["raw_material_c1", "raw_material_c2", "packaging"]),
            supabase
              .from("company_assembly_lines")
              .select("assembly_line_catalog_id")
              .eq("company_id", companyId)
              .eq("status", "active")
              .maybeSingle(),
            supabase
              .from("company_rd_projects")
              .select("level")
              .eq("company_id", companyId)
              .eq("status", "success"),
          ]);

        let assemblyLineCapacity = 0;
        let assemblyLineEnergyRate = 0;
        if (assemblyLine) {
          const { data: assemblyCatalog } = await supabase
            .from("assembly_lines_catalog")
            .select("capacity_per_turn, energy_per_unit")
            .eq("id", assemblyLine.assembly_line_catalog_id)
            .single();
          assemblyLineCapacity = assemblyCatalog?.capacity_per_turn ?? 0;
          assemblyLineEnergyRate = assemblyCatalog?.energy_per_unit ?? 0;
        }
        const machineBaseCapacity = machineCatalog?.nominal_capacity_per_turn ?? 0;
        const rdDefectBonus = computeRdDefectBonus((successfulRd ?? []).length);

        const bomComponentToItemType: Record<string, string> = {
          C1: "raw_material_c1",
          C2: "raw_material_c2",
          packaging: "packaging",
        };
        const stockByItemType = new Map<string, (typeof rawStock extends (infer R)[] | null ? R : never)>(
          (rawStock ?? []).map((r) => [r.item_type as string, r])
        );

        const bomForCalc = (bomRows ?? [])
          .filter((b) => bomComponentToItemType[b.component_code])
          .map((b) => ({
            component_code: bomComponentToItemType[b.component_code],
            quantity_per_unit: b.quantity_per_unit,
          }));
        const materialStockForCalc = (rawStock ?? []).map((r) => ({
          component_code: r.item_type,
          quantity_on_hand: r.quantity_on_hand,
        }));

        const production = computeProduction({
          targetQuantity: productionOrder.target_quantity,
          machineCapacity: machineBaseCapacity + assemblyLineCapacity,
          bom: bomForCalc,
          materialStock: materialStockForCalc,
        });

        producedQuantity = production.producedQuantity;
        productionConstraint = production.constraint;
        // Machine capacity is used first, the assembly line makes up
        // any output beyond it — a defensible, simple allocation for
        // attributing energy cost across two capacity sources without
        // computeProduction needing to know they're separate.
        const unitsFromMachine = Math.min(producedQuantity, machineBaseCapacity);
        const unitsFromAssembly = Math.max(0, producedQuantity - machineBaseCapacity);
        energyCost =
          unitsFromMachine * (machineCatalog?.energy_cost_per_unit ?? 0) +
          unitsFromAssembly * assemblyLineEnergyRate;

        const defects = computeDefects(producedQuantity, activeMachine.wear_pct, rdDefectBonus);
        sellableQuantity = defects.sellableQuantity;
        defectQuantity = defects.defectQuantity;
        defectRate = defects.defectRate;

        if (producedQuantity > 0) {
          let totalMaterialCost = 0;
          for (const [itemType, consumed] of Object.entries(production.materialsConsumed)) {
            const stockRow = stockByItemType.get(itemType);
            if (!stockRow || consumed <= 0) continue;
            totalMaterialCost += consumed * stockRow.unit_cost;
            rawMaterialUpdates.push({
              itemType,
              newQuantity: stockRow.quantity_on_hand - consumed,
            });
          }
          // Cost basis is spread across SELLABLE units only — defective
          // units still consumed materials but produce no revenue, so
          // their cost is absorbed into what does sell, not lost track of.
          productionUnitCost = sellableQuantity > 0 ? totalMaterialCost / sellableQuantity : 0;
        }

        await supabase
          .from("production_orders")
          .update({
            produced_quantity: producedQuantity,
            defect_quantity: defectQuantity,
            capacity_constraint: productionConstraint,
          })
          .eq("id", productionOrder.id);

        for (const update of rawMaterialUpdates) {
          const stockRow = (rawStock ?? []).find((r) => r.item_type === update.itemType);
          if (stockRow) {
            await supabase
              .from("inventory_lots")
              .update({ quantity_on_hand: update.newQuantity })
              .eq("id", stockRow.id);
          }
        }
      }

      const newWear = computeWearAfterProduction(
        activeMachine.wear_pct,
        producedQuantity,
        maintenancePerformed
      );
      await supabase
        .from("company_machines")
        .update({
          cumulative_production: activeMachine.cumulative_production + producedQuantity,
          wear_pct: newWear,
        })
        .eq("id", activeMachine.id);

      await supabase.from("company_quality_metrics").upsert(
        {
          company_id: companyId,
          turn_id: turnId,
          defect_rate: defectRate,
          complaints_count: 0,
          sav_cost: 0,
        },
        { onConflict: "company_id,turn_id" }
      );
    }
  }

  const stockBeforeSales = inventory.quantity_on_hand + sellableQuantity;
  const blendedUnitCost =
    sellableQuantity > 0
      ? (inventory.quantity_on_hand * inventory.unit_cost + sellableQuantity * productionUnitCost) /
        stockBeforeSales
      : inventory.unit_cost;

  // RSE scores (worker satisfaction / energy spend / R&D maturity) are
  // needed now for the reputation attribute below, not just for the
  // RSE screen later — computed once here and reused for both.
  const { data: activeWorkers } = await supabase
    .from("workers")
    .select("base_salary, satisfaction_pct")
    .eq("company_id", companyId)
    .eq("status", "active");
  const { data: successfulRdForRse } = await supabase
    .from("company_rd_projects")
    .select("level")
    .eq("company_id", companyId)
    .eq("status", "success");
  const socialScore = computeSocialScore((activeWorkers ?? []).map((w) => w.satisfaction_pct));
  const environmentalScore = computeEnvironmentalScore(energyCost);
  const governanceScore = computeGovernanceScore((successfulRdForRse ?? []).length);
  await supabase.from("company_rse_metrics").upsert(
    {
      company_id: companyId,
      turn_id: turnId,
      social_score: socialScore,
      environmental_score: environmentalScore,
      governance_score: governanceScore,
    },
    { onConflict: "company_id,turn_id" }
  );

  // Company's own attractiveness score (6 computed attributes — see
  // lib/game/competitors.ts). Quality only reflects actual defects for
  // an industrial company that produced this turn; everyone else gets
  // the flat baseline (no defect model exists for pure resale).
  const companyPriceScore = computePriceScore(
    pricing.sale_price,
    marketReferencePrice,
    zone.income_profile,
    params
  );
  const companyQualityScore = computeQualityScore(producedQuantity > 0 ? defectRate * 100 : null);
  const companyMarketingScore = computeMarketingScore(marketingBonus);
  const companyStockScore = computeStockAvailabilityScore(stockBeforeSales, pricing.sales_target_quantity);
  const companyCommercialTermsScore = computeCommercialTermsScore(argumentsBonus);
  const companyReputationScore = Math.max(
    0,
    computeReputationScore(environmentalScore, socialScore, governanceScore) - eventReputationPenalty
  );
  const companyAttributeScores: AttributeScores = {
    price: companyPriceScore,
    quality: companyQualityScore,
    marketing: companyMarketingScore,
    stock_availability: companyStockScore,
    commercial_terms: companyCommercialTermsScore,
    reputation: companyReputationScore,
  };
  const companyAttractiveness = computeAttractivenessScore(companyAttributeScores);

  await supabase.from("company_attribute_scores").upsert(
    (Object.keys(companyAttributeScores) as (keyof AttributeScores)[]).map((attr) => ({
      company_id: companyId,
      turn_id: turnId,
      range_code: "reference" as const,
      attribute_code: attr,
      score: companyAttributeScores[attr],
    })),
    { onConflict: "company_id,turn_id,range_code,attribute_code" }
  );

  // 4 fixed AI competitors, always present in solo-vs-AI mode, sharing
  // this zone's demand pool with the company being resolved. Prices
  // run through the SAME computePriceScore as the player so scores
  // stay on a consistent scale.
  const { data: competitorProfileRows } = await supabase.from("competitor_profiles").select("id, code");
  const competitorParticipants: MarketParticipant[] = [];
  for (const profile of AI_COMPETITOR_PROFILES) {
    const profileRow = (competitorProfileRows ?? []).find((p) => p.code === profile.code);
    if (!profileRow) continue; // seed data not applied yet — skip rather than crash
    const competitorPrice = marketReferencePrice * profile.priceStanceMultiplier;
    const competitorPriceScore = computePriceScore(
      competitorPrice,
      marketReferencePrice,
      zone.income_profile,
      params
    );
    const competitorScores: AttributeScores = {
      price: competitorPriceScore,
      quality: profile.quality,
      marketing: profile.marketing,
      stock_availability: profile.stock_availability,
      commercial_terms: profile.commercial_terms,
      reputation: profile.reputation,
    };
    const competitorAttractiveness = computeAttractivenessScore(competitorScores);
    competitorParticipants.push({
      participantType: "competitor",
      participantId: profileRow.id,
      attractivenessScore: competitorAttractiveness,
    });

    // competitor_state has a surrogate `id` primary key, not a natural
    // composite unique constraint — plain insert, not upsert (each
    // resolveTurn call only writes this once per profile per turn).
    await supabase.from("competitor_state").insert({
      session_id: company.session_id,
      competitor_profile_id: profileRow.id,
      turn_id: turnId,
      range_code: "reference",
      price: competitorPrice,
      quality_score: profile.quality,
      marketing_score: profile.marketing,
      stock_level: null,
    });
  }

  // Real sibling companies sharing this session (multiplayer matches) —
  // included using their MOST RECENTLY computed attractiveness, not
  // requiring lockstep turn synchronization with the company being
  // resolved right now. True synchronous "everyone resolves together"
  // multiplayer turns would be a genuinely separate, larger feature
  // (a match-level "waiting for players" state machine); this is an
  // honest, asynchronous-but-fair approximation instead. A sibling
  // with no resolved turns yet has no market presence to include.
  const { data: siblingCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("session_id", company.session_id)
    .neq("id", companyId);
  const siblingParticipants: MarketParticipant[] = [];
  for (const sibling of siblingCompanies ?? []) {
    const { data: siblingScoreRows } = await supabase
      .from("company_attribute_scores")
      .select("turn_id, attribute_code, score")
      .eq("company_id", sibling.id)
      .eq("range_code", "reference");
    if (!siblingScoreRows || siblingScoreRows.length === 0) continue;

    const siblingTurnIds = Array.from(new Set(siblingScoreRows.map((r) => r.turn_id)));
    const { data: siblingTurns } = await supabase
      .from("session_turns")
      .select("id, turn_number")
      .in("id", siblingTurnIds);
    const latestTurn = (siblingTurns ?? []).reduce<{ id: string; turn_number: number } | null>(
      (max, t) => (!max || t.turn_number > max.turn_number ? t : max),
      null
    );
    if (!latestTurn) continue;

    const latestScores = siblingScoreRows.filter((r) => r.turn_id === latestTurn.id);
    const siblingAttrScores: Partial<AttributeScores> = {};
    for (const row of latestScores) {
      (siblingAttrScores as Record<string, number>)[row.attribute_code] = row.score;
    }
    const requiredKeys = Object.keys(ATTRIBUTE_WEIGHTS) as (keyof AttributeScores)[];
    if (!requiredKeys.every((k) => siblingAttrScores[k] !== undefined)) continue;

    siblingParticipants.push({
      participantType: "company",
      participantId: sibling.id,
      attractivenessScore: computeAttractivenessScore(siblingAttrScores as AttributeScores),
    });
  }

  const allParticipants: MarketParticipant[] = [
    { participantType: "company", participantId: companyId, attractivenessScore: companyAttractiveness },
    ...siblingParticipants,
    ...competitorParticipants,
  ];
  const allocation = computeMarketShareAllocation(allParticipants, totalZoneDemand);

  await supabase.from("market_share_allocation").upsert(
    allocation.map((a) => ({
      session_id: company.session_id,
      turn_id: turnId,
      range_code: "reference" as const,
      participant_type: a.participantType,
      participant_id: a.participantId,
      attractiveness_score:
        allParticipants.find((p) => p.participantId === a.participantId && p.participantType === a.participantType)
          ?.attractivenessScore ?? 0,
      market_share_pct: a.marketSharePct,
      allocated_demand: a.allocatedDemand,
    })),
    { onConflict: "session_id,turn_id,range_code,participant_type,participant_id" }
  );

  const companyMarketShareResult = allocation.find(
    (a) => a.participantType === "company" && a.participantId === companyId
  );
  const companyAllocatedDemand = companyMarketShareResult?.allocatedDemand ?? 0;

  const unitsSold = Math.max(
    0,
    Math.min(stockBeforeSales, pricing.sales_target_quantity, Math.floor(companyAllocatedDemand))
  );
  const unitsLostDemand = Math.max(0, pricing.sales_target_quantity - unitsSold);
  const revenue = unitsSold * pricing.sale_price;

  let rentPerTurn = 0;
  let chargesPerTurn = 0;
  if (premises) {
    const { data: option } = await supabase
      .from("premises_options")
      .select("rent_per_turn, charges_per_turn")
      .eq("id", premises.premises_option_id)
      .single();
    rentPerTurn = option?.rent_per_turn ?? 0;
    chargesPerTurn = option?.charges_per_turn ?? 0;
  }

  const payroll = (activeWorkers ?? []).reduce((sum, w) => sum + w.base_salary, 0);

  // Every loan with a remaining balance gets an automatic amortized
  // payment this turn — no player decision needed, matching how rent
  // and payroll are also unavoidable fixed costs.
  const { data: activeLoans } = await supabase
    .from("company_bank_loans")
    .select("*")
    .eq("company_id", companyId)
    .gt("remaining_balance", 0);
  let loanRepayment = 0;
  const loanUpdates: { id: string; newRemainingBalance: number }[] = [];
  for (const loan of activeLoans ?? []) {
    const payment = computeQuarterlyPayment(
      loan.remaining_balance,
      loan.principal,
      loan.term_turns,
      loan.rate_pct
    );
    loanRepayment += payment.totalPayment;
    loanUpdates.push({ id: loan.id, newRemainingBalance: payment.newRemainingBalance });
  }

  // Insurance: charge the premium if a policy is active this turn, and
  // pay out a claim against this turn's insurable losses (breakdown
  // repair + operational-risk event cost) — the two cost categories
  // already computed above, not a new claims model.
  const { data: policies } = await supabase
    .from("company_insurance_policies")
    .select("formula, start_turn_id")
    .eq("company_id", companyId);
  let insurancePremium = 0;
  let insurancePayout = 0;
  if (policies && policies.length > 0) {
    const { data: thisTurnRow } = await supabase
      .from("session_turns")
      .select("turn_number")
      .eq("id", turnId)
      .single();
    for (const policy of policies) {
      const [{ data: startTurnRow }, { data: formulaInfo }] = await Promise.all([
        supabase.from("session_turns").select("turn_number").eq("id", policy.start_turn_id).single(),
        supabase
          .from("insurance_formulas_catalog")
          .select("duration_turns, premium_per_turn, deductible, coverage_cap")
          .eq("formula", policy.formula)
          .single(),
      ]);
      if (!startTurnRow || !formulaInfo || !thisTurnRow) continue;
      if (isPolicyActive(startTurnRow.turn_number, formulaInfo.duration_turns, thisTurnRow.turn_number)) {
        insurancePremium += formulaInfo.premium_per_turn ?? 0;
        const insurableLoss = correctiveMaintenanceCost + eventExtraCost;
        if (insurableLoss > 0) {
          insurancePayout += computeInsurancePayout(
            insurableLoss,
            formulaInfo.deductible ?? 0,
            formulaInfo.coverage_cap ?? 0
          );
        }
      }
    }
  }

  const totalTurnCosts =
    rentPerTurn +
    chargesPerTurn +
    payroll +
    eventExtraCost +
    energyCost +
    correctiveMaintenanceCost +
    loanRepayment +
    insurancePremium -
    insurancePayout;

  // 1. Update remaining stock — combines production's addition and
  // sales' subtraction into a single write against the same row.
  const { error: invError } = await supabase
    .from("inventory_lots")
    .update({ quantity_on_hand: stockBeforeSales - unitsSold, unit_cost: blendedUnitCost })
    .eq("id", inventory.id);
  if (invError) throw new Error(invError.message);

  // 2. Record the sale outcome
  const { error: salesError } = await supabase.from("sales_results").insert({
    company_id: companyId,
    turn_id: turnId,
    range_code: "reference",
    units_sold: unitsSold,
    units_lost_demand: unitsLostDemand,
    revenue,
    avg_price: pricing.sale_price,
  });
  if (salesError) throw new Error(salesError.message);

  // 3. Treasury entries: sale revenue in, rent + charges out
  const ledgerRows: Database["public"]["Tables"]["treasury_ledger"]["Insert"][] = [
    {
      company_id: companyId,
      turn_id: turnId,
      movement_type: "sale",
      direction: "in",
      amount: revenue,
      reference_table: "sales_results",
      reference_id: null,
    },
  ];
  if (rentPerTurn + chargesPerTurn > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "rent_and_charges",
      direction: "out",
      amount: rentPerTurn + chargesPerTurn,
      reference_table: "company_premises",
      reference_id: null,
    });
  }
  if (payroll > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "payroll",
      direction: "out",
      amount: payroll,
      reference_table: "workers",
      reference_id: null,
    });
  }
  if (eventExtraCost > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "event",
      direction: "out",
      amount: eventExtraCost,
      reference_table: "turn_events",
      reference_id: null,
    });
  }
  if (energyCost > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "energy",
      direction: "out",
      amount: energyCost,
      reference_table: "production_orders",
      reference_id: null,
    });
  }
  if (correctiveMaintenanceCost > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "corrective_maintenance",
      direction: "out",
      amount: correctiveMaintenanceCost,
      reference_table: "maintenance_logs",
      reference_id: null,
    });
  }
  if (loanRepayment > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "loan_repayment",
      direction: "out",
      amount: loanRepayment,
      reference_table: "company_bank_loans",
      reference_id: null,
    });
  }
  if (insurancePremium > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "insurance_premium",
      direction: "out",
      amount: insurancePremium,
      reference_table: "company_insurance_policies",
      reference_id: null,
    });
  }
  if (insurancePayout > 0) {
    ledgerRows.push({
      company_id: companyId,
      turn_id: turnId,
      movement_type: "insurance_payout",
      direction: "in",
      amount: insurancePayout,
      reference_table: "company_insurance_policies",
      reference_id: null,
    });
  }
  const { error: ledgerError } = await supabase.from("treasury_ledger").insert(ledgerRows);
  if (ledgerError) throw new Error(ledgerError.message);

  for (const update of loanUpdates) {
    await supabase
      .from("company_bank_loans")
      .update({ remaining_balance: update.newRemainingBalance })
      .eq("id", update.id);
  }

  // 4. Update capital
  const newCapital = company.capital + revenue - totalTurnCosts;

  // 4b. Level progression — checked every turn against the new capital,
  // respecting the plan's level cap (subscriptions.level_cap: 3 for
  // free, null/unlimited for paid).
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("level_cap")
    .eq("user_id", company.owner_user_id)
    .maybeSingle();
  const { level: newLevel, atCap } = computeLevel(
    newCapital,
    company.current_level,
    subscription?.level_cap ?? 3
  );
  const leveledUp = newLevel > company.current_level;

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: newCapital, current_level: newLevel })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  // 5. Dashboard summary for the results screen
  const kpis = {
    units_sold: unitsSold,
    units_lost_demand: unitsLostDemand,
    demand_captured: Math.round(companyAllocatedDemand),
    revenue,
    rent_and_charges: rentPerTurn + chargesPerTurn,
    payroll,
    net_cash_change: revenue - totalTurnCosts,
    capital_after: newCapital,
    stock_remaining: stockBeforeSales - unitsSold,
    sale_price: pricing.sale_price,
    market_reference_price: marketReferencePrice,
    marketing_bonus_pct: Math.round(marketingBonus * 100),
    arguments_bonus_pct: Math.round(argumentsBonus * 100),
    event_code: triggeredEvent?.code ?? null,
    event_label: triggeredEvent?.label ?? null,
    event_extra_cost: eventExtraCost,
    level: newLevel,
    leveled_up: leveledUp,
    at_level_cap: atCap,
    produced_quantity: producedQuantity,
    production_constraint: productionConstraint,
    energy_cost: energyCost,
    sellable_quantity: sellableQuantity,
    defect_quantity: defectQuantity,
    defect_rate_pct: Math.round(defectRate * 1000) / 10,
    breakdown_occurred: breakdownOccurred,
    corrective_maintenance_cost: correctiveMaintenanceCost,
    loan_repayment: loanRepayment,
    insurance_premium: insurancePremium,
    insurance_payout: insurancePayout,
    social_score: socialScore,
    environmental_score: environmentalScore,
    governance_score: governanceScore,
    attractiveness_score: Math.round(companyAttractiveness * 10) / 10,
    market_share_pct: companyMarketShareResult ? Math.round(companyMarketShareResult.marketSharePct * 10) / 10 : 0,
    total_zone_demand: Math.round(totalZoneDemand),
  };
  const { error: dashError } = await supabase.from("turn_dashboards").upsert(
    {
      company_id: companyId,
      turn_id: turnId,
      department: "general",
      kpis,
    },
    { onConflict: "company_id,turn_id,department" }
  );
  if (dashError) throw new Error(dashError.message);

  // 6. Lock the turn as computed
  const { error: turnError } = await supabase
    .from("session_turns")
    .update({ status: "computed", computed_at: new Date().toISOString() })
    .eq("id", turnId);
  if (turnError) throw new Error(turnError.message);

  return kpis;
}
