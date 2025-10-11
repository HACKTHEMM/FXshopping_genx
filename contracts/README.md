# FXshopping Soroban Smart Contracts

This directory contains the Soroban smart contracts for the FXshopping application.

## Contracts

### 1. FX Exchange Contract (`fx_exchange/`)
Core currency swap functionality with slippage protection and liquidity management.

**Functions**:
- `swap()` - Execute currency swap
- `get_quote()` - Get swap quote
- `get_rate()` - Get current exchange rate

### 2. Escrow Contract (`escrow/`)
Secure fund holding during multi-party transactions with timelock mechanisms.

**Functions**:
- `deposit()` - Create escrow
- `release()` - Release funds to recipient
- `refund()` - Refund to sender after timeout

### 3. Router Contract (`router/`)
Intelligent routing through multiple liquidity sources for optimal rates.

**Functions**:
- `find_best_path()` - Find optimal swap path
- `execute_swap()` - Execute multi-hop swap

## Development Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli --features opt
```

### Build Contracts
```bash
# Build specific contract
cd fx_exchange
cargo build --target wasm32-unknown-unknown --release

# Build all contracts
cd contracts
for dir in */; do
  cd "$dir"
  cargo build --target wasm32-unknown-unknown --release
  cd ..
done
```

### Test Contracts
```bash
# Run tests for specific contract
cd fx_exchange
cargo test

# Run all tests
cd contracts
cargo test --all
```

### Deploy to Testnet
```bash
# Configure testnet
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Create identity
soroban keys generate --global deployer --network testnet

# Fund account
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"

# Deploy contract
cd fx_exchange
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/fx_exchange.wasm \
  --network testnet \
  --source deployer
```

## Contract Addresses

### Testnet
- FX Exchange: `TBD`
- Escrow: `TBD`
- Router: `TBD`

### Mainnet
- FX Exchange: `TBD`
- Escrow: `TBD`
- Router: `TBD`

## Testing

### Unit Tests
```bash
cargo test
```

### Integration Tests
```bash
cargo test --test integration
```

### CLI Testing
```bash
# Invoke contract function
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source deployer \
  -- \
  get_quote \
  --from_asset <ASSET_ADDRESS> \
  --to_asset <ASSET_ADDRESS> \
  --amount 1000000
```

## Security

All contracts undergo:
- Internal code review
- Unit and integration testing
- Testnet validation
- Security audit (before mainnet)

## License

MIT
