#!/bin/bash
# scripts/setup.sh - Vendor the noisemaker shader runtime and install browser
set -e

NOISEMAKER_DIR="${1:-../noisemaker}"
VENDOR_DIR="viewer/vendor"

mkdir -p "$VENDOR_DIR"

echo "Building noisemaker shader bundle..."
(cd "$NOISEMAKER_DIR" && npm run build:shaders 2>/dev/null || npm run build 2>/dev/null)

echo "Copying runtime..."
cp "$NOISEMAKER_DIR/shaders/dist/noisemaker-shaders-core.esm.js" "$VENDOR_DIR/"

echo "Installing Playwright Chromium..."
npx playwright install chromium

echo "Setup complete."
