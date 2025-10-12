#!/bin/bash

# Deploy Route Registry Contract to Stellar Testnet
# This script builds and deploys the Soroban smart contract

set -e

echo "🚀 Deploying Route Registry Contract to Stellar Testnet..."

# Check if Soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI not found. Please install it first:"
    echo "   cargo install --locked soroban-cli"
    exit 1
fi

# Navigate to contract directory
cd contracts/route-registry

echo "📦 Building contract..."
# Build the contract
cargo build --target wasm32-unknown-unknown --release

echo "🔧 Optimizing contract..."
# Optimize the contract
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm

echo "📡 Deploying to testnet..."
# Deploy to testnet
CONTRACT_ID=$(soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm \
    --source-account testnet \
    --network testnet)

echo "✅ Contract deployed successfully!"
echo "📋 Contract ID: $CONTRACT_ID"
echo ""
echo "🔗 Contract details:"
echo "   Network: Testnet"
echo "   Contract ID: $CONTRACT_ID"
echo "   Explorer: https://testnet.steexp.com/contract/$CONTRACT_ID"
echo ""
echo "💡 Add this to your .env.local:"
echo "   NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=$CONTRACT_ID"

# Save contract ID to file for easy reference
echo "$CONTRACT_ID" > ../../.contract-id

echo ""
echo "🎉 Deployment complete! Contract is ready to use."
