# scripts

## start-backend.sh

Starts the Express backend locally.

```bash
./scripts/start-backend.sh
```

- Requires `backend/.env` with `OPENAI_API_KEY` set (copy from `backend/.env.example`)
- Auto-installs `node_modules` on first run
- Starts on port 3001 by default; override with `PORT=<n>`

---

## tag.py

Submits clothing tag images to the running API and prints extracted data.

Requires `pip install requests`.

```bash
# single image
python scripts/tag.py path/to/tag.jpg

# glob batch (quote the pattern so the shell doesn't expand it)
python scripts/tag.py 'cropped_tags/*.jpg'

# multiple explicit files
python scripts/tag.py img1.png img2.png

# raw JSON output (pipeable to jq)
python scripts/tag.py 'cropped_tags/*.jpg' --json | jq '.[] | .result.emissions.total_kgco2e'

# different server
python scripts/tag.py tag.jpg --url http://staging:3001/api/tag
```

Default output per image shows country, materials, care instructions, CO₂e, and cache status. Exit code is non-zero if any image failed.

---

## score_ground_truth.py

Compares `.json.gt` ground truth files with system predictions and reports per-field precision, recall, and F1.

```bash
# score a batch JSON file from tag.py
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-file predictions.json

# score per-image prediction files named like IMG_8592.JPG.json
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-dir predictions

# self-check ground truth labels after editing
python scripts/score_ground_truth.py --ground-truth-dir cropped_tags --predictions-dir cropped_tags --prediction-suffix .json.gt
```

The scorer ignores `ocr_text` and scores `country`, `materials`, and each structured care field. See `docs/evaluation.md` for the full workflow.
