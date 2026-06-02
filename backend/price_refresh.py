#!/usr/bin/env python3
"""Price-refresh pipeline for sneakers-for-less.

Scans the products table, asks a pluggable PriceSource for a fresh price per
product, writes the updated price back, stamps `last_updated`, and appends a row
to the price-history table. The data source is behind an abstract base class so
it can be swapped (mock today; a real scraper/API later) without touching the
handler.

Schema note: this table has no scalar price field. Live pricing lives in the
`prices` JSON-string field — a list of per-store quotes
[{"store","price","condition","shipping"}, ...]. The product's effective current
price is the lowest store quote (what the app displays). `retail_price` is MSRP
and is intentionally left untouched. The refresh rescales every store quote so
the new lowest equals the freshly sourced price, keeping the array coherent.

Data-source switch (same code runs local + prod):
  - DYNAMODB_ENDPOINT set  -> that endpoint (DynamoDB Local)
  - DYNAMODB_ENDPOINT unset -> real AWS, region us-east-2

Local test (never touches prod):
  DYNAMODB_ENDPOINT=http://localhost:8000 \
    /opt/anaconda3/bin/python3 backend/price_refresh.py
"""
import os
import abc
import json
import random
import logging
from datetime import datetime, timezone

import boto3

PRODUCTS_TABLE = "sneakers-for-less-products"
HISTORY_TABLE = "sneakers-for-less-price-history"
REGION = "us-east-2"

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("price_refresh")


def _client():
    """DynamoDB client. Uses DYNAMODB_ENDPOINT (local) when set, else real AWS."""
    endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    if endpoint:
        return boto3.client(
            "dynamodb", region_name=REGION, endpoint_url=endpoint,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "local"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "local"),
        )
    return boto3.client("dynamodb", region_name=REGION)


def _now_iso():
    """ISO-8601 timestamp in UTC, e.g. 2026-06-01T23:30:00.123456+00:00."""
    return datetime.now(timezone.utc).isoformat()


def _parse_quotes(item):
    """Parse the `prices` JSON-string field into a list of per-store quotes."""
    raw = item.get("prices", {}).get("S")
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return []


def current_price(item):
    """Effective current price = lowest store quote, or None if unavailable."""
    vals = [q["price"] for q in _parse_quotes(item)
            if isinstance(q.get("price"), (int, float))]
    return float(min(vals)) if vals else None


def _rescale_quotes(quotes, old_low, new_low):
    """Scale every store quote by new_low/old_low so the array stays coherent
    and its new minimum equals new_low."""
    if not quotes or not old_low:
        return quotes
    factor = new_low / old_low
    out = []
    for q in quotes:
        q = dict(q)
        if isinstance(q.get("price"), (int, float)):
            q["price"] = round(q["price"] * factor, 2)
        out.append(q)
    return out


# ---- Pluggable price source -------------------------------------------------
class PriceSource(abc.ABC):
    """A source of fresh prices. Implement get_price to plug in a new backend
    (scraper, partner API, ...) without changing the handler.

    is_production gates the safety guard in handler(): a non-production source
    (the default) is refused against real AWS. Real sources must set it True.
    """

    is_production = False

    @abc.abstractmethod
    def get_price(self, product) -> float:
        """Return a fresh price (float) for the given product item."""
        raise NotImplementedError


class MockPriceSource(PriceSource):
    """Synthetic source for local testing. Jitters the current price by a few
    percent, with an occasional larger drop, so price changes and drops are
    visible when testing. Replace with a real source later.

    Non-production: handler() refuses to run this against real AWS."""

    is_production = False

    def __init__(self, seed=None):
        self._rng = random.Random(seed)

    def get_price(self, product) -> float:
        base = current_price(product)
        if base is None:
            base = float(product.get("retail_price", {}).get("N", 100))
        if self._rng.random() < 0.25:          # ~25% chance: bigger drop (sale)
            factor = 1 - self._rng.uniform(0.10, 0.30)
        else:                                  # otherwise: +/- a few percent
            factor = 1 + self._rng.uniform(-0.05, 0.05)
        return round(base * factor, 2)


# ---- Handler ----------------------------------------------------------------
def handler(event, context, source: PriceSource = None):
    """Refresh prices for every product and append to price history.

    source is injectable for tests; defaults to MockPriceSource so this module
    is runnable as-is. Returns a summary dict.
    """
    source = source or MockPriceSource()
    local_endpoint = os.environ.get("DYNAMODB_ENDPOINT")

    # Safety guard: never let a non-production source write to real AWS.
    if not getattr(source, "is_production", False) and not local_endpoint:
        raise RuntimeError(
            f"Refusing to run: non-production price source "
            f"({type(source).__name__}) is targeting real AWS because "
            f"DYNAMODB_ENDPOINT is unset. Set DYNAMODB_ENDPOINT "
            f"(e.g. http://localhost:8000) to run locally, or use a "
            f"production price source to write to AWS."
        )

    db = _client()
    endpoint = local_endpoint or f"AWS default ({REGION})"
    log.info("Price refresh starting (endpoint: %s, source: %s)",
             endpoint, type(source).__name__)

    scanned = updated = drops = 0
    paginator = db.get_paginator("scan")
    for page in paginator.paginate(TableName=PRODUCTS_TABLE):
        for item in page["Items"]:
            scanned += 1
            pid = item["id"]["S"]
            old_low = current_price(item)
            new_low = source.get_price(item)
            quotes = _rescale_quotes(_parse_quotes(item), old_low, new_low)
            ts = _now_iso()

            db.update_item(
                TableName=PRODUCTS_TABLE,
                Key={"id": {"S": pid}},
                UpdateExpression="SET prices = :p, last_updated = :u",
                ExpressionAttributeValues={
                    ":p": {"S": json.dumps(quotes)},
                    ":u": {"S": ts},
                },
            )
            db.put_item(
                TableName=HISTORY_TABLE,
                Item={"id": {"S": pid}, "ts": {"S": ts}, "price": {"N": str(new_low)}},
            )
            updated += 1
            if old_low is not None and new_low < old_low:
                drops += 1
                log.debug("drop: %s %.2f -> %.2f", pid, old_low, new_low)

    log.info("Price refresh done: %d scanned, %d updated, %d drops detected",
             scanned, updated, drops)
    return {"scanned": scanned, "updated": updated, "drops": drops}


if __name__ == "__main__":
    # Local is the easy, safe default: target DynamoDB Local unless the caller
    # explicitly opts into another endpoint. Any prod write requires setting
    # DYNAMODB_ENDPOINT to a real AWS target AND a production price source.
    os.environ.setdefault("DYNAMODB_ENDPOINT", "http://localhost:8000")
    handler({}, None)
