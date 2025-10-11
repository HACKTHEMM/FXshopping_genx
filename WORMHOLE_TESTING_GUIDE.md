# Wormhole Integration Testing Guide

This guide shows you how to test the Wormhole integration for your StellarFX Shopper platform.

## Prerequisites

1. **Install Dependencies**
```bash
npm install @wormhole-foundation/sdk ethers @solana/web3.js stellar-sdk
```

2. **Environment Setup**
Create a `.env.local` file with testnet credentials:
```bash
# Testnet Configuration
INFURA_API_KEY=your_infura_key_here
STELLAR_PRIVATE_KEY=your_stellar_testnet_private_key
SOLANA_PRIVATE_KEY=your_solana_devnet_private_key
ETHEREUM_PRIVATE_KEY=your_ethereum_goerli_private_key

# Testnet RPC Endpoints
STELLAR_RPC=https://horizon-testnet.stellar.org
SOLANA_RPC=https://api.devnet.solana.com
ETHEREUM_RPC=https://goerli.infura.io/v3/YOUR_INFURA_KEY
```

## Testing Methods

### 1. API Endpoint Testing

#### Test Token Bridge API
```bash
curl -X POST http://localhost:3000/api/wormhole/bridge \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": "stellar",
    "toChain": "solana",
    "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3A",
    "amount": "100",
    "recipientAddress": "recipient_address_here",
    "senderPrivateKey": "your_private_key_here"
  }'
```

#### Test Cross-Chain Messaging API
```bash
curl -X POST http://localhost:3000/api/wormhole/message \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": "stellar",
    "toChain": "ethereum",
    "messagePayload": "{\"routeId\":\"test_route_123\",\"amount\":\"100\"}",
    "senderPrivateKey": "your_private_key_here",
    "messageType": "fx_route_attestation"
  }'
```

#### Test VAA Retrieval API
```bash
curl -X POST http://localhost:3000/api/wormhole/vaa \
  -H "Content-Type: application/json" \
  -d '{
    "emitterAddress": "emitter_address_here",
    "sequence": "12345",
    "sourceChain": "stellar"
  }'
```

### 2. Frontend Testing

Create a simple test component in your Next.js app:

```typescript
// app/test-wormhole/page.tsx
'use client';

import { useState } from 'react';

export default function TestWormhole() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBridge = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wormhole/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'solana',
          token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3A',
          amount: '100',
          recipientAddress: 'test_recipient',
          senderPrivateKey: 'test_private_key'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  const testMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wormhole/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'ethereum',
          messagePayload: JSON.stringify({ routeId: 'test_123' }),
          senderPrivateKey: 'test_private_key',
          messageType: 'fx_route_attestation'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Wormhole Integration Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testBridge}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Token Bridge
        </button>
        
        <button 
          onClick={testMessage}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test Cross-Chain Message
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Result:</h3>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### 3. Unit Testing

Create a test file for the Wormhole SDK:

```typescript
// __tests__/wormhole.test.ts
import { createWormholeSDK, stringToChainId, chainIdToString } from '@/lib/wormhole';

describe('Wormhole Integration', () => {
  test('should convert chain strings to IDs', () => {
    expect(stringToChainId('stellar')).toBeDefined();
    expect(stringToChainId('solana')).toBeDefined();
    expect(stringToChainId('ethereum')).toBeDefined();
  });

  test('should convert chain IDs to strings', () => {
    expect(chainIdToString(1)).toBe('stellar');
    expect(chainIdToString(2)).toBe('solana');
    expect(chainIdToString(3)).toBe('ethereum');
  });

  test('should create Wormhole SDK instance', () => {
    const sdk = createWormholeSDK({});
    expect(sdk).toBeDefined();
  });
});
```

### 4. Integration Testing

Test the complete workflow:

```typescript
// scripts/test-wormhole-workflow.ts
import { createWormholeSDK } from '@/lib/wormhole';

