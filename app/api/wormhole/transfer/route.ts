/**
 * Wormhole Transfer API
 * POST /api/wormhole/transfer - Initiate cross-chain transfer
 */

import { NextRequest, NextResponse } from 'next/server';
import { WormholeService } from '@/lib/wormhole/service';
import { WORMHOLE_CONFIG, getAssetBySymbol, isChainSupported } from '@/lib/wormhole/config';
import { WormholeTransferRequest } from '@/lib/wormhole/types';

// Initialize Wormhole service
const wormholeService = new WormholeService(WORMHOLE_CONFIG);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceChain, 
      destChain, 
      sourceAsset, 
      destAsset, 
      amount, 
      recipientAddress, 
      senderAddress,
      relayerFee 
    } = body;

    // Validate required fields
    if (!sourceChain || !destChain || !sourceAsset || !destAsset || !amount || !recipientAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          required: ['sourceChain', 'destChain', 'sourceAsset', 'destAsset', 'amount', 'recipientAddress']
        },
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

    // Find assets
    const sourceAssetObj = getAssetBySymbol(sourceAsset, sourceChain);
    const destAssetObj = getAssetBySymbol(destAsset, destChain);

    if (!sourceAssetObj) {
      return NextResponse.json(
        { success: false, error: `Unsupported source asset: ${sourceAsset} on ${sourceChain}` },
        { status: 400 }
      );
    }

    if (!destAssetObj) {
      return NextResponse.json(
        { success: false, error: `Unsupported destination asset: ${destAsset} on ${destChain}` },
        { status: 400 }
      );
    }

    // Build transfer request
    const transferRequest: WormholeTransferRequest = {
      sourceChain,
      destChain,
      sourceAsset: sourceAssetObj,
      destAsset: destAssetObj,
      amount,
      recipientAddress,
      senderAddress,
      relayerFee
    };

    // Initiate transfer
    const result = await wormholeService.initiateTransfer(transferRequest);
    
    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initiating Wormhole transfer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initiate transfer',
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
      error: 'Use POST method to initiate transfers',
      method: 'POST',
      requiredFields: ['sourceChain', 'destChain', 'sourceAsset', 'destAsset', 'amount', 'recipientAddress']
    },
    { status: 405 }
  );
}
