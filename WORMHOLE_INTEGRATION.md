# Wormhole Integration for StellarFX Shopper

This integration enables cross-chain token bridging and messaging for the StellarFX Shopper platform using Wormhole's Native Token Transfers (NTT) and Generic Message Passing (GMP) frameworks.

## Overview

The integration provides:
- **Token Bridging**: Move USDC/USDT between Stellar, Solana, and Ethereum testnets
- **Cross-Chain Messaging**: Send FX route attestation data and other messages across chains
- **VAA Handling**: Retrieve and validate Verifiable Action Approvals from Wormhole guardians

## Architecture

```
Frontend (React/Next.js)
    ↓
API Routes (/api/wormhole/*)
    ↓
Wormhole SDK (lib/wormhole.ts)
    ↓
Wormhole Guardians & Relayers
    ↓
Target Chains (Stellar/Solana/Ethereum)
```

## Files Created

### Core Module
- `lib/wormhole.ts` - Main Wormhole SDK integration with utilities for bridging and messaging

### API Routes
- `app/api/wormhole/bridge/route.ts` - Token bridging endpoint
- `app/api/wormhole/message/route.ts` - Cross-chain messaging endpoint  
- `app/api/wormhole/vaa/route.ts` - VAA retrieval endpoint

### Examples
- `lib/wormhole-examples.ts` - Frontend usage examples and React components

## API Endpoints

### Token Bridge
```typescript
POST /api/wormhole/bridge
{
  "fromChain": "stellar",
  "toChain": "solana", 
  "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3A",
  "amount": "100",
  "recipientAddress": "recipient_address",
  "senderPrivateKey": "private_key"
}
```

### Cross-Chain Messaging
```typescript
POST /api/wormhole/message
{
  "fromChain": "stellar",
  "toChain": "ethereum",
  "messagePayload": "{\"routeId\":\"route_123\",\"amount\":\"100\"}",
  "senderPrivateKey": "private_key",
  "messageType": "fx_route_attestation"
}
```

### VAA Retrieval
```typescript
POST /api/wormhole/vaa
{
  "emitterAddress": "emitter_address",
  "sequence": "12345",
  "sourceChain": "stellar"
}
```

## Supported Networks

### Testnet Configuration
- **Stellar Testnet**: Horizon endpoint for Stellar operations
- **Solana Devnet**: RPC endpoint for Solana operations  
- **Ethereum Goerli**: Infura endpoint for Ethereum operations

### Token Addresses (Mock)
- **Stellar**: USDC/USDT mock addresses for testnet
- **Solana**: USDC/USDT addresses on Solana devnet
- **Ethereum**: USDC/USDT addresses on Ethereum Goerli

## Usage Examples

### Frontend Integration

```typescript
import { TokenBridgeService, CrossChainMessagingService } from '@/lib/wormhole-examples';

// Initialize services
const bridgeService = new TokenBridgeService();
const messagingService = new CrossChainMessagingService();

// Bridge tokens
const bridgeResult = await bridgeService.bridgeTokens(
  'stellar',
  'solana', 
  'token_address',
  '100',
  'recipient_address',
  'private_key'
);

// Send FX route attestation
const messageResult = await messagingService.sendFXRouteAttestation(
  'stellar',
  'ethereum',
  routeData,
  'private_key'
);
```

### Soroban Integration

The integration includes helper functions for connecting Wormhole VAAs with Soroban contracts:

```typescript
import { integrateWithSorobanAttestation } from '@/lib/wormhole';

// Process cross-chain attestation in Soroban
await integrateWithSorobanAttestation(
  vaa,
  fxRouteData,
  sorobanContractAddress
);
```

## Installation Requirements

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@wormhole-foundation/sdk": "^1.0.0",
    "ethers": "^6.0.0",
    "@solana/web3.js": "^1.0.0",
    "stellar-sdk": "^11.0.0"
  }
}
```

## Configuration

### Environment Variables
```bash
# Add to .env.local
INFURA_API_KEY=your_infura_key
STELLAR_PRIVATE_KEY=your_stellar_private_key
SOLANA_PRIVATE_KEY=your_solana_private_key
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
```

### RPC Endpoints
Update the RPC endpoints in `lib/wormhole.ts`:
```typescript
export const RPC_ENDPOINTS = {
  STELLAR: "https://horizon-testnet.stellar.org",
  SOLANA: "https://api.devnet.solana.com", 
  ETHEREUM: "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
};
```

## Workflow Example

### Complete Cross-Chain FX Flow
1. **Bridge Tokens**: Move USDC from Stellar to Solana
2. **Send Attestation**: Send FX route data from Stellar to Ethereum
3. **Poll for VAA**: Wait for guardian attestation
4. **Process in Soroban**: Validate attestation in Soroban contract

```typescript
import { completeCrossChainFXWorkflow } from '@/lib/wormhole-examples';

// Execute complete workflow
await completeCrossChainFXWorkflow();
```

## Security Considerations

- **Private Keys**: Never expose private keys in frontend code
- **VAA Validation**: Always validate VAA signatures before processing
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Error Handling**: Proper error handling for failed transactions

## Testing

### Testnet Setup
1. Fund wallets with testnet tokens
2. Deploy mock tokens on each chain
3. Test bridging and messaging flows
4. Verify VAA retrieval and validation

### Mock Implementation
The current implementation uses mock data for demonstration. Replace with actual Wormhole SDK calls for production use.

## Documentation References

- [Wormhole Documentation](https://docs.wormhole.com)
- [Native Token Transfers](https://docs.wormhole.com/products/token-transfers/native-token-transfers/)
- [Generic Message Passing](https://docs.wormhole.com/products/messaging/)
- [VAA Reference](https://docs.wormhole.com/protocol/infrastructure-components/vaas/)

## Next Steps

1. **Replace Mock Implementations**: Implement actual Wormhole SDK calls
2. **Add Error Handling**: Comprehensive error handling and retry logic
3. **Implement VAA Validation**: Add VAA signature validation
4. **Soroban Contract Integration**: Complete Soroban contract integration
5. **Production Configuration**: Update for mainnet deployment
6. **Testing**: Add comprehensive test suite
7. **Monitoring**: Add logging and monitoring for cross-chain operations

## Support

For questions about this integration:
- Check Wormhole documentation: https://docs.wormhole.com
- Review the example code in `lib/wormhole-examples.ts`
- Test with the provided API endpoints
