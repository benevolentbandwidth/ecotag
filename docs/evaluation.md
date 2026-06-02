# Evaluation

EcoTag evaluation uses manually labeled ground truth files and a scorer that compares those labels with system output.

## Ground Truth Format

Ground truth files live beside their source image and use the source image name plus `.json.gt`.

```text
cropped_tags/IMG_8592.JPG
cropped_tags/IMG_8592.JPG.json.gt
```

Each ground truth file uses the parsed tag shape returned by the backend. `ocr_text` is kept for traceability, but the scorer ignores OCR text.

```json
{
  "ocr_text": "Made in Vietnam. 100% cotton.",
  "country": "Vietnam",
  "materials": [
    { "fiber": "Cotton", "pct": 100 }
  ],
  "care": {
    "washing": "machine_wash_cold",
    "drying": "line_dry",
    "ironing": "iron_low",
    "dry_cleaning": null
  }
}
```

Missing fields should be explicit: use `null` for missing scalar fields and `[]` for no visible materials.

## Generating Predictions

Start the backend, then capture predictions from the current system.

```bash
python scripts/tag.py "cropped_tags/*.JPG" --json > predictions.json
```

Progress output goes to stderr when `--json` is used, so `predictions.json` remains valid JSON.

## Scoring

Score a batch prediction file against all available `.json.gt` files:

```bash
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-file predictions.json
```

Score a directory of per-image prediction files. By default, the scorer expects files like `IMG_8592.JPG.json`:

```bash
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-dir predictions
```

Self-check the ground truth files. This should produce perfect scores and is useful after editing labels:

```bash
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-dir cropped_tags --prediction-suffix .json.gt
```

The scorer reports per-field precision, recall, and F1 for:

- `country`
- `materials`
- `care.washing`
- `care.drying`
- `care.ironing`
- `care.dry_cleaning`

`NO_TAG_DETECTED` and other error responses are treated as empty parsed output. If the ground truth has visible fields, those become false negatives.

Use `--pct-tolerance N` to allow material percentages to differ by `N` percentage points. Use `--check-sklearn` to compare scalar-field scoring with scikit-learn if it is installed.
