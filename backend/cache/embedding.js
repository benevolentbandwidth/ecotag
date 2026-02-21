import { getCacheConfig } from "./config.js";
import { computeFingerprint } from "./fingerprint.js";

let clipExtractorPromise = null;
let clipExtractorModel = null;
let warnedFallback = false;

function normalizeVector(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding vector is empty");
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("Embedding vector norm is invalid");
  }
  return values.map((value) => Number((value / norm).toFixed(8)));
}

function flattenArray(value, out = []) {
  if (Array.isArray(value)) {
    for (const child of value) {
      flattenArray(child, out);
    }
  } else if (Number.isFinite(value)) {
    out.push(Number(value));
  }
  return out;
}

function averageTokenEmbeddings(data, dims) {
  if (!Array.isArray(dims) || dims.length < 2) {
    return data;
  }

  const hidden = Number(dims[dims.length - 1]);
  if (!Number.isInteger(hidden) || hidden <= 0) {
    return data;
  }
  if (data.length === hidden) {
    return data;
  }
  if (data.length % hidden !== 0) {
    return data;
  }

  const tokenCount = data.length / hidden;
  const pooled = new Array(hidden).fill(0);
  for (let token = 0; token < tokenCount; token += 1) {
    const offset = token * hidden;
    for (let i = 0; i < hidden; i += 1) {
      pooled[i] += data[offset + i];
    }
  }

  for (let i = 0; i < hidden; i += 1) {
    pooled[i] /= tokenCount;
  }
  return pooled;
}

function extractVectorFromOutput(output) {
  if (output && typeof output === "object") {
    if (ArrayBuffer.isView(output.data)) {
      const data = Array.from(output.data, (value) => Number(value));
      return averageTokenEmbeddings(data, output.dims);
    }
    if (typeof output.tolist === "function") {
      return flattenArray(output.tolist());
    }
  }

  if (Array.isArray(output)) {
    return flattenArray(output);
  }

  throw new Error("Unexpected CLIP output format");
}

async function getClipExtractor(model) {
  if (clipExtractorPromise && clipExtractorModel === model) {
    return clipExtractorPromise;
  }

  clipExtractorModel = model;
  clipExtractorPromise = (async () => {
    let transformers;
    try {
      transformers = await import("@xenova/transformers");
    } catch (err) {
      throw new Error(
        "Missing '@xenova/transformers'. Run `npm install` in backend.",
      );
    }

    const { pipeline } = transformers;
    const extractor = await pipeline("image-feature-extraction", model);
    return { extractor, transformers };
  })().catch((err) => {
    clipExtractorPromise = null;
    clipExtractorModel = null;
    throw err;
  });

  return clipExtractorPromise;
}

async function runClipExtraction({ imageBuffer, model }) {
  const { extractor, transformers } = await getClipExtractor(model);
  const { RawImage } = transformers;
  const options = { pooling: "mean", normalize: true };

  if (RawImage && typeof RawImage.fromBlob === "function") {
    try {
      const blob = new Blob([imageBuffer]);
      const rawImage = await RawImage.fromBlob(blob);
      return await extractor(rawImage, options);
    } catch {
      // Fall through to other input forms.
    }
  }

  if (RawImage && typeof RawImage.read === "function") {
    try {
      const rawImage = await RawImage.read(imageBuffer);
      return await extractor(rawImage, options);
    } catch {
      // Fall through to direct buffer input.
    }
  }

  try {
    return await extractor(imageBuffer, options);
  } catch {
    return extractor(new Uint8Array(imageBuffer), options);
  }
}

export async function computeSemanticEmbedding(imageBuffer) {
  const config = getCacheConfig();

  if (config.semanticEmbedder === "fingerprint") {
    return {
      embedder: "fingerprint",
      vector: computeFingerprint(imageBuffer),
    };
  }

  try {
    const output = await runClipExtraction({
      imageBuffer,
      model: config.semanticClipModel,
    });
    const vector = normalizeVector(extractVectorFromOutput(output));
    return {
      embedder: "clip",
      vector,
    };
  } catch (err) {
    if (config.semanticFallbackEmbedder === "fingerprint") {
      if (!warnedFallback) {
        warnedFallback = true;
        console.warn(
          "[EcoTag] CLIP embedder failed; falling back to fingerprint embedder.",
        );
      }
      return {
        embedder: "fingerprint_fallback",
        vector: computeFingerprint(imageBuffer),
      };
    }
    throw err;
  }
}
