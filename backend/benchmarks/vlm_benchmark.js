#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const opts = {
    url: "http://localhost:3001/api/tag",
    runs: 20,
    concurrency: 1,
    timeoutMs: 60000,
    image: null,
    imagesDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--url") {
      opts.url = argv[++i];
    } else if (arg === "--image") {
      opts.image = argv[++i];
    } else if (arg === "--images-dir") {
      opts.imagesDir = argv[++i];
    } else if (arg === "--runs") {
      opts.runs = Number(argv[++i]);
    } else if (arg === "--concurrency") {
      opts.concurrency = Number(argv[++i]);
    } else if (arg === "--timeout-ms") {
      opts.timeoutMs = Number(argv[++i]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if ((opts.image && opts.imagesDir) || (!opts.image && !opts.imagesDir)) {
    throw new Error("Provide exactly one of --image or --images-dir");
  }
  if (!Number.isInteger(opts.runs) || opts.runs <= 0) {
    throw new Error("--runs must be a positive integer");
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency <= 0) {
    throw new Error("--concurrency must be a positive integer");
  }
  if (!Number.isInteger(opts.timeoutMs) || opts.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }

  return opts;
}

async function collectImages({ image, imagesDir }) {
  if (image) {
    const abs = path.resolve(image);
    await fs.access(abs);
    return [abs];
  }

  const absDir = path.resolve(imagesDir);
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const images = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(absDir, entry.name))
    .filter((file) => /\.(jpg|jpeg|png)$/i.test(file))
    .sort();

  if (images.length === 0) {
    throw new Error(`No .jpg/.jpeg/.png files found in ${absDir}`);
  }
  return images;
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  const safeIdx = Math.min(Math.max(idx, 0), sorted.length - 1);
  return Number(sorted[safeIdx].toFixed(2));
}

function mean(values) {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

function parseOptionalNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function buildCacheResetUrl(tagUrl) {
  const parsed = new URL(tagUrl);
  const basePath = parsed.pathname.replace(/\/tag\/?$/, "");
  parsed.pathname = `${basePath}/cache/reset`.replace(/\/{2,}/g, "/");
  return parsed.toString();
}

async function resetRemoteCache({ tagUrl, timeoutMs }) {
  const resetUrl = buildCacheResetUrl(tagUrl);
  const response = await fetch(resetUrl, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      `Cache reset failed (${response.status}) at ${resetUrl}`,
    );
  }

  return {
    url: resetUrl,
    status: response.status,
    body,
  };
}

