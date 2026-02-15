"""Lightweight FastAPI server for EcoTag scan endpoint"""

import base64
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from mock_response import make_mock_response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EcoTag Mock Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    image_base64: str
    weight_g: float | None = None
    washes_per_month: float | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/scan")
def scan(body: ScanRequest):
    raw_bytes = base64.b64decode(body.image_base64)
    logger.info(f"Received image: {len(raw_bytes)} bytes")
    return make_mock_response()
