#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Setting up GODMODE_TOKEN for newsletter worker ==="
echo

# Generate token
TOKEN=$(openssl rand -hex 32)
echo "Generated token: $TOKEN"
echo

# Set as Cloudflare secret
echo "Setting GODMODE_TOKEN as Cloudflare secret..."
echo "$TOKEN" | npx wrangler secret put GODMODE_TOKEN
echo

# Deploy the worker
echo "Deploying worker..."
npx wrangler deploy
echo

# Save token locally
ENV_FILE="$HOME/.hillpeople-newsletter"
echo "GODMODE_TOKEN=$TOKEN" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "Token saved to $ENV_FILE"
echo

echo "=== Setup complete! ==="
echo
echo "To use godmode, either:"
echo "  1. Source the env file:  source $ENV_FILE"
echo "  2. Or export directly:   export GODMODE_TOKEN=$TOKEN"
echo
echo "Then run:"
echo "  make newsletter-godmode-send POSTS=1,2,3 TO=test@example.com"
