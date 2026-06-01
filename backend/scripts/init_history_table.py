#!/usr/bin/env python3
"""Create the price-history table in DynamoDB Local for the price-refresh pipeline.

Local-only: targets DYNAMODB_ENDPOINT (default http://localhost:8000) with local
dummy creds, so it can never touch production. Schema matches what
price_refresh.py writes: partition key id [S], sort key ts [S], PAY_PER_REQUEST.
  Usage: python backend/scripts/init_history_table.py
"""
import os
import boto3

TABLE = "sneakers-for-less-price-history"
REGION = "us-east-2"
ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:8000")

local = boto3.client("dynamodb", region_name=REGION, endpoint_url=ENDPOINT,
                     aws_access_key_id="local", aws_secret_access_key="local")

if TABLE in local.list_tables()["TableNames"]:
    print(f"Local table {TABLE} already exists")
else:
    local.create_table(
        TableName=TABLE,
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"},
                   {"AttributeName": "ts", "KeyType": "RANGE"}],
        AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"},
                              {"AttributeName": "ts", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )
    local.get_waiter("table_exists").wait(TableName=TABLE)
    print(f"Created local table {TABLE}")
