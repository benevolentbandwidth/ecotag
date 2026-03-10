// benchmarks.js
// Global average garment benchmark for CO₂ comparison.
//
// Profile represents a typical mass-market garment based on:
// - BSR Apparel Industry Life Cycle Carbon Mapping (2009)
// - Aggregate fiber mix from Chart 1 (cotton-dominant, some polyester)
// - China as the dominant manufacturing origin
// - Machine wash warm + tumble dry low as average consumer care
//
// Weight (350g) and lifetime washes (50) come from co2_data/garments.json _default,
// same values used for every scanned item — so comparison is apples-to-apples.

import { estimateEmissions } from "./emissions.js";

const AVERAGE_GARMENT_PROFILE = {
  country: "china",
  materials: [
    { fiber: "cotton", pct: 60 },
    { fiber: "polyester", pct: 40 },
  ],
  care: {
    washing: "machine_wash_warm",
    drying: "tumble_dry_low",
    ironing: null,
    dry_cleaning: null,
  },
};

// Pre-computed once at module load — stays in sync with co2_data/ automatically.
// Wrapped in try/catch: a missing or malformed data file logs a clear error rather
// than crashing the server process on startup.
let GLOBAL_BENCHMARK = null;
try {
  GLOBAL_BENCHMARK = estimateEmissions(AVERAGE_GARMENT_PROFILE).total_kgco2e;
} catch (err) {
  console.error("[EcoTag] Failed to compute global benchmark at startup:", err);
}

/**
 * Returns the global average garment benchmark CO₂e, or null if startup failed.
 * @returns {{ benchmark_kgco2e: number | null }}
 */
export function getBenchmark() {
  return { benchmark_kgco2e: GLOBAL_BENCHMARK };
}
