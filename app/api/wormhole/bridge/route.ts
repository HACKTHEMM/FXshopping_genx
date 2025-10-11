import { NextRequest, NextResponse } from 'next/server';
import { bridgeTokens, getRealTokenAddress, isChainSupported } from '@/lib/wormhole-real';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.fromChain || !body.toChain || !body.token || !body.amount || !body.recipientAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fromChain, toChain, token, amount, recipientAddress',
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

    // Prevent bridging to the same chain
    if (body.fromChain === body.toChain) {
      return NextResponse.json({
        success: false,
        error: 'Cannot bridge to the same chain',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // Get real token address
    const tokenAddress = getRealTokenAddress(body.fromChain, body.token);
    if (!tokenAddress) {
      return NextResponse.json({
        success: false,
        error: `Token ${body.token} not supported on ${body.fromChain}`,
        timestamp: Date.now(),
      }, { status: 400 });
    }

    console.log('Bridge request received:', body);
    
    // Use real Wormhole implementation
    const result = await bridgeTokens({
      fromChain: body.fromChain,
      toChain: body.toChain,
      token: body.token, // Use token symbol, not address
      amount: body.amount,
      recipientAddress: body.recipientAddress,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          txHash: result.txHash,
          vaa: result.vaa,
          estimatedTime: 120, // Real Wormhole takes longer
          bridgeDetails: {
            fromChain: body.fromChain,
            toChain: body.toChain,
            token: body.token,
            amount: body.amount,
            recipientAddress: body.recipientAddress,
          },
        },
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Bridge transaction failed',
        timestamp: Date.now(),
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Bridge API error:', error);
    
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