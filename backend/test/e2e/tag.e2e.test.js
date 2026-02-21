import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import request from "supertest";

import { app } from "../../server.js";
import {
  __resetTagExtractorForTest,
  __setTagExtractorForTest,
} from "../../api/tag.js";
import { __resetCacheForTest } from "../../cache/service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureImage = path.resolve(__dirname, "../test_image.jpg");
const originalEnv = {
  CACHE_ENABLED: process.env.CACHE_ENABLED,
  CACHE_MODE: process.env.CACHE_MODE,
  CACHE_SEMANTIC_EMBEDDER: process.env.CACHE_SEMANTIC_EMBEDDER,
  CACHE_SEMANTIC_CLIP_MODEL: process.env.CACHE_SEMANTIC_CLIP_MODEL,
  CACHE_SEMANTIC_FALLBACK: process.env.CACHE_SEMANTIC_FALLBACK,
  MOCK_OCR: process.env.MOCK_OCR,
  CACHE_SIMILARITY_THRESHOLD: process.env.CACHE_SIMILARITY_THRESHOLD,
  CACHE_DB_PATH: process.env.CACHE_DB_PATH,
  CACHE_MAX_ENTRIES: process.env.CACHE_MAX_ENTRIES,
  CACHE_FINGERPRINT_VERSION: process.env.CACHE_FINGERPRINT_VERSION,
};

const mockParsed = {
  country: "Portugal",
  materials: [
    { fiber: "Cotton", pct: 70 },
    { fiber: "Polyester", pct: 30 },
  ],
  care: {
    washing: "machine_wash_cold",
    drying: "line_dry",
    ironing: "iron_low",
    dry_cleaning: null,
  },
};

test.beforeEach(() => {
  __resetTagExtractorForTest();
  process.env.CACHE_ENABLED = "0";
  process.env.CACHE_MODE = "tiered";
  process.env.CACHE_SEMANTIC_EMBEDDER = "fingerprint";
  process.env.CACHE_SEMANTIC_CLIP_MODEL = "Xenova/clip-vit-base-patch32";
  process.env.CACHE_SEMANTIC_FALLBACK = "none";
  process.env.MOCK_OCR = "0";
  process.env.CACHE_SIMILARITY_THRESHOLD = "0.9";
  process.env.CACHE_DB_PATH = "./cache/test-tag-e2e.sqlite";
  process.env.CACHE_MAX_ENTRIES = "1000";
  process.env.CACHE_FINGERPRINT_VERSION = "e2e-v1";
  __resetCacheForTest();
});

test.after(() => {
  __resetTagExtractorForTest();
  __resetCacheForTest();
  process.env.CACHE_ENABLED = originalEnv.CACHE_ENABLED;
  process.env.CACHE_MODE = originalEnv.CACHE_MODE;
  process.env.CACHE_SEMANTIC_EMBEDDER = originalEnv.CACHE_SEMANTIC_EMBEDDER;
  process.env.CACHE_SEMANTIC_CLIP_MODEL = originalEnv.CACHE_SEMANTIC_CLIP_MODEL;
  process.env.CACHE_SEMANTIC_FALLBACK = originalEnv.CACHE_SEMANTIC_FALLBACK;
  process.env.MOCK_OCR = originalEnv.MOCK_OCR;
  process.env.CACHE_SIMILARITY_THRESHOLD = originalEnv.CACHE_SIMILARITY_THRESHOLD;
  process.env.CACHE_DB_PATH = originalEnv.CACHE_DB_PATH;
  process.env.CACHE_MAX_ENTRIES = originalEnv.CACHE_MAX_ENTRIES;
  process.env.CACHE_FINGERPRINT_VERSION = originalEnv.CACHE_FINGERPRINT_VERSION;
});

function assertTagResponseContract(body) {
  assert.ok(body && typeof body === "object");

  assert.ok(body.parsed && typeof body.parsed === "object");
  assert.ok("country" in body.parsed);
  assert.ok(Array.isArray(body.parsed.materials));
  assert.ok(body.parsed.care && typeof body.parsed.care === "object");
  assert.ok("washing" in body.parsed.care);
  assert.ok("drying" in body.parsed.care);
  assert.ok("ironing" in body.parsed.care);
  assert.ok("dry_cleaning" in body.parsed.care);

  assert.ok(body.emissions && typeof body.emissions === "object");
  assert.equal(typeof body.emissions.total_kgco2e, "number");
  assert.ok(body.emissions.breakdown && typeof body.emissions.breakdown === "object");
  assert.ok(body.emissions.assumptions && typeof body.emissions.assumptions === "object");
}

test("POST /api/tag happy path returns parsed + emissions", async (t) => {
  __setTagExtractorForTest(async () => mockParsed);
  t.after(() => __resetTagExtractorForTest());

  const res = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(res.status, 200);
  assertTagResponseContract(res.body);
  assert.deepEqual(res.body.parsed, mockParsed);
});

