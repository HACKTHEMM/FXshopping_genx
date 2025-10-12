/**
 * Wormhole API Routes
 * Handles cross-chain bridge operations and route discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { WormholeService } from '@/lib/wormhole/service';
import { WORMHOLE_CONFIG, getAssetBySymbol, isChainSupported } from '@/lib/wormhole/config';
import { WormholeChainId, WormholeTransferRequest } from '@/lib/wormhole/types';

// Initialize Wormhole service
const wormholeService = new WormholeService(WORMHOLE_CONFIG);

// Helper function to get chain name
function getChainName(chainId: WormholeChainId): string {
  const names: Record<WormholeChainId, string> = {
    ethereum: 'Ethereum',
    solana: 'Solana',
    polygon: 'Polygon',
    avalanche: 'Avalanche',
    bsc: 'BSC',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    base: 'Base',
    stellar: 'Stellar'
  };
  return names[chainId] || chainId;
}

/**
 * GET /api/wormhole
 * Get supported chains and assets based on query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') as WormholeChainId;
    const address = searchParams.get('address');
    const txHash = searchParams.get('txHash');
    const sequence = searchParams.get('sequence');

    // Handle different GET endpoints based on parameters
    
    // Get transfer status
    if (txHash) {
      if (!txHash) {
        return NextResponse.json(
          { success: false, error: 'Transaction hash is required' },
          { status: 400 }
        );
      }

      const status = await wormholeService.getTransferStatus(txHash, sequence || undefined);
      
      return NextResponse.json({
        success: true,
        status
      });
    }

    // Get balances
    if (address) {
      if (!address) {
        return NextResponse.json(
          { success: false, error: 'Address is required' },
          { status: 400 }
        );
      }

      if (chainId && !isChainSupported(chainId)) {
        return NextResponse.json(
          { success: false, error: 'Unsupported chain' },
          { status: 400 }
        );
      }

      const balances = await wormholeService.getBalances(address, chainId);
      
      return NextResponse.json({
        success: true,
        address,
        chainId: chainId || 'all',
        balances
      });
    }

    // Get assets for specific chain
    if (chainId) {
      if (!isChainSupported(chainId)) {
        return NextResponse.json(
          { success: false, error: 'Unsupported chain' },
          { status: 400 }
        );
      }

      const assets = wormholeService.getSupportedAssets(chainId);
      
      return NextResponse.json({
        success: true,
        chainId,
        assets
      });
    }

    // Default: Get all supported chains
    const chains = wormholeService.getSupportedChains();
    
    return NextResponse.json({
      success: true,
      chains: chains.map(chainId => ({
        chainId,
        name: getChainName(chainId),
        config: WORMHOLE_CONFIG.chains[chainId]
      }))
    });

  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wormhole
 * Handle quotes, routes, and transfers based on request body
 */
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
      action 
    } = body;

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

    // Find source asset
    const asset = getAssetBySymbol(sourceAsset, sourceChain);
    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Unsupported source asset: ${sourceAsset} on ${sourceChain}` },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'transfer') {
      // Initiate transfer
      if (!destAsset || !recipientAddress) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields for transfer: destAsset, recipientAddress' },
          { status: 400 }
        );
      }

      const destAssetObj = getAssetBySymbol(destAsset, destChain);
      if (!destAssetObj) {
        return NextResponse.json(
          { success: false, error: `Unsupported destination asset: ${destAsset} on ${destChain}` },
          { status: 400 }
        );
      }

      const transferRequest: WormholeTransferRequest = {
        sourceChain,
        destChain,
        sourceAsset: asset,
        destAsset: destAssetObj,
        amount,
        recipientAddress,
        senderAddress
      };

      const result = await wormholeService.initiateTransfer(transferRequest);
      
      return NextResponse.json({
        success: result.success,
        result
      });
    }

    if (action === 'routes') {
      // Get multiple routes
      const routes = await wormholeService.getRoutes(sourceChain, destChain, asset, amount);
      
      return NextResponse.json({
        success: true,
        routes,
        count: routes.length
      });
    }

    // Default: Get single quote
    const quote = await wormholeService.getQuote(sourceChain, destChain, asset, amount);
    
    return NextResponse.json({
      success: true,
      quote
    });

  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}
