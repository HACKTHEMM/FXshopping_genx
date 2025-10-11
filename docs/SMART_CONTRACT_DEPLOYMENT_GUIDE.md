# Smart Contract Deployment Guide

## Overview
This guide walks you through deploying the Route Registry smart contract to Stellar testnet and integrating it with the FX Shopping platform.

## Prerequisites

### 1. Install Rust
```bash
# Windows (PowerShell)
winget install Rustlang.Rust.MSVC

# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install Soroban CLI
```bash
cargo install --locked soroban-cli
```

### 3. Configure Soroban for Testnet
```bash
soroban config network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 4. Set up Testnet Account
```bash
# Generate a new keypair for testnet
soroban keys generate --global testnet --network testnet

# Fund the account (get testnet XLM from friendbot)
curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"
```

## Deployment Steps

### 1. Build the Contract
```bash
cd contracts/route-registry
cargo build --target wasm32-unknown-unknown --release
```

### 2. Optimize the Contract
```bash
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm
```

### 3. Deploy to Testnet
```bash
# Using PowerShell script (Windows)
powershell -ExecutionPolicy Bypass -File ../../scripts/deploy-route-registry-contract.ps1

# Using bash script (macOS/Linux)
bash ../../scripts/deploy-route-registry-contract.sh
```

### 4. Get Contract ID
After deployment, you'll get a contract ID like:
```
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXKS3J2V
```

### 5. Update Environment Variables
Add the contract ID to your `.env.local`:
```env
NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXKS3J2V
```

## Contract Functions

### `register_route`
Registers a new route before execution.
- **Parameters**: `route_id`, `expected_net`, `sender`
- **Returns**: Attestation hash
- **Events**: `RouteRegistered`

### `finalize_route`
Finalizes a route after transaction completion.
- **Parameters**: `route_id`, `tx_hash`, `actual_net`
- **Returns**: Variance (actual - expected)
- **Events**: `RouteFinalized`

### `get_route`
Queries stored route data.
- **Parameters**: `route_id`
- **Returns**: `RouteData` struct

## Integration Flow

### 1. Route Registration (Before Transaction)
```typescript
// In Routes.tsx - handleSelectRoute
const attestationHash = await registerRouteWithContract(route, userPublicKey);
```

### 2. Route Finalization (After Transaction)
```typescript
// After successful transaction
await finalizeRouteWithContract(attestationHash, actualReceive, txHash);
```

### 3. UI Display
- Smart contract button appears next to Stellar Explorer link
- Shows attestation hash and status
- Links to contract explorer

## Contract Explorer

After deployment, view your contract at:
```
https://testnet.steexp.com/contract/CONTRACT_ID
```

## Testing

### 1. Run Contract Tests
```bash
cd contracts/route-registry
cargo test
```

### 2. Test Contract Functions
```bash
# Register a route
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account testnet \
  --network testnet \
  -- register_route \
  --route_id "test_route_123" \
  --expected_net 1000 \
  --sender USER_ADDRESS

# Finalize a route
soroban contract invoke \
  --id CONTRACT_ID \
  --source-account testnet \
  --network testnet \
  -- finalize_route \
  --route_id "test_route_123" \
  --tx_hash TX_HASH \
  --actual_net 995
```

## Troubleshooting

### Common Issues

1. **"Contract not deployed" error**
   - Check `NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID` in `.env.local`
   - Verify contract ID is correct

2. **"Insufficient balance" error**
   - Fund your testnet account with XLM
   - Use friendbot: `curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"`

3. **"Network not found" error**
   - Reconfigure Soroban: `soroban config network add testnet --rpc-url https://soroban-testnet.stellar.org:443`

4. **Build errors**
   - Update Rust: `rustup update`
   - Update Soroban SDK in `Cargo.toml`

### Verification

1. Check contract deployment:
   ```bash
   soroban contract read --id CONTRACT_ID --network testnet
   ```

2. Check contract events:
   ```bash
   soroban events --id CONTRACT_ID --network testnet
   ```

## Production Considerations

### Security
- Use proper key management for production
- Implement access controls
- Add input validation

### Performance
- Optimize contract size
- Use efficient data structures
- Consider gas costs

### Monitoring
- Set up event monitoring
- Track contract usage
- Monitor for errors

## Next Steps

1. Deploy contract to testnet
2. Test with real transactions
3. Monitor contract events
4. Deploy to mainnet (when ready)

## Support

For issues with:
- **Soroban CLI**: Check [Soroban documentation](https://soroban.stellar.org/docs)
- **Contract deployment**: Check [Stellar documentation](https://developers.stellar.org/docs)
- **This implementation**: Check the contract source code and tests
