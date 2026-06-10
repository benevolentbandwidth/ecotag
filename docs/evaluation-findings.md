# Evaluation Findings

Results of scoring the EcoTag system against the hand-labeled ground-truth set.
See [evaluation.md](evaluation.md) for the format and how to reproduce these numbers.

## Setup

- **Ground truth:** 76 hand-labeled `cropped_tags/*.JPG.json.gt` files (grown from
  the original 10). Each crop labeled for `country`, `materials` (`{fiber, pct}`),
  and the four `care` fields, marking genuinely-absent fields as `null`/`[]`.
- **System under test:** the backend with `VLM_PROVIDER=google`, `gemini-2.5-pro`
  (cache disabled, so every image is a fresh model call).
- **Scorer:** `scripts/score_ground_truth.py` (per-field precision/recall/F1).
- **`NO_TAG_DETECTED` policy:** when the system returns no tag, its prediction is
  treated as empty — i.e. **a miss (false negative) on every field the ground
  truth has**. 12 of 76 images came back `NO_TAG_DETECTED`; these are recorded
  explicitly in `predictions.complete.json` rather than dropped.

Reproduce:

```bash
python scripts/tag.py "cropped_tags/*.JPG" --json > predictions.json   # 64 ok, 12 NO_TAG
# backfill explicit NO_TAG entries so they score as misses, then analyze:
python scripts/analyze_eval.py --predictions-file predictions.complete.json \
  --json-out docs/eval-results.json
```

## Whole-set score (76 images)

| field | support | precision | recall | F1 |
|-------|--------:|----------:|-------:|----:|
| country   |  40 | 0.952 | 1.000 | **0.976** |
| materials | 136 | 0.977 | 0.926 | **0.951** |
| care      | 145 | 0.915 | 0.745 | **0.821** |
| **overall** | 321 | 0.948 | 0.854 | **0.898** |

`country` and `materials` are strong. `care` is the weak field, and almost
entirely on **recall** (0.745) — the system misses care info that is present,
rather than inventing it.

---

## Q1 — How do the scores change as the ground-truth set grows?

Two views, both in `eval-results.json`.

### Deterministic (original 10 first, then the rest in image order)

| n images | overall F1 | country F1 | materials F1 | care F1 |
|---------:|-----------:|-----------:|-------------:|--------:|
|  5 | 1.000 | 1.000 | 1.000 | 1.000 |
| 10 | 0.971 | 1.000 | 1.000 | 0.941 |
| 20 | 0.931 | 1.000 | 0.959 | 0.880 |
| 30 | 0.911 | 1.000 | 0.935 | 0.854 |
| 50 | 0.881 | 0.983 | 0.940 | 0.783 |
| 76 | 0.898 | 0.976 | 0.951 | 0.821 |

The first 10 examples looked near-perfect (F1 ≈ 0.97–1.0). As more images were
added the estimate **fell and then settled around 0.88–0.90**. The decline is not
noise — the original 10 happened to be clean, complete tags, so a tiny set
*overstated* real performance. Most of the movement is in `care`; `country`
barely moves and `materials` is stable.

### Monte-Carlo (mean overall F1 over 300 random subsets per size)

| subset size | F1 mean | F1 std | F1 min | F1 max |
|------------:|--------:|-------:|-------:|-------:|
|  5 | 0.885 | 0.111 | 0.000 | 1.000 |
| 10 | 0.896 | 0.062 | 0.571 | 1.000 |
| 20 | 0.895 | 0.039 | 0.737 | 0.994 |
| 30 | 0.899 | 0.029 | 0.810 | 0.976 |
| 50 | 0.898 | 0.017 | 0.855 | 0.944 |
| 76 | 0.898 | 0.000 | 0.898 | 0.898 |

**Takeaway:** the *central* estimate is stable (~0.89) at every size — but with
few examples the **variance is huge** (at n=5 a sample can score anywhere from
0.0 to 1.0). Adding ground truth doesn't move the average much; it **collapses
the uncertainty**. By ~30 images the std is ~0.03 and the number is trustworthy;
the original 10 were one lucky high-scoring draw. This is the real value of
growing the set: not a different score, but a *defensible* one.

---

## Q2 — Are there natural groupings, and do they score similarly?

Yes, there are clear groupings, and **no, they do not score similarly.** The
biggest divider is *what the crop contains*.

### By content type

