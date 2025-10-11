# Wormhole Integration for StellarFX Shopper

This integration adds cross-chain token bridging and Generic Message Passing (GMP) capabilities to your StellarFX Shopper platform using Wormhole.

## Overview

The Wormhole integration enables:
- **Token Bridging**: Move USDC/USDT between Stellar, Solana, and Ethereum testnets
- **Cross-Chain Messaging**: Send FX route attestation data and other messages across chains
- **VAA Verification**: Handle Verifiable Action Approvals from Wormhole guardians
- **Soroban Integration**: Use VAA data in your Soroban smart contracts

## Files Created

### Core Integration
- `lib/wormhole.ts` - Main Wormhole SDK integration and utilities
- `lib/types/wormhole.ts` - TypeScript type definitions
- `lib/wormhole-examples.ts` - Usage examples and React components

### API Routes
- `app/api/wormhole/bridge/route.ts` - Token bridging endpoint
- `app/api/wormhole/message/route.ts` - Cross-chain messaging endpoint

## Quick Start

### 1. Install Dependencies

Add the Wormhole SDK to your project:

```bash
npm install @wormhole-foundation/sdk @wormhole-foundation/sdk/platforms @wormhole-foundation/sdk/relayer
```

### 2. Environment Setup

Create a `.env.local` file with your RPC endpoints:

```env
# Wormhole Testnet Configuration
WORMHOLE_NETWORK=testnet
STELLAR_RPC_URL=https://horizon-testnet.stellar.org
SOLANA_RPC_URL=https://api.testnet.solana.com
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

### 3. Basic Usage

#### Token Bridging
```typescript
import { bridgeUSDCToSolana } from '@/lib/wormhole-examples';

// Bridge 100 USDC from Stellar to Solana
const result = await bridgeUSDCToSolana();
console.log('Bridge VAA:', result.vaa);
```

#### Cross-Chain Messaging
```typescript
import { sendFXRouteAttestation } from '@/lib/wormhole-examples';

// Send FX route attestation
const attestation = await sendFXRouteAttestation({
  routeId: 'route_123',
  sourceAmount: '1000000',
  targetAmount: '995000',
  exchangeRate: '0.995',
});
```

## API Endpoints

### POST /api/wormhole/bridge

Bridge tokens between chains.

**Request:**
```json
{
  "fromChain": "stellar",
  "toChain": "solana", 
  "token": "USDC",
  "amount": "100",
  "recipientAddress": "YourSolanaWalletAddress"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "vaa": "base64-encoded-vaa",
    "sequence": "12345",
    "estimatedTime": 60
  }
}
```

### POST /api/wormhole/message

Send cross-chain messages using GMP.

**Request:**
```json
{
  "fromChain": "stellar",
  "toChain": "solana",
  "messagePayload": "{\"type\":\"fx_attestation\",\"data\":{...}}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "vaa": "base64-encoded-vaa",
    "sequence": "12345",
    "messageType": "fx_attestation",
    "payload": "{\"vaa\":\"...\",\"routeId\":\"...\"}"
  }
}
```

## Integration with Soroban

### 1. VAA Processing

Use the VAA data in your Soroban contracts:

```typescript
import { integrateWithSorobanContract } from '@/lib/wormhole-examples';

// Process VAA in Soroban contract
const contractData = await integrateWithSorobanContract(vaa, 'your-contract-address');
```

### 2. FX Route Attestation

Send FX route data as cross-chain attestations:

```typescript
// After executing FX route on Stellar
const attestationData = await sendFXRouteAttestation({
  routeId: route.id,
  sourceAmount: route.sourceAmount,
  targetAmount: route.targetAmount,
  exchangeRate: route.exchangeRate,
});

// Use attestationData.vaa in Soroban contract
```

## React Components

### TokenBridgeComponent
```tsx
import { TokenBridgeComponent } from '@/lib/wormhole-examples';

function MyPage() {
  return (
    <div>
      <h1>Cross-Chain FX Trading</h1>
      <TokenBridgeComponent />
    </div>
  );
}
```

### FXAttestationComponent
```tsx
import { FXAttestationComponent } from '@/lib/wormhole-examples';

function FXPage() {
  return (
    <div>
      <h1>FX Route Attestation</h1>
      <FXAttestationComponent />
    </div>
  );
}
```

## Configuration

### Supported Chains
- **Stellar** (testnet)
- **Solana** (testnet) 
- **Ethereum** (Sepolia testnet)

### Supported Tokens
- **USDC** - USD Coin
- **USDT** - Tether USD
- **XLM** - Stellar Lumens

### Mock Token Addresses

The integration uses mock token addresses for testing:

```typescript
// Stellar testnet
USDC: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3X3'

// Solana testnet  
USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'

// Ethereum Sepolia
USDC: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
```

## Error Handling

### Common Errors

1. **Invalid Chain**: Use supported chains only
2. **Invalid Token**: Use supported tokens only  
3. **Invalid Amount**: Must be positive number
4. **Invalid Address**: Check recipient address format
5. **Same Chain**: Cannot bridge to same chain

### Retry Logic

```typescript
import { bridgeWithRetry } from '@/lib/wormhole-examples';

// Bridge with automatic retry
const result = await bridgeWithRetry(bridgeRequest, 3);
```

## Monitoring and Status

### VAA Status Monitoring
```typescript
import { monitorVAAStatus } from '@/lib/wormhole-examples';

// Monitor VAA processing status
const status = await monitorVAAStatus(vaa);
console.log('VAA Status:', status);
```

## Security Considerations

1. **VAA Verification**: Always verify VAA signatures in production
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Don't expose sensitive error details
5. **Testnet Only**: This integration is configured for testnet only

## Testing

### Manual Testing

1. **Token Bridge Test**:
   ```bash
   curl -X POST http://localhost:3000/api/wormhole/bridge \
     -H "Content-Type: application/json" \
     -d '{"fromChain":"stellar","toChain":"solana","token":"USDC","amount":"10","recipientAddress":"test"}'
   ```

2. **Message Test**:
   ```bash
   curl -X POST http://localhost:3000/api/wormhole/message \
     -H "Content-Type: application/json" \
     -d '{"fromChain":"stellar","toChain":"solana","messagePayload":"{\"test\":\"message\"}"}'
   ```

## Documentation References

- [Wormhole Documentation](https://docs.wormhole.com)
- [Core Concepts](https://docs.wormhole.com/wormhole/explore-wormhole/core-concepts)
- [Token Bridge](https://docs.wormhole.com/wormhole/explore-wormhole/core-contracts/token-bridge)
- [Generic Message Passing](https://docs.wormhole.com/wormhole/explore-wormhole/core-contracts/generic-message-passing)
- [SDK Documentation](https://docs.wormhole.com/wormhole/explore-wormhole/sdk/typescript)
- [Testnet Contracts](https://docs.wormhole.com/wormhole/explore-wormhole/testnet/contracts)

## Next Steps

1. **Add Real RPC URLs**: Replace mock RPC URLs with actual endpoints
2. **Implement VAA Verification**: Add proper VAA signature verification
3. **Add More Chains**: Extend support to additional chains
4. **Production Configuration**: Update for mainnet deployment
5. **Monitoring**: Add comprehensive monitoring and alerting
6. **Testing**: Add unit and integration tests

## Support

For issues and questions:
- Check Wormhole documentation
- Review the example code in `lib/wormhole-examples.ts`
- Test with the provided API endpoints
- Use the React components as reference implementations
