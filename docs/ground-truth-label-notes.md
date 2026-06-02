# Ground Truth Label Notes

Manual review of a small sample from `cropped_tags/`, based on the workflow in `read.txt`.

## Image Notes

- `cropped_tags/IMG_8592.JPG`
  - Origin: Made in Vietnam.
  - Materials: `US/GB: 100% Merino extra fine wool`.
  - Care: has both symbols and text. Visible symbols include wash 30, bleach triangle, do-not-tumble-dry style crossed square, low/one-dot iron, dry flat, and professional clean `P`.
  - Text care says machine wash cold gentle cycle, close fasteners, wash in mesh bag, use mild detergent, wash separately, non-chlorine bleach when needed, reshape and dry flat, cool iron.
  - Important edge case: material line has locale prefix `US/GB`; care has duplicated symbol + text information.

- `cropped_tags/IMG_8583.JPG`
  - Origin: Made in China.
  - Materials: no composition visible in this crop.
  - Care: hand wash cold; do not bleach; reshape while damp; dry flat; cool iron only if needed; dry clean; laver a la main text repeats in French.
  - Important edge case: multilingual care text and missing/hidden material composition.

- `cropped_tags/IMG_8591.JPG`
  - Origin: Made in Philippines, repeated in several languages.
  - Materials: visible composition includes 65% polyester, 33% viscose, 2% elastane.
  - Care: machine wash cold with like colors, non-chlorine bleach only, tumble dry low, iron on lowest setting.
  - Important edge case: same origin appears in many languages; material names are repeated in multiple languages.

- `cropped_tags/IMG_8590.JPG`
  - Origin: Made in Cambodia.
  - Materials: body is 80% cotton / 20% polyester; trim is 98% cotton / 2% spandex. Trimming and decoration excluded.
  - Care: not visible in this crop.
  - Important edge case: multiple garment parts need separate material compositions.

- `cropped_tags/IMG_8588.JPG`
  - Origin: Made in Peru.
  - Materials: visible composition includes 52% modal, 24% polyester, 24% cotton.
  - Care: machine wash cold with like colors, non-chlorine bleach only, tumble dry low, iron on lowest setting.
  - Important edge case: multilingual origin and material names; image partly cut off on the right.

- `cropped_tags/IMG_8602.JPG`
  - Origin: not visible in this crop.
  - Materials: 49% rayon, 31% polyester, 20% nylon.
  - Care: not visible.
  - Important edge case: material-only crop.

- `cropped_tags/IMG_8601.JPG`
  - Origin: not visible in this crop.
  - Materials: 100% cashmere.
  - Care: visible care says dry clean or hand wash cold, do not twist or wring, do not bleach, reshape and lay flat to dry, warm iron if needed.
  - Important edge case: partial crop with premium fiber and multiple care prohibitions.

- `cropped_tags/IMG_8600.JPG`
  - Origin: Made in Vietnam.
  - Materials: 100% cotton.
  - Care: visible care includes dry clean, made in Vietnam, and partial care text below.
  - Important edge case: likely adjacent/overlapping crop from the same physical tag as another image; labels may need grouping by garment or tag side, not just image.

- `cropped_tags/IMG_8599.JPG`
  - Origin: not visible in this crop.
  - Materials: 100% cashmere.
  - Care: dry clean or hand wash cold, do not twist/wring, do not bleach, reshape and lay flat to dry.
  - Important edge case: duplicate or near-duplicate of another cashmere crop, useful for checking model consistency across similar crops.

- `cropped_tags/IMG_8596.JPG`
  - Origin: Made in China.
  - Materials: visible composition includes 52% viscose, 36% nylon, 12% polyester.
  - Care: machine wash cold with like colors, only non-chlorine bleach when needed, tumble dry low, warm iron if necessary.
  - Important edge case: material composition and care share one crop, but the top line is cut off, so partial OCR should not be treated as a full label.

## Schema Fields That Look Necessary

- `source_image`: file name or image id.
- `origin_country`: normalized country, plus optional raw text.
- `materials`: list of garment parts. Each part should have `part_name`, `fibers`, and `raw_text`.
- `fibers`: list of `{ fiber, percent }`, because a single garment can contain several blends.
- `exclusions`: text like "exclusive of trimming and decoration".
- `care`: structured fields for washing, drying, ironing, bleaching, dry cleaning, and extra instructions.
- `care_symbols`: list of detected visual symbols with normalized meaning and optional confidence.
- `languages`: languages observed on the tag.
- `raw_text`: OCR transcription for traceability.
- `crop_quality_notes`: blur, cutoff text, missing fields, duplicated languages, symbol-only fields.
- `related_images`: optional list of images that appear to be adjacent crops or duplicates from the same garment/tag.

## Early Takeaways

- Ground truth should preserve both normalized values and raw text. The normalized values are needed for scoring, while raw text helps debug model mistakes.
- Materials need garment-part support, not just one flat material list.
- Care should support both symbol-derived and text-derived evidence.
- Missing fields should be explicit. Several crops show only materials or only care/origin.
