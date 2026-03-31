# EcoTag Technical History and Architecture

This document is a developer-facing summary of how EcoTag evolved from its first repository commit through March 31, 2026. It is based on the checked git history, the current application code, the committed benchmark notes in `benchmarks.md`, and the backend/mobile test suites. It is intended as a technical narrative, not a commit-by-commit changelog.

## Project Overview

As of March 31, 2026, EcoTag has two active application surfaces:

- `mobile/`: a React Native + Expo client for scanning clothing tags, caching responses locally, storing scan history, and presenting benchmark-aware results.
- `backend/`: a Node.js + Express service that accepts uploaded tag images, extracts structured garment metadata with a vision-language model, computes lifecycle emissions, and returns an average-garment benchmark for comparison.

The current product path is VLM-driven. A captured or selected image is posted to `POST /api/tag`, parsed into structured garment metadata, run through the emissions model, paired with a benchmark payload, and then rendered in the mobile app. The older Python OCR pipeline still exists under `code/` as a research artifact and historical baseline.

## Milestone Timeline

The timeline below focuses on the architectural and research milestones that changed the direction of the project.

### January 27, 2026: Repository foundation and Python prototype

Commits: `e599d5b`, `361dae3`, `ffb178c`, `150d3ed`, `0af7644`

The repository started with a Python-first workflow under `code/`. The initial prototype established the three ideas that still define EcoTag:

- extract garment facts from a care tag
- normalize those facts into a structured record
- estimate lifecycle CO2 from materials, manufacturing, and care data

This phase also introduced the initial JSON factor datasets in `co2_data/`. Even though the extraction layer later changed completely, the deterministic modeling layer and the product scope were already visible here.

### February 7, 2026: OCR benchmarking work

Commit: `4e4b314`

The first major research milestone was the OCR benchmark pass recorded in `benchmarks.md`. This turned the prototype into something measurable instead of anecdotal. The team started tracking:

- extraction success rate
- latency per image
- throughput on consumer hardware
- failure modes for missing or low-quality tag text

That benchmark data became the main evidence that OCR was useful for exploration but too brittle and too slow to be the long-term product architecture.

### February 9-14, 2026: Mobile scaffolding, camera flow, and performance instrumentation

Commits: `5648d43`, `6b1f891`

EcoTag then shifted from a local script into an actual mobile product. This phase added the scan flow, camera page, and local performance instrumentation that still exists in:

- `mobile/src/components/CameraView.tsx`
- `mobile/src/hooks/usePerformanceMetrics.ts`
- `mobile/src/hooks/useCameraEagerLoad.ts`
- `mobile/src/context/CameraWarmupContext.tsx`
- `mobile/src/context/MetricsContext.tsx`

This mattered because the project stopped being only an extraction experiment and became a measurable user flow with camera-open, capture, upload, and warmup timings.

### February 16-18, 2026: Migration from OCR to a Node backend with `gpt-5.2`

Commits: `be5aa8e`, `f0f016d`, `fc80f6b`, `1faf815`

This was the main architectural pivot. The repository moved from a local OCR-heavy pipeline to a backend service that used OpenAI's vision model with a strict JSON schema. At the same time the team added:

- a stable `/api/tag` contract
- mocked E2E coverage for the route
- normalization of care instructions before emissions calculation
- a benchmark runner for the new VLM request path

From this point forward the system was split into two halves:

- probabilistic extraction owned by the model
- deterministic validation, normalization, and emissions modeling owned by application code

That split is still the backbone of the project.

### February 19-24, 2026: Scan history, cache research, deployment, and prompt tuning

Commits: `2b2b0a6`, `4553da4`, `93bda59`, `2185020`, `c7fd932`, `df7217a`

After the VLM path existed, the main questions became cost, latency, deployment, and developer usability. This phase introduced:

- local SQLite scan history on mobile
- frontend to backend integration for the real `/api/tag` flow
- server-side cache experiments for exact, semantic, and tiered lookup
- on-device exact-match caching in the mobile app
- Cloud Run deployment artifacts
- prompt updates to improve extraction quality

