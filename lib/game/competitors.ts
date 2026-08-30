// Implements the schema's intended competitor engine (competitor_profiles,
// demand_attribute_weights, company_attribute_scores, market_demand,
// market_share_allocation) — previously flagged as the single biggest
// gap: every company competed against a static zone demand curve, not
// other sellers.
//
// Scope decision: the schema's comment describes a "12-attribute"
// model. No source doc specifies what all 12 would be, and inventing
// 6 more attributes with no real signal behind them would be less
// honest than a smaller set that's actually grounded in state the
// game already computes. This uses 6: price, quality, marketing,
// stock availability, commercial terms, reputation — each backed by
// a real computed value (defect rate, marketing bonus, RSE scores,
// etc.), not an arbitrary number.
//
// Scoped to SOLO-VS-AI first: every company's own session gets 4 fixed
// AI competitor profiles sharing that zone's demand pool. Real
// multiplayer (multiple actual companies in one session) is a
// separate structural change — company creation currently always
// starts a new session per company, so true multiplayer needs a
// session-joining flow. This engine is designed so multiplayer can
// slot in later as more real "company" participants alongside or
// instead of the AI ones, without changing the allocation math.

export interface IncomeProfileElasticity {
  min_multiplier: number;
  max_multiplier: number;
}

export interface PriceScoreParams {
  base_conversion_rate: number;
  sensitivity_factor: number;
  price_elasticity: Record<"rich" | "mixed" | "poor", IncomeProfileElasticity>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Reuses the exact price-elasticity math from the original per-company
// demand model (rich/mixed/poor clamps) — repurposed from "the sole
// determinant of demand" into "one of six attractiveness inputs",
// rather than discarded. priceMultiplier=1 (priced at reference) maps
// to a neutral score of 50; the clamp bounds still come from
// parameter_versions, so zone price sensitivity still matters exactly
// as it did before.
export function computePriceScore(
  salePrice: number,
  marketReferencePrice: number,
  incomeProfile: string,
  params: PriceScoreParams
): number {
  const profile = incomeProfile === "rich" || incomeProfile === "poor" ? incomeProfile : "mixed";
  const elasticity = params.price_elasticity[profile];
  const pctCheaperThanReference =
    marketReferencePrice > 0 ? (marketReferencePrice - salePrice) / marketReferencePrice : 0;
  const rawMultiplier = 1 + pctCheaperThanReference * params.sensitivity_factor;
  const priceMultiplier = clamp(rawMultiplier, elasticity.min_multiplier, elasticity.max_multiplier);
  return clamp(priceMultiplier * 50, 0, 100);
}

export function computeQualityScore(defectRatePct: number | null): number {
  if (defectRatePct === null) return 70; // commercial companies: no defect model, flat baseline
  return clamp(100 - defectRatePct, 0, 100);
}

export function computeMarketingScore(marketingBonus: number): number {
  return clamp(40 + marketingBonus * 400, 0, 100);
}

export function computeStockAvailabilityScore(stockAvailable: number, targetQuantity: number): number {
  if (targetQuantity <= 0) return 100; // no target means stock can't be the constraint
  return clamp((stockAvailable / targetQuantity) * 100, 0, 100);
}

export function computeCommercialTermsScore(argumentsBonus: number): number {
  return clamp(40 + argumentsBonus * 400, 0, 100);
}

export function computeReputationScore(
  environmentalScore: number,
  socialScore: number,
  governanceScore: number
): number {
  return clamp((environmentalScore + socialScore + governanceScore) / 3, 0, 100);
}

export const ATTRIBUTE_WEIGHTS = {
  price: 30,
  quality: 20,
  marketing: 15,
  stock_availability: 15,
  commercial_terms: 10,
  reputation: 10,
} as const;

export type AttributeScores = Record<keyof typeof ATTRIBUTE_WEIGHTS, number>;

export function computeAttractivenessScore(scores: AttributeScores): number {
  let weightedSum = 0;
  for (const key of Object.keys(ATTRIBUTE_WEIGHTS) as (keyof typeof ATTRIBUTE_WEIGHTS)[]) {
    weightedSum += scores[key] * (ATTRIBUTE_WEIGHTS[key] / 100);
  }
  return weightedSum;
}

export interface MarketParticipant {
  participantType: "company" | "competitor";
  participantId: string;
  attractivenessScore: number;
}

export interface MarketShareResult {
  participantType: "company" | "competitor";
  participantId: string;
  marketSharePct: number;
  allocatedDemand: number;
}

// Proportional allocation by attractiveness. If every participant has
// zero (or negative — shouldn't happen, but defensively clamped)
// attractiveness, demand splits evenly rather than being undefined.
export function computeMarketShareAllocation(
  participants: MarketParticipant[],
  totalDemand: number
): MarketShareResult[] {
  const clamped = participants.map((p) => ({ ...p, attractivenessScore: Math.max(0, p.attractivenessScore) }));
  const totalAttractiveness = clamped.reduce((sum, p) => sum + p.attractivenessScore, 0);

  if (totalAttractiveness <= 0) {
    const evenShare = participants.length > 0 ? 100 / participants.length : 0;
    return clamped.map((p) => ({
      participantType: p.participantType,
      participantId: p.participantId,
      marketSharePct: evenShare,
      allocatedDemand: (evenShare / 100) * totalDemand,
    }));
  }

  return clamped.map((p) => {
    const marketSharePct = (p.attractivenessScore / totalAttractiveness) * 100;
    return {
      participantType: p.participantType,
      participantId: p.participantId,
      marketSharePct,
      allocatedDemand: (marketSharePct / 100) * totalDemand,
    };
  });
}

// 4 fixed archetypes, always present as baseline competition in
// solo-vs-AI mode. Prices are expressed as a multiplier of the
// current market reference price (fed through the same
// computePriceScore as the player, so scores stay on a consistent
// scale) — everything else is a fixed profile value, not
// dynamically simulated. A competitor that reacts to the player's
// strategy turn to turn is a further step, not built here.
export const AI_COMPETITOR_PROFILES = [
  {
    code: "C1_discount",
    label: "Discount Rival",
    priceStanceMultiplier: 0.85,
    quality: 40,
    marketing: 35,
    stock_availability: 75,
    commercial_terms: 45,
    reputation: 45,
  },
  {
    code: "C2_reliable",
    label: "Reliable Rival",
    priceStanceMultiplier: 1.0,
    quality: 65,
    marketing: 50,
    stock_availability: 90,
    commercial_terms: 60,
    reputation: 65,
  },
  {
    code: "C3_tech_leader",
    label: "Tech Leader Rival",
    priceStanceMultiplier: 1.25,
    quality: 90,
    marketing: 70,
    stock_availability: 60,
    commercial_terms: 55,
    reputation: 80,
  },
  {
    code: "C4_agile",
    label: "Agile Rival",
    priceStanceMultiplier: 1.05,
    quality: 55,
    marketing: 65,
    stock_availability: 55,
    commercial_terms: 60,
    reputation: 58,
  },
] as const;
