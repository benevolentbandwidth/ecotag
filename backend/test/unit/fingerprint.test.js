import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeFingerprint,
  computeImageHash,
  cosineSimilarity,
} from "../../cache/fingerprint.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtureImage = path.resolve(__dirname, "../test_image.jpg");

test("computeImageHash is deterministic for same image bytes", () => {
  const image = fs.readFileSync(fixtureImage);
  const hashA = computeImageHash(image);
  const hashB = computeImageHash(image);
  assert.equal(hashA, hashB);
});

test("computeFingerprint is deterministic and returns 64 dimensions", () => {
  const image = fs.readFileSync(fixtureImage);
  const fpA = computeFingerprint(image);
  const fpB = computeFingerprint(image);

  assert.equal(fpA.length, 64);
  assert.deepEqual(fpA, fpB);
});

test("cosineSimilarity behaves correctly on simple vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});
