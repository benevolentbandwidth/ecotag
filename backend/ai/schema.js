// schema.js
// Zod schema for the clothing-tag extraction output. Used by every VLM
// adapter as the single source of truth: each adapter feeds the generated
// JSON Schema to its provider's structured-output mechanism, then validates
// the model's response with TagSchema.parse() before returning.

import { z } from "zod";

const WASHING = [
  "machine_wash_cold",
  "machine_wash_warm",
  "machine_wash_hot",
  "machine_wash_gentle",
  "hand_wash_cold",
  "hand_wash_warm",
];

const DRYING = [
  "tumble_dry_low",
  "tumble_dry_medium",
  "tumble_dry_high",
  "lay_flat_to_dry",
  "line_dry",
  "do_not_tumble_dry",
];

const IRONING = ["iron_low", "iron_medium", "iron_high", "do_not_iron"];

const DRY_CLEANING = ["dry_clean", "dry_clean_only"];

export const TagSchema = z.object({
  ocr_text: z.string(),
  country: z.string().nullable(),
  materials: z.array(
    z.object({
      fiber: z.string(),
      pct: z.number(),
    }),
  ),
  care: z.object({
    washing: z.enum(WASHING).nullable(),
    drying: z.enum(DRYING).nullable(),
    ironing: z.enum(IRONING).nullable(),
    dry_cleaning: z.enum(DRY_CLEANING).nullable(),
  }),
});

export const TagJsonSchema = z.toJSONSchema(TagSchema, { target: "openai" });