This is the point where EcoTag started behaving like an application instead of a demo.

### February 28-March 10, 2026: Results UX, benchmark comparisons, cache TTL, and model refinement

Commits: `a8fcb5f`, `96f46c8`, `5d4b687`, `07ac11c`, `67739d7`, `7fa93c2`, `1e16957`, `f68da29`, `c805859`, `3e4547d`

This phase focused on making the backend numbers interpretable to users and useful to developers. Key additions included:

- onboarding and landing flows
- results and closet/history screens
- a computed global benchmark metric returned from the backend
- percentage-based eco rating labels in results and comparison surfaces
- breakdown pills that compare each emissions component against the benchmark component
- a 24-hour inactivity TTL for the mobile exact-match cache
- a washing-load correction that scales care emissions by garment share of a 5 kg load

This is the stage where EcoTag moved from "return a CO2 number" to "explain what that number means."

### March 23-31, 2026: Benchmark consistency fixes, eco-rating rollout, and UI polish

Commits: `559c54b`, `fe348a7`, `f78999f`, `2c8c3c9`, `4395e76`, `d703597`, `126a4ee`, `cd1ba61`, `363c1f7`, `8000d83`, `ae4706b`, `2b25c8a`, `502a02b`

Late March work was less about foundational architecture and more about consistency across the product:

- benchmark integration was aligned between closet/comparison and the main results flow
- eco-rating pills were rolled out to home, recents, closet, and comparison cards
- results and comparison screens were restyled around the benchmark-based grading model
- large onboarding and splash PNG assets were replaced with SVG equivalents

By this point the app had a clearer product language: benchmark-aware cards, consistent rating thresholds, and lighter-weight assets.

## Research Evolution

### OCR Research

The earliest extraction path lives in:

- `code/demo.py`
- `code/tag_parser.py`
- `code/calculate_co2.py`
- `benchmarks.md`

The Python prototype used EasyOCR plus five preprocessing variants:

- original image
- CLAHE enhancement
- denoising
- adaptive thresholding
- bilateral filtering

The pipeline tried multiple variants, selected the highest-confidence OCR output, deduplicated merged text, and then handed the text to regex-driven parsing in `code/tag_parser.py`.

This approach proved that EcoTag was viable, but it also revealed the scaling problem. The committed benchmark notes report:

| OCR Baseline | Dataset / Hardware | Result |
| --- | --- | --- |
| Success rate | 55/76 on macOS M2 Pro | 72.3% |
| Average latency | macOS M2 Pro | 25.94 s / image |
| Throughput | macOS M2 Pro | 0.04 img / sec |
| Peak RAM | macOS M2 Pro | 1.1 GB |
| Success rate | 58/80 on Windows 13900HX | 72.5% |
| Average latency | Windows 13900HX | 22.3 s / image |
| Throughput | Windows 13900HX | 2.69 images / min |
| Peak RAM | Windows 13900HX | 4773.51 MB |

Main failure modes:

- OCR recovered text but the parser could not reliably recover materials or country from noisy output.
- Some tags mostly contained washing text or symbols, which made regex-based structure recovery brittle.
- The five-variant loop improved recall but drove latency too high for a production mobile flow.

What the team kept from this phase:

- the domain model around materials, origin, and care
- deterministic emissions logic after extraction
- the habit of benchmarking before making architectural claims

What the team dropped:

- local OCR plus regex parsing as the primary extraction path

### VLM Research and Implementation

The current extraction path centers on:

- `backend/ai/gpt.js`
- `backend/api/tag.js`
- `backend/ai/mock.js`

`backend/ai/gpt.js` shows the key design decision: the model is not asked for prose. It is given a system prompt plus a strict JSON schema that requires:

- `ocr_text`
- `country`
- `materials`
- `care` with fixed keys and enumerated values

That is a major improvement over the OCR era. The model still performs recognition, but the application owns the response shape. This reduces downstream ambiguity and makes the backend contract testable.

`backend/api/tag.js` then normalizes the returned structure before emissions are computed. In practice that means the route protects the deterministic model from malformed or incomplete model output by:

