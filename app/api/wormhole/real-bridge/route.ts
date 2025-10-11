/**
 * Real Wormhole Bridge API Route
 * 
 * POST /api/wormhole/real-bridge
 * 
 * This route implements actual cross-chain transactions between Stellar and Ethereum
 * using the real Wormhole SDK implementation.
 */

import { NextRequest, NextResponse } from "next/server";
import { RealWormholeBridge } from "@/lib/wormhole";

// Request body type for real bridge
export interface RealBridgeRequestBody {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  recipientAddress: string;
  senderPrivateKey: string;
}

// Response type for real bridge
export interface RealBridgeResponse {
  success: boolean;
  data?: {
    transactionHash: string;
    sequence: string;
    emitterAddress: string;
    vaa?: string;
  };
  error?: string;
  message?: string;
}

/**
 * POST /api/wormhole/real-bridge
 * 
 * Executes real cross-chain transactions between Stellar and Ethereum
 */
export async function POST(request: NextRequest): Promise<NextResponse<RealBridgeResponse>> {
  try {
    // Parse request body
    const body: RealBridgeRequestBody = await request.json();
    
    // Validate required fields
    const { fromChain, toChain, token, amount, recipientAddress, senderPrivateKey } = body;
    
    if (!fromChain || !toChain || !token || !amount || !recipientAddress || !senderPrivateKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fromChain, toChain, token, amount, recipientAddress, senderPrivateKey",
        },
        { status: 400 }
      );
    }

    // Validate chain combination
    if (!((fromChain === 'stellar' && toChain === 'ethereum') || 
          (fromChain === 'ethereum' && toChain === 'stellar'))) {
      return NextResponse.json(
        {
          success: false,
          error: "Only Stellar ↔ Ethereum bridges are supported",
        },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number",
        },
        { status: 400 }
      );
    }

    // Create real Wormhole bridge instance
    const bridge = new RealWormholeBridge();

    let result;
    
    if (fromChain === 'stellar' && toChain === 'ethereum') {
      // Bridge from Stellar to Ethereum
      result = await bridge.bridgeStellarToEthereum(
        token,
        '0x1234567890123456789012345678901234567890', // Mock Ethereum token - replace with real
        amount,
        recipientAddress,
        senderPrivateKey
      );
    } else {
      // Bridge from Ethereum to Stellar
      result = await bridge.bridgeEthereumToStellar(
        token,
        'XLM', // Mock Stellar token - replace with real
        amount,
        recipientAddress,
        senderPrivateKey
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Real cross-chain bridge initiated from ${fromChain} to ${toChain}. Transaction hash: ${result.transactionHash}`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Real bridge API error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wormhole/real-bridge
 * 
 * Returns information about real cross-chain bridging
 */
export async function GET(): Promise<NextResponse> {
  const bridgeInfo = {
    description: "Real cross-chain bridge between Stellar and Ethereum using Wormhole",
    supportedChains: [
      { 
        id: "stellar", 
        name: "Stellar Testnet", 
        tokens: ["XLM", "USDC", "USDT"],
        bridgeAddress: "stellar_bridge_contract_address"
      },
      { 
        id: "ethereum", 
        name: "Ethereum Goerli/Sepolia", 
        tokens: ["ETH", "USDC", "USDT"],
        bridgeAddress: "0x706abc4E45D419950511e474C7B9Ed348A4f716f"
      }
    ],
    requirements: [
      "Valid private keys for both chains",
      "Sufficient balance for transaction fees",
      "Proper token addresses",
      "Valid recipient addresses"
    ],
    process: [
      "1. Submit bridge transaction on source chain",
      "2. Wait for Wormhole guardians to attest",
      "3. Retrieve VAA (Verifiable Action Approval)",
      "4. Process VAA on destination chain",
      "5. Complete token transfer"
    ],
    documentation: "https://docs.wormhole.com/products/token-transfers/native-token-transfers/",
    warning: "This uses real blockchain transactions. Test thoroughly on testnets before mainnet use."
  };

  return NextResponse.json(
    {
      success: true,
      data: bridgeInfo,
    },
    { status: 200 }
  );
}
