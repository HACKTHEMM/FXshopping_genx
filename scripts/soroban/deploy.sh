#!/bin/bash

# Soroban Contract Build and Deploy Script
# This script builds, optimizes, and deploys the route registry contract to Stellar testnet

set -e

echo "🚀 Building and Deploying Route Registry Contract to Stellar Testnet"
echo "=================================================================="

# Check if Soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "❌ Soroban CLI not found. Please install it first:"
    echo "   cargo install --locked soroban-cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "contracts/route-registry/Cargo.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to contract directory
cd contracts/route-registry

echo "📦 Building contract..."
cargo build --target wasm32-unknown-unknown --release

if [ $? -ne 0 ]; then
    echo "❌ Contract build failed"
    exit 1
fi

echo "⚡ Optimizing contract..."
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm

if [ $? -ne 0 ]; then
    echo "❌ Contract optimization failed"
    exit 1
fi

echo "🔑 Setting up deployment identity..."

# Check if identity already exists
if ! soroban keys ls | grep -q "route-registry"; then
    echo "Creating new deployment identity..."
    soroban keys generate route-registry --network testnet
else
    echo "Using existing route-registry identity..."
fi

# Get the public key for funding
DEPLOYER_PUBLIC=$(soroban keys address route-registry)
echo "📍 Deployer address: $DEPLOYER_PUBLIC"

echo "💰 Funding deployer account via friendbot..."
curl -X POST "https://friendbot.stellar.org?addr=$DEPLOYER_PUBLIC" > /dev/null 2>&1

# Wait for funding
echo "⏳ Waiting for funding to complete..."
sleep 3

echo "🚀 Deploying contract to testnet..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm \
  --source route-registry \
  --network testnet)

if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi

echo "✅ Contract deployed successfully!"
echo "📝 Contract ID: $CONTRACT_ID"

# Save contract ID to environment file
cd ../../
if [ -f ".env.local" ]; then
    # Remove existing contract ID line if it exists
    grep -v "NEXT_PUBLIC_ROUTE_CONTRACT_ID" .env.local > .env.local.tmp && mv .env.local.tmp .env.local
fi

echo "NEXT_PUBLIC_ROUTE_CONTRACT_ID=$CONTRACT_ID" >> .env.local
echo "📄 Contract ID saved to .env.local"

echo ""
echo "🎉 Deployment Complete!"
echo "=================================================================="
echo "Contract ID: $CONTRACT_ID"
echo "Network: Stellar Testnet"
echo "Deployer: $DEPLOYER_PUBLIC"
echo ""
echo "Next steps:"
echo "1. Restart your Next.js development server"
echo "2. Test contract integration in your app"
echo "3. Check contract on Stellar Explorer:"
echo "   https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"