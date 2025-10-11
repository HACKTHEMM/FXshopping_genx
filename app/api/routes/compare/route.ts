import { NextRequest, NextResponse } from 'next/server';
import {
  RouteQuote,
  RouteLeg,
  RouteComparisonResponse,
  RouteFee,
  StellarAsset
} from '@/lib/types/route';
import { anchorSimulator } from '@/lib/anchor-simulation';

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

    // Store rate metadata from quotes API
    let rateMetadata: any = null;

    // 1. Fetch off-chain provider quotes (if fiat currencies are involved)
    if (sourceFiat && destFiat) {
      try {
        const quotesUrl = `${request.nextUrl.origin}/api/quotes?from=${sourceFiat}&to=${destFiat}&amount=${sendAmount}`;
        const quotesResponse = await fetch(quotesUrl);

        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json();

          // Capture rate metadata
          rateMetadata = {
            rateSource: quotesData.rateSource,
            rateTimestamp: quotesData.rateTimestamp,
            baseRate: quotesData.baseRate,
          };
          
          // Convert provider quotes to RouteQuote format
          for (const quote of quotesData.quotes || []) {
            const legs: RouteLeg[] = [];
            let currentAmount = sendAmount;

            // Step 1: Deposit leg (fiat → token) using anchor simulator
            if (sourceFiat !== sourceAsset.code) {
              const depositSim = await anchorSimulator.simulateDeposit(
                sourceFiat,
                sourceAsset.code,
                currentAmount
              );

              legs.push({
                type: 'anchor-deposit',
                from: `${sourceFiat} (Bank Account)`,
                to: `${sourceAsset.code} (Stellar)`,
                rate: 1, // 1:1 for tokenized fiat
                estSeconds: depositSim.estimatedTime,
                fees: [{
                  kind: 'anchor_deposit',
                  amount: depositSim.fees.deposit,
                  asset: sourceFiat,
                  note: `Anchor deposit fee (${(depositSim.fees.deposit / sendAmount * 100).toFixed(2)}%)`,
                }],
                provider: 'Stellar Anchor (Simulated)',
              });

              currentAmount = depositSim.tokenAmount;
            }
            
            // Step 2: Main exchange leg (token → token or off-chain quote)
            legs.push({
              type: 'offchain-quote',
              from: sourceAsset.code,
              to: destAsset.code,
              rate: quote.exchangeRate,
              estSeconds: quote.estimatedTime,
              fees: quote.fees,
              provider: quote.providerName,
            });

            currentAmount = quote.receiveAmount;

            // Step 3: Withdrawal leg (token → fiat) using anchor simulator
            if (destFiat !== destAsset.code) {
              const withdrawalSim = await anchorSimulator.simulateWithdrawal(
                destAsset.code,
                destFiat,
                currentAmount
              );

              legs.push({
                type: 'anchor-withdraw',
                from: `${destAsset.code} (Stellar)`,
                to: `${destFiat} (Bank Account)`,
                rate: 1,
                estSeconds: withdrawalSim.estimatedTime,
                fees: [{
                  kind: 'anchor_withdrawal',
                  amount: withdrawalSim.fees.withdrawal,
                  asset: destFiat,
                  note: `Anchor withdrawal fee (${(withdrawalSim.fees.withdrawal / currentAmount * 100).toFixed(2)}%)`,
                }],
                provider: 'Stellar Anchor (Simulated)',
              });

              currentAmount = withdrawalSim.fiatAmount;
            }

            const totalFees = legs.reduce((sum, leg) =>
              sum + leg.fees.reduce((feeSum, fee) => feeSum + fee.amount, 0), 0
            );

            // Final amount after all legs and fees
            const netReceive = currentAmount;

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
              slippagePct: 2, // 2% slippage buffer for transaction safety
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

      console.log(`🔍 Querying Horizon paths: ${sendAmount} ${sourceAssetStr} → ${destAssetStr}`);

      const pathsResponse = await fetch(pathsUrl);

      if (pathsResponse.ok) {
        const pathsData = await pathsResponse.json();

        console.log('📊 Stellar paths received:', pathsData.pathCount, 'paths');
        if (pathsData.paths?.length > 0) {
          console.log('  Source amount from Horizon:', pathsData.paths[0].source.amount, pathsData.paths[0].source.code);
          console.log('  Dest amount from Horizon:', pathsData.paths[0].destination.amount, pathsData.paths[0].destination.code);
          console.log('  Effective rate:', pathsData.paths[0].effectiveRate);
        }
        
        // Convert Stellar paths to RouteQuote format
        for (const path of (pathsData.paths || []).slice(0, 3)) { // Limit to top 3 paths
          const legs: RouteLeg[] = [];
          let currentAmount = sendAmount;

          // Step 1: Deposit leg (fiat → token) using anchor simulator
          if (sourceFiat && sourceFiat !== path.source.code) {
            console.log(`  💵 Deposit: ${currentAmount} ${sourceFiat} → ?? ${path.source.code}`);
            const depositSim = await anchorSimulator.simulateDeposit(
              sourceFiat,
              path.source.code,
              currentAmount
            );

            legs.push({
              type: 'anchor-deposit',
              from: `${sourceFiat} (Bank Account)`,
              to: `${path.source.code} (Stellar)`,
              rate: 1, // 1:1 for tokenized fiat
              estSeconds: depositSim.estimatedTime,
              fees: [{
                kind: 'anchor_deposit',
                amount: depositSim.fees.deposit,
                asset: sourceFiat,
                note: `Anchor deposit fee (${(depositSim.fees.deposit / sendAmount * 100).toFixed(2)}%)`,
              }],
              provider: 'Stellar Anchor (Simulated)',
            });

            currentAmount = depositSim.tokenAmount;
            console.log(`  💵 After deposit fee: ${currentAmount} ${path.source.code} (fee: ${depositSim.fees.deposit})`);
            console.log(`  ⚠️  BUT Horizon path expects: ${path.source.amount} ${path.source.code}`);
          }
          
          // Step 2: On-chain Stellar path legs (token swaps on DEX)
          const allAssets = [
            path.source,
            ...path.path,
            path.destination,
          ];

          for (let i = 0; i < allAssets.length - 1; i++) {
            const fromAsset = allAssets[i];
            const toAsset = allAssets[i + 1];

            legs.push({
              type: 'stellar-path',
              from: fromAsset.code,
              to: toAsset.code,
              rate: path.effectiveRate, // Use the actual exchange rate from Horizon
              estSeconds: 5, // Stellar confirmation time
              fees: i === 0 ? [{
                kind: 'network',
                amount: 0.0001, // Stellar network fee (~100 stroops)
                asset: 'XLM',
                note: 'Stellar network fee',
              }] : [],
              provider: 'Stellar DEX',
            });
          }

          // Calculate amount after on-chain exchange
          currentAmount = path.destination.amount;

          // Store the on-chain receive amount (in tokens, before withdrawal)
          const onChainReceive = currentAmount;

          console.log(`  🔗 On-chain exchange: ${path.source.amount} ${path.source.code} → ${onChainReceive} ${path.destination.code}`);

          // Step 3: Withdrawal leg (token → fiat) using anchor simulator
          if (destFiat && destFiat !== path.destination.code) {
            const withdrawalSim = await anchorSimulator.simulateWithdrawal(
              path.destination.code,
              destFiat,
              currentAmount
            );

            legs.push({
              type: 'anchor-withdraw',
              from: `${path.destination.code} (Stellar)`,
              to: `${destFiat} (Bank Account)`,
              rate: 1,
              estSeconds: withdrawalSim.estimatedTime,
              fees: [{
                kind: 'anchor_withdrawal',
                amount: withdrawalSim.fees.withdrawal,
                asset: destFiat,
                note: `Anchor withdrawal fee (${(withdrawalSim.fees.withdrawal / currentAmount * 100).toFixed(2)}%)`,
              }],
              provider: 'Stellar Anchor (Simulated)',
            });

            currentAmount = withdrawalSim.fiatAmount;
            console.log(`  🏦 After withdrawal: ${onChainReceive} ${path.destination.code} → ${currentAmount} ${destFiat}`);
          }

          const totalFees = legs.reduce((sum, leg) =>
            sum + leg.fees.reduce((feeSum, fee) => feeSum + fee.amount, 0), 0
          );

          // Final amount after all legs and fees (may be fiat if withdrawal leg exists)
          const netReceive = currentAmount;

          console.log(`  ✅ Route: ${sendAmount} ${sourceFiat || path.source.code} → ${netReceive} ${destFiat || path.destination.code}`);

          // Extract liquidity warnings from path quality
          const liquidityWarning = path.quality?.warnings && path.quality.warnings.length > 0
            ? path.quality.warnings[0]
            : undefined;

          // Use liquidity depth from path quality for risk calculation
          const liquidityDepth = path.quality?.liquidityDepth || 50000;

          const route: RouteQuote = {
            routeId: `route-stellar-${path.pathId}-${requestId}`,
            sendAsset: sourceAsset,
            destAsset: destAsset,
            sourceFiat,
            destinationFiat: destFiat,
            grossSend: sendAmount,
            legs,
            totalFees,
            netReceive: parseFloat(netReceive.toFixed(2)),
            onChainReceive: parseFloat(onChainReceive.toFixed(7)), // On-chain token amount (for transaction building)
            effectiveRate: netReceive / sendAmount,
            riskScore: calculateRiskScore(legs.length, liquidityDepth, 0.99, 5),
            // Higher slippage for USD → INR due to poor liquidity
            slippagePct: (sourceAsset.code.includes('USD') && destAsset.code.includes('INR')) ? 20 : 10,
            execution: {
              canBuildXDR: true,
              contractAttestationSupported: true,
              requiresKYC: false,
              estimatedConfirmationTime: 5,
            },
            providerName: `Stellar On-Chain Path`,
            references: {
              horizonPathId: path.pathId,
              liquidityWarning,
              qualityScore: path.quality?.score,
              liquidityDepth,
              spread: path.quality?.spread,
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
      // Include rate metadata if available
      rateSource: rateMetadata?.rateSource,
      rateTimestamp: rateMetadata?.rateTimestamp,
      baseRate: rateMetadata?.baseRate,
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
