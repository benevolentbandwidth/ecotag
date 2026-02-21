# API: Tag Extraction Pipeline

## Endpoint

`POST /api/tag`

`POST /api/cache/reset`

Notes:
- The route is defined as `/tag` in `backend/api/tag.js` and mounted at `/api` by `backend/server.js`.
- Content type should be `multipart/form-data`.
- Response JSON shape is unchanged when cache is enabled.
- Cache behavior can be toggled with env vars:
  - `CACHE_ENABLED=1|0` (default `1`)
  - `CACHE_MODE=exact|semantic|tiered` (default `tiered`)
  - `CACHE_SEMANTIC_EMBEDDER=clip|fingerprint` (default `clip`)
  - `CACHE_SEMANTIC_CLIP_MODEL` (default `Xenova/clip-vit-base-patch32`)
  - `CACHE_SEMANTIC_FALLBACK=none|fingerprint` (default `none`)
- `MOCK_OCR=1|0` (default `0`)

`POST /api/cache/reset` clears all local cache entries and returns:

```json
{
  "ok": true,
  "cache_enabled": true,
  "cleared_entries": 123
}
```

The benchmark harness (`backend/benchmarks/vlm_benchmark.js`) calls this endpoint
automatically at the start of each benchmark run.

## Request

### Multipart fields

- `image` (required): image file of a clothing tag (`.jpg`, `.jpeg`, `.png` expected).

## Success Response

### `200 OK`

```json
{
  "parsed": {
    "country": "Portugal",
    "materials": [
      { "fiber": "Cotton", "pct": 70 },
      { "fiber": "Polyester", "pct": 30 }
    ],
    "care": {
      "washing": "machine_wash_cold",
      "drying": "line_dry",
      "ironing": "iron_low",
      "dry_cleaning": null
    }
  },
  "emissions": {
    "total_kgco2e": 0,
    "breakdown": {
      "materials": 0,
      "manufacturing": 0,
      "washing": 0,
      "drying": 0,
      "ironing": 0,
      "dry_cleaning": 0
    },
    "assumptions": {
      "weight_kg": 1,
      "origin": "Portugal",
      "washes_lifetime": 48
    }
  }
}
```

### Response Headers

`POST /api/tag` also returns cache observability headers:

- `X-Cache-Status`: `MISS | HIT_EXACT | HIT_SEMANTIC`
- `X-Cache-Mode`: `exact | semantic | tiered`
- `X-Cache-Embedder`: `clip | fingerprint | fingerprint_fallback | none`
- `X-Cache-Similarity`: semantic similarity score for semantic hits (blank otherwise)
- `X-Cache-Embedding-Ms`: image fingerprint computation time in ms
- `X-Cache-Lookup-Ms`: cache lookup time in ms
- `X-Cache-False-Positive`: `0 | 1 | NA` (`0/1` only on semantic hits in `MOCK_OCR=1`)
- `X-Cache-RSS-MB`: process RSS memory in MB

## Error Shape

All error responses use this stable shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### `400 Bad Request`

Returned when `image` is missing.

```json
{
  "error": {
    "code": "MISSING_IMAGE",
    "message": "An image file is required in field 'image'."
  }
}
```

### `502 Bad Gateway`

Returned when the AI provider call fails.

```json
{
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "Failed to analyze image with AI provider."
  }
}
```

### `500 Internal Server Error`

Returned for unexpected non-provider failures.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unexpected server error."
  }
}
```
