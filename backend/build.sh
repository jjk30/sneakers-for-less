#!/usr/bin/env bash
# Reproducible AWS Lambda build for the sneakers-for-less backend.
# Installs deps INSIDE the official Lambda Python 3.11 image so compiled wheels
# (cryptography, etc.) match the Lambda runtime (linux/amd64). Produces
# backend/lambda_function.zip. Does NOT deploy.
#   Usage: bash backend/build.sh
set -euo pipefail
cd "$(dirname "$0")"

IMAGE="public.ecr.aws/lambda/python:3.11"
BUILD_DIR="build_pkg"
ZIP_NAME="lambda_function.zip"

echo "==> Cleaning previous build"
rm -rf "$BUILD_DIR" "$ZIP_NAME"
mkdir -p "$BUILD_DIR"

echo "==> Installing dependencies inside $IMAGE (linux/amd64)"
docker run --rm --platform linux/amd64 --entrypoint /bin/sh \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD/$BUILD_DIR":/var/task \
  -v "$PWD/requirements.txt":/tmp/requirements.txt:ro \
  "$IMAGE" -c "pip install --no-cache-dir --target /var/task -r /tmp/requirements.txt"

echo "==> Adding handler"
cp lambda_handler.py "$BUILD_DIR/"

echo "==> Verifying imports inside the Lambda image"
docker run --rm --platform linux/amd64 --entrypoint /bin/sh \
  -v "$PWD/$BUILD_DIR":/var/task \
  "$IMAGE" -c "cd /var/task && python -c 'import lambda_handler, google.auth, requests; print(\"IMPORTS OK\")'"

echo "==> Zipping -> $ZIP_NAME"
( cd "$BUILD_DIR" && zip -qr "../$ZIP_NAME" . )
echo "==> Done: backend/$ZIP_NAME ($(du -h "$ZIP_NAME" | cut -f1))"
echo "    (local build only — upload to Lambda manually when ready to deploy)"
