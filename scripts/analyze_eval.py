#!/usr/bin/env python3
"""Analyze the EcoTag ground-truth evaluation.

Two questions:
  1. As more ground-truth examples are added, how do the per-field and overall
     precision/recall/F1 scores change for the whole set? (a learning curve)
  2. Are there natural groupings in the data, and do they score similarly?

This builds directly on score_ground_truth.py: it reuses the same normalization
and per-field scoring so the numbers are consistent with that scorer.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import score_ground_truth as sgt  # noqa: E402

GT_SUFFIX = ".json.gt"

# The ten examples that existed before this round of labeling, so the
# deterministic learning curve mirrors the real order they were added in.
ORIGINAL_TEN = {
    "IMG_8583.JPG", "IMG_8588.JPG", "IMG_8590.JPG", "IMG_8591.JPG",
    "IMG_8592.JPG", "IMG_8596.JPG", "IMG_8599.JPG", "IMG_8600.JPG",
    "IMG_8601.JPG", "IMG_8602.JPG",
}

PREMIUM_FIBERS = {"cashmere", "merino", "wool", "silk", "alpaca", "mohair", "angora"}


# ----------------------------------------------------------------------------
# Per-row classifiers (operate on the GT parsed dict)
# ----------------------------------------------------------------------------
def has_country(parsed: dict) -> bool:
    return sgt.normalize_country(parsed.get("country")) is not None


def has_materials(parsed: dict) -> bool:
    return len(sgt.material_items(parsed)) > 0


def has_care(parsed: dict) -> bool:
    care = parsed.get("care") if isinstance(parsed.get("care"), dict) else {}
    return any(sgt.normalize_care(care.get(f)) is not None for f in sgt.CARE_FIELDS)


def content_type(parsed: dict) -> str:
    m, c, o = has_materials(parsed), has_care(parsed), has_country(parsed)
    if m and c:
        return "materials+care"
    if m and not c:
        return "materials_only"
    if c and not m:
        return "care_only"
    if o:
        return "origin_only"
    return "empty"


def material_complexity(parsed: dict) -> str:
    items = sgt.material_items(parsed)
    n = len(items)
    if n == 0:
        return "none"
    fibers = [it["fiber"] for it in items]
    if n >= 4 or len(set(fibers)) < len(fibers):
        return "multi_part"  # duplicate fibers or 4+ entries => garment parts
    if n == 1:
        return "single_fiber"
    return "multi_fiber"


def language_group(parsed: dict) -> str:
    text = (parsed.get("ocr_text") or "").lower()
    origin_markers = ["made in", "fabrique", "fabriqu", "hecho en", "hergestellt",
                      "prodotto", "fabricado", "gemaakt"]
    other_lang_terms = ["coton", "algod", "poliester", "poliéster", "laine",
                        "soie", "seda", "viscosa", "lana", "polyamide", "baumwolle"]
    origin_hits = sum(1 for m in origin_markers if m in text)
    if origin_hits >= 2 or any(t in text for t in other_lang_terms):
        return "multilingual"
    return "monolingual"


def fiber_tier(parsed: dict) -> str:
    fibers = " ".join(it["fiber"] for it in sgt.material_items(parsed))
    return "premium_fiber" if any(k in fibers for k in PREMIUM_FIBERS) else "commodity_or_none"


GROUPINGS = {
    "content_type": content_type,
    "material_complexity": material_complexity,
    "language": language_group,
    "fiber_tier": fiber_tier,
}


# ----------------------------------------------------------------------------
# Scoring helpers
# ----------------------------------------------------------------------------
def score_subset(rows, preds, gt_root: Path, pct_tol: float = 0.0) -> dict:
    return sgt.score_rows(
        rows=rows,
        predictions_by_image=preds,
        pred_root=None,
        gt_root=gt_root,
        gt_suffix=GT_SUFFIX,
        pred_suffix=".json",
        pct_tolerance=pct_tol,
    )


def combine(counts_dicts) -> dict:
    c = sgt.Counts()
    for d in counts_dicts:
        c.tp += d["tp"]
        c.fp += d["fp"]
        c.fn += d["fn"]
    return c.as_dict()


def summary(result: dict) -> dict:
    """Collapse the 6 fields into country / materials / care + overall."""
    fields = result["fields"]
    care = combine([fields[f"care.{f}"] for f in sgt.CARE_FIELDS])
    return {
        "images": result["image_count"],
        "missing": len(result["missing_predictions"]),
        "country": fields["country"],
        "materials": fields["materials"],
        "care": care,
        "overall": result["overall"],
    }


# ----------------------------------------------------------------------------
# Learning curves
# ----------------------------------------------------------------------------
def deterministic_curve(rows, preds, gt_root: Path) -> list[dict]:
    """Original ten first, then the rest in name order; cumulative score."""
    originals = [r for r in rows if r["image"] in ORIGINAL_TEN]
    rest = [r for r in rows if r["image"] not in ORIGINAL_TEN]
    originals.sort(key=lambda r: r["image"])
    rest.sort(key=lambda r: r["image"])
    ordered = originals + rest

    curve = []
    for n in range(1, len(ordered) + 1):
        s = summary(score_subset(ordered[:n], preds, gt_root))
        curve.append({
            "n": n,
            "added": ordered[n - 1]["image"],
            "overall_p": s["overall"]["precision"],
            "overall_r": s["overall"]["recall"],
            "overall_f1": s["overall"]["f1"],
            "country_f1": s["country"]["f1"],
            "materials_f1": s["materials"]["f1"],
            "care_f1": s["care"]["f1"],
        })
    return curve


def montecarlo_curve(rows, preds, gt_root: Path, reps: int, step: int, seed: int) -> list[dict]:
    """Mean +/- std of overall F1 over `reps` random subsets at each size."""
    rng = random.Random(seed)
    n_total = len(rows)
    sizes = list(range(step, n_total, step))
    if not sizes or sizes[-1] != n_total:
        sizes.append(n_total)

    out = []
    for size in sizes:
        f1s, ps, rs = [], [], []
        for _ in range(reps):
            sample = rng.sample(rows, size)
            o = score_subset(sample, preds, gt_root)["overall"]
            f1s.append(o["f1"]); ps.append(o["precision"]); rs.append(o["recall"])
        n = len(f1s)
        mean = sum(f1s) / n
        var = sum((x - mean) ** 2 for x in f1s) / n
        out.append({
            "size": size,
            "f1_mean": round(mean, 4),
            "f1_std": round(var ** 0.5, 4),
            "f1_min": round(min(f1s), 4),
            "f1_max": round(max(f1s), 4),
            "p_mean": round(sum(ps) / n, 4),
            "r_mean": round(sum(rs) / n, 4),
        })
    return out


def grouping_breakdown(rows, preds, gt_root: Path) -> dict:
    out = {}
    for name, fn in GROUPINGS.items():
        buckets: dict[str, list] = {}
        for r in rows:
            buckets.setdefault(fn(r["parsed"]), []).append(r)
        out[name] = {
            group: summary(score_subset(group_rows, preds, gt_root))
            for group, group_rows in sorted(buckets.items())
        }
    return out


# ----------------------------------------------------------------------------
# Printing
# ----------------------------------------------------------------------------
def fmt_prf(d: dict) -> str:
    return f"P {d['precision']:.3f}  R {d['recall']:.3f}  F1 {d['f1']:.3f}"


def print_report(data: dict) -> None:
    print("=" * 72)
    print(f"EVALUATION ANALYSIS  ({data['n_images']} labeled images, "
          f"{data['n_missing']} missing predictions)")
    print("=" * 72)

    print("\n## Whole-set score\n")
    s = data["whole_set"]
    for k in ("country", "materials", "care", "overall"):
        d = s[k]
        print(f"  {k:<10} support={d['support']:<4} {fmt_prf(d)}")

    print("\n## Deterministic learning curve (original 10 first, then numeric)\n")
    print(f"  {'n':>3} {'added':<14} {'ovF1':>6} {'ctryF1':>7} {'matF1':>6} {'careF1':>7}")
    curve = data["deterministic_curve"]
    milestones = {1, 5, 10, 15, 20, 30, 40, 50, 60, 70, len(curve)}
    for row in curve:
        if row["n"] in milestones:
            print(f"  {row['n']:>3} {row['added']:<14} {row['overall_f1']:>6.3f} "
                  f"{row['country_f1']:>7.3f} {row['materials_f1']:>6.3f} {row['care_f1']:>7.3f}")

    print("\n## Monte-Carlo curve (mean overall F1 over random subsets)\n")
    print(f"  {'size':>4} {'F1 mean':>8} {'F1 std':>7} {'F1 min':>7} {'F1 max':>7}")
    for row in data["montecarlo_curve"]:
        print(f"  {row['size']:>4} {row['f1_mean']:>8.3f} {row['f1_std']:>7.3f} "
              f"{row['f1_min']:>7.3f} {row['f1_max']:>7.3f}")

    print("\n## Groupings\n")
    for scheme, groups in data["groupings"].items():
        print(f"  [{scheme}]")
        for group, s in groups.items():
            o = s["overall"]
            print(f"    {group:<18} imgs={s['images']:<3} "
                  f"ovF1={o['f1']:.3f}  ctry={s['country']['f1']:.3f} "
                  f"mat={s['materials']['f1']:.3f} care={s['care']['f1']:.3f}")
        print()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--ground-truth-dir", default="cropped_tags")
    p.add_argument("--predictions-file", required=True)
    p.add_argument("--reps", type=int, default=300, help="Monte-Carlo reps per size")
    p.add_argument("--step", type=int, default=5, help="Monte-Carlo size step")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--pct-tolerance", type=float, default=0.0)
    p.add_argument("--json-out", help="Write full results JSON here")
    args = p.parse_args(argv if argv is not None else sys.argv[1:])

    gt_root = Path(args.ground_truth_dir)
    rows = sgt.load_ground_truths(gt_root, GT_SUFFIX)
    preds = sgt.load_predictions_file(Path(args.predictions_file))

    whole = score_subset(rows, preds, gt_root, args.pct_tolerance)
    data = {
        "n_images": len(rows),
        "n_missing": len(whole["missing_predictions"]),
        "missing_predictions": whole["missing_predictions"],
        "whole_set": summary(whole),
        "deterministic_curve": deterministic_curve(rows, preds, gt_root),
        "montecarlo_curve": montecarlo_curve(rows, preds, gt_root, args.reps, args.step, args.seed),
        "groupings": grouping_breakdown(rows, preds, gt_root),
    }

    print_report(data)
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(f"\nWrote {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
