# EcoTag: Estimating Garment Carbon Footprint from Clothing Labels

## Overview

This project estimates the carbon footprint of clothing items by analyzing garment care tags using Optical Character Recognition (OCR). The OCR model extracts information about materials, manufacturing origin, and care instructions from clothing labels to calculate total CO₂ emissions across a garment's lifecycle.

## To Run Code

### Prerequisites

- Python 3.8+
- pip

### Dependencies

Install required packages:

```bash
pip install easyocr opencv-python numpy pandas matplotlib seaborn tqdm codecarbon pillow pytesseract paddleocr
```

### Usage

To see the CO2 emissions of a single tag image:

```bash
cd code
python demo.py --image ../cropped_tags/[IMG_NAME].JPG
```

Example output:

```json
=== PARSED TAG ===
{
  "materials": [
    {"fiber": "cotton", "pct": 100.0}
  ],
  "origin": "guatemala",
  "care": {
    "wash": "cold",
    "dry": "tumble",
    "dry_clean": "none",
    "washes_per_month": 2.0
  }
}

=== RESULTS ===
{
  "total": 12.456,
  "breakdown": {
    "materials": 5.230,
    "manufacturing": 0.500,
    "washing": 6.726
  },
  "assumptions": {
    "weight_g": "1000",
    "origin": "guatemala",
    "washes_lifetime": "48"
  }
}
```

## CO₂ Emission Factors

The calculation is based on emission factors in `co2factors.py`:

- **Materials**: kg CO₂/kg for cotton, polyester, wool, etc.
- **Manufacturing**: kg CO₂/kg by country
- **Washing**: kg CO₂ per wash cycle (cold, warm, hot)
- **Drying**: kg CO₂ per tumble dry cycle

Default assumptions:

- Garment lifetime: 2 years
- Washes per month: 2
- Total washes: 48

CO₂ emission factors based on apparel lifecycle assessment literature.

## Carbon Tracking

This project uses CodeCarbon to track computational emissions during OCR processing. Logs are saved to `codecarbon_logs/emissions.csv`.

## Run Mobile Against Local Backend

1. Start backend API:

```bash
cd backend
node server.js
```

2. Configure mobile API base URL (optional override):

- Default in mobile is `http://localhost:3001`.
- You can override with an env var:

```bash
cd mobile
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 npm run start
```

3. Simulator vs real device:

- iOS Simulator can usually use `http://localhost:3001`.
- Android Emulator usually needs `http://10.0.2.2:3001`.
- Real device needs your machine LAN IP (for example `http://192.168.1.25:3001`).

4. API behavior:

- Mobile uploads images to `POST /api/tag` as `multipart/form-data` with field `image`.
- If backend AI provider/API key is missing, backend may return `502` (`UPSTREAM_ERROR`).

## Test Semantic Cache Without API Keys

You can test cache hit rate, false positives, and cache overhead without OpenAI keys by enabling mock OCR mode.

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Start backend in mock+cache mode:

```bash
MOCK_OCR=1 CACHE_ENABLED=1 node server.js
```

3. Run benchmark against local image set:

```bash
node benchmarks/vlm_benchmark.js \
  --url http://localhost:3001/api/tag \
  --images-dir ../cropped_tags \
  --runs 200 \
  --concurrency 4
```

The benchmark script now resets backend cache automatically at the start of each run
by calling `POST /api/cache/reset`, so repeating the same benchmark command starts
from a cold cache each time.

Useful cache env vars:

- `CACHE_SIMILARITY_THRESHOLD` (default `0.90`)
- `CACHE_DB_PATH` (default `./cache/ecotag-cache.sqlite`)
- `CACHE_MAX_ENTRIES` (default `5000`)
- `CACHE_FINGERPRINT_VERSION` (default `v1`)
- `CACHE_MODE` (`exact`, `semantic`, `tiered`; default `tiered`)
- `CACHE_SEMANTIC_EMBEDDER` (`clip` or `fingerprint`; default `clip`)
- `CACHE_SEMANTIC_CLIP_MODEL` (default `Xenova/clip-vit-base-patch32`)
- `CACHE_SEMANTIC_FALLBACK` (`none` or `fingerprint`; default `none`)

Benchmark commands by mode:

```bash
# Baseline (cache off)
MOCK_OCR=1 CACHE_ENABLED=0 node server.js

# Exact-only cache
MOCK_OCR=1 CACHE_ENABLED=1 CACHE_MODE=exact node server.js

# Semantic-only cache
MOCK_OCR=1 CACHE_ENABLED=1 CACHE_MODE=semantic node server.js

# Tiered cache (exact + semantic)
MOCK_OCR=1 CACHE_ENABLED=1 CACHE_MODE=tiered node server.js
```
