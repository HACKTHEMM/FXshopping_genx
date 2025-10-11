#!/bin/bash

# Soroban Smart Contract Deployment Script
# This script deploys all FXshopping contracts to Stellar testnet

set -e  # Exit on error

echo "======================================"
echo "FXshopping Contract Deployment Script"
echo "======================================"
echo ""

# Configuration
NETWORK="testnet"
SOURCE="soroban-deployer"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}Error: stellar CLI not found${NC}"
    echo "Please install: cargo install --locked stellar-cli"
    exit 1
fi

# Check if deployer identity exists
if ! stellar keys address $SOURCE &> /dev/null; then
    echo -e "${RED}Error: Deployer identity '$SOURCE' not found${NC}"
    echo "Please create: stellar keys generate --global $SOURCE --network $NETWORK"
    exit 1
fi

DEPLOYER_ADDRESS=$(stellar keys address $SOURCE)
echo -e "${BLUE}Deployer Address:${NC} $DEPLOYER_ADDRESS"
echo ""

# Function to deploy a contract
deploy_contract() {
    local CONTRACT_NAME=$1
    local WASM_PATH=$2

    echo -e "${BLUE}Deploying $CONTRACT_NAME...${NC}"

    if [ ! -f "$WASM_PATH" ]; then
        echo -e "${RED}Error: WASM file not found at $WASM_PATH${NC}"
        echo "Please build the contract first: cd contracts/$CONTRACT_NAME && stellar contract build"
        return 1
    fi

    CONTRACT_ID=$(stellar contract deploy \
        --wasm "$WASM_PATH" \
        --network $NETWORK \
        --source $SOURCE \
        2>&1 | grep -oP 'C[A-Z0-9]{55}' | head -1)

    if [ -z "$CONTRACT_ID" ]; then
        echo -e "${RED}Error: Failed to deploy $CONTRACT_NAME${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ $CONTRACT_NAME deployed${NC}"
    echo -e "  Contract ID: $CONTRACT_ID"
    echo -e "  Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
    echo ""

    echo "$CONTRACT_ID"
}

# Build all contracts first
echo -e "${BLUE}Building contracts...${NC}"
echo ""

cd contracts/fx_exchange
stellar contract build > /dev/null 2>&1
echo -e "${GREEN}✓ FX Exchange built${NC}"
cd ../..

cd contracts/escrow
stellar contract build > /dev/null 2>&1
echo -e "${GREEN}✓ Escrow built${NC}"
cd ../..

cd contracts/router
stellar contract build > /dev/null 2>&1
echo -e "${GREEN}✓ Router built${NC}"
cd ../..

echo ""
echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Deploy FX Exchange Contract
FX_EXCHANGE_ID=$(deploy_contract \
    "FX Exchange" \
    "contracts/fx_exchange/target/wasm32v1-none/release/fx_exchange_contract.wasm")

if [ -z "$FX_EXCHANGE_ID" ]; then
    echo -e "${RED}Deployment failed. Exiting.${NC}"
    exit 1
fi

# Deploy Escrow Contract
ESCROW_ID=$(deploy_contract \
    "Escrow" \
    "contracts/escrow/target/wasm32v1-none/release/escrow_contract.wasm")

if [ -z "$ESCROW_ID" ]; then
    echo -e "${RED}Deployment failed. Exiting.${NC}"
    exit 1
fi

# Deploy Router Contract
ROUTER_ID=$(deploy_contract \
    "Router" \
    "contracts/router/target/wasm32v1-none/release/router_contract.wasm")

if [ -z "$ROUTER_ID" ]; then
    echo -e "${RED}Deployment failed. Exiting.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}======================================"
echo "All contracts deployed successfully!"
echo "======================================${NC}"
echo ""
echo "Contract IDs:"
echo "  FX Exchange: $FX_EXCHANGE_ID"
echo "  Escrow:      $ESCROW_ID"
echo "  Router:      $ROUTER_ID"
echo ""

# Save to .env file
ENV_FILE=".env.contracts"
cat > $ENV_FILE << EOF
# Soroban Smart Contract IDs - Testnet
# Generated: $(date)

NEXT_PUBLIC_FX_EXCHANGE_CONTRACT=$FX_EXCHANGE_ID
NEXT_PUBLIC_ESCROW_CONTRACT=$ESCROW_ID
NEXT_PUBLIC_ROUTER_CONTRACT=$ROUTER_ID

# Deployer Address
DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS

# Network
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
EOF

echo -e "${GREEN}✓ Contract IDs saved to $ENV_FILE${NC}"
echo ""

# Initialize contracts
echo -e "${BLUE}Initializing contracts...${NC}"
echo ""

# Initialize FX Exchange (admin, fee_bps)
echo -e "${BLUE}Initializing FX Exchange...${NC}"
stellar contract invoke \
    --id $FX_EXCHANGE_ID \
    --network $NETWORK \
    --source $SOURCE \
    -- \
    initialize \
    --admin $DEPLOYER_ADDRESS \
    --fee_bps 30 \
    > /dev/null 2>&1

echo -e "${GREEN}✓ FX Exchange initialized (fee: 0.3%)${NC}"

# Initialize Escrow (admin)
echo -e "${BLUE}Initializing Escrow...${NC}"
stellar contract invoke \
    --id $ESCROW_ID \
    --network $NETWORK \
    --source $SOURCE \
    -- \
    initialize \
    --admin $DEPLOYER_ADDRESS \
    > /dev/null 2>&1

echo -e "${GREEN}✓ Escrow initialized${NC}"

# Initialize Router (admin, max_hops)
echo -e "${BLUE}Initializing Router...${NC}"
stellar contract invoke \
    --id $ROUTER_ID \
    --network $NETWORK \
    --source $SOURCE \
    -- \
    initialize \
    --admin $DEPLOYER_ADDRESS \
    --max_hops 3 \
    > /dev/null 2>&1

echo -e "${GREEN}✓ Router initialized (max hops: 3)${NC}"

# Register FX Exchange with Router
echo -e "${BLUE}Registering FX Exchange with Router...${NC}"
stellar contract invoke \
    --id $ROUTER_ID \
    --network $NETWORK \
    --source $SOURCE \
    -- \
    register_exchange \
    --caller $DEPLOYER_ADDRESS \
    --exchange $FX_EXCHANGE_ID \
    > /dev/null 2>&1

echo -e "${GREEN}✓ FX Exchange registered with Router${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "Setup Complete!"
echo "======================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy $ENV_FILE contents to your .env file"
echo "  2. Set exchange rates: ./scripts/set-test-rates.sh"
echo "  3. Add liquidity: ./scripts/add-liquidity.sh"
echo "  4. Test via CLI: stellar contract invoke --id $FX_EXCHANGE_ID ..."
echo ""
echo "Documentation: See CONTRACTS_IMPLEMENTED.md for full API reference"
echo ""
