#!/bin/bash

# Deploy script for Route Registry Soroban Contract
# This script deploys the contract to Stellar testnet

echo "🚀 Deploying Route Registry Contract to Stellar Testnet..."

# Check if contract is built
WASM_FILE="contracts/route-registry/target/wasm32-unknown-unknown/release/route_registry.optimized.wasm"
if [ ! -f "$WASM_FILE" ]; then
    WASM_FILE="contracts/route-registry/target/wasm32-unknown-unknown/release/route_registry.wasm"
    if [ ! -f "$WASM_FILE" ]; then
        echo "❌ Contract WASM not found. Run build-contract.sh first."
        exit 1
    fi
fi

# Check if soroban CLI is available
if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI not found. Install it with: cargo install --locked soroban-cli"
    exit 1
fi

# Check if testnet is configured
if ! soroban config network list | grep -q "testnet"; then
    echo "🔧 Configuring Stellar testnet..."
    soroban config network add testnet \
        --rpc-url https://soroban-testnet.stellar.org:443 \
        --network-passphrase "Test SDF Network ; September 2015"
fi

# Generate contract identity if it doesn't exist
IDENTITY_NAME="route-registry-deployer"
if ! soroban config identity list | grep -q "$IDENTITY_NAME"; then
    echo "🔑 Generating contract identity..."
    soroban config identity generate "$IDENTITY_NAME" --network testnet
fi

# Fund the account if needed
ACCOUNT_ADDRESS=$(soroban config identity address "$IDENTITY_NAME")
echo "💰 Funding account: $ACCOUNT_ADDRESS"
curl -X POST "https://friendbot.stellar.org/?addr=$ACCOUNT_ADDRESS" || echo "Account already funded or friendbot error"

# Deploy the contract
echo "📦 Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
    --wasm "$WASM_FILE" \
    --source "$IDENTITY_NAME" \
    --network testnet 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Contract deployed successfully!"
    echo "🎯 Contract ID: $CONTRACT_ID"
    echo ""
    echo "📝 Add this to your .env.local file:"
    echo "NEXT_PUBLIC_ROUTE_CONTRACT_ID=$CONTRACT_ID"
    echo ""
    echo "🔗 View on Stellar Expert:"
    echo "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
else
    echo "❌ Deployment failed!"
    echo "$CONTRACT_ID"
    exit 1
fi

echo "🎉 Deployment complete!"