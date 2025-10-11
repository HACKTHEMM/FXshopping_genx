# PowerShell script for Windows users to deploy the contract

Write-Host "🚀 Deploying Route Registry Contract to Stellar Testnet..." -ForegroundColor Cyan

# Check if contract is built
$WasmFile = "contracts\route-registry\target\wasm32-unknown-unknown\release\route_registry.optimized.wasm"
if (-not (Test-Path $WasmFile)) {
    $WasmFile = "contracts\route-registry\target\wasm32-unknown-unknown\release\route_registry.wasm"
    if (-not (Test-Path $WasmFile)) {
        Write-Host "❌ Contract WASM not found. Run build-contract.ps1 first." -ForegroundColor Red
        exit 1
    }
}

# Check if soroban CLI is available
if (-not (Get-Command soroban -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Soroban CLI not found. Install it with: cargo install --locked soroban-cli" -ForegroundColor Red
    exit 1
}

# Check if testnet is configured
$Networks = soroban config network list
if ($Networks -notmatch "testnet") {
    Write-Host "🔧 Configuring Stellar testnet..." -ForegroundColor Yellow
    soroban config network add testnet --rpc-url https://soroban-testnet.stellar.org:443 --network-passphrase "Test SDF Network ; September 2015"
}

# Generate contract identity if it doesn't exist
$IdentityName = "route-registry-deployer"
$Identities = soroban config identity list
if ($Identities -notmatch $IdentityName) {
    Write-Host "🔑 Generating contract identity..." -ForegroundColor Yellow
    soroban config identity generate $IdentityName --network testnet
}

# Fund the account if needed
$AccountAddress = soroban config identity address $IdentityName
Write-Host "💰 Funding account: $AccountAddress" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "https://friendbot.stellar.org/?addr=$AccountAddress" -Method Post
} catch {
    Write-Host "Account already funded or friendbot error" -ForegroundColor Yellow
}

# Deploy the contract
Write-Host "📦 Deploying contract..." -ForegroundColor Green
try {
    $ContractId = soroban contract deploy --wasm $WasmFile --source $IdentityName --network testnet
    
    Write-Host "✅ Contract deployed successfully!" -ForegroundColor Green
    Write-Host "🎯 Contract ID: $ContractId" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Add this to your .env.local file:" -ForegroundColor Yellow
    Write-Host "NEXT_PUBLIC_ROUTE_CONTRACT_ID=$ContractId" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 View on Stellar Expert:" -ForegroundColor Cyan
    Write-Host "https://stellar.expert/explorer/testnet/contract/$ContractId" -ForegroundColor Blue
} catch {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green