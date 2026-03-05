import { ParsedTag, TagEmissions } from "../types/api";

export interface LifespanEstimate {
  yearsAvg: number;
  costSavingsUsd: number;
}

const FIBER_DURABILITY: Record<string, [number, number]> = {
  wool: [4, 8],
  cashmere: [5, 10],
  polyester: [4, 8],
  nylon: [4, 7],
  linen: [3, 6],
  cotton: [2, 5],
  silk: [2, 4],
  viscose: [2, 4],
  rayon: [2, 4],
  acrylic: [3, 5],
  spandex: [1, 3],
  elastane: [1, 3],
  leather: [8, 15],
  down: [4, 8],
};

const DEFAULT_RANGE: [number, number] = [2, 5];

// Cost per wash cycle in USD (baseline = machine warm + tumble dry = $0.65)
const BASELINE_COST_PER_WASH = 0.65;

const WASH_COST: Record<string, number> = {
  machine_wash_hot: 0.35,
  machine_wash_warm: 0.20,
  machine_wash_cold: 0.10,
  hand_wash: 0.05,
  delicate_wash: 0.05,
  dry_cleaning: 12.00,
};

const DRY_COST: Record<string, number> = {
  tumble_dry: 0.45,
  tumble_dry_high: 0.50,
  tumble_dry_low: 0.35,
  hang_dry: 0,
  flat_dry: 0,
  air_dry: 0,
  line_dry: 0,
};

export function estimateLifespan(
  parsed: ParsedTag,
  emissions: TagEmissions,
): LifespanEstimate {
  // Weighted average of fiber durability
  const materials = parsed.materials ?? [];
  let totalPct = 0;
  let weightedMin = 0;
  let weightedMax = 0;

  for (const { fiber, pct } of materials) {
    const key = fiber.toLowerCase();
    const [fMin, fMax] = FIBER_DURABILITY[key] ?? DEFAULT_RANGE;
    weightedMin += (pct / 100) * fMin;
    weightedMax += (pct / 100) * fMax;
    totalPct += pct;
  }

  if (totalPct === 0) {
    [weightedMin, weightedMax] = DEFAULT_RANGE;
  } else if (totalPct < 100) {
    const scale = 100 / totalPct;
    weightedMin *= scale;
    weightedMax *= scale;
  }

  // Care adjustments
  const care = parsed.care;
  let multiplier = 1;

  if (care?.dry_cleaning) {
    multiplier *= 1.15;
  } else if (
    care?.washing === "delicate_wash" ||
    care?.washing === "hand_wash"
  ) {
    multiplier *= 1.1;
  } else if (
    care?.washing === "machine_wash_warm" ||
    care?.washing === "machine_wash_hot"
  ) {
    multiplier *= 0.9;
  }

  if (care?.drying?.includes("tumble")) {
    multiplier *= 0.9;
  } else if (care?.drying === "flat_dry" || care?.drying === "hang_dry" || care?.drying === "line_dry") {
    multiplier *= 1.05;
  }

  const yearsMin = Math.max(1, Math.round(weightedMin * multiplier));
  const yearsMax = Math.max(yearsMin, Math.round(weightedMax * multiplier));
  const yearsAvg = Math.round((yearsMin + yearsMax) / 2);

  // Cost savings vs. worst-case care (machine warm + tumble dry)
  const washCost = WASH_COST[care?.washing ?? ""] ?? 0.20;
  const dryCost = DRY_COST[care?.drying ?? ""] ?? 0;
  const actualCostPerWash = washCost + dryCost;
  const savingsPerWash = BASELINE_COST_PER_WASH - actualCostPerWash;
  const washesLifetime =
    (emissions.assumptions?.washes_lifetime as number) ?? 48;
  const costSavingsUsd = Math.max(0, Math.round(savingsPerWash * washesLifetime));

  return { yearsAvg, costSavingsUsd };
}
