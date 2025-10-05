# Soroban RouteRegistry Smart Contract

## Overview
This smart contract provides immutable route attestation and post-trade verification for StellarFX Shopper.

## Functions

### `register_route`
Registers a new route before execution.
- **Parameters:**
  - `route_id: BytesN<32>` - Unique route identifier (hash of route params)
  - `expected_net: i128` - Expected net receive amount
  - `sender: Address` - User's Stellar address
- **Returns:** `Result<(), Error>`
- **Events:** Emits `RouteRegistered(route_id, expected_net, sender, timestamp)`

### `finalize_route`
Finalizes a route after transaction completion.
- **Parameters:**
  - `route_id: BytesN<32>` - Route identifier
  - `tx_hash: BytesN<32>` - Stellar transaction hash
  - `actual_net: i128` - Actual received amount
- **Returns:** `Result<i128, Error>` - Returns variance (actual - expected)
- **Events:** Emits `RouteFinalized(route_id, variance, tx_hash)`

### `get_route`
Queries stored route data.
- **Parameters:**
  - `route_id: BytesN<32>`
- **Returns:** `Option<RouteData>`

## Data Structures

```rust
#[contracttype]
pub struct RouteData {
    pub expected_net: i128,
    pub actual_net: Option<i128>,
    pub sender: Address,
    pub registered_at: u64,
    pub finalized_at: Option<u64>,
    pub tx_hash: Option<BytesN<32>>,
    pub status: Symbol, // "registered", "finalized", "failed"
}
```

## Setup Instructions

### Prerequisites
1. Install Rust: https://www.rust-lang.org/tools/install
2. Install Soroban CLI:
   ```bash
   cargo install --locked soroban-cli
   ```
3. Configure for testnet:
   ```bash
   soroban config network add testnet \
     --rpc-url https://soroban-testnet.stellar.org:443 \
     --network-passphrase "Test SDF Network ; September 2015"
   ```

### Build Contract
```bash
cd contracts/route-registry
cargo build --target wasm32-unknown-unknown --release
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm
```

### Deploy to Testnet
```bash
# Generate contract identity (if needed)
soroban keys generate route-registry --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm \
  --source route-registry \
  --network testnet

# Save the contract ID output!
# Example: CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
```

### Set Environment Variable
Add to `.env.local`:
```
NEXT_PUBLIC_ROUTE_CONTRACT_ID=<your-contract-id>
```

## Contract Source Code

Create `contracts/route-registry/src/lib.rs`:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct RouteData {
    pub expected_net: i128,
    pub actual_net: Option<i128>,
    pub sender: Address,
    pub registered_at: u64,
    pub finalized_at: Option<u64>,
    pub tx_hash: Option<BytesN<32>>,
    pub status: Symbol,
}

const STATUS_REGISTERED: Symbol = symbol_short!("reg");
const STATUS_FINALIZED: Symbol = symbol_short!("fin");

#[contract]
pub struct RouteRegistry;

#[contractimpl]
impl RouteRegistry {
    /// Register a new route before execution
    pub fn register_route(
        env: Env,
        route_id: BytesN<32>,
        expected_net: i128,
        sender: Address,
    ) -> Result<(), Symbol> {
        sender.require_auth();

        // Check if route already exists
        let key = route_id.clone();
        if env.storage().persistent().has(&key) {
            return Err(symbol_short!("exists"));
        }

        let timestamp = env.ledger().timestamp();
        let route_data = RouteData {
            expected_net,
            actual_net: None,
            sender: sender.clone(),
            registered_at: timestamp,
            finalized_at: None,
            tx_hash: None,
            status: STATUS_REGISTERED,
        };

        env.storage().persistent().set(&key, &route_data);

        // Emit event
        env.events().publish(
            (symbol_short!("route"), symbol_short!("reg")),
            (route_id, expected_net, sender, timestamp),
        );

        Ok(())
    }