| group | images | overall F1 | country F1 | materials F1 | care F1 |
|-------|-------:|-----------:|-----------:|-------------:|--------:|
| materials + care | 31 | **0.970** | 0.971 | 0.979 | 0.962 |
| materials only    | 24 | 0.893 | 0.966 | 0.919 | — |
| origin only       |  3 | 1.000 | 1.000 | — | — |
| **care only**     | 18 | **0.595** | — | — | 0.528 |

### By material complexity

| group | images | overall F1 |
|-------|-------:|-----------:|
| multi-fiber (one part) | 33 | **0.981** |
| multi-part garment     | 10 | 0.906 |
| single fiber           | 12 | 0.870 |
| no materials on crop    | 21 | **0.622** |

### By language / fiber tier

| group | images | overall F1 |  | group | images | overall F1 |
|-------|-------:|-----------:|--|-------|-------:|-----------:|
| multilingual | 21 | 0.972 |  | premium fiber | 13 | 0.901 |
| monolingual  | 55 | 0.867 |  | commodity/none | 63 | 0.898 |

**Reading the groups:**

- **Full tags (composition + care) score ~0.97; care-only crops score ~0.60.**
  That ~0.37 gap is the whole story.
- **Multilingual tags score *higher* than monolingual** (0.97 vs 0.87) — not
  because extra languages help, but because multilingual tags are almost always
  complete manufacturer tags, while many monolingual crops are bare care snippets.
  The "language" split is really a proxy for the content-type split.
- **Premium vs commodity fiber makes no difference** (0.901 vs 0.898). Fiber value
  is not a difficulty axis; crop *content* is.

---

## The dominant failure mode: `NO_TAG_DETECTED` on care-only crops

All 12 `NO_TAG_DETECTED` images are care-only or single-instruction crops with no
composition or origin structure (e.g. a crop showing only "DRY CLEAN", or a list
of wash/dry/iron lines). They contribute **0 country, 0 materials, but 34 care
false-negatives — ~92% of all care recall loss.**

| | overall F1 | care recall |
|--|-----------:|------------:|
| End-to-end (all 76)      | 0.898 | 0.745 |
| Given a tag was detected (64) | **0.951** | **0.973** |

When the detector *accepts* a crop, care recall is 0.97. The care weakness is
overwhelmingly a **detection-gate problem**, not an extraction problem: the
"is this a tag?" check rejects crops that contain only care instructions.

## Other error patterns (smaller, but real)

- **Hallucination on low-contrast woven labels.** `IMG_8615` (white-on-black
  woven `100% CASHMERE`) was read as `100% acrylic`, country `Taiwan`, plus three
  invented care fields. Hard-to-read crops produce confident wrong answers.
- **Country over-inference from vendor codes.** `IMG_8700` has no "Made in" line;
  the model returned `Vietnam`, evidently inferred from the `VN1068795` code.
  This is the main source of the `country` precision dip (0.952).
- **Enum-granularity near misses.** `machine_wash_gentle` vs `machine_wash_cold`
  (IMG_8691, IMG_8714) and `dry_clean` vs `dry_clean_only` (IMG_8600) — counted as
  full miss + false positive though they are one step apart.
- **Multi-part garments penalize the flat schema.** A 4-part garment that is
  `100% polyester` in every part is labeled as four identical `{polyester,100}`
  entries (faithful to the tag), but the system returns it once, costing 3 false
  negatives (IMG_8561; also IMG_8595, IMG_8584). This is a *representation* limit,
  not a model error.

Material `%` tolerance is not a factor: re-scoring with `--pct-tolerance 2`
leaves materials F1 unchanged (0.951), so material errors are missing/extra
fibers, not rounding.

## Recommendations

1. **Loosen the tag-detection gate** (or skip it when the crop has legible care
   text). This single change recovers most of the care recall (0.745 → ~0.97) and
   lifts overall F1 from 0.898 to ~0.95.
2. **Stop inferring `country` from vendor/RN/style codes** — only emit origin from
   an explicit "Made in / Hecho en / Fabriqué en" phrase.
3. **Add garment-part structure to the schema** (`materials[].part`), as the label
   notes already anticipated, so multi-part garments aren't penalized.
4. **Keep growing ground truth to ~30+ before trusting any single number** — below
   that the score's confidence interval is too wide (std > 0.03).
5. Consider a partial-credit care metric so one-step enum misses
   (`gentle` vs `cold`) don't score the same as a complete miss.
