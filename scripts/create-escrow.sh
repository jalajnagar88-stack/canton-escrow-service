#!/bin/bash
set -euo pipefail

# ==============================================================================
# Create Escrow Contract Script
#
# Description:
#   This script creates a new Escrow contract on a Canton ledger via the
#   JSON API. It uses environment variables for configuration.
#
# Prerequisites:
#   1. A running Canton ledger with the JSON API enabled (e.g., via `dpm sandbox`).
#   2. The escrow DAML model (`.dar` file) must be uploaded to the ledger.
#   3. `curl` and `jq` must be installed and available in your PATH.
#
# Usage:
#   First, set the required environment variables:
#
#   export JSON_API_URL="http://localhost:7575"
#   export JWT_TOKEN="..."
#   export PACKAGE_ID="..."
#   export BUYER_PARTY="..."
#   export SELLER_PARTY="..."
#   export AGENT_PARTY="..."
#
#   Then, run the script:
#   ./scripts/create-escrow.sh
#
# You can also set optional variables like AMOUNT, CURRENCY, DESCRIPTION.
# ==============================================================================

# --- Configuration (from environment variables with sane defaults) ---

JSON_API_URL="${JSON_API_URL:-http://localhost:7575}"
AMOUNT="${AMOUNT:-500.0000000000}"
CURRENCY="${CURRENCY:-USD}"
DESCRIPTION="${DESCRIPTION:-Sale of rare collectible trading card}"
DEADLINE_DAYS="${DEADLINE_DAYS:-14}"

# --- Required Environment Variable Checks ---

# JWT for authentication. It must contain an `actAs` claim for the BUYER_PARTY.
# For local testing with `dpm sandbox`, you can create a token for a party
# using a helper or an online tool like jwt.io with the secret 'secret'.
# Example payload for a party 'Buyer::12...':
# {
#   "https://daml.com/ledger-api": {
#     "ledgerId": "sandbox",
#     "applicationId": "canton-escrow-app",
#     "actAs": ["Buyer::12..."]
#   }
# }
if [[ -z "${JWT_TOKEN:-}" ]]; then
  echo "ERROR: JWT_TOKEN environment variable is not set." >&2
  echo "Please provide a JWT with an 'actAs' claim for the buyer party." >&2
  exit 1
fi

# The Package ID of the compiled Daml model.
# After running `dpm build`, find it with:
#   dpm damlc inspect-dar --json .daml/dist/canton-escrow-service-*.dar | jq -r .main_package_id
if [[ -z "${PACKAGE_ID:-}" ]]; then
  echo "ERROR: PACKAGE_ID environment variable is not set." >&2
  echo "  Run \`dpm build\` then find it with:" >&2
  echo "  dpm damlc inspect-dar --json .daml/dist/canton-escrow-service-*.dar | jq -r .main_package_id" >&2
  exit 1
fi

# Party IDs for the escrow participants.
# You can allocate parties on the sandbox ledger using curl:
#   curl -s -X POST -H "Authorization: Bearer $JWT_TOKEN" \
#     -d '{"identifierHint": "Buyer", "displayName": "Buyer"}' \
#     $JSON_API_URL/v2/parties/allocate | jq
if [[ -z "${BUYER_PARTY:-}" || -z "${SELLER_PARTY:-}" || -z "${AGENT_PARTY:-}" ]]; then
  echo "ERROR: BUYER_PARTY, SELLER_PARTY, and AGENT_PARTY environment variables must be set." >&2
  echo "Please allocate parties and export their full Party ID strings." >&2
  exit 1
fi

# --- Main Script Logic ---

# Calculate deadline in ISO 8601 format (UTC)
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS `date`
  DEADLINE=$(date -u -v+${DEADLINE_DAYS}d +"%Y-%m-%dT%H:%M:%SZ")
else
  # GNU `date`
  DEADLINE=$(date -u -d "${DEADLINE_DAYS} days" +"%Y-%m-%dT%H:%M:%SZ")
fi

echo "--- Creating Escrow Contract ---"
echo "  Buyer:       $BUYER_PARTY"
echo "  Seller:      $SELLER_PARTY"
echo "  Agent:       $AGENT_PARTY"
echo "  Amount:      $AMOUNT $CURRENCY"
echo "  Description: '$DESCRIPTION'"
echo "  Deadline:    $DEADLINE"
echo "  Package ID:  $PACKAGE_ID"
echo "--------------------------------"

# Construct the full Daml template identifier.
# This assumes the main Daml module is named `Escrow` and contains a template `Escrow`.
# Update this if your module/template names are different.
TEMPLATE_ID="${PACKAGE_ID}:Escrow:Escrow"

# JSON payload for the create command
read -r -d '' PAYLOAD << EOM
{
  "templateId": "$TEMPLATE_ID",
  "payload": {
    "buyer": "$BUYER_PARTY",
    "seller": "$SELLER_PARTY",
    "agent": "$AGENT_PARTY",
    "amount": "$AMOUNT",
    "currency": "$CURRENCY",
    "description": "$DESCRIPTION",
    "deadline": "$DEADLINE",
    "arbiter": null,
    "rulesUrl": "https://example.com/escrow-terms-v1"
  }
}
EOM

echo "Submitting command to JSON API at $JSON_API_URL/v1/create..."
echo "Payload:"
echo "$PAYLOAD" | jq .
echo

# Send the create command to the JSON API
RESPONSE=$(curl -s -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD" \
  "$JSON_API_URL/v1/create")

HTTP_CODE=${RESPONSE: -3}
BODY=${RESPONSE::-3}

echo "--- API Response (HTTP Status: $HTTP_CODE) ---"
if ! echo "$BODY" | jq . ; then
    echo "Could not parse JSON response:"
    echo "$BODY"
fi
echo "------------------------------------------"

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
    echo "ERROR: Failed to create escrow contract. The API returned a non-2xx status." >&2
    exit 1
fi

echo "Successfully submitted escrow contract creation command."
