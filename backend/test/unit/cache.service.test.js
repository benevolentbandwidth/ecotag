import assert from "node:assert/strict";
import test from "node:test";

import {
  __closeCacheForTest,
  __countCacheEntriesForTest,
  __insertCacheEntryForTest,
  __lookupWithArtifactsForTest,
  __pruneToMaxEntriesForTest,
  __resetCacheForTest,
} from "../../cache/service.js";

const originalEnv = {
  CACHE_ENABLED: process.env.CACHE_ENABLED,
  CACHE_DB_PATH: process.env.CACHE_DB_PATH,
  CACHE_SIMILARITY_THRESHOLD: process.env.CACHE_SIMILARITY_THRESHOLD,
  CACHE_MAX_ENTRIES: process.env.CACHE_MAX_ENTRIES,
  CACHE_FINGERPRINT_VERSION: process.env.CACHE_FINGERPRINT_VERSION,
};

function buildFingerprint(primary, secondary = 0) {
  const vec = new Array(64).fill(0);
  vec[0] = primary;
  vec[1] = secondary;
  return vec;
}

function validParsed(country = "Portugal") {
  return {
    country,
    materials: [{ fiber: "Cotton", pct: 100 }],
    care: {
      washing: "machine_wash_cold",
      drying: "line_dry",
      ironing: "iron_low",
      dry_cleaning: null,
    },
  };
}

test.beforeEach(() => {
  process.env.CACHE_ENABLED = "1";
  process.env.CACHE_DB_PATH = "./cache/test-cache-service.sqlite";
  process.env.CACHE_SIMILARITY_THRESHOLD = "0.9";
  process.env.CACHE_MAX_ENTRIES = "5000";
  process.env.CACHE_FINGERPRINT_VERSION = "unit-v1";
  __resetCacheForTest();
});

test.after(() => {
  __resetCacheForTest();
  __closeCacheForTest();
  process.env.CACHE_ENABLED = originalEnv.CACHE_ENABLED;
  process.env.CACHE_DB_PATH = originalEnv.CACHE_DB_PATH;
  process.env.CACHE_SIMILARITY_THRESHOLD = originalEnv.CACHE_SIMILARITY_THRESHOLD;
  process.env.CACHE_MAX_ENTRIES = originalEnv.CACHE_MAX_ENTRIES;
  process.env.CACHE_FINGERPRINT_VERSION = originalEnv.CACHE_FINGERPRINT_VERSION;
});

test("semantic lookup returns HIT_SEMANTIC above threshold", () => {
  __insertCacheEntryForTest({
    imageHash: "a".repeat(64),
    fingerprint: buildFingerprint(1, 0),
    parsed: validParsed("Portugal"),
    createdAt: 1,
  });

  const query = buildFingerprint(0.95, Math.sqrt(1 - 0.95 * 0.95));
  const result = __lookupWithArtifactsForTest({
    imageHash: "b".repeat(64),
    fingerprint: query,
  });

  assert.equal(result.status, "HIT_SEMANTIC");
  assert.ok((result.similarity ?? 0) >= 0.9);
  assert.equal(result.parsed?.country, "Portugal");
});

test("semantic lookup returns MISS below threshold", () => {
  __insertCacheEntryForTest({
    imageHash: "c".repeat(64),
    fingerprint: buildFingerprint(1, 0),
    parsed: validParsed("Italy"),
    createdAt: 1,
  });

  const query = buildFingerprint(0.2, Math.sqrt(1 - 0.2 * 0.2));
  const result = __lookupWithArtifactsForTest({
    imageHash: "d".repeat(64),
    fingerprint: query,
  });

  assert.equal(result.status, "MISS");
});

test("prune removes oldest rows when cache exceeds max", () => {
  __insertCacheEntryForTest({
    imageHash: "1".repeat(64),
    fingerprint: buildFingerprint(1, 0),
    parsed: validParsed("Portugal"),
    createdAt: 1,
  });
  __insertCacheEntryForTest({
    imageHash: "2".repeat(64),
    fingerprint: buildFingerprint(0.8, 0.2),
    parsed: validParsed("Italy"),
    createdAt: 2,
  });
  __insertCacheEntryForTest({
    imageHash: "3".repeat(64),
    fingerprint: buildFingerprint(0.6, 0.4),
    parsed: validParsed("Morocco"),
    createdAt: 3,
  });

  __pruneToMaxEntriesForTest(2);
  assert.equal(__countCacheEntriesForTest(), 2);

  const oldestLookup = __lookupWithArtifactsForTest({
    imageHash: "z".repeat(64),
    fingerprint: buildFingerprint(1, 0),
  });
  assert.notEqual(oldestLookup.parsed?.country, "Portugal");
});
