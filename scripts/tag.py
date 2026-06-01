#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///
"""Submit clothing tag images to the ecotag API."""

import argparse
import glob
import json
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests is required: pip install requests")

DEFAULT_URL = "http://localhost:3001/api/tag"


def submit(image_path: Path, base_url: str) -> dict:
    with image_path.open("rb") as f:
        resp = requests.post(base_url, files={"image": (image_path.name, f)}, timeout=60)
    resp.raise_for_status()
    return resp.json(), resp.headers


def format_result(data: dict, headers) -> str:
    parsed = data.get("parsed", {})
    emissions = data.get("emissions", {})

    lines = []

    country = parsed.get("country") or "—"
    lines.append(f"  Country:    {country}")

    materials = parsed.get("materials") or []
    if materials:
        mat_str = ", ".join(f"{m['pct']}% {m['fiber']}" for m in materials)
    else:
        mat_str = "—"
    lines.append(f"  Materials:  {mat_str}")

    care = parsed.get("care") or {}
    care_str = "  |  ".join(
        f"{k}: {v}" for k, v in care.items() if v
    ) or "—"
    lines.append(f"  Care:       {care_str}")

    total = emissions.get("total_kgco2e")
    if total is not None:
        lines.append(f"  CO₂e:       {total} kg")

    cache_status = headers.get("X-Cache-Status", "")
    if cache_status:
        lines.append(f"  Cache:      {cache_status}")

    return "\n".join(lines)


def expand_paths(patterns: list[str]) -> list[Path]:
    paths = []
    for pattern in patterns:
        expanded = glob.glob(pattern, recursive=True)
        if expanded:
            paths.extend(Path(p) for p in expanded)
        else:
            paths.append(Path(pattern))
    return paths


def main():
    parser = argparse.ArgumentParser(
        description="Submit clothing tag images to the ecotag API.",
        epilog="Examples:\n"
               "  %(prog)s tag.jpg\n"
               "  %(prog)s tags/*.jpg\n"
               "  %(prog)s img1.png img2.png --url http://localhost:3001/api/tag\n"
               "  %(prog)s tags/**/*.jpg --json",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("images", nargs="+", help="Image file(s) or glob pattern(s)")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"API endpoint (default: {DEFAULT_URL})")
    parser.add_argument("--json", dest="json_output", action="store_true", help="Print raw JSON responses")
    args = parser.parse_args()

    paths = expand_paths(args.images)
    if not paths:
        sys.exit("No image files found.")

    errors = 0
    results = []

    for path in paths:
        if not path.exists():
            print(f"[SKIP] {path}: file not found", file=sys.stderr)
            errors += 1
            continue
        if not path.is_file():
            print(f"[SKIP] {path}: not a file", file=sys.stderr)
            errors += 1
            continue

        progress_stream = sys.stderr if args.json_output else sys.stdout
        print(f"{path}", end=" ... ", flush=True, file=progress_stream)
        try:
            data, headers = submit(path, args.url)
            print("ok", file=progress_stream)
            if args.json_output:
                results.append({"file": str(path), "result": data})
            else:
                print(format_result(data, headers))
        except requests.HTTPError as e:
            print(f"HTTP {e.response.status_code}", file=progress_stream)
            try:
                err = e.response.json()
                print(f"  Error: {err['error']['code']}: {err['error']['message']}", file=sys.stderr)
            except Exception:
                print(f"  {e}", file=sys.stderr)
            errors += 1
        except requests.ConnectionError:
            print("connection refused", file=progress_stream)
            print(f"  Is the backend running at {args.url}?", file=sys.stderr)
            errors += 1
        except Exception as e:
            print(f"failed", file=progress_stream)
            print(f"  {e}", file=sys.stderr)
            errors += 1

    if args.json_output and results:
        print(json.dumps(results if len(results) > 1 else results[0], indent=2))

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
