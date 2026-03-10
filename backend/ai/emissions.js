// emissions.js
// Calculate lifecycle CO₂ emissions using co2_data files

import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("co2_data");
const loadJson = (f) =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8"));

const MATERIALS = loadJson("materials.json");
const MANUFACTURING = loadJson("manufacturing.json");
const WASHING = loadJson("washing.json");
const GARMENTS = loadJson("garments.json");

export function estimateEmissions(parsed) {
  const breakdown = {};

  const garment = GARMENTS["_default"];
  const weight = garment.weight_kg;

  // Lifetime washes: weighted average from fiber blend using only cited values.
  // Fibers without a cited lifetime_washes fall back to garments.json _default.
  let washes = garment.lifetime_washes;
  if (parsed.materials && parsed.materials.length > 0) {
    washes = parsed.materials.reduce((sum, { fiber, pct }) => {
      const key = fiber.toLowerCase();
      const entry = MATERIALS[key] || MATERIALS["cotton"];
      const fiberWashes = entry.lifetime_washes ?? garment.lifetime_washes;
      return sum + (pct / 100) * fiberWashes;
    }, 0);
    washes = Math.round(washes);
  }

  // Materials
  let matFactor = 0;
  if (parsed.materials && parsed.materials.length > 0) {
    for (const { fiber, pct } of parsed.materials) {
      const key = fiber.toLowerCase();
      const entry = MATERIALS[key] || MATERIALS["cotton"];
      matFactor += (pct / 100) * entry.kgco2_per_kg;
    }
  } else {
    matFactor = MATERIALS["cotton"].kgco2_per_kg;
  }
  breakdown.materials = weight * matFactor;

  // Manufacturing
  const countryKey = (parsed.country || "china").toLowerCase();
  const mfgEntry = MANUFACTURING[countryKey] || MANUFACTURING["china"];
  breakdown.manufacturing = weight * mfgEntry.kgco2_per_kg;

  // Washing, Drying, Ironing, Dry Cleaning
  // Only allow structured care object
  let washingCO2 = 0,
    dryingCO2 = 0,
    ironingCO2 = 0,
    dryCleanCO2 = 0;
  if (
    parsed.care &&
    typeof parsed.care === "object" &&
    (parsed.care.washing ||
      parsed.care.drying ||
      parsed.care.ironing ||
      parsed.care.dry_cleaning)
  ) {
    if (parsed.care.washing && WASHING[parsed.care.washing]) {
      washingCO2 = washes * WASHING[parsed.care.washing].kgco2_per_use;
    }
    if (parsed.care.drying && WASHING[parsed.care.drying]) {
      dryingCO2 = washes * WASHING[parsed.care.drying].kgco2_per_use;
    }
    if (parsed.care.ironing && WASHING[parsed.care.ironing]) {
      ironingCO2 = washes * WASHING[parsed.care.ironing].kgco2_per_use;
    }
    if (parsed.care.dry_cleaning && WASHING[parsed.care.dry_cleaning]) {
      dryCleanCO2 = washes * WASHING[parsed.care.dry_cleaning].kgco2_per_use;
    }
  } else {
    throw new Error(
      "Care instructions must be a structured object with washing, drying, ironing, or dry_cleaning keys.",
    );
  }

  breakdown.washing = washingCO2;
  breakdown.drying = dryingCO2;
  breakdown.ironing = ironingCO2;
  breakdown.dry_cleaning = dryCleanCO2;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    total_kgco2e: Math.round(total * 100) / 100,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
    assumptions: {
      weight_kg: weight,
      origin: parsed.country || "unknown",
      washes_lifetime: washes,
    },
  };
}