- forcing `care` into a predictable object shape
- returning stable error payloads for missing images and upstream failures
- handling the "no tag detected" case explicitly
- falling back to default washing assumptions when care data is malformed

`backend/ai/mock.js` complements this by generating deterministic fake tag output for tests and local development, which lets the team exercise the full request path without a live model call.

Why the team moved from OCR to VLM:

- the VLM can jointly read messy tag text and infer structure in one step
- JSON-schema output gives the application a stronger contract than raw OCR text
- the backend route is easier to test than a large local OCR stack embedded in the client

### Caching Research

Caching work exists in two different layers of the repo.

The backend cache research is implemented in:

- `backend/cache/service.js`
- `backend/cache/db.js`
- `backend/cache/config.js`
- `backend/cache/fingerprint.js`
- `backend/cache/embedding.js`

This code explores three lookup strategies:

- exact cache hits based on SHA-256 image hashing
- semantic hits using either CLIP embeddings or a handcrafted grayscale fingerprint
- tiered lookup that tries exact first and semantic second

The backend cache stores parsed responses and fingerprint artifacts in SQLite. It also supports:

- cache mode selection
- similarity threshold tuning
- fingerprint versioning
- entry pruning
- fallback between embedding approaches

The mobile cache is separate and clearly active in the current request path:

- `mobile/src/services/api.ts`
- `mobile/src/storage/imageCache.ts`
- `mobile/src/storage/db.ts`

Before posting an image to the backend, `tagImage()` checks an on-device exact-match cache. That cache currently:

- hashes image bytes with SHA-256
- stores the full API response in SQLite
- uses FIFO eviction
- keeps at most 50 entries
- clears itself after 24 hours of inactivity

What the team learned:

- exact-match caching is simple, explainable, and very high value for repeated scans
- semantic caching improves hit rate but introduces false-positive risk and operational tuning cost
- mobile-side caching avoids a full network round trip and model invocation for repeated images

One important caveat for new contributors: the backend cache subsystem, its tests, and its benchmark harness are still present, but the current `backend/api/tag.js` route does not import `backend/cache/service.js`. In the current repo snapshot, mobile exact-match caching is the clearly active cache path, while backend caching should be treated as serious research infrastructure rather than a guaranteed live feature.

## Benchmark Inventory and Interpretation

EcoTag's benchmark culture matters because several major architecture decisions were driven by measured tradeoffs rather than intuition.

### OCR benchmark

This benchmark answered a simple question: can open-source OCR recover enough structured garment information to support the app?

The answer was "sometimes, but not reliably or quickly enough." The key takeaway was not that OCR failed completely. It was that the cost of five image-processing variants plus brittle parsing pushed the system into a poor latency/robustness tradeoff for a mobile experience.

### Cache strategy benchmark

`benchmarks.md` also records a backend cache comparison over 200 runs at concurrency 4. The summary reported:

| Cache Strategy | Mean Latency | Overall Hit Rate | Wrong Response Rate |
| --- | --- | --- | --- |
| No cache | 1706.34 ms | 0% | 0% |
| Exact | 877.16 ms | 62% | 0% |
| Semantic + CLIP | 703.93 ms | 63% | 3% |
| Tiered | 457.98 ms | 63% | 3% |

The benchmark notes also defined:

- `latency_overhead_ms = avg_embedding_ms + avg_lookup_ms`
- `overall_wrong_response_rate = semantic_false_positive_count / runs`

This benchmark is historically important because it explains why the team invested in caching at all. It also shows the core tradeoff clearly:

- exact caching is slower than tiered on aggregate but safer
- semantic caching increases hit rate only slightly here
- semantic false positives are the main operational risk

### Mobile exact-cache benchmark

The on-device exact-cache benchmark in `benchmarks.md` used 76 images from `cropped_tags` across three passes. The summary reported:

| Mobile Cache Metric | MISS (cold) | HIT (warm) |
| --- | --- | --- |
| Mean latency | 202.57 ms | 1.45 ms |
| p50 | 183.41 ms | 1.12 ms |
| p95 | 368.82 ms | 3.66 ms |
| Avg time saved per hit | - | 201.12 ms |
| Latency reduction | - | 99.3% |

