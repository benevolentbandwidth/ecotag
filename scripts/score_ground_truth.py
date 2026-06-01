#!/usr/bin/env python3
"""Score EcoTag parsed tag output against .json.gt ground truth files."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


CARE_FIELDS = ("washing", "drying", "ironing", "dry_cleaning")
SCORED_FIELDS = ("country", "materials", *tuple(f"care.{field}" for field in CARE_FIELDS))
MISSING_LABEL = "__missing__"


@dataclass
class Counts:
    tp: int = 0
    fp: int = 0
    fn: int = 0

    def add(self, other: "Counts") -> None:
        self.tp += other.tp
        self.fp += other.fp
        self.fn += other.fn

    @property
    def precision(self) -> float:
        denom = self.tp + self.fp
        return self.tp / denom if denom else 0.0

    @property
    def recall(self) -> float:
        denom = self.tp + self.fn
        return self.tp / denom if denom else 0.0

    @property
    def f1(self) -> float:
        denom = self.precision + self.recall
        return (2 * self.precision * self.recall / denom) if denom else 0.0

    @property
    def support(self) -> int:
        return self.tp + self.fn

    def as_dict(self) -> dict[str, int | float]:
        return {
            "tp": self.tp,
            "fp": self.fp,
            "fn": self.fn,
            "support": self.support,
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
        }


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path}: invalid JSON: {exc}") from exc


def empty_parsed() -> dict[str, Any]:
    return {
        "ocr_text": "",
        "country": None,
        "materials": [],
        "care": {field: None for field in CARE_FIELDS},
    }


def extract_parsed(payload: Any) -> dict[str, Any]:
    """Accept direct parsed JSON, API responses, tag.py rows, and error bodies."""
    if not isinstance(payload, dict):
        return empty_parsed()

    if "result" in payload:
        return extract_parsed(payload["result"])

    if "parsed" in payload:
        parsed = payload["parsed"]
        return parsed if isinstance(parsed, dict) else empty_parsed()

    if "error" in payload:
        return empty_parsed()

    if any(key in payload for key in ("country", "materials", "care", "ocr_text")):
        return payload

    return empty_parsed()


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    if text in {"null", "none", "unknown", "n/a", "na", "-", "--"}:
        return None
    text = text.replace("_", " ")
    text = re.sub(r"[^\w\s./-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


COUNTRY_ALIASES = {
    "prc": "china",
    "p.r.c": "china",
    "usa": "united states",
    "u.s.a": "united states",
    "viet nam": "vietnam",
}


def normalize_country(value: Any) -> str | None:
    text = normalize_text(value)
    if text is None:
        return None

    for prefix in (
        "made in ",
        "manufactured in ",
        "product of ",
        "hecho en ",
        "fabrique en ",
        "fabricado en ",
        "hergestellt in ",
    ):
        if text.startswith(prefix):
            text = text[len(prefix) :].strip()
            break

    return COUNTRY_ALIASES.get(text, text)


def normalize_pct(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(float(value)) else None

    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    if not match:
        return None
    pct = float(match.group(0))
    return pct if math.isfinite(pct) else None


def normalize_fiber(value: Any) -> str | None:
    text = normalize_text(value)
    if text is None:
        return None

    text = re.sub(r"\b(us|gb|body|shell|trim|trimming|lining|exclusive|of)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    fiber_aliases = (
        ("merino", "merino"),
        ("cashmere", "cashmere"),
        ("organic cotton", "organic cotton"),
        ("pima cotton", "pima cotton"),
        ("cotton", "cotton"),
        ("coton", "cotton"),
        ("algodon", "cotton"),
        ("polyester", "polyester"),
        ("polyamide", "nylon"),
        ("nylon", "nylon"),
        ("viscose", "viscose"),
        ("rayon", "rayon"),
        ("modal", "modal"),
        ("lyocell", "lyocell"),
        ("tencel", "tencel"),
        ("elastane", "elastane"),
        ("elasthane", "elastane"),
        ("spandex", "elastane"),
        ("wool", "wool"),
        ("silk", "silk"),
        ("linen", "linen"),
        ("acrylic", "acrylic"),
    )
    for needle, canonical in fiber_aliases:
        if needle in text:
            return canonical
    return text


def normalize_care(value: Any) -> str | None:
    text = normalize_text(value)
    if text is None:
        return None

    compact = text.replace("-", " ").replace("/", " ")
    compact = re.sub(r"\s+", " ", compact).strip()
    enum = compact.replace(" ", "_")

    aliases = {
        "machine_wash_cold": "machine_wash_cold",
        "machine_wash_warm": "machine_wash_warm",
        "machine_wash_hot": "machine_wash_hot",
        "machine_wash_gentle": "machine_wash_gentle",
        "gentle_cycle": "machine_wash_gentle",
        "hand_wash_cold": "hand_wash_cold",
        "hand_wash_warm": "hand_wash_warm",
        "tumble_dry_low": "tumble_dry_low",
        "tumble_dry_medium": "tumble_dry_medium",
        "tumble_dry_high": "tumble_dry_high",
        "lay_flat_to_dry": "lay_flat_to_dry",
        "dry_flat": "lay_flat_to_dry",
        "line_dry": "line_dry",
        "do_not_tumble_dry": "do_not_tumble_dry",
        "iron_low": "iron_low",
        "cool_iron": "iron_low",
        "iron_medium": "iron_medium",
        "warm_iron": "iron_medium",
        "iron_high": "iron_high",
        "do_not_iron": "do_not_iron",
        "dry_clean": "dry_clean",
        "professional_clean": "dry_clean",
        "dry_clean_only": "dry_clean_only",
    }
    return aliases.get(enum, enum)


def material_items(parsed: dict[str, Any]) -> list[dict[str, float | str | None]]:
    raw_materials = parsed.get("materials")
    if not isinstance(raw_materials, list):
        return []

    items = []
    for item in raw_materials:
        if not isinstance(item, dict):
            continue
        fiber = normalize_fiber(
            item.get("fiber")
            or item.get("material")
            or item.get("name")
        )
        if fiber is None:
            continue
        pct = normalize_pct(
            item.get("pct")
            if "pct" in item
            else item.get("percent", item.get("percentage"))
        )
        items.append({"fiber": fiber, "pct": pct})
    return items


def update_scalar(counts: Counts, truth: str | None, pred: str | None) -> None:
    if truth is None and pred is None:
        return
    if truth is not None and pred is not None and truth == pred:
        counts.tp += 1
        return
    if pred is not None:
        counts.fp += 1
    if truth is not None:
        counts.fn += 1


def materials_match(
    truth: dict[str, float | str | None],
    pred: dict[str, float | str | None],
    pct_tolerance: float,
) -> bool:
    if truth["fiber"] != pred["fiber"]:
        return False
    truth_pct = truth["pct"]
    pred_pct = pred["pct"]
    if truth_pct is None or pred_pct is None:
        return truth_pct is None and pred_pct is None
    return abs(float(truth_pct) - float(pred_pct)) <= pct_tolerance


def update_materials(
    counts: Counts,
    truth_items: list[dict[str, float | str | None]],
    pred_items: list[dict[str, float | str | None]],
    pct_tolerance: float,
) -> None:
    matched_pred_indexes: set[int] = set()

    for truth in truth_items:
        best_index = None
        best_delta = math.inf
        for idx, pred in enumerate(pred_items):
            if idx in matched_pred_indexes:
                continue
            if not materials_match(truth, pred, pct_tolerance):
                continue
            truth_pct = truth["pct"]
            pred_pct = pred["pct"]
            delta = (
                abs(float(truth_pct) - float(pred_pct))
                if truth_pct is not None and pred_pct is not None
                else 0
            )
            if delta < best_delta:
                best_delta = delta
                best_index = idx

        if best_index is None:
            counts.fn += 1
        else:
            counts.tp += 1
            matched_pred_indexes.add(best_index)

    counts.fp += len(pred_items) - len(matched_pred_indexes)


def load_ground_truths(gt_root: Path, suffix: str) -> list[dict[str, Any]]:
    gt_paths = sorted(gt_root.rglob(f"*{suffix}"))
    if not gt_paths:
        raise SystemExit(f"No ground truth files matching '*{suffix}' found in {gt_root}")

    rows = []
    for gt_path in gt_paths:
        relative = gt_path.relative_to(gt_root)
        relative_image = str(relative)[: -len(suffix)]
        rows.append(
            {
                "image": Path(relative_image).name,
                "relative_image": relative_image,
                "path": gt_path,
                "parsed": extract_parsed(load_json(gt_path)),
            }
        )
    return rows


def load_predictions_file(path: Path) -> dict[str, dict[str, Any]]:
    payload = load_json(path)
    predictions: dict[str, dict[str, Any]] = {}

    def add_row(row: Any) -> None:
        if not isinstance(row, dict):
            return
        file_value = row.get("file") or row.get("image") or row.get("source_image")
        if file_value is None:
            return
        image_name = Path(str(file_value)).name
        predictions[image_name] = extract_parsed(row)

    if isinstance(payload, list):
        for row in payload:
            add_row(row)
    elif isinstance(payload, dict):
        if isinstance(payload.get("results"), list):
            for row in payload["results"]:
                add_row(row)
        elif any(key in payload for key in ("file", "image", "source_image")):
            add_row(payload)
        else:
            for key, value in payload.items():
                if isinstance(value, dict):
                    predictions[Path(str(key)).name] = extract_parsed(value)

    if not predictions:
        raise SystemExit(f"{path}: no predictions found")
    return predictions


def prediction_from_dir(
    gt_root: Path,
    pred_root: Path,
    gt_path: Path,
    gt_suffix: str,
    pred_suffix: str,
) -> tuple[dict[str, Any], Path | None]:
    relative_gt = gt_path.relative_to(gt_root)
    relative_prediction = Path(str(relative_gt)[: -len(gt_suffix)] + pred_suffix)
    candidates = [
        pred_root / relative_prediction,
        pred_root / (Path(str(relative_prediction)).name),
    ]

    for candidate in candidates:
        if candidate.exists():
            return extract_parsed(load_json(candidate)), candidate
    return empty_parsed(), None


def score_rows(
    rows: list[dict[str, Any]],
    predictions_by_image: dict[str, dict[str, Any]] | None,
    pred_root: Path | None,
    gt_root: Path,
    gt_suffix: str,
    pred_suffix: str,
    pct_tolerance: float,
) -> dict[str, Any]:
    counts = {field: Counts() for field in SCORED_FIELDS}
    scalar_pairs: dict[str, list[tuple[str | None, str | None]]] = {
        "country": [],
        **{f"care.{field}": [] for field in CARE_FIELDS},
    }
    missing_predictions: list[str] = []

    for row in rows:
        truth = row["parsed"]
        if predictions_by_image is not None:
            pred = predictions_by_image.get(row["image"], empty_parsed())
            if row["image"] not in predictions_by_image:
                missing_predictions.append(row["relative_image"])
        else:
            pred, pred_path = prediction_from_dir(
                gt_root,
                pred_root or Path("."),
                row["path"],
                gt_suffix,
                pred_suffix,
            )
            if pred_path is None:
                missing_predictions.append(row["relative_image"])

        truth_country = normalize_country(truth.get("country"))
        pred_country = normalize_country(pred.get("country"))
        update_scalar(counts["country"], truth_country, pred_country)
        scalar_pairs["country"].append((truth_country, pred_country))

        update_materials(
            counts["materials"],
            material_items(truth),
            material_items(pred),
            pct_tolerance,
        )

        truth_care = truth.get("care") if isinstance(truth.get("care"), dict) else {}
        pred_care = pred.get("care") if isinstance(pred.get("care"), dict) else {}
        for field in CARE_FIELDS:
            field_name = f"care.{field}"
            truth_value = normalize_care(truth_care.get(field))
            pred_value = normalize_care(pred_care.get(field))
            update_scalar(counts[field_name], truth_value, pred_value)
            scalar_pairs[field_name].append((truth_value, pred_value))

    overall = Counts()
    for field_counts in counts.values():
        overall.add(field_counts)

    return {
        "image_count": len(rows),
        "missing_predictions": missing_predictions,
        "fields": {field: counts[field].as_dict() for field in SCORED_FIELDS},
        "overall": overall.as_dict(),
        "scalar_pairs": scalar_pairs,
    }


def sklearn_check(scalar_pairs: dict[str, list[tuple[str | None, str | None]]]) -> dict[str, Any]:
    try:
        from sklearn.metrics import precision_recall_fscore_support
    except ImportError:
        return {
            "available": False,
            "message": "scikit-learn is not installed; install it to use --check-sklearn.",
        }

    results: dict[str, Any] = {"available": True, "fields": {}}
    for field, pairs in scalar_pairs.items():
        labels = sorted(
            {
                value
                for truth, pred in pairs
                for value in (truth, pred)
                if value is not None
            }
        )
        if not labels:
            continue
        y_true = [truth if truth is not None else MISSING_LABEL for truth, _ in pairs]
        y_pred = [pred if pred is not None else MISSING_LABEL for _, pred in pairs]
        precision, recall, f1, _support = precision_recall_fscore_support(
            y_true,
            y_pred,
            labels=labels,
            average="micro",
            zero_division=0,
        )
        results["fields"][field] = {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
        }
    return results


def print_table(result: dict[str, Any]) -> None:
    print(f"Scored images: {result['image_count']}")
    print(f"Missing predictions: {len(result['missing_predictions'])}")
    print()
    print(f"{'field':<22} {'tp':>4} {'fp':>4} {'fn':>4} {'prec':>7} {'recall':>7} {'f1':>7}")
    print("-" * 62)
    for field in SCORED_FIELDS:
        row = result["fields"][field]
        print(
            f"{field:<22} {row['tp']:>4} {row['fp']:>4} {row['fn']:>4} "
            f"{row['precision']:>7.3f} {row['recall']:>7.3f} {row['f1']:>7.3f}"
        )
    row = result["overall"]
    print("-" * 62)
    print(
        f"{'overall':<22} {row['tp']:>4} {row['fp']:>4} {row['fn']:>4} "
        f"{row['precision']:>7.3f} {row['recall']:>7.3f} {row['f1']:>7.3f}"
    )

    if result["missing_predictions"]:
        print()
        print("Missing prediction files:")
        for image in result["missing_predictions"]:
            print(f"  {image}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare EcoTag system outputs with .json.gt ground truth files."
    )
    parser.add_argument("--ground-truth-dir", default="cropped_tags")
    parser.add_argument("--ground-truth-suffix", default=".json.gt")

    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--predictions-dir")
    source.add_argument("--predictions-file")

    parser.add_argument("--prediction-suffix", default=".json")
    parser.add_argument(
        "--pct-tolerance",
        type=float,
        default=0.0,
        help="Allowed absolute percentage-point difference for material pct matches.",
    )
    parser.add_argument("--json", action="store_true", dest="json_output")
    parser.add_argument("--check-sklearn", action="store_true")
    parser.add_argument("--fail-on-missing", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    gt_root = Path(args.ground_truth_dir)
    rows = load_ground_truths(gt_root, args.ground_truth_suffix)

    predictions_by_image = None
    pred_root = None
    if args.predictions_file:
        predictions_by_image = load_predictions_file(Path(args.predictions_file))
    else:
        pred_root = Path(args.predictions_dir)

    result = score_rows(
        rows=rows,
        predictions_by_image=predictions_by_image,
        pred_root=pred_root,
        gt_root=gt_root,
        gt_suffix=args.ground_truth_suffix,
        pred_suffix=args.prediction_suffix,
        pct_tolerance=args.pct_tolerance,
    )

    if args.check_sklearn:
        result["sklearn_check"] = sklearn_check(result["scalar_pairs"])

    result.pop("scalar_pairs", None)

    if args.json_output:
        print(json.dumps(result, indent=2))
    else:
        print_table(result)
        if args.check_sklearn:
            print()
            print("sklearn check:")
            print(json.dumps(result["sklearn_check"], indent=2))

    if args.fail_on_missing and result["missing_predictions"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
