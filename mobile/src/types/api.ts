/** same as Python schemas.py */
export interface MaterialComponent {
  fiber: string;
  pct: number;
}

/** Care-label details parsed from the tag */
export interface CareProfile {
  wash: string;
  dry: string;
  dry_clean: string;
  washes_per_month: number;
}

/** Full parsed tag record returned by tag_parser */
export interface TagRecord {
  materials: MaterialComponent[];
  origin_country: string | null;
  garment_type: string;
  weight_g: number | null;
  dye_hint: string | null;
  printed: boolean;
  care: CareProfile;
}

/**
 * CO2 breakdown by lifecycle phase.
 * Backend currently emits materials, manufacturing, washing.
 * `transport` is optional — renders as 0 until backend adds it.
 */
export interface CO2Breakdown {
  materials: number;
  manufacturing: number;
  washing: number;
  transport?: number;
}

/** Result of a single CO2 estimation scenario */
export interface ScenarioResult {
  total_kgco2e: number;
  breakdown: CO2Breakdown;
  assumptions: Record<string, string>;
}

/** Request body for the scan endpoint */
export interface ScanRequest {
  image_base64: string;
  weight_g?: number;
  washes_per_month?: number;
}

/** Response from the scan endpoint */
export interface ScanResponse {
  tag: TagRecord;
  result: ScenarioResult;
}

/** UI model for the scan-history list */
export interface ScanHistoryItem {
  id: string;
  garment_name: string;
  garment_type: string;
  score: number;
  description: string;
  timestamp: string;
  result: ScenarioResult;
}

/** Maps breakdown keys to human-readable row labels */
export const BREAKDOWN_LABELS: Record<string, string> = {
  materials: "Material",
  transport: "Transport",
  washing: "Est. Care",
  manufacturing: "Production",
};

/** Display order for breakdown rows */
export const BREAKDOWN_ORDER: (keyof CO2Breakdown)[] = [
  "materials",
  "transport",
  "washing",
  "manufacturing",
];
