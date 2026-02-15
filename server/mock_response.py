"""Mock response matching the TypeScript ScanResponse type."""


def make_mock_response() -> dict:
    """Return a mock ScanResponse matching the TS types exactly."""
    return {
        "tag": {
            "materials": [
                {"fiber": "cotton", "pct": 95},
                {"fiber": "elastane", "pct": 5},
            ],
            "origin_country": "Portugal",
            "garment_type": "tshirt",
            "weight_g": 200,
            "dye_hint": "reactive",
            "printed": False,
            "care": {
                "wash": "machine wash cold",
                "dry": "tumble dry low",
                "dry_clean": "do not dry clean",
                "washes_per_month": 2,
            },
        },
        "result": {
            "total_kgco2e": 8.2,
            "breakdown": {
                "materials": 3.1,
                "manufacturing": 2.4,
                "washing": 2.7,
                "transport": 0,
            },
            "assumptions": {
                "weight": "200g estimated",
                "washes": "2 per month over 2 years",
            },
        },
    }
