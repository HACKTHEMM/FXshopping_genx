@echo off
REM Windows batch script for building and deploying Soroban contract

echo 🚀 Building and Deploying Route Registry Contract to Stellar Testnet
echo ==================================================================

REM Check if Soroban CLI is installed
where soroban >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Soroban CLI not found. Please install it first:
    echo    cargo install --locked soroban-cli
    exit /b 1
)

REM Check if we're in the right directory
if not exist "contracts\route-registry\Cargo.toml" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

REM Navigate to contract directory
cd contracts\route-registry

echo 📦 Building contract...
cargo build --target wasm32-unknown-unknown --release
if %errorlevel% neq 0 (
    echo ❌ Contract build failed
    exit /b 1
)

echo ⚡ Optimizing contract (skipping wasm-opt due to bulk memory issues)...
REM soroban contract optimize --wasm target\wasm32-unknown-unknown\release\route_registry.wasm
echo ✓ Using unoptimized WASM for deployment

echo 🔑 Setting up deployment identity...

REM Check if identity already exists
soroban keys ls | findstr "route-registry" >nul
if %errorlevel% neq 0 (
    echo Creating new deployment identity...
    soroban keys generate route-registry --network testnet
) else (
    echo Using existing route-registry identity...
)

REM Get the public key for funding
for /f %%i in ('soroban keys address route-registry') do set DEPLOYER_PUBLIC=%%i
echo 📍 Deployer address: %DEPLOYER_PUBLIC%

echo 💰 Funding deployer account via friendbot...
curl -X POST "https://friendbot.stellar.org?addr=%DEPLOYER_PUBLIC%" >nul 2>&1

REM Wait for funding
echo ⏳ Waiting for funding to complete...
timeout /t 3 /nobreak >nul

echo 🚀 Deploying contract to testnet...
for /f %%i in ('soroban contract deploy --wasm target\wasm32-unknown-unknown\release\route_registry.wasm --source route-registry --network testnet') do set CONTRACT_ID=%%i

if "%CONTRACT_ID%"=="" (
    echo ❌ Contract deployment failed
    exit /b 1
)

echo ✅ Contract deployed successfully!
echo 📝 Contract ID: %CONTRACT_ID%

REM Save contract ID to environment file
cd ..\..\

REM Create or update .env.local file
if exist ".env.local" (
    REM Remove existing contract ID line if it exists
    findstr /v "NEXT_PUBLIC_ROUTE_CONTRACT_ID" .env.local > .env.local.tmp
    move .env.local.tmp .env.local >nul 2>&1
)

echo NEXT_PUBLIC_ROUTE_CONTRACT_ID=%CONTRACT_ID% >> .env.local
echo 📄 Contract ID saved to .env.local

echo.
echo 🎉 Deployment Complete!
echo ==================================================================
echo Contract ID: %CONTRACT_ID%
echo Network: Stellar Testnet
echo Deployer: %DEPLOYER_PUBLIC%
echo.
echo Next steps:
echo 1. Restart your Next.js development server
echo 2. Test contract integration in your app
echo 3. Check contract on Stellar Explorer:
echo    https://stellar.expert/explorer/testnet/contract/%CONTRACT_ID%

pause