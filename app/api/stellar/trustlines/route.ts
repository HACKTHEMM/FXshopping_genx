/**
 * Stellar Trustline API
 * Handles trustline creation for Wormhole assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createAllTrustlines, 
  createSingleTrustline, 
  checkMissingTrustlines,
  getAllSupportedAssets 
} from '@/lib/stellar-trustlines';

/**
 * POST /api/stellar/trustlines
 * Create trustlines for all supported assets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPublicKey, assetCode, issuer } = body;

    if (!userPublicKey) {
      return NextResponse.json(
        { success: false, error: 'User public key is required' },
        { status: 400 }
      );
    }

    // Create single trustline if assetCode and issuer provided
    if (assetCode && issuer) {
      const result = await createSingleTrustline(userPublicKey, assetCode, issuer);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Trustline transaction created',
          xdr: result.xdr,
          needsSigning: true
        });
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
    }

    // Create all trustlines
    const result = await createAllTrustlines(userPublicKey);
    
    return NextResponse.json({
      success: result.success,
      message: 'Trustline transactions created',
      results: result.results,
      needsSigning: true
    });

  } catch (error) {
    console.error('Error creating trustlines:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stellar/trustlines?userPublicKey=...
 * Check which trustlines are missing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userPublicKey = searchParams.get('userPublicKey');

    if (!userPublicKey) {
      return NextResponse.json(
        { success: false, error: 'User public key is required' },
        { status: 400 }
      );
    }

    const result = await checkMissingTrustlines(userPublicKey);
    const allAssets = getAllSupportedAssets();
    
    return NextResponse.json({
      success: true,
      userPublicKey,
      missing: result.missing,
      existing: result.existing,
      totalAssets: allAssets.length,
      missingCount: result.missing.length,
      existingCount: result.existing.length
    });

  } catch (error) {
    console.error('Error checking trustlines:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
