/**
 * Wormhole Generic Message Passing (GMP) API Route
 * 
 * POST /api/wormhole/message
 * 
 * Handles cross-chain messaging for FX route attestation and other data
 * using Wormhole's Generic Message Passing framework.
 * 
 * Reference: https://docs.wormhole.com/products/messaging/
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  createWormholeSDK, 
  GMPMessageRequest, 
  GMPResult,
  CHAIN_IDS,
  stringToChainId,
  chainIdToString 
} from "@/lib/wormhole";

// Request body type for GMP message
export interface MessageRequestBody {
  fromChain: string;
  toChain: string;
  messagePayload: string; // JSON string or encoded data
  senderPrivateKey: string;
  messageType?: "fx_route_attestation" | "payment_confirmation" | "custom";
}

// Response type for message API
export interface MessageResponse {
  success: boolean;
  data?: GMPResult;
  error?: string;
  message?: string;
}

/**
 * POST /api/wormhole/message
 * 
 * Sends cross-chain messages using Wormhole GMP
 */
export async function POST(request: NextRequest): Promise<NextResponse<MessageResponse>> {
  try {
    // Parse request body
    const body: MessageRequestBody = await request.json();
    
    // Validate required fields
    const { fromChain, toChain, messagePayload, senderPrivateKey, messageType = "custom" } = body;
    
    if (!fromChain || !toChain || !messagePayload || !senderPrivateKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fromChain, toChain, messagePayload, senderPrivateKey",
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

    // Validate message payload
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(messagePayload);
    } catch (error) {
      // If not JSON, treat as raw string
      parsedPayload = messagePayload;
    }

    // Create Wormhole SDK instance
    const privateKeys = {
      [chainIdToString(fromChainId)]: senderPrivateKey,
    };
    
    const wormholeSDK = createWormholeSDK(privateKeys);

    // Prepare GMP message request
    const gmpRequest: GMPMessageRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      messagePayload: typeof parsedPayload === 'string' ? parsedPayload : JSON.stringify(parsedPayload),
      senderPrivateKey,
    };

    // Send GMP message
    const gmpResult = await wormholeSDK.sendGMPMessage(gmpRequest);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: gmpResult,
        message: `Cross-chain message sent from ${fromChain} to ${toChain}. Transaction hash: ${gmpResult.transactionHash}`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Message API error:", error);
    
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
 * GET /api/wormhole/message
 * 
 * Returns supported message types and examples
 */
export async function GET(): Promise<NextResponse> {
  const supportedChains = [
    { id: "stellar", name: "Stellar Testnet", chainId: CHAIN_IDS.STELLAR },
    { id: "solana", name: "Solana Devnet", chainId: CHAIN_IDS.SOLANA },
    { id: "ethereum", name: "Ethereum Goerli", chainId: CHAIN_IDS.ETHEREUM },
  ];

  const messageTypes = [
    {
      type: "fx_route_attestation",
      description: "FX route validation and attestation data",
      example: {
        routeId: "route_123",
        sourceAmount: "1000",
        targetAmount: "950",
        exchangeRate: "0.95",
        timestamp: Date.now(),
        validator: "stellar_validator_1",
      },
    },
    {
      type: "payment_confirmation",
      description: "Cross-chain payment confirmation",
      example: {
        paymentId: "payment_456",
        amount: "100",
        currency: "USDC",
        recipient: "0x123...",
        timestamp: Date.now(),
      },
    },
    {
      type: "custom",
      description: "Custom message payload",
      example: {
        data: "Any custom data structure",
        metadata: "Additional metadata",
      },
    },
  ];

  return NextResponse.json(
    {
      success: true,
      data: {
        supportedChains,
        messageTypes,
        documentation: "https://docs.wormhole.com/products/messaging/",
      },
    },
    { status: 200 }
  );
}
