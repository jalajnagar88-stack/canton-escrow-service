#!/usr/bin/env bash

# Script to build the Daml model and initialize a test escrow transaction
# on a running Canton ledger.
#
# Usage:
#   ./scripts/create-escrow.sh
#
# It can be configured with the following environment variables:
#   LEDGER_HOST: The hostname of the Canton participant (defaults to localhost)
#   LEDGER_PORT: The gRPC port of the Canton participant (defaults to 5011)

set -euo pipefail

# --- Configuration ---
LEDGER_HOST=${LEDGER_HOST:-localhost}
LEDGER_PORT=${LEDGER_PORT:-5011}

# --- Automatically determine project variables from daml.yaml ---
PROJECT_NAME=$(grep 'name:' daml.yaml | awk '{print $2}')
PROJECT_VERSION=$(grep 'version:' daml.yaml | awk '{print $2}')
DAR_FILE=".daml/dist/${PROJECT_NAME}-${PROJECT_VERSION}.dar"

# --- Define Parties for the Escrow Transaction ---
# In a real Canton environment, the suffix would be the participant's key fingerprint.
# Ensure these parties are enabled on your target participant node.
PARTICIPANT_SUFFIX="::1220000000000000000000000000000000000000000000000000000000000000"
BUYER="Buyer${PARTICIPANT_SUFFIX}"
SELLER="Seller${PARTICIPANT_SUFFIX}"
ESCROW_AGENT="EscrowAgent${PARTICIPANT_SUFFIX}"
ARBITRATOR="Arbitrator${PARTICIPANT_SUFFIX}"

echo "--- Building Daml Project ---"
daml build
echo "Build successful. DAR located at ${DAR_FILE}"
echo ""

echo "--- Running Escrow Initialization Script ---"
echo "  Target Ledger: ${LEDGER_HOST}:${LEDGER_PORT}"
echo "  Buyer:         ${BUYER}"
echo "  Seller:        ${SELLER}"
echo "  Escrow Agent:  ${ESCROW_AGENT}"
echo "  Arbitrator:    ${ARBITRATOR}"
echo ""

# The daml script command executes the 'initialize' function from the
# EscrowTest module, passing the party and transaction details as a JSON argument.
daml script \
  --ledger-host "${LEDGER_HOST}" \
  --ledger-port "${LEDGER_PORT}" \
  --dar "${DAR_FILE}" \
  --script-name "EscrowTest:initialize" \
  --input-file <(cat <<EOF
{
  "buyer": "${BUYER}",
  "seller": "${SELLER}",
  "escrowAgent": "${ESCROW_AGENT}",
  "arbitrator": "${ARBITRATOR}",
  "item": "Antique Pocket Watch",
  "amount": "2500.00",
  "currency": "USD"
}
EOF
)

echo ""
echo "--- Escrow initialization complete. ---"