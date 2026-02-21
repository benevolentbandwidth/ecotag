function parseBoolean(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseSimilarityThreshold(value, fallback) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function parseCacheMode(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "exact" || normalized === "semantic" || normalized === "tiered") {
    return normalized;
  }
  return fallback;
}

function parseSemanticEmbedder(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "clip" || normalized === "fingerprint") {
    return normalized;
  }
  return fallback;
}

function parseSemanticFallback(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "none" || normalized === "fingerprint") {
    return normalized;
  }
  return fallback;
}

export function getCacheConfig() {
  return {
    cacheEnabled: parseBoolean(process.env.CACHE_ENABLED, true),
    cacheDbPath: process.env.CACHE_DB_PATH?.trim() || "./cache/ecotag-cache.sqlite",
    similarityThreshold: parseSimilarityThreshold(
      process.env.CACHE_SIMILARITY_THRESHOLD,
      0.9,
    ),
    cacheMaxEntries: parsePositiveInt(process.env.CACHE_MAX_ENTRIES, 5000),
    fingerprintVersion: process.env.CACHE_FINGERPRINT_VERSION?.trim() || "v1",
    cacheMode: parseCacheMode(process.env.CACHE_MODE, "tiered"),
    semanticEmbedder: parseSemanticEmbedder(
      process.env.CACHE_SEMANTIC_EMBEDDER,
      "clip",
    ),
    semanticClipModel:
      process.env.CACHE_SEMANTIC_CLIP_MODEL?.trim() ||
      "Xenova/clip-vit-base-patch32",
    semanticFallbackEmbedder: parseSemanticFallback(
      process.env.CACHE_SEMANTIC_FALLBACK,
      "none",
    ),
    mockOcrEnabled: parseBoolean(process.env.MOCK_OCR, false),
  };
}

export function isMockOcrEnabled() {
  return getCacheConfig().mockOcrEnabled;
}
