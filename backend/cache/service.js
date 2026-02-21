import {
  clearEntries,
  closeCacheDbForTest,
  countEntries,
  getExactEntry,
  insertEntryForTest,
  listVersionEntries,
  pruneOldestEntries,
  touchEntry,
  upsertEntry,
} from "./db.js";
import { getCacheConfig } from "./config.js";
import { computeImageHash, cosineSimilarity } from "./fingerprint.js";
import { computeSemanticEmbedding } from "./embedding.js";

function safeParse(jsonValue) {
  try {
    return JSON.parse(jsonValue);
  } catch {
    return null;
  }
}

function createMissResult({
  cacheEnabled,
  mode,
  embedder,
  embeddingMs = 0,
  lookupMs = 0,
  artifacts = null,
}) {
  return {
    cacheEnabled,
    mode,
    embedder,
    status: "MISS",
    parsed: null,
    similarity: null,
    timing: {
      embeddingMs: Number(embeddingMs.toFixed(2)),
      lookupMs: Number(lookupMs.toFixed(2)),
    },
    artifacts,
  };
}

function runExactLookup({ imageHash, config }) {
  const exact = getExactEntry({
    imageHash,
    fingerprintVersion: config.fingerprintVersion,
  });
  if (exact) {
    const parsed = safeParse(exact.parsed_json);
    if (parsed !== null) {
      touchEntry(exact.id);
      return {
        status: "HIT_EXACT",
        parsed,
        similarity: null,
      };
    }
  }

  return {
    status: "MISS",
    parsed: null,
    similarity: null,
  };
}

function runSemanticLookup({ imageHash, fingerprint, config, skipSameHash = false }) {
  const rows = listVersionEntries(config.fingerprintVersion);
  let best = null;

  for (const row of rows) {
    if (skipSameHash && row.image_hash === imageHash) continue;

    const candidateFingerprint = safeParse(row.fingerprint_json);
    if (!Array.isArray(candidateFingerprint) || candidateFingerprint.length !== fingerprint.length) {
      continue;
    }

    const similarity = cosineSimilarity(fingerprint, candidateFingerprint);
    if (!Number.isFinite(similarity)) continue;
    if (!best || similarity > best.similarity) {
      best = { row, similarity };
    }
  }

  if (best && best.similarity >= config.similarityThreshold) {
    const parsed = safeParse(best.row.parsed_json);
    if (parsed !== null) {
      touchEntry(best.row.id);
      return {
        status: "HIT_SEMANTIC",
        parsed,
        similarity: Number(best.similarity.toFixed(6)),
      };
    }
  }

  return {
    status: "MISS",
    parsed: null,
    similarity: null,
  };
}

function runTieredLookup({ imageHash, fingerprint, config }) {
  const exact = runExactLookup({ imageHash, config });
  if (exact.status !== "MISS") {
    return exact;
  }

  return runSemanticLookup({
    imageHash,
    fingerprint,
    config,
    skipSameHash: true,
  });
}

function pruneToMaxEntries(maxEntries) {
  const total = countEntries();
  const excess = total - maxEntries;
  if (excess > 0) {
    pruneOldestEntries(excess);
  }
}

