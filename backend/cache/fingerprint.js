import crypto from "node:crypto";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const TARGET_WIDTH = 32;
const TARGET_HEIGHT = 32;
const BLOCKS = 8;

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isJpeg(buffer) {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function decodeToRgba(buffer) {
  if (isPng(buffer)) {
    const png = PNG.sync.read(buffer);
    return { data: png.data, width: png.width, height: png.height };
  }

  if (isJpeg(buffer)) {
    const jpg = jpeg.decode(buffer, { useTArray: true });
    return { data: jpg.data, width: jpg.width, height: jpg.height };
  }

  throw new Error("Unsupported image format for fingerprinting");
}

function toGrayscale(rgba, width, height) {
  const out = new Float64Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
}

function resizeNearest(src, srcWidth, srcHeight, dstWidth, dstHeight) {
  const out = new Float64Array(dstWidth * dstHeight);
  for (let y = 0; y < dstHeight; y += 1) {
    const srcY = Math.min(srcHeight - 1, Math.floor((y * srcHeight) / dstHeight));
    for (let x = 0; x < dstWidth; x += 1) {
      const srcX = Math.min(srcWidth - 1, Math.floor((x * srcWidth) / dstWidth));
      out[y * dstWidth + x] = src[srcY * srcWidth + srcX];
    }
  }
  return out;
}

function normalizeVector(values) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => Number((value / norm).toFixed(8)));
}

export function computeImageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function computeFingerprint(buffer) {
  const { data, width, height } = decodeToRgba(buffer);
  const grayscale = toGrayscale(data, width, height);
  const resized = resizeNearest(
    grayscale,
    width,
    height,
    TARGET_WIDTH,
    TARGET_HEIGHT,
  );

  const blockSizeX = TARGET_WIDTH / BLOCKS;
  const blockSizeY = TARGET_HEIGHT / BLOCKS;
  const vector = [];

  for (let by = 0; by < BLOCKS; by += 1) {
    for (let bx = 0; bx < BLOCKS; bx += 1) {
      let sum = 0;
      for (let y = 0; y < blockSizeY; y += 1) {
        for (let x = 0; x < blockSizeX; x += 1) {
          const px = bx * blockSizeX + x;
          const py = by * blockSizeY + y;
          sum += resized[py * TARGET_WIDTH + px];
        }
      }
      const avg = sum / (blockSizeX * blockSizeY * 255);
      vector.push(avg);
    }
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    throw new Error("Cosine similarity requires same-length non-empty arrays");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}
