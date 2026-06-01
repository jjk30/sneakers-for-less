#!/usr/bin/env python3
"""Mirror the prod table schema + data into DynamoDB Local for development.
Read-only against production (describe + scan). Requires `docker compose up -d`
and AWS creds with read access to the prod table.
  Usage: python backend/scripts/init_local_db.py
"""
import boto3

TABLE = "sneakers-for-less-products"
REGION = "us-east-2"
LOCAL_ENDPOINT = "http://localhost:8000"

prod = boto3.client("dynamodb", region_name=REGION)
local = boto3.client("dynamodb", region_name=REGION, endpoint_url=LOCAL_ENDPOINT,
                     aws_access_key_id="local", aws_secret_access_key="local")

desc = prod.describe_table(TableName=TABLE)["Table"]
kwargs = dict(TableName=TABLE, KeySchema=desc["KeySchema"],
              AttributeDefinitions=desc["AttributeDefinitions"], BillingMode="PAY_PER_REQUEST")
gsis = desc.get("GlobalSecondaryIndexes")
if gsis:
    kwargs["GlobalSecondaryIndexes"] = [
        {"IndexName": g["IndexName"], "KeySchema": g["KeySchema"], "Projection": g["Projection"]}
        for g in gsis]

if TABLE not in local.list_tables()["TableNames"]:
    local.create_table(**kwargs)
    local.get_waiter("table_exists").wait(TableName=TABLE)
    print(f"Created local table {TABLE}")
else:
    print(f"Local table {TABLE} already exists")

count = 0
for page in prod.get_paginator("scan").paginate(TableName=TABLE):
    for item in page["Items"]:
        local.put_item(TableName=TABLE, Item=item)
        count += 1
print(f"Loaded {count} items into DynamoDB Local")
