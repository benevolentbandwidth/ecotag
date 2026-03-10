// tag.js
// Dummy Express API route for tag analysis

import express from "express";
import multer from "multer";
import * as gpt from "../ai/gpt.js";
import { extractMockTagFromImageBuffer } from "../ai/mock.js";
import { estimateEmissions } from "../ai/emissions.js";
import { getBenchmark } from "../ai/benchmarks.js";
import fs from "node:fs";
import path from "node:path";
import { isMockOcrEnabled } from "../cache/config.js";

const router = express.Router();
const upload = multer({ dest: "/tmp/uploads/" });
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

export function __setTagExtractorForTest(extractor) {
  tagExtractor = extractor;
}

export function __resetTagExtractorForTest() {
  tagExtractor = gpt.extractTagFromImage;
}

// POST /api/tag - Accepts image upload, returns tag info, CO2 estimate, and economic metrics.
// Form fields: image (file), price (number, required), category (string, optional)
router.post("/tag", upload.single("image"), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) {
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
    try {
      if (isMockOcrEnabled()) {
        parsed = extractMockTagFromImageBuffer(imageBuffer);
      } else {
        parsed = await tagExtractor(dataUrl);
      }
    } catch {
      return res.status(502).json({
        error: {
          code: "UPSTREAM_ERROR",
          message: "Failed to analyze image with AI provider.",
        },
      });
    }

    parsed = normalizeParsedForEmissions(parsed);

    const hasNoTag =
      (!parsed.materials || parsed.materials.length === 0) && !parsed.country;
    if (hasNoTag) {
      return res.status(422).json({
        error: {
          code: "NO_TAG_DETECTED",
          message:
            "No clothing tag was detected in the image. Please try again with a clearer photo of the tag.",
        },
      });
    }

    try {
      const emissions = estimateEmissions(parsed);
      const benchmark = getBenchmark();
      return res.json({ parsed, emissions, benchmark });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Care instructions must be a structured object")
      ) {
        const emissions = estimateEmissions(withFallbackCareForEmissions(parsed));
        const benchmark = getBenchmark();
        return res.json({ parsed, emissions, benchmark });
      }
      throw err;
    }
  } catch (err) {
    console.error("[EcoTag] /api/tag failed with internal error.", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
      },
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

export default router;
