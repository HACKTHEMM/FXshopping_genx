/**
 * Wormhole Token Bridge API Route
 * 
 * POST /api/wormhole/bridge
 * 
 * Handles token bridging between Stellar, Solana, and Ethereum testnets
 * using Wormhole's Native Token Transfers (NTT) framework.
 * 
 * Reference: https://docs.wormhole.com/products/token-transfers/native-token-transfers/
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  createWormholeSDK, 
  TokenBridgeRequest, 
  BridgeResult,
  CHAIN_IDS,
  stringToChainId,
  chainIdToString 
} from "@/lib/wormhole";

// Request body type for token bridge
export interface BridgeRequestBody {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  recipientAddress: string;
  senderPrivateKey: string;
}

// Response type for bridge API
export interface BridgeResponse {
  success: boolean;
  data?: BridgeResult;
  error?: string;
  message?: string;
}

/**
 * POST /api/wormhole/bridge
 * 
 * Bridges tokens between supported chains using Wormhole
 */
export async function POST(request: NextRequest): Promise<NextResponse<BridgeResponse>> {
  try {
    // Parse request body
    const body: BridgeRequestBody = await request.json();
    
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

    // Validate chain IDs
    let fromChainId, toChainId;
    try {
      fromChainId = stringToChainId(fromChain);
      toChainId = stringToChainId(toChain);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chain ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    // Create Wormhole SDK instance
    const privateKeys = {
      [chainIdToString(fromChainId)]: senderPrivateKey,
    };
    
    const wormholeSDK = createWormholeSDK(privateKeys);

    // Prepare bridge request
    const bridgeRequest: TokenBridgeRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      token,
      amount,
      recipientAddress,
      senderPrivateKey,
    };

    // Execute token bridge
    const bridgeResult = await wormholeSDK.bridgeTokens(bridgeRequest);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: bridgeResult,
        message: `Token bridge initiated from ${fromChain} to ${toChain}. Transaction hash: ${bridgeResult.transactionHash}`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Bridge API error:", error);
    
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
 * GET /api/wormhole/bridge
 * 
 * Returns supported chains and tokens for bridging
 */
export async function GET(): Promise<NextResponse> {
  const supportedChains = [
    { id: "stellar", name: "Stellar Testnet", chainId: CHAIN_IDS.STELLAR },
    { id: "solana", name: "Solana Devnet", chainId: CHAIN_IDS.SOLANA },
    { id: "ethereum", name: "Ethereum Goerli", chainId: CHAIN_IDS.ETHEREUM },
  ];

  const supportedTokens = {
    stellar: [
      { symbol: "USDC", address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3A" },
      { symbol: "USDT", address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3B" },
    ],
    solana: [
      { symbol: "USDC", address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
      { symbol: "USDT", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
    ],
    ethereum: [
      { symbol: "USDC", address: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F" },
      { symbol: "USDT", address: "0x509Ee0d083DdF8AC028f2a56731412edD63223B9" },
    ],
  };

  return NextResponse.json(
    {
      success: true,
      data: {
        supportedChains,
        supportedTokens,
        documentation: "https://docs.wormhole.com/products/token-transfers/native-token-transfers/",
      },
    },
    { status: 200 }
  );
}
