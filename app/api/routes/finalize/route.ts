/**
 * API Route: Finalize Route After Execution
 * 
 * POST /api/routes/finalize
 * 
 * Updates on-chain attestation after Stellar transaction completes.
 * Verifies execution and calculates variance between expected and actual amounts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { finalizeRoute } from '@/lib/soroban-integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userPublicKey,
      routeId,
      stellarTxHash,
      actualReceived,
    } = body as {
      userPublicKey: string;
      routeId: string;
      stellarTxHash: string;
      actualReceived: number;
    };

    // Validate required fields
    if (!userPublicKey || !routeId || !stellarTxHash || actualReceived === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: userPublicKey, routeId, stellarTxHash, actualReceived',
        },
        { status: 400 }
      );
    }

    // Validate Stellar public key
    if (!userPublicKey.startsWith('G') || userPublicKey.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar public key format' },
        { status: 400 }
      );
    }

    // Validate transaction hash (64-char hex)
    if (!/^[0-9a-f]{64}$/i.test(stellarTxHash)) {
      return NextResponse.json(
        { error: 'Invalid Stellar transaction hash format' },
        { status: 400 }
      );
    }

    // Validate amount
    if (actualReceived <= 0) {
      return NextResponse.json(
        { error: 'actualReceived must be positive' },
        { status: 400 }
      );
    }

    console.log('✅ Finalizing route attestation...');
    console.log('   User:', userPublicKey);
    console.log('   Route ID:', routeId);
    console.log('   TX Hash:', stellarTxHash);
    console.log('   Actual Received:', actualReceived);

    // Finalize route in smart contract
    const result = await finalizeRoute(
      userPublicKey,
      routeId,
      stellarTxHash,
      actualReceived
    );

    console.log('✅ Route finalized successfully');
    console.log('   Variance:', result.variance, `(${result.variancePct.toFixed(2)}%)`);

    return NextResponse.json({
      success: true,
      finalization: {
        routeId,
        txHash: stellarTxHash,
        actualReceived,
        expectedReceived: result.attestation.expectedNet,
        variance: result.variance,
        variancePct: result.variancePct,
        varianceBps: result.varianceBps,
        finalizedAt: result.attestation.finalizedAt,
        status: result.attestation.status,
      },
      analysis: {
        outcome:
          result.variance >= 0
            ? `✅ Better than expected (+${result.variancePct.toFixed(2)}%)`
            : `⚠️ Worse than expected (${result.variancePct.toFixed(2)}%)`,
        slippage: Math.abs(result.variancePct),
        recommendation:
          Math.abs(result.variancePct) > 5
            ? 'High slippage detected. Consider using routes with better liquidity.'
            : 'Slippage within acceptable range.',
      },
      message: 'Route execution verified and attested in smart contract',
    });
  } catch (error: unknown) {
    console.error('❌ Route finalization failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to finalize route attestation',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/routes/finalize?routeId=xxx
 * 
 * Query the status of a route attestation from smart contract
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get('routeId');

    if (!routeId) {
      return NextResponse.json(
        { error: 'Missing required parameter: routeId' },
        { status: 400 }
      );
    }

    // Query smart contract for route status
    const { getRouteAttestation } = await import('@/lib/soroban-integration');
    const attestation = await getRouteAttestation(routeId);

    if (!attestation) {
      return NextResponse.json(
        { error: 'Route not found', routeId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      route: {
        routeId: attestation.routeId,
        sender: attestation.sender,
        expectedNet: attestation.expectedNet,
        actualNet: attestation.actualNet,
        status: attestation.status,
        registeredAt: attestation.registeredAt,
        finalizedAt: attestation.finalizedAt,
        txHash: attestation.txHash,
        variancePct: attestation.variancePct,
        varianceBps: attestation.varianceBps,
        metadataCid: attestation.metadataCid,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query route status',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