function summarize(results) {
  const latencies = results.map((r) => r.latencyMs);
  const successes = results.filter((r) => r.ok).length;
  const exactHits = results.filter((r) => r.cacheStatus === "HIT_EXACT").length;
  const semanticHits = results.filter((r) => r.cacheStatus === "HIT_SEMANTIC").length;
  const semanticFalsePositives = results.filter(
    (r) => r.cacheStatus === "HIT_SEMANTIC" && r.cacheFalsePositive === 1,
  ).length;
  const embeddingValues = results
    .map((r) => r.cacheEmbeddingMs)
    .filter((value) => Number.isFinite(value));
  const lookupValues = results
    .map((r) => r.cacheLookupMs)
    .filter((value) => Number.isFinite(value));
  const rssValues = results.map((r) => r.cacheRssMb).filter((value) => Number.isFinite(value));
  const cacheModeCounts = results.reduce((acc, result) => {
    const key = result.cacheMode || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const cacheEmbedderCounts = results.reduce((acc, result) => {
    const key = result.cacheEmbedder || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const count = results.length;
  const latencyMean =
    count === 0
      ? null
      : Number((latencies.reduce((sum, v) => sum + v, 0) / count).toFixed(2));
  const min = count === 0 ? null : Number(Math.min(...latencies).toFixed(2));
  const max = count === 0 ? null : Number(Math.max(...latencies).toFixed(2));

  return {
    count,
    success_rate: count === 0 ? 0 : Number(((successes / count) * 100).toFixed(2)),
    mean_ms: latencyMean,
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    min_ms: min,
    max_ms: max,
    exact_hit_rate: count === 0 ? 0 : Number(((exactHits / count) * 100).toFixed(2)),
    semantic_hit_rate: count === 0 ? 0 : Number(((semanticHits / count) * 100).toFixed(2)),
    overall_hit_rate:
      count === 0 ? 0 : Number((((exactHits + semanticHits) / count) * 100).toFixed(2)),
    semantic_false_positive_rate:
      semanticHits === 0
        ? 0
        : Number(((semanticFalsePositives / semanticHits) * 100).toFixed(2)),
    avg_embedding_ms: mean(embeddingValues),
    avg_lookup_ms: mean(lookupValues),
    rss_mb_avg: mean(rssValues),
    rss_mb_max:
      rssValues.length === 0 ? null : Number(Math.max(...rssValues).toFixed(2)),
    cache_mode_counts: cacheModeCounts,
    cache_embedder_counts: cacheEmbedderCounts,
  };
}

async function runRequest({ url, imagePath, timeoutMs }) {
  const started = process.hrtime.bigint();
  try {
    const buffer = await fs.readFile(imagePath);
    const mime = imagePath.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";

    const form = new FormData();
    form.append("image", new Blob([buffer], { type: mime }), path.basename(imagePath));

    const response = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const cacheMode = response.headers.get("x-cache-mode") ?? "unknown";
    const cacheEmbedder = response.headers.get("x-cache-embedder") ?? "unknown";
    const cacheStatus = response.headers.get("x-cache-status") ?? "MISS";
    const cacheSimilarity = parseOptionalNumber(
      response.headers.get("x-cache-similarity"),
    );
    const cacheEmbeddingMs = parseOptionalNumber(
      response.headers.get("x-cache-embedding-ms"),
    );
    const cacheLookupMs = parseOptionalNumber(response.headers.get("x-cache-lookup-ms"));
    const falsePositiveHeader = response.headers.get("x-cache-false-positive");
    const cacheFalsePositive =
      falsePositiveHeader === "1"
        ? 1
        : falsePositiveHeader === "0"
          ? 0
          : null;
    const cacheRssMb = parseOptionalNumber(response.headers.get("x-cache-rss-mb"));

    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Number(latencyMs.toFixed(2)),
      image: imagePath,
      cacheMode,
      cacheEmbedder,
      cacheStatus,
      cacheSimilarity,
      cacheEmbeddingMs,
      cacheLookupMs,
      cacheFalsePositive,
      cacheRssMb,
    };
  } catch {
    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    return {
      ok: false,
      status: 0,
      latencyMs: Number(latencyMs.toFixed(2)),
      image: imagePath,
      cacheMode: "unknown",
      cacheEmbedder: "unknown",
      cacheStatus: "MISS",
      cacheSimilarity: null,
      cacheEmbeddingMs: null,
      cacheLookupMs: null,
      cacheFalsePositive: null,
      cacheRssMb: null,
    };
  }
}

async function runWithConcurrency({ runs, concurrency, requestFactory }) {
  const results = new Array(runs);
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= runs) break;
      results[current] = await requestFactory(current);
    }
  }

  const workerCount = Math.min(concurrency, runs);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const reset = await resetRemoteCache({
    tagUrl: opts.url,
    timeoutMs: Math.min(opts.timeoutMs, 15000),
  });
  const images = await collectImages(opts);

  const results = await runWithConcurrency({
    runs: opts.runs,
    concurrency: opts.concurrency,
    requestFactory: async (i) => {
      const imagePath = images[i % images.length];
      return runRequest({ url: opts.url, imagePath, timeoutMs: opts.timeoutMs });
    },
  });

  const summary = summarize(results);

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  const outputDir = path.resolve("benchmarks/results");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${stamp}.json`);

  const payload = {
    generated_at: now.toISOString(),
    config: {
      url: opts.url,
      cache_reset_url: reset.url,
      runs: opts.runs,
      concurrency: opts.concurrency,
      timeout_ms: opts.timeoutMs,
      image: opts.image,
      images_dir: opts.imagesDir,
    },
    cache_reset: {
      status: reset.status,
      response: reset.body,
    },
    summary,
    results,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  console.log("VLM Benchmark Results");
  console.log(`url: ${opts.url}`);
  console.log(`cache_reset_url: ${reset.url}`);
  console.log(`cache_reset_status: ${reset.status}`);
  console.log(`runs: ${summary.count}`);
  console.log(`success_rate: ${summary.success_rate}%`);
  console.log(`mean_ms: ${summary.mean_ms}`);
  console.log(`p50_ms: ${summary.p50_ms}`);
  console.log(`p95_ms: ${summary.p95_ms}`);
  console.log(`p99_ms: ${summary.p99_ms}`);
  console.log(`min_ms: ${summary.min_ms}`);
  console.log(`max_ms: ${summary.max_ms}`);
  console.log(`exact_hit_rate: ${summary.exact_hit_rate}%`);
  console.log(`semantic_hit_rate: ${summary.semantic_hit_rate}%`);
  console.log(`overall_hit_rate: ${summary.overall_hit_rate}%`);
  console.log(
    `semantic_false_positive_rate: ${summary.semantic_false_positive_rate}%`,
  );
  console.log(`avg_embedding_ms: ${summary.avg_embedding_ms}`);
  console.log(`avg_lookup_ms: ${summary.avg_lookup_ms}`);
  console.log(`rss_mb_avg: ${summary.rss_mb_avg}`);
  console.log(`rss_mb_max: ${summary.rss_mb_max}`);
  console.log(`cache_mode_counts: ${JSON.stringify(summary.cache_mode_counts)}`);
  console.log(
    `cache_embedder_counts: ${JSON.stringify(summary.cache_embedder_counts)}`,
  );
  console.log(`output: ${outputPath}`);
}

main().catch((err) => {
  console.error(`Benchmark failed: ${err.message}`);
  process.exit(1);
});