This benchmark is the strongest quantitative argument for the current mobile cache. Even without backend semantic caching, repeated scans become effectively local lookups.

### End-to-end VLM + cache benchmark

The committed benchmark notes also include a Cloud Run benchmark against the VLM-backed backend:

| E2E Metric | MISS (cold) | HIT (warm) |
| --- | --- | --- |
| Mean latency | 3607.08 ms | 5.00 ms |
| p50 | 3594.82 ms | 4.77 ms |
| p95 | 5174.12 ms | 9.29 ms |
| p99 | 6334.35 ms | 10.60 ms |
| Cache speedup | - | ~721x |
| Latency reduction | - | 99.9% |

This benchmark shows why caching is not an optimization detail in EcoTag. It is one of the only practical ways to turn a model-backed image pipeline into a responsive repeated-scan experience.

### Benchmark caveats

Not every benchmark artifact in the repo is current:

- `backend/benchmarks/vlm_benchmark.js` still expects `/api/cache/reset` and cache observability headers, but the current `backend/server.js` only mounts `tag.js` and does not expose that reset route.
- `benchmarks.md` references `backend/benchmarks/mobile_cache_benchmark.js`, but that script is not present in the current repo snapshot.
- The benchmark notes describe older mobile cache limits that do not match the current implementation. The live code in `mobile/src/storage/imageCache.ts` uses a 50-entry FIFO cache with a 24-hour inactivity TTL.

For new contributors, the safest reading is:

- OCR numbers are historical baseline data
- server-side cache numbers are research results
- mobile exact-match caching is both benchmarked and actively wired into the app

## Benchmark Model and Rating Scales

This section is the most important one for understanding the app's current benchmark-aware UI.

### Global average garment benchmark

`backend/ai/benchmarks.js` computes a single comparison profile at module load. That profile is:

- country: `china`
- materials: `60% cotton`, `40% polyester`
- care: `machine_wash_warm`, `tumble_dry_low`, no ironing, no dry cleaning
- garment weight: `0.35 kg`
- lifetime washes: `50`

The backend currently returns this benchmark as top-level fields on `POST /api/tag`:

- `benchmark_kgco2e`
- `benchmark_breakdown`

The current runtime benchmark values are:

| Benchmark Component | Value |
| --- | --- |
| Total benchmark | 10.95 kgCO2e |
| Materials | 2.38 kgCO2e |
| Manufacturing | 0.18 kgCO2e |
| Washing | 2.10 kgCO2e |
| Drying | 6.30 kgCO2e |
| Ironing | 0.00 kgCO2e |
| Dry cleaning | 0.00 kgCO2e |

Two important implications:

- Drying dominates the current average-garment benchmark, which is why line-dry and no-tumble-dry garments can look meaningfully better than average even when materials are ordinary.
- Manufacturing is currently a small component in the benchmark profile because the country factor table in `manufacturing.json` uses low per-kg values relative to the care-stage assumptions.

### How garment eco ratings are computed

The clothing-level rating used in home, closet, comparison, and results is based on this formula:

```ts
score = clamp(0, 100, (1 - garment_total_kgco2e / (2 * benchmark_kgco2e)) * 100)
```

The thresholds are:

| Score Range | Label |
| --- | --- |
| `< 40` | Poor |
| `40-59` | Average |
| `>= 60` | Good |

How to interpret the scale:

- a garment equal to the benchmark scores `50`, which is `Average`
- a garment at half the benchmark scores `75`, which is `Good`
- a garment at zero scores `100`
- a garment at double the benchmark or worse bottoms out at `0`

So this is not a percentile rank. It is a bounded comparison against a single average-garment reference point.

### How breakdown pills are computed

The results screen assigns a `Poor`, `Average`, or `Good` pill to each emissions component by comparing the garment's component value against the benchmark component value:

```ts
ratio = garment_component / benchmark_component
```

Thresholds:

| Component Ratio vs. Benchmark | Pill |
| --- | --- |
| `> 1.2` | Poor |
| `> 0.8` and `<= 1.2` | Average |
| `<= 0.8` | Good |

