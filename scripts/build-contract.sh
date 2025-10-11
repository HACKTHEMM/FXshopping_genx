#!/bin/bash

# Build script for Route Registry Soroban Contract
# This script builds the contract for deployment to Stellar testnet

echo "🔨 Building Route Registry Soroban Contract..."

# Navigate to contract directory
cd contracts/route-registry

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cargo clean

# Build the contract
echo "🏗️  Building contract..."
cargo build --target wasm32-unknown-unknown --release

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Contract built successfully!"
    echo "📦 WASM file location: target/wasm32-unknown-unknown/release/route_registry.wasm"
    
    # Optimize the WASM (if soroban CLI is available)
    if command -v soroban &> /dev/null; then
        echo "🚀 Optimizing WASM..."
        soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm
        echo "✅ Optimized WASM: target/wasm32-unknown-unknown/release/route_registry.optimized.wasm"
    else
        echo "⚠️  Soroban CLI not found. Install it with: cargo install --locked soroban-cli"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

echo "🎉 Build complete!"