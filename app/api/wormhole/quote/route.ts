/**
 * Wormhole Quote API
 * GET /api/wormhole/quote - Get quote for cross-chain transfer
 */

import { NextRequest, NextResponse } from 'next/server';
import { WormholeService } from '@/lib/wormhole/service';
import { WORMHOLE_CONFIG, getAssetBySymbol, isChainSupported } from '@/lib/wormhole/config';
import { WormholeChainId } from '@/lib/wormhole/types';

// Initialize Wormhole service
const wormholeService = new WormholeService(WORMHOLE_CONFIG);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceChain, destChain, sourceAsset, amount } = body;

    // Validate required fields
    if (!sourceChain || !destChain || !sourceAsset || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: sourceChain, destChain, sourceAsset, amount' },
        { status: 400 }
      );
    }

    if (!isChainSupported(sourceChain) || !isChainSupported(destChain)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Find source asset
    const asset = getAssetBySymbol(sourceAsset, sourceChain);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Unsupported source asset: ${sourceAsset} on ${sourceChain}` },
        { status: 400 }
      );
    }

    // Get quote
    const quote = await wormholeService.getQuote(sourceChain, destChain, asset, amount);
    
    return NextResponse.json({
      success: true,
      quote,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Wormhole quote:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get quote',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Use POST method to get quotes',
      method: 'POST',
      requiredFields: ['sourceChain', 'destChain', 'sourceAsset', 'amount']
    },
    { status: 405 }
  );
}