Special case:

- if the benchmark component is missing or `0`, a garment component of `0` is treated as `Good`
- otherwise that component is treated as `Poor`

That means the breakdown pills are component-relative, not total-relative. A garment can be `Good` overall while still having a `Poor` material pill, or vice versa.

### What each breakdown row represents

The emissions breakdown is computed in `backend/ai/emissions.js` and rendered in the mobile results view. The rows map to:

- `materials`: garment weight multiplied by the weighted fiber emissions factor
- `manufacturing`: garment weight multiplied by the country factor
- `washing`: per-use washing factor multiplied by lifetime washes and garment share of a 5 kg wash load
- `drying`: per-use drying factor multiplied by lifetime washes and garment share of a 5 kg load
- `ironing`: same structure as drying, but for ironing
- `dry_cleaning`: same structure as drying, but for dry cleaning

A subtle but important implementation detail: `emissions.js` supports fiber-specific `lifetime_washes`, but the current `materials.json` entries do not define them. In practice, that means the current code falls back to the garment default of `50` lifetime washes for all materials.

### Why the March 10 wash-load change mattered

The `3e4547d` backend change introduced garment-share scaling for care emissions:

```ts
garmentShare = weight_kg / 5
```

With the default 350 g garment, care-stage emissions are multiplied by `0.07`. This was a meaningful modeling correction because earlier care estimates implicitly treated one garment as if it consumed a full machine load by itself.

## Testing Strategy

Testing in the repository is concentrated in `backend/` plus mobile-side instrumentation.

Backend automated tests live in:

- `backend/test/e2e/tag.e2e.test.js`
- `backend/test/unit/cache.service.test.js`
- `backend/test/unit/fingerprint.test.js`
- `backend/test/economics.test.js`

The testing strategy evolved in layers:

- contract and happy-path tests for `POST /api/tag`
- stable error-shape tests for missing image and upstream provider failure
- normalization tests for malformed care payloads
- mocked end-to-end tests that avoid live OpenAI calls
- optional live E2E coverage gated behind `E2E_LIVE=1` and `OPENAI_API_KEY`
- cache unit tests for semantic thresholding and pruning
- economics tests for weighted lifespan assumptions and baseline cost comparisons

The benchmark harness in `backend/benchmarks/vlm_benchmark.js` also belongs in the validation story. It is not a unit test, but it shows that the team treated latency, cache hit rate, and false-positive behavior as first-class engineering concerns.

On the mobile side, the repo does not yet contain an automated test suite. Mobile validation has instead been a mix of:

- manual end-to-end testing through Expo
- capture and upload timing instrumentation in `usePerformanceMetrics`
- eager camera warmup measurement in `useCameraEagerLoad`

That split is understandable for the current stage of the project, but it is still one of the clearest areas for maturity work.

## Current Architecture

### Prototype vs. current system

The repository currently contains both the original prototype and the current app stack:

- prototype research path: `code/` plus root-level `co2_data/`
- current application path: `mobile/`, `backend/`, and backend-local `co2_data/`

The Python code remains useful as technical history and as a lightweight research harness. The shipping architecture is the Expo client plus the Node backend.

### Current request and storage flow

At a high level, the current system works like this:

1. The user captures or selects a clothing tag image in the mobile app.
2. `mobile/src/services/api.ts` checks the local exact-match image cache in `mobile/src/storage/imageCache.ts`.
3. On a MISS, the mobile client posts the image to `POST /api/tag`.
4. `backend/api/tag.js` reads the upload, routes the image to either `backend/ai/gpt.js` or `backend/ai/mock.js`, then normalizes the parsed result.
5. `backend/ai/emissions.js` calculates materials, manufacturing, washing, drying, ironing, and dry-cleaning emissions from the parsed tag plus factor data in `backend/co2_data/`.
6. `backend/ai/benchmarks.js` supplies the benchmark total and benchmark breakdown returned alongside the emissions result.
7. `mobile/src/services/api.ts` stores a sanitized scan record in SQLite and may store the API response in the local image cache for future exact-match hits.

