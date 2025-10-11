# Route Registry Soroban Contract

This directory contains the Soroban smart contract for route registration and attestation in the StellarFX Shopper project.

## Contract Functions

### Core Functions

- **`register_route()`** - Register a new route before execution
- **`execute_route()`** - Mark route as executing with validation
- **`finalize_route()`** - Finalize route after transaction completion
- **`get_route()`** - Query route data by ID
- **`get_user_routes()`** - Get all routes for a specific user
- **`fail_route()`** - Mark route as failed with error reason

### Admin Functions

- **`update_currency_rate()`** - Update exchange rates (admin only)
- **`get_currency_rate()`** - Get current exchange rate
- **`get_route_count()`** - Get total number of routes

## Data Structures

### RouteData
- `route_id`: Unique identifier
- `source_asset`: Source currency/asset
- `dest_asset`: Destination currency/asset
- `expected_net`: Expected receive amount
- `actual_net`: Actual received amount (after execution)
- `sender`: User's Stellar address
- `status`: Route status (registered, executing, finalized, failed)
- `route_legs`: Detailed route path information

### RouteLeg
- `leg_type`: Type of route leg (onchain-path, offchain-quote, etc.)
- `from_asset`: Source asset for this leg
- `to_asset`: Destination asset for this leg
- `rate`: Exchange rate for this leg
- `provider`: Provider name

## Events

The contract emits events for:
- Route registration
- Route execution start
- Route finalization
- Route failure
- Currency rate updates

## Building

Use the provided scripts to build the contract:

```bash
# Linux/Mac
./scripts/build-contract.sh

# Windows PowerShell
./scripts/build-contract.ps1
```

## Deployment

Deploy to Stellar testnet:

```bash
# Linux/Mac
./scripts/deploy-contract.sh

# Windows PowerShell
./scripts/deploy-contract.ps1
```

After deployment, add the contract ID to your `.env.local` file:
```
NEXT_PUBLIC_ROUTE_CONTRACT_ID=<your-contract-id>
```