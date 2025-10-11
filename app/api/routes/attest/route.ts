/**
 * API Route: Attest Route Before Execution
 * 
 * POST /api/routes/attest
 * 
 * Creates an immutable on-chain attestation for a selected route
 * before executing the transaction. Implements hybrid storage:
 * - Critical data → On-chain (Soroban)
 * - Full metadata → Off-chain (IPFS/Arweave)
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerRoute } from '@/lib/soroban-integration';
import { RouteMetadata } from '@/lib/offchain-storage';
import { RouteQuote } from '@/lib/types/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userPublicKey,
      route,
      userContext,
      compliance,
      execution,
    } = body as {
      userPublicKey: string;
      route: RouteQuote;
      userContext?: {
        destinationAddress?: string;
        userAgent?: string;
      };
      compliance?: {
        kycStatus?: 'verified' | 'pending' | 'not_required';
        jurisdiction?: string;
        sanctions_check_passed?: boolean;
      };
      execution?: {
        maxSlippagePct?: number;
        preferredSpeed?: 'instant' | 'fast' | 'economy';
      };
    };

    // Validate required fields
    if (!userPublicKey || !route) {
      return NextResponse.json(
        { error: 'Missing required fields: userPublicKey, route' },
        { status: 400 }
      );
    }

    // Validate Stellar public key format
    if (!userPublicKey.startsWith('G') || userPublicKey.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar public key format' },
        { status: 400 }
      );
    }

    // Build comprehensive metadata for off-chain storage
    const metadata: RouteMetadata = {
      routeQuote: route,
      userContext: {
        senderAddress: userPublicKey,
        destinationAddress: userContext?.destinationAddress,
        userAgent: userContext?.userAgent || request.headers.get('user-agent') || 'unknown',
        // Hash IP for privacy (don't store raw IP)
        ipAddress: await hashIP(request.headers.get('x-forwarded-for') || 'unknown'),
        timestamp: new Date().toISOString(),
      },
      compliance: {
        kycStatus: compliance?.kycStatus || 'not_required',
        jurisdiction: compliance?.jurisdiction,
        sanctions_check_passed: compliance?.sanctions_check_passed ?? true,
      },
      execution: {
        quoteExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
        maxSlippagePct: execution?.maxSlippagePct || 5,
        preferredSpeed: execution?.preferredSpeed || 'fast',
      },
      providerData: {
        providerQuotes: route.legs
          .filter(leg => leg.provider)
          .map(leg => ({
            provider: leg.provider || 'unknown',
            rawQuote: { leg }, // Store leg details as raw quote
            timestamp: new Date().toISOString(),
          })),
      },
      version: '1.0',
    };

    console.log('📝 Creating route attestation...');
    console.log('   User:', userPublicKey);
    console.log('   Route:', route.routeId);
    console.log('   Expected Receive:', route.netReceive, route.destAsset.code);

    // Register route on-chain with smart contract
    const result = await registerRoute(userPublicKey, route, metadata);

    console.log('✅ Route attested successfully');
    console.log('   Attestation ID:', result.routeId);
    console.log('   IPFS CID:', result.ipfsCid);
    console.log('   Content Hash:', result.contentHash);

    return NextResponse.json({
      success: true,
      attestation: {
        routeId: result.routeId,
        ipfsCid: result.ipfsCid,
        contentHash: result.contentHash,
        expectedNet: route.netReceive,
        registeredAt: result.attestation.registeredAt,
        status: result.attestation.status,
        sender: result.attestation.sender,
      },
      message: 'Route attestation created successfully in smart contract',
      nextSteps: [
        'Execute the Stellar path payment transaction',
        'Call /api/routes/finalize with tx hash after completion',
      ],
    });
  } catch (error: unknown) {
    console.error('❌ Route attestation failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create route attestation',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Hash IP address for privacy
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