### Major subsystems

#### Extraction and normalization

- `backend/ai/gpt.js` defines the VLM prompt and strict JSON schema.
- `backend/api/tag.js` owns upload handling, error mapping, normalization, and response shape.
- `backend/ai/mock.js` provides deterministic development and test data.

#### Emissions and comparison modeling

- `backend/ai/emissions.js` computes the lifecycle breakdown.
- `backend/ai/benchmarks.js` computes the reusable global benchmark.
- `backend/co2_data/*.json` provides the runtime factor tables.

#### Mobile persistence

- `mobile/src/storage/db.ts` initializes the SQLite schema.
- `mobile/src/storage/scans.ts` stores scan history and intentionally sanitizes what is persisted.
- `mobile/src/storage/imageCache.ts` stores cached API responses keyed by image hash.

#### Rating and comparison UI

- `mobile/app/(tabs)/results.tsx` renders component breakdown rows and benchmark-relative pills.
- `mobile/app/(tabs)/comparison.tsx` computes clothing-level and aggregate ratings from stored benchmark data.
- `mobile/app/(tabs)/index.tsx` and `mobile/app/(tabs)/closet.tsx` reuse the same garment-level rating thresholds on cards.

## Future Improvements and Scaling Guidance for Other Developers

### 1. Centralize benchmark and rating logic

The score formula and threshold logic are duplicated across multiple mobile screens. The next clean step is a shared utility that owns:

- benchmark parsing
- total-score calculation
- breakdown-pill calculation
- label and color mapping

This would reduce drift between results, home, closet, and comparison surfaces.

### 2. Strengthen response typing

`mobile/src/types/api.ts` still types `benchmark_kgco2e` and `benchmark_breakdown` loosely. Tightening these types would make benchmark integration safer and would help catch legacy-shape assumptions earlier.

### 3. Decide the role of server-side caching

The backend cache research is substantial enough that it should either be:

- clearly reconnected to the live request path and documented as active, or
- clearly marked as research/archive infrastructure

If it becomes active again, the next scaling tasks are:

- cache observability that matches the live route
- explicit invalidation/reset behavior
- false-positive monitoring
- versioned embedding and fingerprint migrations

### 4. Make benchmark outputs reproducible

The repo already has benchmark culture, but the docs and runnable scripts have drifted. A better scaling path is to make benchmark outputs machine-readable and derive human-facing documentation from committed artifacts.

In practice that means:

- checking benchmark result JSON into a stable location
- documenting which benchmarks are current versus historical
- keeping benchmark scripts aligned with the live API surface

### 5. Add more factor-data provenance

The emissions engine already supports more nuance than the current factor tables provide. A useful next step is to enrich the data files with:

- source metadata per factor
- fiber-specific `lifetime_washes`
- versioned assumptions for benchmark profiles

That would make the model easier to audit and extend.

### 6. Add mobile automated tests

The largest current testing gap is mobile automation. A practical next step is not a full UI test matrix, but targeted tests around:

- API response normalization in the client
- local cache hit and miss behavior
- benchmark and breakdown rendering for partial data
- scan history persistence and schema migrations

### 7. Abstract model providers

Right now extraction is tightly coupled to `backend/ai/gpt.js` and a single model name. A provider abstraction would make it easier to:

- try newer OpenAI models
- compare prompt variants systematically
- add retries and fallback rules without rewriting the route contract

## Known Documentation and Implementation Drift

- `docs/api.md` and `backend/benchmarks/vlm_benchmark.js` still describe `/api/cache/reset`, but the current `backend/server.js` mounts only the tag route and does not expose that reset endpoint.
- The current `backend/api/tag.js` route does not import `backend/cache/service.js`, so cache headers and reset-route assumptions should be read as historical or experimental rather than active.
- `benchmarks.md` references `backend/benchmarks/mobile_cache_benchmark.js`, but that script is not present in the current repository.
- The benchmark notes describe older mobile cache limits that differ from the live code. The active mobile cache currently uses a 50-entry FIFO policy plus a 24-hour inactivity TTL.

