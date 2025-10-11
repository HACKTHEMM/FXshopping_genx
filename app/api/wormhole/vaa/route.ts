/**
 * Wormhole VAA (Verifiable Action Approval) API Route
 * 
 * POST /api/wormhole/vaa
 * 
 * Handles VAA retrieval and validation for cross-chain operations.
 * VAAs are guardian-signed attestations that prove cross-chain message authenticity.
 * 
 * Reference: https://docs.wormhole.com/protocol/infrastructure-components/vaas/
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  createWormholeSDK, 
  VAAResult,
  CHAIN_IDS,
  stringToChainId,
  chainIdToString 
} from "@/lib/wormhole";

// Request body type for VAA retrieval
export interface VAABody {
  emitterAddress: string;
  sequence: string;
  sourceChain: string;
}

// Response type for VAA API
export interface VAAResponse {
  success: boolean;
  data?: VAAResult;
  error?: string;
  message?: string;
}

/**
 * POST /api/wormhole/vaa
 * 
 * Retrieves VAA for a specific transaction
 */
export async function POST(request: NextRequest): Promise<NextResponse<VAAResponse>> {
  try {
    // Parse request body
    const body: VAABody = await request.json();
    
    // Validate required fields
    const { emitterAddress, sequence, sourceChain } = body;
    
    if (!emitterAddress || !sequence || !sourceChain) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: emitterAddress, sequence, sourceChain",
        },
        { status: 400 }
      );
    }

    // Validate source chain ID
    let sourceChainId;
    try {
      sourceChainId = stringToChainId(sourceChain);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid source chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 400 }
      );
    }

    // Validate sequence is a positive number
    const sequenceNumber = parseInt(sequence);
    if (isNaN(sequenceNumber) || sequenceNumber < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Sequence must be a non-negative number",
        },
        { status: 400 }
      );
    }

    // Create Wormhole SDK instance
    const wormholeSDK = createWormholeSDK({});

    // Get VAA
    const vaaResult = await wormholeSDK.getVAA(
      emitterAddress,
      sequence,
      sourceChainId
    );

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: vaaResult,
        message: `VAA retrieved for emitter ${emitterAddress}, sequence ${sequence}`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("VAA API error:", error);
    
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
 * GET /api/wormhole/vaa
 * 
 * Returns information about VAAs and how to use them
 */
export async function GET(): Promise<NextResponse> {
  const vaaInfo = {
    description: "Verifiable Action Approval (VAA) - Guardian-signed attestations for cross-chain messages",
    purpose: [
      "Prove authenticity of cross-chain messages",
      "Enable trustless verification of cross-chain operations",
      "Provide cryptographic proof of message delivery",
    ],
    usage: {
      steps: [
        "1. Send cross-chain message or bridge tokens",
        "2. Get transaction hash and sequence from the operation",
        "3. Retrieve VAA using emitter address and sequence",
        "4. Validate VAA signatures against Wormhole guardians",
        "5. Extract and process message payload from VAA",
      ],
      example: {
        emitterAddress: "Emitter contract address from transaction",
        sequence: "Transaction sequence number",
        sourceChain: "Chain where the message originated",
      },
    },
    documentation: "https://docs.wormhole.com/protocol/infrastructure-components/vaas/",
  };

  return NextResponse.json(
    {
      success: true,
      data: vaaInfo,
    },
    { status: 200 }
  );
}
