# PowerShell script for Windows users to build the contract

Write-Host "🔨 Building Route Registry Soroban Contract..." -ForegroundColor Cyan

# Navigate to contract directory
Set-Location "contracts\route-registry"

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
cargo clean

# Build the contract
Write-Host "🏗️  Building contract..." -ForegroundColor Green
cargo build --target wasm32-unknown-unknown --release

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Contract built successfully!" -ForegroundColor Green
    Write-Host "📦 WASM file location: target\wasm32-unknown-unknown\release\route_registry.wasm" -ForegroundColor White
    
    # Check if soroban CLI is available
    if (Get-Command soroban -ErrorAction SilentlyContinue) {
        Write-Host "🚀 Optimizing WASM..." -ForegroundColor Cyan
        soroban contract optimize --wasm target\wasm32-unknown-unknown\release\route_registry.wasm
        Write-Host "✅ Optimized WASM: target\wasm32-unknown-unknown\release\route_registry.optimized.wasm" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Soroban CLI not found. Install it with: cargo install --locked soroban-cli" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Return to project root
Set-Location "..\..\"

Write-Host "🎉 Build complete!" -ForegroundColor Green