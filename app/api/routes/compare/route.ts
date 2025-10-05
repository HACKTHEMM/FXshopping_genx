import { NextRequest, NextResponse } from 'next/server';
import { 
  RouteQuote, 
  RouteLeg, 
  RouteComparisonResponse,
  RouteFee,
  StellarAsset 
} from '@/lib/types/route';

/**
 * Route Comparison & Optimization API
 * Aggregates on-chain paths and off-chain provider quotes
 * Ranks routes by net payout and calculates savings
 * POST /api/routes/compare
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Helper to calculate risk score based on route characteristics
function calculateRiskScore(
  hops: number,
  liquidityDepth: number = 1000,
  providerReliability: number = 0.9,
  estimatedTime: number = 5
): number {
  // More hops = higher risk
  const hopRisk = Math.min(hops / 5, 0.4);
  
  // Lower liquidity = higher risk
  const liquidityRisk = liquidityDepth < 1000 ? 0.3 : liquidityDepth < 10000 ? 0.15 : 0.05;
  
  // Lower reliability = higher risk
  const reliabilityRisk = (1 - providerReliability) * 0.3;
  
  // Longer time = slight risk increase
  const timeRisk = Math.min(estimatedTime / 86400, 0.15); // Max 15% for 24h+
  
  return Math.min(hopRisk + liquidityRisk + reliabilityRisk + timeRisk, 1);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      sourceAsset,
      destAsset,
      sendAmount,
      senderAddress,
      destinationAddress,
      sourceFiat,
      destFiat,
    } = body;

    if (!sourceAsset || !destAsset || !sendAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceAsset, destAsset, sendAmount' },
        { status: 400 }
      );
    }

    const routes: RouteQuote[] = [];
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 1. Fetch off-chain provider quotes (if fiat currencies are involved)
    if (sourceFiat && destFiat) {
      try {
        const quotesUrl = `${request.nextUrl.origin}/api/quotes?from=${sourceFiat}&to=${destFiat}&amount=${sendAmount}`;
        const quotesResponse = await fetch(quotesUrl);
        
        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json();
          
          // Convert provider quotes to RouteQuote format
          for (const quote of quotesData.quotes || []) {
            const legs: RouteLeg[] = [];
            
            // Simulate deposit leg (fiat → token)
            if (sourceFiat !== sourceAsset.code) {
              legs.push({
                type: 'anchor-deposit',
                from: `${sourceFiat} (Bank)`,
                to: sourceAsset.code,
                rate: 1, // 1:1 for tokenized fiat
                estSeconds: 300, // 5 min deposit
                fees: [{
                  kind: 'anchor_deposit',
                  amount: 0,
                  asset: sourceAsset.code,
                  note: 'Simulated deposit (no fee in demo)',
                }],
                provider: 'Anchor (Simulated)',
              });
            }
            
            // Main exchange leg
            legs.push({
              type: 'offchain-quote',
              from: sourceAsset.code,
              to: destAsset.code,
              rate: quote.exchangeRate,
              estSeconds: quote.estimatedTime,
              fees: quote.fees,
              provider: quote.providerName,
            });
            
            // Simulate withdrawal leg (token → fiat)
            if (destFiat !== destAsset.code) {
              const withdrawalFee = quote.receiveAmount * 0.005; // 0.5% withdrawal fee
              legs.push({
                type: 'anchor-withdraw',
                from: destAsset.code,
                to: `${destFiat} (Bank)`,
                rate: 1,
                estSeconds: 3600, // 1 hour withdrawal
                fees: [{
                  kind: 'anchor_withdrawal',
                  amount: withdrawalFee,
                  asset: destFiat,
                  note: 'Bank withdrawal fee (0.5%)',
                }],
                provider: 'Anchor (Simulated)',
              });
            }

            const totalFees = legs.reduce((sum, leg) => 
              sum + leg.fees.reduce((feeSum, fee) => feeSum + fee.amount, 0), 0
            );

            const netReceive = quote.receiveAmount - (legs[legs.length - 1]?.type === 'anchor-withdraw' 
              ? legs[legs.length - 1].fees[0]?.amount || 0 
              : 0);

            const route: RouteQuote = {
              routeId: `route-${quote.providerId}-${requestId}`,
              sendAsset: sourceAsset,
              destAsset: destAsset,
              sourceFiat,
              destinationFiat: destFiat,
              grossSend: sendAmount,
              legs,
              totalFees,
              netReceive: parseFloat(netReceive.toFixed(2)),
              effectiveRate: netReceive / sendAmount,
              riskScore: calculateRiskScore(
                legs.length,
                10000,
                quote.providerId === 'stellar-onchain' ? 0.99 : 0.9,
                quote.estimatedTime
              ),
              slippagePct: 0.5, // 0.5% slippage buffer
              execution: {
                canBuildXDR: quote.providerId === 'stellar-onchain',
                contractAttestationSupported: true,
                requiresKYC: quote.providerId !== 'stellar-onchain',
                estimatedConfirmationTime: quote.estimatedTime,
              },
              providerName: quote.providerName,
              createdAt: new Date(),
            };

            routes.push(route);
          }
        }
      } catch (error) {
        console.error('Error fetching provider quotes:', error);
      }
    }

    // 2. Fetch on-chain Stellar path payments
    try {
      const sourceAssetStr = sourceAsset.issuer 
        ? `${sourceAsset.code}:${sourceAsset.issuer}`
        : 'XLM';
      const destAssetStr = destAsset.issuer
        ? `${destAsset.code}:${destAsset.issuer}`
        : 'XLM';

      const pathsUrl = `${request.nextUrl.origin}/api/stellar/find-paths?sourceAsset=${sourceAssetStr}&destAsset=${destAssetStr}&amount=${sendAmount}&type=send${destinationAddress ? `&destAccount=${destinationAddress}` : ''}`;
      
      const pathsResponse = await fetch(pathsUrl);
      
      if (pathsResponse.ok) {
        const pathsData = await pathsResponse.json();
        
        // Convert Stellar paths to RouteQuote format
        for (const path of (pathsData.paths || []).slice(0, 3)) { // Limit to top 3 paths
          const legs: RouteLeg[] = [];
          
          // Create legs for each hop in the path
          const allAssets = [
            path.source,
            ...path.path,
            path.destination,
          ];

          for (let i = 0; i < allAssets.length - 1; i++) {
            const fromAsset = allAssets[i];
            const toAsset = allAssets[i + 1];
            
            legs.push({
              type: 'onchain-path',
              from: fromAsset.code,
              to: toAsset.code,
              rate: i === 0 ? path.effectiveRate : 1, // Simplified
              estSeconds: 5, // Stellar confirmation time
              fees: i === 0 ? [{
                kind: 'network',
                amount: 0.00001, // Base fee in XLM
                asset: 'XLM',
                note: 'Stellar network fee',
              }] : [],
              provider: 'Stellar Network',
            });
          }

          const totalFees = 0.00001; // Minimal Stellar fee
          const slippageBuffer = path.destination.amount * 0.005; // 0.5%
          const netReceive = path.destination.amount - slippageBuffer;

          const route: RouteQuote = {
            routeId: `route-stellar-${path.pathId}-${requestId}`,
            sendAsset: sourceAsset,
            destAsset: destAsset,
            sourceFiat,
            destinationFiat: destFiat,
            grossSend: sendAmount,
            legs,
            totalFees,
            netReceive: parseFloat(netReceive.toFixed(6)),
            effectiveRate: netReceive / sendAmount,
            riskScore: calculateRiskScore(path.hops, 50000, 0.99, 5),
            slippagePct: 0.5,
            execution: {
              canBuildXDR: true,
              contractAttestationSupported: true,
              requiresKYC: false,
              estimatedConfirmationTime: 5,
            },
            providerName: `Stellar Path (${path.hops} hops)`,
            references: {
              horizonPathId: path.pathId,
            },
            createdAt: new Date(),
          };

          routes.push(route);
        }
      }
    } catch (error) {
      console.error('Error fetching Stellar paths:', error);
    }

    // 3. Sort routes by netReceive (best first)
    routes.sort((a, b) => b.netReceive - a.netReceive);

    // 4. Calculate savings vs baseline (worst route)
    const bestRoute = routes[0];
    const worstRoute = routes[routes.length - 1];
    
    if (bestRoute && worstRoute) {
      routes.forEach(route => {
        route.savingsVsBaseline = route.netReceive - worstRoute.netReceive;
      });
    }

    // 5. Calculate average effective rate
    const averageEffectiveRate = routes.length > 0
      ? routes.reduce((sum, r) => sum + r.effectiveRate, 0) / routes.length
      : 0;

    const response: RouteComparisonResponse = {
      routes,
      bestRoute,
      worstRoute,
      averageEffectiveRate,
      requestId,
      timestamp: new Date(),
    };

    return NextResponse.json({
      success: true,
      ...response,
    });

  } catch (error: any) {
    console.error('Route comparison error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
