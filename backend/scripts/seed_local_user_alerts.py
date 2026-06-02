#!/usr/bin/env python3
"""Seed a test user + price alert into DynamoDB Local for the alert checker.

Local-only: targets DYNAMODB_ENDPOINT (default http://localhost:8000) with local
dummy creds, so it can never touch production. Creates the users table if missing
(PK email [S], PAY_PER_REQUEST) and inserts one user with emailNotifications=true
and a single alert whose targetPrice is set above a real product's current lowest
price, so the alert checker fires on the first run.

Requires the products table to exist locally (run init_local_db.py first).
  Usage: python backend/scripts/seed_local_user_alerts.py
"""
import os
import json
import boto3
from datetime import datetime, timezone

USERS_TABLE = "sneakers-for-less-users"
PRODUCTS_TABLE = "sneakers-for-less-products"
REGION = "us-east-2"
ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:8000")
TEST_EMAIL = "alert-tester@example.com"

db = boto3.client("dynamodb", region_name=REGION, endpoint_url=ENDPOINT,
                  aws_access_key_id="local", aws_secret_access_key="local")

# --- users table -------------------------------------------------------------
if USERS_TABLE in db.list_tables()["TableNames"]:
    print(f"Local table {USERS_TABLE} already exists")
else:
    db.create_table(
        TableName=USERS_TABLE,
        KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
        AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    db.get_waiter("table_exists").wait(TableName=USERS_TABLE)
    print(f"Created local table {USERS_TABLE}")


def lowest_of(product_item):
    raw = product_item.get("prices", {}).get("S")
    try:
        quotes = json.loads(raw) if raw else []
    except (ValueError, TypeError):
        quotes = []
    vals = [q["price"] for q in quotes if isinstance(q.get("price"), (int, float))]
    return float(min(vals)) if vals else None


# --- pick a real product with a parseable price ------------------------------
prod, low = None, None
for page in db.get_paginator("scan").paginate(TableName=PRODUCTS_TABLE):
    for it in page["Items"]:
        l = lowest_of(it)
        if l is not None:
            prod, low = it, l
            break
    if prod:
        break

if not prod:
    raise SystemExit(
        "No product with a parseable price found in the local products table. "
        "Run backend/scripts/init_local_db.py first."
    )

pid = prod["id"]["S"]
name = prod.get("name", {}).get("S", pid)
image = prod.get("image", {}).get("S", "")
# Target comfortably above the current lowest so the alert triggers on run 1.
target = round(low + max(25.0, low * 0.5), 2)
now = datetime.now(timezone.utc).isoformat()

alert = {
    "id": pid,
    "name": name,
    "image": image,
    "currentPrice": low,
    "targetPrice": target,
    "createdAt": now,
}

db.put_item(TableName=USERS_TABLE, Item={
    "email": {"S": TEST_EMAIL},
    "emailNotifications": {"BOOL": True},
    "priceAlerts": {"S": json.dumps([alert])},
    "created_at": {"N": str(int(datetime.now(timezone.utc).timestamp()))},
})

print(f"Seeded user {TEST_EMAIL}: alert on product '{pid}' "
      f"(lowest ${low:.2f}, target ${target:.2f}) -> should trigger on first run")
