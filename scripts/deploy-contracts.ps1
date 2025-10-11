# Soroban Smart Contract Deployment Script (PowerShell)
# This script deploys all FXshopping contracts to Stellar testnet

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "FXshopping Contract Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$NETWORK = "testnet"
$SOURCE = "soroban-deployer"

# Check if stellar CLI is installed
if (!(Get-Command stellar -ErrorAction SilentlyContinue)) {
    Write-Host "Error: stellar CLI not found" -ForegroundColor Red
    Write-Host "Please install: cargo install --locked stellar-cli"
    exit 1
}

# Check if deployer identity exists
try {
    $DEPLOYER_ADDRESS = stellar keys address $SOURCE 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "Error: Deployer identity '$SOURCE' not found" -ForegroundColor Red
    Write-Host "Please create: stellar keys generate --global $SOURCE --network $NETWORK"
    exit 1
}

Write-Host "Deployer Address: $DEPLOYER_ADDRESS" -ForegroundColor Blue
Write-Host ""

# Function to deploy a contract
function Deploy-Contract {
    param(
        [string]$ContractName,
        [string]$WasmPath
    )

    Write-Host "Deploying $ContractName..." -ForegroundColor Blue

    if (!(Test-Path $WasmPath)) {
        Write-Host "Error: WASM file not found at $WasmPath" -ForegroundColor Red
        Write-Host "Please build the contract first"
        return $null
    }

    $output = stellar contract deploy `
        --wasm $WasmPath `
        --network $NETWORK `
        --source $SOURCE `
        2>&1 | Out-String

    $contractId = $output | Select-String -Pattern 'C[A-Z0-9]{55}' | ForEach-Object { $_.Matches[0].Value } | Select-Object -First 1

    if (!$contractId) {
        Write-Host "Error: Failed to deploy $ContractName" -ForegroundColor Red
        Write-Host $output
        return $null
    }

    Write-Host "✓ $ContractName deployed" -ForegroundColor Green
    Write-Host "  Contract ID: $contractId"
    Write-Host "  Explorer: https://stellar.expert/explorer/testnet/contract/$contractId"
    Write-Host ""

    return $contractId
}

# Build all contracts first
Write-Host "Building contracts..." -ForegroundColor Blue
Write-Host ""

Push-Location contracts/fx_exchange
stellar contract build | Out-Null
Write-Host "✓ FX Exchange built" -ForegroundColor Green
Pop-Location

Push-Location contracts/escrow
stellar contract build | Out-Null
Write-Host "✓ Escrow built" -ForegroundColor Green
Pop-Location

Push-Location contracts/router
stellar contract build | Out-Null
Write-Host "✓ Router built" -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "Starting deployment..." -ForegroundColor Blue
Write-Host ""

# Deploy contracts
$FX_EXCHANGE_ID = Deploy-Contract `
    "FX Exchange" `
    "contracts/fx_exchange/target/wasm32v1-none/release/fx_exchange_contract.wasm"

if (!$FX_EXCHANGE_ID) {
    Write-Host "Deployment failed. Exiting." -ForegroundColor Red
    exit 1
}

$ESCROW_ID = Deploy-Contract `
    "Escrow" `
    "contracts/escrow/target/wasm32v1-none/release/escrow_contract.wasm"

if (!$ESCROW_ID) {
    Write-Host "Deployment failed. Exiting." -ForegroundColor Red
    exit 1
}

$ROUTER_ID = Deploy-Contract `
    "Router" `
    "contracts/router/target/wasm32v1-none/release/router_contract.wasm"

if (!$ROUTER_ID) {
    Write-Host "Deployment failed. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "All contracts deployed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Contract IDs:"
Write-Host "  FX Exchange: $FX_EXCHANGE_ID"
Write-Host "  Escrow:      $ESCROW_ID"
Write-Host "  Router:      $ROUTER_ID"
Write-Host ""

# Save to .env file
$ENV_FILE = ".env.contracts"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

@"
# Soroban Smart Contract IDs - Testnet
# Generated: $timestamp

NEXT_PUBLIC_FX_EXCHANGE_CONTRACT=$FX_EXCHANGE_ID
NEXT_PUBLIC_ESCROW_CONTRACT=$ESCROW_ID
NEXT_PUBLIC_ROUTER_CONTRACT=$ROUTER_ID

# Deployer Address
DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS

# Network
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
"@ | Out-File -FilePath $ENV_FILE -Encoding UTF8

Write-Host "✓ Contract IDs saved to $ENV_FILE" -ForegroundColor Green
Write-Host ""

# Initialize contracts
Write-Host "Initializing contracts..." -ForegroundColor Blue
Write-Host ""

# Initialize FX Exchange
Write-Host "Initializing FX Exchange..." -ForegroundColor Blue
stellar contract invoke `
    --id $FX_EXCHANGE_ID `
    --network $NETWORK `
    --source $SOURCE `
    -- `
    initialize `
    --admin $DEPLOYER_ADDRESS `
    --fee_bps 30 `
    2>&1 | Out-Null

Write-Host "✓ FX Exchange initialized (fee: 0.3%)" -ForegroundColor Green

# Initialize Escrow
Write-Host "Initializing Escrow..." -ForegroundColor Blue
stellar contract invoke `
    --id $ESCROW_ID `
    --network $NETWORK `
    --source $SOURCE `
    -- `
    initialize `
    --admin $DEPLOYER_ADDRESS `
    2>&1 | Out-Null

Write-Host "✓ Escrow initialized" -ForegroundColor Green

# Initialize Router
Write-Host "Initializing Router..." -ForegroundColor Blue
stellar contract invoke `
    --id $ROUTER_ID `
    --network $NETWORK `
    --source $SOURCE `
    -- `
    initialize `
    --admin $DEPLOYER_ADDRESS `
    --max_hops 3 `
    2>&1 | Out-Null

Write-Host "✓ Router initialized (max hops: 3)" -ForegroundColor Green

# Register FX Exchange with Router
Write-Host "Registering FX Exchange with Router..." -ForegroundColor Blue
stellar contract invoke `
    --id $ROUTER_ID `
    --network $NETWORK `
    --source $SOURCE `
    -- `
    register_exchange `
    --caller $DEPLOYER_ADDRESS `
    --exchange $FX_EXCHANGE_ID `
    2>&1 | Out-Null

Write-Host "✓ FX Exchange registered with Router" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Copy $ENV_FILE contents to your .env file"
Write-Host "  2. Update lib/soroban-integration.ts with contract IDs"
Write-Host "  3. Set exchange rates and add liquidity"
Write-Host "  4. Test via CLI or TypeScript integration"
Write-Host ""
Write-Host "Documentation: See CONTRACTS_IMPLEMENTED.md for full API reference"
Write-Host ""
