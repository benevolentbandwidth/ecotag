# Benchmarking:

We benchmarked the current CPU-based OCR pipeline (EasyOCR + Multi-variant Preprocessing) on the "Cropped Tags" dataset. The system prioritizes accuracy over speed, running 5 different image processing variants per tag to ensure text extraction. While accuracy is strong for an open-source solution (72%), the latency (26s/image) indicates a need for optimization before scaling.

### Test Environemnt:

This shows the current environment I have been working on.

#### OS

- **Product:** macOS
- **Version:** 15.7.3
- **Build:** 24G419

#### CPU

- **Model:** Apple M2 Pro
- **Cores:** 10

#### Python

- **Python:** 3.13.3
- **pip:** 25.3

---

### Mac M2 Pro Metrics:

| Metric           | Result         | Notes                                               |
| ---------------- | -------------- | --------------------------------------------------- |
| **Success Rate** | 72.3% (55/76)  | Successfully extracted Origin or Materials.         |
| **Avg Latency**  | 25.94s / image | High due to 5x brute-force inference loop.          |
| **Throughput**   | 0.04 img / sec | Current capacity: ~144 images per hour.             |
| **Peak RAM**     | 1.1 GB         | Very lightweight; runs easily on consumer hardware. |
| **Min Latency**  | 6.05s          | Occurs when the "Original" image works immediately. |
| **Max Latency**  | 49.38s         | Occurs when the system forces all 5 filters.        |

# Windows 13900HX Metrics

| Metric           | Result          | Notes                                 |
| ---------------- | --------------- | ------------------------------------- |
| **Success Rate** | 72.5%           | 58 SUCCESS / 80 total images          |
| **Avg Latency**  | 22.3 sec        | Mean inference time across all images |
| **Throughput**   | 2.69 images/min | Based on average inference time       |
| **Peak RAM**     | 4,773.51 MB     | Observed in IMG_8712.JPG              |
| **Min Latency**  | 8.14 sec        | IMG_8616.JPG (PARSE_PARTIAL)          |
| **Max Latency**  | 39.98 sec       | IMG_8710.JPG (SUCCESS)                |

---

### Failure Analysis

Identified two primary failures:

1. **Data Extraction Failures:** The OCR detected text, but the <span style="padding:2px 4px;border-radius:999px;margin:1px;background:#333;color:#d42432;font-weight:600;">tag parser</span>could not find a specific Country or Material. This suggests the OCR output was <span style="padding:2px 4px;border-radius:999px;margin:1px;background:#333;color:#d9aa59;font-weight:600;">garbage</span> or the tag contained only washing instructions.

---

### Reccomendations:

Optimize the Loop: We can drop latency by running the 5 variants in parallel or training a lightweight classifier to pick the best filter before OCR.

---

### Next Steps

**Implement "Early Exit":** Currently, the system runs all 5 filters even if the first one yields 99%. Adding an exit condition (e.g., if confidence > 85%: return) will likely drop average latency.

**Filter Profiling:** Determine which of the 5 image filters contributes most to success. Such as if "Bilateral Filter" accounts for 50% of the runtime but only 1% of the success, we should remove it.

**Parallelization:** Python's multiprocessing could allow us to run the 5 filters simultaneously, potentially capping latency.

**Test Different CPUs**: Utilizing

# Cache Benchmark Summary

Run settings: 200 runs, concurrency 4.

Key formulas:
- `latency_overhead_ms = avg_embedding_ms + avg_lookup_ms`
- `overall_wrong_response_rate = semantic_false_positive_count / runs`

|            Metric            | No Cache        | Exact           | Semantic + CLIP | Tiered          |                  Notes                 |
|:----------------------------:|-----------------|-----------------|-----------------|-----------------|:--------------------------------------:|
| Success Rate                 | 100%            | 100%            | 100%            | 100%            | 200 / 200 successful runs each         |
| Mean Latency (ms)            | 1706.34         | 877.16          | 703.93          | 457.98          | Tiered fastest overall                 |
| Overall Hit Rate             | 0%              | 62%             | 63%             | 63%             | Semantic and tiered tied on hit rate   |
| Miss Rate                    | 100%            | 38%             | 37%             | 37%             | —                                      |
| Exact Hit Rate / Count       | 0% / 0          | 62% / 124       | 0% / 0          | 60% / 120       | —                                      |
| Semantic Hit Rate / Count    | 0% / 0          | 0% / 0          | 63% / 126       | 3% / 6          | Tiered semantic fallback minimal       |
| Semantic False Positive Rate | N/A             | N/A             | 4.76%           | 100%            | Tiered semantic layer noisy            |
| Overall Wrong Response Rate  | 0%              | 0%              | 3%              | 3%              | Driven by semantic errors              |
| Embedding Cost (ms)          | 0.00            | 0.00            | 262.35          | 114.72          | Semantic overhead                      |
| Lookup Cost (ms)             | 0.00            | 12.23           | 29.61           | 17.11           | Cache search cost                      |
| Latency Overhead (ms)        | 0.00            | 12.23           | 291.96          | 131.83          | —                                      |

Note: All these runs were from COLD starts
