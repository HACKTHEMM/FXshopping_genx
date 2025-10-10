import { NextRequest, NextResponse } from 'next/server';
import { HorizonPathResult } from '@/lib/types/route';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

/**
 * Stellar Path Payment Discovery API
 * Queries Horizon for path payment options between two assets
 * GET /api/stellar/find-paths?sourceAsset=XLM&destAsset=USDC:ISSUER&amount=100&type=send
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const sourceAsset = searchParams.get('sourceAsset');
    const destAsset = searchParams.get('destAsset');
    const amount = searchParams.get('amount');
    const type = searchParams.get('type') || 'send'; // 'send' or 'receive'
    const sourceAccount = searchParams.get('sourceAccount');
    const destAccount = searchParams.get('destAccount');

    if (!sourceAsset || !destAsset || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceAsset, destAsset, amount' },
        { status: 400 }
      );
    }

    // Parse asset format: "CODE" for XLM or "CODE:ISSUER" for issued assets
    const parseAsset = (assetStr: string) => {
      if (assetStr === 'XLM' || assetStr.toUpperCase() === 'NATIVE') {
        return { type: 'native' };
      }
      const [code, issuer] = assetStr.split(':');
      if (!issuer) {
        throw new Error(`Invalid asset format: ${assetStr}. Use CODE:ISSUER for issued assets.`);
      }
      return { code, issuer };
    };

    const source = parseAsset(sourceAsset);
    const dest = parseAsset(destAsset);

    // Build Horizon query parameters
    const endpoint = type === 'send' ? '/paths/strict-send' : '/paths/strict-receive';
    const params = new URLSearchParams();

    // Source asset parameters (always needed)
    if (source.type === 'native') {
      params.append('source_asset_type', 'native');
    } else {
      // Stellar uses credit_alphanum4 for codes 1-4 chars, credit_alphanum12 for 5-12 chars
      const sourceAssetType = source.code && source.code.length <= 4 
        ? 'credit_alphanum4' 
        : 'credit_alphanum12';
      params.append('source_asset_type', sourceAssetType);
      if (source.code) params.append('source_asset_code', source.code);
      if (source.issuer) params.append('source_asset_issuer', source.issuer);
    }

    // Amount parameter (different field names for send vs receive)
    if (type === 'send') {
      params.append('source_amount', amount);
      
      // For strict-send, use destination_assets parameter (comma-separated list)
      if (dest.type === 'native') {
        params.append('destination_assets', 'native');
      } else if (dest.code && dest.issuer) {
        params.append('destination_assets', `${dest.code}:${dest.issuer}`);
      }
    } else {
      // For strict-receive, use individual destination asset parameters
      if (dest.type === 'native') {
        params.append('destination_asset_type', 'native');
      } else {
        const destAssetType = dest.code && dest.code.length <= 4 
          ? 'credit_alphanum4' 
          : 'credit_alphanum12';
        params.append('destination_asset_type', destAssetType);
        if (dest.code) params.append('destination_asset_code', dest.code);
        if (dest.issuer) params.append('destination_asset_issuer', dest.issuer);
      }
      
      params.append('destination_amount', amount);
    }

    const url = `${HORIZON_URL}${endpoint}?${params.toString()}`;
    console.log('Querying Horizon:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Horizon API Error:', JSON.stringify(errorData, null, 2));
      return NextResponse.json(
        { 
          error: 'Horizon API error', 
          details: errorData,
          url 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const paths = data._embedded?.records || [];

    // Helper function to analyze orderbook liquidity depth
    const analyzeOrderbookDepth = (asks: any[], amountNeeded: number) => {
      if (!asks || asks.length === 0) {
        return null;
      }

      let cumulativeAmount = 0;
      let weightedRate = 0;
      let totalCost = 0;

      for (const ask of asks) {
        const askAmount = parseFloat(ask.amount);
        const askPrice = parseFloat(ask.price);

        if (cumulativeAmount >= amountNeeded) break;

        const usableAmount = Math.min(askAmount, amountNeeded - cumulativeAmount);
        const cost = usableAmount / askPrice; // How much base asset needed

        weightedRate += usableAmount * askPrice;
        totalCost += cost;
        cumulativeAmount += usableAmount;
      }

      const hasInsufficientLiquidity = cumulativeAmount < amountNeeded;
      const avgRate = cumulativeAmount > 0 ? weightedRate / cumulativeAmount : 0;
      const spread = asks.length > 0 ? parseFloat(asks[0].price) : 0;

      return {
        availableLiquidity: cumulativeAmount,
        requiredAmount: amountNeeded,
        sufficientLiquidity: !hasInsufficientLiquidity,
        weightedAverageRate: avgRate,
        spread,
        ordersUsed: asks.slice(0, Math.min(10, asks.length)).length,
      };
    };

    // If no paths found via path payment API, try orderbook directly
    if (paths.length === 0 && type === 'send' && source.type !== 'native' && dest.type !== 'native') {
      console.log('No paths found, checking orderbook directly...');

      try {
        const orderbookUrl = `${HORIZON_URL}/order_book?` +
          `selling_asset_type=${source.code && source.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'}&` +
          `selling_asset_code=${source.code}&` +
          `selling_asset_issuer=${source.issuer}&` +
          `buying_asset_type=${dest.code && dest.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'}&` +
          `buying_asset_code=${dest.code}&` +
          `buying_asset_issuer=${dest.issuer}&` +
          `limit=200`; // Get more orders for depth analysis

        const orderbookResponse = await fetch(orderbookUrl);

        if (orderbookResponse.ok) {
          const orderbookData = await orderbookResponse.json();
          const asks = orderbookData.asks || [];
          const bids = orderbookData.bids || [];

          if (asks.length > 0) {
            const amountNeeded = parseFloat(amount);
            const depthAnalysis = analyzeOrderbookDepth(asks, amountNeeded);

            if (depthAnalysis) {
              const destAmount = depthAnalysis.availableLiquidity;

              const syntheticPath = {
                source_asset_type: (source.code && source.code.length <= 4) ? 'credit_alphanum4' : 'credit_alphanum12',
                source_asset_code: source.code || '',
                source_asset_issuer: source.issuer || '',
                source_amount: amount,
                destination_asset_type: (dest.code && dest.code.length <= 4) ? 'credit_alphanum4' : 'credit_alphanum12',
                destination_asset_code: dest.code || '',
                destination_asset_issuer: dest.issuer || '',
                destination_amount: destAmount.toFixed(7),
                path: [], // Direct trade, no intermediate hops
                liquidityAnalysis: depthAnalysis,
              };

              paths.push(syntheticPath);

              if (depthAnalysis.sufficientLiquidity) {
                console.log(`✅ Built synthetic path from orderbook: ${amount} ${source.code} → ${destAmount.toFixed(2)} ${dest.code} @ ${depthAnalysis.weightedAverageRate.toFixed(6)}`);
              } else {
                console.log(`⚠️ Insufficient liquidity: Only ${depthAnalysis.availableLiquidity.toFixed(2)} available of ${amountNeeded} needed`);
              }
            }
          }
        }
      } catch (orderbookError) {
        console.error('Orderbook query failed:', orderbookError);
      }
    }

    // Calculate path quality score
    const calculatePathQuality = (path: any, hops: number, liquidityAnalysis?: any) => {
      let score = 100;

      // Penalty for each hop (more hops = more risk)
      score -= hops * 5;

      // Penalty for low liquidity (if available)
      if (liquidityAnalysis) {
        const liquidityDepth = liquidityAnalysis.availableLiquidity;

        if (!liquidityAnalysis.sufficientLiquidity) {
          score -= 30; // Major penalty for insufficient liquidity
        } else if (liquidityDepth < 1000) {
          score -= 20; // Low liquidity
        } else if (liquidityDepth < 10000) {
          score -= 10; // Medium liquidity
        }

        // Penalty for wide spread (if available)
        if (liquidityAnalysis.spread > 0.05) {
          score -= 15; // >5% spread is concerning
        } else if (liquidityAnalysis.spread > 0.02) {
          score -= 5; // >2% spread
        }
      }

      return {
        score: Math.max(0, Math.min(100, score)),
        hops,
        liquidityDepth: liquidityAnalysis?.availableLiquidity || null,
        spread: liquidityAnalysis?.spread || null,
        reliability: 0.95, // Default reliability score
        warnings: liquidityAnalysis && !liquidityAnalysis.sufficientLiquidity
          ? [`Insufficient liquidity: ${liquidityAnalysis.availableLiquidity.toFixed(2)} of ${liquidityAnalysis.requiredAmount} available`]
          : [],
      };
    };

    // Transform and enrich path data
    const enrichedPaths = paths.map((path: any, index: number) => {
      const sourceAmount = parseFloat(path.source_amount);
      const destAmount = parseFloat(path.destination_amount);
      const rate = sourceAmount > 0 ? destAmount / sourceAmount : 0;
      const hops = path.path.length + 1;
      const quality = calculatePathQuality(path, hops, path.liquidityAnalysis);

      return {
        pathId: `path-${index}`,
        source: {
          type: path.source_asset_type,
          code: path.source_asset_code || 'XLM',
          issuer: path.source_asset_issuer,
          amount: sourceAmount,
        },
        destination: {
          type: path.destination_asset_type,
          code: path.destination_asset_code || 'XLM',
          issuer: path.destination_asset_issuer,
          amount: destAmount,
        },
        path: path.path.map((asset: any) => ({
          type: asset.asset_type,
          code: asset.asset_code || 'XLM',
          issuer: asset.asset_issuer,
        })),
        effectiveRate: rate,
        hops,
        quality,
        liquidityAnalysis: path.liquidityAnalysis,
        raw: path,
      };
    });

    return NextResponse.json({
      success: true,
      pathCount: enrichedPaths.length,
      paths: enrichedPaths,
      source: sourceAsset,
      destination: destAsset,
      amount: parseFloat(amount),
      type,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Path discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}
