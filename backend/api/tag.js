// tag.js
// Dummy Express API route for tag analysis

import express from "express";
import multer from "multer";
import * as gpt from "../ai/gpt.js";
import { extractMockTagFromImageBuffer } from "../ai/mock.js";
import { estimateEmissions } from "../ai/emissions.js";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { getCacheConfig, isMockOcrEnabled } from "../cache/config.js";
import { countCacheEntries, lookup, resetCacheEntries, store } from "../cache/service.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });
let tagExtractor = gpt.extractTagFromImage;

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeParsedForEmissions(parsed) {
  const normalized = isPlainObject(parsed) ? parsed : {};
  const careInput = isPlainObject(normalized.care) ? normalized.care : {};

  normalized.care = {
    washing: careInput.washing ?? null,
    drying: careInput.drying ?? null,
    ironing: careInput.ironing ?? null,
    dry_cleaning: careInput.dry_cleaning ?? null,
  };

  return normalized;
}

function withFallbackCareForEmissions(parsed) {
  const care = isPlainObject(parsed?.care) ? parsed.care : {};
  return {
    ...parsed,
    care: {
      washing: care.washing || "machine_wash_cold",
      drying: care.drying ?? null,
      ironing: care.ironing ?? null,
      dry_cleaning: care.dry_cleaning ?? null,
    },
  };
}

function formatMs(value) {
  if (!Number.isFinite(value)) return "0.00";
  return Number(value).toFixed(2);
}

function formatSimilarity(value) {
  if (!Number.isFinite(value)) return "";
  return Number(value).toFixed(4);
}

function getRssMb() {
  return (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);
}

function applyCacheHeaders(res, metrics) {
  res.set("X-Cache-Mode", metrics.mode || "tiered");
  res.set("X-Cache-Embedder", metrics.embedder || "none");
  res.set("X-Cache-Status", metrics.status || "MISS");
  res.set("X-Cache-Similarity", metrics.similarity ?? "");
  res.set("X-Cache-Embedding-Ms", metrics.embeddingMs ?? "0.00");
  res.set("X-Cache-Lookup-Ms", metrics.lookupMs ?? "0.00");
  res.set("X-Cache-False-Positive", metrics.falsePositive ?? "NA");
  res.set("X-Cache-RSS-MB", getRssMb());
}

export function __setTagExtractorForTest(extractor) {
  tagExtractor = extractor;
}

export function __resetTagExtractorForTest() {
  tagExtractor = gpt.extractTagFromImage;
}

// POST /api/cache/reset - Clears local cache entries (used by benchmark harness).
router.post("/cache/reset", (_req, res) => {
  try {
    const { cacheEnabled } = getCacheConfig();
    if (!cacheEnabled) {
      return res.json({
        ok: true,
        cache_enabled: false,
        cleared_entries: 0,
      });
    }

    const before = countCacheEntries();
    resetCacheEntries();
    return res.json({
      ok: true,
      cache_enabled: true,
      cleared_entries: before,
    });
  } catch (err) {
    console.error("[EcoTag] /api/cache/reset failed.", err);
    return res.status(500).json({
      error: {
        code: "CACHE_RESET_ERROR",
        message: "Failed to reset cache.",
      },
    });
  }
});

// POST /api/tag - Accepts image upload, returns tag info, CO2 estimate, and economic metrics.
// Form fields: image (file), price (number, required), category (string, optional)
router.post("/tag", upload.single("image"), async (req, res) => {
  const { cacheMode, semanticEmbedder } = getCacheConfig();
  const cacheMetrics = {
    mode: cacheMode,
    embedder: cacheMode === "exact" ? "none" : semanticEmbedder,
    status: "MISS",
    similarity: "",
    embeddingMs: "0.00",
    lookupMs: "0.00",
    falsePositive: "NA",
  };

  const filePath = req.file?.path;
  if (!filePath) {
    applyCacheHeaders(res, cacheMetrics);
    return res.status(400).json({
      error: {
        code: "MISSING_IMAGE",
        message: "An image file is required in field 'image'.",
      },
    });
  }

  try {
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
        ? "image/png"
          : "image/jpeg";
    const imageBuffer = fs.readFileSync(filePath);
    const b64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mime};base64,${b64}`;

    let parsed;
    let cacheLookup = null;

    try {
      cacheLookup = await lookup(imageBuffer);
      cacheMetrics.mode = cacheLookup.mode || cacheMode;
      cacheMetrics.embedder = cacheLookup.embedder || cacheMetrics.embedder;
      cacheMetrics.status = cacheLookup.status;
      cacheMetrics.similarity = formatSimilarity(cacheLookup.similarity);
      cacheMetrics.embeddingMs = formatMs(cacheLookup.timing.embeddingMs);
      cacheMetrics.lookupMs = formatMs(cacheLookup.timing.lookupMs);
      if (cacheLookup.status !== "MISS") {
        parsed = cacheLookup.parsed;
      }
    } catch (err) {
      console.warn("[EcoTag] Cache lookup failed; continuing without cache.", err);
    }

    if (!parsed) {
      try {
        if (isMockOcrEnabled()) {
          parsed = extractMockTagFromImageBuffer(imageBuffer, cacheLookup?.artifacts);
        } else {
          parsed = await tagExtractor(dataUrl);
        }
      } catch {
        applyCacheHeaders(res, cacheMetrics);
        return res.status(502).json({
          error: {
            code: "UPSTREAM_ERROR",
            message: "Failed to analyze image with AI provider.",
          },
        });
      }

      if (cacheLookup?.cacheEnabled) {
        try {
          await store({
            imageBuffer,
            parsed,
            imageHash: cacheLookup?.artifacts?.imageHash,
            fingerprint: cacheLookup?.artifacts?.fingerprint,
          });
        } catch (err) {
          console.warn("[EcoTag] Cache write failed; skipping cache store.", err);
        }
      }
      cacheMetrics.status = "MISS";
      cacheMetrics.similarity = "";
      cacheMetrics.falsePositive = "NA";
    } else if (cacheLookup?.status === "HIT_SEMANTIC" && isMockOcrEnabled()) {
      try {
        const expected = extractMockTagFromImageBuffer(
          imageBuffer,
          cacheLookup?.artifacts,
        );
        cacheMetrics.falsePositive = isDeepStrictEqual(parsed, expected) ? "0" : "1";
      } catch {
        cacheMetrics.falsePositive = "NA";
      }
    }

    // Normalize shape before emissions calculation.
    parsed = normalizeParsedForEmissions(parsed);

    try {
      let emissions;
      emissions = estimateEmissions(parsed);
      applyCacheHeaders(res, cacheMetrics);
      return res.json({ parsed, emissions });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Care instructions must be a structured object")
      ) {
        const emissions = estimateEmissions(withFallbackCareForEmissions(parsed));
        applyCacheHeaders(res, cacheMetrics);
        return res.json({ parsed, emissions });
      }
      throw err;
    }
  } catch (err) {
    console.error("[EcoTag] /api/tag failed with internal error.", err);
    applyCacheHeaders(res, cacheMetrics);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
      },
    });
  } finally {
    // Always clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export default router;
