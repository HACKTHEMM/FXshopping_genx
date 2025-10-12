# Deploy Route Registry Contract to Stellar Testnet
# This script builds and deploys the Soroban smart contract

Write-Host "🚀 Deploying Route Registry Contract to Stellar Testnet..." -ForegroundColor Green

# Check if Soroban CLI is installed
try {
    $sorobanVersion = soroban --version 2>$null
    Write-Host "✅ Soroban CLI found: $sorobanVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Soroban CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   cargo install --locked soroban-cli" -ForegroundColor Yellow
    exit 1
}

# Navigate to contract directory
Set-Location contracts/route-registry

Write-Host "📦 Building contract..." -ForegroundColor Blue
# Build the contract
cargo build --target wasm32-unknown-unknown --release

Write-Host "🔧 Optimizing contract..." -ForegroundColor Blue
# Optimize the contract
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm

Write-Host "📡 Deploying to testnet..." -ForegroundColor Blue
# Deploy to testnet
$CONTRACT_ID = soroban contract deploy --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm --source-account testnet --network testnet

Write-Host "✅ Contract deployed successfully!" -ForegroundColor Green
Write-Host "📋 Contract ID: $CONTRACT_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Contract details:" -ForegroundColor Blue
Write-Host "   Network: Testnet" -ForegroundColor White
Write-Host "   Contract ID: $CONTRACT_ID" -ForegroundColor White
Write-Host "   Explorer: https://testnet.steexp.com/contract/$CONTRACT_ID" -ForegroundColor White
Write-Host ""
Write-Host "💡 Add this to your .env.local:" -ForegroundColor Yellow
Write-Host "   NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=$CONTRACT_ID" -ForegroundColor White

# Save contract ID to file for easy reference
$CONTRACT_ID | Out-File -FilePath "../../.contract-id" -Encoding UTF8

Write-Host ""
Write-Host "🎉 Deployment complete! Contract is ready to use." -ForegroundColor Green
