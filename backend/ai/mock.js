import { computeFingerprint, computeImageHash } from "../cache/fingerprint.js";

const COUNTRIES = [
  "Portugal",
  "Vietnam",
  "China",
  "Bangladesh",
  "India",
  "Turkey",
  "Mexico",
  "Italy",
  "Indonesia",
  "Morocco",
];

const FIBERS = [
  "Cotton",
  "Polyester",
  "Wool",
  "Nylon",
  "Viscose",
  "Linen",
  "Acrylic",
  "Elastane",
  "Rayon",
];

const WASHING = [
  "machine_wash_cold",
  "machine_wash_warm",
  "machine_wash_hot",
  "machine_wash_gentle",
  "hand_wash_cold",
  "hand_wash_warm",
  null,
];

const DRYING = [
  "tumble_dry_low",
  "tumble_dry_medium",
  "tumble_dry_high",
  "lay_flat_to_dry",
  "line_dry",
  "do_not_tumble_dry",
  null,
];

const IRONING = ["iron_low", "iron_medium", "iron_high", "do_not_iron", null];

const DRY_CLEANING = ["dry_clean", "dry_clean_only", null];

function sliceHexInt(hash, start) {
  const safeStart = start % Math.max(hash.length - 8, 1);
  const value = Number.parseInt(hash.slice(safeStart, safeStart + 8), 16);
  if (!Number.isFinite(value)) return 0;
  return value >>> 0;
}

function buildSeed(hash, fingerprint) {
  const fingerprintSeed = Array.isArray(fingerprint)
    ? Math.floor(
        fingerprint.reduce(
          (sum, value, idx) => sum + Math.abs(value) * (idx + 3) * 1000,
          0,
        ),
      ) >>> 0
    : 0;
  return (sliceHexInt(hash, 0) ^ fingerprintSeed) >>> 0;
}

function pick(options, hash, seed, slot) {
  const mixed =
    (sliceHexInt(hash, slot * 7) ^ seed ^ Math.imul(slot + 11, 2654435761)) >>> 0;
  return options[mixed % options.length];
}

function buildMaterials(hash, seed) {
  const materialCount = (pick([1, 2, 3], hash, seed, 20) ?? 2) || 2;
  const selected = [];
  const used = new Set();

  for (let i = 0; i < materialCount; i += 1) {
    let idx = ((sliceHexInt(hash, 24 + i * 8) ^ seed) >>> 0) % FIBERS.length;
    while (used.has(idx)) {
      idx = (idx + 1) % FIBERS.length;
    }
    used.add(idx);
    selected.push({
      fiber: FIBERS[idx],
      weight: ((sliceHexInt(hash, 80 + i * 8) % 1000) + 1) / 1000,
    });
  }

  const totalWeight = selected.reduce((sum, item) => sum + item.weight, 0);
  let running = 0;

  return selected.map((item, idx) => {
    if (idx === selected.length - 1) {
      return { fiber: item.fiber, pct: Math.max(1, 100 - running) };
    }
    const remainingSlots = selected.length - idx - 1;
    const maxAllowed = Math.max(1, 100 - running - remainingSlots);
    const rawPct = Math.max(1, Math.round((item.weight / totalWeight) * 100));
    const pct = Math.min(rawPct, maxAllowed);
    running += pct;
    return { fiber: item.fiber, pct };
  });
}

export function extractMockTagFromArtifacts({ imageHash, fingerprint }) {
  const seed = buildSeed(imageHash, fingerprint);
  return {
    country: pick(COUNTRIES, imageHash, seed, 1),
    materials: buildMaterials(imageHash, seed),
    care: {
      washing: pick(WASHING, imageHash, seed, 2),
      drying: pick(DRYING, imageHash, seed, 3),
      ironing: pick(IRONING, imageHash, seed, 4),
      dry_cleaning: pick(DRY_CLEANING, imageHash, seed, 5),
    },
  };
}

export function extractMockTagFromImageBuffer(imageBuffer, precomputed = null) {
  const imageHash = precomputed?.imageHash ?? computeImageHash(imageBuffer);
  const fingerprint = precomputed?.fingerprint ?? computeFingerprint(imageBuffer);
  return extractMockTagFromArtifacts({ imageHash, fingerprint });
}