    /// Finalize a route after transaction completion
    pub fn finalize_route(
        env: Env,
        route_id: BytesN<32>,
        tx_hash: BytesN<32>,
        actual_net: i128,
    ) -> Result<i128, Symbol> {
        let key = route_id.clone();
        
        let mut route_data: RouteData = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(symbol_short!("notfound"))?;

        // Require auth from original sender
        route_data.sender.require_auth();

        // Calculate variance
        let variance = actual_net - route_data.expected_net;

        // Update route data
        route_data.actual_net = Some(actual_net);
        route_data.tx_hash = Some(tx_hash.clone());
        route_data.finalized_at = Some(env.ledger().timestamp());
        route_data.status = STATUS_FINALIZED;

        env.storage().persistent().set(&key, &route_data);

        // Emit event
        env.events().publish(
            (symbol_short!("route"), symbol_short!("fin")),
            (route_id, variance, tx_hash),
        );

        Ok(variance)
    }

    /// Query route data
    pub fn get_route(env: Env, route_id: BytesN<32>) -> Option<RouteData> {
        env.storage().persistent().get(&route_id)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{Env, Address, BytesN};

    #[test]
    fn test_register_and_finalize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RouteRegistry);
        let client = RouteRegistryClient::new(&env, &contract_id);

        let sender = Address::generate(&env);
        let route_id = BytesN::from_array(&env, &[1u8; 32]);
        let expected_net: i128 = 10000;

        // Mock authorization
        env.mock_all_auths();

        // Register route
        let result = client.register_route(&route_id, &expected_net, &sender);
        assert!(result.is_ok());

        // Query route
        let route_data = client.get_route(&route_id).unwrap();
        assert_eq!(route_data.expected_net, expected_net);
        assert_eq!(route_data.sender, sender);

        // Finalize route
        let tx_hash = BytesN::from_array(&env, &[2u8; 32]);
        let actual_net: i128 = 9950;
        let variance = client.finalize_route(&route_id, &tx_hash, &actual_net).unwrap();
        
        assert_eq!(variance, -50); // Lost 50 to slippage/fees

        // Verify finalized data
        let finalized_data = client.get_route(&route_id).unwrap();
        assert_eq!(finalized_data.actual_net.unwrap(), actual_net);
        assert_eq!(finalized_data.tx_hash.unwrap(), tx_hash);
    }
}
```

### Cargo.toml
```toml
[package]
name = "route-registry"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = "20.0.0"

[dev-dependencies]
soroban-sdk = { version = "20.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

## Integration with Frontend

### 1. Install Soroban Client
```bash
npm install soroban-client
```

### 2. Create Contract Helper
File: `lib/soroban-contract.ts`
```typescript
import { Contract, SorobanRpc } from 'soroban-client';

const CONTRACT_ID = process.env.NEXT_PUBLIC_ROUTE_CONTRACT_ID!;
const RPC_URL = 'https://soroban-testnet.stellar.org:443';

export async function registerRouteOnChain(
  routeId: string,
  expectedNet: number,
  senderAddress: string
) {
  // TODO: Build and submit contract invocation
  console.log('Registering route:', routeId, expectedNet, senderAddress);
}

export async function finalizeRouteOnChain(
  routeId: string,
  txHash: string,
  actualNet: number
) {
  // TODO: Build and submit contract invocation
  console.log('Finalizing route:', routeId, txHash, actualNet);
}
```

### 3. Add to Route Selection
When user selects a route, call `registerRouteOnChain` before transaction signing.

## Testing

Run contract tests:
```bash
cargo test
```

Invoke contract on testnet:
```bash
# Generate a route ID (32 bytes)
ROUTE_ID=$(echo -n "test-route-123" | xxd -p | head -c 64)

# Register route
soroban contract invoke \
  --id $CONTRACT_ID \
  --source route-registry \
  --network testnet \
  -- \
  register_route \
  --route_id $ROUTE_ID \
  --expected_net 10000 \
  --sender GXXXXXX...

# Query route
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_route \
  --route_id $ROUTE_ID
```

## Notes
- Contract uses persistent storage (suitable for audit trail)
- Events are emitted for off-chain indexing
- Requires sender authorization for both register and finalize
- Variance tracking helps identify slippage issues
- Can be extended with fee ledger, compliance checks, etc.

## Deployment Checklist
- [ ] Build optimized WASM
- [ ] Deploy to testnet
- [ ] Save contract ID to .env
- [ ] Test register_route invocation
- [ ] Test finalize_route invocation
- [ ] Test get_route query
- [ ] Integrate frontend calls
- [ ] Add error handling
- [ ] Document for judges (show contract ID + explorer link)