async function testCompleteWorkflow() {
  console.log('🧪 Testing Wormhole Integration...');
  
  const sdk = createWormholeSDK({});
  
  try {
    // Test 1: Token Bridge
    console.log('1️⃣ Testing token bridge...');
    const bridgeResult = await sdk.bridgeTokens({
      fromChain: 1, // Stellar
      toChain: 2,   // Solana
      token: 'test_token',
      amount: '100',
      recipientAddress: 'test_recipient',
      senderPrivateKey: 'test_key'
    });
    console.log('✅ Bridge test passed:', bridgeResult);

    // Test 2: Cross-Chain Message
    console.log('2️⃣ Testing cross-chain message...');
    const messageResult = await sdk.sendGMPMessage({
      fromChain: 1, // Stellar
      toChain: 3,    // Ethereum
      messagePayload: JSON.stringify({ test: 'data' }),
      senderPrivateKey: 'test_key'
    });
    console.log('✅ Message test passed:', messageResult);

    // Test 3: VAA Retrieval
    console.log('3️⃣ Testing VAA retrieval...');
    const vaaResult = await sdk.getVAA(
      'test_emitter',
      '12345',
      1 // Stellar
    );
    console.log('✅ VAA test passed:', vaaResult);

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteWorkflow();
```

## Testnet Setup

### 1. Stellar Testnet
- Get testnet XLM from: https://www.stellar.org/laboratory/#account-creator
- Use Horizon testnet: https://horizon-testnet.stellar.org

### 2. Solana Devnet
- Get devnet SOL: `solana airdrop 2 --url devnet`
- Use devnet RPC: https://api.devnet.solana.com

### 3. Ethereum Goerli
- Get Goerli ETH from faucets
- Use Infura/Alchemy RPC endpoints

## Mock Testing

Since the current implementation uses mock data, you can test the API structure without real blockchain transactions:

```typescript
// Test with mock data
const mockBridgeRequest = {
  fromChain: 'stellar',
  toChain: 'solana',
  token: 'mock_token_address',
  amount: '100',
  recipientAddress: 'mock_recipient',
  senderPrivateKey: 'mock_private_key'
};

// This will return mock transaction data
const response = await fetch('/api/wormhole/bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(mockBridgeRequest)
});
```

## Expected Responses

### Successful Bridge Response
```json
{
  "success": true,
  "data": {
    "transactionHash": "stellar_tx_1234567890",
    "sequence": "12345",
    "emitterAddress": "emitter_address"
  },
  "message": "Token bridge initiated from stellar to solana. Transaction hash: stellar_tx_1234567890"
}
```

### Successful Message Response
```json
{
  "success": true,
  "data": {
    "transactionHash": "stellar_gmp_1234567890",
    "sequence": "67890",
    "emitterAddress": "stellar_gmp_emitter"
  },
  "message": "Cross-chain message sent from stellar to ethereum. Transaction hash: stellar_gmp_1234567890"
}
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Make sure your API routes are properly configured
2. **Private Key Issues**: Never use real private keys in tests
3. **Network Errors**: Check RPC endpoints are accessible
4. **Mock Data**: Current implementation returns mock data for testing

### Debug Mode
Add logging to see what's happening:

```typescript
// In your API routes, add:
console.log('Request body:', body);
console.log('Processing...');
console.log('Result:', result);
```

## Next Steps

1. **Replace Mock Data**: Implement actual Wormhole SDK calls
2. **Add Error Handling**: Comprehensive error handling and retry logic
3. **Real Transactions**: Test with actual testnet transactions
4. **VAA Validation**: Test VAA signature validation
5. **Soroban Integration**: Test Soroban contract integration

## Running Tests

```bash
# Start your Next.js app
npm run dev

# Test API endpoints
curl -X GET http://localhost:3000/api/wormhole/bridge
curl -X GET http://localhost:3000/api/wormhole/message
curl -X GET http://localhost:3000/api/wormhole/vaa

# Run unit tests
npm test

# Run integration tests
npx ts-node scripts/test-wormhole-workflow.ts
```

This testing approach will help you verify that your Wormhole integration is working correctly before implementing the actual blockchain transactions!