export async function lookup(imageBuffer) {
  const config = getCacheConfig();
  const mode = config.cacheMode;
  if (!config.cacheEnabled) {
    return createMissResult({ cacheEnabled: false, mode, embedder: "none" });
  }

  const imageHash = computeImageHash(imageBuffer);

  if (mode === "exact") {
    const lookupStart = process.hrtime.bigint();
    const lookupResult = runExactLookup({ imageHash, config });
    const lookupMs = Number(process.hrtime.bigint() - lookupStart) / 1e6;

    if (lookupResult.status === "MISS") {
      return createMissResult({
        cacheEnabled: true,
        mode,
        embedder: "none",
        embeddingMs: 0,
        lookupMs,
        artifacts: { imageHash, fingerprint: null },
      });
    }

    return {
      cacheEnabled: true,
      mode,
      embedder: "none",
      status: lookupResult.status,
      parsed: lookupResult.parsed,
      similarity: lookupResult.similarity,
      timing: {
        embeddingMs: 0,
        lookupMs: Number(lookupMs.toFixed(2)),
      },
      artifacts: { imageHash, fingerprint: null },
    };
  }

  if (mode === "tiered") {
    const exactLookupStart = process.hrtime.bigint();
    const exactLookupResult = runExactLookup({ imageHash, config });
    const exactLookupMs = Number(process.hrtime.bigint() - exactLookupStart) / 1e6;

    if (exactLookupResult.status !== "MISS") {
      return {
        cacheEnabled: true,
        mode,
        embedder: "none",
        status: exactLookupResult.status,
        parsed: exactLookupResult.parsed,
        similarity: exactLookupResult.similarity,
        timing: {
          embeddingMs: 0,
          lookupMs: Number(exactLookupMs.toFixed(2)),
        },
        artifacts: { imageHash, fingerprint: null },
      };
    }

    const embeddingStart = process.hrtime.bigint();
    const semanticEmbedding = await computeSemanticEmbedding(imageBuffer);
    const fingerprint = semanticEmbedding.vector;
    const embeddingMs = Number(process.hrtime.bigint() - embeddingStart) / 1e6;

    const semanticLookupStart = process.hrtime.bigint();
    const semanticLookupResult = runSemanticLookup({
      imageHash,
      fingerprint,
      config,
      skipSameHash: true,
    });
    const semanticLookupMs =
      Number(process.hrtime.bigint() - semanticLookupStart) / 1e6;
    const lookupMs = exactLookupMs + semanticLookupMs;

    if (semanticLookupResult.status === "MISS") {
      return createMissResult({
        cacheEnabled: true,
        mode,
        embedder: semanticEmbedding.embedder,
        embeddingMs,
        lookupMs,
        artifacts: { imageHash, fingerprint },
      });
    }

    return {
      cacheEnabled: true,
      mode,
      embedder: semanticEmbedding.embedder,
      status: semanticLookupResult.status,
      parsed: semanticLookupResult.parsed,
      similarity: semanticLookupResult.similarity,
      timing: {
        embeddingMs: Number(embeddingMs.toFixed(2)),
        lookupMs: Number(lookupMs.toFixed(2)),
      },
      artifacts: { imageHash, fingerprint },
    };
  }

  const embeddingStart = process.hrtime.bigint();
  const semanticEmbedding = await computeSemanticEmbedding(imageBuffer);
  const fingerprint = semanticEmbedding.vector;
  const embeddingMs = Number(process.hrtime.bigint() - embeddingStart) / 1e6;

  const lookupStart = process.hrtime.bigint();
  const lookupResult = runSemanticLookup({
    imageHash,
    fingerprint,
    config,
    skipSameHash: false,
  });
  const lookupMs = Number(process.hrtime.bigint() - lookupStart) / 1e6;

  if (lookupResult.status === "MISS") {
    return createMissResult({
      cacheEnabled: true,
      mode,
      embedder: semanticEmbedding.embedder,
      embeddingMs,
      lookupMs,
      artifacts: { imageHash, fingerprint },
    });
  }

  return {
    cacheEnabled: true,
    mode,
    embedder: semanticEmbedding.embedder,
    status: lookupResult.status,
    parsed: lookupResult.parsed,
    similarity: lookupResult.similarity,
    timing: {
      embeddingMs: Number(embeddingMs.toFixed(2)),
      lookupMs: Number(lookupMs.toFixed(2)),
    },
    artifacts: { imageHash, fingerprint },
  };
}

export function __lookupWithArtifactsForTest({ imageHash, fingerprint }) {
  const config = getCacheConfig();
  const mode = config.cacheMode;
  if (!config.cacheEnabled) {
    return createMissResult({ cacheEnabled: false, mode, embedder: "none" });
  }

  const lookupStart = process.hrtime.bigint();
  const lookupResult =
    mode === "exact"
      ? runExactLookup({ imageHash, config })
      : mode === "semantic"
        ? runSemanticLookup({ imageHash, fingerprint, config, skipSameHash: false })
        : runTieredLookup({ imageHash, fingerprint, config });
  const lookupMs = Number(process.hrtime.bigint() - lookupStart) / 1e6;

  if (lookupResult.status === "MISS") {
    return createMissResult({
      cacheEnabled: true,
      mode,
      embedder: "test",
      embeddingMs: 0,
      lookupMs,
      artifacts: { imageHash, fingerprint },
    });
  }

  return {
    cacheEnabled: true,
    mode,
    embedder: "test",
    status: lookupResult.status,
    parsed: lookupResult.parsed,
    similarity: lookupResult.similarity,
    timing: {
      embeddingMs: 0,
      lookupMs: Number(lookupMs.toFixed(2)),
    },
    artifacts: { imageHash, fingerprint },
  };
}

export async function store({ imageBuffer, parsed, imageHash, fingerprint }) {
  const config = getCacheConfig();
  const mode = config.cacheMode;
  if (!config.cacheEnabled) {
    return;
  }

  const resolvedHash = imageHash ?? computeImageHash(imageBuffer);
  let resolvedFingerprint = [];
  if (mode !== "exact") {
    if (fingerprint) {
      resolvedFingerprint = fingerprint;
    } else {
      const semanticEmbedding = await computeSemanticEmbedding(imageBuffer);
      resolvedFingerprint = semanticEmbedding.vector;
    }
  }
  upsertEntry({
    imageHash: resolvedHash,
    fingerprintVersion: config.fingerprintVersion,
    fingerprintJson: JSON.stringify(resolvedFingerprint),
    parsedJson: JSON.stringify(parsed),
    createdAt: Date.now(),
  });
  pruneToMaxEntries(config.cacheMaxEntries);
}

export function resetCacheEntries() {
  clearEntries();
}

export function countCacheEntries() {
  return countEntries();
}

export function __resetCacheForTest() {
  clearEntries();
}

export function __insertCacheEntryForTest({
  imageHash,
  fingerprint,
  parsed,
  createdAt = Date.now(),
  fingerprintVersion,
}) {
  const config = getCacheConfig();
  insertEntryForTest({
    imageHash,
    fingerprintVersion: fingerprintVersion ?? config.fingerprintVersion,
    fingerprint,
    parsed,
    createdAt,
  });
}

export function __countCacheEntriesForTest() {
  return countEntries();
}

export function __pruneToMaxEntriesForTest(maxEntries) {
  pruneToMaxEntries(maxEntries);
}

export function __closeCacheForTest() {
  closeCacheDbForTest();
}