test("POST /api/tag missing image returns stable 4xx error JSON", async () => {
  const res = await request(app).post("/api/tag");

  assert.equal(res.status, 400);
  assert.deepEqual(res.body, {
    error: {
      code: "MISSING_IMAGE",
      message: "An image file is required in field 'image'.",
    },
  });
});

test("POST /api/tag provider failure returns safe error JSON", async (t) => {
  __setTagExtractorForTest(async () => {
    throw new Error("OpenAI upstream timeout");
  });
  t.after(() => __resetTagExtractorForTest());

  const res = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(res.status, 502);
  assert.deepEqual(res.body, {
    error: {
      code: "UPSTREAM_ERROR",
      message: "Failed to analyze image with AI provider.",
    },
  });
  assert.equal(JSON.stringify(res.body).includes("timeout"), false);
  assert.equal("stack" in (res.body.error || {}), false);
});

test("POST /api/tag contract test validates required response fields", async (t) => {
  __setTagExtractorForTest(async () => mockParsed);
  t.after(() => __resetTagExtractorForTest());

  const res = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(res.status, 200);
  assertTagResponseContract(res.body);
});

test("POST /api/tag normalizes malformed care and still returns 200", async (t) => {
  __setTagExtractorForTest(async () => ({
    country: "Portugal",
    materials: [{ fiber: "Cotton", pct: 100 }],
    care: "machine_wash_cold",
  }));
  t.after(() => __resetTagExtractorForTest());

  const res = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(res.status, 200);
  assert.ok(res.body.parsed && typeof res.body.parsed === "object");
  assert.ok(res.body.parsed.care && typeof res.body.parsed.care === "object");
  assert.equal(res.body.parsed.care.washing, null);
  assert.equal(res.body.parsed.care.drying, null);
  assert.equal(res.body.parsed.care.ironing, null);
  assert.equal(res.body.parsed.care.dry_cleaning, null);
});

test("POST /api/tag mock mode first request is MISS", async () => {
  process.env.CACHE_ENABLED = "1";
  process.env.CACHE_MODE = "tiered";
  process.env.MOCK_OCR = "1";

  const res = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(res.status, 200);
  assertTagResponseContract(res.body);
  assert.equal(res.headers["x-cache-mode"], "tiered");
  assert.equal(res.headers["x-cache-embedder"], "fingerprint");
  assert.equal(res.headers["x-cache-status"], "MISS");
  assert.equal(res.headers["x-cache-false-positive"], "NA");
});

test("POST /api/tag mock mode second request is HIT_EXACT", async () => {
  process.env.CACHE_ENABLED = "1";
  process.env.CACHE_MODE = "exact";
  process.env.MOCK_OCR = "1";

  const first = await request(app).post("/api/tag").attach("image", fixtureImage);
  assert.equal(first.status, 200);
  assert.equal(first.headers["x-cache-mode"], "exact");
  assert.equal(first.headers["x-cache-embedder"], "none");
  assert.equal(first.headers["x-cache-status"], "MISS");

  const second = await request(app).post("/api/tag").attach("image", fixtureImage);
  assert.equal(second.status, 200);
  assert.equal(second.headers["x-cache-mode"], "exact");
  assert.equal(second.headers["x-cache-embedder"], "none");
  assert.equal(second.headers["x-cache-status"], "HIT_EXACT");
});

test("POST /api/tag semantic mode second request is HIT_SEMANTIC", async () => {
  process.env.CACHE_ENABLED = "1";
  process.env.CACHE_MODE = "semantic";
  process.env.MOCK_OCR = "1";

  const first = await request(app).post("/api/tag").attach("image", fixtureImage);
  assert.equal(first.status, 200);
  assert.equal(first.headers["x-cache-mode"], "semantic");
  assert.equal(first.headers["x-cache-embedder"], "fingerprint");
  assert.equal(first.headers["x-cache-status"], "MISS");

  const second = await request(app).post("/api/tag").attach("image", fixtureImage);
  assert.equal(second.status, 200);
  assert.equal(second.headers["x-cache-mode"], "semantic");
  assert.equal(second.headers["x-cache-embedder"], "fingerprint");
  assert.equal(second.headers["x-cache-status"], "HIT_SEMANTIC");
});

test("POST /api/tag cache disabled forces MISS", async () => {
  process.env.CACHE_ENABLED = "0";
  process.env.MOCK_OCR = "1";

  const first = await request(app).post("/api/tag").attach("image", fixtureImage);
  const second = await request(app).post("/api/tag").attach("image", fixtureImage);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.headers["x-cache-status"], "MISS");
  assert.equal(second.headers["x-cache-status"], "MISS");
});

const liveEnabled = process.env.E2E_LIVE === "1" && !!process.env.OPENAI_API_KEY;

if (liveEnabled) {
  test("POST /api/tag live OpenAI test", async () => {
    const res = await request(app).post("/api/tag").attach("image", fixtureImage);
    assert.equal(res.status, 200);
    assertTagResponseContract(res.body);
  });
} else {
  test("POST /api/tag live OpenAI test", { skip: true }, () => {});
}
