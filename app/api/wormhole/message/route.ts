import { NextRequest, NextResponse } from 'next/server';
import { sendCrossChainMessage, isChainSupported } from '@/lib/wormhole-real';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.fromChain || !body.toChain || !body.messagePayload) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fromChain, toChain, messagePayload',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // Validate chains
    if (!isChainSupported(body.fromChain) || !isChainSupported(body.toChain)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported chain. Supported chains: stellar, solana, ethereum',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // Prevent sending to the same chain
    if (body.fromChain === body.toChain) {
      return NextResponse.json({
        success: false,
        error: 'Cannot send message to the same chain',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // Validate message payload
    try {
      JSON.parse(body.messagePayload);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid message payload. Must be valid JSON',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    console.log('Message request received:', body);
    
    // Use real Wormhole implementation
    const result = await sendCrossChainMessage({
      fromChain: body.fromChain,
      toChain: body.toChain,
      messagePayload: body.messagePayload,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          txHash: result.txHash,
          vaa: result.vaa,
          sequence: result.sequence,
          estimatedTime: 90, // Real Wormhole takes longer
          messageDetails: {
            fromChain: body.fromChain,
            toChain: body.toChain,
            payloadSize: body.messagePayload.length,
          },
        },
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Message transaction failed',
        timestamp: Date.now(),
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Message API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}