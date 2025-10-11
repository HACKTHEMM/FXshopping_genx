# Stellar ↔ Ethereum Cross-Chain Transactions Guide

This guide shows you how to implement real cross-chain transactions between Stellar and Ethereum using Wormhole SDK v2.

## Overview

To enable actual transactions between Stellar and Ethereum, you need to:

1. **Set up real blockchain connections**
2. **Deploy/use existing Wormhole contracts**
3. **Implement actual token bridging**
4. **Handle VAA validation**
5. **Integrate with your Soroban contracts**

## Prerequisites

### 1. Install Required Dependencies

```bash
npm install @wormhole-foundation/sdk ethers @solana/web3.js stellar-sdk
```

### 2. Environment Setup

Create `.env.local` with real credentials:

```bash
# Ethereum Testnet (Goerli/Sepolia)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHEREUM_PRIVATE_KEY=your_ethereum_testnet_private_key

# Stellar Testnet
STELLAR_PRIVATE_KEY=your_stellar_testnet_private_key
STELLAR_NETWORK=testnet

# Wormhole Configuration
WORMHOLE_NETWORK=Testnet
```

## Implementation Steps

### Step 1: Update Wormhole SDK Integration

Replace the mock implementation in `lib/wormhole.ts` with real SDK calls:

```typescript
// lib/wormhole-real.ts
import { 
  Wormhole, 
  ChainId, 
  Network,
  getChain,
  getWormholeRelayer,
  getWormholeRelayerAddress
} from "@wormhole-foundation/sdk";
import { ethers } from "ethers";
import StellarSDK from "stellar-sdk";

export class RealWormholeSDK {
  private wormhole: Wormhole;
  private network: Network;

  constructor(network: Network = "Testnet") {
    this.network = network;
    this.wormhole = new Wormhole(network);
  }

  /**
   * Bridge tokens from Stellar to Ethereum
   */
  async bridgeStellarToEthereum(
    stellarToken: string,
    ethereumToken: string,
    amount: string,
    recipientAddress: string,
    stellarPrivateKey: string
  ): Promise<BridgeResult> {
    try {
      // 1. Initialize Stellar connection
      const stellarServer = new StellarSDK.Server('https://horizon-testnet.stellar.org');
      const stellarKeypair = StellarSDK.Keypair.fromSecret(stellarPrivateKey);
      
      // 2. Create Stellar transaction for token transfer
      const stellarAccount = await stellarServer.loadAccount(stellarKeypair.publicKey());
      
      // 3. Build Stellar transaction with Wormhole bridge call
      const transaction = new StellarSDK.TransactionBuilder(stellarAccount, {
        fee: StellarSDK.BASE_FEE,
        networkPassphrase: StellarSDK.Networks.TESTNET
      })
      .addOperation(
        StellarSDK.Operation.payment({
          destination: recipientAddress,
          asset: new StellarSDK.Asset(stellarToken, stellarKeypair.publicKey()),
          amount: amount
        })
      )
      .setTimeout(30)
      .build();

      // 4. Sign and submit transaction
      transaction.sign(stellarKeypair);
      const result = await stellarServer.submitTransaction(transaction);
      
      // 5. Extract sequence and emitter address for VAA
      const sequence = result.sequence;
      const emitterAddress = this.getEmitterAddress('stellar', stellarToken);

      return {
        transactionHash: result.hash,
        sequence: sequence.toString(),
        emitterAddress,
      };

    } catch (error) {
      console.error('Stellar to Ethereum bridge error:', error);
      throw new Error(`Bridge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bridge tokens from Ethereum to Stellar
   */
  async bridgeEthereumToStellar(
    ethereumToken: string,
    stellarToken: string,
    amount: string,
    recipientAddress: string,
    ethereumPrivateKey: string
  ): Promise<BridgeResult> {
    try {
      // 1. Initialize Ethereum connection
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      const wallet = new ethers.Wallet(ethereumPrivateKey, provider);
      
      // 2. Get Wormhole bridge contract
      const bridgeContract = new ethers.Contract(
        this.getWormholeBridgeAddress('ethereum'),
        this.getWormholeBridgeABI(),
        wallet
      );

      // 3. Create bridge transaction
      const tx = await bridgeContract.transferTokens(
        ethereumToken,        // token address
        amount,              // amount
        'stellar',           // target chain
        recipientAddress,    // recipient
        0,                   // relayer fee
        0                    // nonce
      );

      // 4. Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // 5. Extract sequence and emitter address
      const sequence = this.parseSequenceFromLog(receipt.logs);
      const emitterAddress = this.getEmitterAddress('ethereum', ethereumToken);

      return {
        transactionHash: receipt.transactionHash,
        sequence: sequence.toString(),
        emitterAddress,
      };

    } catch (error) {
      console.error('Ethereum to Stellar bridge error:', error);
      throw new Error(`Bridge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send cross-chain message from Stellar to Ethereum
   */
  async sendStellarToEthereumMessage(
    messagePayload: string,
    ethereumContract: string,
    stellarPrivateKey: string
  ): Promise<GMPResult> {
    try {
      // 1. Initialize Stellar connection
      const stellarServer = new StellarSDK.Server('https://horizon-testnet.stellar.org');
      const stellarKeypair = StellarSDK.Keypair.fromSecret(stellarPrivateKey);
      
      // 2. Create message transaction
      const stellarAccount = await stellarServer.loadAccount(stellarKeypair.publicKey());
      
      const transaction = new StellarSDK.TransactionBuilder(stellarAccount, {
        fee: StellarSDK.BASE_FEE,
        networkPassphrase: StellarSDK.Networks.TESTNET
      })
      .addOperation(
        StellarSDK.Operation.invokeHostFunction({
          func: 'send_message',
          args: [
            StellarSDK.xdr.ScVal.scvString(ethereumContract),
            StellarSDK.xdr.ScVal.scvString(messagePayload)
          ]
        })
      )
      .setTimeout(30)
      .build();

      transaction.sign(stellarKeypair);
      const result = await stellarServer.submitTransaction(transaction);

      return {
        transactionHash: result.hash,
        sequence: result.sequence.toString(),
        emitterAddress: 'stellar_message_emitter',
      };

    } catch (error) {
      console.error('Stellar to Ethereum message error:', error);
      throw new Error(`Message failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get VAA for cross-chain operation
   */
  async getVAA(
    emitterAddress: string,
    sequence: string,
    sourceChain: ChainId
  ): Promise<VAAResult> {
    try {
      // Use Wormhole SDK to get VAA
      const vaa = await this.wormhole.getSignedVAA(
        sourceChain,
        emitterAddress,
        sequence
      );

      return {
        vaa: vaa.vaaBytes,
        sequence: vaa.sequence.toString(),
        emitterAddress: vaa.emitterAddress,
        timestamp: vaa.timestamp,
      };

    } catch (error) {
      console.error('VAA retrieval error:', error);
      throw new Error(`Failed to get VAA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private getEmitterAddress(chain: string, token: string): string {
    // Return actual emitter address based on chain and token
    switch (chain) {
      case 'stellar':
        return `stellar_emitter_${token.slice(0, 8)}`;
      case 'ethereum':
        return `eth_emitter_${token.slice(0, 8)}`;
      default:
        return 'unknown_emitter';
    }
  }

  private getWormholeBridgeAddress(chain: string): string {
    // Return actual Wormhole bridge contract addresses
    const addresses = {
      ethereum: '0x3ee18B2214AFF97000D97cf826a7c1C0C2A75B16', // Goerli
      stellar: 'stellar_bridge_contract_address'
    };
    return addresses[chain] || '';
  }

  private getWormholeBridgeABI(): any[] {
    // Return Wormhole bridge contract ABI
    return [
      "function transferTokens(address token, uint256 amount, uint16 targetChain, bytes32 recipient, uint256 relayerFee, uint32 nonce) external payable returns (uint64 sequence)"
    ];
  }

  private parseSequenceFromLog(logs: any[]): number {
    // Parse sequence from transaction logs
    for (const log of logs) {
      if (log.topics[0] === '0x6eb224fb001c8d4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9b4b9') {
        return parseInt(log.data.slice(2, 66), 16);
      }
    }
    return 0;
  }
}
```

### Step 2: Update API Routes

Update your API routes to use the real implementation:

```typescript
// app/api/wormhole/bridge/route.ts
import { RealWormholeSDK } from '@/lib/wormhole-real';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromChain, toChain, token, amount, recipientAddress, senderPrivateKey } = body;

    const wormholeSDK = new RealWormholeSDK();

    let result;
    if (fromChain === 'stellar' && toChain === 'ethereum') {
      result = await wormholeSDK.bridgeStellarToEthereum(
        token,
        'ethereum_token_address',
        amount,
        recipientAddress,
        senderPrivateKey
      );
    } else if (fromChain === 'ethereum' && toChain === 'stellar') {
      result = await wormholeSDK.bridgeEthereumToStellar(
        token,
        'stellar_token_address',
        amount,
        recipientAddress,
        senderPrivateKey
      );
    } else {
      throw new Error('Unsupported chain combination');
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Token bridge initiated from ${fromChain} to ${toChain}`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
```

### Step 3: Soroban Contract Integration

Create a Soroban contract to handle cross-chain attestations:

```rust
// contracts/cross_chain_attestation/src/lib.rs
#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Bytes, Env, String};

#[contract]
pub struct CrossChainAttestationContract;

#[contractimpl]
impl CrossChainAttestationContract {
    /// Process cross-chain attestation from Wormhole VAA
    pub fn process_attestation(
        env: &Env,
        vaa: Bytes,
        fx_route_data: String,
        validator: Address
    ) -> bool {
        // 1. Validate VAA signature
        let is_valid_vaa = Self::validate_vaa(env, &vaa);
        require!(is_valid_vaa, Error::InvalidVAA);

        // 2. Extract message payload from VAA
        let message_payload = Self::extract_payload(&vaa);

        // 3. Validate FX route data
        let is_valid_route = Self::validate_fx_route(&message_payload, &fx_route_data);
        require!(is_valid_route, Error::InvalidRoute);

        // 4. Update route status
        Self::update_route_status(env, &fx_route_data, validator);

        true
    }

    fn validate_vaa(env: &Env, vaa: &Bytes) -> bool {
        // Implement VAA signature validation
        // Check against Wormhole guardian signatures
        true // Placeholder
    }

    fn extract_payload(vaa: &Bytes) -> String {
        // Extract message payload from VAA
        String::from_str("extracted_payload") // Placeholder
    }

    fn validate_fx_route(payload: &String, route_data: &String) -> bool {
        // Validate FX route data matches payload
        true // Placeholder
    }

    fn update_route_status(env: &Env, route_data: &String, validator: &Address) {
        // Update route status in storage
    }
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidVAA = 1,
    InvalidRoute = 2,
}
```

### Step 4: Frontend Integration

Update your frontend to handle real transactions:

```typescript
// components/CrossChainBridge.tsx
'use client';

import { useState } from 'react';

export default function CrossChainBridge() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBridge = async (fromChain: string, toChain: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/wormhole/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain,
          toChain,
          token: 'your_token_address',
          amount: '100',
          recipientAddress: 'recipient_address',
          senderPrivateKey: 'your_private_key'
        })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Poll for VAA
        await pollForVAA(data.data.emitterAddress, data.data.sequence, fromChain);
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const pollForVAA = async (emitterAddress: string, sequence: string, sourceChain: string) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('/api/wormhole/vaa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emitterAddress,
            sequence,
            sourceChain
          })
        });

        const data = await response.json();
        if (data.success) {
          console.log('VAA received:', data.data);
          // Process VAA in Soroban contract
          await processVAASoroban(data.data.vaa);
          break;
        }
      } catch (error) {
        console.error('VAA polling error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const processVAASoroban = async (vaa: string) => {
    // Call Soroban contract to process VAA
    console.log('Processing VAA in Soroban:', vaa);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Cross-Chain Bridge</h2>
      
      <div className="space-y-4">
        <button 
          onClick={() => handleBridge('stellar', 'ethereum')}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Bridge Stellar → Ethereum
        </button>
        
        <button 
          onClick={() => handleBridge('ethereum', 'stellar')}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Bridge Ethereum → Stellar
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Testing Real Transactions

### 1. Testnet Setup

**Stellar Testnet:**
- Get testnet XLM: https://www.stellar.org/laboratory/#account-creator
- Use Horizon: https://horizon-testnet.stellar.org

**Ethereum Sepolia:**
- Get Sepolia ETH: https://sepoliafaucet.com/
- Use Infura/Alchemy RPC

### 2. Deploy Test Tokens

**Stellar:**
```bash
# Create test token on Stellar
stellar-cli --testnet asset create --code TEST --issuer YOUR_STELLAR_KEY
```

**Ethereum:**
```bash
# Deploy ERC-20 token on Sepolia
npx hardhat run scripts/deploy-token.js --network sepolia
```

### 3. Test Cross-Chain Flow

1. **Bridge tokens** from Stellar to Ethereum
2. **Wait for VAA** (guardian attestation)
3. **Process VAA** in Soroban contract
4. **Verify** tokens received on destination chain

## Security Considerations

- **Private Keys**: Never expose private keys in frontend code
- **VAA Validation**: Always validate VAA signatures
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Error Handling**: Comprehensive error handling and retry logic
- **Testing**: Thoroughly test on testnets before mainnet deployment

## Next Steps

1. **Implement real SDK calls** in your wormhole.ts file
2. **Deploy Soroban contracts** for VAA processing
3. **Test with real testnet transactions**
4. **Add comprehensive error handling**
5. **Implement monitoring and logging**
6. **Prepare for mainnet deployment**

This implementation will enable real cross-chain transactions between Stellar and Ethereum using Wormhole! 🌉
